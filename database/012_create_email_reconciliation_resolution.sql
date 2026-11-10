
/*
============================================================
BARK ORNAMENT (PVT) LTD

FILE 53 - ADMINISTRATOR RECONCILIATION RESOLUTION

File:
database/012_create_email_reconciliation_resolution.sql

DEPENDENCIES
------------
File 37 - Email outbox
File 40 - Worker claiming and leases
File 41 - Completion and retries
File 42 - Lease-authorized data retrieval
File 44 - Restricted worker login
File 52 - Uncertain-delivery reconciliation holds

PURPOSE
-------
1. Preserve multiple reconciliation episodes per job.
2. Retain audit history across authorized retries.
3. Require administrator evidence for each resolution.
4. Resolve confirmed provider acceptance.
5. Authorize retry after confirmed non-acceptance.
6. Close notifications that must not be resent.
7. Deny the website and worker resolution privileges.
8. Keep existing worker claim/hold protections.

DOES NOT
--------
- Contact an email provider
- Verify evidence automatically
- Send email
- Start a worker process
- Enable customer quotation submissions

RUN AS:
PostgreSQL administrator postgres

DATABASE:
Local bark_ornament

Run this migration once.
============================================================
*/

BEGIN;

/* ========================================================
   1. COMPATIBILITY CHECK

   Previous File 52 has no administrator resolution
   workflow. Any manually resolved rows require
   separate review before adding stricter audit
   requirements.
   ======================================================== */

DO $compatibility$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.quotation_email_reconciliation_holds
    WHERE resolved_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'Existing resolved holds require review '
      'before File 53 migration.';
  END IF;
END;
$compatibility$;

/* ========================================================
   2. SUPPORT MULTIPLE HOLD EPISODES

   Previous key:
     job_id

   New key:
     job_id + held_attempt

   A job may be held once per claimed attempt.
   Earlier resolved episodes remain in history.

   At most one unresolved episode may exist
   for a given job at any time.
   ======================================================== */

ALTER TABLE
  public.quotation_email_reconciliation_holds
DROP CONSTRAINT
  quotation_email_reconciliation_holds_pkey;

ALTER TABLE
  public.quotation_email_reconciliation_holds
ADD CONSTRAINT
  quotation_email_reconciliation_holds_pkey
PRIMARY KEY (
  job_id,
  held_attempt
);

CREATE UNIQUE INDEX IF NOT EXISTS
  uq_quotation_email_unresolved_hold
ON public.quotation_email_reconciliation_holds (
  job_id
)
WHERE resolved_at IS NULL;


/* ========================================================
   3. ADD RESOLUTION AUDIT INFORMATION

   Evidence references should be non-secret
   investigation or provider-support case IDs.

   Never store passwords, API keys, raw provider
   responses or customer email bodies here.
   ======================================================== */

ALTER TABLE
  public.quotation_email_reconciliation_holds

ADD COLUMN
  resolution_evidence_reference TEXT,

ADD COLUMN
  resolved_by TEXT,

ADD COLUMN
  resolution_provider_message_id TEXT;

/* Unresolved episodes must contain no resolution
   audit information.

   Resolved episodes must contain all required
   audit information.

   Only provider_accepted may contain a provider
   message ID.
*/

ALTER TABLE
  public.quotation_email_reconciliation_holds

ADD CONSTRAINT
  chk_quotation_email_resolution_audit

CHECK (
  (
    resolved_at IS NULL
    AND resolution IS NULL
    AND resolution_evidence_reference IS NULL
    AND resolved_by IS NULL
    AND resolution_provider_message_id IS NULL
  )
  OR
  (
    resolved_at IS NOT NULL
    AND resolution IS NOT NULL

    /* Explicitly require documented evidence. */
    AND resolution_evidence_reference IS NOT NULL

    AND resolution_evidence_reference ~
      '^[A-Z0-9][A-Z0-9._:/+-]{7,159}$'

    AND resolved_by IS NOT NULL

    AND pg_catalog.length(resolved_by)
      BETWEEN 1 AND 128

    AND (
      (
        resolution = 'provider_accepted'

        /* Explicitly require provider acceptance ID. */
        AND resolution_provider_message_id IS NOT NULL

        AND resolution_provider_message_id ~
          '^[A-Za-z0-9][A-Za-z0-9._:/+@-]*$'

        AND pg_catalog.length(
          resolution_provider_message_id
        ) BETWEEN 1 AND 255
      )
      OR
      (
        resolution IN (
          'retry_authorized',
          'closed_without_send'
        )

        AND resolution_provider_message_id IS NULL
      )
    )
  )
);

