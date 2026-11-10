
/*
===========================================================
BARK ORNAMENT (PVT) LTD

FILE 58 - PROVIDER HANDOFF CRASH-BOUNDARY TESTS

File:
scripts/quotation-email-handoff-crash-boundary-test.sql

DATABASE:
Local bark_ornament

EXECUTE AS:
postgres

DEPENDENCIES:
File 40 - Worker claims
File 41 - Worker completion/failure
File 52 - Reconciliation hold
File 53 - Administrator resolution
File 54 - Provider handoff barrier

PURPOSE:
- Simulate interruption before provider handoff
- Verify expired lease recovery
- Test transaction rollback before handoff commit
- Simulate lost database response after handoff
- Reject repeat provider handoffs
- Protect handed-off jobs against normal retries
- Test uncertain-delivery reconciliation
- Test administrator-authorized retry
- Preserve historical handoff/hold records

SAFETY:
- No actual email provider
- No SMTP / HTTP calls
- No real customer data
- No permanent test records
- Requires initially empty outbox/audit tables
- Locks the tables for the test transaction
- Uses fictional .invalid addresses
- Ends with ROLLBACK

IMPORTANT:
Do not replace ROLLBACK with COMMIT.
Execute the entire script in one Query Tool session.
===========================================================
*/

BEGIN;

SET LOCAL lock_timeout = '5s';

/*
 * Prevent concurrent outbox and audit changes
 * for the duration of these controlled tests.
 */

LOCK TABLE
  public.quotation_email_outbox
IN ACCESS EXCLUSIVE MODE;

LOCK TABLE
  public.quotation_email_reconciliation_holds
IN ACCESS EXCLUSIVE MODE;

LOCK TABLE
  public.quotation_email_provider_handoffs
IN ACCESS EXCLUSIVE MODE;

/* =======================================================
   TEST 1 - DATABASE AND SECURITY PREFLIGHT
   ======================================================= */

