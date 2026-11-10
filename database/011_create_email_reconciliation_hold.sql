
/*
============================================================
BARK ORNAMENT (PVT) LTD

FILE 52 - EMAIL UNCERTAIN-DELIVERY HOLD

File:
database/011_create_email_reconciliation_hold.sql

DEPENDENCIES
------------
005 - Email outbox
006 - Secure enqueue
007 - Worker claim
008 - Worker completion and failure
009 - Lease-authorized data retrieval
010 - Dedicated worker login

PURPOSE
-------
1. Record unresolved email delivery uncertainty.
2. Securely hold jobs under valid worker leases.
3. Prevent held jobs from being reclaimed.
4. Prevent ordinary updates/deletes of held jobs.
5. Preserve reconciliation records for later review.

DOES NOT
--------
- Send email
- Connect an email provider
- Enable quotation submissions
- Start a worker
- Automatically resolve uncertain outcomes
- Change existing claim/completion functions

Run ONCE as postgres against local bark_ornament.
============================================================
*/

BEGIN;

/* ========================================================
   1. RECONCILIATION HOLD TABLE

   One record per outbox job.

   An unresolved hold has:
     resolved_at IS NULL
     resolution IS NULL

   Future approved reconciliation logic may
   record a resolution without deleting
   the history row.
   ======================================================== */

CREATE TABLE public.quotation_email_reconciliation_holds (
  job_id BIGINT PRIMARY KEY
    REFERENCES public.quotation_email_outbox(id)
    ON DELETE RESTRICT,

  reason_code TEXT NOT NULL
    CHECK (
      reason_code IN (
        'PROVIDER_TIMEOUT_AFTER_SUBMIT',
        'CONNECTION_LOST_AFTER_SUBMIT',
        'UNKNOWN_PROVIDER_ACCEPTANCE'
      )
    ),

  held_attempt INTEGER NOT NULL
    CHECK (
      held_attempt BETWEEN 1 AND 20
    ),

  held_at TIMESTAMPTZ NOT NULL
    DEFAULT pg_catalog.clock_timestamp(),

  resolved_at TIMESTAMPTZ,

  resolution TEXT
    CHECK (
      resolution IS NULL
      OR resolution IN (
        'provider_accepted',
        'retry_authorized',
        'closed_without_send'
      )
    ),

  CONSTRAINT chk_email_hold_resolution_pair
    CHECK (
      (
        resolved_at IS NULL
        AND resolution IS NULL
      )
      OR
      (
        resolved_at IS NOT NULL
        AND resolution IS NOT NULL
      )
    )
);

/* Keep the reconciliation table under
   trusted administrative ownership. */

ALTER TABLE
  public.quotation_email_reconciliation_holds
OWNER TO postgres;

/* ========================================================
   2. RESTRICT DIRECT HOLD-TABLE ACCESS

   The worker must use a controlled function.

   Neither the website nor the worker gets
   unrestricted SELECT, INSERT, UPDATE or DELETE.
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
   3. PROTECT HELD OUTBOX ROWS

   A held job must not be:
   - Rescheduled
   - Reclaimed through an accidental update
   - Marked sent
   - Marked failed
   - Deleted

   The guard checks only UNRESOLVED holds.

   A separate administrative reconciliation
   procedure will be developed later.
   ======================================================== */

CREATE OR REPLACE FUNCTION
  public.guard_quotation_email_reconciliation_hold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN

  IF EXISTS (
    SELECT 1
    FROM public.quotation_email_reconciliation_holds
    WHERE job_id = OLD.id
      AND resolved_at IS NULL
  ) THEN

    RAISE EXCEPTION
      'Email job is held for reconciliation.'
      USING ERRCODE = '55000';

  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;

END;
$function$;

ALTER FUNCTION
  public.guard_quotation_email_reconciliation_hold()
