
/*
============================================================
BARK ORNAMENT (PVT) LTD

FILE 40 - SECURE EMAIL WORKER CLAIMING

File:
database/007_create_email_worker_claim.sql

PURPOSE
-------
- Introduce a dedicated NOLOGIN worker role
- Allow restricted claiming of email outbox jobs
- Prevent concurrent workers from claiming the same job
- Assign a unique token to each processing lease
- Recover expired processing leases
- Track the number of claimed delivery attempts
- Exclude synthetic test quotations
- Preserve direct outbox table restrictions

DEPENDENCIES
------------
005_create_quotation_email_outbox.sql
006_create_quotation_email_enqueue.sql

REQUIREMENTS
------------
Run against local database bark_ornament
using PostgreSQL administrator postgres.

IMPORTANT
---------
- Does not send email
- Does not mark jobs as sent
- Does not configure provider credentials
- Does not enable quotation submissions
- Does not grant application account worker access
============================================================
*/

BEGIN;

/* ========================================================
   1. CREATE DEDICATED WORKER ROLE

   This is a NOLOGIN role.

   A future service identity may be granted
   this role only after secure provisioning.

   Do not give this role to bark_web_dev.
   ======================================================== */

DO $role$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = 'bark_email_worker'
  ) THEN

    CREATE ROLE bark_email_worker
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT;

  END IF;
END;
$role$;

/* Ensure an existing role cannot retain LOGIN
   if this migration is executed again. */

ALTER ROLE bark_email_worker
  NOLOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT;

/* The worker needs schema lookup capability,
   not direct access to application tables. */

GRANT USAGE
ON SCHEMA public
TO bark_email_worker;

/* ========================================================
   2. SECURE CLAIM FUNCTION

   Claims up to 10 jobs per call.

   Uses:
   - SECURITY DEFINER
   - Fixed search_path
   - Row-level locks
   - SKIP LOCKED
   - Five-minute lease
   - Random lease token
   - Maximum 20 recorded attempts

   Output intentionally contains no customer
   names, email addresses, or message bodies.
   ======================================================== */

CREATE OR REPLACE FUNCTION
  public.claim_quotation_email_jobs(
    p_batch_size INTEGER DEFAULT 5
  )
RETURNS TABLE (
  job_id BIGINT,
  quotation_id UUID,
  notification_type TEXT,
  lease_token UUID,
  attempt_number INTEGER,
  lease_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN

  /* ------------------------------------------------------
     2A. Validate requested batch size
     ------------------------------------------------------ */

  IF
    p_batch_size IS NULL
    OR p_batch_size < 1
    OR p_batch_size > 10
  THEN

    RAISE EXCEPTION
      'Worker batch size must be between 1 and 10.'
      USING ERRCODE = '22023';

  END IF;

  /* ------------------------------------------------------
     2B. Claim eligible jobs atomically

     Eligible:
     - Pending jobs whose scheduled time has arrived
     - Processing jobs whose five-minute lease expired
     - Fewer than 20 previous attempts

     Never claim:
     - Sent jobs
     - Failed jobs
     - Unexpired processing jobs
     - Synthetic test quotations
     - Quotations without items
     - Quotations lacking recorded consent
     - Quotations not in new status

     FOR UPDATE SKIP LOCKED prevents two
     concurrent workers selecting the same row.

     Updating attempts, lease token and status
     happens in the same SQL statement.
     ------------------------------------------------------ */

  RETURN QUERY

  WITH eligible_jobs AS MATERIALIZED (
    SELECT
      o.id

    FROM public.quotation_email_outbox AS o

    INNER JOIN public.quotations AS q
      ON q.id = o.quotation_id

    WHERE
      o.attempts < 20

      AND (
        (
          o.status = 'pending'
          AND o.next_attempt_at <=
              pg_catalog.clock_timestamp()
        )
        OR
        (
          o.status = 'processing'
          AND o.locked_until <
              pg_catalog.clock_timestamp()
        )
      )

      AND q.status = 'new'
      AND q.consent_at IS NOT NULL

      /* Require normal commercial reference. */

      AND q.quotation_reference ~
        '^BOQ-[0-9]{4}-[A-F0-9]{12}$'

      /* Reject reserved synthetic customer. */

      AND pg_catalog.lower(q.email) <>
        'fixture@example.invalid'

      /* Quotation must contain products. */

      AND EXISTS (
        SELECT 1
        FROM public.quotation_items AS i
        WHERE i.quotation_id = q.id
      )

      /* Reject any reserved test fixture. */

      AND NOT EXISTS (
        SELECT 1
        FROM public.quotation_items AS i
        WHERE
          i.quotation_id = q.id
          AND (
            i.product_id =
              '__test_only_quotation_product__'
            OR
            i.product_slug =
              '__test-only-quotation-product__'
          )
      )

    ORDER BY
      o.next_attempt_at ASC,
      o.id ASC

    LIMIT p_batch_size

    FOR UPDATE OF o SKIP LOCKED
  )

  UPDATE public.quotation_email_outbox AS o

  SET
    status = 'processing',

    attempts = o.attempts + 1,

    lease_token =
      pg_catalog.gen_random_uuid(),

    locked_until =
      pg_catalog.clock_timestamp()
      + INTERVAL '5 minutes',

    updated_at =
      pg_catalog.clock_timestamp(),

    /* Clear an earlier failure classification
       when this claim begins a new attempt. */

    last_error_code = NULL

  FROM eligible_jobs AS e

  WHERE o.id = e.id

  RETURNING
    o.id,
    o.quotation_id,
    o.notification_type::TEXT,
    o.lease_token,
    o.attempts,
    o.locked_until;

END;
$function$;

/* ========================================================
   3. FUNCTION OWNERSHIP

   SECURITY DEFINER uses this trusted owner
   to perform the restricted UPDATE.
   ======================================================== */

ALTER FUNCTION
  public.claim_quotation_email_jobs(INTEGER)
OWNER TO postgres;

/* ========================================================
   4. RESTRICT EXECUTE PERMISSIONS

   PUBLIC and the website role must not
   execute the claiming function.

   Only the dedicated worker role may claim.
   ======================================================== */

REVOKE ALL ON FUNCTION
  public.claim_quotation_email_jobs(INTEGER)
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.claim_quotation_email_jobs(INTEGER)
FROM bark_web_dev;

GRANT EXECUTE ON FUNCTION
  public.claim_quotation_email_jobs(INTEGER)
TO bark_email_worker;

/* ========================================================
   5. DEFENCE IN DEPTH

   Reassert that neither the website role nor
   the worker role receives direct outbox access.

   Enqueue remains controlled by File 38.
   Claiming remains controlled by this function.
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

/* Explicitly ensure the worker cannot enqueue
   commercial notifications either. */

REVOKE ALL ON FUNCTION
  public.enqueue_quotation_email_notifications(UUID)
FROM bark_email_worker;

/* ========================================================
   6. FUNCTION DOCUMENTATION
   ======================================================== */

COMMENT ON FUNCTION
  public.claim_quotation_email_jobs(INTEGER)
IS
  'Claims up to ten due quotation email jobs '
  'using row locks and five-minute leases. '
  'Each claim increments attempts and assigns '
  'a new UUID lease token. Expired processing '
  'leases can be reclaimed. Maximum 20 attempts. '
  'Does not read customer details or send email.';

/* ========================================================
   7. COMMIT MIGRATION
   ======================================================== */

COMMIT;