DO $preflight$
BEGIN

  IF current_database() <> 'bark_ornament'
     OR current_user <> 'postgres'
  THEN
    RAISE EXCEPTION
      'File 58 must run as postgres in bark_ornament.';
  END IF;

  IF inet_server_addr() IS NOT NULL
     AND inet_server_addr() NOT IN (
       '127.0.0.1'::INET,
       '::1'::INET
     )
  THEN
    RAISE EXCEPTION
      'File 58 requires a local PostgreSQL server.';
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
      'Existing email records detected. Test stopped.';
  END IF;

  IF NOT has_function_privilege(
    'bark_email_worker_service',
    'public.begin_quotation_email_provider_handoff(bigint,uuid)',
    'EXECUTE'
  )
  OR NOT has_function_privilege(
    'bark_email_worker_service',
    'public.hold_quotation_email_for_reconciliation(bigint,uuid,text)',
    'EXECUTE'
  )
  THEN
    RAISE EXCEPTION
      'Required restricted worker permissions missing.';
  END IF;

  IF has_function_privilege(
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
      'Unsafe website or worker permissions detected.';
  END IF;

  RAISE NOTICE
    'PASS 1: Local database, empty tables and permissions';

END;
$preflight$;

/* =======================================================
   TEST 2 - CREATE FOUR FICTIONAL QUOTATIONS

   SCENARIOS:

   pre       - Crash before handoff
   lost      - Handoff response apparently lost
   accepted  - Confirmed mock provider acceptance
   retry     - Uncertain handoff, authorized retry

   Each quotation creates two outbox jobs.

   Internal job: eligible now
   Customer job: deferred for one day

   Eight temporary outbox jobs total.
   ======================================================= */

DO $fixtures$
DECLARE
  v_kind TEXT;
  v_quotation UUID;
  v_reference TEXT;
  v_created INTEGER;
  v_internal_job BIGINT;
BEGIN

  FOREACH v_kind IN ARRAY
    ARRAY[
      'pre',
      'lost',
      'accepted',
      'retry'
    ]
  LOOP

    v_quotation := gen_random_uuid();

    v_reference :=
      'BOQ-' ||
      to_char(current_timestamp, 'YYYY') ||
      '-' ||
      upper(
        left(
          md5(v_quotation::TEXT),
          12
        )
      );

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
      v_quotation,
      v_reference,
      'File 58 Fictional Buyer',
      'File 58 Test Resort',
      'file58-' || v_kind ||
        '@example.invalid',
      'Maldives',
      'FILE 58 ROLLBACK ' || v_kind,
      current_timestamp,
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
      v_quotation,
      1,
      'file58-item-' || v_kind,
      'file58-item-' || v_kind,
      'File 58 Fictional Menu Cover',
      'printing-stationery',
      1
    );

    SELECT
      public.enqueue_quotation_email_notifications(
        v_quotation
      )
    INTO v_created;

    IF v_created <> 2 THEN
      RAISE EXCEPTION
        'Expected two outbox jobs for %',
        v_kind;
    END IF;

    /*
     * Keep customer notifications outside
     * the worker claim window.
     */

    UPDATE public.quotation_email_outbox
    SET next_attempt_at =
      clock_timestamp() + INTERVAL '1 day'
    WHERE quotation_id = v_quotation
      AND notification_type = 'customer';

    SELECT id
    INTO v_internal_job
    FROM public.quotation_email_outbox
    WHERE quotation_id = v_quotation
      AND notification_type = 'internal';

    IF v_internal_job IS NULL THEN
      RAISE EXCEPTION
        'Internal fictional job was not created.';
    END IF;

    /*
     * Transaction-local identifiers remain
     * available across SET LOCAL ROLE calls.
     *
     * They are not printed in test notices.
     */

    PERFORM set_config(
      'bark.f58_' || v_kind || '_quotation',
      v_quotation::TEXT,
      TRUE
    );

    PERFORM set_config(
      'bark.f58_' || v_kind || '_job',
      v_internal_job::TEXT,
      TRUE
    );

  END LOOP;

  IF (
    SELECT COUNT(*)
    FROM public.quotations
    WHERE customer_message LIKE
      'FILE 58 ROLLBACK %'
  ) <> 4
  OR (
    SELECT COUNT(*)
    FROM public.quotation_email_outbox
  ) <> 8
  THEN
    RAISE EXCEPTION
      'Incorrect fictional fixture count.';
  END IF;

  RAISE NOTICE
    'PASS 2: Four fictional quotations and eight jobs created';

END;
$fixtures$;

/* =======================================================
   TEST 3 - RESTRICTED WORKER CLAIMS

   Claim all four eligible internal jobs.

   Job ordering must not be assumed.
   Match each claim by quotation UUID.
   ======================================================= */

SET LOCAL ROLE bark_email_worker_service;

DO $claims$
DECLARE
  v_claim RECORD;
  v_kind TEXT;
  v_match TEXT;
  v_count INTEGER := 0;
BEGIN

  FOR v_claim IN
    SELECT *
    FROM public.claim_quotation_email_jobs(4)
  LOOP

    v_count := v_count + 1;
    v_match := NULL;

    FOREACH v_kind IN ARRAY
      ARRAY[
        'pre',
        'lost',
        'accepted',
        'retry'
      ]
    LOOP

      IF v_claim.quotation_id =
        current_setting(
          'bark.f58_' || v_kind || '_quotation'
        )::UUID
      THEN
        v_match := v_kind;
        EXIT;
      END IF;

    END LOOP;

    IF v_match IS NULL
       OR v_claim.notification_type <> 'internal'
       OR v_claim.attempt_number <> 1
    THEN
      RAISE EXCEPTION
        'Unexpected email-worker claim.';
    END IF;

    PERFORM set_config(
      'bark.f58_' || v_match || '_token',
      v_claim.lease_token::TEXT,
      TRUE
    );

  END LOOP;

  IF v_count <> 4 THEN
    RAISE EXCEPTION
      'Expected four claimed jobs; got %',
      v_count;
  END IF;

  RAISE NOTICE
    'PASS 3: Four restricted worker claims verified';

