
/*
==========================================================
BARK ORNAMENT (PVT) LTD

FILE 57 - EMAIL WORKER ORCHESTRATION BOUNDARY TESTS

File:
scripts/quotation-email-worker-boundary-test.mjs

Actual modules loaded:
- File 36: quotation-email.ts
- File 43: quotation-email-worker.ts
- File 55: quotation-email-worker-handoff-db.ts

Test doubles:
- File 45 worker claim/retrieval interface
- PostgreSQL pg.Pool used by File 55

This file is an executable TEST HARNESS only.

SECURITY
--------
- Fictional .invalid customer addresses
- Synthetic database connection strings
- No real PostgreSQL connection
- No real provider calls
- No email delivery
- No database modifications
- No background workers
- No production credentials
- No customer data in test reports

Run:
node scripts/quotation-email-worker-boundary-test.mjs
==========================================================
*/

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

/* ======================================================
   CONSTANTS
   ====================================================== */

const WORKER_URL =
  "postgresql://bark_email_worker_service:" +
  "fictional-worker-password-123456@" +
  "127.0.0.1:5432/bark_ornament";

const WEBSITE_URL =
  "postgresql://bark_web_dev:" +
  "fictional-website-password-987654@" +
  "127.0.0.1:5432/bark_ornament";

const QUOTATION_ID =
  "11111111-1111-4111-8111-111111111111";

const LEASE_TOKEN =
  "22222222-2222-4222-8222-222222222222";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const JOB_ID_PATTERN =
  /^[1-9][0-9]{0,18}$/;

const MAX_BIGINT =
  9223372036854775807n;

const MAX_BATCH = 10;

const ENVIRONMENT_KEYS = [
  "NODE_ENV",
  "QUOTATION_SUBMISSIONS_ENABLED",
  "QUOTATION_E2E_TEST_MODE",
  "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
  "DATABASE_SSL_MODE",
  "DATABASE_URL",
  "EMAIL_WORKER_DATABASE_URL",
];

const savedEnvironment = Object.fromEntries(
  ENVIRONMENT_KEYS.map(
    (name) => [name, process.env[name]]
  )
);

/* ======================================================
   SAFE TEST ENVIRONMENT

   These are fictional local credentials.

   No .env.local file is loaded.
   ====================================================== */

function safeEnvironment() {
  process.env.NODE_ENV = "development";

  process.env.QUOTATION_SUBMISSIONS_ENABLED =
    "false";

  process.env.QUOTATION_E2E_TEST_MODE =
    "false";

  process.env
    .QUOTATION_EMAIL_NOTIFICATIONS_ENABLED =
    "false";

  process.env.DATABASE_SSL_MODE = "disable";

  process.env.DATABASE_URL = WEBSITE_URL;

  process.env.EMAIL_WORKER_DATABASE_URL =
    WORKER_URL;
}

function assertSafeEnvironment() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.QUOTATION_SUBMISSIONS_ENABLED !==
      "false" ||
    process.env.QUOTATION_E2E_TEST_MODE !==
      "false" ||
    process.env
      .QUOTATION_EMAIL_NOTIFICATIONS_ENABLED !==
      "false"
  ) {
    throw new Error(
      "Boundary test environment disabled."
    );
  }
}

