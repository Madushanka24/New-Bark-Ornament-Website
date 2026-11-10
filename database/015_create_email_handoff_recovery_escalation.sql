
/*
===========================================================
BARK ORNAMENT (PVT) LTD

FILE 61 - ADMINISTRATOR HANDOFF RECOVERY ESCALATION

File:
database/015_create_email_handoff_recovery_escalation.sql

DEPENDENCIES
------------
File 52 - Reconciliation hold
File 53 - Administrator reconciliation resolution
File 54 - Provider handoff barrier
File 60 - Administrator recovery inspection

PURPOSE
-------
1. Escalate aged processing handoffs safely.
2. Require the expected job attempt.
3. Require an investigation evidence reference.
4. Use the existing protected hold function.
5. Preserve a separate administrative audit trail.
6. Prevent duplicate escalation actions.
7. Restrict execution to trusted administrators.
8. Expose no worker lease token to the caller.

DOES NOT
--------
- Send an email
- Check a provider
- Mark an email sent
- Mark an email failed
- Authorize retry
- Start an email worker
- Enable quotation submissions

EXECUTE ONCE:
Local bark_ornament, as postgres.
===========================================================
*/

BEGIN;

/* =======================================================
   1. DATABASE AND DEPENDENCY PREFLIGHT
   ======================================================= */

DO $preflight$
BEGIN

  IF current_database() <> 'bark_ornament'
     OR current_user <> 'postgres'
  THEN
    RAISE EXCEPTION
      'File 61 requires postgres in bark_ornament.';
  END IF;

  IF inet_server_addr() IS NOT NULL
     AND inet_server_addr() NOT IN (
       '127.0.0.1'::INET,
       '::1'::INET
     )
  THEN
    RAISE EXCEPTION
      'File 61 requires local PostgreSQL.';
  END IF;

  IF to_regclass(
    'public.quotation_email_outbox'
  ) IS NULL
  OR to_regclass(
    'public.quotation_email_reconciliation_holds'
  ) IS NULL
  OR to_regclass(
    'public.quotation_email_provider_handoffs'
  ) IS NULL
  OR to_regprocedure(
    'public.hold_quotation_email_for_reconciliation(bigint,uuid,text)'
  ) IS NULL
  OR to_regprocedure(
    'public.resolve_quotation_email_reconciliation(bigint,text,text,text)'
  ) IS NULL
  OR to_regprocedure(
    'public.inspect_quotation_email_handoff_recovery(integer,integer)'
  ) IS NULL
  THEN
    RAISE EXCEPTION
      'Earlier email safety migrations are missing.';
  END IF;

END;
$preflight$;

/* =======================================================
   2. ADMINISTRATOR ESCALATION AUDIT TABLE

   One record per job attempt escalated through
   the administrator-only function.

   Foreign keys require:
   - Existing provider handoff
   - Existing reconciliation hold

   Both foreign keys are RESTRICT to protect
   historical audit relationships.

   No customer details or tokens are stored.
   ======================================================= */

CREATE TABLE
  public.quotation_email_handoff_escalations (

    job_id BIGINT NOT NULL,

    attempt_number INTEGER NOT NULL
      CHECK (
        attempt_number BETWEEN 1 AND 20
      ),

    evidence_reference TEXT NOT NULL
      CHECK (
        pg_catalog.length(
          evidence_reference
        ) BETWEEN 8 AND 160
        AND evidence_reference ~
          '^[A-Z0-9][A-Z0-9._:/+-]*$'
      ),

    escalation_reason TEXT NOT NULL
      DEFAULT 'UNKNOWN_PROVIDER_ACCEPTANCE'
      CHECK (
        escalation_reason =
          'UNKNOWN_PROVIDER_ACCEPTANCE'
      ),

    escalated_by TEXT NOT NULL
      CHECK (
        pg_catalog.length(
          escalated_by
        ) BETWEEN 1 AND 128
      ),

    escalated_at TIMESTAMPTZ NOT NULL
      DEFAULT pg_catalog.clock_timestamp(),

    CONSTRAINT
      quotation_email_handoff_escalations_pkey
    PRIMARY KEY (
      job_id,
      attempt_number
    ),

    CONSTRAINT
      fk_email_escalation_handoff
    FOREIGN KEY (
      job_id,
      attempt_number
    )
    REFERENCES
      public.quotation_email_provider_handoffs (
        job_id,
        attempt_number
      )
    ON DELETE RESTRICT,

    CONSTRAINT
      fk_email_escalation_hold
    FOREIGN KEY (
      job_id,
      attempt_number
    )
    REFERENCES
      public.quotation_email_reconciliation_holds (
        job_id,
        held_attempt
      )
    ON DELETE RESTRICT
  );

