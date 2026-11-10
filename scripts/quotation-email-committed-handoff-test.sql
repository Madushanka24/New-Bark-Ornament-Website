
/*
============================================================
BARK ORNAMENT (PVT) LTD

FILE 59 - TWO-SESSION COMMITTED HANDOFF TEST

File:
scripts/quotation-email-committed-handoff-test.sql

DATABASE:
Local bark_ornament

ROLE:
PostgreSQL administrator postgres

REQUIRES:
Files 40, 41, 52, 53 and 54

EXECUTION:
SECTION A - Query Tool session A; COMMIT
SECTION B - Query Tool session B; ROLLBACK
SECTION C - Query Tool session B; COMMIT
SECTION D - Query Tool session B; COMMIT CLEANUP

IMPORTANT:
Run each section separately.

Do not execute the whole file at once.

Section A commits fictional data.
Section D is mandatory cleanup.

NO REAL PROVIDER OR EMAIL SENDING.
============================================================
*/


/*
############################################################
SECTION A START

SESSION A:
Create fictional records, claim a job,
commit the provider handoff.

Run this complete section in Query Tool A.

After successful COMMIT, close Query Tool A.
############################################################
*/

BEGIN;

SET LOCAL lock_timeout = '5s';

LOCK TABLE
  public.quotation_email_outbox
IN ACCESS EXCLUSIVE MODE;

LOCK TABLE
  public.quotation_email_reconciliation_holds
IN ACCESS EXCLUSIVE MODE;

LOCK TABLE
  public.quotation_email_provider_handoffs
IN ACCESS EXCLUSIVE MODE;

/* ---------------------------------------------------------
   TEST 1 - LOCAL DATABASE AND EMPTY-TABLE PREFLIGHT
   --------------------------------------------------------- */

DO $preflight$
BEGIN

  IF CURRENT_DATABASE() <> 'bark_ornament'
     OR CURRENT_USER <> 'postgres'
  THEN
    RAISE EXCEPTION
      'File 59 requires postgres on bark_ornament.';
  END IF;

  IF inet_server_addr() IS NOT NULL
     AND inet_server_addr() NOT IN (
       '127.0.0.1'::INET,
       '::1'::INET
     )
  THEN
    RAISE EXCEPTION
      'File 59 requires local PostgreSQL.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quotation_email_outbox
  )
  OR EXISTS (
    SELECT 1
    FROM public.quotation_email_reconciliation_holds
  )
  OR EXISTS (
    SELECT 1
    FROM public.quotation_email_provider_handoffs
  )
  THEN
    RAISE EXCEPTION
      'Existing email jobs or audit records found.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quotations
    WHERE customer_message LIKE
      'FILE59_COMMITTED_PID:%'
  )
  THEN
    RAISE EXCEPTION
      'An earlier File 59 fixture still exists.';
  END IF;

  IF NOT has_function_privilege(
    'bark_email_worker_service',
    'public.begin_quotation_email_provider_handoff(bigint,uuid)',
    'EXECUTE'
  )
  OR has_function_privilege(
    'bark_web_dev',
    'public.begin_quotation_email_provider_handoff(bigint,uuid)',
    'EXECUTE'
  )
  OR has_function_privilege(
    'bark_email_worker_service',
    'public.resolve_quotation_email_reconciliation(bigint,text,text,text)',
    'EXECUTE'
  )
  THEN
    RAISE EXCEPTION
      'Worker or website permissions are unsafe.';
  END IF;

  RAISE NOTICE
    'PASS 1: Local isolation and permissions verified';

END;
$preflight$;

/* ---------------------------------------------------------
   TEST 2 - CREATE ONE FICTIONAL QUOTATION
   --------------------------------------------------------- */

DO $fixture$
DECLARE
  v_id UUID;
  v_reference TEXT;
  v_created INTEGER;
  v_internal_id BIGINT;
