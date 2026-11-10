
/*
 BARK ORNAMENT - FILE 49
 ROLLBACK-ONLY LOCAL POSTGRESQL EMAIL WORKER
 INTEGRATION TEST

 Run as postgres in pgAdmin against local bark_ornament.

 Requirements:
 - Migrations 001-010 installed
 - Empty email outbox
 - No running email worker
 - Quotation submissions and real emails disabled

 All fictional records are rolled back.
 PostgreSQL sequence values are not rolled back.

 If any statement fails, execute ROLLBACK separately.
*/

BEGIN;

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

LOCK TABLE public.quotation_email_outbox
IN SHARE ROW EXCLUSIVE MODE NOWAIT;

/* ==================================================
   PASS 1 - SAFETY AND PERMISSION PREFLIGHT
   ================================================== */

DO $preflight$
BEGIN

  IF current_database() <> 'bark_ornament'
     OR current_user <> 'postgres'
  THEN
    RAISE EXCEPTION
      'FILE 49 STOP: Use postgres on bark_ornament';
  END IF;

  IF inet_server_addr() IS NOT NULL
     AND host(inet_server_addr()) NOT IN
       ('127.0.0.1', '::1')
  THEN
    RAISE EXCEPTION
      'FILE 49 STOP: Local PostgreSQL only';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quotation_email_outbox
  ) THEN
    RAISE EXCEPTION
      'FILE 49 STOP: Outbox not empty. Do not delete existing jobs.';
  END IF;

  IF NOT has_function_privilege(
       'bark_email_worker_service',
       'public.claim_quotation_email_jobs(integer)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'bark_email_worker_service',
       'public.get_quotation_email_job_data(bigint,uuid)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'bark_email_worker_service',
       'public.complete_quotation_email_job(bigint,uuid,text)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'bark_email_worker_service',
       'public.fail_quotation_email_job(bigint,uuid,text,boolean)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'bark_web_dev',
       'public.claim_quotation_email_jobs(integer)',
       'EXECUTE'
     )
     OR has_table_privilege(
       'bark_email_worker_service',
       'public.quotation_email_outbox',
       'SELECT'
     )
  THEN
    RAISE EXCEPTION
      'FILE 49 STOP: Unexpected worker privileges';
  END IF;

  RAISE NOTICE
    'PASS 1: Local, empty-outbox and permission preflight';

END;
$preflight$;

/* ==================================================
   PASS 2 - WEBSITE ROLE MUST NOT CLAIM JOBS
   ================================================== */

SET LOCAL ROLE bark_web_dev;

DO $website_denial$
BEGIN
  BEGIN

    PERFORM public.claim_quotation_email_jobs(0);

    RAISE EXCEPTION
      'SECURITY FAILURE: Website called worker claim';

  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE
        'PASS 2: Website worker-claim EXECUTE denied';
  END;
END;
$website_denial$;

RESET ROLE;

/* ==================================================
   PASS 3 - CREATE SIX FICTIONAL QUOTATIONS
   ================================================== */

DO $seed$
DECLARE
  v_scenario TEXT;
  v_id UUID;
  v_ref TEXT;
  v_jobs INTEGER;
  v_target TEXT;
  v_job BIGINT;
