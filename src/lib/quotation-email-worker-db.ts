
import "server-only";

/*
====================================================
BARK ORNAMENT (PVT) LTD

FILE 45 - SECURE EMAIL WORKER DATABASE MODULE

src/lib/quotation-email-worker-db.ts

PURPOSE
-------
- Separate PostgreSQL worker connection
- Validate worker identity and database target
- Verify restricted PostgreSQL privileges
- Call approved worker functions only
- Validate arguments and query results
- Never expose arbitrary database queries

SECURITY
--------
- Development-only for now
- Local PostgreSQL only
- Dedicated worker login required
- Distinct website/worker credentials
- No client-side imports
- No email provider access
- No messages sent
- No automatic job claiming
- No connection at import time

DEPENDENCIES
------------
Files 40, 41, 42 and 44
pg / @types/pg already used by project
====================================================
*/

import { Pool } from "pg";

/* ==========================================
   PUBLIC TYPES
   ========================================== */

export type WorkerClaimedJob = Readonly<{
  jobId: string;
  quotationId: string;
  notificationType: "internal" | "customer";
  leaseToken: string;
  attemptNumber: number;
  leaseExpiresAt: Date;
}>;

export type WorkerFailureResult =
  | "retry_scheduled"
  | "failed"
  | "stale_lease";

/*
 * File 42 returns a database row with
 * product_items as a JSONB array.
 *
 * Treat its fields as unknown until
 * File 43 validates them.
 */

export type WorkerQuotationData =
  Readonly<Record<string, unknown>>;

export type QuotationWorkerDatabase = Readonly<{
  claimJobs(
    batchSize?: number
  ): Promise<WorkerClaimedJob[]>;

  getJobData(
    jobId: string,
    leaseToken: string
  ): Promise<WorkerQuotationData | null>;

  completeJob(
    jobId: string,
    leaseToken: string,
    providerMessageId: string
  ): Promise<boolean>;

  failJob(
    jobId: string,
    leaseToken: string,
    errorCode: string,
    permanent?: boolean
  ): Promise<WorkerFailureResult>;

  close(): Promise<void>;
}>;

/* ==========================================
   CONSTANTS
   ========================================== */

const REQUIRED_DATABASE =
  "bark_ornament";

const REQUIRED_USER =
  "bark_email_worker_service";

const ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const JOB_ID_PATTERN =
  /^[1-9][0-9]{0,18}$/;

const PROVIDER_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:/+@-]*$/;

const ERROR_CODE_PATTERN =
  /^[A-Z][A-Z0-9_]*$/;

const MAX_PG_BIGINT =
   BigInt("9223372036854775807");

/* ==========================================
   PRIVATE VALIDATION HELPERS
   ========================================== */

function configurationError(): Error {
  return new Error(
    "Secure email-worker database " +
    "configuration is unavailable."
  );
}

function databaseError(): Error {
  return new Error(
    "Secure email-worker database " +
    "operation failed."
  );
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateJobId(
  value: string
): string {
  if (
    typeof value !== "string" ||
    !JOB_ID_PATTERN.test(value)
  ) {
    throw new Error(
      "Invalid email-worker job ID."
    );
  }

  if (
    BigInt(value) > MAX_PG_BIGINT
  ) {
    throw new Error(
      "Invalid email-worker job ID."
    );
  }

  return value;
}

function validateUuid(
  value: string
): string {
  if (
    typeof value !== "string" ||
    !UUID_PATTERN.test(value)
  ) {
    throw new Error(
      "Invalid email-worker lease token."
    );
  }

  return value.toLowerCase();
}

function validateBatch(
  value: number
): number {
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > 10
  ) {
    throw new Error(
      "Worker batch size must be 1 to 10."
    );
  }

  return value;
}

function validateProviderId(
  value: string
): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 255 ||
    !PROVIDER_ID_PATTERN.test(value)
  ) {
    throw new Error(
      "Invalid provider message identifier."
    );
  }

  return value;
}