END;
$claims$;

RESET ROLE;

/* =======================================================
   TEST 4 - WEBSITE CANNOT INITIATE HANDOFF

   A website role must not gain access to
   the email worker's provider handoff.
   ======================================================= */

SET LOCAL ROLE bark_web_dev;

DO $website_denied$
DECLARE
  v_denied BOOLEAN := FALSE;
BEGIN

  BEGIN

    PERFORM
      public.begin_quotation_email_provider_handoff(
        current_setting(
          'bark.f58_pre_job'
        )::BIGINT,

        current_setting(
          'bark.f58_pre_token'
        )::UUID
      );

  EXCEPTION
    WHEN insufficient_privilege THEN
      v_denied := TRUE;
  END;

  IF NOT v_denied THEN
    RAISE EXCEPTION
      'Website unexpectedly initiated handoff.';
  END IF;

  RAISE NOTICE
    'PASS 4: Website provider handoff denied';

END;
$website_denied$;

RESET ROLE;

/* =======================================================
   TEST 5 - CRASH BEFORE PROVIDER HANDOFF

   Simulate a worker that stops BEFORE
   calling File 54.

   Expire its ordinary five-minute lease.

   Because no handoff was recorded, a new
   worker should be able to recover it.
   ======================================================= */

UPDATE public.quotation_email_outbox
SET locked_until =
  clock_timestamp() - INTERVAL '1 second'
WHERE id =
  current_setting(
    'bark.f58_pre_job'
  )::BIGINT;

SET LOCAL ROLE bark_email_worker_service;

DO $before_handoff$
DECLARE
  v_result TEXT;
  v_claim RECORD;
BEGIN

  /*
   * The original worker may no longer
   * begin a provider handoff.
   */

  v_result :=
    public.begin_quotation_email_provider_handoff(
      current_setting(
        'bark.f58_pre_job'
      )::BIGINT,

      current_setting(
        'bark.f58_pre_token'
      )::UUID
    );

  IF v_result <> 'stale_lease' THEN
    RAISE EXCEPTION
      'Expired pre-handoff lease was accepted.';
  END IF;

  /*
   * Claim must recover the expired job
   * with a new lease and attempt number.
   */

  SELECT *
  INTO v_claim
  FROM public.claim_quotation_email_jobs(1);

  IF NOT FOUND
     OR v_claim.job_id <>
       current_setting(
         'bark.f58_pre_job'
       )::BIGINT
     OR v_claim.attempt_number <> 2
     OR v_claim.lease_token =
       current_setting(
         'bark.f58_pre_token'
       )::UUID
  THEN
    RAISE EXCEPTION
      'Pre-handoff crash recovery failed.';
  END IF;

  PERFORM set_config(
    'bark.f58_pre_new_token',
    v_claim.lease_token::TEXT,
    TRUE
  );

  RAISE NOTICE
    'PASS 5: Pre-handoff crash recovered under new lease';

END;
$before_handoff$;

/* =======================================================
   TEST 6 - UNCOMMITTED HANDOFF ROLLBACK

   This SAVEPOINT models a transaction that
   fails BEFORE its provider handoff commits.

   The temporary handoff is later rolled back.

   No provider submission is performed.

   A rolled-back handoff must not remain in
   PostgreSQL.
   ======================================================= */

SAVEPOINT f58_uncommitted_handoff;

DO $temporary_handoff$
DECLARE
  v_result TEXT;
BEGIN

  v_result :=
    public.begin_quotation_email_provider_handoff(
      current_setting(
        'bark.f58_pre_job'
      )::BIGINT,

      current_setting(
        'bark.f58_pre_new_token'
      )::UUID
    );

  IF v_result <> 'handoff_started' THEN
    RAISE EXCEPTION
      'Temporary provider handoff failed.';
  END IF;

  RAISE NOTICE
    'PASS 6: Uncommitted handoff created inside savepoint';

END;
$temporary_handoff$;

