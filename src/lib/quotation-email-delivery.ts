
import "server-only";

/*
========================================================
BARK ORNAMENT (PVT) LTD

FILE 51 - SECURE EMAIL DELIVERY CONTRACT

src/lib/quotation-email-delivery.ts

PURPOSE
-------
- Define provider-independent delivery outcomes
- Distinguish acceptance, temporary failure,
  permanent failure and uncertain delivery
- Model the retry policy from File 41
- Validate fictional email job data
- Produce safe, simulated delivery decisions
- Prevent uncertain deliveries from being
  treated as confirmed successes or failures

SAFETY
------
- Development mode only
- All submission/email switches must be false
- Fictional .invalid recipients only
- Mock provider identifiers only
- No PostgreSQL access
- No HTTP or SMTP connections
- No sending or background execution
- No job completion or failure mutations

THIS IS NOT AN EMAIL PROVIDER IMPLEMENTATION.
========================================================
*/

import {
  prepareQuotationEmailJob,
} from "@/lib/quotation-email-worker";

/* ==========================================
   PROVIDER-INDEPENDENT OUTCOME CONTRACT

   A future real provider adapter will
   need separate authorization, credentials,
   tests and delivery safeguards.
   ========================================== */

export type TemporaryDeliveryErrorCode =
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE_BEFORE_SEND"
  | "CONNECTION_FAILED_BEFORE_SEND";

export type PermanentDeliveryErrorCode =
  | "RECIPIENT_REJECTED"
  | "INVALID_RECIPIENT"
  | "INVALID_SENDER";

export type UncertainDeliveryErrorCode =
  | "PROVIDER_TIMEOUT_AFTER_SUBMIT"
  | "CONNECTION_LOST_AFTER_SUBMIT"
  | "UNKNOWN_PROVIDER_ACCEPTANCE";

export type SimulatedProviderOutcome =
  | Readonly<{
      kind: "accepted";
      providerMessageId: string;
    }>
  | Readonly<{
      kind: "temporary_failure";
      errorCode: TemporaryDeliveryErrorCode;
    }>
  | Readonly<{
      kind: "permanent_failure";
      errorCode: PermanentDeliveryErrorCode;
    }>
  | Readonly<{
      kind: "uncertain";
      errorCode: UncertainDeliveryErrorCode;
    }>;

/* ==========================================
   SIMULATION DECISION

   All output statuses explicitly indicate
   that the result is simulated.

   recommendedAction describes what a
   future authorized worker would need
   to consider. It does NOT execute it.
   ========================================== */

export type SimulatedDeliveryStatus =
  | "acceptance_simulated"
  | "retry_simulated"
  | "terminal_failure_simulated"
  | "uncertain_simulated";

export type DeliveryRecommendedAction =
  | "complete_after_real_acceptance"
  | "retry_after_confirmed_pre_send_failure"
  | "mark_failed_after_confirmed_failure"
  | "reconcile_before_retry";

export type SimulatedEmailDeliveryDecision =
  Readonly<{
    mode: "simulation";
    status: SimulatedDeliveryStatus;
    recommendedAction: DeliveryRecommendedAction;

    notificationType: "internal" | "customer";
    attemptNumber: number;

    failureCode:
      | TemporaryDeliveryErrorCode
      | PermanentDeliveryErrorCode
      | UncertainDeliveryErrorCode
      | null;

    mockProviderMessageId: string | null;
    retryDelaySeconds: number | null;

    requiresReconciliation: boolean;

    providerCalled: false;
    emailSent: false;
    databaseConnected: false;
    databaseModified: false;
  }>;

/* ==========================================
   SAFETY CONSTANTS
   ========================================== */

const MAX_ATTEMPTS = 20;
const MAX_RETRY_SECONDS = 3600;

const MAX_PROVIDER_ID_LENGTH = 255;

const MOCK_PROVIDER_ID_PATTERN =
  /^mock-[A-Za-z0-9][A-Za-z0-9._:/+@-]*$/;

const FICTIONAL_EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.invalid$/i;

const TEMPORARY_CODES =
  new Set<TemporaryDeliveryErrorCode>([
    "RATE_LIMITED",
    "PROVIDER_UNAVAILABLE_BEFORE_SEND",
    "CONNECTION_FAILED_BEFORE_SEND",
  ]);

