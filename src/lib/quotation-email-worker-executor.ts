
import "server-only";

/*
========================================================
BARK ORNAMENT (PVT) LTD

FILE 48 - DEVELOPMENT EMAIL WORKER ORCHESTRATION

src/lib/quotation-email-worker-executor.ts

PURPOSE
-------
- Orchestrate simulated email-worker execution
- Accept explicitly supplied fictional jobs
- Prepare messages using File 43
- Simulate provider outcomes
- Model retry and terminal-failure decisions
- Reject malformed jobs and duplicate job IDs
- Produce privacy-safe execution reports

IMPORTANT SAFETY BOUNDARIES
---------------------------
- No PostgreSQL connection
- No database job claims
- No database state modifications
- No email or network transport
- No real provider acceptance
- No real customer messages in reports
- No background scheduling

Never interpret simulated acceptance as
actual email delivery or provider acceptance.
========================================================
*/

import {
  prepareQuotationEmailJob,
  type PreparedQuotationEmail,
} from "@/lib/quotation-email-worker";

/* ==========================================
   SIMULATED OUTCOMES
   ========================================== */

export type SimulatedDeliveryOutcome =
  | "preview_only"
  | "accepted"
  | "temporary_failure"
  | "permanent_failure";

export type WorkerExecutionScenario =
  Readonly<{
    jobData: unknown;
    attemptNumber: number;
    simulatedOutcome: SimulatedDeliveryOutcome;
  }>;

export type WorkerExecutionStatus =
  | "preview_ready"
  | "acceptance_simulated"
  | "retry_simulated"
  | "terminal_failure_simulated"
  | "rejected";

export type WorkerExecutionEntry =
  Readonly<{
    index: number;
    jobId: string | null;
    notificationType: "internal" | "customer" | null;
    attemptNumber: number | null;
    status: WorkerExecutionStatus;
    retryDelaySeconds: number | null;
    errorCode: "INVALID_TEST_SCENARIO" | null;
  }>;

export type WorkerExecutionReport =
  Readonly<{
    mode: "development_simulation";
    total: number;
    prepared: number;
    acceptedSimulated: number;
    retriesSimulated: number;
    terminalFailuresSimulated: number;
    rejected: number;
    databaseConnected: false;
    databaseModified: false;
    jobsClaimed: 0;
    providerCalls: 0;
    emailsSent: 0;
    entries: readonly WorkerExecutionEntry[];
  }>;

/* ==========================================
   CONFIGURATION
   ========================================== */

const MAX_BATCH_SIZE = 10;
const MAX_ATTEMPTS = 20;
const MAX_RETRY_SECONDS = 3600;

/* ==========================================
   ENVIRONMENT SAFETY

   All switches must explicitly be false.
   No fallback to an enabled environment.
   ========================================== */

function assertSafeEnvironment(): void {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env
      .QUOTATION_SUBMISSIONS_ENABLED !== "false" ||
    process.env
      .QUOTATION_E2E_TEST_MODE !== "false" ||
    process.env
      .QUOTATION_EMAIL_NOTIFICATIONS_ENABLED !==
      "false"
  ) {
    throw new Error(
      "Development email simulation is disabled."
    );
  }
}

/* ==========================================
   INPUT HELPERS
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

function isSimulatedOutcome(
  value: unknown
): value is SimulatedDeliveryOutcome {
  return (
    value === "preview_only" ||
    value === "accepted" ||
    value === "temporary_failure" ||
    value === "permanent_failure"
  );
}

function assertBatch(
  input: unknown
): asserts input is readonly unknown[] {
  if (
    !Array.isArray(input) ||
    input.length > MAX_BATCH_SIZE
  ) {
    throw new Error(
      "Invalid worker simulation batch."
    );
  }
}

/* ==========================================
   RETRY BACKOFF

   Matches the policy in File 41.

   Attempt 1 = 60 seconds.
   Attempt 2 = 120 seconds.
   Attempt 3 = 240 seconds.
   ...
   Maximum = 3600 seconds.

   Attempt 20 is terminal, with no retry.
   ========================================== */

export function getSimulatedRetryDelay(
  attemptNumber: number
): number | null {
  if (
    !Number.isInteger(attemptNumber) ||
    attemptNumber < 1 ||
    attemptNumber > MAX_ATTEMPTS
  ) {
    throw new Error(
      "Invalid email delivery attempt number."
    );
  }

  if (attemptNumber === MAX_ATTEMPTS) {
    return null;
  }

  return Math.min(
    MAX_RETRY_SECONDS,
    60 * 2 ** Math.min(
      attemptNumber - 1,
      6
    )
  );
}

/* ==========================================
   GENERIC FAILURE RESULT

   No supplied customer information or
   exception text is copied into reports.
   ========================================== */