BEGIN

  v_id := gen_random_uuid();

  v_reference :=
    'BOQ-' ||
    to_char(CURRENT_TIMESTAMP, 'YYYY') ||
    '-' ||
    upper(left(md5(v_id::TEXT), 12));

  INSERT INTO public.quotations (
    id,
    quotation_reference,
    customer_name,
    company_name,
    email,
    destination,
    customer_message,
    consent_at,
    status
  )
  VALUES (
    v_id,
    v_reference,
    'File 59 Fictional Buyer',
    'File 59 Fictional Resort',
    'file59-committed@example.invalid',
    'Maldives',
    'FILE59_COMMITTED_PID:' ||
      pg_backend_pid()::TEXT,
    CURRENT_TIMESTAMP,
    'new'
  );

  INSERT INTO public.quotation_items (
    quotation_id,
    item_position,
    product_id,
    product_slug,
    product_name,
    category_slug,
    quantity
  )
  VALUES (
    v_id,
    1,
    'file59-fictional-item',
    'file59-fictional-item',
    'File 59 Fictional Menu Cover',
    'printing-stationery',
    1
  );

  SELECT
    public.enqueue_quotation_email_notifications(v_id)
  INTO v_created;

  IF v_created <> 2 THEN
    RAISE EXCEPTION
      'Expected exactly two fictional email jobs.';
  END IF;

  /*
   * Defer the fictional customer notification.
   * It is not part of this worker test.
   */

  UPDATE public.quotation_email_outbox
  SET next_attempt_at =
    clock_timestamp() + INTERVAL '7 days'
  WHERE quotation_id = v_id
    AND notification_type = 'customer';

  SELECT id
  INTO v_internal_id
  FROM public.quotation_email_outbox
  WHERE quotation_id = v_id
    AND notification_type = 'internal';

  IF v_internal_id IS NULL THEN
    RAISE EXCEPTION
      'Fictional internal notification missing.';
  END IF;

  PERFORM set_config(
    'bark.f59_quotation_id',
    v_id::TEXT,
    TRUE
  );

  IF (
    SELECT COUNT(*)
    FROM public.quotation_email_outbox
    WHERE quotation_id = v_id
  ) <> 2 THEN
    RAISE EXCEPTION
      'Unexpected fictional outbox count.';
  END IF;

  RAISE NOTICE
    'PASS 2: One fictional quotation and two jobs created';

END;
$fixture$;

/* ---------------------------------------------------------
   TEST 3 - CLAIM WITH RESTRICTED WORKER ROLE
   --------------------------------------------------------- */

SET LOCAL ROLE bark_email_worker_service;

DO $worker_claim$
DECLARE
  v_claim RECORD;
BEGIN

  SELECT *
  INTO v_claim
  FROM public.claim_quotation_email_jobs(1);

  IF NOT FOUND
     OR v_claim.quotation_id <>
       current_setting(
         'bark.f59_quotation_id'
       )::UUID
     OR v_claim.notification_type <> 'internal'
     OR v_claim.attempt_number <> 1
  THEN
    RAISE EXCEPTION
      'Unexpected fictional worker claim.';
  END IF;

  PERFORM set_config(
    'bark.f59_job_id',
    v_claim.job_id::TEXT,
    TRUE
  );

  PERFORM set_config(
    'bark.f59_lease_token',
    v_claim.lease_token::TEXT,
    TRUE
  );

  RAISE NOTICE
    'PASS 3: Restricted worker claimed attempt one';

END;
$worker_claim$;

/* ---------------------------------------------------------
   TEST 4 - RECORD PROVIDER HANDOFF
   --------------------------------------------------------- */

DO $handoff$
DECLARE
  v_result TEXT;
BEGIN

  v_result :=
    public.begin_quotation_email_provider_handoff(
      current_setting(
        'bark.f59_job_id'
      )::BIGINT,
      current_setting(
        'bark.f59_lease_token'
      )::UUID
    );

  IF v_result <> 'handoff_started' THEN
    RAISE EXCEPTION
      'First provider handoff was not recorded.';
  END IF;

  RAISE NOTICE
    'PASS 4: Durable handoff prepared for commit';

END;
$handoff$;

RESET ROLE;

/*
 * The provider handoff and fictional
 * quotation are now COMMITTED.
 *
 * No email has been sent.
 */

COMMIT;

/*
############################################################
SECTION A END

REQUIRED NEXT ACTION:

Confirm COMMIT succeeded.

Close Query Tool session A.

Continue in the separately opened Query Tool B.
############################################################
*/


