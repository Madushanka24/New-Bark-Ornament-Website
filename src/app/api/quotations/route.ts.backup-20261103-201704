
import "server-only";

/*
==================================================
BARK ORNAMENT (PVT) LTD

FILE 39 - ATOMIC QUOTATION EMAIL OUTBOX

src/app/api/quotations/route.ts

Preserves:
- Persistent early abuse protection
- Same-origin request checks
- Bounded JSON requests
- Honeypot
- Customer and product validation
- IP and email rate limits
- UUID v4 idempotency
- Cloudflare Turnstile
- Authenticated local E2E test mode
- Transactional quotation storage
- Existing-submission responses

Adds:
- Atomic notification outbox enqueue
- Exactly two jobs for new commercial quotes
- No email jobs for synthetic test quotes
- Rollback if required enqueue fails
- No enqueue on idempotent retries

No email messages are sent by this route.

Requires database migration 006.
==================================================
*/

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { isIP } from "node:net";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  databaseQuery,
  getDatabaseClient,
} from "@/lib/db";

import {
  validateQuotationRequest,
  type ValidatedQuotation,
} from "@/lib/quotation-validation";

import {
  checkQuotationProtection,
} from "@/lib/quotation-protection";

import {
  verifyTurnstileToken,
} from "@/lib/turnstile";

import {
  getQuotationTestFixture,
  isQuotationTestModeAllowed,
} from "@/lib/quotation-test-fixture";


/* ==========================================
   SECURITY SETTINGS
   ========================================== */

const MAX_REQUEST_BYTES = 32 * 1024;

const EARLY_DEV_LIMIT = 5;
const EARLY_DEV_WINDOW_SECONDS = 60;

const EARLY_PROD_LIMIT = 60;
const EARLY_PROD_WINDOW_SECONDS = 3600;

const HONEYPOT_MAX_LENGTH = 500;

const IDEMPOTENCY_KEY_LENGTH = 36;

const TEST_CUSTOMER_EMAIL =
  "fixture@example.invalid";

const TEST_COMPANY =
  "Local E2E Test Only";

const TEST_CUSTOMER_NAME =
  "Fixture Test";

const TEST_MESSAGE_PREFIX =
  "E2E TEST ONLY";

const TRUSTED_IP_HEADERS = [
  "cf-connecting-ip",
  "x-real-ip",
  "fly-client-ip",
  "true-client-ip",
] as const;

type TrustedIpHeader =
  (typeof TRUSTED_IP_HEADERS)[number];

type RateLimitRow = {
  allowed: boolean;
  attempts: number;
  retry_after_seconds: number;
};

type EarlyProtectionResult =
  | {
      allowed: true;
      reason: "allowed";
      retryAfterSeconds: 0;
    }
  | {
      allowed: false;
      reason: "rate_limited";
      retryAfterSeconds: number;
    }
  | {
      allowed: false;
      reason: "unavailable";
      retryAfterSeconds: 0;
    };

type SavedQuotationRow = {
  id: string;
  quotation_reference: string;
};

type ExistingQuotationRow = {
  quotation_reference: string;
  request_payload_hash: string | null;
};

type EnqueueResultRow = {
  created_jobs: number;
};

/* ==========================================
   API RESPONSE HELPERS
   ========================================== */