const PERMANENT_CODES =
  new Set<PermanentDeliveryErrorCode>([
    "RECIPIENT_REJECTED",
    "INVALID_RECIPIENT",
    "INVALID_SENDER",
  ]);

const UNCERTAIN_CODES =
  new Set<UncertainDeliveryErrorCode>([
    "PROVIDER_TIMEOUT_AFTER_SUBMIT",
    "CONNECTION_LOST_AFTER_SUBMIT",
    "UNKNOWN_PROVIDER_ACCEPTANCE",
  ]);

/* ==========================================
   SAFE ENVIRONMENT

   The settings must explicitly be false.

   No implicit or permissive defaults.
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
      "Email delivery simulation is disabled."
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

function invalidOutcome(): never {
  throw new Error(
    "Invalid simulated provider outcome."
  );
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): void {
  const actual = Object.keys(value);

  if (
    actual.length !== expected.length ||
    !expected.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(
          value,
          key
        )
    )
  ) {
    invalidOutcome();
  }
}

/* ==========================================
   VALIDATE SIMULATED PROVIDER RESULT

   Do not accept:
   - Raw HTTP response objects
   - Raw provider error messages
   - Unrecognized error codes
   - Credentials
   - Arbitrary extra fields
   - Real provider message IDs

   Each test outcome has exactly two
   explicitly permitted fields.
   ========================================== */

function validateOutcome(
  value: unknown
): SimulatedProviderOutcome {
  if (!isRecord(value)) {
    invalidOutcome();
  }

  if (value.kind === "accepted") {
    assertExactKeys(
      value,
      ["kind", "providerMessageId"]
    );

    const id = value.providerMessageId;

    if (
      typeof id !== "string" ||
      id.length > MAX_PROVIDER_ID_LENGTH ||
      !MOCK_PROVIDER_ID_PATTERN.test(id)
    ) {
      invalidOutcome();
    }

    return {
      kind: "accepted",
      providerMessageId: id,
    };
  }

  if (value.kind === "temporary_failure") {
    assertExactKeys(
      value,
      ["kind", "errorCode"]
    );

    if (
      typeof value.errorCode !== "string" ||
      !TEMPORARY_CODES.has(
        value.errorCode as TemporaryDeliveryErrorCode
      )
    ) {
      invalidOutcome();
    }

    return {
      kind: "temporary_failure",
      errorCode:
        value.errorCode as TemporaryDeliveryErrorCode,
    };
  }

  if (value.kind === "permanent_failure") {
    assertExactKeys(
      value,
      ["kind", "errorCode"]
    );

    if (
      typeof value.errorCode !== "string" ||
      !PERMANENT_CODES.has(
        value.errorCode as PermanentDeliveryErrorCode
      )
    ) {
      invalidOutcome();
    }

    return {
      kind: "permanent_failure",
      errorCode:
        value.errorCode as PermanentDeliveryErrorCode,
    };
  }

  if (value.kind === "uncertain") {
    assertExactKeys(
      value,
      ["kind", "errorCode"]
    );

    if (
      typeof value.errorCode !== "string" ||
      !UNCERTAIN_CODES.has(
        value.errorCode as UncertainDeliveryErrorCode
      )
    ) {
      invalidOutcome();
    }

    return {
      kind: "uncertain",
      errorCode:
        value.errorCode as UncertainDeliveryErrorCode,
    };
  }

  return invalidOutcome();
}

/* ==========================================
   VALIDATE DELIVERY ATTEMPT

   File 40 increments attempts on claim.
   File 41 does not increment attempts
   again when recording a failure.
   ========================================== */

function validateAttempt(
  value: number
): number {
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_ATTEMPTS
  ) {
    throw new Error(
      "Invalid simulated email attempt."
    );
  }

  return value;
}

/* ==========================================
   RETRY DELAY

   Matches File 41:

   Attempt 1 = 60 seconds
   Attempt 2 = 120 seconds
   Attempt 3 = 240 seconds
   Attempt 4 = 480 seconds
   Attempt 5 = 960 seconds
   Attempt 6 = 1920 seconds
   Attempt 7+ = 3600 seconds
   Attempt 20 = no retry

   This function calculates a delay only.
   It does not schedule a job.
   ========================================== */

export function getEmailDeliveryRetryDelay(
  attemptNumber: number
): number | null {
  const attempt =
    validateAttempt(attemptNumber);

  if (attempt === MAX_ATTEMPTS) {
    return null;
  }

  return Math.min(
    MAX_RETRY_SECONDS,
    60 * 2 ** Math.min(
      attempt - 1,
      6
    )
  );
}