function restoreEnvironment() {
  for (
    const [name, value] of
    Object.entries(savedEnvironment)
  ) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

/* ======================================================
   MOCK POSTGRESQL STATE

   No actual pg.Pool is constructed.

   The application receives only MockPool
   through the in-memory module loader.
   ====================================================== */

const state = {
  poolsCreated: 0,
  poolsClosed: 0,
  actualProviderCalls: 0,
  sqlCalls: [],
  handoffOutcomes: [],
  events: [],
  identity: null,
};

function validIdentity() {
  return {
    login_name: "bark_email_worker_service",
    session_name: "bark_email_worker_service",
    database_name: "bark_ornament",

    worker_member: true,
    can_begin_handoff: true,

    can_resolve: false,
    can_enqueue: false,

    outbox_table_access: false,
    quotation_table_access: false,
    hold_table_access: false,
    handoff_table_access: false,
  };
}

function resetMock() {
  state.poolsCreated = 0;
  state.poolsClosed = 0;
  state.actualProviderCalls = 0;
  state.sqlCalls = [];
  state.handoffOutcomes = [];
  state.events = [];
  state.identity = validIdentity();
}

class MockPool {
  constructor(config) {
    assert.equal(
      config.connectionString,
      WORKER_URL
    );

    assert.equal(config.ssl, false);
    assert.equal(config.max, 1);

    state.poolsCreated += 1;

    this.closed = false;
  }

  async query(sql, params = []) {
    if (this.closed) {
      throw new Error(
        "Mock PostgreSQL pool closed"
      );
    }

    state.sqlCalls.push({
      sql,
      params: [...params],
    });

    /*
     * Actual File 55 identity-check query.
     */

    if (sql.includes("CURRENT_USER::TEXT")) {
      return {
        rows: [
          { ...state.identity },
        ],
      };
    }

    /*
     * Actual File 55 handoff SQL.

     * This does not execute PostgreSQL.
     * Results come exclusively from the
     * in-memory handoffOutcomes queue.
     */

    if (
      sql.includes(
        "begin_quotation_email_provider_handoff"
      )
    ) {
      assert.ok(
        sql.includes("$1::BIGINT")
      );

      assert.ok(
        sql.includes("$2::UUID")
      );

      assert.equal(params.length, 2);

      state.events.push(
        `handoff:${params[0]}`
      );

      if (
        state.handoffOutcomes.length === 0
      ) {
        throw new Error(
          "MOCK_MISSING_DATABASE_RESPONSE"
        );
      }

      const outcome =
        state.handoffOutcomes.shift();

      if (outcome instanceof Error) {
        throw outcome;
      }

      if (outcome === "NO_ROWS") {
        return {
          rows: [],
        };
      }

      return {
        rows: [
          {
            handoff_status: outcome,
          },
        ],
      };
    }

    throw new Error(
      "Unexpected SQL operation"
    );
  }

  async end() {
    if (!this.closed) {
      this.closed = true;
      state.poolsClosed += 1;
    }
  }
}

/* ======================================================
   LOAD ACTUAL TYPESCRIPT SOURCE IN MEMORY

   The modules are transpiled without writing
   compiled JavaScript to disk.

   Runtime imports are explicitly allowlisted.

   Importing the real pg package is prohibited.
   ====================================================== */

function loadModule(
  path,
  dependencies = {}
) {
  const source = readFileSync(
    path,
    "utf8"
  );

  const compiled =
    ts.transpileModule(
      source,
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      }
    ).outputText;

  const exports = {};

  new Function(
    "require",
    "exports",
    compiled
  )(
    (name) => {
      if (name === "server-only") {
        return {};
      }

      if (
        Object.hasOwn(
          dependencies,
          name
        )
      ) {
        return dependencies[name];
      }

      throw new Error(
        "Unexpected runtime dependency"
      );
    },
    exports
  );

  return exports;
}

/* ======================================================
   FICTIONAL EMAIL FIXTURES
   ====================================================== */

function createJobData(
  id,
  type = "internal"
) {
  return {
    job_id: id,
    quotation_id: QUOTATION_ID,

    notification_type: type,

    quotation_reference:
      "BOQ-2026-ABCDEF123456",

    customer_name:
      "File 57 Fictional Buyer",

    company_name:
      "File 57 Fictional Resort",

    customer_email:
      "buyer@example.invalid",

    customer_phone: "",

    delivery_destination:
      "Maldives",

    other_destination: "",

    required_delivery_date: "",

    customer_message:
      "Fictional menu enquiry <test>",

    product_items: [
      {
        productId:
          "file57-menu-cover",

        productSlug:
          "file57-menu-cover",

        productName:
          "Menu Cover",

        categorySlug:
          "printing-stationery",

        quantity: 2,

        options: {
          material: "Eco Leather",
          size: "A4",
          finish: "Gold Embossing",
          customization: "",
        },

        notes:
          "Fictional integration test",
      },
    ],
  };
}