function respond(
  data: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = {}
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function rateLimitedResponse(
  seconds: number
) {
  const retryAfter = Math.max(
    1,
    Math.ceil(seconds)
  );

  return respond(
    {
      success: false,
      code: "RATE_LIMITED",
      message:
        "Too many quotation attempts. " +
        "Please try again later.",
      retryAfterSeconds: retryAfter,
    },
    429,
    {
      "Retry-After": String(retryAfter),
    }
  );
}

function unavailableResponse() {
  return respond(
    {
      success: false,
      code: "PROTECTION_UNAVAILABLE",
      message:
        "Quotation service is temporarily " +
        "unavailable.",
    },
    503
  );
}

function testUnauthorizedResponse() {
  return respond(
    {
      success: false,
      code: "TEST_ACCESS_DENIED",
      message:
        "This request is not authorized.",
    },
    403
  );
}

function botFailureResponse(
  reason:
    | "invalid_token"
    | "verification_failed"
    | "configuration_error"
    | "service_unavailable"
) {
  if (
    reason === "configuration_error" ||
    reason === "service_unavailable"
  ) {
    return respond(
      {
        success: false,
        code: "BOT_VERIFICATION_UNAVAILABLE",
        message:
          "Bot verification is temporarily " +
          "unavailable.",
      },
      503
    );
  }

  return respond(
    {
      success: false,
      code: "BOT_VERIFICATION_FAILED",
      message:
        "Bot verification failed. Please " +
        "complete the security check again.",
    },
    403
  );
}

/* ==========================================
   PRIVATE HMAC KEY
   ========================================== */

function getHmacKey(): Buffer {
  const value =
    process.env.QUOTATION_RATE_LIMIT_HMAC_KEY;

  if (
    !value ||
    !/^[0-9a-fA-F]{64}$/.test(value)
  ) {
    throw new Error(
      "Quotation HMAC key unavailable."
    );
  }

  return Buffer.from(value, "hex");
}

/* ==========================================
   CLIENT IDENTITY
   ========================================== */

function trustedIpHeader():
  TrustedIpHeader | null {
  const configured =
    process.env.QUOTATION_TRUSTED_IP_HEADER
      ?.trim()
      .toLowerCase();

  if (!configured) {
    return null;
  }

  const matched =
    TRUSTED_IP_HEADERS.find(
      (header) => header === configured
    );

  if (!matched) {
    throw new Error(
      "Invalid trusted IP header."
    );
  }

  return matched;
}

function isLocalDevelopment(
  request: NextRequest
): boolean {
  const hostname =
    request.nextUrl.hostname.toLowerCase();

  return (
    process.env.NODE_ENV ===
      "development" &&
    (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    )
  );
}

function clientIdentity(
  request: NextRequest
): string | null {
  const header = trustedIpHeader();

  if (header) {
    const raw = request.headers.get(
      header
    );

    if (!raw) {
      return null;
    }

    const ip = raw.trim();

    return isIP(ip) !== 0
      ? ip.toLowerCase()
      : null;
  }

  return isLocalDevelopment(request)
    ? "local-development-client"
    : null;
}

/* ==========================================
   EARLY PERSISTENT RATE LIMIT
   ========================================== */

async function checkEarlyProtection(
  request: NextRequest
): Promise<EarlyProtectionResult> {
  try {
    const key = getHmacKey();

    const identity =
      clientIdentity(request);

    if (!identity) {
      return {
        allowed: false,
        reason: "unavailable",
        retryAfterSeconds: 0,
      };
    }

    const hash = createHmac(
      "sha256",
      key
    )
      .update(
        "bark-quotation-rate-limit:v1:" +
        "ip:prevalidation:"
      )
      .update(identity)
      .digest("hex");

    const development =
      isLocalDevelopment(request);

    const maximum = development
      ? EARLY_DEV_LIMIT
      : EARLY_PROD_LIMIT;

    const windowSeconds = development
      ? EARLY_DEV_WINDOW_SECONDS
      : EARLY_PROD_WINDOW_SECONDS;

    const result =
      await databaseQuery<RateLimitRow>(
        `
        SELECT
          allowed,
          attempts,
          retry_after_seconds
        FROM public.check_quotation_rate_limit(
          $1::text,
          $2::text,
          $3::integer,
          $4::integer
        )
        `,
        [
          "ip",
          hash,
          maximum,
          windowSeconds,
        ]
      );

    const row = result.rows[0];

    if (
      !row ||
      typeof row.allowed !== "boolean"
    ) {
      return {
        allowed: false,
        reason: "unavailable",
        retryAfterSeconds: 0,
      };
    }

    if (!row.allowed) {
      const retryAfter = Number(
        row.retry_after_seconds
      );

      return {
        allowed: false,
        reason: "rate_limited",
        retryAfterSeconds:
          Number.isFinite(retryAfter)
            ? Math.max(1, retryAfter)
            : 1,
      };
    }

    return {
      allowed: true,
      reason: "allowed",
      retryAfterSeconds: 0,
    };
  } catch {
    console.error(
      "Early quotation protection unavailable."
    );

    return {
      allowed: false,
      reason: "unavailable",
      retryAfterSeconds: 0,
    };
  }
}

/* ==========================================
   LOCAL E2E AUTHORIZATION

   Local fixture testing must not
   accidentally activate normal submissions.
   ========================================== */

function testAuthorizationConfigured(
  request: NextRequest
): boolean {
  if (
    !isQuotationTestModeAllowed() ||
    !isLocalDevelopment(request) ||
    process.env.QUOTATION_TRUSTED_IP_HEADER
      ?.trim()
  ) {
    return false;
  }

  if (
    process.env.TURNSTILE_SECRET_KEY !==
      "1x0000000000000000000000000000000AA" ||
    process.env.TURNSTILE_ALLOWED_HOSTNAMES !==
      "localhost" ||
    process.env.TURNSTILE_EXPECTED_ACTION !==
      "test"
  ) {
    return false;
  }

  return true;
}

function isAuthorizedTestRequest(
  request: NextRequest
): boolean {
  if (!testAuthorizationConfigured(request)) {
    return false;
  }

  const expected =
    process.env.QUOTATION_E2E_AUTH_SECRET;

  const provided = request.headers.get(
    "x-bark-e2e-authorization"
  );

  if (
    !expected ||
    !provided ||
    !/^[0-9a-fA-F]{64}$/.test(expected) ||
    !/^[0-9a-fA-F]{64}$/.test(provided)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(provided, "hex")
  );
}

/* ==========================================
   EXACT SYNTHETIC QUOTATION CHECK
   ========================================== */

function validTestQuotation(
  data: ValidatedQuotation
): boolean {
  const fixture =
    getQuotationTestFixture();

  if (
    !fixture ||
    data.items.length !== 1
  ) {
    return false;
  }

  const item = data.items[0];
  const customer = data.customer;

  const exactItem =
    item.productId === fixture.productId &&
    item.productSlug === fixture.productSlug &&
    item.productName === fixture.productName &&
    item.categorySlug === fixture.categorySlug &&
    item.quantity === fixture.quantity &&
    item.options.material ===
      fixture.options.material &&
    item.options.size ===
      fixture.options.size &&
    item.options.finish ===
      fixture.options.finish &&
    item.options.customization ===
      fixture.options.customization &&
    item.notes === fixture.notes;

  const fictionalCustomer =
    customer.fullName ===
      TEST_CUSTOMER_NAME &&
    customer.companyName ===
      TEST_COMPANY &&
    customer.email ===
      TEST_CUSTOMER_EMAIL &&
    customer.phone === "" &&
    customer.destination ===
      "Maldives" &&
    customer.otherDestination === "" &&
    customer.requiredDeliveryDate === "" &&
    customer.message.startsWith(
      TEST_MESSAGE_PREFIX
    ) &&
    customer.consent === true;

  return exactItem && fictionalCustomer;
}

/* ==========================================
   REFERENCE GENERATION

   BOQ-TEST references are synthetic
   and must never produce email jobs.
   ========================================== */

function createReference(
  testMode: boolean
): string {
  const year = new Date().getUTCFullYear();

  const suffix = randomBytes(6)
    .toString("hex")
    .toUpperCase();

  return testMode
    ? `BOQ-TEST-${year}-${suffix}`
    : `BOQ-${year}-${suffix}`;
}

/* ==========================================
   BOUNDED REQUEST BODY
   ========================================== */

async function readLimitedBody(
  request: NextRequest
): Promise<string | null> {
  const reader = request.body?.getReader();

  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } =
        await reader.read();

      if (done) {
        break;
      }

      size += value.byteLength;

      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", {
    fatal: true,
  }).decode(bytes);
}

