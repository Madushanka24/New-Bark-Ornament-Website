
/*
===========================================================
BARK ORNAMENT (PVT) LTD

FILE 63 - OPERATIONAL READINESS AND SECURITY REVIEW

File:
scripts/quotation-email-operational-readiness-review.sql

DATABASE:
Local bark_ornament

EXECUTE AS:
postgres

REQUIRES:
Files 37-62, including the worker, handoff,
reconciliation, inspection and audit functions.

PURPOSE:
- Verify required database objects
- Verify worker and administrator permissions
- Verify security-definer configurations
- Verify recovery protection triggers
- Verify hold and handoff primary keys
- Check empty local development queues
- Run recovery consistency inspection
- Report PASS/FAIL per control

STRICT SAFETY:
- READ ONLY transaction
- No test fixture inserts
- No role grants or revokes
- No migration changes
- No worker claims
- No handoff attempts
- No email sending
- No provider connection
- No customer contents returned
- No passwords or lease tokens returned

A passing audit DOES NOT authorize production.
===========================================================
*/


/* =======================================================
   SECTION 1 - OPEN READ-ONLY TRANSACTION
   ======================================================= */

BEGIN TRANSACTION
  ISOLATION LEVEL REPEATABLE READ,
  READ ONLY;

SET LOCAL lock_timeout = '3s';

SET LOCAL statement_timeout = '30s';

SET LOCAL search_path = pg_catalog;


/* =======================================================
   SECTION 2 - DATABASE CONNECTION INFORMATION

   This query prints only:
     Database name
     Role
     Server address
     Read-only transaction state

   It does not print connection strings
   or credentials.
   ======================================================= */

SELECT
  current_database() AS database_name,

  current_user AS connected_role,

  COALESCE(
    host(inet_server_addr()),
    'local_socket'
  ) AS server_address,

  current_setting(
    'transaction_read_only'
  ) AS read_only_transaction;


/* =======================================================
   SECTION 3 - 44 OPERATIONAL SECURITY CHECKS

   Result columns:
     check_id
     area
     verification
     result
     action_if_failed

   Expected:
     All 44 checks PASS.
     Summary: 44/44 PASS.

   A failure does not change the database.
   ======================================================= */

WITH

/* -------------------------------------------------------
   List the exact functions required by the
   existing email-worker implementation.
   ------------------------------------------------------- */

expected_functions (
  function_key,
  signature
) AS (
  VALUES

  (
    'claim',
    'public.claim_quotation_email_jobs(integer)'
  ),

  (
    'get_data',
    'public.get_quotation_email_job_data(bigint,uuid)'
  ),

  (
    'complete',
    'public.complete_quotation_email_job(bigint,uuid,text)'
  ),

  (
    'fail',
    'public.fail_quotation_email_job(bigint,uuid,text,boolean)'
  ),

  (
    'enqueue',
    'public.enqueue_quotation_email_notifications(uuid)'
  ),

  (
    'handoff',
    'public.begin_quotation_email_provider_handoff(bigint,uuid)'
  ),

  (
    'hold',
    'public.hold_quotation_email_for_reconciliation(bigint,uuid,text)'
  ),

  (
    'resolve',
    'public.resolve_quotation_email_reconciliation(bigint,text,text,text)'
  ),

  (
    'inspect',
    'public.inspect_quotation_email_handoff_recovery(integer,integer)'
  ),

  (
    'escalate',
    'public.escalate_quotation_email_handoff_for_reconciliation(bigint,integer,text,integer)'
  ),

  (
    'audit',
    'public.audit_quotation_email_recovery_consistency(integer)'
  )
),

/* -------------------------------------------------------
   Inspect function catalog and effective privileges.

   This is catalog inspection only.

   No function is executed here.
   ------------------------------------------------------- */

function_security AS (
  SELECT
    f.function_key,

    p.oid IS NOT NULL AS installed,

    COALESCE(
      pg_get_userbyid(p.proowner) = 'postgres',
      FALSE
    ) AS owned_by_postgres,

    COALESCE(
      p.prosecdef,
      FALSE
    ) AS security_definer,

    COALESCE(
      'search_path=pg_catalog' =
        ANY(p.proconfig),
      FALSE
    ) AS restricted_search_path,

    COALESCE(
      p.provolatile = 's',
      FALSE
    ) AS stable_function,

    EXISTS (
      SELECT 1

      FROM pg_catalog.aclexplode(
        COALESCE(
          p.proacl,
          pg_catalog.acldefault(
            'f',
            p.proowner
          )
        )
      ) AS acl

      WHERE acl.grantee = 0
        AND acl.privilege_type = 'EXECUTE'
    ) AS public_can_execute,

    COALESCE(
      has_function_privilege(
        'bark_email_worker_service',
        p.oid,
        'EXECUTE'
      ),
      FALSE
    ) AS worker_can_execute,

    COALESCE(
      has_function_privilege(
        'bark_web_dev',
        p.oid,
        'EXECUTE'
      ),
      FALSE
    ) AS website_can_execute

  FROM expected_functions AS f

  LEFT JOIN pg_catalog.pg_proc AS p
    ON p.oid =
      pg_catalog.to_regprocedure(
        f.signature
      )
),