/*
 * Cancel the temporary handoff.
 *
 * The outer test transaction stays active.
 */

ROLLBACK TO SAVEPOINT f58_uncommitted_handoff;

RELEASE SAVEPOINT f58_uncommitted_handoff;

RESET ROLE;

/* =======================================================
   TEST 7 - SAVEPOINT ROLLBACK WAS ATOMIC
   ======================================================= */

DO $verify_savepoint$
DECLARE
  v_job BIGINT;
  v_count INTEGER;
  v_lock TIMESTAMPTZ;
BEGIN

  v_job :=
    current_setting(
      'bark.f58_pre_job'
    )::BIGINT;

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotation_email_provider_handoffs
  WHERE job_id = v_job;

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'Rolled-back handoff record still exists.';
  END IF;

  SELECT locked_until
  INTO v_lock
  FROM public.quotation_email_outbox
  WHERE id = v_job;

  IF v_lock IS NULL
     OR v_lock =
       'infinity'::TIMESTAMPTZ
     OR v_lock <= clock_timestamp()
  THEN
    RAISE EXCEPTION
      'Original lease not restored after rollback.';
  END IF;

  RAISE NOTICE
    'PASS 7: Savepoint rollback restored original lease';

END;
$verify_savepoint$;

/* =======================================================
   TEST 8 - FIRST VALID HANDOFF AFTER ROLLBACK

   This time, leave the handoff transition
   active within the outer transaction.
   ======================================================= */

SET LOCAL ROLE bark_email_worker_service;

DO $pre_handoff$
DECLARE
  v_result TEXT;
  v_job BIGINT;
  v_token UUID;
BEGIN

  v_job :=
    current_setting(
      'bark.f58_pre_job'
    )::BIGINT;

  v_token :=
    current_setting(
      'bark.f58_pre_new_token'
    )::UUID;

  v_result :=
    public.begin_quotation_email_provider_handoff(
      v_job,
      v_token
    );

  IF v_result <> 'handoff_started' THEN
    RAISE EXCEPTION
      'First post-rollback handoff failed.';
  END IF;

  v_result :=
    public.begin_quotation_email_provider_handoff(
      v_job,
      v_token
    );

  IF v_result <> 'already_handed_off' THEN
    RAISE EXCEPTION
      'Repeated provider handoff was not detected.';
  END IF;

  RAISE NOTICE
    'PASS 8: Handoff restarted once after rollback';

END;
$pre_handoff$;

/* =======================================================
   TEST 9 - APPARENTLY LOST HANDOFF RESPONSE

   The first call returns handoff_started.

   This test deliberately disregards that
   response and invokes the function again.

   The second call must not produce a new
   handoff authorization.

   This is a response-loss simulation,
   not a real network disconnect.
   ======================================================= */

DO $lost_response$
DECLARE
  v_result TEXT;
  v_job BIGINT;
  v_token UUID;
BEGIN

  v_job :=
    current_setting(
      'bark.f58_lost_job'
    )::BIGINT;

  v_token :=
    current_setting(
      'bark.f58_lost_token'
    )::UUID;

  /*
   * Simulate receiving but not retaining
   * the first response.
   */

  PERFORM
    public.begin_quotation_email_provider_handoff(
      v_job,
      v_token
    );

  /*
   * A second call may report the existing
   * handoff, but cannot authorize another
   * first-time provider submission.
   */

  v_result :=
    public.begin_quotation_email_provider_handoff(
      v_job,
      v_token
    );

  IF v_result <> 'already_handed_off' THEN
    RAISE EXCEPTION
      'Lost response allowed another handoff.';
  END IF;

  RAISE NOTICE
    'PASS 9: Repeated call after lost response blocked';

END;
$lost_response$;

/* =======================================================
   TEST 10 - TWO ADDITIONAL HANDOFFS

   accepted -> later completed
   retry    -> later reconciled

   All four internal jobs will then be
   protected by the handoff barrier.
   ======================================================= */