/*
############################################################
SECTION B START

SESSION B:
Independent PostgreSQL session verifies
the committed handoff.

Run this complete section in Query Tool B.

Ends with ROLLBACK because these checks must
not modify committed job state.
############################################################
*/

BEGIN;

SET LOCAL lock_timeout = '5s';

/* ---------------------------------------------------------
   TEST 5 - VERIFY A DIFFERENT DATABASE SESSION
   --------------------------------------------------------- */

DO $different_session$
DECLARE
  v_creator_pid INTEGER;
  v_count INTEGER;
BEGIN

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotations
  WHERE customer_message LIKE
    'FILE59_COMMITTED_PID:%'
    AND email =
      'file59-committed@example.invalid';

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Committed File 59 fixture not found exactly once.';
  END IF;

  SELECT
    split_part(
      customer_message,
      ':',
      2
    )::INTEGER
  INTO v_creator_pid
  FROM public.quotations
  WHERE customer_message LIKE
    'FILE59_COMMITTED_PID:%'
    AND email =
      'file59-committed@example.invalid';

  IF v_creator_pid = pg_backend_pid() THEN
    RAISE EXCEPTION
      'Session B is the same PostgreSQL session as A.';
  END IF;

  RAISE NOTICE
    'PASS 5: Independent PostgreSQL backend confirmed';

END;
$different_session$;

/* ---------------------------------------------------------
   TEST 6 - COMMITTED HANDOFF SURVIVED SESSION A
   --------------------------------------------------------- */

DO $committed_state$
DECLARE
  v_job BIGINT;
  v_token UUID;
  v_count INTEGER;
BEGIN

  SELECT
    o.id,
    h.lease_token
  INTO
    v_job,
    v_token

  FROM public.quotations AS q

  INNER JOIN public.quotation_email_outbox AS o
    ON o.quotation_id = q.id

  INNER JOIN public.quotation_email_provider_handoffs AS h
    ON h.job_id = o.id
   AND h.attempt_number = o.attempts
   AND h.lease_token = o.lease_token

  WHERE q.customer_message LIKE
      'FILE59_COMMITTED_PID:%'

    AND q.email =
      'file59-committed@example.invalid'

    AND o.notification_type = 'internal'
    AND o.status = 'processing'
    AND o.attempts = 1

    AND o.locked_until =
      'infinity'::TIMESTAMPTZ;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Committed protected handoff not found.';
  END IF;

  PERFORM set_config(
    'bark.f59_b_job_id',
    v_job::TEXT,
    TRUE
  );

  PERFORM set_config(
    'bark.f59_b_token',
    v_token::TEXT,
    TRUE
  );

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotation_email_provider_handoffs
  WHERE job_id = v_job
    AND attempt_number = 1;

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Committed handoff history is incorrect.';
  END IF;

  RAISE NOTICE
    'PASS 6: Committed infinite lease and handoff persisted';

END;
$committed_state$;

/* ---------------------------------------------------------
   TEST 7 - ANOTHER WORKER CANNOT START A SECOND HANDOFF
   --------------------------------------------------------- */

SET LOCAL ROLE bark_email_worker_service;

DO $duplicate$
DECLARE
  v_result TEXT;
BEGIN

  v_result :=
    public.begin_quotation_email_provider_handoff(
      current_setting(
        'bark.f59_b_job_id'
      )::BIGINT,

      current_setting(
        'bark.f59_b_token'
      )::UUID
    );

  IF v_result <> 'already_handed_off' THEN
    RAISE EXCEPTION
      'Repeated committed handoff was not recognized.';
  END IF;

  RAISE NOTICE
    'PASS 7: Second session cannot start another handoff';

END;
$duplicate$;

/* ---------------------------------------------------------
   TEST 8 - AUTOMATIC RECLAIM RETURNS ZERO JOBS
   --------------------------------------------------------- */

DO $reclaim$
DECLARE
  v_count INTEGER;
BEGIN

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.claim_quotation_email_jobs(10);

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'Committed provider handoff was reclaimed.';
  END IF;

  RAISE NOTICE
    'PASS 8: Committed handoff cannot be auto-reclaimed';