ALTER TABLE
  public.quotation_email_handoff_escalations
OWNER TO postgres;

/* =======================================================
   3. TABLE PRIVILEGES

   The website and email worker must never
   read, insert, edit or delete escalation
   audit entries directly.
   ======================================================= */

REVOKE ALL ON TABLE
  public.quotation_email_handoff_escalations
FROM PUBLIC;

REVOKE ALL ON TABLE
  public.quotation_email_handoff_escalations
FROM bark_web_dev;

REVOKE ALL ON TABLE
  public.quotation_email_handoff_escalations
FROM bark_email_worker;

REVOKE ALL ON TABLE
  public.quotation_email_handoff_escalations
FROM bark_email_worker_service;

/* =======================================================
   4. ADMINISTRATOR ESCALATION FUNCTION

   Signature:
     p_job_id BIGINT
     p_expected_attempt INTEGER
     p_evidence_reference TEXT
     p_min_age_minutes INTEGER DEFAULT 30

   Returns:
     escalated
     already_held
     too_recent
     not_eligible

   Maximum minimum-age threshold:
     10080 minutes / 7 days

   Hard minimum:
     10 minutes

   An administrator cannot bypass the
   10-minute minimum through this function.

   IMPORTANT:
   - Locks the outbox row first.
   - Matches the exact handoff attempt.
   - Verifies the handoff's lease token
     internally, without returning it.
   - Invokes File 52's protected hold function.
   - Inserts an escalation audit record.
   - Both operations are atomic.
   ======================================================= */

CREATE FUNCTION
  public.escalate_quotation_email_handoff_for_reconciliation(
    p_job_id BIGINT,
    p_expected_attempt INTEGER,
    p_evidence_reference TEXT,
    p_min_age_minutes INTEGER DEFAULT 30
  )
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$

DECLARE
  v_job RECORD;

  v_handoff RECORD;

  v_has_unresolved_hold BOOLEAN;

  v_hold_result TEXT;

  v_now TIMESTAMPTZ;