BEGIN

  FOREACH v_scenario IN ARRAY ARRAY[
    'success',
    'retry',
    'permanent',
    'terminal',
    'stale',
    'excluded'
  ]
  LOOP

    v_id := gen_random_uuid();

    v_ref :=
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
      v_ref,
      'File 49 Fictional Buyer',
      'File 49 Fictional Hotel',
      'file49@example.invalid',
      'Maldives',
      'FILE 49 ROLLBACK ' || v_scenario,
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
      quantity,
      requested_material,
      requested_size,
      requested_finish,
      requested_customization,
      product_notes
    )
    VALUES
    (
      v_id,
      1,
      'file49-menu',
      'file49-menu',
      'File 49 Menu Cover',
      'printing-stationery',
      2,
      'Eco Leather',
      'A4',
      'Gold Embossing',
      'Fictional Logo',
      'Rollback only'
    ),
    (
      v_id,
      2,
      'file49-folder',
      'file49-folder',
      'File 49 Folder',
      'printing-stationery',
      5,
      'Paper',
      'A5',
      'Matte',
      NULL,
      NULL
    );

    SELECT
      public.enqueue_quotation_email_notifications(v_id)
    INTO v_jobs;

    IF v_jobs <> 2 THEN
      RAISE EXCEPTION
        'Enqueue expected 2 for %, got %',
        v_scenario,
        v_jobs;
    END IF;

    SELECT
      public.enqueue_quotation_email_notifications(v_id)
    INTO v_jobs;

    IF v_jobs <> 0 THEN
      RAISE EXCEPTION
        'Repeated enqueue was not idempotent for %',
        v_scenario;
    END IF;

    PERFORM set_config(
      'bark.file49_' || v_scenario || '_qid',
      v_id::TEXT,
      TRUE
    );

    UPDATE public.quotation_email_outbox
    SET next_attempt_at =
      clock_timestamp() + INTERVAL '1 day'
    WHERE quotation_id = v_id;

    IF v_scenario IN ('retry', 'permanent') THEN
      v_target := 'customer';
    ELSE
      v_target := 'internal';
    END IF;

    SELECT id
    INTO STRICT v_job
    FROM public.quotation_email_outbox
    WHERE quotation_id = v_id
      AND notification_type = v_target;

    PERFORM set_config(
      'bark.file49_' || v_scenario || '_job',
      v_job::TEXT,
      TRUE
    );

    UPDATE public.quotation_email_outbox
    SET next_attempt_at =
      clock_timestamp() - INTERVAL '1 second'
    WHERE id = v_job;

    IF v_scenario = 'terminal' THEN

      UPDATE public.quotation_email_outbox
      SET attempts = 19
      WHERE id = v_job;

    END IF;

    IF v_scenario = 'excluded' THEN

      UPDATE public.quotation_items
      SET
        product_id = '__test_only_quotation_product__',
        product_slug = '__test-only-quotation-product__'
      WHERE quotation_id = v_id
        AND item_position = 1;

    END IF;

  END LOOP;

  IF (
    SELECT count(*)
    FROM public.quotation_email_outbox
  ) <> 12 THEN

    RAISE EXCEPTION
      'Expected exactly 12 temporary outbox rows';

  END IF;

  RAISE NOTICE
    'PASS 3: Six fictional quotations, 12 jobs, idempotent enqueue';

END;
$seed$;

/* ==================================================
   PASS 4 & 5 - CLAIM AND RETRIEVE SECURELY

   CORRECTED: explicit scalar variables are used
   for claimed-job fields. The attempt check uses
   separate IF branches instead of CASE.
   ================================================== */

SET LOCAL ROLE bark_email_worker_service;

DO $claim_and_retrieve$
DECLARE
  v_job_id BIGINT;
  v_quotation_id UUID;
  v_notification_type TEXT;
  v_lease_token UUID;
  v_attempt_number INTEGER;

  v_data RECORD;
  v_name TEXT;
  v_scenario TEXT;

  v_count INTEGER := 0;
  v_access_count INTEGER;