/* ========================================================
   4. UPDATE FILE 52 HOLD FUNCTION

   The function signature stays unchanged.

   Critical change:
     Check only for an UNRESOLVED hold.

   A previously resolved hold no longer prevents
   a new uncertain outcome at a later attempt.

   The new composite primary key preserves
   every episode in the same history table.
   ======================================================== */

CREATE OR REPLACE FUNCTION
  public.hold_quotation_email_for_reconciliation(
    p_job_id BIGINT,
    p_lease_token UUID,
    p_reason_code TEXT
  )
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_attempts INTEGER;
  v_updated INTEGER;
BEGIN

  IF p_job_id IS NULL
     OR p_job_id < 1
     OR p_lease_token IS NULL
  THEN
    RAISE EXCEPTION
      'Valid job ID and lease token are required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_reason_code IS NULL
     OR p_reason_code NOT IN (
       'PROVIDER_TIMEOUT_AFTER_SUBMIT',
       'CONNECTION_LOST_AFTER_SUBMIT',
       'UNKNOWN_PROVIDER_ACCEPTANCE'
     )
  THEN
    RAISE EXCEPTION
      'Invalid reconciliation reason code.'
      USING ERRCODE = '22023';
  END IF;

  /*
   * Lock one currently processing job.
   * The worker must hold its active lease.
   */

  SELECT o.attempts
  INTO v_attempts

  FROM public.quotation_email_outbox AS o

  INNER JOIN public.quotations AS q
    ON q.id = o.quotation_id

  WHERE o.id = p_job_id
    AND o.status = 'processing'
    AND o.lease_token = p_lease_token
    AND o.locked_until >
      pg_catalog.clock_timestamp()

    AND o.attempts BETWEEN 1 AND 20

    AND q.status = 'new'
    AND q.consent_at IS NOT NULL

    AND q.quotation_reference ~
      '^BOQ-[0-9]{4}-[A-F0-9]{12}$'

    AND pg_catalog.lower(q.email) <>
      'fixture@example.invalid'

    /*
     * File 53 change:
     * Resolved historical episodes are allowed.
     * An unresolved episode is not.
     */

    AND NOT EXISTS (
      SELECT 1
      FROM public.quotation_email_reconciliation_holds
      WHERE job_id = o.id
        AND resolved_at IS NULL
    )

  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RETURN 'stale_lease';
  END IF;

  /*
   * Move the job out of processing before
   * inserting its unresolved hold record.
   *
   * The existing File 52 guard trigger
   * therefore permits this initial update.
   */

  UPDATE public.quotation_email_outbox
  SET
    status = 'pending',

    next_attempt_at =
      'infinity'::TIMESTAMPTZ,

    locked_until = NULL,
    lease_token = NULL,

    last_error_code =
      'DELIVERY_UNCERTAIN',

    sent_at = NULL,
    provider_message_id = NULL,

    updated_at =
      pg_catalog.clock_timestamp()

  WHERE id = p_job_id
    AND status = 'processing'
    AND lease_token = p_lease_token
    AND locked_until >
      pg_catalog.clock_timestamp();

  GET DIAGNOSTICS
    v_updated = ROW_COUNT;

  IF v_updated <> 1 THEN
    RAISE EXCEPTION
      'Active lease changed during hold.'
      USING ERRCODE = '55000';
  END IF;

  /*
   * Insert a new episode.
   *
   * The (job_id, held_attempt) primary key
   * prevents duplicate history records.
   *
   * The unresolved partial unique index
   * prevents simultaneous active holds.
   */

  INSERT INTO
    public.quotation_email_reconciliation_holds (
      job_id,
      reason_code,
      held_attempt
    )
  VALUES (
    p_job_id,
    p_reason_code,
    v_attempts
  );

  RETURN 'held';

