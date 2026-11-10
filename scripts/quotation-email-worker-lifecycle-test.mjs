
/*
=========================================================
BARK ORNAMENT (PVT) LTD

FILE 47 - MOCKED EMAIL WORKER LIFECYCLE TESTS

scripts/quotation-email-worker-lifecycle-test.mjs

Loads actual source modules:
- File 36: quotation-email.ts
- File 43: quotation-email-worker.ts
- File 45: quotation-email-worker-db.ts
- File 46: quotation-email-worker-runner.ts

All PostgreSQL operations are simulated.

SAFETY:
- No actual PostgreSQL connection
- No SMTP or email API
- No email delivery
- No customer records
- No database writes
- No application files modified
- No real secrets required

This is a local test harness, not a worker service.
=========================================================
*/

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import ts from "typescript";

/* ==========================================
   TEST CONSTANTS
   ========================================== */

const REFERENCE = "BOQ-2026-ABCDEF123456";

const QUOTATION_ID =
  "11111111-1111-4111-8111-111111111111";

const WEBSITE_URL =
  "postgresql://bark_web_dev:fictional-website-password-123456@127.0.0.1:5432/bark_ornament";

const WORKER_URL =
  "postgresql://bark_email_worker_service:fictional-worker-password-123456@127.0.0.1:5432/bark_ornament";

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  QUOTATION_SUBMISSIONS_ENABLED:
    process.env.QUOTATION_SUBMISSIONS_ENABLED,
  QUOTATION_E2E_TEST_MODE:
    process.env.QUOTATION_E2E_TEST_MODE,
  QUOTATION_EMAIL_NOTIFICATIONS_ENABLED:
    process.env.QUOTATION_EMAIL_NOTIFICATIONS_ENABLED,
  DATABASE_SSL_MODE:
    process.env.DATABASE_SSL_MODE,
  DATABASE_URL:
    process.env.DATABASE_URL,
  EMAIL_WORKER_DATABASE_URL:
    process.env.EMAIL_WORKER_DATABASE_URL,
};

let assertionsPassed = 0;
let databaseConnections = 0;
let actualProviderCalls = 0;

/* ==========================================
   TEST REPORTING
   ========================================== */

function pass(message) {
  assertionsPassed += 1;
  console.log(
    `PASS ${assertionsPassed}: ${message}`
  );
}

function configureSafeEnvironment() {
  process.env.NODE_ENV = "development";

  process.env.QUOTATION_SUBMISSIONS_ENABLED =
    "false";

  process.env.QUOTATION_E2E_TEST_MODE =
    "false";

  process.env
    .QUOTATION_EMAIL_NOTIFICATIONS_ENABLED =
    "false";

  process.env.DATABASE_SSL_MODE =
    "disable";

  process.env.DATABASE_URL =
    WEBSITE_URL;

  process.env.EMAIL_WORKER_DATABASE_URL =
    WORKER_URL;
}

