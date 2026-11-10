
/*
==========================================================
BARK ORNAMENT (PVT) LTD

FILE 54 - DURABLE PROVIDER HANDOFF BARRIER

File:
database/013_create_email_provider_handoff.sql

PURPOSE
-------
1. Record a durable pre-provider submission handoff.
2. Prevent automatic claim recovery after handoff.
3. Prevent ordinary retry/failure after handoff.
4. Preserve handoff history by attempt.
5. Allow confirmed acceptance via File 41.
6. Allow reconciliation via Files 52 and 53.
7. Deny direct worker/website table access.

NO EMAIL IS SENT BY THIS MIGRATION.

Apply once as postgres to local bark_ornament.
==========================================================
*/

BEGIN;

/* ======================================================
   1. CHECK DATABASE AND DEPENDENCIES
   ====================================================== */

DO $preflight$
BEGIN

  IF current_database() <> 'bark_ornament'
     OR current_user <> 'postgres'
  THEN
    RAISE EXCEPTION
      'File 54 must run as postgres '
      'in local bark_ornament.';
  END IF;

  IF to_regclass(
    'public.quotation_email_outbox'
  ) IS NULL
  OR to_regclass(
    'public.quotation_email_reconciliation_holds'
  ) IS NULL
  OR to_regprocedure(
    'public.hold_quotation_email_for_reconciliation(bigint,uuid,text)'
  ) IS NULL
  OR to_regprocedure(
    'public.resolve_quotation_email_reconciliation(bigint,text,text,text)'
  ) IS NULL
  THEN
    RAISE EXCEPTION
      'Files 52 and 53 must be installed first.';
  END IF;

  IF inet_server_addr() IS NOT NULL
     AND inet_server_addr() NOT IN (
       '127.0.0.1'::INET,
       '::1'::INET
     )
  THEN
    RAISE EXCEPTION
      'File 54 is restricted to local PostgreSQL.';
  END IF;

END;
$preflight$;

/* ======================================================
   2. CREATE HANDOFF HISTORY TABLE

   A record means:
     This claim attempt passed the durable
     handoff barrier.

   It does NOT prove a provider received,
   accepted or delivered an email.

   One record is permitted per job attempt.
   ====================================================== */

CREATE TABLE
  public.quotation_email_provider_handoffs (

    job_id BIGINT NOT NULL

      REFERENCES
        public.quotation_email_outbox(id)
      ON DELETE RESTRICT,

    attempt_number INTEGER NOT NULL

      CHECK (
        attempt_number BETWEEN 1 AND 20
      ),

    lease_token UUID NOT NULL,

    handoff_at TIMESTAMPTZ NOT NULL

      DEFAULT pg_catalog.clock_timestamp(),

    CONSTRAINT
      quotation_email_provider_handoffs_pkey

    PRIMARY KEY (
      job_id,
      attempt_number
    )
  );

/*
 * Historical handoff records must not
 * be directly manipulated by the website
 * or the worker.
 */

ALTER TABLE
  public.quotation_email_provider_handoffs
OWNER TO postgres;

REVOKE ALL ON TABLE
  public.quotation_email_provider_handoffs
FROM PUBLIC;

REVOKE ALL ON TABLE
  public.quotation_email_provider_handoffs
FROM bark_web_dev;

REVOKE ALL ON TABLE
  public.quotation_email_provider_handoffs
FROM bark_email_worker;

REVOKE ALL ON TABLE
  public.quotation_email_provider_handoffs
FROM bark_email_worker_service;

/* ======================================================
   3. OUTBOX HANDOFF GUARD

   A job already handed off must not have
   its protected processing state changed
   into an ordinary retry.

   Allowed transitions:

   A. processing -> sent
      Confirmed provider acceptance via
      File 41's completion function.

   B. processing -> pending / infinity
      Uncertain delivery hold via File 52.

   Everything else is rejected.

   A second trigger from File 52 continues
   to protect unresolved reconciliation holds.
   ====================================================== */

CREATE FUNCTION
  public.guard_quotation_email_provider_handoff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_has_handoff BOOLEAN;
