
/*
 * BARK ORNAMENT (PVT) LTD — FILE 64
 * Offline production-readiness gap review.
 * No database, provider, network, child processes, or writes.
 *
 * Usage:
 *   node scripts/quotation-deployment-readiness-review.mjs --self-test
 *   node scripts/quotation-deployment-readiness-review.mjs --audit
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const FLAGS = Object.freeze([
  "QUOTATION_SUBMISSIONS_ENABLED",
  "QUOTATION_E2E_TEST_MODE",
  "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
]);

const MIGRATIONS = Object.freeze([
  "database/011_create_email_reconciliation_hold.sql",
  "database/012_create_email_reconciliation_resolution.sql",
  "database/013_create_email_provider_handoff.sql",
  "database/014_create_email_handoff_recovery_inspection.sql",
  "database/015_create_email_handoff_recovery_escalation.sql",
  "database/016_create_email_recovery_consistency_audit.sql",
]);

const MODULES = Object.freeze([
  "src/lib/quotation-email.ts",
  "src/lib/quotation-email-worker.ts",
  "src/lib/quotation-email-worker-handoff-db.ts",
  "src/lib/quotation-email-worker-handoff-coordinator.ts",
]);

const PRIOR_TESTS = Object.freeze([
  "scripts/quotation-email-worker-boundary-test.mjs",
  "scripts/quotation-email-handoff-crash-boundary-test.sql",
  "scripts/quotation-email-committed-handoff-test.sql",
  "scripts/quotation-email-operational-readiness-review.sql",
]);

const ENV_FILES = Object.freeze([
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
]);

const DEPLOYMENT_GATES = Object.freeze([
  [
    "G01",
    "Hosting and domain",
    "Hosting ownership, domain, HTTPS/TLS and redirects tested",
  ],
  [
    "G02",
    "Production database",
    "Network isolation, TLS and least-privilege production logins reviewed",
  ],
  [
    "G03",
    "Backups",
    "Encrypted backups, retention and restore drill verified",
  ],
  [
    "G04",
    "Bot defense",
    "Cloudflare Turnstile checked server-side with rate limiting",
  ],
  [
    "G05",
    "Quotation workflow",
    "Production form validation, spam limits and private-data retention reviewed",
  ],
  [
    "G06",
    "Email identity",
    "Approved provider, SPF, DKIM and DMARC verified",
  ],
  [
    "G07",
    "Provider safety",
    "Provider acceptance, ambiguity and duplicate prevention assessed",
  ],
  [
    "G08",
    "Worker deployment",
    "Worker secrets, commit-before-send ordering and recovery runbook validated",
  ],
  [
    "G09",
    "Monitoring",
    "Error alerts, incident ownership and recovery notifications tested",
  ],
  [
    "G10",
    "Restore and rollback",
    "Website release rollback and schema restore procedures rehearsed",
  ],
  [
    "G11",
    "User experience",
    "Mobile performance, accessibility and reduced-motion checks completed",
  ],
  [
    "G12",
    "Staging acceptance",
    "Safe end-to-end staging verification completed before activation",
  ],
]);

function check(
  id,
  area,
  status,
  description,
  action = ""
) {
  return Object.freeze({
    id,
    area,
    status,
    description,
    action,
  });
}

/*
 * Parse only assignment metadata needed
 * for the three feature switches.
 *
 * Do not print or return secret values
 * in the audit report.
 */