function restoreEnvironment() {
  for (const [key, value] of Object.entries(
    originalEnvironment
  )) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

/* ==========================================
   IN-MEMORY QUOTATION FIXTURE
   ========================================== */

function makeQuotationData(
  type = "internal"
) {
  return {
    job_id: "101",
    quotation_id: QUOTATION_ID,
    notification_type: type,
    quotation_reference: REFERENCE,
    customer_name: "Fictional Buyer",
    company_name: "Fictional Resort",
    customer_email: "buyer@example.invalid",
    customer_phone: "",
    delivery_destination: "Maldives",
    other_destination: "",
    required_delivery_date: "",
    customer_message:
      "Fictional menu requirements <test>",
    product_items: [
      {
        productId: "mock-menu-001",
        productSlug: "mock-menu-001",
        productName: "Menu <Cover>",
        categorySlug:
          "printing-stationery",
        quantity: 2,
        options: {
          material: "Eco Leather",
          size: "A4",
          finish: "Gold Embossing",
          customization: "",
        },
        notes: "Synthetic integration test",
      },
    ],
  };
}

function createJob(
  id,
  type = "internal",
  data = makeQuotationData(type)
) {
  return {
    id: String(id),
    quotationId: QUOTATION_ID,
    type,
    status: "pending",
    attempts: 0,
    leaseToken: null,
    leaseExpiresAt: null,
    nextAttemptAt: 0,
    providerMessageId: null,
    errorCode: null,
    data: {
      ...structuredClone(data),
      job_id: String(id),
      notification_type: type,
    },
  };
}

const state = {
  jobs: [],
  queryLog: [],
  roleAuthorized: true,
  closedPools: 0,
};

function resetState(jobs = []) {
  state.jobs = jobs;
  state.queryLog = [];
  state.roleAuthorized = true;
  state.closedPools = 0;
}

function findJob(id) {
  return state.jobs.find(
    (job) => job.id === String(id)
  );
}

function activeLease(job, token) {
  return Boolean(
    job &&
    job.status === "processing" &&
    job.leaseToken === token &&
    job.leaseExpiresAt > Date.now()
  );
}

/* ==========================================
   MOCK POSTGRESQL POOL

   Important: this class replaces pg.Pool
   entirely during module loading.

   No real PostgreSQL connections are made.
   ========================================== */

class MockPool {
  constructor(configuration) {
    assert.equal(
      configuration.max,
      2
    );

    databaseConnections += 1;
    this.closed = false;
  }

  async query(sql, parameters = []) {
    if (this.closed) {
      throw new Error(
        "Mock connection already closed"
      );
    }

    state.queryLog.push({
      sql,
      parameters,
    });

    /* Worker identity verification. */

    if (sql.includes("CURRENT_USER")) {
      return {
        rows: [
          {
            login_name:
              "bark_email_worker_service",
            session_name:
              "bark_email_worker_service",
            database_name:
              "bark_ornament",
            can_claim: true,
            can_retrieve: true,
            can_complete: true,
            can_fail: true,
            can_enqueue: false,
            can_read_quotations:
              !state.roleAuthorized,
            can_read_items: false,
            can_read_outbox: false,
            can_write_outbox: false,
            can_create_objects: false,
            is_website_member: false,
          },
        ],
      };
    }

    /* File 40: claim due jobs. */

    if (
      sql.includes(
        "claim_quotation_email_jobs"
      )
    ) {
      const limit = Number(
        parameters[0]
      );

      const due = state.jobs
        .filter(
          (job) =>
            (
              job.status === "pending" &&
              job.nextAttemptAt <= Date.now()
            ) ||
            (
              job.status === "processing" &&
              job.leaseExpiresAt <= Date.now()
            )
        )
        .filter(
          (job) => job.attempts < 20
        )
        .slice(0, limit);

      return {
        rows: due.map((job) => {
          job.status = "processing";
          job.attempts += 1;
          job.leaseToken = randomUUID();
          job.leaseExpiresAt =
            Date.now() + 300000;

          return {
            job_id: job.id,
            quotation_id:
              job.quotationId,
            notification_type:
              job.type,
            lease_token:
              job.leaseToken,
            attempt_number:
              job.attempts,
            lease_expires_at:
              new Date(
                job.leaseExpiresAt
              ),
          };
        }),
      };
    }

    /* File 42: lease-authorized retrieval. */

    if (
      sql.includes(
        "get_quotation_email_job_data"
      )
    ) {
      const [id, token] = parameters;
      const job = findJob(id);

      return {
        rows: activeLease(job, token)
          ? [
              structuredClone(
                job.data
              ),
            ]
          : [],
      };
    }

    /* File 41: successful provider acceptance. */

    if (
      sql.includes(
        "complete_quotation_email_job"
      )
    ) {
      const [id, token, providerId] =
        parameters;

      const job = findJob(id);

      if (!activeLease(job, token)) {
        return {
          rows: [
            { completed: false },
          ],
        };
      }

      job.status = "sent";
      job.providerMessageId =
        providerId;
      job.leaseToken = null;
      job.leaseExpiresAt = null;

      return {
        rows: [
          { completed: true },
        ],
      };
    }

    /* File 41: failure and retry. */

    if (
      sql.includes(
        "fail_quotation_email_job"
      )
    ) {
      const [
        id,
        token,
        errorCode,
        permanent,
      ] = parameters;

      const job = findJob(id);

      if (!activeLease(job, token)) {
        return {
          rows: [
            {
              outcome:
                "stale_lease",
            },
          ],
        };
      }

      const terminal =
        permanent ||
        job.attempts >= 20;

      job.status = terminal
        ? "failed"
        : "pending";

      job.errorCode = errorCode;
      job.leaseToken = null;
      job.leaseExpiresAt = null;

      if (!terminal) {
        const delaySeconds =
          Math.min(
            3600,
            60 * 2 ** Math.min(
              job.attempts - 1,
              6
            )
          );

        job.nextAttemptAt =
          Date.now() +
          delaySeconds * 1000;
      }

      return {
        rows: [
          {
            outcome: terminal
              ? "failed"
              : "retry_scheduled",
          },
        ],
      };
    }

    throw new Error(
      "Unexpected SQL in mock database"
    );
  }

  async end() {
    this.closed = true;
    state.closedPools += 1;
  }
}

/* ==========================================
   LOAD ACTUAL APPLICATION MODULES

   TypeScript is transpiled in memory.
   Runtime imports are explicitly mocked.

   No module is written to disk.
   ========================================== */

function loadModule(
  filePath,
  dependencies = {}
) {
  const source = readFileSync(
    filePath,
    "utf8"
  );

  const compiled =
    ts.transpileModule(
      source,
      {
        compilerOptions: {
          module:
            ts.ModuleKind.CommonJS,
          target:
            ts.ScriptTarget.ES2022,
        },
      }
    ).outputText;

  const moduleExports = {};

  const requireMock = (name) => {
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
      "Unexpected source dependency"
    );
  };

  new Function(
    "require",
    "exports",
    compiled
  )(
    requireMock,
    moduleExports
  );

  return moduleExports;
}

