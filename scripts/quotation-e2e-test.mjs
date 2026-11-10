
/*
 * ==========================================
 * BARK ORNAMENT (PVT) LTD
 *
 * FILE 34 - CONTROLLED E2E TESTS
 *
 * scripts/quotation-e2e-test.mjs
 *
 * Tests:
 * 1. Concurrent HTTP 201 / 200
 * 2. One stored quotation and item
 * 3. Same-key content conflict: HTTP 409
 * 4. Missing Turnstile token: HTTP 403
 * 5. Safe, targeted database cleanup
 *
 * Requirements:
 * - Local development only
 * - Test mode explicitly enabled
 * - Normal submissions disabled
 * - Private test authorization
 * - Exact synthetic fixture
 * - Local PostgreSQL database
 *
 * Never use real customer information.
 * ==========================================
 */

import pg from "pg";

import {
  createHmac,
  randomUUID,
} from "node:crypto";

const { Pool } = pg;

/* ==========================================
   CONFIGURATION
   ========================================== */

const API_ORIGIN =
  "http://127.0.0.1:3000";

const API_URL =
  `${API_ORIGIN}/api/quotations`;

const EXPECTED_DATABASE =
  "bark_ornament";

const TEST_EMAIL =
  "fixture@example.invalid";

const TEST_CUSTOMER_NAME =
  "Fixture Test";

const TEST_COMPANY =
  "Local E2E Test Only";

const TEST_PRODUCT_ID =
  "__test_only_quotation_product__";

const TEST_PRODUCT_SLUG =
  "__test-only-quotation-product__";

const TEST_PRODUCT_NAME =
  "TEST ONLY - Synthetic Quotation Product";

const TEST_CATEGORY =
  "printing-stationery";

const TEST_PRODUCT_NOTES =
  "Automated local test only. " +
  "Not a customer order.";

const TURNSTILE_DUMMY_TOKEN =
  "XXXX.DUMMY.TOKEN.XXXX";

const REQUEST_TIMEOUT_MS = 20000;

const TEST_REQUEST_COUNT = 4;

const EXPECTED_SECRET =
  "1x0000000000000000000000000000000AA";

/* ==========================================
   PRIVATE RUN IDENTIFIERS
   ========================================== */

const RUN_ID = randomUUID();

const IDEMPOTENCY_KEY =
  randomUUID();

const MESSAGE =
  `E2E TEST ONLY RUN ${RUN_ID}`;

const CHANGED_MESSAGE =
  `${MESSAGE} CHANGED`;

let pool = null;

let initialCounts = null;

let idempotencyHash = "";

let cleanupCompleted = false;

/* ==========================================
   OUTPUT HELPERS
   ========================================== */

