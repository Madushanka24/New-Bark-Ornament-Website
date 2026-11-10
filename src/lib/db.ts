
import "server-only";

/* ==========================================
   BARK ORNAMENT - DATABASE CONNECTION

   File: src/lib/db.ts

   Database: PostgreSQL
   Driver: node-postgres (pg)

   Server-side only.
   Do not import into client components.
   ========================================== */

import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

/* ==========================================
   DATABASE CONFIGURATION
   ========================================== */

const POOL_MAX_CONNECTIONS = 5;

const CONNECTION_TIMEOUT_MS = 5000;

const IDLE_TIMEOUT_MS = 30000;

/* ==========================================
   GLOBAL POOL CACHE

   Helps prevent unnecessary new database
   pools during Next.js development reloads.
   ========================================== */

const globalForDatabase = globalThis as typeof globalThis & {
  barkDatabasePool?: Pool;
};

/* ==========================================
   DATABASE ENVIRONMENT SETTINGS
   ========================================== */

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url || !url.trim()) {
    throw new Error(
      "DATABASE_URL is not configured. " +
        "Add your PostgreSQL connection string " +
        "to the server environment."
    );
  }

  if (
    !url.startsWith("postgresql://") &&
    !url.startsWith("postgres://")
  ) {
    throw new Error(
      "DATABASE_URL must be a valid " +
        "PostgreSQL connection string."
    );
  }

  return url;
}

/* ==========================================
   TLS / SSL CONFIGURATION

   Local development:
     DATABASE_SSL_MODE=disable

   Hosted database:
     DATABASE_SSL_MODE=verify

   Do not disable certificate verification
   for a production database.
   ========================================== */

function getSslConfiguration():
  | { rejectUnauthorized: true }
  | false {
  const mode =
    process.env.DATABASE_SSL_MODE ??
    (process.env.NODE_ENV === "production"
      ? "verify"
      : "disable");

  if (mode === "disable") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Database TLS cannot be disabled " +
          "in production."
      );
    }

    return false;
  }

  if (mode === "verify") {
    return {
      rejectUnauthorized: true,
    };
  }

  throw new Error(
    "DATABASE_SSL_MODE must be " +
      "'disable' or 'verify'."
  );
}

/* ==========================================
   CREATE CONNECTION POOL
   ========================================== */

function createDatabasePool(): Pool {
  const pool = new Pool({
    connectionString: getDatabaseUrl(),

    ssl: getSslConfiguration(),

    max: POOL_MAX_CONNECTIONS,

    connectionTimeoutMillis:
      CONNECTION_TIMEOUT_MS,

    idleTimeoutMillis: IDLE_TIMEOUT_MS,
  });

  // Handle unexpected errors from idle clients.
  // Do not log passwords or connection strings.

  pool.on("error", (error: Error) => {
    console.error(
      "Bark Ornament database pool error:",
      error.message
    );
  });

  return pool;
}

/* ==========================================
   GET SHARED DATABASE POOL

   Create the pool lazily when the
   server actually needs database access.
   ========================================== */

export function getDatabasePool(): Pool {
  if (!globalForDatabase.barkDatabasePool) {
    globalForDatabase.barkDatabasePool =
      createDatabasePool();
  }

  return globalForDatabase.barkDatabasePool;
}

/* ==========================================
   EXECUTE PARAMETERIZED QUERY

   Always use $1, $2, etc. for values.

   Example:
     databaseQuery(
       "SELECT * FROM quotations WHERE id = $1",
       [quotationId]
     );

   Never concatenate untrusted customer
   input into SQL statements.
   ========================================== */

export async function databaseQuery<
  T extends QueryResultRow = QueryResultRow
>(
  sql: string,
  values: readonly unknown[] = []
): Promise<QueryResult<T>> {
  const pool = getDatabasePool();

  return pool.query<T>(sql, [...values]);
}

/* ==========================================
   GET CLIENT FOR TRANSACTIONS

   IMPORTANT:
   Whoever calls this function must
   release the client in a finally block.
   ========================================== */

export async function getDatabaseClient():
  Promise<PoolClient> {
  const pool = getDatabasePool();

  return pool.connect();
}

/* ==========================================
   DATABASE HEALTH CHECK

   Tests whether PostgreSQL responds.

   This must only be called server-side.
   Do not expose detailed database errors
   in public HTTP responses.
   ========================================== */

export async function checkDatabaseConnection():
  Promise<boolean> {
  try {
    const result = await databaseQuery<{
      database_ok: number;
    }>("SELECT 1 AS database_ok");

    return result.rows[0]?.database_ok === 1;
  } catch {
    return false;
  }
}

