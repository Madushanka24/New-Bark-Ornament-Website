
import "server-only";

/*
==========================================================
BARK ORNAMENT (PVT) LTD

FILE 56 - CONTROLLED EMAIL WORKER HANDOFF COORDINATOR

File:
src/lib/quotation-email-worker-handoff-coordinator.ts

PURPOSE
-------
1. Validate a fictional claimed email job.
2. Simulate lease-authorized data retrieval.
3. Check job/quotation/notification associations.
4. Prepare message content through File 43.
5. Simulate the possible File 55 handoff responses.
6. Reject duplicate jobs within a batch.
7. Return privacy-safe, bounded execution reports.

SECURITY BOUNDARIES
-------------------
- Development only
- Quotation submissions disabled
- E2E mode disabled
- Email notifications disabled
- Fictional .invalid recipients only
- No PostgreSQL connection
- No real beginHandoff() call
- No actual provider delivery
- No job completion or failure updates
- No timers or background execution
- No customer information in reports

This is a mock-only integration coordinator.

It does not authorize a real provider submission.
==========================================================
*/

import {
  prepareQuotationEmailJob,
} from "@/lib/quotation-email-worker";

/* ======================================================
   TYPES
   ====================================================== */

export type HandoffSimulationOutcome =
  | "handoff_started"
  | "already_handed_off"
  | "stale_lease"
  | "database_error"
  | "invalid_database_result";

export type ControlledHandoffClaim = Readonly<{
  jobId: string;
  quotationId: string;
  notificationType: "internal" | "customer";
  leaseToken: string;
  attemptNumber: number;
  leaseExpiresAt: Date;
}>;

export type ControlledHandoffRetrieval =
  | Readonly<{
      kind: "data";
      value: unknown;
    }>
  | Readonly<{
      kind: "missing";
    }>
  | Readonly<{
      kind: "error";
    }>;

export type ControlledHandoffScenario = Readonly<{
  claim: ControlledHandoffClaim;
  retrieval: ControlledHandoffRetrieval;
  handoffOutcome: HandoffSimulationOutcome;
}>;

export type ControlledHandoffSource = Readonly<{
  kind: "controlled_handoff_fixture";
}>;

export type ControlledHandoffStep =
  | "claim_checked"
  | "data_retrieved"
  | "message_prepared"
  | "handoff_simulated";

export type ControlledHandoffStatus =
  | "handoff_started_simulated"
  | "already_handed_off_no_send"
  | "stale_lease_no_send"
  | "handoff_unconfirmed_no_send"
  | "expired_lease_no_send"
  | "data_unavailable_no_send"
  | "duplicate_job_no_send"
  | "invalid_job_no_send";

export type ControlledHandoffEntry = Readonly<{
  index: number;
  status: ControlledHandoffStatus;
  notificationType: "internal" | "customer" | null;
  attemptNumber: number | null;
  productCount: number | null;
  steps: readonly ControlledHandoffStep[];
}>;

export type ControlledHandoffReport = Readonly<{
  mode: "controlled_handoff_simulation";
  total: number;
  prepared: number;
  handoffsSimulated: number;
  handoffStartedSimulated: number;
  alreadyHandedOff: number;
  staleLeases: number;
  unconfirmed: number;
  rejectedBeforeHandoff: number;
  databaseConnected: false;
  databaseModified: false;
  jobsClaimed: 0;
  actualHandoffCalls: 0;
  providerCalls: 0;
  emailsSent: 0;
  entries: readonly ControlledHandoffEntry[];
}>;

/* ======================================================
   CONSTANTS
   ====================================================== */

const MAX_BATCH_SIZE = 10;
const MAX_ATTEMPTS = 20;

const MAX_PG_BIGINT = BigInt("9223372036854775807");

const JOB_ID_PATTERN =
  /^[1-9][0-9]{0,18}$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FICTIONAL_EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.invalid$/i;

const RESERVED_EMAIL =
  "fixture@example.invalid";

/*
 * Only sources created by this module
 * are authorized.
 *
 * The WeakMap contains cloned fixture data,
 * never a real database or provider adapter.
 */

const sources = new WeakMap<
  object,
  readonly unknown[]
>();

/* ======================================================
   ENVIRONMENT SAFETY
   ====================================================== */

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
      "Controlled handoff simulation is disabled."
    );
  }
}

