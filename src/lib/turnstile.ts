
import "server-only";

/* ==========================================
   BARK ORNAMENT (PVT) LTD
   CLOUDFLARE TURNSTILE VERIFICATION

   File: src/lib/turnstile.ts
   File number: 26

   Server-side only.

   Features:
   - Official Cloudflare Siteverify endpoint
   - Rejects missing or malformed tokens
   - Verifies hostname and action
   - Rejects failed or replayed tokens
   - Network timeout and safe error handling
   - Rejects testing secrets in production
   - Never exposes the private secret

   This module is not yet connected
   to the quotation API.
   ========================================== */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const MAX_TOKEN_LENGTH = 2048;
const VERIFY_TIMEOUT_MS = 5000;

const TEST_SECRETS = new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

/* ==========================================
   RESULT TYPES
   ========================================== */

export type TurnstileVerificationResult =
  | {
      success: true;
      reason: "verified";
    }
  | {
      success: false;
      reason:
        | "invalid_token"
        | "verification_failed"
        | "configuration_error"
        | "service_unavailable";
    };

type SiteverifyResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
};

/* ==========================================
   PRIVATE CONFIGURATION
   ========================================== */

function getTurnstileConfig(): {
  secret: string;
  hostnames: string[];
  action: string;
} | null {
  const secret =
    process.env.TURNSTILE_SECRET_KEY?.trim();

  const hostnameSetting =
    process.env.TURNSTILE_ALLOWED_HOSTNAMES
      ?.trim();

  const action =
    process.env.TURNSTILE_EXPECTED_ACTION
      ?.trim();

  if (
    !secret ||
    !hostnameSetting ||
    !action
  ) {
    return null;
  }

  if (secret.length > 256) {
    return null;
  }

  if (
    process.env.NODE_ENV === "production" &&
    TEST_SECRETS.has(secret)
  ) {
    return null;
  }

  const hostnames = hostnameSetting
    .split(",")
    .map((value) =>
      value.trim().toLowerCase()
    );

  if (
    hostnames.length === 0 ||
    hostnames.some(
      (hostname) =>
        hostname.length === 0 ||
        hostname.includes("/") ||
        hostname.includes(":") ||
        hostname.includes("*") ||
        /\s/.test(hostname)
    )
  ) {
    return null;
  }

  if (
    action.length > 64 ||
    !/^[a-zA-Z0-9_-]+$/.test(action)
  ) {
    return null;
  }

  return {
    secret,
    hostnames,
    action,
  };
}

/* ==========================================
   TOKEN FORMAT VALIDATION

   Tokens are opaque strings.
   Do not attempt to decode them.

   Reject invalid input before making
   an external verification request.
   ========================================== */

function validToken(
  token: unknown
): token is string {
  return (
    typeof token === "string" &&
    token.length > 0 &&
    token.length <= MAX_TOKEN_LENGTH &&
    token.trim() === token &&
    !/[\s\x00-\x1f\x7f]/.test(token)
  );
}

/* ==========================================
   RESPONSE SHAPE CHECK
   ========================================== */

function isSiteverifyResponse(
  value: unknown
): value is SiteverifyResponse {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const data = value as Record<
    string,
    unknown
  >;

  return (
    typeof data.success === "boolean"
  );
}

/* ==========================================
   VERIFY TURNSTILE TOKEN

   Call from a server-side API route.

   token:
     Browser-generated Turnstile token.

   Server sends private secret to
   Cloudflare over HTTPS.

   No verification bypass is allowed.
   ========================================== */

export async function verifyTurnstileToken(
  token: unknown
): Promise<TurnstileVerificationResult> {
  if (!validToken(token)) {
    return {
      success: false,
      reason: "invalid_token",
    };
  }

  const config = getTurnstileConfig();

  if (!config) {
    console.error(
      "Turnstile configuration unavailable."
    );

    return {
      success: false,
      reason: "configuration_error",
    };
  }

  try {
    const form = new URLSearchParams();

    form.set("secret", config.secret);
    form.set("response", token);

    const response = await fetch(
      SITEVERIFY_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: form.toString(),

        signal: AbortSignal.timeout(
          VERIFY_TIMEOUT_MS
        ),

        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        success: false,
        reason: "service_unavailable",
      };
    }

    const raw: unknown =
      await response.json();

    if (!isSiteverifyResponse(raw)) {
      return {
        success: false,
        reason: "service_unavailable",
      };
    }

    /* Reject failed Cloudflare checks,
       including invalid, expired or
       already-redeemed tokens. */

    if (!raw.success) {
      return {
        success: false,
        reason: "verification_failed",
      };
    }

    /* Verify that the token was issued
       for an approved website hostname. */

    if (
      typeof raw.hostname !== "string" ||
      !config.hostnames.includes(
        raw.hostname.toLowerCase()
      )
    ) {
      return {
        success: false,
        reason: "verification_failed",
      };
    }

    /* Verify the widget action matches
       the quotation submission action. */

    if (
      typeof raw.action !== "string" ||
      raw.action !== config.action
    ) {
      return {
        success: false,
        reason: "verification_failed",
      };
    }

    /* Cloudflare has verified the token,
       hostname and requested action. */

    return {
      success: true,
      reason: "verified",
    };
  } catch {
    /*
     * Includes network failures,
     * timeouts and malformed JSON.
     *
     * Never log or return:
     * - Turnstile secret
     * - Visitor token
     * - Raw service response
     */

    return {
      success: false,
      reason: "service_unavailable",
    };
  }
}
