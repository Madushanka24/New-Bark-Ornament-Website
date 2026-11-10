
/*
===========================================================
BARK ORNAMENT (PVT) LTD

FILE 60 - ADMINISTRATOR HANDOFF RECOVERY INSPECTION

File:
database/014_create_email_handoff_recovery_inspection.sql

DEPENDENCIES
------------
File 37 - Email outbox
File 52 - Reconciliation holds
File 53 - Administrator reconciliation
File 54 - Provider handoff history

PURPOSE
-------
1. Identify current unresolved provider handoffs.
2. Distinguish processing from reconciliation holds.
3. Filter records by minimum age.
4. Bound inspection result size.
5. Exclude completed and historical attempts.
6. Deny website and worker access.
7. Return no customer or credential information.

SECURITY
--------
- Administrator-only execution
- Read-only PostgreSQL function
- Trusted owner: postgres
- Restricted search_path
- No direct worker table grants
- No automatic hold release
- No email provider connection
- No email sending

RUN ONCE:
Local bark_ornament database, as postgres.
===========================================================
*/

BEGIN;

/* =======================================================
   1. VERIFY DATABASE AND EXISTING DEPENDENCIES
   ======================================================= */

DO $preflight$
BEGIN

  IF CURRENT_DATABASE() <> 'bark_ornament'
     OR CURRENT_USER <> 'postgres'
  THEN
    RAISE EXCEPTION
      'File 60 requires postgres in bark_ornament.';
  END IF;

  IF inet_server_addr() IS NOT NULL
     AND inet_server_addr() NOT IN (
       '127.0.0.1'::INET,
       '::1'::INET
     )
  THEN
    RAISE EXCEPTION
      'File 60 must be applied locally.';
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
    'public.begin_quotation_email_provider_handoff(bigint,uuid)'
  ) IS NULL

  OR to_regprocedure(
    'public.hold_quotation_email_for_reconciliation(bigint,uuid,text)'
  ) IS NULL

  OR to_regprocedure(
    'public.resolve_quotation_email_reconciliation(bigint,text,text,text)'
  ) IS NULL

  THEN

    RAISE EXCEPTION
      'Required earlier email safety migrations '
      'are not installed.';

  END IF;

END;
$preflight$;

/* =======================================================
   2. ADMINISTRATOR-ONLY INSPECTION FUNCTION

   Input:
     p_limit
       Maximum number of rows, 1 through 100.

     p_min_age_minutes
       Minimum time spent in current state,
       from 0 through 10080 minutes.

   Default:
     Return up to 20 records, each at least
     10 minutes old.

   Output:
     job_id
     attempt_number
     review_state
     state_since
     age_seconds
     uncertainty_reason

   Review states:
     handoff_outcome_pending
     reconciliation_required

   The function reads only active handoff
   attempts and their associated unresolved
   reconciliation holds.

   Historical resolved attempts, sent jobs
   and terminal failures are excluded.

   The function is marked STABLE because it
   performs only read operations.
   ======================================================= */

CREATE FUNCTION
  public.inspect_quotation_email_handoff_recovery(
    p_limit INTEGER DEFAULT 20,
    p_min_age_minutes INTEGER DEFAULT 10
  )