/* ======================================================
   VALIDATION HELPERS
   ====================================================== */

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
  return (
    typeof value === "string" &&
    JOB_ID_PATTERN.test(value) &&
    BigInt(value) <= MAX_PG_BIGINT
  );
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
): value is ControlledHandoffClaim {
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

function validFictionalEmail(
  value: unknown
): boolean {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    FICTIONAL_EMAIL_PATTERN.test(value) &&
    value.toLowerCase() !== RESERVED_EMAIL
  );
}

/* ======================================================
   REPORT ENTRY HELPERS

   Reports intentionally exclude:
   - job ID
   - quotation reference
   - lease token
   - customer email
   - recipient address
   - provider message ID
   - email subject/body
   ====================================================== */

function entry(
  index: number,
  status: ControlledHandoffStatus,
  steps: readonly ControlledHandoffStep[],
  notificationType:
    | "internal"
    | "customer"
    | null = null,
  attemptNumber: number | null = null,
  productCount: number | null = null
): ControlledHandoffEntry {
  return Object.freeze({
    index,
    status,
    notificationType,
    attemptNumber,
    productCount,
    steps: Object.freeze([...steps]),
  });
}

/* ======================================================
   CREATE AN AUTHORIZED FICTIONAL SOURCE

   Only structured in-memory data is accepted.

   There are no injected:
   - SQL clients
   - callbacks
   - provider transports
   - credentials
   ====================================================== */

export function createControlledHandoffSource(
  input: unknown
): ControlledHandoffSource {
  assertSafeEnvironment();

  if (
    !Array.isArray(input) ||
    input.length > MAX_BATCH_SIZE
  ) {
    throw new Error(
      "Invalid controlled handoff batch."
    );
  }

  let snapshot: unknown;

  try {
    snapshot = structuredClone(input);
  } catch {
    throw new Error(
      "Invalid controlled handoff batch."
    );
  }

  if (!Array.isArray(snapshot)) {
    throw new Error(
      "Invalid controlled handoff batch."
    );
  }

  const source = Object.freeze({
    kind: "controlled_handoff_fixture" as const,
  });

  sources.set(source, snapshot);

  return source;
}

/* ======================================================
   PROCESS ONE SIMULATED CLAIM

   Execution order:

   1. Validate claim.
   2. Check lease expiry.
   3. Simulate retrieval.
   4. Validate job association.
   5. Prepare message.
   6. Recheck lease expiry.
   7. Simulate File 55 handoff result.

   No PostgreSQL or provider function is called.
   ====================================================== */

