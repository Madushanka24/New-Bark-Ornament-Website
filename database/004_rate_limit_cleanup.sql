
/*
==================================================
BARK ORNAMENT (PVT) LTD

FILE 35 - RATE-LIMIT COUNTER CLEANUP

database/004_rate_limit_cleanup.sql

Purpose:
- Remove historical rate-limit counters
- Preserve active rate-limit windows
- Limit database maintenance workload
- Automatically clean during normal traffic
- Restrict direct access to cleanup functions

Requirements:
- PostgreSQL database: bark_ornament
- Previous migration 002 already applied
- Execute as PostgreSQL administrator

No quotation or quotation-item records
are modified by this migration.
==================================================
*/

BEGIN;

/* ==============================================
   1. INDEX FOR OLD COUNTER LOOKUP

   Helps PostgreSQL find older window_start
   values without scanning the whole table.

   Standard index creation is appropriate for
   the existing local development database.
   ============================================== */

CREATE INDEX IF NOT EXISTS
  idx_quotation_rate_limits_cleanup_window
ON public.quotation_rate_limits (
  window_start
);

/* ==============================================
   2. BATCHED CLEANUP FUNCTION

   Deletes ONLY rows whose window_start
   is older than eight days.

   The migration 002 permits windows up to
   86,400 seconds (24 hours), so every
   eligible row is long expired.

   Delete operations are limited to a batch.
   SKIP LOCKED avoids waiting on rate-limit
   rows being modified by other transactions.

   SECURITY DEFINER:
   Runs with privileges of the function owner.

   Explicit search_path protects against
   untrusted schema shadowing.
   ============================================== */

CREATE OR REPLACE FUNCTION
  public.cleanup_quotation_rate_limits(
    p_batch_size INTEGER DEFAULT 500
  )
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_deleted INTEGER := 0;
BEGIN

  /* Refuse invalid or excessive batch sizes. */

  IF p_batch_size IS NULL
     OR p_batch_size < 1
     OR p_batch_size > 5000
  THEN
    RAISE EXCEPTION
      'Invalid cleanup batch size';
  END IF;

  /*
   * Lock only a bounded group of old rows.
   * The transaction-safe CTID is used solely
   * inside this one DELETE statement.
   */

  WITH expired_rows AS (
    SELECT r.ctid
    FROM public.quotation_rate_limits AS r
    WHERE
      r.window_start <
      CURRENT_TIMESTAMP - INTERVAL '8 days'
    ORDER BY
      r.window_start ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM
    public.quotation_rate_limits AS target
  USING expired_rows
  WHERE
    target.ctid = expired_rows.ctid;

  GET DIAGNOSTICS
    v_deleted = ROW_COUNT;

  RETURN v_deleted;

END;
$function$;

/* ==============================================
   3. FUNCTION OWNERSHIP AND PERMISSIONS

   Run this migration using the postgres
   administrator account.

   The application role does not need
   permission to call cleanup directly.
   ============================================== */

ALTER FUNCTION
  public.cleanup_quotation_rate_limits(INTEGER)
OWNER TO postgres;

REVOKE ALL ON FUNCTION
  public.cleanup_quotation_rate_limits(INTEGER)
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.cleanup_quotation_rate_limits(INTEGER)
FROM bark_web_dev;

/* ==============================================
   4. AUTOMATIC CLEANUP TRIGGER FUNCTION

   The trigger checks approximately 1 in 16
   rate-limit INSERT statements.

   It removes up to 500 old records.

   An unexpected cleanup failure is logged
   without unnecessarily blocking quotation
   traffic.

   Rate-limit enforcement itself remains
   unchanged and must still fail closed
   if its own database operation fails.
   ============================================== */

CREATE OR REPLACE FUNCTION
  public.trigger_quotation_rate_limit_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_deleted INTEGER := 0;
BEGIN

  /*
   * Sample approximately 6.25% of
   * rate-limit INSERT/UPSERT statements.
   */

  IF pg_catalog.random() < 0.0625 THEN

    v_deleted :=
      public.cleanup_quotation_rate_limits(
        500
      );

  END IF;

  /*
   * Statement-level trigger functions
   * should return NULL.
   */

  RETURN NULL;

EXCEPTION WHEN OTHERS THEN

  /*
   * Cleanup maintenance must not become
   * a new cause of quotation outages.
   *
   * Only an error classification is logged.
   * No customer identity hashes are logged.
   */

  RAISE WARNING
    'Rate-limit cleanup skipped: SQLSTATE %',
    SQLSTATE;

  RETURN NULL;

END;
$function$;

/* ==============================================
   5. TRIGGER FUNCTION PERMISSIONS
   ============================================== */

ALTER FUNCTION
  public.trigger_quotation_rate_limit_cleanup()
OWNER TO postgres;

REVOKE ALL ON FUNCTION
  public.trigger_quotation_rate_limit_cleanup()
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.trigger_quotation_rate_limit_cleanup()
FROM bark_web_dev;

/* ==============================================
   6. INSTALL AUTOMATIC INSERT TRIGGER

   AFTER INSERT FOR EACH STATEMENT:
   - Works for newly inserted counters
   - Works for the INSERT side of UPSERT
   - Runs once per statement, not per row

   Dropping a trigger of this exact name
   makes the migration rerunnable.
   ============================================== */

DROP TRIGGER IF EXISTS
  trg_quotation_rate_limit_cleanup
ON public.quotation_rate_limits;

CREATE TRIGGER
  trg_quotation_rate_limit_cleanup
AFTER INSERT
ON public.quotation_rate_limits
FOR EACH STATEMENT
EXECUTE FUNCTION
  public.trigger_quotation_rate_limit_cleanup();

/* ==============================================
   7. COMPLETE MIGRATION

   Normal quotation submissions,
   Turnstile settings, and rate-limit
   enforcement functions are unchanged.
   ============================================== */

COMMIT;
