
/*
============================================================
BARK ORNAMENT (PVT) LTD

FILE 41 - SECURE EMAIL WORKER COMPLETION & RETRIES

File:
database/008_create_email_worker_completion.sql

PURPOSE
-------
1. Record accepted email-provider submissions.
2. Schedule retries after temporary failures.
3. Mark permanent or exhausted failures.
4. Reject stale or expired worker lease tokens.
5. Keep direct outbox access restricted.

DEPENDENCIES
------------
005_create_quotation_email_outbox.sql
006_create_quotation_email_enqueue.sql
007_create_email_worker_claim.sql

IMPORTANT
---------
- Run as PostgreSQL administrator: postgres.
- This migration does not send email.
- This migration does not enable a worker.
- This migration does not enable quotations.
- Provider message IDs are not proof of inbox delivery.
============================================================
*/

BEGIN;

/* ========================================================
   1. MARK A CLAIMED JOB AS SENT

   The future email worker may call this only AFTER
   an email provider confirms acceptance.

   Required:
   - Job exists
   - Status is processing
   - Provided token matches current lease token
   - Lease has not expired
   - Provider message ID is valid

   Returns:
   TRUE  = job transitioned to sent
   FALSE = no active matching lease / state

   Invalid function arguments raise SQLSTATE 22023.
   ======================================================== */

CREATE OR REPLACE FUNCTION
  public.complete_quotation_email_job(
    p_job_id BIGINT,
    p_lease_token UUID,
    p_provider_message_id TEXT
  )
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_updated INTEGER := 0;
BEGIN

  IF p_job_id IS NULL
     OR p_job_id < 1
     OR p_lease_token IS NULL
  THEN
    RAISE EXCEPTION
      'Valid job ID and lease token are required.'
      USING ERRCODE = '22023';
  END IF;

  /*
   * Provider identifiers must be bounded,
   * printable single-line identifiers.
   *
   * No raw provider response, email body,
   * personal data, or credentials belong here.
   */

  IF p_provider_message_id IS NULL
     OR pg_catalog.length(p_provider_message_id) > 255
     OR p_provider_message_id !~
       '^[A-Za-z0-9][A-Za-z0-9._:/+@-]*$'
  THEN
    RAISE EXCEPTION
      'Invalid provider message identifier.'
      USING ERRCODE = '22023';
  END IF;

  /*
   * Atomic conditional update prevents
   * stale workers from completing a job.
   */

  UPDATE public.quotation_email_outbox AS o
  SET
    status = 'sent',
    sent_at = pg_catalog.clock_timestamp(),
    provider_message_id = p_provider_message_id,
    last_error_code = NULL,
    locked_until = NULL,
    lease_token = NULL,
    updated_at = pg_catalog.clock_timestamp()
  WHERE
    o.id = p_job_id
    AND o.status = 'processing'
    AND o.lease_token = p_lease_token
    AND o.locked_until >
        pg_catalog.clock_timestamp();

  GET DIAGNOSTICS
    v_updated = ROW_COUNT;

  RETURN v_updated = 1;

END;
$function$;

/* ========================================================
   2. RECORD A FAILED DELIVERY ATTEMPT

   Returns:
   retry_scheduled = temporary failure, new pending job
   failed          = permanent or attempt 20
   stale_lease     = invalid, expired or superseded lease

   The attempt counter was already increased by
   File 40 when the job was claimed.

   Failure recording must NOT increment it again.

   The retry schedule uses:
     attempt 1:  60 seconds
     attempt 2: 120 seconds
     attempt 3: 240 seconds
     attempt 4: 480 seconds
     attempt 5: 960 seconds
     attempt 6: 1920 seconds
     attempt 7+: 3600 seconds

   No automatic retry after the 20th attempt.
   ======================================================== */