RETURNS TABLE (
  job_id BIGINT,
  attempt_number INTEGER,
  review_state TEXT,
  state_since TIMESTAMPTZ,
  age_seconds BIGINT,
  uncertainty_reason TEXT
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
     Validate requested result size.
     ----------------------------------------------------- */

  IF p_limit IS NULL
     OR p_limit NOT BETWEEN 1 AND 100
  THEN

    RAISE EXCEPTION
      'Inspection limit must be between 1 and 100.'
      USING ERRCODE = '22023';

  END IF;

  /* -----------------------------------------------------
     Validate minimum age.

     Maximum permitted inspection threshold:
       10080 minutes = 7 days.
     ----------------------------------------------------- */

  IF p_min_age_minutes IS NULL
     OR p_min_age_minutes NOT BETWEEN 0 AND 10080
  THEN

    RAISE EXCEPTION
      'Inspection age must be between '
      '0 and 10080 minutes.'
      USING ERRCODE = '22023';

  END IF;

  /*
   * Use a single stable timestamp for
   * age calculation in this inspection.
   */

  v_now := pg_catalog.statement_timestamp();

  /* -----------------------------------------------------
     Find unresolved CURRENT handoff attempts.

     Join requirements:
       handoff.job_id = outbox.id
       handoff.attempt_number = outbox.attempts

     This prevents a historical handoff from
     being confused with a newer attempt.

     A processing handoff requires:
       status = processing
       locked_until = infinity
       lease_token matches handoff token

     A held handoff requires:
       status = pending
       next_attempt_at = infinity
       no current lease
       matching unresolved hold record

     Other states are not inspection targets.
     ----------------------------------------------------- */

  RETURN QUERY

  SELECT
    inspected.job_id,

    inspected.attempt_number,

    inspected.review_state,

    inspected.state_since,

    GREATEST(
      0::NUMERIC,

      pg_catalog.floor(
        EXTRACT(
          EPOCH FROM (
            v_now - inspected.state_since
          )
        )
      )
    )::BIGINT AS age_seconds,

    inspected.uncertainty_reason

  FROM (

    SELECT
      o.id AS job_id,

      o.attempts AS attempt_number,

      CASE
        WHEN rh.job_id IS NOT NULL
          THEN 'reconciliation_required'::TEXT

        ELSE 'handoff_outcome_pending'::TEXT
      END AS review_state,

      CASE
        WHEN rh.job_id IS NOT NULL
          THEN rh.held_at

        ELSE h.handoff_at
      END AS state_since,

      CASE
        WHEN rh.job_id IS NOT NULL
          THEN rh.reason_code

        ELSE NULL::TEXT
      END AS uncertainty_reason

    FROM
      public.quotation_email_provider_handoffs
        AS h

    INNER JOIN
      public.quotation_email_outbox
        AS o

      ON o.id = h.job_id
     AND o.attempts = h.attempt_number

    LEFT JOIN
      public.quotation_email_reconciliation_holds
        AS rh

      ON rh.job_id = h.job_id
     AND rh.held_attempt = h.attempt_number
     AND rh.resolved_at IS NULL

    WHERE

      /* Case 1: Submitted handoff still processing. */

      (
        o.status = 'processing'

        AND o.locked_until =
          'infinity'::TIMESTAMPTZ

        AND o.lease_token = h.lease_token

        AND rh.job_id IS NULL
      )

      OR

      /* Case 2: Handoff already on an active hold. */

      (
        o.status = 'pending'

        AND o.next_attempt_at =
          'infinity'::TIMESTAMPTZ

        AND o.lease_token IS NULL

        AND o.locked_until IS NULL

        AND rh.job_id IS NOT NULL
      )

  ) AS inspected

  WHERE inspected.state_since <=
    (
      v_now -
      pg_catalog.make_interval(
        mins => p_min_age_minutes
      )
    )

  ORDER BY
    inspected.state_since ASC,
    inspected.job_id ASC

  LIMIT p_limit;

END;
$function$;

/* =======================================================
   3. OWNER
   ======================================================= */

ALTER FUNCTION
  public.inspect_quotation_email_handoff_recovery(
    INTEGER,
    INTEGER
  )

OWNER TO postgres;

/* =======================================================
   4. RESTRICT EXECUTION

   PostgreSQL normally grants function EXECUTE
   to PUBLIC at creation.

   Remove this privilege.

   Only the trusted administrator should inspect
   unresolved provider handoffs.
   ======================================================= */

REVOKE ALL ON FUNCTION
  public.inspect_quotation_email_handoff_recovery(
    INTEGER,
    INTEGER
  )

FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.inspect_quotation_email_handoff_recovery(
    INTEGER,
    INTEGER
  )

FROM bark_web_dev;

REVOKE ALL ON FUNCTION
  public.inspect_quotation_email_handoff_recovery(
    INTEGER,
    INTEGER
  )

FROM bark_email_worker;

REVOKE ALL ON FUNCTION
  public.inspect_quotation_email_handoff_recovery(
    INTEGER,
    INTEGER
  )

FROM bark_email_worker_service;

/* =======================================================
   5. DOCUMENTATION
   ======================================================= */

COMMENT ON FUNCTION
  public.inspect_quotation_email_handoff_recovery(
    INTEGER,
    INTEGER
  )

IS
  'Administrator-only, read-only inspection of '
  'current unresolved email provider handoffs. '
  'Shows handoff outcome pending or unresolved '
  'reconciliation hold, bounded by age and count. '
  'Does not expose customer data, lease tokens or '
  'provider message IDs. Never sends email or '
  'modifies worker job status.';

/* =======================================================
   6. COMPLETE MIGRATION
   ======================================================= */

COMMIT;

