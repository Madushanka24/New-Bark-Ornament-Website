
import "server-only";

/*
========================================================
BARK ORNAMENT (PVT) LTD

FILE 55 - SECURE WORKER HANDOFF DATABASE ADAPTER

File:
src/lib/quotation-email-worker-handoff-db.ts

REQUIRES
--------
File 44 - Restricted worker login
File 45 - Original worker database adapter
File 52 - Reconciliation hold protection
File 53 - Administrator reconciliation
File 54 - Durable provider handoff

PURPOSE
-------
- Connect using the dedicated worker login.
- Verify worker identity and permissions.
- Invoke File 54's restricted handoff function.
- Preserve PostgreSQL autocommit behavior.
- Treat uncertain database responses as unsafe.
- Never authorize sending from repeat handoffs.
- Expose no arbitrary SQL interface.

SAFETY
------
- Development only
- Local PostgreSQL only
- All three feature switches must be "false"
- Dedicated worker credentials required
- No direct table modification
- No provider calls
- No email sending
- No background worker loop
- No import-time database connection

This file is an additive companion to File 45.
========================================================
*/

import { Pool, type QueryResult } from "pg";

/* ==========================================
   PUBLIC TYPES
   ========================================== */

export type EmailWorkerHandoffStatus =
  | "handoff_started"
  | "already_handed_off"
  | "stale_lease";

export type QuotationWorkerHandoffDatabase =
  Readonly<{
    beginHandoff(
      jobId: string,
      leaseToken: string
    ): Promise<EmailWorkerHandoffStatus>;

    close(): Promise<void>;
  }>;

/* ==========================================
   CONSTANTS
   ========================================== */

const CONFIGURATION_ERROR =
  "Secure email-worker handoff configuration is unavailable.";

const IDENTITY_ERROR =
  "Secure email-worker handoff identity verification failed.";

const HANDOFF_UNCONFIRMED_ERROR =
  "Email-worker handoff result unconfirmed. Do not send.";

const CLOSED_ERROR =
  "Secure email-worker handoff database is closed.";

/*
 * PostgreSQL maximum signed BIGINT.
 *
 * Use BigInt() rather than a numeric literal
 * ending in "n" to remain compatible with
 * the project's TypeScript target.
 */

const MAX_PG_BIGINT =
  BigInt("9223372036854775807");

const JOB_ID_PATTERN =
  /^[1-9][0-9]{0,18}$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

/* ==========================================
   GENERIC RECORD HELPER
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

/* ==========================================
   FEATURE-SWITCH SAFETY

   Never allow an enabled or missing flag
   to silently default to a safe value.
   ========================================== */

function assertDevelopmentSafety(): void {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.QUOTATION_SUBMISSIONS_ENABLED !==
      "false" ||
    process.env.QUOTATION_E2E_TEST_MODE !==
      "false" ||
    process.env
      .QUOTATION_EMAIL_NOTIFICATIONS_ENABLED !==
      "false" ||
    process.env.DATABASE_SSL_MODE !==
      "disable"
  ) {
    throw new Error(CONFIGURATION_ERROR);
  }
}

/* ==========================================
   LOCAL CONNECTION-STRING VALIDATION
   ========================================== */

function parseLocalDatabaseUrl(
  value: string | undefined
): URL {
  if (!value) {
    throw new Error(CONFIGURATION_ERROR);
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(CONFIGURATION_ERROR);
  }

  if (
    parsed.protocol !== "postgresql:" &&
    parsed.protocol !== "postgres:"
  ) {
    throw new Error(CONFIGURATION_ERROR);
  }

  if (
    !LOCAL_HOSTS.has(
      parsed.hostname.toLowerCase()
    ) ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.pathname !== "/bark_ornament" ||
    !parsed.username ||
    !parsed.password
  ) {
    throw new Error(CONFIGURATION_ERROR);
  }

  /*
   * The local database may use a configured
   * non-default port, but it must be valid.
   */

  if (parsed.port) {
    const port = Number(parsed.port);

    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error(CONFIGURATION_ERROR);
    }
  }

  return parsed;
}

/* ==========================================
   VERIFY SEPARATE WORKER CREDENTIALS

   Do not return credential values in
   validation errors.
   ========================================== */