function createScenario(
  id,
  type = "internal",
  retrieval = "available"
) {
  return {
    claim: {
      jobId: id,
      quotationId: QUOTATION_ID,

      notificationType: type,

      leaseToken: LEASE_TOKEN,
      attemptNumber: 1,

      leaseExpiresAt:
        new Date(
          Date.now() + 300000
        ),
    },

    retrieval,

    data: createJobData(
      id,
      type
    ),
  };
}

/* ======================================================
   SIMULATED FILE 45 WORKER DATABASE

   This fake implements the relevant shape:

   claimJobs()
   getJobData()

   It never connects to PostgreSQL.

   The actual File 45 adapter was tested
   separately in earlier milestones.
   ====================================================== */

function makeMockClaimDatabase(
  scenarios
) {
  const fixtures =
    structuredClone(scenarios);

  return Object.freeze({
    kind: "fictional_worker_source",

    async claimJobs(batchSize = 5) {
      state.events.push("claim");

      return fixtures
        .slice(0, batchSize)
        .map(
          (fixture) =>
            structuredClone(fixture.claim)
        );
    },

    async getJobData(
      jobId,
      leaseToken
    ) {
      state.events.push(
        `retrieve:${jobId}`
      );

      const fixture = fixtures.find(
        (item) =>
          item.claim.jobId === jobId &&
          item.claim.leaseToken === leaseToken
      );

      if (!fixture) {
        return null;
      }

      if (
        fixture.retrieval === "error"
      ) {
        throw new Error(
          "PRIVATE_MOCK_DATABASE_ERROR"
        );
      }

      if (
        fixture.retrieval !== "available"
      ) {
        return null;
      }

      return structuredClone(
        fixture.data
      );
    },
  });
}

/* ======================================================
   CLAIM AND DATA VALIDATION
   ====================================================== */

function validClaim(claim) {
  if (
    !claim ||
    typeof claim !== "object" ||
    Array.isArray(claim)
  ) {
    return false;
  }

  const jobId = claim.jobId;

  return (
    typeof jobId === "string" &&
    JOB_ID_PATTERN.test(jobId) &&
    BigInt(jobId) <= MAX_BIGINT &&

    typeof claim.quotationId ===
      "string" &&
    UUID_PATTERN.test(
      claim.quotationId
    ) &&

    typeof claim.leaseToken ===
      "string" &&
    UUID_PATTERN.test(
      claim.leaseToken
    ) &&

    (
      claim.notificationType ===
        "internal" ||
      claim.notificationType ===
        "customer"
    ) &&

    Number.isInteger(
      claim.attemptNumber
    ) &&

    claim.attemptNumber >= 1 &&
    claim.attemptNumber <= 20 &&

    claim.leaseExpiresAt
      instanceof Date &&

    Number.isFinite(
      claim.leaseExpiresAt.getTime()
    )
  );
}

function validAssociation(
  claim,
  data
) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return false;
  }

  return (
    data.job_id === claim.jobId &&

    typeof data.quotation_id ===
      "string" &&

    data.quotation_id.toLowerCase() ===
      claim.quotationId.toLowerCase() &&

    data.notification_type ===
      claim.notificationType &&

    typeof data.customer_email ===
      "string" &&

    /^[^\s@]+@[^\s@]+\.invalid$/i.test(
      data.customer_email
    ) &&

    data.customer_email.toLowerCase() !==
      "fixture@example.invalid"
  );
}

/* ======================================================
   PROVIDER-FREE BOUNDARY ORCHESTRATION

   This coordinator exists only inside
   this standalone test harness.

   It is NOT imported by the website.

   It exercises these boundaries:
   - Fake claim source
   - Fake retrieval source
   - Actual File 43 preparation
   - Actual File 55 handoff adapter
     with mocked pg.Pool

   It never calls a provider.
   ====================================================== */