/* ==========================================
   HONEYPOT
   ========================================== */

function honeypotTriggered(
  input: unknown
): boolean {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    return false;
  }

  const data = input as Record<
    string,
    unknown
  >;

  if (
    !Object.prototype.hasOwnProperty.call(
      data,
      "website"
    )
  ) {
    return false;
  }

  const value = data.website;

  return (
    typeof value !== "string" ||
    value.length > HONEYPOT_MAX_LENGTH ||
    value.trim().length > 0
  );
}

/* ==========================================
   IDEMPOTENCY KEY
   ========================================== */

function parseIdempotencyKey(
  request: NextRequest
): string | null {
  const raw = request.headers.get(
    "idempotency-key"
  );

  if (
    !raw ||
    raw.length !== IDEMPOTENCY_KEY_LENGTH
  ) {
    return null;
  }

  const key = raw.toLowerCase();

  const uuidV4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  return uuidV4.test(key)
    ? key
    : null;
}

function hashIdempotencyKey(
  key: string,
  secret: Buffer
): string {
  return createHmac("sha256", secret)
    .update(
      "bark-quotation-idempotency:v1:"
    )
    .update(key)
    .digest("hex");
}

function hashQuotationPayload(
  data: ValidatedQuotation
): string {
  const customer = data.customer;

  const canonical = {
    customer: {
      fullName: customer.fullName,
      companyName: customer.companyName,
      email: customer.email,
      phone: customer.phone,
      destination: customer.destination,
      otherDestination:
        customer.otherDestination,
      requiredDeliveryDate:
        customer.requiredDeliveryDate,
      message: customer.message,
      consent: customer.consent,
    },

    items: data.items.map((item) => ({
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      categorySlug: item.categorySlug,
      quantity: item.quantity,
      options: {
        material: item.options.material ?? "",
        size: item.options.size ?? "",
        finish: item.options.finish ?? "",
        customization:
          item.options.customization ?? "",
      },
      notes: item.notes,
    })),
  };

  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

/* ==========================================
   NORMAL SUBMISSION SAFETY SWITCH
   ========================================== */

function submissionsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env
      .QUOTATION_SUBMISSIONS_ENABLED === "true"
  );
}