DO $other_handoffs$
DECLARE
  v_kind TEXT;
  v_result TEXT;
BEGIN

  FOREACH v_kind IN ARRAY
    ARRAY[
      'accepted',
      'retry'
    ]
  LOOP

    v_result :=
      public.begin_quotation_email_provider_handoff(
        current_setting(
          'bark.f58_' || v_kind || '_job'
        )::BIGINT,

        current_setting(
          'bark.f58_' || v_kind || '_token'
        )::UUID
      );

    IF v_result <> 'handoff_started' THEN
      RAISE EXCEPTION
        'Handoff failed for %',
        v_kind;
    END IF;

  END LOOP;

  RAISE NOTICE
    'PASS 10: Four internal jobs entered handoff barrier';

END;
$other_handoffs$;

/* =======================================================
   TEST 11 - ORDINARY FAILURE MUST NOT RETRY

   A handed-off job might already have
   been accepted by the provider.

   File 41 must not be able to schedule
   a routine retry for such a job.
   ======================================================= */

DO $failure_guard$
DECLARE
  v_blocked BOOLEAN := FALSE;
BEGIN

  BEGIN

    PERFORM
      public.fail_quotation_email_job(
        current_setting(
          'bark.f58_lost_job'
        )::BIGINT,

        current_setting(
          'bark.f58_lost_token'
        )::UUID,

        'PROVIDER_TIMEOUT',

        FALSE
      );

  EXCEPTION
    WHEN SQLSTATE '55000' THEN
      v_blocked := TRUE;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'Unsafe post-handoff retry was permitted.';
  END IF;

  RAISE NOTICE
    'PASS 11: Ordinary failure/retry blocked after handoff';

END;
$failure_guard$;

RESET ROLE;

/* =======================================================
   TEST 12 - HANDOFF JOBS CANNOT BE RECLAIMED

   Verify all four handed-off internal jobs
   retain infinite leases.

   A new worker claim must return zero jobs.

   Customer notifications remain deferred.
   ======================================================= */

DO $protected_leases$
DECLARE
  v_count INTEGER;
  v_blocked BOOLEAN := FALSE;
BEGIN

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotation_email_outbox AS o

  INNER JOIN
    public.quotation_email_provider_handoffs AS h
    ON h.job_id = o.id
   AND h.attempt_number = o.attempts
   AND h.lease_token = o.lease_token

  WHERE o.notification_type = 'internal'
    AND o.status = 'processing'
    AND o.locked_until =
      'infinity'::TIMESTAMPTZ;

  IF v_count <> 4 THEN
    RAISE EXCEPTION
      'Expected four protected infinite leases.';
  END IF;

  /*
   * Administrator cannot simply expire a
   * handed-off processing lease.
   */

  BEGIN

    UPDATE public.quotation_email_outbox
    SET locked_until =
      clock_timestamp() - INTERVAL '1 second'
    WHERE id =
      current_setting(
        'bark.f58_lost_job'
      )::BIGINT;

  EXCEPTION
    WHEN SQLSTATE '55000' THEN
      v_blocked := TRUE;
  END;

  IF NOT v_blocked THEN
    RAISE EXCEPTION
      'Handoff lease guard was bypassed.';
  END IF;

  RAISE NOTICE
    'PASS 12: Infinite leases and update guard verified';

END;
$protected_leases$;

SET LOCAL ROLE bark_email_worker_service;

DO $no_claim$
DECLARE
  v_count INTEGER;
BEGIN

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.claim_quotation_email_jobs(10);

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'Provider-handed-off job was reclaimed.';
  END IF;

  RAISE NOTICE
    'PASS 13: No automatic claim after handoff';

END;
$no_claim$;

/* =======================================================
   TEST 14 - CONFIRMED ACCEPTANCE

   No provider request occurs in this test.

   The provider ID is fictional and models
   a confirmed response.

   File 41 may complete the handed-off job.
   ======================================================= */

DO $accepted$
DECLARE
  v_completed BOOLEAN;
  v_repeated BOOLEAN;