function info(message) {
  console.log(`INFO: ${message}`);
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function assert(
  condition,
  message
) {
  if (!condition) {
    throw new Error(message);
  }

  pass(message);
}

/* ==========================================
   ENVIRONMENT SAFETY CHECK
   ========================================== */

function verifySafetyConfiguration() {
  assert(
    process.env
      .QUOTATION_SUBMISSIONS_ENABLED ===
      "false",
    "Normal submissions are disabled"
  );

  assert(
    process.env
      .QUOTATION_E2E_TEST_MODE === "true",
    "Dedicated E2E mode is enabled"
  );

  assert(
    !process.env
      .QUOTATION_TRUSTED_IP_HEADER
      ?.trim(),
    "No proxy IP header is configured"
  );

  assert(
    process.env.TURNSTILE_SECRET_KEY ===
      EXPECTED_SECRET &&
      process.env
        .TURNSTILE_ALLOWED_HOSTNAMES ===
        "localhost" &&
      process.env
        .TURNSTILE_EXPECTED_ACTION ===
        "test",
    "Development Turnstile configuration matches"
  );

  const authSecret =
    process.env
      .QUOTATION_E2E_AUTH_SECRET;

  assert(
    typeof authSecret === "string" &&
      /^[0-9a-fA-F]{64}$/.test(
        authSecret
      ),
    "Private test authorization is configured"
  );

  const hmacSecret =
    process.env
      .QUOTATION_RATE_LIMIT_HMAC_KEY;

  assert(
    typeof hmacSecret === "string" &&
      /^[0-9a-fA-F]{64}$/.test(
        hmacSecret
      ),
    "Quotation HMAC key is configured"
  );

  const rawDatabaseUrl =
    process.env.DATABASE_URL;

  assert(
    typeof rawDatabaseUrl === "string" &&
      rawDatabaseUrl.length > 0,
    "PostgreSQL URL is configured"
  );

  const url = new URL(
    rawDatabaseUrl
  );

  const databaseName =
    decodeURIComponent(
      url.pathname.replace(/^\//, "")
    );

  assert(
    (
      url.protocol === "postgresql:" ||
      url.protocol === "postgres:"
    ) &&
      [
        "localhost",
        "127.0.0.1",
        "[::1]",
      ].includes(
        url.hostname.toLowerCase()
      ) &&
      databaseName ===
        EXPECTED_DATABASE &&
      process.env.DATABASE_SSL_MODE ===
        "disable",
    "Database target is local bark_ornament"
  );
}

/* ==========================================
   HASH IDENTIFIERS

   These formulas match the API and
   File 21 protection implementation.
   ========================================== */

function hmacHex(
  namespace,
  value
) {
  const key = Buffer.from(
    process.env
      .QUOTATION_RATE_LIMIT_HMAC_KEY,
    "hex"
  );

  return createHmac("sha256", key)
    .update(namespace)
    .update(value)
    .digest("hex");
}

function calculateHashes() {
  idempotencyHash = hmacHex(
    "bark-quotation-idempotency:v1:",
    IDEMPOTENCY_KEY
  );

  return {
    early: hmacHex(
      "bark-quotation-rate-limit:v1:" +
        "ip:prevalidation:",
      "local-development-client"
    ),

    ip: hmacHex(
      "bark-quotation-rate-limit:v1:ip:",
      "local-development-client"
    ),

    email: hmacHex(
      "bark-quotation-rate-limit:v1:email:",
      TEST_EMAIL
    ),
  };
}

/* ==========================================
   DATABASE COUNT SNAPSHOT
   ========================================== */

async function readCounts() {
  const result = await pool.query(`
    SELECT
      (
        SELECT COUNT(*)
        FROM public.quotations
      ) AS quotations,
      (
        SELECT COUNT(*)
        FROM public.quotation_items
      ) AS items
  `);

  const row = result.rows[0];

  assert(
    Boolean(row),
    "Database counts are readable"
  );

  return {
    quotations: BigInt(
      row.quotations
    ),
    items: BigInt(
      row.items
    ),
  };
}

/* ==========================================
   RATE-LIMIT CAPACITY CHECK

   4 authenticated requests will be sent.

   We do not delete or reset counters.

   The database clock determines the
   current fixed-window counter.
   ========================================== */

async function readCurrentCounter(
  hash,
  seconds
) {
  const result = await pool.query(
    `
    SELECT
      attempt_count,
      CEIL(
        EXTRACT(
          EPOCH FROM (
            (
              to_timestamp(
                FLOOR(
                  EXTRACT(
                    EPOCH FROM clock_timestamp()
                  ) / $2::integer
                ) * $2::integer
              )
              + make_interval(
                  secs => $2::integer
                )
            ) - clock_timestamp()
          )
        )
      )::integer AS reset_seconds
    FROM public.quotation_rate_limits
    WHERE identity_type = $3
      AND identity_hash = $1
      AND window_seconds = $2
      AND window_start = to_timestamp(
        FLOOR(
          EXTRACT(
            EPOCH FROM clock_timestamp()
          ) / $2::integer
        ) * $2::integer
      )
    `,
    [
      hash.value,
      seconds,
      hash.type,
    ]
  );

  return result.rows[0] ?? {
    attempt_count: 0,
    reset_seconds: 0,
  };
}

async function verifyRateLimitCapacity() {
  const hashes =
    calculateHashes();

  const checks = [
    {
      label: "Early request limiter",
      value: hashes.early,
      type: "ip",
      window: 60,
      maximum: 5,
    },
    {
      label: "Validated IP limiter",
      value: hashes.ip,
      type: "ip",
      window: 3600,
      maximum: 5,
    },
    {
      label: "Validated email limiter",
      value: hashes.email,
      type: "email",
      window: 3600,
      maximum: 5,
    },
  ];

  for (const check of checks) {
    const row = await readCurrentCounter(
      {
        value: check.value,
        type: check.type,
      },
      check.window
    );

    const used = Number(
      row.attempt_count
    );

    const available =
      check.maximum - used;

    info(
      `${check.label}: ${available} ` +
      `attempt(s) available`
    );

    if (available < TEST_REQUEST_COUNT) {
      throw new Error(
        `${check.label} has insufficient ` +
        `capacity for ${TEST_REQUEST_COUNT} ` +
        `requests. Wait for its fixed ` +
        `window to reset. Do not delete ` +
        `security counters.`
      );
    }
  }

  pass(
    "Rate-limit capacity is sufficient"
  );
}

/* ==========================================
   EXACT SYNTHETIC TEST PAYLOAD
   ========================================== */

function makePayload(
  message = MESSAGE,
  token = TURNSTILE_DUMMY_TOKEN
) {
  return {
    website: "",

    turnstileToken: token,

    customer: {
      fullName:
        TEST_CUSTOMER_NAME,

      companyName:
        TEST_COMPANY,

      email:
        TEST_EMAIL,

      phone: "",

      destination:
        "Maldives",

      otherDestination: "",

      requiredDeliveryDate: "",

      message,

      consent: true,
    },

    items: [
      {
        productId:
          TEST_PRODUCT_ID,

        productSlug:
          TEST_PRODUCT_SLUG,

        quantity: 2,

        options: {
          material:
            "Test Material",

          size:
            "Test Size",

          finish:
            "Test Finish",

          customization:
            "Test Customization",
        },

        notes:
          TEST_PRODUCT_NOTES,
      },
    ],
  };
}

/* ==========================================
   AUTHENTICATED POST REQUEST
   ========================================== */

async function postQuotation(
  payload,
  key
) {
  const response = await fetch(
    API_URL,
    {
      method: "POST",

      headers: {
        Origin: API_ORIGIN,

        "Content-Type":
          "application/json",

        "Idempotency-Key":
          key,

        "x-bark-e2e-authorization":
          process.env
            .QUOTATION_E2E_AUTH_SECRET,
      },

      body: JSON.stringify(
        payload
      ),

      cache: "no-store",

      signal:
        AbortSignal.timeout(
          REQUEST_TIMEOUT_MS
        ),
    }
  );

  let body;

  try {
    body = await response.json();
  } catch {
    throw new Error(
      `API returned non-JSON HTTP ` +
      `${response.status}`
    );
  }

  return {
    status: response.status,
    body,
  };
}

/* ==========================================
   CHECK NO PREEXISTING TEST KEY

   Never delete a preexisting record.
   ========================================== */

async function verifyFreshKey() {
  const result = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM public.quotations
    WHERE idempotency_key_hash = $1
    `,
    [idempotencyHash]
  );

  assert(
    Number(result.rows[0].total) === 0,
    "Submission key is not already used"
  );
}

/* ==========================================
   TEST 1:
   CONCURRENT SAME-KEY REQUESTS

   Exactly one INSERT should commit.
   ========================================== */

async function testConcurrentSubmission() {
  info(
    "Submitting two simultaneous test enquiries..."
  );

  const payload =
    makePayload();

  const settled =
    await Promise.allSettled([
      postQuotation(
        payload,
        IDEMPOTENCY_KEY
      ),
      postQuotation(
        payload,
        IDEMPOTENCY_KEY
      ),
    ]);

  for (const result of settled) {
    if (
      result.status === "rejected"
    ) {
      throw new Error(
        "Concurrent request failed: " +
        (
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown error"
        )
      );
    }
  }

  const responses = settled.map(
    (result) => result.value
  );

  const statuses = responses
    .map((result) => result.status)
    .sort((a, b) => a - b);

  info(
    `Concurrent HTTP statuses: ` +
    statuses.join(", ")
  );

  assert(
    statuses[0] === 200 &&
      statuses[1] === 201,
    "Concurrent requests returned 200 and 201"
  );

  const references = responses.map(
    (result) =>
      result.body?.reference
  );

  assert(
    references.every(
      (reference) =>
        typeof reference === "string" &&
        reference.startsWith(
          "BOQ-TEST-"
        )
    ),
    "Both responses use a test reference"
  );

  assert(
    references[0] === references[1],
    "Concurrent requests share one reference"
  );

  assert(
    responses.some(
      (result) =>
        result.status === 201 &&
        result.body?.success === true &&
        result.body?.duplicate === false
    ) &&
    responses.some(
      (result) =>
        result.status === 200 &&
        result.body?.success === true &&
        result.body?.duplicate === true
    ),
    "Response flags identify new and duplicate"
  );

  return references[0];
}

/* ==========================================
   VERIFY DATABASE INSERTION
   ========================================== */

async function verifyStoredQuotation(
  expectedReference
) {
  const result = await pool.query(
    `
    SELECT
      q.id,
      q.quotation_reference,
      q.customer_name,
      q.company_name,
      q.email,
      q.customer_message,
      q.idempotency_key_hash,
      q.request_payload_hash,

      i.product_id,
      i.product_slug,
      i.product_name,
      i.category_slug,
      i.quantity,
      i.requested_material,
      i.requested_size,
      i.requested_finish,
      i.requested_customization,
      i.product_notes

    FROM public.quotations q

    JOIN public.quotation_items i
      ON i.quotation_id = q.id

    WHERE
      q.idempotency_key_hash = $1
      AND q.customer_message = $2
    `,
    [
      idempotencyHash,
      MESSAGE,
    ]
  );

  assert(
    result.rows.length === 1,
    "Exactly one stored quotation item exists"
  );

  const row = result.rows[0];

  assert(
    row.quotation_reference ===
      expectedReference &&
      row.customer_name ===
        TEST_CUSTOMER_NAME &&
      row.company_name ===
        TEST_COMPANY &&
      row.email ===
        TEST_EMAIL &&
      row.product_id ===
        TEST_PRODUCT_ID &&
      row.product_slug ===
        TEST_PRODUCT_SLUG &&
      row.product_name ===
        TEST_PRODUCT_NAME &&
      row.category_slug ===
        TEST_CATEGORY &&
      Number(row.quantity) === 2 &&
      row.requested_material ===
        "Test Material" &&
      row.requested_size ===
        "Test Size" &&
      row.requested_finish ===
        "Test Finish" &&
      row.requested_customization ===
        "Test Customization" &&
      row.product_notes ===
        TEST_PRODUCT_NOTES &&
      /^[0-9a-f]{64}$/.test(
        row.request_payload_hash
      ),
    "Stored customer and product match fixture"
  );

  return row.id;
}

/* ==========================================
   TEST 2:
   SAME KEY WITH CHANGED CONTENT
   ========================================== */

async function testContentConflict(
  reference
) {
  const response =
    await postQuotation(
      makePayload(
        CHANGED_MESSAGE
      ),
      IDEMPOTENCY_KEY
    );

  info(
    `Changed-content response: ` +
    `HTTP ${response.status}`
  );

  assert(
    response.status === 409 &&
      response.body?.code ===
        "IDEMPOTENCY_CONFLICT",
    "Changed content returned HTTP 409"
  );

  const result = await pool.query(
    `
    SELECT
      quotation_reference,
      customer_message
    FROM public.quotations
    WHERE idempotency_key_hash = $1
    `,
    [idempotencyHash]
  );

  assert(
    result.rows.length === 1 &&
      result.rows[0]
        .quotation_reference ===
        reference &&
      result.rows[0]
        .customer_message ===
        MESSAGE,
    "Original quotation was not modified"
  );
}

/* ==========================================
   TEST 3:
   NEW REQUEST WITHOUT TURNSTILE TOKEN

   This tests missing-token rejection
   locally in the verification helper.

   It does NOT establish that real,
   expired, or replayed production
   tokens are handled correctly.
   ========================================== */

async function testMissingTurnstile() {
  const newKey = randomUUID();

  const response =
    await postQuotation(
      makePayload(
        `${MESSAGE} NO TOKEN`,
        ""
      ),
      newKey
    );

  info(
    `Missing-token response: ` +
    `HTTP ${response.status}`
  );

  assert(
    response.status === 403 &&
      response.body?.code ===
        "BOT_VERIFICATION_FAILED",
    "New request without Turnstile returned 403"
  );
}

/* ==========================================
   TARGETED CLEANUP

   Delete only the exact test record
   created using this run's random
   idempotency key AND run marker.

   Foreign-key ON DELETE CASCADE removes
   its associated quotation items.

   Never delete by broad BOQ-TEST prefix.
   ========================================== */

async function cleanupTestRecord() {
  const client =
    await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      DELETE FROM public.quotations q
      WHERE
        q.idempotency_key_hash = $1
        AND q.customer_message = $2
        AND q.customer_name = $3
        AND q.company_name = $4
        AND q.email = $5
        AND q.quotation_reference
          LIKE 'BOQ-TEST-%'

        AND EXISTS (
          SELECT 1
          FROM public.quotation_items i
          WHERE i.quotation_id = q.id
            AND i.product_id = $6
            AND i.product_slug = $7
        )

      RETURNING q.id
      `,
      [
        idempotencyHash,
        MESSAGE,
        TEST_CUSTOMER_NAME,
        TEST_COMPANY,
        TEST_EMAIL,
        TEST_PRODUCT_ID,
        TEST_PRODUCT_SLUG,
      ]
    );

    if (result.rowCount > 1) {
      throw new Error(
        "Cleanup matched more than one quotation."
      );
    }

    await client.query("COMMIT");

    cleanupCompleted = true;

    info(
      `Test records deleted: ` +
      `${result.rowCount}`
    );
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch {
      // Preserve original cleanup error.
    }

    throw error;
  } finally {
    client.release();
  }
}

