
/* ==============================================
   BARK ORNAMENT (PVT) LTD

   FILE 31 - QUOTATION TEST FIXTURE

   src/lib/quotation-test-fixture.ts

   PURPOSE
   -------
   Defines a synthetic quotation product
   used exclusively for controlled local
   end-to-end testing.

   This is NOT an approved commercial product.

   IMPORTANT SECURITY RULES
   ------------------------
   - Never add this fixture to public products.
   - Never use it for real customer quotations.
   - Never enable it in production.
   - Never disable normal product validation.
   - Never store real customer data during tests.

   This module does not write to a database.
   ============================================== */

/* ==============================================
   TEST FIXTURE TYPES
   ============================================== */

export type QuotationTestFixture = Readonly<{
  productId: string;
  productSlug: string;
  productName: string;
  categorySlug: string;
  description: string;
  quantity: number;
  options: Readonly<{
    material: string;
    size: string;
    finish: string;
    customization: string;
  }>;
  notes: string;
}>;

/* ==============================================
   FIXED TEST PRODUCT

   Do not use the ID or slug for a real
   catalogue product.

   The unique prefix makes accidental
   mixing with commercial products
   easy to detect.
   ============================================== */

const TEST_FIXTURE: QuotationTestFixture =
  Object.freeze({
    productId:
      "__test_only_quotation_product__",

    productSlug:
      "__test-only-quotation-product__",

    productName:
      "TEST ONLY - Synthetic Quotation Product",

    categorySlug:
      "printing-stationery",

    description:
      "Synthetic fixture for controlled " +
      "local quotation API testing. " +
      "Not an actual Bark Ornament product.",

    quantity: 2,

    options: Object.freeze({
      material: "Test Material",
      size: "Test Size",
      finish: "Test Finish",
      customization: "Test Customization",
    }),

    notes:
      "Automated local test only. " +
      "Not a customer order.",
  });

/* ==============================================
   LOCAL DATABASE SAFETY CHECK

   Only a loopback PostgreSQL connection
   to bark_ornament is acceptable.

   This does not attempt a connection.
   ============================================== */

function isSafeLocalDatabase(): boolean {
  const raw =
    process.env.DATABASE_URL;

  if (!raw) {
    return false;
  }

  try {
    const url = new URL(raw);

    const validProtocol =
      url.protocol === "postgresql:" ||
      url.protocol === "postgres:";

    const validHost = [
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(
      url.hostname.toLowerCase()
    );

    const databaseName =
      decodeURIComponent(
        url.pathname.replace(/^\//, "")
      );

    const validDatabase =
      databaseName === "bark_ornament";

    const validSslMode =
      process.env.DATABASE_SSL_MODE ===
      "disable";

    return (
      validProtocol &&
      validHost &&
      validDatabase &&
      validSslMode
    );
  } catch {
    return false;
  }
}

/* ==============================================
   TEST MODE ELIGIBILITY

   Every condition must be satisfied.

   We deliberately require normal
   quotation submissions to remain off.

   Later test integrations must use
   this function, not just the env flag.
   ============================================== */

export function isQuotationTestModeAllowed():
  boolean {
  if (
    process.env.NODE_ENV !==
    "development"
  ) {
    return false;
  }

  if (
    process.env.QUOTATION_E2E_TEST_MODE !==
    "true"
  ) {
    return false;
  }

  if (
    process.env.QUOTATION_SUBMISSIONS_ENABLED !==
    "false"
  ) {
    return false;
  }

  if (
    !isSafeLocalDatabase()
  ) {
    return false;
  }

  return true;
}

/* ==============================================
   GET TEST PRODUCT

   Returns null unless the controlled
   local test configuration is permitted.

   This function must never be called
   from a public catalogue page.
   ============================================== */

export function getQuotationTestFixture():
  QuotationTestFixture | null {
  if (!isQuotationTestModeAllowed()) {
    return null;
  }

  return TEST_FIXTURE;
}

/* ==============================================
   MATCH A TEST PRODUCT ID AND SLUG

   Both must match exactly.

   This supports a future explicit
   test-only validation branch.
   ============================================== */

export function matchesQuotationTestFixture(
  productId: unknown,
  productSlug: unknown
): boolean {
  if (!isQuotationTestModeAllowed()) {
    return false;
  }

  return (
    productId === TEST_FIXTURE.productId &&
    productSlug === TEST_FIXTURE.productSlug
  );
}

/* ==============================================
   EXPECTED TEST REQUEST ITEM

   Returns a fresh request object.

   No production product data is used.
   ============================================== */

export function createQuotationTestItem() {
  const fixture =
    getQuotationTestFixture();

  if (!fixture) {
    return null;
  }

  return {
    productId: fixture.productId,
    productSlug: fixture.productSlug,
    quantity: fixture.quantity,

    options: {
      ...fixture.options,
    },

    notes: fixture.notes,
  };
}

/* ==============================================
   END FILE 31
   ============================================== */