BEGIN

  v_completed :=
    public.complete_quotation_email_job(
      current_setting(
        'bark.f58_accepted_job'
      )::BIGINT,

      current_setting(
        'bark.f58_accepted_token'
      )::UUID,

      'mock-file58-provider-accepted'
    );

  IF NOT v_completed THEN
    RAISE EXCEPTION
      'Confirmed mock acceptance was rejected.';
  END IF;

  v_repeated :=
    public.complete_quotation_email_job(
      current_setting(
        'bark.f58_accepted_job'
      )::BIGINT,

      current_setting(
        'bark.f58_accepted_token'
      )::UUID,

      'mock-file58-provider-duplicate'
    );

  IF v_repeated THEN
    RAISE EXCEPTION
      'Completed email was accepted twice.';
  END IF;

  RAISE NOTICE
    'PASS 14: Mock acceptance completed exactly once';

END;
$accepted$;

/* =======================================================
   TEST 15 - UNCERTAIN HANDOFF TO ADMINISTRATOR

   The lost-response job must not retry
   automatically.

   Place it on a File 52 reconciliation hold.

   Then use File 53 to close it without
   authorizing another provider submission.
   ======================================================= */

DO $hold_lost$
DECLARE
  v_result TEXT;
  v_count INTEGER;
BEGIN

  v_result :=
    public.hold_quotation_email_for_reconciliation(
      current_setting(
        'bark.f58_lost_job'
      )::BIGINT,

      current_setting(
        'bark.f58_lost_token'
      )::UUID,

      'UNKNOWN_PROVIDER_ACCEPTANCE'
    );

  IF v_result <> 'held' THEN
    RAISE EXCEPTION
      'Lost-response job could not be held.';
  END IF;

  /*
   * The old lease cannot retrieve job data
   * after a hold is recorded.
   */

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.get_quotation_email_job_data(
    current_setting(
      'bark.f58_lost_job'
    )::BIGINT,

    current_setting(
      'bark.f58_lost_token'
    )::UUID
  );

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'Held job still accepted the old lease.';
  END IF;

  RAISE NOTICE
    'PASS 15: Lost-response job placed on hold';

END;
$hold_lost$;

RESET ROLE;

DO $close_lost$
DECLARE
  v_result TEXT;
BEGIN

  v_result :=
    public.resolve_quotation_email_reconciliation(
      current_setting(
        'bark.f58_lost_job'
      )::BIGINT,

      'closed_without_send',

      'CASE-F58-LOST-CLOSED-001',

      NULL
    );

  IF v_result <> 'closed_without_send' THEN
    RAISE EXCEPTION
      'Administrator closure failed.';
  END IF;

END;
$close_lost$;

/* =======================================================
   TEST 16 - AUTHORIZED RETRY AND SECOND HANDOFF

   A) Hold the first uncertain attempt.
   B) Administrator authorizes retry,
      representing verified non-acceptance.
   C) Make the retry due for this test only.
   D) Worker claims attempt 2 with a new token.
   E) Old token cannot authorize new handoff.
   F) New handoff becomes protected.
   G) Hold attempt 2 and close it.
   H) Preserve both reconciliation episodes.

   NO provider is contacted.
   ======================================================= */

SET LOCAL ROLE bark_email_worker_service;

DO $first_retry_hold$
DECLARE
  v_result TEXT;
BEGIN

  v_result :=
    public.hold_quotation_email_for_reconciliation(
      current_setting(
        'bark.f58_retry_job'
      )::BIGINT,

      current_setting(
        'bark.f58_retry_token'
      )::UUID,

      'CONNECTION_LOST_AFTER_SUBMIT'
    );

  IF v_result <> 'held' THEN
    RAISE EXCEPTION
      'First retry scenario hold failed.';
  END IF;

END;
$first_retry_hold$;

RESET ROLE;

DO $authorize_retry$
DECLARE
  v_result TEXT;
  v_delay DOUBLE PRECISION;