BEGIN

  /*
   * Only a processing job with an infinite
   * lease needs this handoff-specific guard.
   */

  IF OLD.status IS DISTINCT FROM 'processing'
     OR OLD.locked_until IS DISTINCT FROM
       'infinity'::TIMESTAMPTZ
  THEN

    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;

    RETURN NEW;

  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.quotation_email_provider_handoffs
    WHERE job_id = OLD.id
      AND attempt_number = OLD.attempts
      AND lease_token = OLD.lease_token
  )
  INTO v_has_handoff;

  IF NOT v_has_handoff THEN

    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;

    RETURN NEW;

  END IF;

  /*
   * Do not permit deletion of a handed-off
   * processing job.
   */

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'Provider handoff prevents job deletion.'
      USING ERRCODE = '55000';
  END IF;

  /*
   * Job identity and attempt number must
   * remain unchanged during resolution.
   */

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.quotation_id IS DISTINCT FROM
       OLD.quotation_id
     OR NEW.notification_type IS DISTINCT FROM
       OLD.notification_type
     OR NEW.attempts IS DISTINCT FROM
       OLD.attempts
  THEN

    RAISE EXCEPTION
      'Provider handoff identity is protected.'
      USING ERRCODE = '55000';

  END IF;

  /*
   * Confirmed provider acceptance.
   *
   * The provider message ID is required.
   * The database cannot independently verify
   * that the provider actually accepted it.
   */

  IF NEW.status = 'sent'

     AND NEW.lease_token IS NULL
     AND NEW.locked_until IS NULL

     AND NEW.sent_at IS NOT NULL

     AND NEW.provider_message_id IS NOT NULL

     AND pg_catalog.length(
       NEW.provider_message_id
     ) BETWEEN 1 AND 255

     AND NEW.provider_message_id ~
       '^[A-Za-z0-9][A-Za-z0-9._:/+@-]*$'

  THEN
    RETURN NEW;
  END IF;

  /*
   * Uncertain-delivery reconciliation hold.
   *
   * This transition must be followed by
   * insertion of an unresolved hold record
   * in the same transaction, as implemented
   * by File 53's hold function.
   */

  IF NEW.status = 'pending'

     AND NEW.next_attempt_at =
       'infinity'::TIMESTAMPTZ

     AND NEW.lease_token IS NULL
     AND NEW.locked_until IS NULL

     AND NEW.last_error_code =
       'DELIVERY_UNCERTAIN'

     AND NEW.provider_message_id IS NULL
     AND NEW.sent_at IS NULL

  THEN
    RETURN NEW;
  END IF;

  /*
   * Ordinary retries, direct failures,
   * lease replacement and rescheduling
   * are not allowed after handoff.
   */

  RAISE EXCEPTION
    'Provider handoff requires confirmed '
    'acceptance or reconciliation hold.'
    USING ERRCODE = '55000';

END;
$function$;

ALTER FUNCTION
  public.guard_quotation_email_provider_handoff()
OWNER TO postgres;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_provider_handoff()
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_provider_handoff()
FROM bark_web_dev;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_provider_handoff()
FROM bark_email_worker;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_provider_handoff()
FROM bark_email_worker_service;

/* ======================================================
   4. INSTALL PROTECTIVE TRIGGER
   ====================================================== */

CREATE TRIGGER
  trg_guard_quotation_email_provider_handoff

BEFORE UPDATE OR DELETE
ON public.quotation_email_outbox

FOR EACH ROW

EXECUTE FUNCTION
  public.guard_quotation_email_provider_handoff();

/* ======================================================
   5. RESTRICTED PRE-SEND HANDOFF FUNCTION

   Input:
     p_job_id
     p_lease_token

   Returns:
     handoff_started
     already_handed_off
     stale_lease

   CRITICAL INTEGRATION RULE:

   The future worker must complete this
   database operation and COMMIT it before
   any external provider call.

   Only "handoff_started" is a first-time
   handoff. "already_handed_off" must never
   authorize another send.
   ====================================================== */

CREATE FUNCTION
  public.begin_quotation_email_provider_handoff(
    p_job_id BIGINT,
    p_lease_token UUID
  )
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_attempts INTEGER;
  v_locked_until TIMESTAMPTZ;

  v_existing_token UUID;
  v_updated INTEGER;