END;
$reclaim$;

/* ---------------------------------------------------------
   TEST 9 - ORDINARY FAILURE/RETRY IS BLOCKED
   --------------------------------------------------------- */

DO $retry_guard$
DECLARE
  v_denied BOOLEAN := FALSE;
BEGIN

  BEGIN

    PERFORM
      public.fail_quotation_email_job(
        current_setting(
          'bark.f59_b_job_id'
        )::BIGINT,

        current_setting(
          'bark.f59_b_token'
        )::UUID,

        'PROVIDER_TIMEOUT',

        FALSE
      );

  EXCEPTION
    WHEN SQLSTATE '55000' THEN
      v_denied := TRUE;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION
      'Ordinary retry after handoff was not blocked.';
  END IF;

  RAISE NOTICE
    'PASS 9: Post-handoff ordinary retry denied';

END;
$retry_guard$;

/* ---------------------------------------------------------
   TEST 10 - INCORRECT LEASE TOKEN IS REJECTED
   --------------------------------------------------------- */

DO $wrong_token$
DECLARE
  v_result TEXT;
  v_count INTEGER;
BEGIN

  v_result :=
    public.begin_quotation_email_provider_handoff(
      current_setting(
        'bark.f59_b_job_id'
      )::BIGINT,

      gen_random_uuid()
    );

  IF v_result <> 'stale_lease' THEN
    RAISE EXCEPTION
      'Incorrect token accepted by handoff function.';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.get_quotation_email_job_data(
    current_setting(
      'bark.f59_b_job_id'
    )::BIGINT,

    gen_random_uuid()
  );

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'Incorrect lease retrieved quotation data.';
  END IF;

  RAISE NOTICE
    'PASS 10: Incorrect worker lease token rejected';

END;
$wrong_token$;

RESET ROLE;

/*
 * No test changes should survive Section B.
 * Section A's previously committed handoff
 * remains in PostgreSQL.
 */

ROLLBACK;

/*
############################################################
SECTION B END

Continue to SECTION C in Query Tool B.
############################################################
*/


/*
############################################################
SECTION C START

SESSION B AS postgres:
Reconcile the committed fictional handoff.

The outcome is deliberately CLOSED.
No new email attempt is authorized.

This section COMMITs the reconciliation
so cleanup can proceed safely.
############################################################
*/

BEGIN;

SET LOCAL lock_timeout = '5s';

LOCK TABLE
  public.quotation_email_outbox
IN ACCESS EXCLUSIVE MODE;

/* ---------------------------------------------------------
   TEST 11 - RECOVER COMMITTED HANDOFF THROUGH A HOLD
   --------------------------------------------------------- */

DO $recovery$
DECLARE
  v_job BIGINT;
  v_token UUID;
  v_result TEXT;
BEGIN

  SELECT
    o.id,
    h.lease_token
  INTO
    v_job,
    v_token

  FROM public.quotations AS q

  INNER JOIN public.quotation_email_outbox AS o
    ON o.quotation_id = q.id

  INNER JOIN public.quotation_email_provider_handoffs AS h
    ON h.job_id = o.id
   AND h.attempt_number = o.attempts

  WHERE q.customer_message LIKE
      'FILE59_COMMITTED_PID:%'
    AND q.email =
      'file59-committed@example.invalid'
    AND o.notification_type = 'internal'
    AND o.status = 'processing'
    AND o.locked_until =
      'infinity'::TIMESTAMPTZ;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Protected fictional job missing.';
  END IF;

  v_result :=
    public.hold_quotation_email_for_reconciliation(
      v_job,
      v_token,
      'UNKNOWN_PROVIDER_ACCEPTANCE'
    );

  IF v_result <> 'held' THEN
    RAISE EXCEPTION
      'Committed handoff could not enter reconciliation.';
  END IF;

  RAISE NOTICE
    'PASS 11: Committed handoff placed on reconciliation hold';

END;
$recovery$;

/* ---------------------------------------------------------
   TEST 12 - ADMINISTRATOR CLOSES FICTIONAL JOB

   No real provider was contacted during File 59.

   This controlled decision does not authorize
   a retry or claim that delivery occurred.
   --------------------------------------------------------- */