/* ==========================================
   CHECK DATABASE COUNTS RESTORED
   ========================================== */

async function verifyCleanupCounts() {
  const after =
    await readCounts();

  assert(
    after.quotations ===
      initialCounts.quotations &&
    after.items ===
      initialCounts.items,
    "Database counts restored to baseline"
  );

  const keyResult =
    await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM public.quotations
      WHERE idempotency_key_hash = $1
      `,
      [idempotencyHash]
    );

  assert(
    Number(
      keyResult.rows[0].total
    ) === 0,
    "Test submission key no longer exists"
  );
}

/* ==========================================
   MAIN
   ========================================== */

async function main() {
  console.log(
    "\n======================================"
  );

  console.log(
    "BARK ORNAMENT - FILE 34 E2E TESTS"
  );

  console.log(
    "======================================\n"
  );

  verifySafetyConfiguration();

  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL,
    ssl: false,
    max: 3,
    connectionTimeoutMillis: 5000,
  });

  let failure = null;
  let baselineReady = false;

  try {
    await pool.query(
      "SELECT 1"
    );

    pass(
      "PostgreSQL connection established"
    );

    initialCounts =
      await readCounts();

    baselineReady = true;

    info(
      `Initial quotations: ` +
      initialCounts.quotations
    );

    info(
      `Initial items: ` +
      initialCounts.items
    );

    calculateHashes();

    await verifyFreshKey();

    await verifyRateLimitCapacity();

    const reference =
      await testConcurrentSubmission();

    await verifyStoredQuotation(
      reference
    );

    await testContentConflict(
      reference
    );

    await testMissingTurnstile();

    pass(
      "Controlled API tests completed"
    );
  } catch (error) {
    failure = error;

    console.error(
      "\nTEST FAILED:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );
  } finally {
    /*
     * Cleanup is attempted even when a
     * test fails after writing records.
     */

    if (baselineReady) {
      try {
        await cleanupTestRecord();

        await verifyCleanupCounts();
      } catch (error) {
        failure ??= error;

        console.error(
          "CLEANUP ERROR:",
          error instanceof Error
            ? error.message
            : "Unknown cleanup error"
        );
      }
    }

    await pool.end();
  }

  console.log(
    "\n======================================"
  );

  if (failure) {
    console.error(
      "FILE 34 RESULT: FAILED"
    );

    if (!cleanupCompleted) {
      console.error(
        "Cleanup was not confirmed. " +
        "Inspect the synthetic test record " +
        "in pgAdmin before proceeding."
      );
    }

    process.exitCode = 1;
  } else {
    console.log(
      "FILE 34 RESULT: PASSED"
    );

    console.log(
      "Only synthetic test data was used."
    );

    console.log(
      "Quotation cleanup was confirmed."
    );
  }

  console.log(
    "======================================\n"
  );
}

main().catch((error) => {
  console.error(
    "Test runner could not complete:",
    error instanceof Error
      ? error.message
      : "Unknown error"
  );

  process.exitCode = 1;
});