END;
$function$;

ALTER FUNCTION
  public.hold_quotation_email_for_reconciliation(
    BIGINT, UUID, TEXT
  )
OWNER TO postgres;

REVOKE ALL ON FUNCTION
  public.hold_quotation_email_for_reconciliation(
    BIGINT, UUID, TEXT
  )
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.hold_quotation_email_for_reconciliation(
    BIGINT, UUID, TEXT
  )
FROM bark_web_dev;

GRANT EXECUTE ON FUNCTION
  public.hold_quotation_email_for_reconciliation(
    BIGINT, UUID, TEXT
  )
TO bark_email_worker;

/* ========================================================
   5. ADMINISTRATOR-ONLY RESOLUTION FUNCTION

   Inputs:
     p_job_id
     p_resolution
     p_evidence_reference
     p_provider_message_id

   Resolution choices:
     provider_accepted
     retry_authorized
     closed_without_send

   Return values:
     provider_accepted
     retry_authorized
     closed_without_send
     not_held

   Invalid arguments raise SQLSTATE 22023.
   Inconsistent held state raises SQLSTATE 55000.

   This function does not verify external
   provider evidence. The administrator
   must verify it before calling.
   ======================================================== */

CREATE OR REPLACE FUNCTION
  public.resolve_quotation_email_reconciliation(
    p_job_id BIGINT,
    p_resolution TEXT,
    p_evidence_reference TEXT,
    p_provider_message_id TEXT DEFAULT NULL
  )
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_job RECORD;
  v_held_attempt INTEGER;

  v_now TIMESTAMPTZ;
  v_next_attempt TIMESTAMPTZ;

  v_delay_seconds INTEGER;
  v_updated INTEGER;
