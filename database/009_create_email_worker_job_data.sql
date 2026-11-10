
/*
============================================================
BARK ORNAMENT (PVT) LTD

FILE 42 - SECURE WORKER JOB DATA RETRIEVAL

File:
database/009_create_email_worker_job_data.sql

PURPOSE
-------
Allow the dedicated email worker to retrieve
the exact quotation information needed to
render a claimed notification.

SECURITY
--------
- SECURITY DEFINER with fixed search_path
- Owned by postgres
- EXECUTE for bark_email_worker only
- No direct customer-table or outbox access
- Requires an active, matching worker lease
- Rejects unclaimed or completed jobs
- Rejects synthetic test quotations/products
- Does not retrieve secret credentials
- Does not modify tables or send emails

DEPENDENCIES
------------
001_create_quotation_tables.sql
005_create_quotation_email_outbox.sql
007_create_email_worker_claim.sql
008_create_email_worker_completion.sql

Run as postgres against local bark_ornament.
============================================================
*/

BEGIN;

/* ========================================================
   1. SECURE WORKER DATA-RETRIEVAL FUNCTION

   Input:
   - p_job_id: claimed outbox job ID
   - p_lease_token: current lease token

   Returns zero rows for missing, stale,
   expired, superseded or ineligible jobs.

   Returns one row for an eligible active job.

   Product details are represented as JSONB
   so one worker query provides every item.
   ======================================================== */

CREATE OR REPLACE FUNCTION
  public.get_quotation_email_job_data(
    p_job_id BIGINT,
    p_lease_token UUID
  )
RETURNS TABLE (
  job_id BIGINT,
  quotation_id UUID,
  notification_type TEXT,
  quotation_reference TEXT,
  customer_name TEXT,
  company_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  delivery_destination TEXT,
  other_destination TEXT,
  required_delivery_date TEXT,
  customer_message TEXT,
  product_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = pg_catalog
AS $function$
BEGIN

  /* ------------------------------------------------------
     1A. Reject malformed function arguments.
     ------------------------------------------------------ */

  IF
    p_job_id IS NULL
    OR p_job_id < 1
    OR p_lease_token IS NULL
  THEN
    RAISE EXCEPTION
      'Valid job ID and lease token are required.'
      USING ERRCODE = '22023';
  END IF;

  /* ------------------------------------------------------
     1B. Return only the job currently held by this worker.

     A valid lease requires:
     - processing status
     - exact UUID token match
     - locked_until in the future
     - attempts from 1 through 20

     This function does not modify lease state.
     ------------------------------------------------------ */

  RETURN QUERY

  SELECT
    o.id::BIGINT,
    q.id::UUID,
    o.notification_type::TEXT,
    q.quotation_reference::TEXT,
    q.customer_name::TEXT,
    q.company_name::TEXT,
    q.email::TEXT,
    pg_catalog.coalesce(
      q.phone::TEXT,
      ''
    ),
    q.destination::TEXT,
    pg_catalog.coalesce(
      q.other_destination::TEXT,
      ''
    ),
    pg_catalog.coalesce(
      q.required_delivery_date::TEXT,
      ''
    ),
    pg_catalog.coalesce(
      q.customer_message::TEXT,
      ''
    ),
    products.items_json

  FROM public.quotation_email_outbox AS o

  INNER JOIN public.quotations AS q
    ON q.id = o.quotation_id

  CROSS JOIN LATERAL (
    SELECT
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'productId', i.product_id,
          'productSlug', i.product_slug,
          'productName', i.product_name,
          'categorySlug', i.category_slug,
          'quantity', i.quantity,
          'options', pg_catalog.jsonb_build_object(
            'material',
              pg_catalog.coalesce(
                i.requested_material,
                ''
              ),
            'size',
              pg_catalog.coalesce(
                i.requested_size,
                ''
              ),
            'finish',
              pg_catalog.coalesce(
                i.requested_finish,
                ''
              ),
            'customization',
              pg_catalog.coalesce(
                i.requested_customization,
                ''
              )
          ),
          'notes',
            pg_catalog.coalesce(
              i.product_notes,
              ''
            )
        )
        ORDER BY i.item_position
      ) AS items_json,

      COUNT(*)::INTEGER AS item_count,

      pg_catalog.bool_or(
        i.product_id =
          '__test_only_quotation_product__'
        OR i.product_slug =
          '__test-only-quotation-product__'
      ) AS includes_synthetic

    FROM public.quotation_items AS i

    WHERE i.quotation_id = q.id
  ) AS products

  WHERE
    o.id = p_job_id

    AND o.status = 'processing'

    AND o.lease_token = p_lease_token

    AND o.locked_until >
      pg_catalog.clock_timestamp()

    AND o.attempts BETWEEN 1 AND 20

    /* Only the two recognized job types. */

    AND o.notification_type IN (
      'internal',
      'customer'
    )

    /* Require active, consented quotation. */

    AND q.status = 'new'

    AND q.consent_at IS NOT NULL

    AND q.email IS NOT NULL

    /* Refuse synthetic or malformed references. */

    AND q.quotation_reference ~
      '^BOQ-[0-9]{4}-[A-F0-9]{12}$'

    AND pg_catalog.lower(q.email) <>
      'fixture@example.invalid'

    /* Quotation must have eligible products. */

    AND products.item_count BETWEEN 1 AND 100

    AND products.includes_synthetic IS FALSE;

END;
$function$;

/* ========================================================
   2. TRUSTED FUNCTION OWNER
   ======================================================== */

ALTER FUNCTION
  public.get_quotation_email_job_data(
    BIGINT,
    UUID
  )
OWNER TO postgres;

/* ========================================================
   3. REVOKE EXECUTION FROM PUBLIC AND WEBSITE
   ======================================================== */

REVOKE ALL ON FUNCTION
  public.get_quotation_email_job_data(
    BIGINT,
    UUID
  )
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.get_quotation_email_job_data(
    BIGINT,
    UUID
  )
FROM bark_web_dev;

/* ========================================================
   4. GRANT CONTROLLED WORKER EXECUTION
   ======================================================== */

GRANT EXECUTE ON FUNCTION
  public.get_quotation_email_job_data(
    BIGINT,
    UUID
  )
TO bark_email_worker;

/* ========================================================
   5. DEFENCE IN DEPTH

   Worker must not read unrestricted
   customer or quotation information.

   Existing privileges for bark_web_dev
   on quotation tables remain unchanged.
   ======================================================== */

REVOKE ALL ON TABLE
  public.quotation_email_outbox
FROM PUBLIC;

REVOKE ALL ON TABLE
  public.quotation_email_outbox
FROM bark_email_worker;

REVOKE ALL ON TABLE
  public.quotations
FROM bark_email_worker;

REVOKE ALL ON TABLE
  public.quotation_items
FROM bark_email_worker;

/* Preserve worker/website separation. */

REVOKE ALL ON FUNCTION
  public.get_quotation_email_job_data(
    BIGINT,
    UUID
  )
FROM bark_web_dev;

/* ========================================================
   6. DOCUMENTATION
   ======================================================== */

COMMENT ON FUNCTION
  public.get_quotation_email_job_data(
    BIGINT,
    UUID
  )
IS
  'Returns validated quotation data and ordered '
  'product items for one actively leased email '
  'outbox job. Requires the matching unexpired '
  'lease token. Worker-only execute access. '
  'No direct customer table permissions required. '
  'Does not modify jobs or send email.';

/* ========================================================
   7. COMMIT MIGRATION
   ======================================================== */

COMMIT;