BEGIN

  FOR
    v_job_id,
    v_quotation_id,
    v_notification_type,
    v_lease_token,
    v_attempt_number
  IN
    SELECT
      job_id,
      quotation_id,
      notification_type,
      lease_token,
      attempt_number
    FROM public.claim_quotation_email_jobs(10)
  LOOP

    v_count := v_count + 1;
    v_scenario := NULL;

    FOREACH v_name IN ARRAY ARRAY[
      'success',
      'retry',
      'permanent',
      'terminal',
      'stale'
    ]
    LOOP

      IF v_quotation_id =
        current_setting(
          'bark.file49_' || v_name || '_qid'
        )::UUID
      THEN
        v_scenario := v_name;
        EXIT;
      END IF;

    END LOOP;

    IF v_scenario IS NULL THEN
      RAISE EXCEPTION
        'Worker claimed an unexpected quotation';
    END IF;

    IF v_job_id IS NULL OR v_job_id < 1 THEN
      RAISE EXCEPTION
        'Worker claimed an invalid job ID';
    END IF;

    IF v_lease_token IS NULL THEN
      RAISE EXCEPTION
        'Worker returned a missing lease token';
    END IF;

    /*
     * Expected attempts:
     * terminal = 20
     * every other scenario = 1
     */

    IF v_scenario = 'terminal' THEN

      IF v_attempt_number IS DISTINCT FROM 20 THEN
        RAISE EXCEPTION
          'Unexpected terminal attempt number: %',
          v_attempt_number;
      END IF;

    ELSE

      IF v_attempt_number IS DISTINCT FROM 1 THEN
        RAISE EXCEPTION
          'Unexpected attempt number for %: %',
          v_scenario,
          v_attempt_number;
      END IF;

    END IF;

    PERFORM set_config(
      'bark.file49_' || v_scenario || '_token',
      v_lease_token::TEXT,
      TRUE
    );

    SELECT *
    INTO STRICT v_data
    FROM public.get_quotation_email_job_data(
      v_job_id,
      v_lease_token
    );

    IF v_data.quotation_id IS DISTINCT FROM v_quotation_id
       OR v_data.customer_email IS DISTINCT FROM
          'file49@example.invalid'
       OR jsonb_array_length(v_data.product_items)
          IS DISTINCT FROM 2
       OR v_data.product_items->0->>'productName'
          IS DISTINCT FROM 'File 49 Menu Cover'
       OR v_data.product_items->0->'options'->>'material'
          IS DISTINCT FROM 'Eco Leather'
       OR v_data.product_items->1->>'productName'
          IS DISTINCT FROM 'File 49 Folder'
    THEN
      RAISE EXCEPTION
        'Leased data mismatch for %',
        v_scenario;
    END IF;

    SELECT count(*)
    INTO v_access_count
    FROM public.get_quotation_email_job_data(
      v_job_id,
      gen_random_uuid()
    );

    IF v_access_count <> 0 THEN
      RAISE EXCEPTION
        'Wrong token leaked quotation data';
    END IF;

  END LOOP;

  IF v_count <> 5 THEN
    RAISE EXCEPTION
      'Expected 5 eligible claims; got %',
      v_count;
  END IF;

  SELECT count(*)
  INTO v_access_count
  FROM public.get_quotation_email_job_data(
    current_setting(
      'bark.file49_excluded_job'
    )::BIGINT,
    current_setting(
      'bark.file49_success_token'
    )::UUID
  );

  IF v_access_count <> 0 THEN
    RAISE EXCEPTION
      'Token for another job exposed customer data';
  END IF;

  SELECT count(*)
  INTO v_access_count
  FROM public.claim_quotation_email_jobs(10);

  IF v_access_count <> 0 THEN
    RAISE EXCEPTION
      'Unexpected immediate reclaims';
  END IF;

  RAISE NOTICE
    'PASS 4: Five restricted claims and ordered data retrieval';

  RAISE NOTICE
    'PASS 5: Wrong/cross-job tokens and repeat claim denied';

END;
$claim_and_retrieve$;

RESET ROLE;

/* ==================================================
   PASS 6 - SYNTHETIC PRODUCT EXCLUSION
   ================================================== */

DO $exclusion$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM public.quotation_email_outbox
    WHERE id =
      current_setting(
        'bark.file49_excluded_job'
      )::BIGINT
      AND status = 'pending'
      AND attempts = 0
  ) THEN
    RAISE EXCEPTION
      'Synthetic post-enqueue job was incorrectly claimed';
  END IF;

  RAISE NOTICE
    'PASS 6: Tampered synthetic product excluded from claiming';

END;
$exclusion$;

/* ==================================================
   PASS 7, 8 & 9 - COMPLETION AND FAILURE
   ================================================== */

SET LOCAL ROLE bark_email_worker_service;

DO $transitions$
DECLARE
  v_success BIGINT :=
    current_setting('bark.file49_success_job')::BIGINT;

  v_retry BIGINT :=
    current_setting('bark.file49_retry_job')::BIGINT;

  v_permanent BIGINT :=
    current_setting('bark.file49_permanent_job')::BIGINT;

  v_terminal BIGINT :=
    current_setting('bark.file49_terminal_job')::BIGINT;

  v_success_token UUID :=
    current_setting('bark.file49_success_token')::UUID;

  v_retry_token UUID :=
    current_setting('bark.file49_retry_token')::UUID;

  v_permanent_token UUID :=
    current_setting('bark.file49_permanent_token')::UUID;

  v_terminal_token UUID :=
    current_setting('bark.file49_terminal_token')::UUID;

  v_completed BOOLEAN;
  v_outcome TEXT;