DO $resolve$
DECLARE
  v_job BIGINT;
  v_result TEXT;
  v_count INTEGER;
BEGIN

  SELECT o.id
  INTO v_job
  FROM public.quotations AS q

  INNER JOIN public.quotation_email_outbox AS o
    ON o.quotation_id = q.id

  WHERE q.customer_message LIKE
      'FILE59_COMMITTED_PID:%'
    AND q.email =
      'file59-committed@example.invalid'
    AND o.notification_type = 'internal';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Fictional internal job missing.';
  END IF;

  v_result :=
    public.resolve_quotation_email_reconciliation(
      v_job,
      'closed_without_send',
      'CASE-F59-TEST-CLOSED-001',
      NULL
    );

  IF v_result <> 'closed_without_send' THEN
    RAISE EXCEPTION
      'Administrator could not resolve fictional job.';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotation_email_outbox
  WHERE id = v_job
    AND status = 'failed'
    AND last_error_code =
      'RECONCILIATION_CLOSED'
    AND provider_message_id IS NULL
    AND sent_at IS NULL
    AND lease_token IS NULL;

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Terminal closed state is incorrect.';
  END IF;

  RAISE NOTICE
    'PASS 12: Administrator closed fictional notification';

END;
$resolve$;

/* ---------------------------------------------------------
   TEST 13 - RECONCILIATION AUDIT RETAINED
   --------------------------------------------------------- */

DO $audit$
DECLARE
  v_count INTEGER;
BEGIN

  SELECT COUNT(*)::INTEGER
  INTO v_count

  FROM public.quotation_email_reconciliation_holds AS h

  INNER JOIN public.quotation_email_outbox AS o
    ON o.id = h.job_id

  INNER JOIN public.quotations AS q
    ON q.id = o.quotation_id

  WHERE q.customer_message LIKE
      'FILE59_COMMITTED_PID:%'

    AND q.email =
      'file59-committed@example.invalid'

    AND h.held_attempt = 1

    AND h.resolution = 'closed_without_send'

    AND h.resolution_evidence_reference =
      'CASE-F59-TEST-CLOSED-001'

    AND h.resolved_by = 'postgres'

    AND h.resolved_at IS NOT NULL;

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Expected one resolved fictional hold.';
  END IF;

  RAISE NOTICE
    'PASS 13: Administrator audit history verified';

END;
$audit$;

/*
 * The fictional internal job is now
 * terminal, and its hold is resolved.
 *
 * COMMIT this controlled reconciliation.
 */

COMMIT;

/*
############################################################
SECTION C END

Proceed immediately to SECTION D.
############################################################
*/


/*
############################################################
SECTION D START

MANDATORY COMMITTED FIXTURE CLEANUP

This section deletes only the specifically
identified File 59 fictional quotation
and records linked to it.

It verifies exact counts before deletion.

Never use TRUNCATE or broad table DELETE.

Run as postgres in Query Tool B.
############################################################
*/

BEGIN;

SET LOCAL lock_timeout = '5s';

LOCK TABLE
  public.quotation_email_outbox
IN ACCESS EXCLUSIVE MODE;

LOCK TABLE
  public.quotation_email_reconciliation_holds
IN ACCESS EXCLUSIVE MODE;

LOCK TABLE
  public.quotation_email_provider_handoffs
IN ACCESS EXCLUSIVE MODE;

/* ---------------------------------------------------------
   TEST 14 - VERIFY EXACT CLEANUP TARGET
   --------------------------------------------------------- */

DO $cleanup$
DECLARE
  v_quotation UUID;
  v_count INTEGER;
