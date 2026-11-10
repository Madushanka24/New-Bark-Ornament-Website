
/*
===========================================================
BARK ORNAMENT (PVT) LTD

FILE 62 - EMAIL RECOVERY CONSISTENCY AUDIT

File:
database/016_create_email_recovery_consistency_audit.sql

DEPENDENCIES
------------
File 37 - Email outbox
File 52 - Reconciliation holds
File 53 - Reconciliation resolution
File 54 - Provider handoff barrier
File 60 - Administrator recovery inspection
File 61 - Administrator recovery escalation

PURPOSE
-------
1. Audit current email recovery consistency.
2. Detect incomplete handoff protections.
3. Detect mismatched reconciliation attempts.
4. Detect inconsistent unresolved holds.
5. Detect incorrectly blocked resolved holds.
6. Detect escalation audit mismatches.
7. Detect inconsistent terminal job states.
8. Return bounded, privacy-safe findings.

SECURITY
--------
- Administrator-only function
- Read-only SQL
- SECURITY DEFINER owned by postgres
- No customer or quotation content returned
- No worker lease tokens returned
- No provider message IDs returned
- No automatic changes or resolutions
- No actual email delivery

EXECUTION
---------
Run migration once against local
bark_ornament as postgres.
===========================================================
*/

BEGIN;

/* =======================================================
   1. SAFETY AND DEPENDENCY PREFLIGHT
   ======================================================= */

DO $preflight$
BEGIN

  IF current_database() <> 'bark_ornament'
     OR current_user <> 'postgres'
  THEN
    RAISE EXCEPTION
      'File 62 requires postgres in bark_ornament.';
  END IF;

  IF inet_server_addr() IS NOT NULL
     AND inet_server_addr() NOT IN (
       '127.0.0.1'::INET,
       '::1'::INET
     )
  THEN
    RAISE EXCEPTION
      'File 62 requires a local PostgreSQL server.';
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

  OR to_regclass(
    'public.quotation_email_handoff_escalations'
  ) IS NULL

  OR to_regprocedure(
    'public.inspect_quotation_email_handoff_recovery(integer,integer)'
  ) IS NULL

  OR to_regprocedure(
    'public.escalate_quotation_email_handoff_for_reconciliation(bigint,integer,text,integer)'
  ) IS NULL

  OR to_regprocedure(
    'public.resolve_quotation_email_reconciliation(bigint,text,text,text)'
  ) IS NULL

  THEN
    RAISE EXCEPTION
      'Required email safety migrations are missing.';
  END IF;

  IF to_regprocedure(
    'public.audit_quotation_email_recovery_consistency(integer)'
  ) IS NOT NULL
  THEN
    RAISE EXCEPTION
      'File 62 audit function is already installed.';
  END IF;

END;
$preflight$;

/* =======================================================
   2. CREATE ADMINISTRATOR-ONLY CONSISTENCY AUDIT

   Parameter:
     p_limit INTEGER DEFAULT 100

   Accepted range:
     1 to 100

   Output:
     job_id
     attempt_number
     issue_code
     severity
     observed_at

   Each row describes one identified condition.

   The audit is read-only.

   The function does not correct, delete,
   escalate, retry or complete jobs.
   ======================================================= */

CREATE FUNCTION
  public.audit_quotation_email_recovery_consistency(
    p_limit INTEGER DEFAULT 100
  )

RETURNS TABLE (
  job_id BIGINT,
  attempt_number INTEGER,
  issue_code TEXT,
  severity TEXT,
  observed_at TIMESTAMPTZ
)

LANGUAGE plpgsql
STABLE
SECURITY DEFINER

SET search_path = pg_catalog

AS $function$
DECLARE
  v_now TIMESTAMPTZ;