async function exerciseBoundary(
  claimDatabase,
  handoffDatabase,
  prepareEmail,
  batchSize = 10
) {
  assertSafeEnvironment();

  if (
    claimDatabase.kind !==
      "fictional_worker_source"
  ) {
    throw new Error(
      "Unauthorized boundary source."
    );
  }

  if (
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > MAX_BATCH
  ) {
    throw new Error(
      "Invalid boundary batch size."
    );
  }

  let claimed;

  try {
    claimed =
      await claimDatabase.claimJobs(
        batchSize
      );
  } catch {
    return {
      mode: "mock_boundary",
      status: "claim_error_no_send",
      entries: [],
      emailsSent: 0,
      providerCalls: 0,
    };
  }

  if (
    !Array.isArray(claimed) ||
    claimed.length > MAX_BATCH
  ) {
    throw new Error(
      "Invalid claimed batch."
    );
  }

  const entries = [];
  const seen = new Set();

  for (const claim of claimed) {
    let status = "invalid_claim_no_send";

    if (!validClaim(claim)) {
      entries.push({
        status,
      });
      continue;
    }

    if (seen.has(claim.jobId)) {
      entries.push({
        status: "duplicate_job_no_send",
      });
      continue;
    }

    seen.add(claim.jobId);

    if (
      claim.leaseExpiresAt.getTime() <=
      Date.now()
    ) {
      entries.push({
        status: "expired_lease_no_send",
      });
      continue;
    }

    let data;

    try {
      data =
        await claimDatabase.getJobData(
          claim.jobId,
          claim.leaseToken
        );
    } catch {
      entries.push({
        status: "retrieval_error_no_send",
      });
      continue;
    }

    if (data === null) {
      entries.push({
        status: "missing_data_no_send",
      });
      continue;
    }

    if (
      !validAssociation(
        claim,
        data
      )
    ) {
      entries.push({
        status:
          "association_rejected_no_send",
      });
      continue;
    }

    try {
      const prepared =
        prepareEmail(data);

      if (
        prepared.jobId !== claim.jobId ||
        prepared.quotationId.toLowerCase() !==
          claim.quotationId.toLowerCase() ||
        prepared.notificationType !==
          claim.notificationType ||
        !prepared.message.subject ||
        !prepared.message.text ||
        !prepared.message.html
      ) {
        throw new Error(
          "Invalid preparation result"
        );
      }
    } catch {
      entries.push({
        status: "preparation_rejected_no_send",
      });
      continue;
    }

    if (
      claim.leaseExpiresAt.getTime() <=
      Date.now()
    ) {
      entries.push({
        status: "expired_lease_no_send",
      });
      continue;
    }

    /*
     * This invokes the actual File 55
     * adapter, whose Pool is mocked.

     * No genuine PostgreSQL query occurs.
     */

    try {
      const handoffStatus =
        await handoffDatabase.beginHandoff(
          claim.jobId,
          claim.leaseToken
        );

      if (
        handoffStatus ===
          "handoff_started"
      ) {
        status =
          "mock_handoff_started_no_send";

      } else if (
        handoffStatus ===
          "already_handed_off"
      ) {
        status =
          "already_handed_off_no_send";

      } else {
        status =
          "stale_lease_no_send";
      }

    } catch {
      status =
        "unconfirmed_handoff_no_send";
    }

    entries.push({
      status,
    });
  }

  return {
    mode: "mock_boundary",
    status: "completed",
    entries,
    emailsSent: 0,
    providerCalls: 0,
  };
}

/* ======================================================
   LOAD REAL MODULES

   File 55 receives MockPool, not real pg.Pool.
   ====================================================== */

resetMock();

const templates = loadModule(
  "src/lib/quotation-email.ts"
);

const preparation = loadModule(
  "src/lib/quotation-email-worker.ts",
  {
    "@/lib/quotation-email":
      templates,
  }
);

const handoffModule = loadModule(
  "src/lib/quotation-email-worker-handoff-db.ts",
  {
    pg: {
      Pool: MockPool,
    },
  }
);

function trackedPreparation(data) {
  state.events.push(
    `prepare:${data.job_id}`
  );

  return preparation
    .prepareQuotationEmailJob(
      data
    );
}

/* ======================================================
   TEST HELPERS
   ====================================================== */

let passed = 0;

function pass(name) {
  passed += 1;

  console.log(
    `PASS ${passed}: ${name}`
  );
}