BEGIN

  v_completed :=
    public.complete_quotation_email_job(
      v_success,
      v_success_token,
      'file49-fake-provider-success'
    );

  IF v_completed IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION
      'Valid mock acceptance was not recorded';
  END IF;

  v_completed :=
    public.complete_quotation_email_job(
      v_success,
      v_success_token,
      'file49-fake-provider-repeat'
    );

  IF v_completed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION
      'Success completion was not exactly once';
  END IF;

  v_outcome :=
    public.fail_quotation_email_job(
      v_retry,
      gen_random_uuid(),
      'PROVIDER_TIMEOUT',
      FALSE
    );

  IF v_outcome IS DISTINCT FROM 'stale_lease' THEN
    RAISE EXCEPTION
      'Wrong token was not rejected';
  END IF;

  v_outcome :=
    public.fail_quotation_email_job(
      v_retry,
      v_retry_token,
      'PROVIDER_TIMEOUT',
      FALSE
    );

  IF v_outcome IS DISTINCT FROM 'retry_scheduled' THEN
    RAISE EXCEPTION
      'Temporary failure did not schedule a retry';
  END IF;

  v_outcome :=
    public.fail_quotation_email_job(
      v_permanent,
      v_permanent_token,
      'RECIPIENT_REJECTED',
      TRUE
    );

  IF v_outcome IS DISTINCT FROM 'failed' THEN
    RAISE EXCEPTION
      'Permanent failure was not terminal';
  END IF;

  v_outcome :=
    public.fail_quotation_email_job(
      v_terminal,
      v_terminal_token,
      'PROVIDER_TIMEOUT',
      FALSE
    );

  IF v_outcome IS DISTINCT FROM 'failed' THEN
    RAISE EXCEPTION
      'Attempt 20 failure was not terminal';
  END IF;

  RAISE NOTICE
    'PASS 7: Mock acceptance and duplicate completion rejected';

  RAISE NOTICE
    'PASS 8: Temporary failure scheduled; invalid token rejected';

  RAISE NOTICE
    'PASS 9: Permanent and 20th-attempt failures terminal';

END;
$transitions$;

RESET ROLE;

/* ==================================================
   PASS 10 - RETRY DELAY
   ================================================== */

DO $retry_state$
DECLARE
  v_delay DOUBLE PRECISION;
BEGIN

  SELECT
    EXTRACT(
      EPOCH FROM (
        next_attempt_at - updated_at
      )
    )
  INTO STRICT v_delay
  FROM public.quotation_email_outbox
  WHERE id =
    current_setting(
      'bark.file49_retry_job'
    )::BIGINT
    AND status = 'pending'
    AND attempts = 1
    AND lease_token IS NULL
    AND locked_until IS NULL;

  IF v_delay NOT BETWEEN 55 AND 65 THEN
    RAISE EXCEPTION
      'Incorrect retry delay: %',
      v_delay;
  END IF;

  UPDATE public.quotation_email_outbox
  SET locked_until =
    clock_timestamp() - INTERVAL '1 second'
  WHERE id =
    current_setting(
      'bark.file49_stale_job'
    )::BIGINT;

  RAISE NOTICE
    'PASS 10: Retry delay approximately 60 seconds';

END;
$retry_state$;

/* ==================================================
   PASS 11 - EXPIRED LEASE AND RECLAIM
   ================================================== */

SET LOCAL ROLE bark_email_worker_service;

DO $stale_reclaim$
DECLARE
  v_row RECORD;

  v_old UUID :=
    current_setting(
      'bark.file49_stale_token'
    )::UUID;

  v_job BIGINT :=
    current_setting(
      'bark.file49_stale_job'
    )::BIGINT;

  v_count INTEGER;
  v_completed BOOLEAN;
  v_outcome TEXT;
BEGIN

  SELECT count(*)
  INTO v_count
  FROM public.get_quotation_email_job_data(
    v_job,
    v_old
  );

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'Expired lease exposed job data';
  END IF;

  v_completed :=
    public.complete_quotation_email_job(
      v_job,
      v_old,
      'file49-fake-stale'
    );

  IF v_completed IS DISTINCT FROM FALSE THEN
    RAISE EXCEPTION
      'Expired lease completed a job';
  END IF;

  v_outcome :=
    public.fail_quotation_email_job(
      v_job,
      v_old,
      'PROVIDER_TIMEOUT',
      FALSE
    );

  IF v_outcome IS DISTINCT FROM 'stale_lease' THEN
    RAISE EXCEPTION
      'Expired lease recorded failure';
  END IF;

  SELECT *
  INTO STRICT v_row
  FROM public.claim_quotation_email_jobs(1);

  IF v_row.job_id <> v_job
     OR v_row.attempt_number <> 2
     OR v_row.lease_token = v_old
  THEN
    RAISE EXCEPTION
      'Expired job did not receive a new lease';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM public.get_quotation_email_job_data(
    v_job,
    v_row.lease_token
  );

  IF v_count <> 1 THEN
    RAISE EXCEPTION
      'Fresh lease could not retrieve job data';
  END IF;

  v_completed :=
    public.complete_quotation_email_job(
      v_job,
      v_row.lease_token,
      'file49-fake-reclaimed'
    );

  IF v_completed IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION
      'Fresh lease could not complete job';
  END IF;

  RAISE NOTICE
    'PASS 11: Expired token denied; new lease completes attempt 2';