BEGIN

  /* -----------------------------------------------------
     4A. Validate inputs before reading job data.
     ----------------------------------------------------- */

  IF p_job_id IS NULL
     OR p_job_id < 1
  THEN
    RAISE EXCEPTION
      'Valid escalation job ID required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_expected_attempt IS NULL
     OR p_expected_attempt NOT BETWEEN 1 AND 20
  THEN
    RAISE EXCEPTION
      'Valid escalation attempt required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_evidence_reference IS NULL
     OR pg_catalog.length(
       p_evidence_reference
     ) NOT BETWEEN 8 AND 160
     OR p_evidence_reference !~
       '^[A-Z0-9][A-Z0-9._:/+-]*$'
  THEN
    RAISE EXCEPTION
      'Invalid escalation evidence reference.'
      USING ERRCODE = '22023';
  END IF;

  IF p_min_age_minutes IS NULL
     OR p_min_age_minutes NOT BETWEEN 10 AND 10080
  THEN
    RAISE EXCEPTION
      'Minimum escalation age must be '
      'between 10 and 10080 minutes.'
      USING ERRCODE = '22023';
  END IF;

  /* -----------------------------------------------------
     4B. Lock the exact outbox row.

     File 52 also locks the outbox first.
     This preserves a consistent lock order.
     ----------------------------------------------------- */

  SELECT
    o.id,
    o.attempts,
    o.status,
    o.locked_until,
    o.next_attempt_at,
    o.lease_token,
    o.sent_at,
    o.provider_message_id

  INTO v_job

  FROM public.quotation_email_outbox AS o

  WHERE o.id = p_job_id

  FOR UPDATE OF o;

  IF NOT FOUND THEN
    RETURN 'not_eligible';
  END IF;

  IF v_job.attempts IS DISTINCT FROM
    p_expected_attempt
  THEN
    RETURN 'not_eligible';
  END IF;

  /* -----------------------------------------------------
     4C. Require a genuine handoff for this attempt.

     The handoff row supplies the historical
     lease token internally.

     No lease token is returned to the caller.
     ----------------------------------------------------- */

  SELECT
    h.lease_token,
    h.handoff_at

  INTO v_handoff

  FROM public.quotation_email_provider_handoffs AS h

  WHERE h.job_id = p_job_id
    AND h.attempt_number = p_expected_attempt;

  IF NOT FOUND THEN
    RETURN 'not_eligible';
  END IF;

  /* -----------------------------------------------------
     4D. Check for an existing unresolved hold.

     A matching protected hold means no second
     escalation is necessary.

     No new evidence or audit entry is written.
     ----------------------------------------------------- */

  SELECT EXISTS (
    SELECT 1
    FROM public.quotation_email_reconciliation_holds AS rh
    WHERE rh.job_id = p_job_id
      AND rh.held_attempt = p_expected_attempt
      AND rh.resolved_at IS NULL
  )
  INTO v_has_unresolved_hold;

  IF v_has_unresolved_hold THEN

    IF v_job.status = 'pending'
       AND v_job.next_attempt_at =
         'infinity'::TIMESTAMPTZ
       AND v_job.lease_token IS NULL
       AND v_job.locked_until IS NULL
    THEN
      RETURN 'already_held';
    END IF;

    RETURN 'not_eligible';

  END IF;

  /* -----------------------------------------------------
     4E. Reject all ineligible processing states.

     In particular:
     - No handoff: rejected earlier.
     - Completed job: rejected.
     - Ordinary finite lease: rejected.
     - Wrong/superseded token: rejected.
     - Corrupt processing state: rejected.
     ----------------------------------------------------- */

  IF v_job.status IS DISTINCT FROM 'processing'

     OR v_job.locked_until IS DISTINCT FROM
       'infinity'::TIMESTAMPTZ

     OR v_job.lease_token IS NULL

     OR v_job.lease_token IS DISTINCT FROM
       v_handoff.lease_token

     OR v_job.sent_at IS NOT NULL

     OR v_job.provider_message_id IS NOT NULL

  THEN
    RETURN 'not_eligible';
  END IF;

  /*
   * A historical resolved hold for this
   * same attempt is not a new escalation.
   */

  IF EXISTS (
    SELECT 1
    FROM public.quotation_email_reconciliation_holds
    WHERE job_id = p_job_id
      AND held_attempt = p_expected_attempt
  )
  THEN
    RETURN 'not_eligible';
  END IF;

  /* -----------------------------------------------------
     4F. Enforce minimum handoff age.

     An old attempt is eligible only when
     its provider handoff has existed for
     at least p_min_age_minutes.

     Age alone does NOT prove a crash.
     ----------------------------------------------------- */

  v_now := pg_catalog.clock_timestamp();

  IF v_handoff.handoff_at >
    (
      v_now -
      pg_catalog.make_interval(
        mins => p_min_age_minutes
      )
    )
  THEN
    RETURN 'too_recent';
  END IF;

  /* -----------------------------------------------------
     4G. Use the existing secure hold function.

     It independently verifies:
     - Matching current lease token
     - Processing status
     - Unexpired lease
     - Valid quotation
     - Existing unresolved hold exclusion

     The File 54 handoff guard permits
     transition to reconciliation hold.

     No provider is contacted.
     ----------------------------------------------------- */

  v_hold_result :=
    public.hold_quotation_email_for_reconciliation(
      p_job_id,
      v_job.lease_token,
      'UNKNOWN_PROVIDER_ACCEPTANCE'
    );

  IF v_hold_result = 'stale_lease' THEN
    RETURN 'not_eligible';
  END IF;

  IF v_hold_result IS DISTINCT FROM 'held' THEN

    RAISE EXCEPTION
      'Escalation hold transition was not confirmed.'
      USING ERRCODE = '55000';

  END IF;

  /* -----------------------------------------------------
     4H. Persist administrator evidence.

     This INSERT requires the hold to exist
     because of the composite foreign key.

     If the audit INSERT fails, PostgreSQL
     rolls back the preceding hold transition.
     ----------------------------------------------------- */

  INSERT INTO
    public.quotation_email_handoff_escalations (
      job_id,
      attempt_number,
      evidence_reference,
      escalation_reason,
      escalated_by,
      escalated_at
    )
  VALUES (
    p_job_id,
    p_expected_attempt,
    p_evidence_reference,
    'UNKNOWN_PROVIDER_ACCEPTANCE',
    SESSION_USER::TEXT,
    pg_catalog.clock_timestamp()
  );

  RETURN 'escalated';