/* -------------------------------------------------------
   Define protected function sets.
   ------------------------------------------------------- */

protected_functions AS (
  SELECT *
  FROM function_security

  WHERE function_key IN (
    'handoff',
    'hold',
    'resolve',
    'inspect',
    'escalate',
    'audit'
  )
),

administrator_functions AS (
  SELECT *
  FROM function_security

  WHERE function_key IN (
    'resolve',
    'inspect',
    'escalate',
    'audit'
  )
),

/* -------------------------------------------------------
   Read only the counts required for the
   empty local development baseline.
   ------------------------------------------------------- */

database_counts AS (
  SELECT

    (
      SELECT COUNT(*)
      FROM public.quotation_email_outbox
    ) AS outbox_count,

    (
      SELECT COUNT(*)
      FROM public.quotation_email_reconciliation_holds
    ) AS hold_count,

    (
      SELECT COUNT(*)
      FROM public.quotation_email_provider_handoffs
    ) AS handoff_count,

    (
      SELECT COUNT(*)
      FROM public.quotation_email_handoff_escalations
    ) AS escalation_count,

    (
      SELECT COUNT(*)
      FROM public.quotations
      WHERE customer_message LIKE
        'FILE 62 ROLLBACK %'
        OR customer_message LIKE
        'FILE 61 ROLLBACK %'
        OR customer_message LIKE
        'FILE 60 ROLLBACK %'
        OR customer_message LIKE
        'FILE 58 ROLLBACK %'
        OR customer_message LIKE
        'FILE59_COMMITTED_PID:%'
    ) AS remaining_recent_fixtures,

    (
      SELECT COUNT(*)
      FROM public.audit_quotation_email_recovery_consistency(
        100
      )
    ) AS consistency_findings,

    (
      SELECT COUNT(*)
      FROM public.inspect_quotation_email_handoff_recovery(
        100,
        0
      )
    ) AS unresolved_recovery_items
),

/* -------------------------------------------------------
   Individual checks.

   Every verification has:
     An ID
     A category
     A meaningful condition
     An expected boolean
     A corrective investigation note

   No correction is performed automatically.
   ------------------------------------------------------- */