OWNER TO postgres;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_reconciliation_hold()
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_reconciliation_hold()
FROM bark_web_dev;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_reconciliation_hold()
FROM bark_email_worker;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_reconciliation_hold()
FROM bark_email_worker_service;

/* Install the trigger on outbox UPDATE/DELETE.

   This does not replace the existing
   synthetic-fixture guard trigger.
*/

CREATE TRIGGER
  trg_guard_quotation_email_reconciliation_hold
BEFORE UPDATE OR DELETE
ON public.quotation_email_outbox
FOR EACH ROW
EXECUTE FUNCTION
  public.guard_quotation_email_reconciliation_hold();

/* ========================================================
   4. RESTRICTED UNCERTAIN-DELIVERY HOLD FUNCTION

   Inputs:
     p_job_id       - Outbox job ID
     p_lease_token  - Current worker lease
     p_reason_code  - Approved uncertainty reason

   Returns:
     held         - Hold successfully recorded
     stale_lease  - Missing, invalid, expired,
                    completed or superseded lease

   The function does not reveal job content.

   IMPORTANT TRANSACTION ORDER:

   1. Lock the active outbox job.
   2. Move it to pending with infinity retry.
   3. Clear its active lease.
   4. Insert the reconciliation hold.

   The hold INSERT follows the outbox UPDATE
   so the guard trigger does not reject the
   function's own initial transition.

   All four steps occur in one transaction.
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

  /* Validate arguments without exposing data. */

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
   * Lock the exact processing job.
   *
   * The lease must still be valid.
   * A worker holding an older token cannot
   * hold a newer worker's attempt.
   *
   * The claim function's SKIP LOCKED
   * behavior protects concurrent selection.
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

    AND NOT EXISTS (
      SELECT 1
      FROM public.quotation_email_reconciliation_holds
      WHERE job_id = o.id
    )

  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RETURN 'stale_lease';
  END IF;

  /*
   * File 40 only automatically claims:
   *
   * - due pending jobs
   * - processing jobs with expired leases
   *
   * A pending job with infinity as its
   * next_attempt_at is not due.
   *
   * Clearing locked_until also excludes
   * the expired-processing branch.
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
      'Active lease changed during reconciliation hold.'
      USING ERRCODE = '55000';
  END IF;

  /*
   * Insert the hold AFTER the outbox update.
   *
   * Both are committed together.
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

/* ========================================================
   5. OWNER AND FUNCTION PERMISSIONS
   ======================================================== */

ALTER FUNCTION
  public.hold_quotation_email_for_reconciliation(
    BIGINT,
    UUID,
    TEXT
  )
OWNER TO postgres;

REVOKE ALL ON FUNCTION
  public.hold_quotation_email_for_reconciliation(
    BIGINT,
    UUID,
    TEXT
  )
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.hold_quotation_email_for_reconciliation(
    BIGINT,
    UUID,
    TEXT
  )
FROM bark_web_dev;

/* Grant to the restricted permission role.

   bark_email_worker_service inherits this role
   through the membership tested in File 44.
*/

GRANT EXECUTE ON FUNCTION
  public.hold_quotation_email_for_reconciliation(
    BIGINT,
    UUID,
    TEXT
  )
TO bark_email_worker;

/* ========================================================
   6. DOCUMENTATION
   ======================================================== */

COMMENT ON TABLE
  public.quotation_email_reconciliation_holds
IS
  'Records uncertain email-provider outcomes '
  'that require reconciliation before retry. '
  'Unresolved holds prevent ordinary outbox '
  'updates and keep next_attempt_at at infinity.';

COMMENT ON FUNCTION
  public.hold_quotation_email_for_reconciliation(
    BIGINT,
    UUID,
    TEXT
  )
IS
  'Under a matching unexpired worker lease, '
  'atomically places an email job on indefinite '
  'reconciliation hold. Returns held or stale_lease. '
  'Does not deliver email or resolve the hold.';

/* ========================================================
   7. COMPLETE MIGRATION
   ======================================================== */

COMMIT;