BEGIN

  /*
   * Only one specifically marked quotation
   * is permitted.
   */

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotations
  WHERE customer_message LIKE
      'FILE59_COMMITTED_PID:%'
    AND email =
      'file59-committed@example.invalid'
    AND company_name =
      'File 59 Fictional Resort';

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one File 59 cleanup target.';
  END IF;

  SELECT id
  INTO v_quotation
  FROM public.quotations
  WHERE customer_message LIKE
      'FILE59_COMMITTED_PID:%'
    AND email =
      'file59-committed@example.invalid'
    AND company_name =
      'File 59 Fictional Resort';

  /*
   * Require the complete expected
   * fictional record structure.
   */

  IF (
    SELECT COUNT(*)
    FROM public.quotation_items
    WHERE quotation_id = v_quotation
  ) <> 1
  OR (
    SELECT COUNT(*)
    FROM public.quotation_email_outbox
    WHERE quotation_id = v_quotation
  ) <> 2
  THEN
    RAISE EXCEPTION
      'File 59 fictional record structure changed.';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.quotation_email_provider_handoffs AS h
    JOIN public.quotation_email_outbox AS o
      ON o.id = h.job_id
    WHERE o.quotation_id = v_quotation
  ) <> 1
  OR (
    SELECT COUNT(*)
    FROM public.quotation_email_reconciliation_holds AS h
    JOIN public.quotation_email_outbox AS o
      ON o.id = h.job_id
    WHERE o.quotation_id = v_quotation
      AND h.resolved_at IS NOT NULL
  ) <> 1
  THEN
    RAISE EXCEPTION
      'File 59 audit records do not match expectations.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quotation_email_reconciliation_holds AS h
    JOIN public.quotation_email_outbox AS o
      ON o.id = h.job_id
    WHERE o.quotation_id = v_quotation
      AND h.resolved_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'Unresolved hold detected. Cleanup blocked.';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.quotation_email_outbox
    WHERE quotation_id = v_quotation
      AND (
        (
          notification_type = 'internal'
          AND status = 'failed'
          AND lease_token IS NULL
        )
        OR
        (
          notification_type = 'customer'
          AND status = 'pending'
          AND attempts = 0
        )
      )
  ) <> 2 THEN
    RAISE EXCEPTION
      'Unexpected fictional email status. Cleanup blocked.';
  END IF;

  RAISE NOTICE
    'PASS 14: Exact fictional cleanup target verified';

  /*
   * Delete dependent historical records
   * before deleting outbox rows.
   *
   * This cleanup is restricted to v_quotation.
   */

  DELETE FROM
    public.quotation_email_provider_handoffs
  WHERE job_id IN (
    SELECT id
    FROM public.quotation_email_outbox
    WHERE quotation_id = v_quotation
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Expected to delete one fictional handoff.';
  END IF;

  DELETE FROM
    public.quotation_email_reconciliation_holds
  WHERE job_id IN (
    SELECT id
    FROM public.quotation_email_outbox
    WHERE quotation_id = v_quotation
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Expected to delete one fictional hold.';
  END IF;

  DELETE FROM public.quotation_email_outbox
  WHERE quotation_id = v_quotation;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> 2 THEN
    RAISE EXCEPTION
      'Expected to delete two fictional outbox jobs.';
  END IF;

  DELETE FROM public.quotation_items
  WHERE quotation_id = v_quotation;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Expected to delete one fictional item.';
  END IF;

  DELETE FROM public.quotations
  WHERE id = v_quotation
    AND email =
      'file59-committed@example.invalid'
    AND company_name =
      'File 59 Fictional Resort';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Expected to delete one fictional quotation.';
  END IF;

END;
$cleanup$;

/* ---------------------------------------------------------
   TEST 15 - VERIFY CLEAN DATABASE STATE
   --------------------------------------------------------- */

DO $verify_cleanup$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM public.quotations
    WHERE customer_message LIKE
      'FILE59_COMMITTED_PID:%'
  )
  OR EXISTS (
    SELECT 1
    FROM public.quotation_email_outbox
  )
  OR EXISTS (
    SELECT 1
    FROM public.quotation_email_reconciliation_holds
  )
  OR EXISTS (
    SELECT 1
    FROM public.quotation_email_provider_handoffs
  )
  THEN
    RAISE EXCEPTION
      'File 59 cleanup verification failed.';
  END IF;

  RAISE NOTICE
    'PASS 15: No fictional or email audit records remain';

END;
$verify_cleanup$;

COMMIT;

/*
############################################################
SECTION D END

The committed File 59 test fixture
and all of its dependent records
have now been deleted.

The existing migrations and functions
remain installed.
############################################################
*/
