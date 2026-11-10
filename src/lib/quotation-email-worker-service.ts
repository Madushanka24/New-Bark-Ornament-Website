
import "server-only";

/*
====================================================
BARK ORNAMENT (PVT) LTD

FILE 50 - CONTROLLED EMAIL WORKER SERVICE

src/lib/quotation-email-worker-service.ts

PURPOSE
-------
- Exercise the email-worker service lifecycle
- Use explicit fictional in-memory fixtures
- Validate simulated leases and job identity
- Prepare internal/customer email messages
- Reject invalid or unavailable job data
- Prevent duplicate processing in one cycle
- Return bounded, privacy-safe results

SECURITY
--------
- Development only
- Submissions and email delivery disabled
- No PostgreSQL connection
- No actual job claiming
- No database state changes
- No email provider
- No actual messages sent
- No customer email addresses in results

This is NOT an active production worker.
====================================================
*/

import {
  prepareQuotationEmailJob,
} from "@/lib/quotation-email-worker";

/* ==========================================
   TYPES
   ========================================== */

export type ControlledWorkerClaim = Readonly<{
  jobId: string;
  quotationId: string;
  notificationType: "internal" | "customer";
  leaseToken: string;
  attemptNumber: number;
  leaseExpiresAt: Date;
}>;

export type ControlledWorkerFixture = Readonly<{
  claim: ControlledWorkerClaim;
  jobData: unknown;

  /*
   * Optional test behavior.
   *
   * "missing": simulate a retrieval returning
   * no row, e.g. an invalidated lease.
   *
   * "error": simulate a retrieval failure.
   */

  retrieval?: "available" | "missing" | "error";
}>;

export type ControlledWorkerStatus =
  | "prepared_not_sent"
  | "lease_expired"
  | "data_unavailable"
  | "duplicate_job"
  | "invalid_job";

export type ControlledWorkerEntry = Readonly<{
  index: number;
  status: ControlledWorkerStatus;
  notificationType: "internal" | "customer" | null;
  attemptNumber: number | null;
  productCount: number | null;
  errorCode:
    | "LEASE_EXPIRED"
    | "DATA_UNAVAILABLE"
    | "DUPLICATE_JOB"
    | "INVALID_JOB"
    | null;
}>;

export type ControlledWorkerReport = Readonly<{
  mode: "controlled_fixture";
  total: number;
  prepared: number;
  rejected: number;
  databaseConnected: false;
  databaseModified: false;
  jobsClaimed: 0;
  providerCalls: 0;
  emailsSent: 0;
  entries: readonly ControlledWorkerEntry[];
}>;

/*
 * The source is intentionally opaque.
 * It cannot expose a database client.
 */

export type ControlledWorkerSource = Readonly<{
  kind: "controlled_fixture";
}>;

/* ==========================================
   CONSTANTS
   ========================================== */

const MAX_BATCH_SIZE = 10;
const MAX_ATTEMPTS = 20;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const JOB_ID_PATTERN =
  /^[1-9][0-9]{0,18}$/;

const MAX_POSTGRES_BIGINT =
  BigInt("9223372036854775807");

/*
 * The private WeakMap prevents a caller
 * from passing an arbitrary database
 * adapter in place of a fixture source.
 */

const fixtureSources = new WeakMap<
  object,
  readonly ControlledWorkerFixture[]
>();

/* ==========================================
   ENVIRONMENT SAFETY
   ========================================== */

function assertSafeEnvironment(): void {
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
      "Controlled email worker execution disabled."
    );
  }
}

/* ==========================================
   HELPERS
   ========================================== */

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validJobId(
  value: unknown
): value is string {
  if (
    typeof value !== "string" ||
    !JOB_ID_PATTERN.test(value)
  ) {
    return false;
  }

  return BigInt(value) <= BigInt("9223372036854775807");
}

function validUuid(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  );
}

function validClaim(
  value: unknown
): value is ControlledWorkerClaim {
  if (!isRecord(value)) {
    return false;
  }

  return (
    validJobId(value.jobId) &&
    validUuid(value.quotationId) &&
    validUuid(value.leaseToken) &&
    (
      value.notificationType === "internal" ||
      value.notificationType === "customer"
    ) &&
    typeof value.attemptNumber === "number" &&
    Number.isInteger(value.attemptNumber) &&
    value.attemptNumber >= 1 &&
    value.attemptNumber <= MAX_ATTEMPTS &&
    value.leaseExpiresAt instanceof Date &&
    Number.isFinite(
      value.leaseExpiresAt.getTime()
    )
  );
}

function rejection(
  index: number,
  status: Exclude<
    ControlledWorkerStatus,
    "prepared_not_sent"
  >,
  errorCode: Exclude<
    ControlledWorkerEntry["errorCode"],
    null
  >
): ControlledWorkerEntry {
  return {
    index,
    status,
    notificationType: null,
    attemptNumber: null,
    productCount: null,
    errorCode,
  };
}

/* ==========================================
   CREATE A CONTROLLED FIXTURE SOURCE

   Accepts only an in-memory array.

   The source does not receive:
   - PostgreSQL credentials
   - Database pool
   - Provider client
   - External callbacks

   structuredClone creates an isolated
   snapshot of the input.
   ========================================== */