const emailTemplates = loadModule(
  "src/lib/quotation-email.ts"
);

const emailPreparation = loadModule(
  "src/lib/quotation-email-worker.ts",
  {
    "@/lib/quotation-email":
      emailTemplates,
  }
);

const dryRunner = loadModule(
  "src/lib/quotation-email-worker-runner.ts",
  {
    "@/lib/quotation-email-worker":
      emailPreparation,
  }
);

const workerDatabase = loadModule(
  "src/lib/quotation-email-worker-db.ts",
  {
    pg: {
      Pool: MockPool,
    },
  }
);

/* ==========================================
   SAFE SIMULATED DELIVERY

   This is not the production worker.

   Provider outcomes are supplied as mock
   values. No provider library is imported.

   It deliberately never calls completeJob
   for a dry-run-only operation.
   ========================================== */

async function simulateOneJob(
  db,
  claimed,
  outcome
) {
  const data = await db.getJobData(
    claimed.jobId,
    claimed.leaseToken
  );

  if (!data) {
    return db.failJob(
      claimed.jobId,
      claimed.leaseToken,
      "INVALID_JOB_DATA",
      true
    );
  }

  let prepared;

  try {
    prepared =
      emailPreparation
        .prepareQuotationEmailJob(
          data
        );
  } catch {
    return db.failJob(
      claimed.jobId,
      claimed.leaseToken,
      "INVALID_JOB_DATA",
      true
    );
  }

  /*
   * Provider behavior below is fictional.
   * It does not make HTTP or SMTP requests.
   */

  if (outcome === "accepted") {
    const providerMessageId =
      "mock-provider-accepted";

    const completed =
      await db.completeJob(
        claimed.jobId,
        claimed.leaseToken,
        providerMessageId
      );

    return completed
      ? "sent"
      : "stale_lease";
  }

  if (outcome === "temporary_failure") {
    return db.failJob(
      claimed.jobId,
      claimed.leaseToken,
      "PROVIDER_TIMEOUT",
      false
    );
  }

  if (outcome === "permanent_failure") {
    return db.failJob(
      claimed.jobId,
      claimed.leaseToken,
      "RECIPIENT_REJECTED",
      true
    );
  }

  /*
   * A prepared draft is not an accepted
   * email delivery.

   This branch leaves the lease untouched
   and does not mark the job as sent.

   It exists only for mock testing.
   */

  assert.ok(
    prepared.message.html.length > 0
  );

  return "prepared_only";
}

/* ==========================================
   TEST EXECUTION
   ========================================== */

