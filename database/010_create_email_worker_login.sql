
/*
============================================================
BARK ORNAMENT (PVT) LTD

FILE 44 - SECURE EMAIL WORKER DATABASE IDENTITY

File:
database/010_create_email_worker_login.sql

PURPOSE
-------
- Create a dedicated worker service account.
- Keep the account NOLOGIN until password setup.
- Inherit only the worker permission role.
- Restrict database connections and privileges.
- Prevent the website role from impersonating
  the email worker.
- Require a private password before activation.

REQUIREMENTS
------------
Database: bark_ornament
Run as PostgreSQL administrator: postgres

Requires Files 37 through 42.

IMPORTANT
---------
Never put database passwords in this file.

The login stays DISABLED after migration.
It must be activated separately in pgAdmin
only after setting a strong private password.

No emails are sent by this migration.
============================================================
*/

BEGIN;

/* ========================================================
   1. VERIFY THE EXISTING WORKER PERMISSION ROLE
   ======================================================== */

DO $verify$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = 'bark_email_worker'
      AND rolcanlogin = FALSE
      AND rolsuper = FALSE
      AND rolcreatedb = FALSE
      AND rolcreaterole = FALSE
  ) THEN
    RAISE EXCEPTION
      'File 40 worker permission role is missing '
      'or has unexpected privileges.';
  END IF;

  IF pg_catalog.pg_has_role(
    'bark_web_dev',
    'bark_email_worker',
    'MEMBER'
  ) THEN
    RAISE EXCEPTION
      'Security failure: website belongs '
      'to the email worker role.';
  END IF;

END;
$verify$;

/* ========================================================
   2. CREATE A DISABLED SERVICE ACCOUNT

   NOLOGIN:
   No database authentication is possible yet.

   INHERIT:
   Allows the account to inherit the narrowly
   granted worker-function privileges.

   CONNECTION LIMIT 2:
   Provides an initial connection restriction.
   PostgreSQL superusers are not subject to this
   limit, which is why this account is NOSUPERUSER.
   ======================================================== */

DO $create$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname =
      'bark_email_worker_service'
  ) THEN

    CREATE ROLE bark_email_worker_service
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS
      INHERIT
      CONNECTION LIMIT 2;

  END IF;

END;
$create$;

/* ========================================================
   3. ENFORCE RESTRICTED ROLE ATTRIBUTES

   Rerunning the migration cannot accidentally
   leave an existing service role with LOGIN
   or administrator attributes enabled.

   An existing password is not exposed or logged.
   ======================================================== */

ALTER ROLE bark_email_worker_service
  NOLOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS
  INHERIT
  CONNECTION LIMIT 2;

/* ========================================================
   4. CHECK FOR UNEXPECTED ROLE MEMBERSHIPS

   The new service identity must not inherit
   permissions from any other database role.
   ======================================================== */

DO $memberships$
DECLARE
  v_unexpected INTEGER;
BEGIN

  SELECT COUNT(*)::INTEGER
  INTO v_unexpected
  FROM pg_catalog.pg_auth_members AS m
  JOIN pg_catalog.pg_roles AS member_role
    ON member_role.oid = m.member
  JOIN pg_catalog.pg_roles AS granted_role
    ON granted_role.oid = m.roleid
  WHERE member_role.rolname =
      'bark_email_worker_service'
    AND granted_role.rolname <>
      'bark_email_worker';

  IF v_unexpected <> 0 THEN
    RAISE EXCEPTION
      'Worker service has unexpected role memberships.';
  END IF;

END;
$memberships$;

/* ========================================================
   5. GRANT ONLY THE EXISTING WORKER ROLE

   The existing bark_email_worker role already
   has the exact function permissions needed.

   The website account does not receive
   worker membership.
   ======================================================== */

GRANT bark_email_worker
TO bark_email_worker_service;

/* ========================================================
   6. DATABASE CONNECTION PERMISSION

   The service account can connect to the
   bark_ornament database after LOGIN activation.

   No access is granted to other databases
   by this explicit statement.

   NOTE:
   PostgreSQL may separately grant CONNECT
   or TEMPORARY through the PUBLIC role.
   Those server-wide default privileges
   must be reviewed before production.
   ======================================================== */

GRANT CONNECT
ON DATABASE bark_ornament
TO bark_email_worker_service;