export function createControlledWorkerFixtureSource(
  input: unknown
): ControlledWorkerSource {
  assertSafeEnvironment();

  if (
    !Array.isArray(input) ||
    input.length > MAX_BATCH_SIZE
  ) {
    throw new Error(
      "Invalid controlled worker fixture batch."
    );
  }

  /*
   * No arbitrary callbacks, promises or
   * transport objects should be accepted.
   */

  let cloned: unknown;

  try {
    cloned = structuredClone(input);
  } catch {
    throw new Error(
      "Invalid controlled worker fixture batch."
    );
  }

  if (!Array.isArray(cloned)) {
    throw new Error(
      "Invalid controlled worker fixture batch."
    );
  }

  const source = Object.freeze({
    kind: "controlled_fixture" as const,
  });

  fixtureSources.set(
    source,
    cloned as ControlledWorkerFixture[]
  );

  return source;
}

/* ==========================================
   PROCESS A SINGLE FICTIONAL JOB

   Important:
   Validity of a simulated lease is not
   proof of a real PostgreSQL lease.

   The module merely mirrors the required
   checks for later execution-service work.
   ========================================== */

function processFixture(
  fixture: unknown,
  index: number,
  seen: Set<string>
): ControlledWorkerEntry {
  if (
    !isRecord(fixture) ||
    !validClaim(fixture.claim)
  ) {
    return rejection(
      index,
      "invalid_job",
      "INVALID_JOB"
    );
  }

  const claim = fixture.claim;

  if (seen.has(claim.jobId)) {
    return rejection(
      index,
      "duplicate_job",
      "DUPLICATE_JOB"
    );
  }

  seen.add(claim.jobId);

  if (
    claim.leaseExpiresAt.getTime() <=
    Date.now()
  ) {
    return rejection(
      index,
      "lease_expired",
      "LEASE_EXPIRED"
    );
  }

  /*
   * Simulate restricted retrieval.
   *
   * No actual database function is called.
   */

  if (
    fixture.retrieval === "missing" ||
    fixture.retrieval === "error"
  ) {
    return rejection(
      index,
      "data_unavailable",
      "DATA_UNAVAILABLE"
    );
  }

  if (
    fixture.retrieval !== undefined &&
    fixture.retrieval !== "available"
  ) {
    return rejection(
      index,
      "invalid_job",
      "INVALID_JOB"
    );
  }

  if (!isRecord(fixture.jobData)) {
    return rejection(
      index,
      "invalid_job",
      "INVALID_JOB"
    );
  }

  const data = fixture.jobData;

  /*
   * Ensure the retrieved row belongs to
   * exactly the job that was claimed.
   */

  if (
    String(data.job_id ?? "") !==
      claim.jobId ||
    String(data.quotation_id ?? "")
      .toLowerCase() !==
      claim.quotationId.toLowerCase() ||
    data.notification_type !==
      claim.notificationType
  ) {
    return rejection(
      index,
      "invalid_job",
      "INVALID_JOB"
    );
  }

  try {
    const prepared =
      prepareQuotationEmailJob(data);

    /*
     * Development fixtures must use
     * fictional .invalid email addresses.
     *
     * This prevents accidental use of
     * real customer data during testing.
     */

    const recipient = data.customer_email;

    if (
      typeof recipient !== "string" ||
      !/^[^\s@]+@[^\s@]+\.invalid$/i.test(
        recipient
      )
    ) {
      return rejection(
        index,
        "invalid_job",
        "INVALID_JOB"
      );
    }

    if (
      prepared.jobId !== claim.jobId ||
      prepared.quotationId.toLowerCase() !==
        claim.quotationId.toLowerCase() ||
      prepared.notificationType !==
        claim.notificationType
    ) {
      return rejection(
        index,
        "invalid_job",
        "INVALID_JOB"
      );
    }

    /*
     * Content is prepared in memory.
     *
     * It is NOT sent.
     * No database completion occurs.
     */

    return {
      index,
      status: "prepared_not_sent",
      notificationType:
        prepared.notificationType,
      attemptNumber: claim.attemptNumber,
      productCount: prepared.productCount,
      errorCode: null,
    };
  } catch {
    /*
     * Do not expose customer information
     * or raw error messages.
     */

    return rejection(
      index,
      "invalid_job",
      "INVALID_JOB"
    );
  }
}

/* ==========================================
   EXECUTE CONTROLLED WORKER CYCLE

   A valid source can only be created by
   createControlledWorkerFixtureSource().

   There is no arbitrary database adapter
   or provider transport in this function.
   ========================================== */

export function runControlledEmailWorkerService(
  source: ControlledWorkerSource
): ControlledWorkerReport {
  assertSafeEnvironment();

  if (
    !isRecord(source) ||
    !fixtureSources.has(source)
  ) {
    throw new Error(
      "Unauthorized worker fixture source."
    );
  }

  const fixtures =
    fixtureSources.get(source);

  if (!fixtures) {
    throw new Error(
      "Controlled fixture source unavailable."
    );
  }

  const seen = new Set<string>();
  const entries: ControlledWorkerEntry[] = [];

  for (
    let index = 0;
    index < fixtures.length;
    index += 1
  ) {
    entries.push(
      processFixture(
        fixtures[index],
        index,
        seen
      )
    );
  }

  const prepared =
    entries.filter(
      (entry) =>
        entry.status === "prepared_not_sent"
    ).length;

  return {
    mode: "controlled_fixture",
    total: entries.length,
    prepared,
    rejected: entries.length - prepared,
    databaseConnected: false,
    databaseModified: false,
    jobsClaimed: 0,
    providerCalls: 0,
    emailsSent: 0,
    entries,
  };
}

/* ==========================================
   END FILE 50

   NO AUTOMATIC EXECUTION
   NO EMAIL PROVIDER
   NO DATABASE CHANGES
   ========================================== */