function getWorkerConnectionString(): string {
  assertDevelopmentSafety();

  const workerRaw =
    process.env.EMAIL_WORKER_DATABASE_URL;

  const websiteRaw =
    process.env.DATABASE_URL;

  const worker =
    parseLocalDatabaseUrl(workerRaw);

  const website =
    parseLocalDatabaseUrl(websiteRaw);

  let workerPassword: string;
  let websitePassword: string;

  try {
    workerPassword =
      decodeURIComponent(worker.password);

    websitePassword =
      decodeURIComponent(website.password);
  } catch {
    throw new Error(CONFIGURATION_ERROR);
  }

  if (
    worker.username !==
      "bark_email_worker_service" ||
    website.username ===
      "bark_email_worker_service" ||
    workerPassword.length < 24 ||
    workerPassword === websitePassword ||
    workerRaw === websiteRaw
  ) {
    throw new Error(CONFIGURATION_ERROR);
  }

  return workerRaw as string;
}

/* ==========================================
   INPUT VALIDATION

   PostgreSQL BIGINT:
     1 to 9223372036854775807

   Job IDs must use canonical positive
   decimal notation.

   Lease tokens must be UUID strings.
   ========================================== */

function validateJobId(
  value: unknown
): asserts value is string {
  if (
    typeof value !== "string" ||
    !JOB_ID_PATTERN.test(value) ||
    BigInt(value) > MAX_PG_BIGINT
  ) {
    throw new Error(
      "Invalid worker handoff job ID."
    );
  }
}

function validateLeaseToken(
  value: unknown
): asserts value is string {
  if (
    typeof value !== "string" ||
    !UUID_PATTERN.test(value)
  ) {
    throw new Error(
      "Invalid worker handoff lease token."
    );
  }
}

/* ==========================================
   IDENTIFY THE ACTUAL POSTGRESQL ROLE

   This query checks permissions without
   reading customer quotations or outbox
   records.

   The logged-in role must be the dedicated
   worker service account.

   Membership alone is not sufficient;
   excess table permissions are forbidden.
   ========================================== */

const IDENTITY_SQL = `
SELECT
  CURRENT_USER::TEXT AS login_name,
  SESSION_USER::TEXT AS session_name,
  CURRENT_DATABASE()::TEXT AS database_name,

  pg_has_role(
    CURRENT_USER,
    'bark_email_worker',
    'MEMBER'
  ) AS worker_member,

  has_function_privilege(
    CURRENT_USER,
    'public.begin_quotation_email_provider_handoff(bigint,uuid)',
    'EXECUTE'
  ) AS can_begin_handoff,

  has_function_privilege(
    CURRENT_USER,
    'public.resolve_quotation_email_reconciliation(bigint,text,text,text)',
    'EXECUTE'
  ) AS can_resolve,

  has_function_privilege(
    CURRENT_USER,
    'public.enqueue_quotation_email_notifications(uuid)',
    'EXECUTE'
  ) AS can_enqueue,

  has_table_privilege(
    CURRENT_USER,
    'public.quotation_email_outbox',
    'SELECT, INSERT, UPDATE, DELETE'
  ) AS outbox_table_access,

  has_table_privilege(
    CURRENT_USER,
    'public.quotations',
    'SELECT, INSERT, UPDATE, DELETE'
  ) AS quotation_table_access,

  has_table_privilege(
    CURRENT_USER,
    'public.quotation_email_reconciliation_holds',
    'SELECT, INSERT, UPDATE, DELETE'
  ) AS hold_table_access,

  has_table_privilege(
    CURRENT_USER,
    'public.quotation_email_provider_handoffs',
    'SELECT, INSERT, UPDATE, DELETE'
  ) AS handoff_table_access
`;

/* ==========================================
   VERIFY IDENTITY RESULT

   Do not trust a connection merely because
   the PostgreSQL URL contains the expected
   username.
   ========================================== */

function verifyWorkerIdentity(
  row: unknown
): void {
  if (!isRecord(row)) {
    throw new Error(IDENTITY_ERROR);
  }

  if (
    row.login_name !==
      "bark_email_worker_service" ||
    row.session_name !==
      "bark_email_worker_service" ||
    row.database_name !==
      "bark_ornament" ||
    row.worker_member !== true ||
    row.can_begin_handoff !== true ||
    row.can_resolve !== false ||
    row.can_enqueue !== false ||
    row.outbox_table_access !== false ||
    row.quotation_table_access !== false ||
    row.hold_table_access !== false ||
    row.handoff_table_access !== false
  ) {
    throw new Error(IDENTITY_ERROR);
  }
}

