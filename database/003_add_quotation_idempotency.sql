
-- ==============================================
-- BARK ORNAMENT (PVT) LTD
-- QUOTATION IDEMPOTENCY MIGRATION
--
-- File:
-- database/003_add_quotation_idempotency.sql
--
-- Migration: 003
-- PostgreSQL: 17+
--
-- PURPOSE:
-- Add persistent database-level safeguards
-- against duplicate quotation submissions.
--
-- IMPORTANT:
-- Execute as postgres administrator
-- or an authorized database migration role.
--
-- This migration does NOT enable submissions
-- or modify the quotation API.
-- ==============================================

BEGIN;

-- ==============================================
-- 1. ENSURE THE QUOTATIONS TABLE EXISTS
-- ==============================================

DO $migration$
BEGIN
    IF to_regclass('public.quotations') IS NULL
    THEN
        RAISE EXCEPTION
            'Migration 003 requires public.quotations. Run migration 001 first.';
    END IF;
END;
$migration$;

-- ==============================================
-- 2. ADD SECURE IDEMPOTENCY COLUMNS
--
-- Existing quotations will have NULL values.
-- This preserves existing records.
--
-- New requests will supply both hashes
-- after File 25 is implemented.
-- ==============================================

ALTER TABLE public.quotations
    ADD COLUMN IF NOT EXISTS
        idempotency_key_hash VARCHAR(64);

ALTER TABLE public.quotations
    ADD COLUMN IF NOT EXISTS
        request_payload_hash VARCHAR(64);

-- ==============================================
-- 3. VALIDATE STORED HASH FORMATS
--
-- Require both hashes together.
--
-- Allow both NULL for older records.
--
-- HMAC-SHA-256 and SHA-256 produce
-- 64-character hexadecimal output.
-- ==============================================

ALTER TABLE public.quotations
    ADD CONSTRAINT
        quotations_idempotency_hash_check
    CHECK (
        (
            idempotency_key_hash IS NULL
            AND request_payload_hash IS NULL
        )
        OR
        (
            idempotency_key_hash IS NOT NULL
            AND request_payload_hash IS NOT NULL
            AND idempotency_key_hash
                ~ '^[0-9a-f]{64}$'
            AND request_payload_hash
                ~ '^[0-9a-f]{64}$'
        )
    );

-- ==============================================
-- 4. PREVENT DUPLICATE SUBMISSION KEYS
--
-- A unique index ensures two concurrent
-- transactions cannot save two quotations
-- using the same idempotency hash.
--
-- NULL historical records are excluded.
-- ==============================================

CREATE UNIQUE INDEX
    idx_quotations_idempotency_key_unique
ON public.quotations (
    idempotency_key_hash
)
WHERE idempotency_key_hash IS NOT NULL;

-- ==============================================
-- 5. DOCUMENT THE NEW COLUMNS
-- ==============================================

COMMENT ON COLUMN
    public.quotations.idempotency_key_hash
IS
    'Server-generated HMAC-SHA-256 hash of the client submission key. Unique for each logical submission.';

COMMENT ON COLUMN
    public.quotations.request_payload_hash
IS
    'Server-generated SHA-256 fingerprint of canonical validated quotation content. Used to detect key reuse with changed content.';

-- ==============================================
-- 6. PRESERVE WEBSITE ROLE PERMISSIONS
--
-- File 18 granted UPDATE on the whole table.
-- For local development, bark_web_dev can
-- therefore insert these new columns.
--
-- Confirm the required privileges.
-- ==============================================

DO $permissions$
BEGIN
    IF NOT has_table_privilege(
        'bark_web_dev',
        'public.quotations',
        'SELECT'
    )
    OR NOT has_table_privilege(
        'bark_web_dev',
        'public.quotations',
        'INSERT'
    )
    THEN
        RAISE EXCEPTION
            'bark_web_dev requires SELECT and INSERT privileges on public.quotations.';
    END IF;
END;
$permissions$;

COMMIT;

-- ==============================================
-- END OF MIGRATION 003
-- ==============================================