function validateErrorCode(
  value: string
): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 80 ||
    !ERROR_CODE_PATTERN.test(value)
  ) {
    throw new Error(
      "Invalid email-worker error code."
    );
  }

  return value;
}

/* ==========================================
   CONNECTION CONFIGURATION

   Reads secrets at connection time,
   not at module import time.

   Never return or log the connection URL.
   ========================================== */

function getWorkerConnectionString(): string {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env
      .QUOTATION_SUBMISSIONS_ENABLED !==
      "false" ||
    process.env
      .QUOTATION_E2E_TEST_MODE !== "false" ||
    process.env
      .QUOTATION_EMAIL_NOTIFICATIONS_ENABLED !==
      "false"
  ) {
    throw configurationError();
  }

  const raw =
    process.env.EMAIL_WORKER_DATABASE_URL;

  if (!raw) {
    throw configurationError();
  }

  try {
    const worker = new URL(raw);

    if (
      worker.protocol !== "postgresql:" &&
      worker.protocol !== "postgres:"
    ) {
      throw configurationError();
    }

    if (
      !ALLOWED_HOSTS.has(
        worker.hostname.toLowerCase()
      ) ||
      worker.search.length > 0 ||
      worker.hash.length > 0
    ) {
      throw configurationError();
    }

    const user = decodeURIComponent(
      worker.username
    );

    const password = decodeURIComponent(
      worker.password
    );

    const database = decodeURIComponent(
      worker.pathname.slice(1)
    );

    if (
      user !== REQUIRED_USER ||
      database !== REQUIRED_DATABASE ||
      !password ||
      password.length < 24
    ) {
      throw configurationError();
    }

    /*
     * The website must not share the
     * worker's database credentials.
     */

    const websiteUrl =
      process.env.DATABASE_URL;

    if (!websiteUrl) {
      throw configurationError();
    }

    const website = new URL(
      websiteUrl
    );

    const websiteUser =
      decodeURIComponent(
        website.username
      );

    const websitePassword =
      decodeURIComponent(
        website.password
      );

    if (
      websiteUser === user ||
      (
        websitePassword.length > 0 &&
        websitePassword === password
      ) ||
      websiteUrl === raw
    ) {
      throw configurationError();
    }

    if (
      process.env.DATABASE_SSL_MODE !==
      "disable"
    ) {
      throw configurationError();
    }

    /*
     * Local development uses SSL disabled.
     *
     * Production will require a separate
     * approved transport policy.
     */

    return raw;
  } catch {
    throw configurationError();
  }
}

/* ==========================================
   POSTGRESQL SESSION PERMISSION CHECK

   One read-only verification query.

   No quotation rows or emails are accessed.
   ========================================== */

type IdentityRow = {
  login_name: string;
  session_name: string;
  database_name: string;
  can_claim: boolean;
  can_retrieve: boolean;
  can_complete: boolean;
  can_fail: boolean;
  can_enqueue: boolean;
  can_read_quotations: boolean;
  can_read_items: boolean;
  can_read_outbox: boolean;
  can_write_outbox: boolean;
  can_create_objects: boolean;
  is_website_member: boolean;
};