BEGIN

  /* ----------------------------------------------------
     Validate supplied lease identity.
     ---------------------------------------------------- */

  IF p_job_id IS NULL
     OR p_job_id < 1
     OR p_lease_token IS NULL
  THEN

    RAISE EXCEPTION
      'Valid job ID and lease token required.'
      USING ERRCODE = '22023';

  END IF;

  /* ----------------------------------------------------
     Lock the exact active job.

     Use the same commercial quotation checks
     as the existing worker hold function.

     Reserved synthetic products are excluded.
     ---------------------------------------------------- */

  SELECT
    o.attempts,
    o.locked_until

  INTO
    v_attempts,
    v_locked_until

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

    AND EXISTS (
      SELECT 1
      FROM public.quotation_items AS i
      WHERE i.quotation_id = o.quotation_id
    )

    AND NOT EXISTS (
      SELECT 1
      FROM public.quotation_items AS i

      WHERE i.quotation_id = o.quotation_id

        AND (
          pg_catalog.lower(
            i.product_id::TEXT
          ) IN (
            '__test_only_quotation_product__',
            '__test-only-quotation-product__'
          )

          OR pg_catalog.lower(
            i.product_slug
          ) IN (
            '__test_only_quotation_product__',
            '__test-only-quotation-product__'
          )
        )
    )

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

  /* ----------------------------------------------------
     If this attempt was already handed off,
     do not authorize another provider call.
     ---------------------------------------------------- */

  SELECT h.lease_token
  INTO v_existing_token

  FROM public.quotation_email_provider_handoffs AS h

  WHERE h.job_id = p_job_id
    AND h.attempt_number = v_attempts;

  IF FOUND THEN

    IF v_existing_token = p_lease_token
       AND v_locked_until =
         'infinity'::TIMESTAMPTZ
    THEN
      RETURN 'already_handed_off';
    END IF;

    RAISE EXCEPTION
      'Provider handoff history is inconsistent.'
      USING ERRCODE = '55000';

  END IF;

  /*
   * An infinite lease without a matching
   * handoff record is not a normal new
   * handoff. Treat as inconsistent state.
   */

  IF v_locked_until =
    'infinity'::TIMESTAMPTZ
  THEN

    RAISE EXCEPTION
      'Infinite lease lacks provider handoff.'
      USING ERRCODE = '55000';

  END IF;

  /* ----------------------------------------------------
     Extend the current lease indefinitely.

     Existing File 40 claim logic only
     reclaims processing jobs whose
     locked_until has expired.

     PostgreSQL infinity never expires.
     ---------------------------------------------------- */

  UPDATE public.quotation_email_outbox

  SET
    locked_until =
      'infinity'::TIMESTAMPTZ,

    updated_at =
      pg_catalog.clock_timestamp()

  WHERE id = p_job_id
    AND status = 'processing'
    AND lease_token = p_lease_token
    AND locked_until >
      pg_catalog.clock_timestamp()
    AND locked_until <>
      'infinity'::TIMESTAMPTZ;

  GET DIAGNOSTICS
    v_updated = ROW_COUNT;

  IF v_updated <> 1 THEN

    RAISE EXCEPTION
      'Provider handoff lease transition failed.'
      USING ERRCODE = '55000';

  END IF;

  /* ----------------------------------------------------
     Write a durable handoff record.

     The outbox update and handoff INSERT
     are in the same PostgreSQL transaction.

     This function never calls a provider.
     ---------------------------------------------------- */

  INSERT INTO
    public.quotation_email_provider_handoffs (
      job_id,
      attempt_number,
      lease_token
    )
  VALUES (
    p_job_id,
    v_attempts,
    p_lease_token
  );

  RETURN 'handoff_started';

END;
$function$;

/* ======================================================
   6. TRUSTED OWNER AND RESTRICTED EXECUTION
   ====================================================== */

ALTER FUNCTION
  public.begin_quotation_email_provider_handoff(
    BIGINT, UUID
  )
OWNER TO postgres;

REVOKE ALL ON FUNCTION
  public.begin_quotation_email_provider_handoff(
    BIGINT, UUID
  )
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.begin_quotation_email_provider_handoff(
    BIGINT, UUID
  )
FROM bark_web_dev;

REVOKE ALL ON FUNCTION
  public.begin_quotation_email_provider_handoff(
    BIGINT, UUID
  )
FROM bark_email_worker_service;

/*
 * File 44 established a service login that
 * inherits bark_email_worker privileges.
 *
 * Only that permission role receives
 * EXECUTE for the handoff operation.
 */

GRANT EXECUTE ON FUNCTION
  public.begin_quotation_email_provider_handoff(
    BIGINT, UUID
  )
TO bark_email_worker;

/* ======================================================
   7. DOCUMENTATION
   ====================================================== */

COMMENT ON TABLE
  public.quotation_email_provider_handoffs
IS
  'Durable per-attempt provider handoff audit. '
  'A record proves the worker entered the '
  'pre-send barrier, not that an email was sent. '
  'Handoff records remain for reconciliation.';

COMMENT ON FUNCTION
  public.begin_quotation_email_provider_handoff(
    BIGINT, UUID
  )
IS
  'Under a valid worker lease, atomically '
  'records a first-time pre-provider handoff '
  'and sets locked_until to infinity. '
  'Repeated calls return already_handed_off. '
  'Never sends email.';

COMMENT ON FUNCTION
  public.guard_quotation_email_provider_handoff()
IS
  'Prevents automatic retry, ordinary failure, '
  'rescheduling and deletion of processing '
  'email jobs after a durable provider handoff. '
  'Permits confirmed completion or transition '
  'to reconciliation hold.';

/* ======================================================
   8. COMMIT FILE 54 MIGRATION
   ====================================================== */

COMMIT;
