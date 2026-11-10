
/*
========================================================
BARK ORNAMENT (PVT) LTD

FILE 38 - SECURE QUOTATION EMAIL ENQUEUE

database/006_create_quotation_email_enqueue.sql

PURPOSE
-------
Create a restricted PostgreSQL function to queue
quotation email notifications.

SECURITY
--------
- SECURITY DEFINER with fixed search_path
- Owned by postgres
- EXECUTE granted only to bark_web_dev
- No direct outbox table access to bark_web_dev
- Synthetic quotations are rejected
- Commercial-format quotation reference required
- Parent quotation must exist and have consent
- Parent quotation must be in 'new' status
- At least one quotation item must exist
- Duplicate jobs prevented by unique constraint
- No email transport or provider access

The function must later be invoked inside
the same transaction as quotation insertion.

DEPENDENCIES
------------
001_create_quotation_tables.sql
005_create_quotation_email_outbox.sql

Run as PostgreSQL administrator.
========================================================
*/

BEGIN;

/* ====================================================
   1. SECURE ENQUEUE FUNCTION
   ==================================================== */

CREATE OR REPLACE FUNCTION
  public.enqueue_quotation_email_notifications(
    p_quotation_id UUID
  )
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_reference TEXT;
  v_email TEXT;
  v_status TEXT;
  v_consent_at TIMESTAMPTZ;

  v_item_count INTEGER;
  v_new_jobs INTEGER := 0;
BEGIN

  /* --------------------------------------------------
     1A. Require a quotation identifier
     -------------------------------------------------- */

  IF p_quotation_id IS NULL THEN
    RAISE EXCEPTION
      'Quotation ID is required.'
      USING ERRCODE = '22023';
  END IF;

  /* --------------------------------------------------
     1B. Lock and validate the parent quotation

     The row lock serializes concurrent enqueue
     operations for the same quotation.

     The lock remains held until the caller's
     transaction ends.
     -------------------------------------------------- */

  SELECT
    q.quotation_reference,
    q.email,
    q.status,
    q.consent_at
  INTO
    v_reference,
    v_email,
    v_status,
    v_consent_at
  FROM public.quotations AS q
  WHERE q.id = p_quotation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Quotation does not exist.'
      USING ERRCODE = '22023';
  END IF;

  /* --------------------------------------------------
     1C. Restrict to normal commercial references

     Expected:
       BOQ-YYYY-12_HEX_CHARACTERS

     Rejects:
       BOQ-TEST-YYYY-...
       malformed references
       other unexpected formats
     -------------------------------------------------- */

  IF
    v_reference IS NULL
    OR v_reference !~
      '^BOQ-[0-9]{4}-[A-F0-9]{12}$'
  THEN
    RAISE EXCEPTION
      'Quotation is not eligible for email.'
      USING ERRCODE = '23514';
  END IF;

  /* --------------------------------------------------
     1D. Reject reserved synthetic customer
     -------------------------------------------------- */

  IF
    v_email IS NULL
    OR pg_catalog.lower(v_email) =
      'fixture@example.invalid'
  THEN
    RAISE EXCEPTION
      'Quotation is not eligible for email.'
      USING ERRCODE = '23514';
  END IF;

  /* --------------------------------------------------
     1E. Require new enquiry and recorded consent
     -------------------------------------------------- */

  IF
    v_status IS DISTINCT FROM 'new'
    OR v_consent_at IS NULL
  THEN
    RAISE EXCEPTION
      'Quotation is not ready for notification.'
      USING ERRCODE = '23514';
  END IF;

  /* --------------------------------------------------
     1F. Require validated quotation items

     Synthetic fixture records must never
     produce real email jobs.
     -------------------------------------------------- */

  SELECT COUNT(*)::INTEGER
  INTO v_item_count
  FROM public.quotation_items AS i
  WHERE i.quotation_id = p_quotation_id;

  IF
    v_item_count < 1
    OR v_item_count > 100
  THEN
    RAISE EXCEPTION
      'Quotation has an invalid item count.'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.quotation_items AS i
    WHERE
      i.quotation_id = p_quotation_id
      AND (
        i.product_id =
          '__test_only_quotation_product__'
        OR i.product_slug =
          '__test-only-quotation-product__'
      )
  ) THEN
    RAISE EXCEPTION
      'Synthetic products cannot be queued for email.'
      USING ERRCODE = '23514';
  END IF;

  /* --------------------------------------------------
     1G. Enqueue both notification types

     The unique constraint from File 37
     prevents duplicates.

     A second call will insert zero rows.
     -------------------------------------------------- */

  INSERT INTO public.quotation_email_outbox (
    quotation_id,
    notification_type,
    status,
    attempts,
    next_attempt_at
  )
  VALUES
    (
      p_quotation_id,
      'internal',
      'pending',
      0,
      CURRENT_TIMESTAMP
    ),
    (
      p_quotation_id,
      'customer',
      'pending',
      0,
      CURRENT_TIMESTAMP
    )
  ON CONFLICT ON CONSTRAINT
    uq_quotation_email_outbox_job
  DO NOTHING;

  GET DIAGNOSTICS
    v_new_jobs = ROW_COUNT;

  /* --------------------------------------------------
     1H. Return number of newly created jobs
     -------------------------------------------------- */

  RETURN v_new_jobs;

END;
$function$;

/* ====================================================
   2. SET SECURE FUNCTION OWNER
   ==================================================== */

ALTER FUNCTION
  public.enqueue_quotation_email_notifications(UUID)
OWNER TO postgres;

/* ====================================================
   3. RESTRICT FUNCTION EXECUTION

   PostgreSQL functions may grant EXECUTE
   to PUBLIC by default.

   Revoke that access and grant only the
   necessary application role.
   ==================================================== */

REVOKE ALL ON FUNCTION
  public.enqueue_quotation_email_notifications(UUID)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.enqueue_quotation_email_notifications(UUID)
TO bark_web_dev;

/* ====================================================
   4. DEFENCE IN DEPTH

   Do not grant the application direct
   access to outbox records or sequence.

   The SECURITY DEFINER function performs
   the controlled insertion instead.
   ==================================================== */

REVOKE ALL ON TABLE
  public.quotation_email_outbox
FROM PUBLIC;

REVOKE ALL ON TABLE
  public.quotation_email_outbox
FROM bark_web_dev;

REVOKE ALL ON SEQUENCE
  public.quotation_email_outbox_id_seq
FROM PUBLIC;

REVOKE ALL ON SEQUENCE
  public.quotation_email_outbox_id_seq
FROM bark_web_dev;

/* ====================================================
   5. FUNCTION DOCUMENTATION
   ==================================================== */

COMMENT ON FUNCTION
  public.enqueue_quotation_email_notifications(UUID)
IS
  'Creates missing internal and customer '
  'quotation email jobs for one eligible '
  'commercial quotation. Must be called '
  'inside the quotation creation transaction. '
  'Rejects synthetic test quotations. '
  'Does not send emails.';

/* ====================================================
   6. COMMIT MIGRATION
   ==================================================== */

COMMIT;
