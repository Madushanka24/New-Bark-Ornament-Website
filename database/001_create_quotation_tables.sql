
-- ============================================
-- BARK ORNAMENT (PVT) LTD
-- QUOTATION DATABASE SCHEMA
--
-- File: database/001_create_quotation_tables.sql
-- Migration: 001
-- Database: bark_ornament
-- PostgreSQL 17+
--
-- Creates:
--   1. quotations
--   2. quotation_items
--
-- No sample customers or quotations inserted.
-- ============================================

BEGIN;

-- ============================================
-- 1. QUOTATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    -- Created by the future API.
    -- Must be unique and never reused.
    quotation_reference VARCHAR(50)
        NOT NULL UNIQUE,

    -- Customer information
    customer_name VARCHAR(120) NOT NULL,
    company_name VARCHAR(180) NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(40),

    -- Delivery information
    destination VARCHAR(20) NOT NULL,
    other_destination VARCHAR(160),
    required_delivery_date DATE,

    -- General enquiry information
    customer_message VARCHAR(3000),

    -- Consent is recorded when the API
    -- receives a validated enquiry.
    consent_at TIMESTAMPTZ NOT NULL,

    -- Enquiry workflow
    status VARCHAR(20) NOT NULL
        DEFAULT 'new',

    -- Records when the enquiry was saved.
    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT quotations_customer_name_check
        CHECK (length(btrim(customer_name)) > 0),

    CONSTRAINT quotations_company_name_check
        CHECK (length(btrim(company_name)) > 0),

    CONSTRAINT quotations_email_check
        CHECK (
            length(btrim(email)) > 0
            AND position('@' IN email) > 1
        ),

    CONSTRAINT quotations_destination_check
        CHECK (
            destination IN (
                'Maldives',
                'Seychelles',
                'Sri Lanka',
                'Other'
            )
        ),

    CONSTRAINT quotations_other_destination_check
        CHECK (
            destination <> 'Other'
            OR (
                other_destination IS NOT NULL
                AND length(
                    btrim(other_destination)
                ) > 0
            )
        ),

    CONSTRAINT quotations_status_check
        CHECK (
            status IN (
                'new',
                'reviewing',
                'quoted',
                'closed',
                'cancelled'
            )
        ),

    CONSTRAINT quotations_updated_at_check
        CHECK (updated_at >= created_at)
);

-- ============================================
-- 2. QUOTATION ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    -- Connects this product selection
    -- to its parent quotation.
    quotation_id UUID NOT NULL
        REFERENCES public.quotations(id)
        ON DELETE CASCADE,

    -- Position in the customer's basket.
    item_position INTEGER NOT NULL,

    -- Snapshot of verified product
    -- information at submission time.
    product_id VARCHAR(100) NOT NULL,
    product_slug VARCHAR(200) NOT NULL,
    product_name VARCHAR(250) NOT NULL,
    category_slug VARCHAR(150) NOT NULL,

    -- Customer-requested quantity
    quantity INTEGER NOT NULL,

    -- Customer-requested options.
    -- These do not necessarily represent
    -- confirmed manufacturing specifications.
    requested_material VARCHAR(200),
    requested_size VARCHAR(200),
    requested_finish VARCHAR(200),
    requested_customization VARCHAR(200),

    -- Product-specific requirements
    product_notes VARCHAR(2000),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT quotation_items_quantity_check
        CHECK (
            quantity >= 1
            AND quantity <= 1000000
        ),

    CONSTRAINT quotation_items_position_check
        CHECK (item_position >= 1),

    CONSTRAINT quotation_items_product_name_check
        CHECK (length(btrim(product_name)) > 0),

    CONSTRAINT quotation_items_unique_position
        UNIQUE (quotation_id, item_position)
);

-- ============================================
-- 3. INDEXES
-- ============================================

-- Retrieve recent enquiries first.
CREATE INDEX IF NOT EXISTS
    idx_quotations_created_at
ON public.quotations (created_at DESC);

-- Find enquiries by processing status.
CREATE INDEX IF NOT EXISTS
    idx_quotations_status_created
ON public.quotations (status, created_at DESC);

-- Locate enquiries for a customer email.
CREATE INDEX IF NOT EXISTS
    idx_quotations_email
ON public.quotations (email);

-- Efficiently retrieve quotation items.
CREATE INDEX IF NOT EXISTS
    idx_quotation_items_quotation_id
ON public.quotation_items (quotation_id);

COMMIT;

-- ============================================
-- END OF MIGRATION 001
-- ============================================