checks (
  check_id,
  area,
  verification,
  passed,
  action_if_failed
) AS (

  VALUES

  /* ---- Environment ---- */

  (
    1,
    'Environment',
    'Connected to bark_ornament',
    current_database() = 'bark_ornament',
    'Use the correct local database.'
  ),

  (
    2,
    'Environment',
    'Connected as PostgreSQL administrator',
    current_user = 'postgres',
    'Connect as postgres in pgAdmin.'
  ),

  (
    3,
    'Environment',
    'Connection is local',
    inet_server_addr() IS NULL
      OR inet_server_addr() IN (
        '127.0.0.1'::INET,
        '::1'::INET
      ),
    'Do not run this development review remotely.'
  ),

  (
    4,
    'Environment',
    'Audit transaction is READ ONLY',
    current_setting(
      'transaction_read_only'
    ) = 'on',
    'Run the full script including BEGIN READ ONLY.'
  ),

  (
    5,
    'Roles',
    'Website and worker roles exist',
    to_regrole('bark_web_dev') IS NOT NULL
      AND to_regrole('bark_email_worker') IS NOT NULL
      AND to_regrole(
        'bark_email_worker_service'
      ) IS NOT NULL,
    'Inspect the installed database roles.'
  ),

  (
    6,
    'Roles',
    'Worker login belongs to worker permission role',
    pg_has_role(
      'bark_email_worker_service',
      'bark_email_worker',
      'MEMBER'
    ),
    'Review restricted worker role membership.'
  ),

  /* ---- Required objects ---- */

  (
    7,
    'Schema',
    'All six required quotation and recovery tables exist',
    to_regclass('public.quotations') IS NOT NULL
      AND to_regclass(
        'public.quotation_items'
      ) IS NOT NULL
      AND to_regclass(
        'public.quotation_email_outbox'
      ) IS NOT NULL
      AND to_regclass(
        'public.quotation_email_reconciliation_holds'
      ) IS NOT NULL
      AND to_regclass(
        'public.quotation_email_provider_handoffs'
      ) IS NOT NULL
      AND to_regclass(
        'public.quotation_email_handoff_escalations'
      ) IS NOT NULL,
    'Review the required database migrations.'
  ),

  (
    8,
    'Functions',
    'All 11 required email functions are installed',
    (
      SELECT COUNT(*) = 11
      FROM function_security
      WHERE installed
    ),
    'Inspect missing function signatures before proceeding.'
  ),

  /* ---- Security-definer functions ---- */

  (
    9,
    'Function security',
    'All six protected functions owned by postgres',
    COALESCE(
      (
        SELECT BOOL_AND(owned_by_postgres)
        FROM protected_functions
      ),
      FALSE
    ),
    'Review function ownership; do not grant broad privileges.'
  ),

  (
    10,
    'Function security',
    'All six protected functions use SECURITY DEFINER',
    COALESCE(
      (
        SELECT BOOL_AND(security_definer)
        FROM protected_functions
      ),
      FALSE
    ),
    'Inspect the original function definitions.'
  ),

  (
    11,
    'Function security',
    'All six protected functions lock search_path',
    COALESCE(
      (
        SELECT BOOL_AND(restricted_search_path)
        FROM protected_functions
      ),
      FALSE
    ),
    'Check search_path=pg_catalog in each protected function.'
  ),

  (
    12,
    'Function security',
    'Administrator inspection and audit are STABLE',
    (
      SELECT COUNT(*) = 2
      FROM function_security
      WHERE function_key IN (
        'inspect',
        'audit'
      )
      AND stable_function
    ),
    'Check that inspection functions are read-only.'
  ),

  (
    13,
    'Function security',
    'PUBLIC cannot execute protected functions',
    COALESCE(
      (
        SELECT BOOL_AND(
          NOT public_can_execute
        )
        FROM protected_functions
      ),
      FALSE
    ),
    'Inspect function EXECUTE ACLs; do not modify them during audit.'
  ),

  (
    14,
    'Function security',
    'Worker cannot execute administrator functions',
    COALESCE(
      (
        SELECT BOOL_AND(
          NOT worker_can_execute
        )
        FROM administrator_functions
      ),
      FALSE
    ),
    'Review File 53, 60, 61 and 62 permissions.'
  ),

  (
    15,
    'Function security',
    'Website cannot execute administrator functions',
    COALESCE(
      (
        SELECT BOOL_AND(
          NOT website_can_execute
        )
        FROM administrator_functions
      ),
      FALSE
    ),
    'Review administrator-only function grants.'
  ),

  /* ---- Required worker execution ---- */

  (
    16,
    'Worker permissions',
    'Worker may claim an eligible job',
    (
      SELECT worker_can_execute
      FROM function_security
      WHERE function_key = 'claim'
    ),
    'Inspect the worker claim function grant.'
  ),

  (
    17,
    'Worker permissions',
    'Worker may retrieve leased job data',
    (
      SELECT worker_can_execute
      FROM function_security
      WHERE function_key = 'get_data'
    ),
    'Inspect the restricted job-data function grant.'
  ),

  (
    18,
    'Worker permissions',
    'Worker may complete a valid job',
    (
      SELECT worker_can_execute
      FROM function_security
      WHERE function_key = 'complete'
    ),
    'Inspect the job-completion function grant.'
  ),

  (
    19,
    'Worker permissions',
    'Worker may report failure under its lease',
    (
      SELECT worker_can_execute
      FROM function_security
      WHERE function_key = 'fail'
    ),
    'Inspect the job-failure function grant.'
  ),

  (
    20,
    'Worker permissions',
    'Worker may begin restricted provider handoff',
    (
      SELECT worker_can_execute
      FROM function_security
      WHERE function_key = 'handoff'
    ),
    'Inspect File 54 handoff execution permissions.'
  ),

  (
    21,
    'Worker permissions',
    'Worker may place an uncertain job on hold',
    (
      SELECT worker_can_execute
      FROM function_security
      WHERE function_key = 'hold'
    ),
    'Inspect File 52 restricted hold permission.'
  ),

  (
    22,
    'Worker permissions',
    'Worker cannot enqueue new notifications',
    NOT (
      SELECT worker_can_execute
      FROM function_security
      WHERE function_key = 'enqueue'
    ),
    'Inspect the enqueue-function permissions.'
  ),

  /* ---- Website boundary ---- */

  (
    23,
    'Website boundary',
    'Website cannot initiate provider handoff',
    NOT (
      SELECT website_can_execute
      FROM function_security
      WHERE function_key = 'handoff'
    ),
    'Review File 54 function permissions.'
  ),

  (
    24,
    'Website boundary',
    'Website cannot place delivery uncertainty holds',
    NOT (
      SELECT website_can_execute
      FROM function_security
      WHERE function_key = 'hold'
    ),
    'Review File 52 function permissions.'
  ),

  /* ---- Direct table access ---- */

  (
    25,
    'Table permissions',
    'Worker has no direct outbox data privileges',
    NOT has_table_privilege(
      'bark_email_worker_service',
      'public.quotation_email_outbox',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    'Inspect direct worker access to outbox.'
  ),

  (
    26,
    'Table permissions',
    'Worker has no direct quotation data privileges',
    NOT has_table_privilege(
      'bark_email_worker_service',
      'public.quotations',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    'Inspect direct worker access to quotations.'
  ),

  (
    27,
    'Table permissions',
    'Worker has no direct reconciliation table privileges',
    NOT has_table_privilege(
      'bark_email_worker_service',
      'public.quotation_email_reconciliation_holds',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    'Inspect direct access to reconciliation holds.'
  ),

  (
    28,
    'Table permissions',
    'Worker has no direct provider handoff table privileges',
    NOT has_table_privilege(
      'bark_email_worker_service',
      'public.quotation_email_provider_handoffs',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    'Inspect provider handoff table grants.'
  ),

  (
    29,
    'Table permissions',
    'Worker has no direct escalation audit privileges',
    NOT has_table_privilege(
      'bark_email_worker_service',
      'public.quotation_email_handoff_escalations',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    'Inspect administrator escalation audit table grants.'
  ),

  (
    30,
    'Table permissions',
    'Website has no direct provider handoff table privileges',
    NOT has_table_privilege(
      'bark_web_dev',
      'public.quotation_email_provider_handoffs',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    'Inspect website role handoff table grants.'
  ),

  (
    31,
    'Table permissions',
    'Website has no direct escalation audit privileges',
    NOT has_table_privilege(
      'bark_web_dev',
      'public.quotation_email_handoff_escalations',
      'SELECT,INSERT,UPDATE,DELETE'
    ),
    'Inspect website escalation table grants.'
  ),

  /* ---- Recovery protection triggers ---- */

  (
    32,
    'Recovery protection',
    'File 52 unresolved hold guard enabled',
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger AS t
      WHERE t.tgrelid =
        'public.quotation_email_outbox'::REGCLASS
        AND t.tgname =
          'trg_guard_quotation_email_reconciliation_hold'
        AND t.tgenabled = 'O'
        AND NOT t.tgisinternal
    ),
    'Inspect unresolved reconciliation hold guard.'
  ),

  (
    33,
    'Recovery protection',
    'File 54 provider handoff guard enabled',
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_trigger AS t
      WHERE t.tgrelid =
        'public.quotation_email_outbox'::REGCLASS
        AND t.tgname =
          'trg_guard_quotation_email_provider_handoff'
        AND t.tgenabled = 'O'
        AND NOT t.tgisinternal
    ),
    'Inspect durable handoff update/delete guard.'
  ),

  /* ---- Historical identity keys ---- */

  (
    34,
    'Recovery integrity',
    'Reconciliation history keyed by job and attempt',
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint AS c
      WHERE c.conrelid =
        'public.quotation_email_reconciliation_holds'::REGCLASS
        AND c.contype = 'p'
        AND pg_get_constraintdef(c.oid)
          LIKE '%(job_id, held_attempt)%'
    ),
    'Inspect the File 53 reconciliation history primary key.'
  ),

  (
    35,
    'Recovery integrity',
    'Provider handoff history keyed by job and attempt',
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint AS c
      WHERE c.conrelid =
        'public.quotation_email_provider_handoffs'::REGCLASS
        AND c.contype = 'p'
        AND pg_get_constraintdef(c.oid)
          LIKE '%(job_id, attempt_number)%'
    ),
    'Inspect the File 54 provider handoff primary key.'
  ),

  (
    36,
    'Recovery integrity',
    'Administrator escalation keyed by job and attempt',
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint AS c
      WHERE c.conrelid =
        'public.quotation_email_handoff_escalations'::REGCLASS
        AND c.contype = 'p'
        AND pg_get_constraintdef(c.oid)
          LIKE '%(job_id, attempt_number)%'
    ),
    'Inspect the File 61 escalation audit primary key.'
  ),

  /* ---- Current local development state ---- */

  (
    37,
    'Local baseline',
    'Email outbox currently empty',
    (
      SELECT outbox_count = 0
      FROM database_counts
    ),
    'Inspect existing outbox records before further tests.'
  ),

  (
    38,
    'Local baseline',
    'Reconciliation hold table currently empty',
    (
      SELECT hold_count = 0
      FROM database_counts
    ),
    'Inspect any existing reconciliation holds.'
  ),

  (
    39,
    'Local baseline',
    'Provider handoff history currently empty',
    (
      SELECT handoff_count = 0
      FROM database_counts
    ),
    'Inspect unexpected historical handoff records.'
  ),

  (
    40,
    'Local baseline',
    'Escalation audit table currently empty',
    (
      SELECT escalation_count = 0
      FROM database_counts
    ),
    'Inspect existing administrator escalation records.'
  ),

  (
    41,
    'Local baseline',
    'No remaining recent fictional test quotations',
    (
      SELECT remaining_recent_fixtures = 0
      FROM database_counts
    ),
    'Investigate leftover File 58-62 test fixtures.'
  ),

  (
    42,
    'Operational consistency',
    'File 62 reports no recovery inconsistencies',
    (
      SELECT consistency_findings = 0
      FROM database_counts
    ),
    'Review File 62 findings before advancing.'
  ),

  (
    43,
    'Operational consistency',
    'File 60 reports no unresolved handoff items',
    (
      SELECT unresolved_recovery_items = 0
      FROM database_counts
    ),
    'Investigate unresolved provider handoffs.'
  ),

  (
    44,
    'Role isolation',
    'Website role is not a worker-role member',
    NOT pg_has_role(
      'bark_web_dev',
      'bark_email_worker',
      'MEMBER'
    ),
    'Investigate website and worker role separation.'
  )
)

/* -------------------------------------------------------
   PRINT INDIVIDUAL RESULTS AND SUMMARY.

   The summary counts only the 44 defined
   checks.

   All tests are observational.
   ------------------------------------------------------- */

SELECT
  c.check_id,

  c.area,

  c.verification,

  CASE
    WHEN COALESCE(c.passed, FALSE)
      THEN 'PASS'
    ELSE 'FAIL'
  END AS result,

  CASE
    WHEN COALESCE(c.passed, FALSE)
      THEN ''
    ELSE c.action_if_failed
  END AS action_if_failed

FROM checks AS c

UNION ALL

SELECT
  999 AS check_id,

  'SUMMARY' AS area,

  'Database operational safety checks' AS verification,

  CASE
    WHEN BOOL_AND(
      COALESCE(passed, FALSE)
    )
    THEN 'PASS'
    ELSE 'FAIL'
  END AS result,

  COUNT(*) FILTER (
    WHERE COALESCE(passed, FALSE)
  )::TEXT
  || '/'
  || COUNT(*)::TEXT
  || ' checks passed' AS action_if_failed

FROM checks

ORDER BY check_id;


/* =======================================================
   SECTION 4 - RECOVERY DIAGNOSTICS

   These are additional read-only reports.

   No sensitive quotation or lease data
   is returned.
   ======================================================= */

/* 4A. Current email record counts. */

SELECT
  (
    SELECT COUNT(*)
    FROM public.quotation_email_outbox
  ) AS outbox_jobs,

  (
    SELECT COUNT(*)
    FROM public.quotation_email_reconciliation_holds
  ) AS reconciliation_holds,

  (
    SELECT COUNT(*)
    FROM public.quotation_email_provider_handoffs
  ) AS provider_handoffs,

  (
    SELECT COUNT(*)
    FROM public.quotation_email_handoff_escalations
  ) AS escalations;


/* 4B. Recovery audit issues, if any. */

SELECT
  job_id,
  attempt_number,
  issue_code,
  severity,
  observed_at

FROM public.audit_quotation_email_recovery_consistency(
  100
);


/* 4C. Unresolved handoffs requiring review. */

SELECT
  job_id,
  attempt_number,
  review_state,
  state_since,
  age_seconds,
  uncertainty_reason

FROM public.inspect_quotation_email_handoff_recovery(
  100,
  0
);


/* =======================================================
   SECTION 5 - END READ-ONLY TRANSACTION

   ROLLBACK is used to terminate the
   verification transaction.

   No database changes were made.
   ======================================================= */

ROLLBACK;

/*
===========================================================
END FILE 63

Expected:
- 44 individual checks
- Summary row: PASS, 44/44
- Four zero record counts
- No recovery consistency findings
- No unresolved handoff rows
- Successful ROLLBACK

This verifies the local database baseline only.
It does not enable any application feature.
===========================================================
*/
