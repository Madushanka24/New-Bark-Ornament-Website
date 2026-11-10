
import "server-only";

/*
========================================================
BARK ORNAMENT (PVT) LTD

FILE 46 - CONTROLLED EMAIL WORKER DRY-RUN RUNNER

src/lib/quotation-email-worker-runner.ts

PURPOSE
-------
- Process explicitly supplied test job batches
- Reuse the File 43 dry-run preparation layer
- Isolate job validation failures
- Produce bounded, privacy-safe summaries
- Enforce development safety settings

DOES NOT
--------
- Connect to PostgreSQL
- Claim, complete or fail any database job
- Increment database attempt counters
- Open network connections
- Deliver email
- Log email content or customer details
- Automatically schedule or repeat work

This is not yet a production email worker.
========================================================
*/

import {
  dryRunQuotationEmailJob,
  type QuotationEmailDryRunResult,
} from "@/lib/quotation-email-worker";

/* ==========================================
   EXPORTED TYPES
   ========================================== */

export type EmailWorkerDryRunFailureCode =
  | "INVALID_JOB_DATA";

export type EmailWorkerDryRunSuccess =
  Readonly<{
    index: number;
    success: true;
    result: QuotationEmailDryRunResult;
  }>;

export type EmailWorkerDryRunFailure =
  Readonly<{
    index: number;
    success: false;
    code: EmailWorkerDryRunFailureCode;
  }>;

export type EmailWorkerDryRunEntry =
  | EmailWorkerDryRunSuccess
  | EmailWorkerDryRunFailure;

export type EmailWorkerDryRunReport =
  Readonly<{
    mode: "dry_run";
    total: number;
    prepared: number;
    rejected: number;
    sent: false;
    databaseConnected: false;
    databaseModified: false;
    jobsClaimed: 0;
    entries: readonly EmailWorkerDryRunEntry[];
  }>;

/* ==========================================
   BATCH LIMITS
   ========================================== */

const MAX_BATCH_SIZE = 10;

/* ==========================================
   ENVIRONMENT SAFETY

   The runner is permitted only during
   local application development.

   No implicit defaults for the three
   safety switches: each must explicitly
   equal "false".
   ========================================== */

function assertDryRunEnvironment(): void {
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
      "Email worker dry-run environment is not safe."
    );
  }
}

/* ==========================================
   INPUT VALIDATION

   Accept only an actual array with at most
   10 entries. Empty arrays are allowed.

   We deliberately do not accept generators,
   database clients or callback functions.
   ========================================== */

function assertBatch(
  input: unknown
): asserts input is readonly unknown[] {
  if (
    !Array.isArray(input) ||
    input.length > MAX_BATCH_SIZE
  ) {
    throw new Error(
      "Invalid email worker dry-run batch."
    );
  }
}

/* ==========================================
   ONE-JOB PREPARATION

   The File 43 function:
   - Validates quotation and product fields
   - Blocks synthetic references/products
   - Renders the appropriate email
   - Returns only safe metadata

   This wrapper never returns exception
   messages that might contain data from
   a malformed database record.

   Every failed entry receives only a
   fixed, generic classification.
   ========================================== */

function prepareEntry(
  input: unknown,
  index: number
): EmailWorkerDryRunEntry {
  try {
    const result =
      dryRunQuotationEmailJob(input);

    /*
     * Defence in depth:
     * Do not report a prepared entry if
     * the lower layer ever reports a send
     * or database modification.
     */

    if (
      result.mode !== "dry_run" ||
      result.rendered !== true ||
      result.sent !== false ||
      result.databaseModified !== false
    ) {
      throw new Error(
        "Invalid dry-run result."
      );
    }

    return {
      index,
      success: true,
      result,
    };
  } catch {
    /*
     * Do not expose raw errors or
     * supplied customer information.
     */

    return {
      index,
      success: false,
      code: "INVALID_JOB_DATA",
    };
  }
}

/* ==========================================
   MAIN DRY-RUN BATCH RUNNER

   Important:
   - Does not import the database module
   - Does not call worker claim functions
   - Does not send email
   - Does not mutate the supplied input
   - Does not write to the console

   A future worker runner will be a
   separate, explicitly authorized
   implementation.
   ========================================== */

export function runQuotationEmailWorkerDryRun(
  jobs: unknown
): EmailWorkerDryRunReport {
  assertDryRunEnvironment();
  assertBatch(jobs);

  const entries: EmailWorkerDryRunEntry[] = [];

  let prepared = 0;
  let rejected = 0;

  for (
    let index = 0;
    index < jobs.length;
    index += 1
  ) {
    const entry = prepareEntry(
      jobs[index],
      index
    );

    entries.push(entry);

    if (entry.success) {
      prepared += 1;
    } else {
      rejected += 1;
    }
  }

  return {
    mode: "dry_run",
    total: jobs.length,
    prepared,
    rejected,
    sent: false,
    databaseConnected: false,
    databaseModified: false,
    jobsClaimed: 0,
    entries,
  };
}

/* ==========================================
   END FILE 46

   In-memory dry-run only.

   No email delivery.
   No database calls.
   No automatic worker execution.
   ========================================== */