async function runTests() {
  configureSafeEnvironment();

  console.log(
    "\nBARK ORNAMENT - FILE 47"
  );

  console.log(
    "MOCKED EMAIL WORKER LIFECYCLE\n"
  );

  /* TEST 1: Import safety. */

  assert.equal(
    databaseConnections,
    0
  );

  assert.equal(
    actualProviderCalls,
    0
  );

  pass(
    "No database or provider connection on import"
  );

  /* TEST 2: Safe dry-run does not claim jobs. */

  resetState([
    createJob(101),
  ]);

  const dryRun =
    dryRunner
      .runQuotationEmailWorkerDryRun([
        makeQuotationData(),
      ]);

  assert.equal(
    dryRun.prepared,
    1
  );

  assert.equal(
    dryRun.sent,
    false
  );

  assert.equal(
    dryRun.jobsClaimed,
    0
  );

  assert.equal(
    state.jobs[0].status,
    "pending"
  );

  assert.equal(
    state.jobs[0].attempts,
    0
  );

  pass(
    "Dry-run renders without claiming or changing jobs"
  );

  /* TEST 3: Restricted worker authentication. */

  const db =
    await workerDatabase
      .connectQuotationWorkerDatabase();

  assert.ok(db);

  assert.equal(
    databaseConnections,
    1
  );

  pass(
    "Worker identity and permissions verified"
  );

  /* TEST 4: Claim and retrieve. */

  const claims =
    await db.claimJobs(1);

  assert.equal(
    claims.length,
    1
  );

  assert.equal(
    claims[0].attemptNumber,
    1
  );

  assert.equal(
    state.jobs[0].status,
    "processing"
  );

  const retrieved =
    await db.getJobData(
      claims[0].jobId,
      claims[0].leaseToken
    );

  assert.equal(
    retrieved.quotation_reference,
    REFERENCE
  );

  pass(
    "Claim and lease-authorized retrieval work"
  );

  /* TEST 5: Wrong lease cannot access data. */

  const wrongData =
    await db.getJobData(
      claims[0].jobId,
      randomUUID()
    );

  assert.equal(
    wrongData,
    null
  );

  pass(
    "Incorrect lease token cannot retrieve data"
  );

  /* TEST 6: Prepare internal email. */

  const internal =
    emailPreparation
      .prepareQuotationEmailJob(
        retrieved
      );

  assert.equal(
    internal.notificationType,
    "internal"
  );

  assert.ok(
    internal.message.html.includes(
      "Menu &lt;Cover&gt;"
    )
  );

  assert.equal(
    internal.customerRecipient,
    null
  );

  pass(
    "Internal template prepared with escaped HTML"
  );

  /* TEST 7: Provider acceptance simulation. */

  const success =
    await simulateOneJob(
      db,
      claims[0],
      "accepted"
    );

  assert.equal(
    success,
    "sent"
  );

  assert.equal(
    state.jobs[0].status,
    "sent"
  );

  assert.equal(
    state.jobs[0].providerMessageId,
    "mock-provider-accepted"
  );

  assert.equal(
    await db.completeJob(
      claims[0].jobId,
      claims[0].leaseToken,
      "mock-provider-duplicate"
    ),
    false
  );

  pass(
    "Simulated provider acceptance completes exactly once"
  );

  /* TEST 8: Temporary failure schedules retry. */

  resetState([
    createJob(201),
  ]);

  const retryClaim =
    (await db.claimJobs(1))[0];

  const retryOutcome =
    await simulateOneJob(
      db,
      retryClaim,
      "temporary_failure"
    );

  assert.equal(
    retryOutcome,
    "retry_scheduled"
  );

  assert.equal(
    state.jobs[0].status,
    "pending"
  );

  assert.equal(
    state.jobs[0].attempts,
    1
  );

  assert.ok(
    state.jobs[0].nextAttemptAt >
    Date.now()
  );

  assert.equal(
    (await db.claimJobs(1)).length,
    0
  );

  pass(
    "Temporary failure schedules retry without immediate reclaim"
  );

  /* TEST 9: Permanent failure. */

  resetState([
    createJob(
      301,
      "customer",
      makeQuotationData(
        "customer"
      )
    ),
  ]);

  const permanentClaim =
    (await db.claimJobs(1))[0];

  const customerData =
    await db.getJobData(
      permanentClaim.jobId,
      permanentClaim.leaseToken
    );

  const customerEmail =
    emailPreparation
      .prepareQuotationEmailJob(
        customerData
      );

  assert.equal(
    customerEmail.recipientKind,
    "customer"
  );

  const permanentOutcome =
    await simulateOneJob(
      db,
      permanentClaim,
      "permanent_failure"
    );

  assert.equal(
    permanentOutcome,
    "failed"
  );

  assert.equal(
    state.jobs[0].status,
    "failed"
  );

  pass(
    "Customer template and permanent failure work"
  );

  /* TEST 10: Malformed data never completes. */

  const malformedData =
    makeQuotationData();

  malformedData.product_items = [];

  resetState([
    createJob(
      401,
      "internal",
      malformedData
    ),
  ]);

  const invalidClaim =
    (await db.claimJobs(1))[0];

  const invalidOutcome =
    await simulateOneJob(
      db,
      invalidClaim,
      "accepted"
    );

  assert.equal(
    invalidOutcome,
    "failed"
  );

  assert.equal(
    state.jobs[0].providerMessageId,
    null
  );

  assert.equal(
    state.jobs[0].errorCode,
    "INVALID_JOB_DATA"
  );

  pass(
    "Malformed job data cannot be marked sent"
  );

  /* TEST 11: Superseded lease protection. */

  resetState([
    createJob(501),
  ]);

  const firstClaim =
    (await db.claimJobs(1))[0];

  state.jobs[0].leaseExpiresAt =
    Date.now() - 1000;

  const secondClaim =
    (await db.claimJobs(1))[0];

  assert.notEqual(
    firstClaim.leaseToken,
    secondClaim.leaseToken
  );

  assert.equal(
    secondClaim.attemptNumber,
    2
  );

  assert.equal(
    await db.completeJob(
      firstClaim.jobId,
      firstClaim.leaseToken,
      "mock-stale"
    ),
    false
  );

  assert.equal(
    await db.failJob(
      firstClaim.jobId,
      firstClaim.leaseToken,
      "PROVIDER_TIMEOUT",
      false
    ),
    "stale_lease"
  );

  assert.equal(
    state.jobs[0].status,
    "processing"
  );

  pass(
    "Superseded worker cannot complete or fail job"
  );

  /* TEST 12: Simulated rendering is not delivery. */

  const previewOnly =
    await simulateOneJob(
      db,
      secondClaim,
      "prepared_only"
    );

  assert.equal(
    previewOnly,
    "prepared_only"
  );

  assert.equal(
    state.jobs[0].status,
    "processing"
  );

  assert.equal(
    state.jobs[0].providerMessageId,
    null
  );

  pass(
    "Prepared content is not falsely marked sent"
  );

  /* TEST 13: Safe closure. */

  await db.close();

  assert.equal(
    state.closedPools,
    1
  );

  await assert.rejects(
    db.claimJobs(1),
    /closed/
  );

  pass(
    "Worker database interface closes safely"
  );

  /* TEST 14: Excess permissions rejected. */

  resetState();
  state.roleAuthorized = false;

  await assert.rejects(
    workerDatabase
      .connectQuotationWorkerDatabase(),
    /operation failed/
  );

  assert.equal(
    state.closedPools,
    1
  );

  pass(
    "Unexpected database permissions rejected"
  );

  /* TEST 15: Unsafe environment rejected. */

  configureSafeEnvironment();

  process.env
    .QUOTATION_EMAIL_NOTIFICATIONS_ENABLED =
    "true";

  const beforeConnections =
    databaseConnections;

  await assert.rejects(
    workerDatabase
      .connectQuotationWorkerDatabase(),
    /configuration/
  );

  assert.equal(
    databaseConnections,
    beforeConnections
  );

  pass(
    "Unsafe configuration blocked before connecting"
  );

  /* TEST 16: Queries stay within allowlist. */

  const allowedFunctions = [
    "claim_quotation_email_jobs",
    "get_quotation_email_job_data",
    "complete_quotation_email_job",
    "fail_quotation_email_job",
  ];

  for (const entry of state.queryLog) {
    const sql = entry.sql;

    if (sql.includes("CURRENT_USER")) {
      continue;
    }

    assert.ok(
      allowedFunctions.some(
        (name) =>
          sql.includes(name)
      )
    );

    assert.ok(
      !/\bINSERT\s+INTO\b/i.test(sql)
    );

    assert.ok(
      !/\bDELETE\s+FROM\b/i.test(sql)
    );
  }

  assert.equal(
    actualProviderCalls,
    0
  );

  pass(
    "Only approved SQL functions used; no real provider"
  );

  console.log(
    "\n========================================"
  );

  console.log(
    `FILE 47 RESULT: ${assertionsPassed} TESTS PASSED`
  );

  console.log(
    "Real PostgreSQL connections: 0"
  );

  console.log(
    "Real email-provider calls: 0"
  );

  console.log(
    "Real emails sent: 0"
  );

  console.log(
    "========================================\n"
  );
}

/* ==========================================
   EXECUTION AND CLEANUP
   ========================================== */

try {
  await runTests();
} catch (error) {
  console.error(
    "\nFILE 47 RESULT: FAILED"
  );

  console.error(
    error instanceof Error
      ? error.message
      : "Unknown test error"
  );

  process.exitCode = 1;
} finally {
  restoreEnvironment();
}