/* ==========================================
   EXISTING SUBMISSION LOOKUP
   ========================================== */

async function findExistingQuotation(
  idempotencyHash: string
): Promise<ExistingQuotationRow | null> {
  const result =
    await databaseQuery<ExistingQuotationRow>(
      `
      SELECT
        quotation_reference,
        request_payload_hash
      FROM public.quotations
      WHERE idempotency_key_hash = $1
      LIMIT 1
      `,
      [idempotencyHash]
    );

  return result.rows[0] ?? null;
}

function existingSubmissionResponse(
  existing: ExistingQuotationRow,
  payloadHash: string
) {
  if (
    existing.request_payload_hash !==
    payloadHash
  ) {
    return respond(
      {
        success: false,
        code: "IDEMPOTENCY_CONFLICT",
        message:
          "This submission key was used " +
          "for a different enquiry.",
      },
      409
    );
  }

  return respond(
    {
      success: true,
      duplicate: true,
      reference:
        existing.quotation_reference,
      message:
        "This quotation was already saved.",
    },
    200
  );
}

/* ==========================================
   FILE 39: TRANSACTIONAL OUTBOX ENQUEUE

   This function MUST be called using
   the same transaction client that
   inserted the quotation and its items.

   The database function was installed
   and permission-tested in File 38.

   Expected:
   - First eligible commercial enqueue: 2
   - A repeat database enqueue: 0

   This API calls it only for freshly
   inserted commercial quotations.

   A result other than 2 is treated as
   an unexpected state and rolled back.
   ========================================== */

async function enqueueCommercialNotifications(
  client: Awaited<
    ReturnType<typeof getDatabaseClient>
  >,
  quotationId: string
): Promise<void> {
  const result =
    await client.query<EnqueueResultRow>(
      `
      SELECT
        public.enqueue_quotation_email_notifications(
          $1::uuid
        ) AS created_jobs
      `,
      [quotationId]
    );

  const count = Number(
    result.rows[0]?.created_jobs
  );

  if (count !== 2) {
    throw new Error(
      "Quotation notification enqueue " +
      "returned an unexpected job count."
    );
  }
}

/* ==========================================
   POST /api/quotations
   ========================================== */