const IDENTITY_SQL = `
  SELECT
    CURRENT_USER::text AS login_name,
    SESSION_USER::text AS session_name,
    CURRENT_DATABASE()::text AS database_name,

    has_function_privilege(
      CURRENT_USER,
      'public.claim_quotation_email_jobs(integer)',
      'EXECUTE'
    ) AS can_claim,

    has_function_privilege(
      CURRENT_USER,
      'public.get_quotation_email_job_data(bigint,uuid)',
      'EXECUTE'
    ) AS can_retrieve,

    has_function_privilege(
      CURRENT_USER,
      'public.complete_quotation_email_job(bigint,uuid,text)',
      'EXECUTE'
    ) AS can_complete,

    has_function_privilege(
      CURRENT_USER,
      'public.fail_quotation_email_job(bigint,uuid,text,boolean)',
      'EXECUTE'
    ) AS can_fail,

    has_function_privilege(
      CURRENT_USER,
      'public.enqueue_quotation_email_notifications(uuid)',
      'EXECUTE'
    ) AS can_enqueue,

    has_table_privilege(
      CURRENT_USER,
      'public.quotations',
      'SELECT'
    ) AS can_read_quotations,

    has_table_privilege(
      CURRENT_USER,
      'public.quotation_items',
      'SELECT'
    ) AS can_read_items,

    has_table_privilege(
      CURRENT_USER,
      'public.quotation_email_outbox',
      'SELECT'
    ) AS can_read_outbox,

    has_table_privilege(
      CURRENT_USER,
      'public.quotation_email_outbox',
      'INSERT, UPDATE, DELETE'
    ) AS can_write_outbox,

    has_schema_privilege(
      CURRENT_USER,
      'public',
      'CREATE'
    ) AS can_create_objects,

    pg_has_role(
      CURRENT_USER,
      'bark_web_dev',
      'MEMBER'
    ) AS is_website_member
`;

/* ==========================================
   CLAIM RESULT VALIDATION
   ========================================== */

function parseClaim(
  value: unknown
): WorkerClaimedJob {
  if (!isRecord(value)) {
    throw databaseError();
  }

  const jobId =
    validateJobId(
      String(value.job_id ?? "")
    );

  const quotationId =
    String(value.quotation_id ?? "");

  const leaseToken =
    String(value.lease_token ?? "");

  if (
    !UUID_PATTERN.test(quotationId) ||
    !UUID_PATTERN.test(leaseToken)
  ) {
    throw databaseError();
  }

  if (
    value.notification_type !== "internal" &&
    value.notification_type !== "customer"
  ) {
    throw databaseError();
  }

  const attemptNumber =
    Number(value.attempt_number);

  if (
    !Number.isInteger(attemptNumber) ||
    attemptNumber < 1 ||
    attemptNumber > 20
  ) {
    throw databaseError();
  }

  const expires =
    value.lease_expires_at;

  const leaseExpiresAt =
    expires instanceof Date
      ? expires
      : typeof expires === "string"
        ? new Date(expires)
        : new Date(Number.NaN);

  if (
    !Number.isFinite(
      leaseExpiresAt.getTime()
    )
  ) {
    throw databaseError();
  }

  return {
    jobId,
    quotationId:
      quotationId.toLowerCase(),
    notificationType:
      value.notification_type,
    leaseToken:
      leaseToken.toLowerCase(),
    attemptNumber,
    leaseExpiresAt,
  };
}

/* ==========================================
   WORKER DATABASE FACTORY

   No connection is created until called.

   The returned interface exposes only
   approved worker operations.

   There is no arbitrary query method.
   ========================================== */