function parseAssignments(contents) {
  const entries = new Map();

  for (
    const line of contents
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
  ) {
    const match =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/
        .exec(line);

    if (!match) {
      continue;
    }

    const name = match[1];
    let raw = match[2].trim();

    const quoted =
      /^("|')(.*?)\1(?:\s*#.*)?$/
        .exec(raw);

    if (quoted) {
      raw = quoted[2];
    } else {
      raw = raw
        .replace(/\s+#.*$/, "")
        .trim();
    }

    if (!entries.has(name)) {
      entries.set(name, []);
    }

    entries.get(name).push(raw);
  }

  return entries;
}

function environmentViolations(
  contents,
  requireAll
) {
  const entries = parseAssignments(
    contents
  );

  const problems = [];

  for (const name of FLAGS) {
    const values =
      entries.get(name) ?? [];

    if (
      requireAll &&
      values.length !== 1
    ) {
      problems.push(
        `${name}: missing or duplicated`
      );

    } else if (values.length > 1) {
      problems.push(
        `${name}: duplicated`
      );

    } else if (
      values.length === 1 &&
      values[0] !== "false"
    ) {
      problems.push(
        `${name}: not explicitly false`
      );
    }
  }

  return problems;
}

/*
 * This is a conservative static check.
 * It is not a substitute for checking
 * whether Git already tracks .env.local.
 */

function gitignoreProtectsLocalEnv(
  contents
) {
  const active = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("#")
    );

  const positive = active.some(
    (line) =>
      [
        ".env.local",
        ".env*",
        ".env*.local",
        "*.local",
        "/.env.local",
        "/.env*",
      ].includes(line)
  );

  const explicitUnignore =
    active.includes("!.env.local") ||
    active.includes("!/.env.local");

  return (
    positive &&
    !explicitUnignore
  );
}

/*
 * Read-only project audit.
 *
 * All file access is provided through
 * read() and exists().
 *
 * In --self-test these are in-memory.
 *
 * In --audit these read local files.
 */

function analyze({
  read,
  exists,
  environment,
}) {
  const results = [];

  const add = (
    id,
    area,
    passed,
    description,
    remediate
  ) => {
    results.push(
      check(
        id,
        area,
        passed ? "PASS" : "FAIL",
        description,
        passed ? "" : remediate
      )
    );
  };

  /* ---------------------------------------
     L01 - Project build script
     --------------------------------------- */

  let pkg;

  try {
    pkg = JSON.parse(
      read("package.json") ?? ""
    );
  } catch {
    pkg = null;
  }

  add(
    "L01",
    "Application",
    Boolean(
      pkg &&
      typeof pkg.scripts?.build ===
        "string" &&
      pkg.scripts.build.trim()
    ),
    "package.json has an executable build script",
    "Verify package.json and scripts.build."
  );

  /* ---------------------------------------
     L02 - Dependency lockfile
     --------------------------------------- */

  const packageManagerLock = [
    "package-lock.json",
    "npm-shrinkwrap.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
  ];

  const hasLock =
    packageManagerLock.some(
      exists
    );

  results.push(
    check(
      "L02",
      "Dependencies",
      hasLock
        ? "PASS"
        : "NOT_VERIFIED",
      "Dependency lockfile found",
      hasLock
        ? ""
        : "Confirm and commit the lockfile for the package manager in use."
    )
  );

  /* ---------------------------------------
     L03 - Worker module files
     --------------------------------------- */

  add(
    "L03",
    "Source boundary",
    MODULES.every(exists),
    "Required email preparation and handoff modules exist",
    "Check the File 43, 55 and 56 paths without modifying previous files."
  );

  /* ---------------------------------------
     L04 - Server-only imports
     --------------------------------------- */

  const dbModule = read(
    "src/lib/quotation-email-worker-handoff-db.ts"
  );

  const fixtureModule = read(
    "src/lib/quotation-email-worker-handoff-coordinator.ts"
  );

  add(
    "L04",
    "Source boundary",
    [dbModule, fixtureModule]
      .every(
        (value) =>
          typeof value ===
            "string" &&
          /import\s+["']server-only["']\s*;/
            .test(value)
      ),
    "Worker handoff modules retain server-only imports",
    "Inspect server-only imports before deployment."
  );

  /* ---------------------------------------
     L05 - Existing migration files
     --------------------------------------- */

  add(
    "L05",
    "Migration evidence",
    MIGRATIONS.every(exists),
    "Files 52–62 recovery migrations exist on disk",
    "Review missing migration files; do not rerun existing migrations."
  );

  /* ---------------------------------------
     L06 - Previous test scripts
     --------------------------------------- */

  add(
    "L06",
    "Test evidence",
    PRIOR_TESTS.every(exists),
    "Prior worker, crash and readiness test files exist",
    "Locate missing prior test scripts and retain test evidence."
  );

  /* ---------------------------------------
     L07 - .env.local safety switches
     --------------------------------------- */

  const envLocal = read(
    ".env.local"
  );

  const localProblems =
    envLocal === null
      ? [".env.local: missing"]
      : environmentViolations(
          envLocal,
          true
        );

  add(
    "L07",
    "Feature switches",
    localProblems.length === 0,
    "All three .env.local feature switches are explicitly false",
    localProblems.join("; ")
  );

  /* ---------------------------------------
     L08 - Other dotenv overrides
     --------------------------------------- */

  const otherProblems = [];

  for (const filename of ENV_FILES) {
    if (
      filename === ".env.local" ||
      !exists(filename)
    ) {
      continue;
    }

    const contents = read(
      filename
    );

    if (contents === null) {
      continue;
    }

    for (
      const issue of
      environmentViolations(
        contents,
        false
      )
    ) {
      otherProblems.push(
        `${filename}: ${issue}`
      );
    }
  }

  add(
    "L08",
    "Feature switches",
    otherProblems.length === 0,
    "Other local dotenv files contain no enabled feature switches",
    otherProblems.join("; ")
  );

  /* ---------------------------------------
     L09 - Current shell overrides
     --------------------------------------- */

  const inheritedProblems =
    FLAGS.filter(
      (name) =>
        environment[name] !==
          undefined &&
        environment[name] !==
          "false"
    );

  add(
    "L09",
    "Runtime overrides",
    inheritedProblems.length === 0,
    "Current shell has no enabled feature-switch overrides",
    inheritedProblems
      .map(
        (name) =>
          `${name}: unsafe shell override`
      )
      .join("; ")
  );

  /* ---------------------------------------
     L10 - Git ignore evidence
     --------------------------------------- */

  const ignore = read(
    ".gitignore"
  );

  const ignored =
    ignore !== null &&
    gitignoreProtectsLocalEnv(
      ignore
    );

  results.push(
    check(
      "L10",
      "Secret hygiene",
      ignored
        ? "PASS"
        : "NOT_VERIFIED",
      ".gitignore appears to exclude .env.local",
      ignored
        ? ""
        : "Verify .env.local is ignored and untracked using Git; this static check is not proof."
    )
  );

  /* ---------------------------------------
     L11 - File 63 read-only evidence
     --------------------------------------- */

  const priorAudit = read(
    "scripts/quotation-email-operational-readiness-review.sql"
  );

  add(
    "L11",
    "Read-only review",
    typeof priorAudit ===
      "string" &&
      /BEGIN\s+TRANSACTION[\s\S]{0,140}\bREAD\s+ONLY\s*;/i
        .test(priorAudit) &&
      /\bROLLBACK\s*;/i
        .test(priorAudit),
    "File 63 contains a read-only transaction and rollback",
    "Review File 63's transaction boundary."
  );

  /* ---------------------------------------
     External deployment verification gates

     Local source files cannot prove any
     of the following are production-ready.
     --------------------------------------- */

  for (
    const [
      id,
      area,
      description,
    ] of DEPLOYMENT_GATES
  ) {
    results.push(
      check(
        id,
        area,
        "NOT_VERIFIED",
        description,
        "Requires separate deployment evidence; do not treat local source scanning as verification."
      )
    );
  }

  return Object.freeze({
    local: Object.freeze(
      results.filter(
        (item) =>
          item.id.startsWith("L")
      )
    ),

    external: Object.freeze(
      results.filter(
        (item) =>
          item.id.startsWith("G")
      )
    ),

    goLiveAuthorized: false,
  });
}

/* ==========================================
   SUMMARY HELPERS
   ========================================== */

function summarize(audit) {
  const passed =
    audit.local.filter(
      (item) =>
        item.status === "PASS"
    ).length;

  const failed =
    audit.local.filter(
      (item) =>
        item.status === "FAIL"
    ).length;

  const unverified =
    audit.local.filter(
      (item) =>
        item.status ===
          "NOT_VERIFIED"
    ).length;

  return {
    passed,
    failed,
    unverified,
  };
}

function formatAudit(audit) {
  const lines = [
    "FILE 64 — OFFLINE DEPLOYMENT SAFETY REVIEW",
    "LOCAL PROJECT CHECKS",
  ];

  for (const item of audit.local) {
    lines.push(
      `${item.id} [${item.status}] ${item.description}`
    );

    if (item.action) {
      lines.push(
        `    Next: ${item.action}`
      );
    }
  }

  const counts = summarize(
    audit
  );

  lines.push(
    `LOCAL SUMMARY: ${counts.passed} PASS, ${counts.failed} FAIL, ${counts.unverified} NOT_VERIFIED`
  );

  lines.push(
    "DEPLOYMENT EVIDENCE STILL REQUIRED"
  );

  for (const item of audit.external) {
    lines.push(
      `${item.id} [NOT_VERIFIED] ${item.description}`
    );
  }

  lines.push(
    "GO_LIVE_DECISION: NOT_AUTHORIZED"
  );

  lines.push(
    "REAL_DATABASE_CONNECTIONS: 0"
  );

  lines.push(
    "REAL_PROVIDER_CALLS: 0"
  );

  lines.push(
    "REAL_EMAILS_SENT: 0"
  );

  return lines.join("\n");
}

/* ==========================================
   FICTIONAL IN-MEMORY PROJECT

   Used by --self-test only.

   Does not write anything to disk.
   ========================================== */

function memoryProject() {
  const files = new Map();

  files.set(
    "package.json",
    JSON.stringify({
      scripts: {
        build: "next build",
      },
    })
  );

  files.set(
    "package-lock.json",
    "{}"
  );

  for (
    const filename of [
      ...MODULES,
      ...MIGRATIONS,
      ...PRIOR_TESTS,
    ]
  ) {
    files.set(
      filename,
      "fictional local test content"
    );
  }

  files.set(
    "src/lib/quotation-email-worker-handoff-db.ts",
    'import "server-only";'
  );

  files.set(
    "src/lib/quotation-email-worker-handoff-coordinator.ts",
    'import "server-only";'
  );

  files.set(
    ".env.local",
    FLAGS.map(
      (name) =>
        `${name}="false"`
    ).join("\n")
  );

  files.set(
    ".gitignore",
    "node_modules\n.env*\n"
  );

  files.set(
    "scripts/quotation-email-operational-readiness-review.sql",
    "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY;\nROLLBACK;"
  );

  return files;
}

function analyzeMemory(
  files,
  environment = {}
) {
  return analyze({
    read: (name) =>
      files.has(name)
        ? files.get(name)
        : null,

    exists: (name) =>
      files.has(name),

    environment,
  });
}

/* ==========================================
   18 CONTROLLED AUTOMATED TESTS
   ========================================== */

function runSelfTests() {
  let passed = 0;

  const test = (
    description,
    fn
  ) => {
    fn();

    passed += 1;

    console.log(
      `PASS ${passed}: ${description}`
    );
  };

  const find = (
    audit,
    id
  ) =>
    audit.local.find(
      (item) =>
        item.id === id
    );

  /* TEST 1 */

  test(
    "In-memory baseline has no local FAIL findings",
    () => {
      assert.equal(
        summarize(
          analyzeMemory(
            memoryProject()
          )
        ).failed,
        0
      );
    }
  );

  /* TEST 2 */

  test(
    "Build script is recognized",
    () => {
      assert.equal(
        find(
          analyzeMemory(
            memoryProject()
          ),
          "L01"
        ).status,
        "PASS"
      );
    }
  );

  /* TEST 3 */

  test(
    "Missing build script fails safely",
    () => {
      const f = memoryProject();

      f.set(
        "package.json",
        "{}"
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L01"
        ).status,
        "FAIL"
      );
    }
  );

  /* TEST 4 */

  test(
    "Fictional required sources are detected",
    () => {
      assert.equal(
        find(
          analyzeMemory(
            memoryProject()
          ),
          "L03"
        ).status,
        "PASS"
      );
    }
  );

  /* TEST 5 */

  test(
    "Missing migration is reported",
    () => {
      const f = memoryProject();

      f.delete(
        MIGRATIONS[0]
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L05"
        ).status,
        "FAIL"
      );
    }
  );

  /* TEST 6 */

  test(
    "Server-only import omission is reported",
    () => {
      const f = memoryProject();

      f.set(
        "src/lib/quotation-email-worker-handoff-db.ts",
        "export {};"
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L04"
        ).status,
        "FAIL"
      );
    }
  );

  /* TEST 7 */

  test(
    "Quoted false feature switches pass",
    () => {
      assert.equal(
        find(
          analyzeMemory(
            memoryProject()
          ),
          "L07"
        ).status,
        "PASS"
      );
    }
  );

  /* TEST 8 */

  test(
    "Unquoted false and comments pass",
    () => {
      const f = memoryProject();

      f.set(
        ".env.local",
        FLAGS.map(
          (name) =>
            `${name}=false # safe`
        ).join("\n")
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L07"
        ).status,
        "PASS"
      );
    }
  );

  /* TEST 9 */

  test(
    "Enabled feature switch fails",
    () => {
      const f = memoryProject();

      f.set(
        ".env.local",
        f.get(".env.local")
          .replace(
            '="false"',
            '="true"'
          )
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L07"
        ).status,
        "FAIL"
      );
    }
  );

  /* TEST 10 */

  test(
    "Duplicate feature switch fails",
    () => {
      const f = memoryProject();

      f.set(
        ".env.local",
        f.get(".env.local") +
          "\n" +
          FLAGS[0] +
          "=false"
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L07"
        ).status,
        "FAIL"
      );
    }
  );

  /* TEST 11 */

  test(
    "Missing feature switch fails",
    () => {
      const f = memoryProject();

      f.set(
        ".env.local",
        FLAGS.slice(1)
          .map(
            (name) =>
              `${name}=false`
          )
          .join("\n")
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L07"
        ).status,
        "FAIL"
      );
    }
  );

  /* TEST 12 */

  test(
    "Enabled production dotenv switch fails",
    () => {
      const f = memoryProject();

      f.set(
        ".env.production",
        FLAGS[2] + "=true"
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L08"
        ).status,
        "FAIL"
      );
    }
  );

  /* TEST 13 */

  test(
    "Enabled shell override fails",
    () => {
      assert.equal(
        find(
          analyzeMemory(
            memoryProject(),
            {
              [FLAGS[1]]: "true",
            }
          ),
          "L09"
        ).status,
        "FAIL"
      );
    }
  );

  /* TEST 14 */

  test(
    "Missing gitignore is not wrongly certified",
    () => {
      const f = memoryProject();

      f.delete(
        ".gitignore"
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L10"
        ).status,
        "NOT_VERIFIED"
      );
    }
  );

  /* TEST 15 */

  test(
    "Missing dependency lock is not wrongly certified",
    () => {
      const f = memoryProject();

      f.delete(
        "package-lock.json"
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L02"
        ).status,
        "NOT_VERIFIED"
      );
    }
  );

  /* TEST 16 */

  test(
    "Read-only File 63 evidence is checked",
    () => {
      const f = memoryProject();

      f.set(
        "scripts/quotation-email-operational-readiness-review.sql",
        "BEGIN; COMMIT;"
      );

      assert.equal(
        find(
          analyzeMemory(f),
          "L11"
        ).status,
        "FAIL"
      );
    }
  );

  /* TEST 17 */

  test(
    "No production gate is auto-certified",
    () => {
      const a = analyzeMemory(
        memoryProject()
      );

      assert.ok(
        a.external.length > 0 &&
        a.external.every(
          (g) =>
            g.status ===
              "NOT_VERIFIED"
        )
      );

      assert.equal(
        a.goLiveAuthorized,
        false
      );
    }
  );

  /* TEST 18 */

  test(
    "Output does not reveal fictional secrets or send authorizations",
    () => {
      const f = memoryProject();

      f.set(
        ".env.production",
        "EMAIL_API_KEY=PRIVATE_TEST_SECRET_123\n" +
          FLAGS[0] +
          "=true"
      );

      const output = formatAudit(
        analyzeMemory(f)
      );

      assert.ok(
        !output.includes(
          "PRIVATE_TEST_SECRET_123"
        )
      );

      assert.ok(
        output.includes(
          "GO_LIVE_DECISION: NOT_AUTHORIZED"
        )
      );

      assert.ok(
        output.includes(
          "REAL_EMAILS_SENT: 0"
        )
      );
    }
  );

  console.log(
    `FILE 64 SELF-TEST: ${passed}/18 PASSED`
  );

  console.log(
    "REAL DATABASE CONNECTIONS: 0"
  );

  console.log(
    "REAL EMAILS SENT: 0"
  );
}