function processScenario(
  scenario: unknown,
  index: number,
  seen: Set<string>
): ControlledHandoffEntry {
  const steps: ControlledHandoffStep[] = [];

  if (
    !isRecord(scenario) ||
    !validClaim(scenario.claim)
  ) {
    return entry(
      index,
      "invalid_job_no_send",
      steps
    );
  }

  const claim = scenario.claim;

  steps.push("claim_checked");

  if (seen.has(claim.jobId)) {
    return entry(
      index,
      "duplicate_job_no_send",
      steps
    );
  }

  seen.add(claim.jobId);

  if (
    claim.leaseExpiresAt.getTime() <=
    Date.now()
  ) {
    return entry(
      index,
      "expired_lease_no_send",
      steps
    );
  }

  /* ----------------------------------------------------
     Simulate the restricted File 45 retrieval.
     ---------------------------------------------------- */

  if (!isRecord(scenario.retrieval)) {
    return entry(
      index,
      "data_unavailable_no_send",
      steps
    );
  }

  if (
    scenario.retrieval.kind !== "data"
  ) {
    return entry(
      index,
      "data_unavailable_no_send",
      steps
    );
  }

  const data = scenario.retrieval.value;

  if (!isRecord(data)) {
    return entry(
      index,
      "invalid_job_no_send",
      steps
    );
  }

  steps.push("data_retrieved");

  /* ----------------------------------------------------
     Verify that retrieved data belongs to the
     exact claimed job and quotation.
     ---------------------------------------------------- */

  if (
    data.job_id !== claim.jobId ||
    typeof data.quotation_id !== "string" ||
    data.quotation_id.toLowerCase() !==
      claim.quotationId.toLowerCase() ||
    data.notification_type !==
      claim.notificationType ||
    !validFictionalEmail(
      data.customer_email
    )
  ) {
    return entry(
      index,
      "invalid_job_no_send",
      steps
    );
  }

  /* ----------------------------------------------------
     Prepare using the real File 43 validator.
     ---------------------------------------------------- */

  try {
    const prepared =
      prepareQuotationEmailJob(data);

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
      return entry(
        index,
        "invalid_job_no_send",
        steps
      );
    }

    steps.push("message_prepared");

    /*
     * Preparation takes time.
     *
     * The simulated lease must still be
     * valid after message rendering.
     *
     * Real PostgreSQL must separately
     * validate the lease atomically.
     */

    if (
      claim.leaseExpiresAt.getTime() <=
      Date.now()
    ) {
      return entry(
        index,
        "expired_lease_no_send",
        steps
      );
    }

    /* ------------------------------------------------
       Simulated File 55 handoff result.

       These values DO NOT grant permission to send.
       ------------------------------------------------ */

    steps.push("handoff_simulated");

    const outcome = scenario.handoffOutcome;

    switch (outcome) {
      case "handoff_started":
        return entry(
          index,
          "handoff_started_simulated",
          steps,
          prepared.notificationType,
          claim.attemptNumber,
          prepared.productCount
        );

      case "already_handed_off":
        return entry(
          index,
          "already_handed_off_no_send",
          steps,
          prepared.notificationType,
          claim.attemptNumber,
          prepared.productCount
        );

      case "stale_lease":
        return entry(
          index,
          "stale_lease_no_send",
          steps,
          prepared.notificationType,
          claim.attemptNumber,
          prepared.productCount
        );

      case "database_error":
      case "invalid_database_result":
      default:
        /*
         * Unknown or failed database results
         * are always treated as unconfirmed.
         *
         * They must not authorize a retry or
         * real provider submission.
         */
        return entry(
          index,
          "handoff_unconfirmed_no_send",
          steps,
          prepared.notificationType,
          claim.attemptNumber,
          prepared.productCount
        );
    }

  } catch {
    /*
     * Never expose raw validation messages,
     * rendered email content or customer data.
     */

    return entry(
      index,
      "invalid_job_no_send",
      steps
    );
  }
}

/* ======================================================
   MAIN CONTROLLED COORDINATOR

   Accepts only a source created by
   createControlledHandoffSource().

   A plain object cannot impersonate one.

   There are no database credentials,
   provider connections or SQL methods.
   ====================================================== */

export function
runControlledEmailWorkerHandoffCycle(
  source: ControlledHandoffSource
): ControlledHandoffReport {
  assertSafeEnvironment();

  if (
    !isRecord(source) ||
    !sources.has(source)
  ) {
    throw new Error(
      "Unauthorized handoff fixture source."
    );
  }

  const scenarios = sources.get(source);

  if (!scenarios) {
    throw new Error(
      "Controlled handoff source unavailable."
    );
  }

  const seen = new Set<string>();
  const entries: ControlledHandoffEntry[] = [];

  for (
    let index = 0;
    index < scenarios.length;
    index += 1
  ) {
    entries.push(
      processScenario(
        scenarios[index],
        index,
        seen
      )
    );
  }

  const count = (
    status: ControlledHandoffStatus
  ): number =>
    entries.filter(
      (item) => item.status === status
    ).length;

  const started =
    count("handoff_started_simulated");

  const repeated =
    count("already_handed_off_no_send");

  const stale =
    count("stale_lease_no_send");

  const unconfirmed =
    count("handoff_unconfirmed_no_send");

  const handoffsSimulated =
    started + repeated + stale + unconfirmed;

  const prepared =
    entries.filter(
      (item) =>
        item.steps.includes(
          "message_prepared"
        )
    ).length;

  return Object.freeze({
    mode:
      "controlled_handoff_simulation" as const,

    total: entries.length,
    prepared,

    handoffsSimulated,

    handoffStartedSimulated: started,
    alreadyHandedOff: repeated,
    staleLeases: stale,
    unconfirmed,

    rejectedBeforeHandoff:
      entries.length - handoffsSimulated,

    databaseConnected: false as const,
    databaseModified: false as const,
    jobsClaimed: 0 as const,
    actualHandoffCalls: 0 as const,
    providerCalls: 0 as const,
    emailsSent: 0 as const,

    entries: Object.freeze(entries),
  });
}

/* ======================================================
   END FILE 56

   MOCKED COORDINATION ONLY

   NO REAL DATABASE HANDOFF
   NO PROVIDER CALL
   NO EMAIL DELIVERY
   ====================================================== */