/* ==========================================
   RESTRICTED SQL HANDOFF

   This is the ONLY mutating operation exposed
   by this new adapter.

   A standalone pool.query() statement runs
   in PostgreSQL autocommit mode.

   The function's transaction must complete
   before a caller receives handoff_started.

   Do not wrap this method in an external
   transaction that remains uncommitted.
   ========================================== */

const HANDOFF_SQL = `
SELECT
  public.begin_quotation_email_provider_handoff(
    $1::BIGINT,
    $2::UUID
  ) AS handoff_status
`;

/* ==========================================
   MAIN CONNECTION FACTORY

   No connection is established on import.

   The returned adapter exposes only:
   - beginHandoff()
   - close()
   ========================================== */

export async function
connectQuotationWorkerHandoffDatabase():
Promise<QuotationWorkerHandoffDatabase> {

  const connectionString =
    getWorkerConnectionString();

  const pool = new Pool({
    connectionString,
    ssl: false,
    max: 1,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
  });

  let closed = false;

  /*
   * An uncertain query response is not
   * proof that the database rejected the
   * handoff.
   *
   * Once a query has an unknown outcome,
   * this adapter stops accepting further
   * handoff requests.
   *
   * Manual investigation or a fresh
   * authorized workflow is required.
   */

  let resultUnconfirmed = false;

  let closePromise: Promise<void> | null = null;

  try {
    const identityResult =
      await pool.query(IDENTITY_SQL);

    if (identityResult.rows.length !== 1) {
      throw new Error(IDENTITY_ERROR);
    }

    verifyWorkerIdentity(
      identityResult.rows[0]
    );
  } catch {
    try {
      await pool.end();
    } catch {
      /* Avoid revealing database error details. */
    }

    throw new Error(IDENTITY_ERROR);
  }

  const adapter: QuotationWorkerHandoffDatabase = {
    async beginHandoff(
      jobId: string,
      leaseToken: string
    ): Promise<EmailWorkerHandoffStatus> {

      if (closed) {
        throw new Error(CLOSED_ERROR);
      }

      assertDevelopmentSafety();

      if (resultUnconfirmed) {
        throw new Error(
          HANDOFF_UNCONFIRMED_ERROR
        );
      }

      validateJobId(jobId);
      validateLeaseToken(leaseToken);

      /*
       * Exactly one parameterized SQL statement.
       *
       * No arbitrary SQL or customer content
       * is accepted from the caller.
       */

      /*
       * Explicit QueryResult typing prevents
       * overload inference from producing void.
       */

      let result: QueryResult<{
        handoff_status: unknown;
      }>;

      try {
        result = await pool.query<{
          handoff_status: unknown;
        }>(
          HANDOFF_SQL,
          [jobId, leaseToken]
        );
      } catch {
        /*
         * A connection failure may occur AFTER
         * PostgreSQL committed the handoff.
         *
         * Do not assume that retrying the
         * operation is safe.
         */

        resultUnconfirmed = true;

        throw new Error(
          HANDOFF_UNCONFIRMED_ERROR
        );
      }

      const status =
        result.rows.length === 1
          ? result.rows[0].handoff_status
          : null;

      if (
        status !== "handoff_started" &&
        status !== "already_handed_off" &&
        status !== "stale_lease"
      ) {
        resultUnconfirmed = true;

        throw new Error(
          HANDOFF_UNCONFIRMED_ERROR
        );
      }

      /*
       * This returns the database classification.
       *
       * Only the first status means a newly
       * recorded handoff.
       *
       * No email is sent here.
       */

      return status;
    },

    async close(): Promise<void> {
      if (closePromise !== null) {
        return closePromise;
      }

      closed = true;

      closePromise = pool.end();

      return closePromise;
    },
  };

  return Object.freeze(adapter);
}

/* ==========================================
   END FILE 55

   The adapter does not contain:
   - An email provider
   - Provider credentials
   - SMTP/HTTP sending
   - A background worker loop
   - Automatic retries
   - Customer-data logging
   ========================================== */