BEGIN

  /* -----------------------------------------------------
     Validate inspection limit.
     ----------------------------------------------------- */

  IF p_limit IS NULL
     OR p_limit NOT BETWEEN 1 AND 100
  THEN
    RAISE EXCEPTION
      'Audit limit must be between 1 and 100.'
      USING ERRCODE = '22023';
  END IF;

  v_now := pg_catalog.statement_timestamp();

  /* -----------------------------------------------------
     Ten independent consistency checks.

     All data access uses qualified table names.

     Historical handoffs and resolved holds
     are not automatically considered defects.

     A finding is evidence for review,
     not proof of provider delivery behavior.
     ----------------------------------------------------- */

  RETURN QUERY

  WITH findings AS (

    /* ===================================================
       ISSUE 1

       Processing job has infinite lease but
       no handoff for its current attempt.

       This may indicate missing handoff history.
       =================================================== */

    SELECT
      o.id AS checked_job_id,
      o.attempts AS checked_attempt_number,

      'PROCESSING_INFINITE_WITHOUT_HANDOFF'
        ::TEXT AS checked_issue_code,

      'critical'::TEXT AS checked_severity

    FROM public.quotation_email_outbox AS o

    WHERE o.status = 'processing'

      AND o.locked_until =
        'infinity'::TIMESTAMPTZ

      AND NOT EXISTS (
        SELECT 1
        FROM public.quotation_email_provider_handoffs
          AS h

        WHERE h.job_id = o.id
          AND h.attempt_number = o.attempts
      )

    UNION ALL

    /* ===================================================
       ISSUE 2

       Current processing handoff is not
       protected by its recorded lease token
       and infinite lease timestamp.
       =================================================== */

    SELECT
      o.id,
      o.attempts,

      'CURRENT_HANDOFF_LEASE_MISMATCH'::TEXT,
      'critical'::TEXT

    FROM public.quotation_email_outbox AS o

    INNER JOIN
      public.quotation_email_provider_handoffs AS h

      ON h.job_id = o.id
     AND h.attempt_number = o.attempts

    WHERE o.status = 'processing'

      AND (
        o.locked_until IS DISTINCT FROM
          'infinity'::TIMESTAMPTZ

        OR o.lease_token IS DISTINCT FROM
          h.lease_token
      )

    UNION ALL

    /* ===================================================
       ISSUE 3

       Active reconciliation hold belongs to
       an attempt other than the current
       outbox attempt.

       This should not occur during normal
       claim and resolution workflows.
       =================================================== */

    SELECT
      o.id,
      rh.held_attempt,

      'UNRESOLVED_HOLD_ATTEMPT_MISMATCH'::TEXT,
      'critical'::TEXT

    FROM
      public.quotation_email_reconciliation_holds
        AS rh

    INNER JOIN public.quotation_email_outbox AS o
      ON o.id = rh.job_id

    WHERE rh.resolved_at IS NULL

      AND rh.held_attempt IS DISTINCT FROM
        o.attempts

    UNION ALL

    /* ===================================================
       ISSUE 4

       Active hold for the current attempt
       is not in the protected pending state.

       A valid unresolved hold requires:
         status = pending
         next_attempt_at = infinity
         lease_token = NULL
         locked_until = NULL
         last_error_code = DELIVERY_UNCERTAIN
       =================================================== */

    SELECT
      o.id,
      rh.held_attempt,

      'UNRESOLVED_HOLD_STATE_MISMATCH'::TEXT,
      'critical'::TEXT

    FROM
      public.quotation_email_reconciliation_holds
        AS rh

    INNER JOIN public.quotation_email_outbox AS o
      ON o.id = rh.job_id

    WHERE rh.resolved_at IS NULL

      AND rh.held_attempt = o.attempts

      AND (
        o.status IS DISTINCT FROM 'pending'

        OR o.next_attempt_at IS DISTINCT FROM
          'infinity'::TIMESTAMPTZ

        OR o.lease_token IS NOT NULL

        OR o.locked_until IS NOT NULL

        OR o.last_error_code IS DISTINCT FROM
          'DELIVERY_UNCERTAIN'
      )

    UNION ALL

    /* ===================================================
       ISSUE 5

       Pending job has an infinite retry
       timestamp but no active hold.

       This may indicate a missing hold OR
       an intentionally deferred job.

       Therefore this is a review finding,
       not an automatic corruption verdict.
       =================================================== */

    SELECT
      o.id,
      o.attempts,

      'PENDING_INFINITE_WITHOUT_HOLD'::TEXT,
      'review'::TEXT

    FROM public.quotation_email_outbox AS o

    WHERE o.status = 'pending'

      AND o.next_attempt_at =
        'infinity'::TIMESTAMPTZ

      AND NOT EXISTS (
        SELECT 1
        FROM
          public.quotation_email_reconciliation_holds
            AS rh

        WHERE rh.job_id = o.id
          AND rh.resolved_at IS NULL
      )

    UNION ALL

    /* ===================================================
       ISSUE 6

       Reconciliation was marked resolved
       for the current attempt, but the
       outbox still looks like an unresolved
       DELIVERY_UNCERTAIN hold.

       Authorized retries must be scheduled
       with finite next_attempt_at values.
       =================================================== */

    SELECT
      o.id,
      rh.held_attempt,

      'RESOLVED_HOLD_STILL_BLOCKED'::TEXT,
      'critical'::TEXT

    FROM
      public.quotation_email_reconciliation_holds
        AS rh

    INNER JOIN public.quotation_email_outbox AS o
      ON o.id = rh.job_id

    WHERE rh.resolved_at IS NOT NULL

      AND rh.held_attempt = o.attempts

      AND o.status = 'pending'

      AND o.next_attempt_at =
        'infinity'::TIMESTAMPTZ

      AND o.last_error_code =
        'DELIVERY_UNCERTAIN'

    UNION ALL

    /* ===================================================
       ISSUE 7

       Administrator escalation audit reason
       differs from its associated hold reason.

       Normal File 61 escalation records use
       UNKNOWN_PROVIDER_ACCEPTANCE.
       =================================================== */

    SELECT
      e.job_id,
      e.attempt_number,

      'ESCALATION_REASON_MISMATCH'::TEXT,
      'critical'::TEXT

    FROM public.quotation_email_handoff_escalations
      AS e

    INNER JOIN
      public.quotation_email_reconciliation_holds
        AS rh

      ON rh.job_id = e.job_id
     AND rh.held_attempt = e.attempt_number

    WHERE rh.reason_code IS DISTINCT FROM
      e.escalation_reason

    UNION ALL

    /* ===================================================
       ISSUE 8

       Administrator escalation timestamp
       predates the recorded provider handoff.

       Timestamp changes can be administrative,
       so this is a review finding.
       =================================================== */

    SELECT
      e.job_id,
      e.attempt_number,

      'ESCALATION_BEFORE_HANDOFF'::TEXT,
      'review'::TEXT

    FROM public.quotation_email_handoff_escalations
      AS e

    INNER JOIN
      public.quotation_email_provider_handoffs
        AS h

      ON h.job_id = e.job_id
     AND h.attempt_number = e.attempt_number

    WHERE e.escalated_at < h.handoff_at

    UNION ALL

    /* ===================================================
       ISSUE 9

       Terminal sent/failed job retains
       an active worker lease.
       =================================================== */

    SELECT
      o.id,
      o.attempts,

      'TERMINAL_JOB_RETAINS_LEASE'::TEXT,
      'critical'::TEXT

    FROM public.quotation_email_outbox AS o

    WHERE o.status IN ('sent', 'failed')

      AND (
        o.lease_token IS NOT NULL
        OR o.locked_until IS NOT NULL
      )

    UNION ALL

    /* ===================================================
       ISSUE 10

       Sent job lacks expected confirmation
       fields in the current outbox state.

       It does not check a real provider.
       =================================================== */

    SELECT
      o.id,
      o.attempts,

      'SENT_JOB_MISSING_CONFIRMATION'::TEXT,
      'critical'::TEXT

    FROM public.quotation_email_outbox AS o

    WHERE o.status = 'sent'

      AND (
        o.sent_at IS NULL
        OR o.provider_message_id IS NULL
      )

  )

  SELECT
    f.checked_job_id,
    f.checked_attempt_number,
    f.checked_issue_code,
    f.checked_severity,
    v_now

  FROM findings AS f

  ORDER BY
    CASE
      WHEN f.checked_severity = 'critical'
        THEN 0
      ELSE 1
    END,

    f.checked_job_id ASC,
    f.checked_issue_code ASC

  LIMIT p_limit;