/* ========================================================
   7. RESTRICT DIRECT SCHEMA/TABLE ACCESS

   Functions remain accessible through
   inherited worker role permissions.

   Do not grant direct SELECT, INSERT,
   UPDATE or DELETE on customer tables.
   ======================================================== */

REVOKE ALL ON TABLE
  public.quotation_email_outbox
FROM bark_email_worker_service;

REVOKE ALL ON TABLE
  public.quotations
FROM bark_email_worker_service;

REVOKE ALL ON TABLE
  public.quotation_items
FROM bark_email_worker_service;

REVOKE ALL ON SEQUENCE
  public.quotation_email_outbox_id_seq
FROM bark_email_worker_service;

/* No direct quotation enqueueing permission. */

REVOKE ALL ON FUNCTION
  public.enqueue_quotation_email_notifications(UUID)
FROM bark_email_worker_service;

/* ========================================================
   8. RESTRICT SESSION DEFAULTS

   The worker uses a safe search path.

   Idle transactions are stopped after
   30 seconds.

   Individual SQL statements have a
   15-second timeout unless explicitly
   overridden by later approved deployment.
   ======================================================== */

ALTER ROLE bark_email_worker_service
IN DATABASE bark_ornament
SET search_path = pg_catalog, public;

ALTER ROLE bark_email_worker_service
IN DATABASE bark_ornament
SET statement_timeout = '15s';

ALTER ROLE bark_email_worker_service
IN DATABASE bark_ornament
SET idle_in_transaction_session_timeout = '30s';

/* ========================================================
   9. SECURITY ASSERTIONS

   Do not commit if the worker service account
   has unexpected direct permissions.

   Inherited restricted function permissions
   are intentional.
   ======================================================== */

DO $assert$
BEGIN

  IF NOT pg_catalog.pg_has_role(
    'bark_email_worker_service',
    'bark_email_worker',
    'USAGE'
  ) THEN
    RAISE EXCEPTION
      'Worker function permissions are not inherited.';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
    'bark_email_worker_service',
    'public.claim_quotation_email_jobs(integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'Worker cannot execute the claim function.';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
    'bark_email_worker_service',
    'public.get_quotation_email_job_data(bigint,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'Worker cannot retrieve leased job data.';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
    'bark_email_worker_service',
    'public.complete_quotation_email_job(bigint,uuid,text)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'Worker cannot complete jobs.';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
    'bark_email_worker_service',
    'public.fail_quotation_email_job(bigint,uuid,text,boolean)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'Worker cannot report delivery failures.';
  END IF;

  IF pg_catalog.has_function_privilege(
    'bark_email_worker_service',
    'public.enqueue_quotation_email_notifications(uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION
      'Security failure: worker can enqueue jobs.';
  END IF;

  IF pg_catalog.has_table_privilege(
    'bark_email_worker_service',
    'public.quotation_email_outbox',
    'SELECT, INSERT, UPDATE, DELETE'
  ) THEN
    RAISE EXCEPTION
      'Security failure: worker has direct outbox access.';
  END IF;

  IF pg_catalog.has_table_privilege(
    'bark_email_worker_service',
    'public.quotations',
    'SELECT, INSERT, UPDATE, DELETE'
  ) THEN
    RAISE EXCEPTION
      'Security failure: worker has direct quotation access.';
  END IF;

  IF pg_catalog.has_table_privilege(
    'bark_email_worker_service',
    'public.quotation_items',
    'SELECT, INSERT, UPDATE, DELETE'
  ) THEN
    RAISE EXCEPTION
      'Security failure: worker has direct item access.';
  END IF;

  IF pg_catalog.has_schema_privilege(
    'bark_email_worker_service',
    'public',
    'CREATE'
  ) THEN
    RAISE EXCEPTION
      'Security failure: worker can create '
      'objects in the public schema.';
  END IF;

  RAISE NOTICE
    'PASS: Worker service function permissions verified';

  RAISE NOTICE
    'PASS: Direct data-table access remains restricted';

  RAISE NOTICE
    'PASS: Worker service remains NOLOGIN';

END;
$assert$;

/* ========================================================
   10. COMPLETE THE MIGRATION

   The service identity is created but cannot
   authenticate until separately activated.
   ======================================================== */

COMMIT;