END;
$stale_reclaim$;

RESET ROLE;

/* ==================================================
   PASS 12 - RETRY RECLAIM
   ================================================== */

UPDATE public.quotation_email_outbox
SET next_attempt_at =
  clock_timestamp() - INTERVAL '1 second'
WHERE id =
  current_setting(
    'bark.file49_retry_job'
  )::BIGINT;

SET LOCAL ROLE bark_email_worker_service;

DO $retry_reclaim$
DECLARE
  v_row RECORD;

  v_old UUID :=
    current_setting(
      'bark.file49_retry_token'
    )::UUID;

  v_job BIGINT :=
    current_setting(
      'bark.file49_retry_job'
    )::BIGINT;

  v_count INTEGER;
  v_outcome TEXT;
  v_completed BOOLEAN;
BEGIN

  SELECT *
  INTO STRICT v_row
  FROM public.claim_quotation_email_jobs(1);

  IF v_row.job_id <> v_job
     OR v_row.attempt_number <> 2
     OR v_row.lease_token = v_old
  THEN
    RAISE EXCEPTION
      'Retry job was not reclaimed correctly';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM public.get_quotation_email_job_data(
    v_job,
    v_old
  );

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'Superseded retry lease leaked job data';
  END IF;

  v_outcome :=
    public.fail_quotation_email_job(
      v_job,
      v_old,
      'PROVIDER_TIMEOUT',
      FALSE
    );

  IF v_outcome IS DISTINCT FROM 'stale_lease' THEN
    RAISE EXCEPTION
      'Superseded retry lease recorded failure';
  END IF;

  v_completed :=
    public.complete_quotation_email_job(
      v_job,
      v_row.lease_token,
      'file49-fake-retry-success'
    );

  IF v_completed IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION
      'Fresh retry lease could not complete';
  END IF;

  RAISE NOTICE
    'PASS 12: Retry reclaimed; old lease rejected; fresh completion';

END;
$retry_reclaim$;

RESET ROLE;

/* ==================================================
   PASS 13 & 14 - FINAL STATE ASSERTIONS
   ================================================== */

DO $final_assertions$
DECLARE
  v_name TEXT;
  v_expected_status TEXT;
  v_expected_attempts INTEGER;
  v_matches INTEGER;
BEGIN

  FOREACH v_name IN ARRAY ARRAY[
    'success',
    'retry',
    'permanent',
    'terminal',
    'stale',
    'excluded'
  ]
  LOOP

    IF v_name IN ('permanent', 'terminal') THEN
      v_expected_status := 'failed';
    ELSIF v_name = 'excluded' THEN
      v_expected_status := 'pending';
    ELSE
      v_expected_status := 'sent';
    END IF;

    IF v_name = 'terminal' THEN
      v_expected_attempts := 20;
    ELSIF v_name IN ('retry', 'stale') THEN
      v_expected_attempts := 2;
    ELSIF v_name = 'excluded' THEN
      v_expected_attempts := 0;
    ELSE
      v_expected_attempts := 1;
    END IF;

    SELECT count(*)
    INTO v_matches
    FROM public.quotation_email_outbox
    WHERE id =
      current_setting(
        'bark.file49_' || v_name || '_job'
      )::BIGINT
      AND status = v_expected_status
      AND attempts = v_expected_attempts;

    IF v_matches <> 1 THEN
      RAISE EXCEPTION
        'Final state failed for %',
        v_name;
    END IF;

  END LOOP;

  IF (
    SELECT count(*)
    FROM public.quotation_email_outbox
  ) <> 12
  OR (
    SELECT count(*)
    FROM public.quotations
    WHERE customer_message LIKE
      'FILE 49 ROLLBACK %'
  ) <> 6
  OR (
    SELECT count(*)
    FROM public.quotation_items AS i
    JOIN public.quotations AS q
      ON q.id = i.quotation_id
    WHERE q.customer_message LIKE
      'FILE 49 ROLLBACK %'
  ) <> 12
  THEN
    RAISE EXCEPTION
      'Unexpected fixture counts at end of test';
  END IF;

  RAISE NOTICE
    'PASS 13: All six scenario statuses and attempts match';

  RAISE NOTICE
    'PASS 14: Only 6 fictional quotes, 12 items, 12 jobs exist';

END;
$final_assertions$;

/* ==================================================
   ROLLBACK - REMOVE ALL FICTIONAL TEST DATA
   ================================================== */

ROLLBACK;