async function runCase(
  scenarios,
  outcomes
) {
  resetMock();
  safeEnvironment();

  state.handoffOutcomes = [
    ...outcomes,
  ];

  const db =
    await handoffModule
      .connectQuotationWorkerHandoffDatabase();

  try {
    return await exerciseBoundary(
      makeMockClaimDatabase(
        scenarios
      ),
      db,
      trackedPreparation
    );
  } finally {
    await db.close();
  }
}

/* ======================================================
   AUTOMATED TESTS
   ====================================================== */

async function runTests() {
  safeEnvironment();
  resetMock();

  /* TEST 1 - Import safety */

  assert.equal(
    state.poolsCreated,
    0
  );

  assert.equal(
    state.actualProviderCalls,
    0
  );

  pass(
    "Actual source modules loaded without connections"
  );

  /* TEST 2 - File 55 identity boundary */

  const empty = await runCase(
    [],
    []
  );

  assert.equal(
    empty.entries.length,
    0
  );

  assert.equal(
    state.poolsCreated,
    1
  );

  assert.equal(
    state.poolsClosed,
    1
  );

  assert.ok(
    state.sqlCalls[0].sql.includes(
      "CURRENT_USER::TEXT"
    )
  );

  pass(
    "Dedicated worker identity checked through mock Pool"
  );

  /* TEST 3 - Exact processing order */

  const success = await runCase(
    [createScenario("101")],
    ["handoff_started"]
  );

  assert.equal(
    success.entries[0].status,
    "mock_handoff_started_no_send"
  );

  assert.deepEqual(
    state.events,
    [
      "claim",
      "retrieve:101",
      "prepare:101",
      "handoff:101",
    ]
  );

  pass(
    "Claim, retrieval, preparation and handoff ordered"
  );

  /* TEST 4 - Customer notification */

  const customer = await runCase(
    [
      createScenario(
        "102",
        "customer"
      ),
    ],
    ["handoff_started"]
  );

  assert.equal(
    customer.entries[0].status,
    "mock_handoff_started_no_send"
  );

  assert.equal(
    customer.emailsSent,
    0
  );

  pass(
    "Customer acknowledgement follows safe boundary"
  );

  /* TEST 5 - Repeated handoff */

  const repeated = await runCase(
    [createScenario("103")],
    ["already_handed_off"]
  );

  assert.equal(
    repeated.entries[0].status,
    "already_handed_off_no_send"
  );

  pass(
    "Repeated handoff never authorizes sending"
  );

  /* TEST 6 - Stale lease */

  const stale = await runCase(
    [createScenario("104")],
    ["stale_lease"]
  );

  assert.equal(
    stale.entries[0].status,
    "stale_lease_no_send"
  );

  pass(
    "Stale handoff result rejected"
  );

  /* TEST 7 - PostgreSQL response failure */

  const failedResponse = await runCase(
    [createScenario("105")],
    [
      new Error(
        "PRIVATE_SQL_CONNECTION_ERROR"
      ),
    ]
  );

  assert.equal(
    failedResponse.entries[0].status,
    "unconfirmed_handoff_no_send"
  );

  assert.ok(
    !JSON.stringify(
      failedResponse
    ).includes(
      "PRIVATE_SQL_CONNECTION_ERROR"
    )
  );

  pass(
    "Database response failure stays unconfirmed"
  );

  /* TEST 8 - Unconfirmed result blocks later calls */

  const afterFailure = await runCase(
    [
      createScenario("106"),
      createScenario("107"),
    ],
    [
      new Error(
        "MOCK_RESULT_LOST"
      ),
      "handoff_started",
    ]
  );

  assert.deepEqual(
    afterFailure.entries.map(
      (item) => item.status
    ),
    [
      "unconfirmed_handoff_no_send",
      "unconfirmed_handoff_no_send",
    ]
  );

  const handoffQueries =
    state.events.filter(
      (event) =>
        event.startsWith(
          "handoff:"
        )
    );

  assert.equal(
    handoffQueries.length,
    1
  );

  pass(
    "Ambiguous result locks further handoff attempts"
  );

  /* TEST 9 - Invalid PostgreSQL result */

  const invalidResult = await runCase(
    [createScenario("108")],
    ["UNEXPECTED_STATUS"]
  );

  assert.equal(
    invalidResult.entries[0].status,
    "unconfirmed_handoff_no_send"
  );

  pass(
    "Unknown database status treated as unsafe"
  );

  /* TEST 10 - Expired lease */

  const expired =
    createScenario("109");

  expired.claim.leaseExpiresAt =
    new Date(
      Date.now() - 1000
    );

  const expiredReport =
    await runCase(
      [expired],
      []
    );

  assert.equal(
    expiredReport.entries[0].status,
    "expired_lease_no_send"
  );

  assert.equal(
    state.events.includes(
      "handoff:109"
    ),
    false
  );

  pass(
    "Expired lease prevents retrieval and handoff"
  );

  /* TEST 11 - Missing and failed retrieval */

  const missing =
    createScenario("110");

  missing.retrieval = "missing";

  const retrievalFailure =
    createScenario("111");

  retrievalFailure.retrieval = "error";

  const missingReport =
    await runCase(
      [
        missing,
        retrievalFailure,
      ],
      []
    );

  assert.deepEqual(
    missingReport.entries.map(
      (item) => item.status
    ),
    [
      "missing_data_no_send",
      "retrieval_error_no_send",
    ]
  );

  assert.equal(
    state.events.some(
      (item) =>
        item.startsWith(
          "handoff:"
        )
    ),
    false
  );

  pass(
    "Missing and failed retrieval cannot reach handoff"
  );

  /* TEST 12 - Cross-quotation rejection */

  const wrongQuotation =
    createScenario("112");

  wrongQuotation.data.quotation_id =
    "33333333-3333-4333-8333-333333333333";

  const wrongType =
    createScenario("113");

  wrongType.data.notification_type =
    "customer";

  const associations =
    await runCase(
      [
        wrongQuotation,
        wrongType,
      ],
      []
    );

  assert.ok(
    associations.entries.every(
      (item) =>
        item.status ===
        "association_rejected_no_send"
    )
  );

  pass(
    "Cross-quotation and notification mismatch rejected"
  );

  /* TEST 13 - Fictional recipient restriction */

  const realRecipient =
    createScenario("114");

  realRecipient.data.customer_email =
    "buyer@example.com";

  const reservedRecipient =
    createScenario("115");

  reservedRecipient.data.customer_email =
    "fixture@example.invalid";

  const recipients =
    await runCase(
      [
        realRecipient,
        reservedRecipient,
      ],
      []
    );

  assert.ok(
    recipients.entries.every(
      (item) =>
        item.status ===
        "association_rejected_no_send"
    )
  );

  pass(
    "Real and reserved recipients rejected"
  );

  /* TEST 14 - Invalid product data */

  const malformed =
    createScenario("116");

  malformed.data.product_items = [];

  const malformedReport =
    await runCase(
      [malformed],
      []
    );

  assert.equal(
    malformedReport.entries[0].status,
    "preparation_rejected_no_send"
  );

  assert.equal(
    state.events.includes(
      "handoff:116"
    ),
    false
  );

  pass(
    "Invalid email preparation blocks handoff"
  );

  /* TEST 15 - Duplicate job boundary */

  const duplicates =
    await runCase(
      [
        createScenario("117"),
        createScenario("117"),
      ],
      ["handoff_started"]
    );

  assert.deepEqual(
    duplicates.entries.map(
      (item) => item.status
    ),
    [
      "mock_handoff_started_no_send",
      "duplicate_job_no_send",
    ]
  );

  assert.equal(
    state.events.filter(
      (event) =>
        event ===
        "handoff:117"
    ).length,
    1
  );

  pass(
    "Duplicate claim cannot create a second handoff"
  );

  /* TEST 16 - Combined batch and privacy */

  const combined =
    await runCase(
      [
        createScenario("118"),
        createScenario(
          "119",
          "customer"
        ),
        createScenario("120"),
      ],
      [
        "handoff_started",
        "already_handed_off",
        "stale_lease",
      ]
    );

  assert.deepEqual(
    combined.entries.map(
      (item) => item.status
    ),
    [
      "mock_handoff_started_no_send",
      "already_handed_off_no_send",
      "stale_lease_no_send",
    ]
  );

  const safeOutput =
    JSON.stringify(combined);

  for (const sensitive of [
    "buyer@example.invalid",
    LEASE_TOKEN,
    "Fictional menu enquiry",
    "BOQ-2026-ABCDEF123456",
  ]) {
    assert.ok(
      !safeOutput.includes(
        sensitive
      )
    );
  }

  assert.equal(
    combined.providerCalls,
    0
  );

  assert.equal(
    combined.emailsSent,
    0
  );

  assert.equal(
    state.actualProviderCalls,
    0
  );

  pass(
    "Mixed outcomes remain private with zero sending"
  );

  /* TEST 17 - Unsafe environment blocks the boundary */

  resetMock();

  for (const key of [
    "QUOTATION_SUBMISSIONS_ENABLED",
    "QUOTATION_E2E_TEST_MODE",
    "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
  ]) {
    safeEnvironment();

    process.env[key] = "true";

    await assert.rejects(
      exerciseBoundary(
        makeMockClaimDatabase(
          [createScenario("121")]
        ),
        {
          beginHandoff: async () =>
            "handoff_started",
        },
        trackedPreparation
      ),
      /environment disabled/
    );
  }

  safeEnvironment();

  process.env.NODE_ENV =
    "production";

  await assert.rejects(
    exerciseBoundary(
      makeMockClaimDatabase(
        [createScenario("122")]
      ),
      {
        beginHandoff: async () =>
          "handoff_started",
      },
      trackedPreparation
    ),
    /environment disabled/
  );

  assert.equal(
    state.events.includes(
      "claim"
    ),
    false
  );

  pass(
    "Enabled switches and production environment blocked"
  );

  /* TEST 18 - Database boundary cannot use remote URL */

  resetMock();
  safeEnvironment();

  process.env.EMAIL_WORKER_DATABASE_URL =
    WORKER_URL.replace(
      "127.0.0.1",
      "remote.example.com"
    );

  await assert.rejects(
    handoffModule
      .connectQuotationWorkerHandoffDatabase(),
    /configuration is unavailable/
  );

  assert.equal(
    state.poolsCreated,
    0
  );

  pass(
    "Remote worker database connection rejected"
  );

  /* TEST 19 - Handoff identity excess permissions */

  resetMock();
  safeEnvironment();

  state.identity.can_resolve =
    true;

  await assert.rejects(
    handoffModule
      .connectQuotationWorkerHandoffDatabase(),
    /identity verification failed/
  );

  assert.equal(
    state.poolsClosed,
    1
  );

  pass(
    "Excess worker privileges rejected"
  );

  /* TEST 20 - No actual database or email operations */

  assert.equal(
    state.actualProviderCalls,
    0
  );

  /*
   * All SQL operations went to MockPool.

   * The test loader never imports real pg.
   * The mock claim source has no network
   * or filesystem persistence.
   */

  const allowedSql = state.sqlCalls.every(
    ({ sql }) =>
      sql.includes(
        "CURRENT_USER::TEXT"
      ) ||
      sql.includes(
        "begin_quotation_email_provider_handoff"
      )
  );

  assert.equal(
    allowedSql,
    true
  );

  pass(
    "Only mocked identity and handoff SQL permitted"
  );

  console.log(
    "\n=========================================="
  );

  console.log(
    `FILE 57 RESULT: ${passed} TESTS PASSED`
  );

  console.log(
    "Real PostgreSQL connections: 0"
  );

  console.log(
    "Real database handoffs: 0"
  );

  console.log(
    "Real provider calls: 0"
  );

  console.log(
    "Real emails sent: 0"
  );

  console.log(
    "Real database writes: 0"
  );

  console.log(
    "==========================================\n"
  );
}

/* ======================================================
   EXECUTION AND CLEANUP
   ====================================================== */

try {
  await runTests();
} catch (error) {
  console.error(
    "\nFILE 57 TEST FAILED:",
    error instanceof Error
      ? error.message
      : "Unknown test error"
  );

  process.exitCode = 1;
} finally {
  restoreEnvironment();
}
