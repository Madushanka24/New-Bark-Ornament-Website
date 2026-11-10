
/*
========================================================
BARK ORNAMENT (PVT) LTD

FILE 37 - QUOTATION EMAIL OUTBOX

database/005_create_quotation_email_outbox.sql

PURPOSE
-------
Create durable PostgreSQL email notification jobs
for quotation enquiries.

NOTIFICATION TYPES
------------------
internal - Sales team notification
customer - Buyer acknowledgement

SECURITY
--------
- No emails are sent by this migration
- Synthetic quotation references are blocked
- The isolated E2E product is blocked
- Dedicated worker access will be added later
- bark_web_dev receives no direct outbox access
- No email credentials are stored in this table
- No duplicate notification job per quotation/type

REQUIREMENTS
------------
- Database: bark_ornament
- Migrations 001 through 004 already applied
- Run as PostgreSQL administrator: postgres

IMPORTANT
---------
Normal customer submissions and E2E test mode
must remain disabled during this migration.
========================================================
*/

BEGIN;

/* ====================================================
   1. CREATE EMAIL OUTBOX TABLE
   ==================================================== */

CREATE TABLE IF NOT EXISTS
  public.quotation_email_outbox
(
  id BIGINT GENERATED ALWAYS AS IDENTITY
    PRIMARY KEY,

  quotation_id UUID NOT NULL,

  notification_type VARCHAR(16) NOT NULL,

  status VARCHAR(16) NOT NULL
    DEFAULT 'pending',

  attempts INTEGER NOT NULL
    DEFAULT 0,

  next_attempt_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  locked_until TIMESTAMPTZ,

  lease_token UUID,

  sent_at TIMESTAMPTZ,

  provider_message_id VARCHAR(255),

  last_error_code VARCHAR(80),

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  updated_at TIMESTAMPTZ NOT NULL
    DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT
    fk_quotation_email_outbox_quotation
  FOREIGN KEY (quotation_id)
  REFERENCES public.quotations(id)
  ON DELETE RESTRICT,

  CONSTRAINT
    chk_quotation_email_outbox_type
  CHECK (
    notification_type IN (
      'internal',
      'customer'
    )
  ),

  CONSTRAINT
    chk_quotation_email_outbox_status
  CHECK (
    status IN (
      'pending',
      'processing',
      'sent',
      'failed'
    )
  ),

  CONSTRAINT
    chk_quotation_email_outbox_attempts
  CHECK (
    attempts >= 0
    AND attempts <= 20
  ),

  CONSTRAINT
    chk_quotation_email_outbox_lease
  CHECK (
    (
      status = 'processing'
      AND locked_until IS NOT NULL
      AND lease_token IS NOT NULL
    )
    OR
    (
      status <> 'processing'
      AND locked_until IS NULL
      AND lease_token IS NULL
    )
  ),

  CONSTRAINT
    chk_quotation_email_outbox_sent
  CHECK (
    (
      status = 'sent'
      AND sent_at IS NOT NULL
    )
    OR
    (
      status <> 'sent'
      AND sent_at IS NULL
    )
  ),

  CONSTRAINT
    uq_quotation_email_outbox_job
  UNIQUE (
    quotation_id,
    notification_type
  )
);

/* ====================================================
   2. PERFORMANCE INDEXES

   Pending jobs should be processed in scheduled order.

   Processing jobs are indexed separately for
   recovery when a worker lease expires.
   ==================================================== */

CREATE INDEX IF NOT EXISTS
  idx_quotation_email_outbox_pending
ON public.quotation_email_outbox (
  next_attempt_at,
  id
)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS
  idx_quotation_email_outbox_expired_leases
ON public.quotation_email_outbox (
  locked_until,
  id
)
WHERE status = 'processing';

/* ====================================================
   3. SYNTHETIC QUOTATION SAFETY GUARD

   A BEFORE INSERT / UPDATE trigger rejects email
   jobs for test quotations.

   We check:
   - Test quotation reference prefix
   - Reserved fictional test customer email
   - Reserved synthetic test product ID
   - Missing parent quotation

   The function runs as postgres with a fixed
   search_path, and all table names are qualified.

   NOTE:
   Future API integration must insert quotation
   items before enqueueing notification jobs.
   ==================================================== */

CREATE OR REPLACE FUNCTION
  public.guard_quotation_email_outbox()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_reference TEXT;
  v_email TEXT;
BEGIN

  SELECT
    q.quotation_reference,
    q.email
  INTO
    v_reference,
    v_email
  FROM public.quotations AS q
  WHERE q.id = NEW.quotation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Quotation email job has no parent quotation.'
      USING ERRCODE = '23503';
  END IF;

  IF
    v_reference LIKE 'BOQ-TEST-%'
    OR LOWER(v_email) = 'fixture@example.invalid'
    OR EXISTS (
      SELECT 1
      FROM public.quotation_items AS i
      WHERE
        i.quotation_id = NEW.quotation_id
        AND i.product_id =
          '__test_only_quotation_product__'
    )
  THEN
    RAISE EXCEPTION
      'Synthetic test quotations cannot be queued for email.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;

END;
$function$;

/* ====================================================
   4. OWNER AND FUNCTION PERMISSIONS

   The trigger runs automatically.
   The application account cannot invoke the
   guard function directly.
   ==================================================== */

ALTER FUNCTION
  public.guard_quotation_email_outbox()
OWNER TO postgres;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_outbox()
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  public.guard_quotation_email_outbox()
FROM bark_web_dev;

/* ====================================================
   5. INSTALL INSERT / QUOTATION-ID UPDATE GUARD
   ==================================================== */

DROP TRIGGER IF EXISTS
  trg_guard_quotation_email_outbox
ON public.quotation_email_outbox;

CREATE TRIGGER
  trg_guard_quotation_email_outbox
BEFORE INSERT OR UPDATE OF quotation_id
ON public.quotation_email_outbox
FOR EACH ROW
EXECUTE FUNCTION
  public.guard_quotation_email_outbox();

/* ====================================================
   6. RESTRICT DIRECT TABLE ACCESS

   Do not grant the application role INSERT,
   UPDATE, DELETE or SELECT yet.

   A later migration will define the controlled
   enqueue and worker operations.

   Also revoke identity-sequence access.
   ==================================================== */

ALTER TABLE
  public.quotation_email_outbox
OWNER TO postgres;

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
   7. DOCUMENT THE TABLE
   ==================================================== */

COMMENT ON TABLE
  public.quotation_email_outbox
IS
  'Durable quotation email jobs. Does not store '
  'rendered email bodies or credentials. '
  'Delivery is not yet enabled.';

COMMENT ON COLUMN
  public.quotation_email_outbox.status
IS
  'pending=ready for future worker; '
  'processing=leased; '
  'sent=provider accepted; '
  'failed=terminal delivery failure.';

COMMENT ON COLUMN
  public.quotation_email_outbox.attempts
IS
  'Number of recorded delivery attempts. '
  'Retry policy will be implemented separately.';

COMMENT ON COLUMN
  public.quotation_email_outbox.lease_token
IS
  'Opaque worker lease identifier to prevent '
  'stale worker state changes.';

COMMENT ON COLUMN
  public.quotation_email_outbox.provider_message_id
IS
  'Provider-supplied message identifier after '
  'successful acceptance. Not proof of inbox delivery.';

/* ====================================================
   8. COMPLETE MIGRATION
   ==================================================== */

COMMIT;
