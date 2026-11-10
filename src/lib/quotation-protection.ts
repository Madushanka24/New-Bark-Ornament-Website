
import "server-only";

/* ==========================================
   BARK ORNAMENT - QUOTATION PROTECTION

   File: src/lib/quotation-protection.ts

   Server-side security module.

   Uses:
   - Node.js HMAC-SHA-256
   - PostgreSQL rate-limit function (File 20)
   - Database helper (File 17)

   This file does not modify the API route.
   ========================================== */

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import type { NextRequest } from "next/server";

import { databaseQuery } from "@/lib/db";

/* ==========================================
   RATE-LIMIT SETTINGS
   ========================================== */

const WINDOW_SECONDS = 3600;

const IP_MAX_ATTEMPTS = 5;
const EMAIL_MAX_ATTEMPTS = 5;

/*
 * Only these proxy headers can be configured.
 *
 * IMPORTANT:
 * A header is trusted ONLY when your
 * hosting infrastructure guarantees that
 * incoming client-supplied copies are removed
 * or overwritten by a trusted proxy.
 */

const TRUSTED_IP_HEADERS = [
  "cf-connecting-ip",
  "x-real-ip",
  "fly-client-ip",
  "true-client-ip",
] as const;

type TrustedIpHeader =
  (typeof TRUSTED_IP_HEADERS)[number];

/* ==========================================
   RETURN TYPES
   ========================================== */

export type QuotationProtectionResult =
  | {
      allowed: true;
      retryAfterSeconds: 0;
      reason: "allowed";
    }
  | {
      allowed: false;
      retryAfterSeconds: number;
      reason: "rate_limited";
    }
  | {
      allowed: false;
      retryAfterSeconds: 0;
      reason: "unavailable";
    };

type IdentityType = "ip" | "email";

type DatabaseRateLimitRow = {
  allowed: boolean;
  attempts: number;
  retry_after_seconds: number;
};

/* ==========================================
   PRIVATE CONFIGURATION
   ========================================== */

function getHmacKey(): Buffer {
  const value =
    process.env.QUOTATION_RATE_LIMIT_HMAC_KEY;

  /*
   * Require a 32-byte key encoded as
   * exactly 64 hexadecimal characters.
   */

  if (
    !value ||
    !/^[0-9a-fA-F]{64}$/.test(value)
  ) {
    throw new Error(
      "Quotation HMAC key is missing or invalid."
    );
  }

  return Buffer.from(value, "hex");
}

function getTrustedIpHeader():
  TrustedIpHeader | null {
  const value = process.env
    .QUOTATION_TRUSTED_IP_HEADER
    ?.trim()
    .toLowerCase();

  if (!value) {
    return null;
  }

  if (
    TRUSTED_IP_HEADERS.some(
      (header) => header === value
    )
  ) {
    return value as TrustedIpHeader;
  }

  throw new Error(
    "Unsupported trusted IP header."
  );
}

/* ==========================================
   DEVELOPMENT-ONLY CLIENT IDENTITY

   Next.js local development often runs
   without a trusted reverse proxy.

   We assign one shared local identity
   to direct localhost development requests.

   NEVER use this fallback in production.
   ========================================== */

function isLocalDevelopment(
  request: NextRequest
): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const hostname =
    request.nextUrl.hostname.toLowerCase();

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

/* ==========================================
   EXTRACT CLIENT IDENTITY

   Do not automatically trust
   x-forwarded-for or arbitrary client headers.

   A configured trusted proxy must
   overwrite the selected IP header.
   ========================================== */

function getClientIdentity(
  request: NextRequest
): string | null {
  const header = getTrustedIpHeader();

  if (header) {
    const rawIp = request.headers.get(header);

    if (!rawIp) {
      return null;
    }

    const ip = rawIp.trim();

    /*
     * Reject lists, ports, malformed values,
     * and anything other than a single IP.
     */

    if (isIP(ip) === 0) {
      return null;
    }

    return ip.toLowerCase();
  }

  if (isLocalDevelopment(request)) {
    return "local-development-client";
  }

  return null;
}

/* ==========================================
   HASH IDENTIFIERS

   HMAC prevents storing raw IP addresses
   or customer emails in the counter table.

   Domain separation prevents identical
   values across identity types sharing
   the same derived hash input.
   ========================================== */

function hashIdentity(
  type: IdentityType,
  value: string,
  key: Buffer
): string {
  return createHmac("sha256", key)
    .update("bark-quotation-rate-limit:v1:")
    .update(type)
    .update(":")
    .update(value)
    .digest("hex");
}

/* ==========================================
   NORMALIZE EMAIL

   This is used only for rate-limit identity.

   Email validation belongs to File 16.
   ========================================== */

function normalizeEmail(
  email: string
): string | null {
  const normalized = email.trim().toLowerCase();

  if (
    normalized.length === 0 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

/* ==========================================
   DATABASE CHECK

   Calls the PostgreSQL function in File 20.

   The SQL uses parameterized values.
   ========================================== */

async function checkIdentityLimit(
  type: IdentityType,
  identity: string,
  maximum: number,
  key: Buffer
): Promise<QuotationProtectionResult> {
  const hashedIdentity = hashIdentity(
    type,
    identity,
    key
  );

  const result =
    await databaseQuery<DatabaseRateLimitRow>(
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
        type,
        hashedIdentity,
        maximum,
        WINDOW_SECONDS,
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
    return {
      allowed: false,
      reason: "rate_limited",
      retryAfterSeconds: Math.max(
        1,
        Number(row.retry_after_seconds) || 1
      ),
    };
  }

  return {
    allowed: true,
    reason: "allowed",
    retryAfterSeconds: 0,
  };
}

/* ==========================================
   MAIN PROTECTION FUNCTION

   Call this function from the API AFTER
   quotation validation and BEFORE opening
   the quotation insert transaction.

   Returns one of:
   - allowed
   - rate_limited
   - unavailable

   Fail closed if configuration, database
   or trusted client identity is missing.
   ========================================== */

export async function checkQuotationProtection(
  request: NextRequest,
  customerEmail: string
): Promise<QuotationProtectionResult> {
  try {
    const key = getHmacKey();

    const ipIdentity = getClientIdentity(request);

    const emailIdentity =
      normalizeEmail(customerEmail);

    if (!ipIdentity || !emailIdentity) {
      return {
        allowed: false,
        reason: "unavailable",
        retryAfterSeconds: 0,
      };
    }

    /* Check IP identity first. */

    const ipCheck = await checkIdentityLimit(
      "ip",
      ipIdentity,
      IP_MAX_ATTEMPTS,
      key
    );

    if (!ipCheck.allowed) {
      return ipCheck;
    }

    /* Also check the customer email. */

    const emailCheck = await checkIdentityLimit(
      "email",
      emailIdentity,
      EMAIL_MAX_ATTEMPTS,
      key
    );

    if (!emailCheck.allowed) {
      return emailCheck;
    }

    return {
      allowed: true,
      reason: "allowed",
      retryAfterSeconds: 0,
    };
  } catch {
    /*
     * Do not expose database errors,
     * secrets, IP addresses or emails
     * to the browser or application logs.
     */

    console.error(
      "Quotation protection check unavailable."
    );

    return {
      allowed: false,
      reason: "unavailable",
      retryAfterSeconds: 0,
    };
  }
}