END;
$function$;

/* =======================================================
   5. TRUSTED FUNCTION OWNERSHIP
   ======================================================= */

ALTER FUNCTION
  public.escalate_quotation_email_handoff_for_reconciliation(
    BIGINT,
    INTEGER,
    TEXT,
    INTEGER
  )
OWNER TO postgres;

/* =======================================================
   6. ADMINISTRATOR-ONLY EXECUTION

   Remove PostgreSQL's default PUBLIC EXECUTE.

   The existing worker can still call its
   own File 52 hold function with a valid
   lease, but it cannot invoke this
   administrator escalation function.
   ======================================================= */

REVOKE ALL ON FUNCTION
  public.escalate_quotation_email_handoff_for_reconciliation(
    BIGINT,
    INTEGER,
    TEXT,
    INTEGER
  )
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.escalate_quotation_email_handoff_for_reconciliation(
    BIGINT,
    INTEGER,
    TEXT,
    INTEGER
  )
FROM bark_web_dev;

REVOKE ALL ON FUNCTION
  public.escalate_quotation_email_handoff_for_reconciliation(
    BIGINT,
    INTEGER,
    TEXT,
    INTEGER
  )
FROM bark_email_worker;

REVOKE ALL ON FUNCTION
  public.escalate_quotation_email_handoff_for_reconciliation(
    BIGINT,
    INTEGER,
    TEXT,
    INTEGER
  )
FROM bark_email_worker_service;

/* =======================================================
   7. DOCUMENTATION
   ======================================================= */

COMMENT ON TABLE
  public.quotation_email_handoff_escalations
IS
  'Administrator-only evidence audit of provider '
  'handoff attempts escalated into reconciliation. '
  'No customer content, provider responses or '
  'worker lease tokens are stored.';

COMMENT ON FUNCTION
  public.escalate_quotation_email_handoff_for_reconciliation(
    BIGINT,
    INTEGER,
    TEXT,
    INTEGER
  )
IS
  'Administrator-only escalation of an aged, '
  'unresolved provider handoff into the existing '
  'reconciliation hold mechanism. Requires job, '
  'expected attempt, evidence reference and '
  'minimum age. Does not send email, mark sent '
  'or authorize retry.';

/* =======================================================
   8. COMPLETE FILE 61
   ======================================================= */

COMMIT;