CREATE OR REPLACE FUNCTION
  public.fail_quotation_email_job(
    p_job_id BIGINT,
    p_lease_token UUID,
    p_error_code TEXT,
    p_permanent BOOLEAN DEFAULT FALSE
  )
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_result TEXT;
BEGIN

  IF p_job_id IS NULL
     OR p_job_id < 1
     OR p_lease_token IS NULL
  THEN
    RAISE EXCEPTION
      'Valid job ID and lease token are required.'
      USING ERRCODE = '22023';
  END IF;

  /*
   * Store a safe error classification only.
   *
   * Examples:
   * - PROVIDER_TIMEOUT
   * - PROVIDER_UNAVAILABLE
   * - RATE_LIMITED
   * - RECIPIENT_REJECTED
   *
   * Never store raw API responses, secrets,
   * customer email content or stack traces.
   */

  IF p_error_code IS NULL
     OR pg_catalog.length(p_error_code) > 80
     OR p_error_code !~ '^[A-Z][A-Z0-9_]*$'
  THEN
    RAISE EXCEPTION
      'Invalid email failure code.'
      USING ERRCODE = '22023';
  END IF;

  IF p_permanent IS NULL THEN
    RAISE EXCEPTION
      'Permanent failure flag is required.'
      USING ERRCODE = '22023';
  END IF;

  /*
   * The conditional UPDATE is atomic.
   *
   * A valid active lease can transition:
   *
   * processing -> pending (retry)
   * processing -> failed  (terminal)
   *
   * Jobs already sent, failed, pending or
   * leased by another worker are unchanged.
   */

  UPDATE public.quotation_email_outbox AS o
  SET
    status =
      CASE
        WHEN p_permanent OR o.attempts >= 20
          THEN 'failed'
        ELSE 'pending'
      END,

    next_attempt_at =
      CASE
        WHEN p_permanent OR o.attempts >= 20
          THEN pg_catalog.clock_timestamp()
        ELSE
          pg_catalog.clock_timestamp()
          + pg_catalog.make_interval(
              secs => pg_catalog.least(
                3600,
                (
                  60 * pg_catalog.power(
                    2::numeric,
                    pg_catalog.least(
                      o.attempts - 1,
                      6
                    )
                  )
                )::INTEGER
              )
            )
      END,

    locked_until = NULL,
    lease_token = NULL,
    sent_at = NULL,
    provider_message_id = NULL,
    last_error_code = p_error_code,
    updated_at = pg_catalog.clock_timestamp()

  WHERE
    o.id = p_job_id
    AND o.status = 'processing'
    AND o.lease_token = p_lease_token
    AND o.locked_until >
        pg_catalog.clock_timestamp()

  RETURNING
    CASE
      WHEN o.status = 'failed'
        THEN 'failed'
      ELSE 'retry_scheduled'
    END
  INTO v_result;

  RETURN pg_catalog.coalesce(
    v_result,
    'stale_lease'
  );

END;
$function$;

/* ========================================================
   3. TRUSTED FUNCTION OWNERSHIP
   ======================================================== */

ALTER FUNCTION
  public.complete_quotation_email_job(
    BIGINT, UUID, TEXT
  )
OWNER TO postgres;

ALTER FUNCTION
  public.fail_quotation_email_job(
    BIGINT, UUID, TEXT, BOOLEAN
  )
OWNER TO postgres;

/* ========================================================
   4. REMOVE PUBLIC EXECUTION ACCESS

   A SECURITY DEFINER function must not be
   executable by arbitrary database users.
   ======================================================== */

REVOKE ALL ON FUNCTION
  public.complete_quotation_email_job(
    BIGINT, UUID, TEXT
  )
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.fail_quotation_email_job(
    BIGINT, UUID, TEXT, BOOLEAN
  )
FROM PUBLIC;

/* ========================================================
   5. WEBSITE ACCOUNT CANNOT CONTROL WORKER JOBS
   ======================================================== */

REVOKE ALL ON FUNCTION
  public.complete_quotation_email_job(
    BIGINT, UUID, TEXT
  )
FROM bark_web_dev;

REVOKE ALL ON FUNCTION
  public.fail_quotation_email_job(
    BIGINT, UUID, TEXT, BOOLEAN
  )
FROM bark_web_dev;

/* ========================================================
   6. GRANT CONTROLLED EXECUTION TO WORKER ROLE
   ======================================================== */

GRANT EXECUTE ON FUNCTION
  public.complete_quotation_email_job(
    BIGINT, UUID, TEXT
  )
TO bark_email_worker;

GRANT EXECUTE ON FUNCTION
  public.fail_quotation_email_job(
    BIGINT, UUID, TEXT, BOOLEAN
  )
TO bark_email_worker;

/* ========================================================
   7. PRESERVE DIRECT OUTBOX RESTRICTIONS
   ======================================================== */

REVOKE ALL ON TABLE
  public.quotation_email_outbox
FROM PUBLIC;

REVOKE ALL ON TABLE
  public.quotation_email_outbox
FROM bark_web_dev;

REVOKE ALL ON TABLE
  public.quotation_email_outbox
FROM bark_email_worker;

REVOKE ALL ON SEQUENCE
  public.quotation_email_outbox_id_seq
FROM PUBLIC;

REVOKE ALL ON SEQUENCE
  public.quotation_email_outbox_id_seq
FROM bark_web_dev;

REVOKE ALL ON SEQUENCE
  public.quotation_email_outbox_id_seq
FROM bark_email_worker;

/* ========================================================
   8. DOCUMENTATION
   ======================================================== */

COMMENT ON FUNCTION
  public.complete_quotation_email_job(
    BIGINT, UUID, TEXT
  )
IS
  'Marks one processing email job as sent only '
  'when its current lease token is valid and '
  'unexpired. Records provider acceptance ID. '
  'Returns true only on successful transition.';

COMMENT ON FUNCTION
  public.fail_quotation_email_job(
    BIGINT, UUID, TEXT, BOOLEAN
  )
IS
  'Records a delivery failure under a valid '
  'unexpired lease. Schedules exponential '
  'backoff or marks terminal failure. '
  'Rejects stale tokens without changing rows.';

/* ========================================================
   9. COMPLETE MIGRATION
   ======================================================== */

COMMIT;