/* ==========================================
   READ-ONLY LOCAL PROJECT AUDIT
   ========================================== */

function runProjectAudit() {
  const root = process.cwd();

  const read = (
    relative
  ) => {
    try {
      return fs.readFileSync(
        path.join(
          root,
          relative
        ),
        "utf8"
      );
    } catch (err) {
      if (
        err &&
        err.code === "ENOENT"
      ) {
        return null;
      }

      throw err;
    }
  };

  const exists = (
    relative
  ) =>
    fs.existsSync(
      path.join(
        root,
        relative
      )
    );

  const audit = analyze({
    read,
    exists,
    environment:
      process.env,
  });

  console.log(
    formatAudit(
      audit
    )
  );

  if (
    summarize(audit).failed > 0
  ) {
    process.exitCode = 1;
  }
}

/* ==========================================
   COMMAND LINE ENTRYPOINT
   ========================================== */

const command =
  process.argv[2];

if (
  process.argv.length !== 3 ||
  ![
    "--self-test",
    "--audit",
  ].includes(command)
) {
  console.error(
    "Usage: node scripts/quotation-deployment-readiness-review.mjs --self-test|--audit"
  );

  process.exitCode = 2;

} else if (
  command === "--self-test"
) {
  runSelfTests();

} else {
  runProjectAudit();
}

/*
===========================================================
END FILE 64

- No database connection
- No email provider connection
- No modification of local website files
- No real quotation submissions
- No real emails
- No production authorization
===========================================================
*/