/* ==========================================
   FICTIONAL DATA VALIDATION

   The worker preparation function validates
   the quotation and renders File 36 content.

   File 51 additionally insists on a fictional
   .invalid recipient even for internal jobs,
   whose prepared output does not otherwise
   expose the customer's email address.
   ========================================== */

function prepareFictionalJob(
  input: unknown
): "internal" | "customer" {
  if (!isRecord(input)) {
    throw new Error(
      "Invalid fictional email job data."
    );
  }

  const email =
    input.customer_email;

  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !FICTIONAL_EMAIL_PATTERN.test(email) ||
    email.toLowerCase() ===
      "fixture@example.invalid"
  ) {
    throw new Error(
      "Fictional email job required."
    );
  }

  try {
    const prepared =
      prepareQuotationEmailJob(input);

    if (
      !prepared.message.subject ||
      !prepared.message.text ||
      !prepared.message.html
    ) {
      throw new Error(
        "Missing prepared content."
      );
    }

    return prepared.notificationType;
  } catch {
    /*
     * No raw customer values or
     * template content are included
     * in this error message.
     */

    throw new Error(
      "Invalid fictional email job data."
    );
  }
}

/* ==========================================
   MAIN PROVIDER-INDEPENDENT SIMULATION

   Input:
   - Fictional File 42-shaped job data
   - Explicit mocked provider outcome
   - Current attempt number (1-20)

   Output:
   - Simulated classification
   - Hypothetical next action
   - Safe error code / mock provider ID
   - Retry delay, where appropriate
   - Explicit zero side effects

   NO:
   - Real provider calls
   - PostgreSQL connections
   - Job completion
   - Job failure updates
   - Timers
   - Email delivery
   ========================================== */

export function simulateEmailDeliveryDecision(
  jobData: unknown,
  providerOutcome: unknown,
  attemptNumber: number
): SimulatedEmailDeliveryDecision {
  assertSafeEnvironment();

  const attempt =
    validateAttempt(attemptNumber);

  const outcome =
    validateOutcome(providerOutcome);

  const notificationType =
    prepareFictionalJob(jobData);

  const base = {
    mode: "simulation" as const,
    notificationType,
    attemptNumber: attempt,
    providerCalled: false as const,
    emailSent: false as const,
    databaseConnected: false as const,
    databaseModified: false as const,
  };

  switch (outcome.kind) {
    case "accepted":
      return {
        ...base,
        status: "acceptance_simulated",
        recommendedAction:
          "complete_after_real_acceptance",
        failureCode: null,
        mockProviderMessageId:
          outcome.providerMessageId,
        retryDelaySeconds: null,
        requiresReconciliation: false,
      };

    case "temporary_failure": {
      const delay =
        getEmailDeliveryRetryDelay(
          attempt
        );

      if (delay === null) {
        return {
          ...base,
          status: "terminal_failure_simulated",
          recommendedAction:
            "mark_failed_after_confirmed_failure",
          failureCode: outcome.errorCode,
          mockProviderMessageId: null,
          retryDelaySeconds: null,
          requiresReconciliation: false,
        };
      }

      return {
        ...base,
        status: "retry_simulated",
        recommendedAction:
          "retry_after_confirmed_pre_send_failure",
        failureCode: outcome.errorCode,
        mockProviderMessageId: null,
        retryDelaySeconds: delay,
        requiresReconciliation: false,
      };
    }

    case "permanent_failure":
      return {
        ...base,
        status: "terminal_failure_simulated",
        recommendedAction:
          "mark_failed_after_confirmed_failure",
        failureCode: outcome.errorCode,
        mockProviderMessageId: null,
        retryDelaySeconds: null,
        requiresReconciliation: false,
      };

    case "uncertain":
      return {
        ...base,
        status: "uncertain_simulated",
        recommendedAction:
          "reconcile_before_retry",
        failureCode: outcome.errorCode,
        mockProviderMessageId: null,
        retryDelaySeconds: null,
        requiresReconciliation: true,
      };
  }
}

/* ==========================================
   END FILE 51

   This module is intentionally passive.

   No external email provider.
   No PostgreSQL lifecycle updates.
   No actual messages delivered.
   ========================================== */