export async function connectQuotationWorkerDatabase():
  Promise<QuotationWorkerDatabase> {
  const connectionString =
    getWorkerConnectionString();

  const pool = new Pool({
    connectionString,
    ssl: false,
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    application_name:
      "bark_quotation_email_worker_dev",
  });

  try {
    const result =
      await pool.query<IdentityRow>(
        IDENTITY_SQL
      );

    const role = result.rows[0];

    if (
      result.rows.length !== 1 ||
      !role ||
      role.login_name !== REQUIRED_USER ||
      role.session_name !== REQUIRED_USER ||
      role.database_name !== REQUIRED_DATABASE ||
      role.can_claim !== true ||
      role.can_retrieve !== true ||
      role.can_complete !== true ||
      role.can_fail !== true ||
      role.can_enqueue !== false ||
      role.can_read_quotations !== false ||
      role.can_read_items !== false ||
      role.can_read_outbox !== false ||
      role.can_write_outbox !== false ||
      role.can_create_objects !== false ||
      role.is_website_member !== false
    ) {
      throw databaseError();
    }
  } catch {
    try {
      await pool.end();
    } catch {
      // Never disclose connection details.
    }

    throw databaseError();
  }

  let closed = false;

  function ensureOpen(): void {
    if (closed) {
      throw new Error(
        "Email-worker database connection is closed."
      );
    }
  }

  return {
    async claimJobs(
      batchSize = 5
    ): Promise<WorkerClaimedJob[]> {
      ensureOpen();

      const batch =
        validateBatch(batchSize);

      try {
        const result = await pool.query(
          `
          SELECT *
          FROM public.claim_quotation_email_jobs(
            $1::integer
          )
          `,
          [batch]
        );

        if (
          result.rows.length > batch
        ) {
          throw databaseError();
        }

        return result.rows.map(
          parseClaim
        );
      } catch {
        throw databaseError();
      }
    },

    async getJobData(
      jobId: string,
      leaseToken: string
    ): Promise<WorkerQuotationData | null> {
      ensureOpen();

      const id = validateJobId(jobId);
      const token = validateUuid(
        leaseToken
      );

      try {
        const result = await pool.query(
          `
          SELECT *
          FROM public.get_quotation_email_job_data(
            $1::bigint,
            $2::uuid
          )
          `,
          [id, token]
        );

        if (result.rows.length > 1) {
          throw databaseError();
        }

        const row =
          result.rows[0] ?? null;

        if (
          row !== null &&
          !isRecord(row)
        ) {
          throw databaseError();
        }

        return row;
      } catch {
        throw databaseError();
      }
    },

    async completeJob(
      jobId: string,
      leaseToken: string,
      providerMessageId: string
    ): Promise<boolean> {
      ensureOpen();

      const id = validateJobId(jobId);
      const token = validateUuid(
        leaseToken
      );

      const providerId =
        validateProviderId(
          providerMessageId
        );

      try {
        const result = await pool.query<{
          completed: boolean;
        }>(
          `
          SELECT
            public.complete_quotation_email_job(
              $1::bigint,
              $2::uuid,
              $3::text
            ) AS completed
          `,
          [id, token, providerId]
        );

        if (
          result.rows.length !== 1 ||
          typeof result.rows[0]
            ?.completed !== "boolean"
        ) {
          throw databaseError();
        }

        return result.rows[0].completed;
      } catch {
        throw databaseError();
      }
    },

    async failJob(
      jobId: string,
      leaseToken: string,
      errorCode: string,
      permanent = false
    ): Promise<WorkerFailureResult> {
      ensureOpen();

      const id = validateJobId(jobId);
      const token = validateUuid(
        leaseToken
      );

      const code = validateErrorCode(
        errorCode
      );

      if (typeof permanent !== "boolean") {
        throw new Error(
          "Invalid permanent failure flag."
        );
      }

      try {
        const result = await pool.query<{
          outcome: string;
        }>(
          `
          SELECT
            public.fail_quotation_email_job(
              $1::bigint,
              $2::uuid,
              $3::text,
              $4::boolean
            ) AS outcome
          `,
          [id, token, code, permanent]
        );

        const outcome =
          result.rows[0]?.outcome;

        if (
          result.rows.length !== 1 ||
          (
            outcome !== "retry_scheduled" &&
            outcome !== "failed" &&
            outcome !== "stale_lease"
          )
        ) {
          throw databaseError();
        }

        return outcome;
      } catch {
        throw databaseError();
      }
    },

    async close(): Promise<void> {
      if (closed) {
        return;
      }

      closed = true;

      try {
        await pool.end();
      } catch {
        throw databaseError();
      }
    },
  };
}

/* ==========================================
   END FILE 45

   No email provider is connected.
   No jobs are claimed automatically.
   No customer data is logged.
   ========================================== */