function rejectedEntry(
  index: number
): WorkerExecutionEntry {
  return {
    index,
    jobId: null,
    notificationType: null,
    attemptNumber: null,
    status: "rejected",
    retryDelaySeconds: null,
    errorCode: "INVALID_TEST_SCENARIO",
  };
}

/* ==========================================
   PREPARED JOB TO SIMULATED RESULT

   This function does not call any provider
   or update a database row.
   ========================================== */

function simulatedEntry(
  index: number,
  prepared: PreparedQuotationEmail,
  attemptNumber: number,
  outcome: SimulatedDeliveryOutcome
): WorkerExecutionEntry {
  let status: WorkerExecutionStatus;
  let retryDelaySeconds: number | null = null;

  switch (outcome) {
    case "preview_only":
      status = "preview_ready";
      break;

    case "accepted":
      status = "acceptance_simulated";
      break;

    case "permanent_failure":
      status = "terminal_failure_simulated";
      break;

    case "temporary_failure": {
      retryDelaySeconds =
        getSimulatedRetryDelay(
          attemptNumber
        );

      status = retryDelaySeconds === null
        ? "terminal_failure_simulated"
        : "retry_simulated";

      break;
    }
  }

  return {
    index,
    jobId: prepared.jobId,
    notificationType:
      prepared.notificationType,
    attemptNumber,
    status,
    retryDelaySeconds,
    errorCode: null,
  };
}

/* ==========================================
   PROCESS ONE EXPLICIT SCENARIO

   The only allowed source of prepared email
   content is the File 43 validator.

   Repeated job IDs in a batch are rejected
   rather than simulated twice.
   ========================================== */

function processScenario(
  input: unknown,
  index: number,
  seenJobIds: Set<string>
): WorkerExecutionEntry {
  try {
    if (!isRecord(input)) {
      return rejectedEntry(index);
    }

    const attemptNumber =
      input.attemptNumber;

    const outcome =
      input.simulatedOutcome;

    if (
      typeof attemptNumber !== "number" ||
      !Number.isInteger(attemptNumber) ||
      attemptNumber < 1 ||
      attemptNumber > MAX_ATTEMPTS ||
      !isSimulatedOutcome(outcome)
    ) {
      return rejectedEntry(index);
    }

    /*
     * Validate and render using the real
     * File 43 + File 36 modules.
     *
     * No sending occurs in preparation.
     */

    const prepared =
      prepareQuotationEmailJob(
        input.jobData
      );

    /*
     * One simulation entry per job ID.
     */

    if (seenJobIds.has(prepared.jobId)) {
      return rejectedEntry(index);
    }

    seenJobIds.add(prepared.jobId);

    return simulatedEntry(
      index,
      prepared,
      attemptNumber,
      outcome
    );
  } catch {
    /*
     * Never expose raw validation errors,
     * customer data or message bodies.
     */

    return rejectedEntry(index);
  }
}

/* ==========================================
   MAIN ORCHESTRATOR

   This function is synchronous.

   It:
   - Reads no database information
   - Makes no provider calls
   - Creates no timers or background tasks
   - Returns a bounded in-memory report

   Supplying real database job data does
   not authorize real email delivery.
   ========================================== */

export function runDevelopmentEmailWorkerCycle(
  scenarios: unknown
): WorkerExecutionReport {
  assertSafeEnvironment();
  assertBatch(scenarios);

  const seenJobIds = new Set<string>();
  const entries: WorkerExecutionEntry[] = [];

  for (
    let index = 0;
    index < scenarios.length;
    index += 1
  ) {
    entries.push(
      processScenario(
        scenarios[index],
        index,
        seenJobIds
      )
    );
  }

  const count = (
    status: WorkerExecutionStatus
  ): number =>
    entries.filter(
      (entry) => entry.status === status
    ).length;

  const previewCount =
    count("preview_ready");

  const acceptedCount =
    count("acceptance_simulated");

  const retryCount =
    count("retry_simulated");

  const terminalCount =
    count("terminal_failure_simulated");

  const rejectedCount =
    count("rejected");

  return {
    mode: "development_simulation",
    total: scenarios.length,

    prepared:
      previewCount +
      acceptedCount +
      retryCount +
      terminalCount,

    acceptedSimulated: acceptedCount,
    retriesSimulated: retryCount,
    terminalFailuresSimulated:
      terminalCount,
    rejected: rejectedCount,

    databaseConnected: false,
    databaseModified: false,
    jobsClaimed: 0,
    providerCalls: 0,
    emailsSent: 0,

    entries,
  };
}

/* ==========================================
   END FILE 48

   Execution logic is simulated only.

   This is NOT an active email sender.
   ========================================== */