END;
$function$;

/* =======================================================
   3. TRUSTED FUNCTION OWNERSHIP
   ======================================================= */

ALTER FUNCTION
  public.audit_quotation_email_recovery_consistency(
    INTEGER
  )
OWNER TO postgres;

/* =======================================================
   4. RESTRICT EXECUTION

   PostgreSQL functions can have PUBLIC
   execution permission when first created.

   Remove it explicitly.

   Do not grant this audit to the website
   or to the restricted email worker.
   ======================================================= */

REVOKE ALL ON FUNCTION
  public.audit_quotation_email_recovery_consistency(
    INTEGER
  )
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.audit_quotation_email_recovery_consistency(
    INTEGER
  )
FROM bark_web_dev;

REVOKE ALL ON FUNCTION
  public.audit_quotation_email_recovery_consistency(
    INTEGER
  )
FROM bark_email_worker;

REVOKE ALL ON FUNCTION
  public.audit_quotation_email_recovery_consistency(
    INTEGER
  )
FROM bark_email_worker_service;

/* =======================================================
   5. FUNCTION DOCUMENTATION
   ======================================================= */

COMMENT ON FUNCTION
  public.audit_quotation_email_recovery_consistency(
    INTEGER
  )
IS
  'Administrator-only, read-only operational '
  'consistency audit for email outbox, provider '
  'handoffs, reconciliation holds and administrator '
  'escalations. Returns bounded issue codes and '
  'severity without customer details, lease tokens '
  'or provider message identifiers. Makes no changes '
  'and does not send email.';

/* =======================================================
   6. COMMIT FILE 62
   ======================================================= */

COMMIT;