BEGIN

  /*
   * Fictional provider non-acceptance is
   * assumed for this controlled test.
   */

  v_result :=
    public.resolve_quotation_email_reconciliation(
      current_setting(
        'bark.f58_retry_job'
      )::BIGINT,

      'retry_authorized',

      'CASE-F58-NOT-ACCEPTED-001',

      NULL
    );

  IF v_result <> 'retry_authorized' THEN
    RAISE EXCEPTION
      'Administrator retry authorization failed.';
  END IF;

  SELECT EXTRACT(
    EPOCH FROM (
      next_attempt_at - updated_at
    )
  )
  INTO v_delay
  FROM public.quotation_email_outbox
  WHERE id =
    current_setting(
      'bark.f58_retry_job'
    )::BIGINT;

  IF v_delay < 55
     OR v_delay > 65
  THEN
    RAISE EXCEPTION
      'Expected 60-second retry, got %',
      v_delay;
  END IF;

  /*
   * Make only this fictional job due.
   * This operation is rolled back.
   */

  UPDATE public.quotation_email_outbox
  SET next_attempt_at =
    clock_timestamp() - INTERVAL '1 second'
  WHERE id =
    current_setting(
      'bark.f58_retry_job'
    )::BIGINT
    AND status = 'pending';

END;
$authorize_retry$;

SET LOCAL ROLE bark_email_worker_service;

DO $second_attempt$
DECLARE
  v_claim RECORD;
  v_result TEXT;
BEGIN

  SELECT *
  INTO v_claim
  FROM public.claim_quotation_email_jobs(1);

  IF NOT FOUND
     OR v_claim.job_id <>
       current_setting(
         'bark.f58_retry_job'
       )::BIGINT
     OR v_claim.attempt_number <> 2
     OR v_claim.lease_token =
       current_setting(
         'bark.f58_retry_token'
       )::UUID
  THEN
    RAISE EXCEPTION
      'Authorized retry was not reclaimed correctly.';
  END IF;

  /*
   * Superseded attempt-1 token must not
   * authorize provider submission.
   */

  v_result :=
    public.begin_quotation_email_provider_handoff(
      v_claim.job_id,

      current_setting(
        'bark.f58_retry_token'
      )::UUID
    );

  IF v_result <> 'stale_lease' THEN
    RAISE EXCEPTION
      'Old lease authorized another handoff.';
  END IF;

  v_result :=
    public.begin_quotation_email_provider_handoff(
      v_claim.job_id,
      v_claim.lease_token
    );

  IF v_result <> 'handoff_started' THEN
    RAISE EXCEPTION
      'Second-attempt handoff failed.';
  END IF;

  /*
   * This second hypothetical submission
   * also ends with an uncertain outcome.
   */

  v_result :=
    public.hold_quotation_email_for_reconciliation(
      v_claim.job_id,
      v_claim.lease_token,
      'UNKNOWN_PROVIDER_ACCEPTANCE'
    );

  IF v_result <> 'held' THEN
    RAISE EXCEPTION
      'Second reconciliation hold failed.';
  END IF;

END;
$second_attempt$;

RESET ROLE;

DO $close_second_attempt$
DECLARE
  v_result TEXT;
  v_count INTEGER;
BEGIN

  v_result :=
    public.resolve_quotation_email_reconciliation(
      current_setting(
        'bark.f58_retry_job'
      )::BIGINT,

      'closed_without_send',

      'CASE-F58-SECOND-CLOSED-001',

      NULL
    );

  IF v_result <> 'closed_without_send' THEN
    RAISE EXCEPTION
      'Second attempt closure failed.';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotation_email_reconciliation_holds
  WHERE job_id =
    current_setting(
      'bark.f58_retry_job'
    )::BIGINT
    AND resolved_at IS NOT NULL;

  IF v_count <> 2 THEN
    RAISE EXCEPTION
      'Second-attempt reconciliation history lost.';
  END IF;

  RAISE NOTICE
    'PASS 16: Authorized retry, second hold and audit passed';

END;
$close_second_attempt$;