export async function POST(
  request: NextRequest
) {
  /* 1. Early persistent rate limiter */

  const early =
    await checkEarlyProtection(request);

  if (!early.allowed) {
    return early.reason === "rate_limited"
      ? rateLimitedResponse(
          early.retryAfterSeconds
        )
      : unavailableResponse();
  }

  /* 2. Exclusive E2E test mode */

  const testModeRequested =
    process.env.QUOTATION_E2E_TEST_MODE ===
    "true";

  const testMode =
    testModeRequested &&
    isAuthorizedTestRequest(request);

  if (
    testModeRequested &&
    !testMode
  ) {
    return testAuthorizationConfigured(request)
      ? testUnauthorizedResponse()
      : unavailableResponse();
  }

  /* 3. Same-origin enforcement */

  const origin =
    request.headers.get("origin");

  if (
    !origin ||
    origin !== request.nextUrl.origin
  ) {
    return respond(
      {
        success: false,
        message:
          "Request origin is not permitted.",
      },
      403
    );
  }

  /* 4. Content-Type */

  const contentType =
    request.headers.get("content-type");

  if (
    !contentType ||
    !/^application\/json(?:\s*;|$)/i.test(
      contentType
    )
  ) {
    return respond(
      {
        success: false,
        message:
          "Content-Type must be application/json.",
      },
      415
    );
  }

  /* 5. Declared body size */

  const lengthHeader =
    request.headers.get("content-length");

  if (lengthHeader !== null) {
    if (!/^\d+$/.test(lengthHeader)) {
      return respond(
        {
          success: false,
          message: "Invalid request size.",
        },
        400
      );
    }

    const size = Number(lengthHeader);

    if (
      !Number.isSafeInteger(size) ||
      size > MAX_REQUEST_BYTES
    ) {
      return respond(
        {
          success: false,
          message: "Request is too large.",
        },
        413
      );
    }
  }

  /* 6. Read bounded body */

  let bodyText: string | null;

  try {
    bodyText =
      await readLimitedBody(request);
  } catch {
    return respond(
      {
        success: false,
        message:
          "Could not read request body.",
      },
      400
    );
  }

  if (bodyText === null) {
    return respond(
      {
        success: false,
        message: "Request is too large.",
      },
      413
    );
  }

  /* 7. Parse JSON */

  let input: unknown;

  try {
    input = JSON.parse(bodyText);
  } catch {
    return respond(
      {
        success: false,
        message: "Invalid JSON request.",
      },
      400
    );
  }

  /* 8. Honeypot */

  if (honeypotTriggered(input)) {
    return respond(
      {
        success: false,
        message:
          "Quotation validation failed.",
      },
      422
    );
  }

  /* 9. Validate quotation */

  const validation =
    validateQuotationRequest(input);

  if (!validation.success) {
    return respond(
      {
        success: false,
        message:
          "Quotation validation failed.",
        errors: validation.errors,
      },
      422
    );
  }

  /* 10. Restrict synthetic test payloads */

  if (
    testMode &&
    !validTestQuotation(validation.data)
  ) {
    return testUnauthorizedResponse();
  }

  /* 11. UUID v4 idempotency */

  const idempotencyKey =
    parseIdempotencyKey(request);

  if (!idempotencyKey) {
    return respond(
      {
        success: false,
        code: "INVALID_IDEMPOTENCY_KEY",
        message:
          "A valid Idempotency-Key " +
          "header is required.",
      },
      400
    );
  }

  /* 12. Persistent IP/email limits */

  const protection =
    await checkQuotationProtection(
      request,
      validation.data.customer.email
    );

  if (!protection.allowed) {
    return protection.reason ===
      "rate_limited"
      ? rateLimitedResponse(
          protection.retryAfterSeconds
        )
      : unavailableResponse();
  }

  /* 13. Preserve submission safety gates */

  const normalWriteAllowed =
    !testModeRequested &&
    submissionsEnabled();

  const testWriteAllowed =
    testMode &&
    !submissionsEnabled();

  if (
    !normalWriteAllowed &&
    !testWriteAllowed
  ) {
    return respond(
      {
        success: false,
        code: "SUBMISSIONS_DISABLED",
        message:
          "Quotation submission is not yet enabled.",
      },
      503
    );
  }

  /* 14. Secure request fingerprints */

  let idempotencyHash: string;
  let payloadHash: string;

  try {
    const secret = getHmacKey();

    idempotencyHash =
      hashIdempotencyKey(
        idempotencyKey,
        secret
      );

    payloadHash =
      hashQuotationPayload(
        validation.data
      );
  } catch {
    console.error(
      "Quotation idempotency configuration unavailable."
    );

    return unavailableResponse();
  }

  /* 15. Existing committed submission */

  let existing: ExistingQuotationRow | null;

  try {
    existing = await findExistingQuotation(
      idempotencyHash
    );
  } catch {
    console.error(
      "Quotation duplicate lookup failed."
    );

    return unavailableResponse();
  }

  if (existing) {
    if (
      testMode &&
      !existing.quotation_reference
        .startsWith("BOQ-TEST-")
    ) {
      return testUnauthorizedResponse();
    }

    /* Do not create new email jobs here.
       The original transaction is the
       source of truth. */

    return existingSubmissionResponse(
      existing,
      payloadHash
    );
  }

  /* 16. Turnstile verification for new writes */

  const token =
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input)
      ? (
          input as Record<
            string,
            unknown
          >
        ).turnstileToken
      : undefined;

  const botCheck =
    await verifyTurnstileToken(token);

  if (!botCheck.success) {
    return botFailureResponse(
      botCheck.reason
    );
  }

  /* 17. Get database client */

  const { customer, items } =
    validation.data;

  const reference =
    createReference(testMode);

  let client;

  try {
    client = await getDatabaseClient();
  } catch {
    console.error(
      "Quotation database connection failed."
    );

    return unavailableResponse();
  }

  let transactionStarted = false;

  try {
    /* 18. Begin atomic transaction */

    await client.query(
      "BEGIN ISOLATION LEVEL READ COMMITTED"
    );

    transactionStarted = true;

    /* 19. Insert quotation header */

    const quotationResult =
      await client.query<SavedQuotationRow>(
        `
        INSERT INTO public.quotations (
          quotation_reference,
          customer_name,
          company_name,
          email,
          phone,
          destination,
          other_destination,
          required_delivery_date,
          customer_message,
          consent_at,
          status,
          idempotency_key_hash,
          request_payload_hash
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          CURRENT_TIMESTAMP,
          'new', $10, $11
        )
        ON CONFLICT (
          idempotency_key_hash
        )
        WHERE idempotency_key_hash IS NOT NULL
        DO NOTHING
        RETURNING
          id,
          quotation_reference
        `,
        [
          reference,
          customer.fullName,
          customer.companyName,
          customer.email,
          customer.phone || null,
          customer.destination,
          customer.otherDestination || null,
          customer.requiredDeliveryDate || null,
          customer.message || null,
          idempotencyHash,
          payloadHash,
        ]
      );

    const inserted =
      quotationResult.rows[0];

    /* 20. Resolve concurrent duplicate */

    if (!inserted) {
      const conflictResult =
        await client.query<ExistingQuotationRow>(
          `
          SELECT
            quotation_reference,
            request_payload_hash
          FROM public.quotations
          WHERE idempotency_key_hash = $1
          LIMIT 1
          `,
          [idempotencyHash]
        );

      const previous =
        conflictResult.rows[0];

      if (!previous) {
        throw new Error(
          "Idempotency conflict unresolved."
        );
      }

      if (
        testMode &&
        !previous.quotation_reference
          .startsWith("BOQ-TEST-")
      ) {
        await client.query("ROLLBACK");
        transactionStarted = false;

        return testUnauthorizedResponse();
      }

      /*
       * The winning transaction already
       * owns notification enqueueing.
       * No second enqueue call is made.
       */

      await client.query("COMMIT");
      transactionStarted = false;

      return existingSubmissionResponse(
        previous,
        payloadHash
      );
    }

    /* 21. Insert quotation products */

    for (
      const [index, item] of
      items.entries()
    ) {
      await client.query(
        `
        INSERT INTO public.quotation_items (
          quotation_id,
          item_position,
          product_id,
          product_slug,
          product_name,
          category_slug,
          quantity,
          requested_material,
          requested_size,
          requested_finish,
          requested_customization,
          product_notes
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12
        )
        `,
        [
          inserted.id,
          index + 1,
          item.productId,
          item.productSlug,
          item.productName,
          item.categorySlug,
          item.quantity,
          item.options.material || null,
          item.options.size || null,
          item.options.finish || null,
          item.options.customization || null,
          item.notes || null,
        ]
      );
    }

    /*
     * 22. FILE 39 - ATOMIC EMAIL OUTBOX
     *
     * This runs BEFORE COMMIT using the
     * same PostgreSQL transaction client.
     *
     * Commercial quotation:
     *   Queue internal + customer jobs.
     *
     * Synthetic E2E quotation:
     *   Never enqueue jobs.
     *
     * If enqueue fails, catch performs
     * ROLLBACK of the quotation, items,
     * and any uncommitted outbox changes.
     */

    if (!testMode) {
      await enqueueCommercialNotifications(
        client,
        inserted.id
      );
    }

    /* 23. Commit quotation and jobs together */

    await client.query("COMMIT");
    transactionStarted = false;

    return respond(
      {
        success: true,
        duplicate: false,
        reference:
          inserted.quotation_reference,
        message:
          "Quotation enquiry saved successfully.",
      },
      201
    );
  } catch {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        console.error(
          "Quotation transaction rollback failed."
        );
      }
    }

    console.error(
      "Quotation transaction failed."
    );

    return respond(
      {
        success: false,
        message:
          "Unable to process your enquiry. " +
          "Please try again later.",
      },
      500
    );
  } finally {
    client.release();
  }
}

/* ==========================================
   GET: QUOTATIONS ARE NOT PUBLIC
   ========================================== */

export async function GET() {
  return respond(
    {
      success: false,
      message:
        "This endpoint accepts POST only.",
    },
    405
  );
}