BEGIN

  /* ------------------------------------------------------
     5A. Validate job and resolution
     ------------------------------------------------------ */

  IF p_job_id IS NULL
     OR p_job_id < 1
  THEN
    RAISE EXCEPTION
      'Valid reconciliation job ID required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_resolution IS NULL
     OR p_resolution NOT IN (
       'provider_accepted',
       'retry_authorized',
       'closed_without_send'
     )
  THEN
    RAISE EXCEPTION
      'Invalid reconciliation resolution.'
      USING ERRCODE = '22023';
  END IF;

  /*
   * Evidence must be a non-secret reference,
   * such as an approved investigation case ID.
   *
   * The format deliberately excludes spaces,
   * newlines, email content and raw responses.
   */

  IF p_evidence_reference IS NULL
     OR pg_catalog.length(
       p_evidence_reference
     ) NOT BETWEEN 8 AND 160

     OR p_evidence_reference !~
       '^[A-Z0-9][A-Z0-9._:/+-]*$'
  THEN
    RAISE EXCEPTION
      'Invalid reconciliation evidence reference.'
      USING ERRCODE = '22023';
  END IF;

  /*
   * Accepted email:
   *   Requires a provider message ID.
   *
   * Retry or close:
   *   Must not include a provider message ID.
   */

  IF p_resolution = 'provider_accepted' THEN

    IF p_provider_message_id IS NULL
       OR pg_catalog.length(
         p_provider_message_id
       ) NOT BETWEEN 1 AND 255

       OR p_provider_message_id !~
         '^[A-Za-z0-9][A-Za-z0-9._:/+@-]*$'
    THEN
      RAISE EXCEPTION
        'Valid provider message ID required.'
        USING ERRCODE = '22023';
    END IF;

  ELSIF p_provider_message_id IS NOT NULL THEN

    RAISE EXCEPTION
      'Provider message ID is only permitted '
      'for confirmed provider acceptance.'
      USING ERRCODE = '22023';

  END IF;

  /* ------------------------------------------------------
     5B. Lock the outbox job first

     This follows the same lock order used by
     the File 52 hold function.
     ------------------------------------------------------ */

  SELECT
    o.status,
    o.attempts,
    o.next_attempt_at,
    o.lease_token,
    o.locked_until,
    o.last_error_code

  INTO v_job

  FROM public.quotation_email_outbox AS o

  WHERE o.id = p_job_id

  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RETURN 'not_held';
  END IF;

  /* ------------------------------------------------------
     5C. Lock the unresolved hold episode
     ------------------------------------------------------ */

  SELECT
    h.held_attempt

  INTO v_held_attempt

  FROM public.quotation_email_reconciliation_holds AS h

  WHERE h.job_id = p_job_id
    AND h.resolved_at IS NULL

  FOR UPDATE OF h;

  IF NOT FOUND THEN
    RETURN 'not_held';
  END IF;

  /* ------------------------------------------------------
     5D. Verify the protected held state

     A held job should be:
       pending
       scheduled for infinity
       no active token
       no active lock
       DELIVERY_UNCERTAIN error classification

     Reject any inconsistent state instead
     of silently forcing a resolution.
     ------------------------------------------------------ */

  IF v_job.status IS DISTINCT FROM 'pending'

     OR v_job.next_attempt_at
       IS DISTINCT FROM
       'infinity'::TIMESTAMPTZ

     OR v_job.lease_token IS NOT NULL

     OR v_job.locked_until IS NOT NULL

     OR v_job.last_error_code
       IS DISTINCT FROM
       'DELIVERY_UNCERTAIN'

     OR v_job.attempts
       IS DISTINCT FROM v_held_attempt

     OR v_held_attempt NOT BETWEEN 1 AND 20
  THEN

    RAISE EXCEPTION
      'Reconciliation job state is inconsistent.'
      USING ERRCODE = '55000';

  END IF;

  /* ------------------------------------------------------
     5E. Prevent retry after attempt 20

     File 40 does not claim jobs once attempts
     reach 20. Do not create an apparently
     authorized retry that cannot run.
     ------------------------------------------------------ */

  IF p_resolution = 'retry_authorized'
     AND v_job.attempts >= 20
  THEN

    RAISE EXCEPTION
      'Attempt limit exhausted; retry not permitted.'
      USING ERRCODE = '55000';

  END IF;

  /* ------------------------------------------------------
     5F. Calculate the retry date

     Use the same exponential backoff as File 41.

     A retry is scheduled after the administrator
     has confirmed the previous send was not
     accepted.

     No attempt counter is reset.
     ------------------------------------------------------ */

  v_now := pg_catalog.clock_timestamp();

  v_next_attempt :=
    'infinity'::TIMESTAMPTZ;

  IF p_resolution = 'retry_authorized' THEN

    
    v_delay_seconds :=
      LEAST(
        3600,
        (
          60 * pg_catalog.power(
            2::numeric,
            LEAST(
              v_job.attempts - 1,
              6
            )
          )
        )::INTEGER
      );

    v_next_attempt :=
      v_now
      + pg_catalog.make_interval(
          secs => v_delay_seconds
        );

  END IF;

  /* ------------------------------------------------------
     5G. Resolve the hold FIRST

     This is necessary because the existing
     File 52 outbox guard trigger rejects
     modifications while the hold is unresolved.

     Both updates are still in ONE transaction.
     If the outbox update fails, the hold update
     rolls back too.
     ------------------------------------------------------ */

  UPDATE
    public.quotation_email_reconciliation_holds

  SET
    resolved_at = v_now,

    resolution = p_resolution,

    resolution_evidence_reference =
      p_evidence_reference,

    resolved_by =
      SESSION_USER::TEXT,

    resolution_provider_message_id =
      p_provider_message_id

  WHERE job_id = p_job_id
    AND held_attempt = v_held_attempt
    AND resolved_at IS NULL;

  GET DIAGNOSTICS
    v_updated = ROW_COUNT;

  IF v_updated <> 1 THEN
    RAISE EXCEPTION
      'Reconciliation hold changed during resolution.'
      USING ERRCODE = '55000';
  END IF;

  /* ------------------------------------------------------
     5H. Apply the corresponding outbox decision

     Accepted:
       sent

     Authorized retry:
       pending, with a due date

     Closed:
       failed

     No email is sent by this operation.
     ------------------------------------------------------ */

  UPDATE public.quotation_email_outbox AS o

  SET
    status =
      CASE
        WHEN p_resolution = 'provider_accepted'
          THEN 'sent'

        WHEN p_resolution = 'retry_authorized'
          THEN 'pending'

        ELSE 'failed'
      END,

    next_attempt_at = v_next_attempt,

    locked_until = NULL,
    lease_token = NULL,

    sent_at =
      CASE
        WHEN p_resolution = 'provider_accepted'
          THEN v_now
        ELSE NULL
      END,

    provider_message_id =
      CASE
        WHEN p_resolution = 'provider_accepted'
          THEN p_provider_message_id
        ELSE NULL
      END,

    last_error_code =
      CASE
        WHEN p_resolution = 'provider_accepted'
          THEN NULL

        WHEN p_resolution = 'retry_authorized'
          THEN 'RECONCILED_NOT_ACCEPTED'

        ELSE 'RECONCILIATION_CLOSED'
      END,

    updated_at = v_now

  WHERE o.id = p_job_id
    AND o.status = 'pending'
    AND o.next_attempt_at =
      'infinity'::TIMESTAMPTZ
    AND o.lease_token IS NULL
    AND o.locked_until IS NULL;

  GET DIAGNOSTICS
    v_updated = ROW_COUNT;

  IF v_updated <> 1 THEN
    RAISE EXCEPTION
      'Reconciliation outbox transition failed.'
      USING ERRCODE = '55000';
  END IF;

  RETURN p_resolution;