/* =======================================================
   TEST 17 - FINAL RECOVERY AND INTEGRITY CHECKS

   Close the remaining pre-handoff recovery job.

   Expected internal states:
     pre       failed (closed after handoff)
     lost      failed (closed after uncertainty)
     accepted  sent   (mock accepted)
     retry     failed (closed after attempt 2)

   Expected history:
     Handoffs: 5
     Holds:    4
     Outbox:   8
     Quotes:   4
     Items:    4

   All will be rolled back after verification.
   ======================================================= */

DO $final$
DECLARE
  v_result TEXT;
  v_count INTEGER;
BEGIN

  /*
   * Trusted administrator places the
   * recovered pre-handoff job on hold.
   */

  v_result :=
    public.hold_quotation_email_for_reconciliation(
      current_setting(
        'bark.f58_pre_job'
      )::BIGINT,

      current_setting(
        'bark.f58_pre_new_token'
      )::UUID,

      'UNKNOWN_PROVIDER_ACCEPTANCE'
    );

  IF v_result <> 'held' THEN
    RAISE EXCEPTION
      'Recovered job could not be held.';
  END IF;

  v_result :=
    public.resolve_quotation_email_reconciliation(
      current_setting(
        'bark.f58_pre_job'
      )::BIGINT,

      'closed_without_send',

      'CASE-F58-PRE-CLOSED-001',

      NULL
    );

  IF v_result <> 'closed_without_send' THEN
    RAISE EXCEPTION
      'Recovered job closure failed.';
  END IF;

  /*
   * Exactly three internal jobs should be
   * terminal failed and one should be sent.
   */

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotation_email_outbox
  WHERE notification_type = 'internal'
    AND status = 'failed';

  IF v_count <> 3 THEN
    RAISE EXCEPTION
      'Expected three terminal failed jobs.';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotation_email_outbox
  WHERE notification_type = 'internal'
    AND status = 'sent'
    AND provider_message_id =
      'mock-file58-provider-accepted';

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Expected one mock-accepted sent job.';
  END IF;

  /*
   * Four customer notification jobs remain
   * deferred and untouched.
   */

  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM public.quotation_email_outbox
  WHERE notification_type = 'customer'
    AND status = 'pending'
    AND attempts = 0
    AND next_attempt_at > clock_timestamp();

  IF v_count <> 4 THEN
    RAISE EXCEPTION
      'Deferred customer jobs were modified.';
  END IF;

  /*
   * Handoff histories:
   *
   * pre attempt 2
   * lost attempt 1
   * accepted attempt 1
   * retry attempts 1 and 2
   */

  IF (
    SELECT COUNT(*)
    FROM public.quotation_email_provider_handoffs
  ) <> 5 THEN
    RAISE EXCEPTION
      'Expected five handoff history records.';
  END IF;

  /*
   * Reconciliation histories:
   *
   * pre 1
   * lost 1
   * retry 2
   */

  IF (
    SELECT COUNT(*)
    FROM public.quotation_email_reconciliation_holds
  ) <> 4 THEN
    RAISE EXCEPTION
      'Expected four reconciliation histories.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quotation_email_reconciliation_holds
    WHERE resolved_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'An unresolved fictional hold remains.';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.quotations
    WHERE customer_message LIKE
      'FILE 58 ROLLBACK %'
  ) <> 4
  OR (
    SELECT COUNT(*)
    FROM public.quotation_email_outbox
  ) <> 8
  THEN
    RAISE EXCEPTION
      'Final fictional record counts incorrect.';
  END IF;

  RAISE NOTICE
    'PASS 17: Final statuses and audit history verified';

END;
$final$;

/* =======================================================
   FINAL TRANSACTION ROLLBACK

   Discards all fictional:
   - quotations
   - quotation items
   - outbox jobs
   - worker claims
   - leases
   - provider handoffs
   - reconciliation holds
   - administrator decisions

   Existing migrations remain installed.

   DO NOT CHANGE TO COMMIT.
   ======================================================= */

ROLLBACK;