END;
$function$;

/* ========================================================
   6. TRUSTED ADMINISTRATOR OWNERSHIP
   ======================================================== */

ALTER FUNCTION
  public.resolve_quotation_email_reconciliation(
    BIGINT, TEXT, TEXT, TEXT
  )
OWNER TO postgres;

/* ========================================================
   7. ADMINISTRATOR-ONLY EXECUTION

   PostgreSQL functions normally grant
   EXECUTE to PUBLIC at creation.

   Remove that permission immediately.

   Only trusted PostgreSQL administrators
   should resolve held notifications.
   ======================================================== */

REVOKE ALL ON FUNCTION
  public.resolve_quotation_email_reconciliation(
    BIGINT, TEXT, TEXT, TEXT
  )
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.resolve_quotation_email_reconciliation(
    BIGINT, TEXT, TEXT, TEXT
  )
FROM bark_web_dev;

REVOKE ALL ON FUNCTION
  public.resolve_quotation_email_reconciliation(
    BIGINT, TEXT, TEXT, TEXT
  )
FROM bark_email_worker;

REVOKE ALL ON FUNCTION
  public.resolve_quotation_email_reconciliation(
    BIGINT, TEXT, TEXT, TEXT
  )
FROM bark_email_worker_service;

/* ========================================================
   8. REASSERT TABLE RESTRICTIONS

   The worker may create holds through File 52.
   It may not change the reconciliation history
   or resolve its own holds.
   ======================================================== */

REVOKE ALL ON TABLE
  public.quotation_email_reconciliation_holds
FROM PUBLIC;

REVOKE ALL ON TABLE
  public.quotation_email_reconciliation_holds
FROM bark_web_dev;

REVOKE ALL ON TABLE
  public.quotation_email_reconciliation_holds
FROM bark_email_worker;

REVOKE ALL ON TABLE
  public.quotation_email_reconciliation_holds
FROM bark_email_worker_service;

/* ========================================================
   9. DOCUMENTATION
   ======================================================== */

COMMENT ON FUNCTION
  public.resolve_quotation_email_reconciliation(
    BIGINT, TEXT, TEXT, TEXT
  )
IS
  'Administrator-only resolution of one unresolved '
  'email delivery hold. Requires documented evidence. '
  'Supports confirmed provider acceptance, authorized '
  'retry and terminal closure. Preserves audit history. '
  'Never sends email.';

COMMENT ON TABLE
  public.quotation_email_reconciliation_holds
IS
  'Persistent audit history of uncertain email '
  'delivery episodes. A job may have multiple '
  'episodes across different claim attempts, but '
  'only one episode may remain unresolved.';

/* ========================================================
   10. COMMIT MIGRATION
   ======================================================== */

COMMIT;
