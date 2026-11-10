
/**
 * BARK ORNAMENT — FILE 70
 * Staging infrastructure access-control & evidence preflight.
 *
 * Commands (run from website project root):
 *   node scripts/quotation-staging-infrastructure-evidence.mjs --self-test
 *   node scripts/quotation-staging-infrastructure-evidence.mjs --matrix
 *   node scripts/quotation-staging-infrastructure-evidence.mjs --audit
 *
 * Offline only:
 * No writes, subprocesses, network, database or email.
 *
 * Source checks and policy assertions DO NOT
 * prove that hosting controls exist.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const FLAGS = Object.freeze([
  "QUOTATION_SUBMISSIONS_ENABLED",
  "QUOTATION_E2E_TEST_MODE",
  "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
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

const PRIOR = Object.freeze([
  "scripts/quotation-email-operational-readiness-review.sql",
  "scripts/quotation-deployment-readiness-review.mjs",
  "scripts/quotation-hosting-environment-audit.mjs",
  "scripts/quotation-staging-isolation-review.mjs",
  "scripts/quotation-staging-hosting-preflight.mjs",
  "scripts/quotation-staging-deployment-manifest.mjs",
  "scripts/quotation-secret-boundary-audit.mjs",
]);

const WORKER_MODULES = Object.freeze([
  "src/lib/quotation-email-worker-handoff-db.ts",
  "src/lib/quotation-email-worker-handoff-coordinator.ts",
]);

/*
 * Target access-control matrix.
 *
 * This describes required permissions,
 * NOT actual hosting-provider grants.
 *
 * The email worker is intentionally absent.
 */

const ACCESS = Object.freeze({
  "anonymous-visitor": [
    "public-web:read",
  ],

  "staging-web-service": [
    "staging-db:app-role",
    "staging-secrets:web-read",
  ],

  "staging-deployer": [
    "staging-app:deploy",
    "staging-app:rollback",
  ],

  "staging-administrator": [
    "staging-iam:manage",
    "staging-db:admin",
    "staging-secrets:manage",
    "staging-backup:restore",
  ],
});

const FORBIDDEN_PREFIXES = Object.freeze([
  "production-",
  "email-provider:",
  "staging-worker:",
  "staging-app:enable-quotations",
  "staging-app:enable-email",
]);

/*
 * Future staging policy.
 *
 * PLANNED identifiers are illustrative.
 * They are not hosting resources.
 *
 * No real addresses or credentials.
 */

const POLICY = Object.freeze({
  environment: "staging",
  nodeEnv: "production",

  stagingHostingId: "PLANNED-STAGING-HOST",
  productionHostingId: "PLANNED-PRODUCTION-HOST",

  stagingDatabaseId: "PLANNED-STAGING-DATABASE",
  productionDatabaseId: "PLANNED-PRODUCTION-DATABASE",

  stagingWebRole: "PLANNED-STAGING-WEB-ROLE",
  productionWebRole: "PLANNED-PRODUCTION-WEB-ROLE",

  publicAccess: "restricted",
  adminMfaRequired: true,

  stagingDbNetwork: "private",

  databaseTls:
    "verified-certificate-and-hostname-required",

  serverSecrets: "managed-server-only",

  workerDeployment: "absent",
  workerCredentials: "absent",

  providerEgress: "blocked",
  providerCredentials: "absent",

  customerData: "synthetic-only",

  backupPolicy: "encrypted-and-isolated-required",
  restoreDrill: "required",
  rollbackDrill: "required",

  monitoring: "required",
  approvals: "pending",

  flags: Object.fromEntries(
    FLAGS.map((name) => [name, "false"])
  ),
});

/*
 * External security evidence requirements.
 *
 * Every gate remains NOT_VERIFIED.
 * Local source scanning cannot certify them.
 */

const EVIDENCE = Object.freeze([
  [
    "G01",
    "Hosting/IAM",
    "Dedicated staging project and restricted administrators",
    "Hosting access review, role export and MFA evidence",
  ],
  [
    "G02",
    "Ingress",
    "Staging HTTPS and restricted public access",
    "TLS validation and ingress/access-rule evidence",
  ],
  [
    "G03",
    "Isolation",
    "Staging and production hosting identities are distinct",
    "Provider project/account separation evidence",
  ],
  [
    "G04",
    "PostgreSQL",
    "Isolated staging DB and restricted web role",
    "Redacted role grants and resource identifier comparison",
  ],
  [
    "G05",
    "Network/TLS",
    "Private PostgreSQL network and verified TLS",
    "Network rules plus driver-specific certificate/hostname test",
  ],
  [
    "G06",
    "Secrets",
    "Managed server-only secrets, access logs and rotation",
    "Redacted secret-manager IAM policy and rotation runbook",
  ],
  [
    "G07",
    "Runtime",
    "Actual staging process has all three safety flags false",
    "Attested runtime flag-status report (no values other than false)",
  ],
  [
    "G08",
    "Worker",
    "No staging email worker or worker database credential",
    "Process inventory and redacted secret-injection policy",
  ],
  [
    "G09",
    "Egress",
    "Provider/network egress blocked and live credentials absent",
    "Outbound network policy and blocked-connection test evidence",
  ],
  [
    "G10",
    "Backups",
    "Encrypted isolated backups and successful restore",
    "Restore test outcome, date, responsible owner",
  ],
  [
    "G11",
    "Operations",
    "Monitoring, audit logs and incident ownership",
    "Alert drill and incident-runbook signoff",
  ],
  [
    "G12",
    "Release",
    "Safe deployment, rollback, and formal approval",
    "Rollback drill and change-approval record",
  ],
]);

/* ======================================================
   1. ACCESS MATRIX VALIDATION
   ====================================================== */

function matrixIssues(matrix) {
  const issues = [];
  const principals = Object.keys(ACCESS);

  for (const principal of principals) {
    const grants = matrix?.[principal];

    if (
      !Array.isArray(grants) ||
      new Set(grants).size !== grants.length
    ) {
      issues.push(
        `MATRIX_${principal}_INVALID`
      );
      continue;
    }

    for (const required of ACCESS[principal]) {
      if (!grants.includes(required)) {
        issues.push(
          `MATRIX_${principal}_MISSING_REQUIRED`
        );
      }
    }

    for (const grant of grants) {
      if (
        typeof grant !== "string" ||
        !ACCESS[principal].includes(grant) ||
        FORBIDDEN_PREFIXES.some(
          (prefix) => grant.startsWith(prefix)
        )
      ) {
        issues.push(
          `MATRIX_${principal}_UNAUTHORIZED_GRANT`
        );
      }
    }
  }

  for (const principal of Object.keys(matrix ?? {})) {
    if (!principals.includes(principal)) {
      issues.push("MATRIX_UNEXPECTED_PRINCIPAL");
    }
  }

  return [...new Set(issues)];
}

/* ======================================================
   2. STAGING POLICY VALIDATION
   ====================================================== */

function policyIssues(p) {
  if (
    !p ||
    typeof p !== "object" ||
    Array.isArray(p)
  ) {
    return ["POLICY_INVALID"];
  }

  const issues = [];

  const requireCondition = (ok, code) => {
    if (!ok) issues.push(code);
  };

  requireCondition(
    p.environment === "staging",
    "ENVIRONMENT"
  );

  requireCondition(
    p.nodeEnv === "production",
    "NODE_ENV"
  );

  requireCondition(
    Boolean(p.stagingHostingId) &&
      p.stagingHostingId !== p.productionHostingId,
    "HOSTING_ISOLATION"
  );

  requireCondition(
    Boolean(p.stagingDatabaseId) &&
      p.stagingDatabaseId !== p.productionDatabaseId,
    "DATABASE_ISOLATION"
  );

  requireCondition(
    Boolean(p.stagingWebRole) &&
      p.stagingWebRole !== p.productionWebRole,
    "DATABASE_ROLE_ISOLATION"
  );

  requireCondition(
    p.publicAccess === "restricted",
    "ACCESS_RESTRICTION"
  );

  requireCondition(
    p.adminMfaRequired === true,
    "ADMIN_MFA"
  );

  requireCondition(
    p.stagingDbNetwork === "private",
    "DATABASE_NETWORK"
  );

  requireCondition(
    p.databaseTls ===
      "verified-certificate-and-hostname-required",
    "DATABASE_TLS"
  );

  requireCondition(
    p.serverSecrets === "managed-server-only",
    "SECRET_BOUNDARY"
  );

  requireCondition(
    p.workerDeployment === "absent",
    "WORKER_DEPLOYMENT"
  );

  requireCondition(
    p.workerCredentials === "absent",
    "WORKER_CREDENTIALS"
  );

  requireCondition(
    p.providerEgress === "blocked",
    "PROVIDER_EGRESS"
  );

  requireCondition(
    p.providerCredentials === "absent",
    "PROVIDER_CREDENTIALS"
  );

  requireCondition(
    p.customerData === "synthetic-only",
    "CUSTOMER_DATA"
  );

  requireCondition(
    p.backupPolicy === "encrypted-and-isolated-required",
    "BACKUP_POLICY"
  );

  requireCondition(
    p.restoreDrill === "required",
    "RESTORE_DRILL"
  );

  requireCondition(
    p.rollbackDrill === "required",
    "ROLLBACK_DRILL"
  );

  requireCondition(
    p.monitoring === "required",
    "MONITORING"
  );

  requireCondition(
    p.approvals === "pending",
    "APPROVAL"
  );

  for (const name of FLAGS) {
    requireCondition(
      p.flags?.[name] === "false",
      `FLAG_${name}`
    );
  }

  return issues;
}

/* ======================================================
   3. READ DOTENV ASSIGNMENTS

   Values are used only for local comparisons.
   Credentials are never printed.

   This does not implement multiline variables,
   interpolation, or custom environment loaders.
   ====================================================== */

function parseEnv(contents) {
  const result = new Map();

  if (typeof contents !== "string") {
    return result;
  }

  for (
    const line of contents
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
  ) {
    const match =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/
        .exec(line);

    if (!match) continue;

    const text = match[2].trim();

    const quoted =
      /^(?:"([^"]*)"|'([^']*)')(?:\s*#.*)?$/
        .exec(text);

    const value = quoted
      ? (quoted[1] ?? quoted[2])
      : text.replace(/\s+#.*$/, "").trim();

    result.set(
      match[1],
      [
        ...(result.get(match[1]) ?? []),
        value,
      ]
    );
  }

  return result;
}

/* ======================================================
   4. RESOLVE THREE FEATURE FLAGS

   Next.js-style local precedence:
   1. Process environment
   2. .env.<mode>.local
   3. .env.local, except test
   4. .env.<mode>
   5. .env

   This models local configuration only.
   ====================================================== */

function resolved(name, mode, maps, shell) {
  if (
    Object.hasOwn(shell, name) &&
    shell[name] !== undefined
  ) {
    return shell[name];
  }

  const order = [
    `.env.${mode}.local`,

    ...(mode === "test" ? [] : [".env.local"]),

    `.env.${mode}`,
    ".env",
  ];

  for (const file of order) {
    const values =
      maps.get(file)?.get(name) ?? [];

    if (values.length) {
      return values.at(-1);
    }
  }

  return undefined;
}

/* ======================================================
   5. CHECK LOCAL POSTGRESQL URL IDENTITY

   This does not connect to PostgreSQL.

   Returns only the local username.
   Never prints URLs or passwords.
   ====================================================== */

function loopbackRole(raw) {
  if (typeof raw !== "string" || !raw) {
    return null;
  }

  try {
    const u = new URL(raw);

    if (
      ![
        "postgres:",
        "postgresql:",
      ].includes(u.protocol)
    ) {
      return null;
    }

    if (
      ![
        "localhost",
        "127.0.0.1",
        "[::1]",
      ].includes(u.hostname)
    ) {
      return null;
    }

    return decodeURIComponent(u.username);

  } catch {
    return null;
  }
}

/* ======================================================
   6. RUN 18 LOCAL SECURITY CHECKS

   The audit reads only local source and
   environment files.

   Actual staging IAM, TLS, network and backup
   controls remain NOT_VERIFIED.
   ====================================================== */

function inspect({
  read,
  exists,
  shell = {},
}) {
  const checks = [];

  const add = (
    id,
    status,
    description,
    action = ""
  ) => checks.push({
    id,
    status,
    description,

    action:
      status === "PASS"
        ? ""
        : action,
  });

  const envMaps =
    new Map(
      ENV_FILES.map(
        (f) => [
          f,
          parseEnv(read(f)),
        ]
      )
    );

  const local =
    envMaps.get(".env.local");

  /* L01 - Local safety switches */

  add(
    "L01",

    FLAGS.every(
      (n) =>
        local.get(n)?.length === 1 &&
        local.get(n)[0] === "false"
    )
      ? "PASS"
      : "FAIL",

    "Three local quotation/email safety flags are false exactly once",

    "Inspect only the protected flag names in .env.local."
  );

  /* L02 - Other dotenv overrides */

  const unsafeFiles = [];

  for (
    const file of
      ENV_FILES.filter(
        (f) => f !== ".env.local"
      )
  ) {
    for (const name of FLAGS) {
      const values =
        envMaps.get(file).get(name) ?? [];

      if (
        values.length > 1 ||
        values.some(
          (x) => x !== "false"
        )
      ) {
        unsafeFiles.push(
          `${file}:${name}`
        );
      }
    }
  }

  add(
    "L02",

    unsafeFiles.length
      ? "FAIL"
      : "PASS",

    "No unsafe dotenv flag overrides",

    unsafeFiles.join(", ")
  );

  /* L03 - Process environment overrides */

  const unsafeShell =
    FLAGS.filter(
      (n) =>
        shell[n] !== undefined &&
        shell[n] !== "false"
    );

  add(
    "L03",

    unsafeShell.length
      ? "FAIL"
      : "PASS",

    "No unsafe process-environment flag overrides",

    unsafeShell.join(", ")
  );

  /* L04 - Development flags */

  add(
    "L04",

    FLAGS.every(
      (n) =>
        resolved(
          n,
          "development",
          envMaps,
          shell
        ) === "false"
    )
      ? "PASS"
      : "FAIL",

    "Effective local development flags remain false"
  );

  /* L05 - Local production-mode flags */

  add(
    "L05",

    FLAGS.every(
      (n) =>
        resolved(
          n,
          "production",
          envMaps,
          shell
        ) === "false"
    )
      ? "PASS"
      : "FAIL",

    "Effective local production-mode flags remain false"
  );

  /* L06-L07 - Application runtime */

  let packageJson = null;

  try {
    packageJson =
      JSON.parse(
        read("package.json") ?? ""
      );
  } catch {
    // Report an unverified check below.
  }

  add(
    "L06",

    typeof packageJson?.scripts?.build === "string" &&
    typeof packageJson?.scripts?.start === "string"
      ? "PASS"
      : "NOT_VERIFIED",

    "Node hosting build and start scripts are present",

    "Review the selected hosting runtime."
  );

  add(
    "L07",

    typeof packageJson?.dependencies?.next === "string" ||
    typeof packageJson?.devDependencies?.next === "string"
      ? "PASS"
      : "NOT_VERIFIED",

    "Next.js dependency is declared"
  );

  /* L08 - Server-side quotation route */

  const route =
    exists("src/app/api/quotations/route.ts") ||
    exists("app/api/quotations/route.ts");

  add(
    "L08",

    route
      ? "PASS"
      : "NOT_VERIFIED",

    "Quotation API route exists",

    "Locate existing route; do not create a placeholder."
  );

  /* L09-L10 - Next.js deployment config */

  const configs = [
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
  ];

  const config =
    configs
      .map(read)
      .filter(
        (x) => typeof x === "string"
      )
      .join("\n");

  add(
    "L09",

    /\boutput\s*:\s*['"]export['"]/
      .test(config)
        ? "FAIL"
        : "PASS",

    "No static-only export for a server-side quotation API"
  );

  add(
    "L10",

    /(?:^|[,{]\s*)env\s*:/m
      .test(config)
        ? "NOT_VERIFIED"
        : "PASS",

    "No obvious next.config env injection",

    "Review browser exposure manually if env is present."
  );

  /* L11 - Worker module protection */

  const unguarded =
    WORKER_MODULES.filter(
      (f) =>
        !/\bimport\s*['"]server-only['"]\s*;?/
          .test(read(f) ?? "")
    );

  add(
    "L11",

    unguarded.length
      ? "NOT_VERIFIED"
      : "PASS",

    "Worker modules retain server-only imports",

    unguarded.join(", ")
  );

  /* L12 - Public-prefixed secret names */

  const sensitive =
    /(?:DATABASE|PASSWORD|PASSWD|SECRET|PRIVATE|API[_-]?KEY|AUTH[_-]?TOKEN|SMTP|WORKER)/i;

  const publicRisk = [];

  for (
    const [
      file,
      assignments,
    ] of envMaps
  ) {
    for (
      const name of
        assignments.keys()
    ) {
      if (
        name.startsWith("NEXT_PUBLIC_") &&
        sensitive.test(name)
      ) {
        publicRisk.push(
          `${file}:${name}`
        );
      }
    }
  }

  for (
    const name of
      Object.keys(shell)
  ) {
    if (
      name.startsWith("NEXT_PUBLIC_") &&
      sensitive.test(name)
    ) {
      publicRisk.push(
        `shell:${name}`
      );
    }
  }

  add(
    "L12",

    publicRisk.length
      ? "FAIL"
      : "PASS",

    "No suspicious NEXT_PUBLIC_ credential names in local environment",

    publicRisk.join(", ")
  );

  /* L13 - Git-ignore protection heuristic */

  const ignore =
    (read(".gitignore") ?? "")
      .split(/\r?\n/)
      .map(
        (x) => x.trim()
      )
      .filter(
        (x) =>
          x &&
          !x.startsWith("#")
      );

  const protects =
    ignore.some(
      (x) =>
        [
          ".env.local",
          ".env*",
          ".env*.local",
          "/.env.local",
          "/.env*",
        ].includes(x)
    ) &&
    !ignore.some(
      (x) =>
        [
          "!.env.local",
          "!/.env.local",
        ].includes(x)
    );

  add(
    "L13",

    protects
      ? "PASS"
      : "NOT_VERIFIED",

    ".gitignore appears to protect .env.local",

    "Confirm actual Git tracking separately; static rules are not proof."
  );

  /* L14 - Local database identity separation */

  const webUrl =
    local.get("DATABASE_URL")?.at(-1);

  const workerUrl =
    local.get("EMAIL_WORKER_DATABASE_URL")?.at(-1);

  const webRole =
    loopbackRole(webUrl);

  const workerRole =
    loopbackRole(workerUrl);

  const roles =
    !webUrl || !workerUrl
      ? "NOT_VERIFIED"
      : webRole &&
        workerRole === "bark_email_worker_service" &&
        webRole !== workerRole
          ? "PASS"
          : "FAIL";

  add(
    "L14",

    roles,

    "Local website and worker database logins are distinct and loopback-only",

    "Inspect local database user and hostname privately. No URLs are printed."
  );

  /* L15 - Production TLS configuration */

  const tlsDisabled =
    [
      ".env.production",
      ".env.production.local",
    ].some(
      (f) =>
        (
          envMaps.get(f).get(
            "DATABASE_SSL_MODE"
          ) ?? []
        ).includes("disable")
    );

  add(
    "L15",

    tlsDisabled
      ? "FAIL"
      : "PASS",

    "No explicit database TLS-disable in production dotenv files"
  );

  /* L16 - Prior audit evidence */

  const missingPrior =
    PRIOR.filter(
      (f) => !exists(f)
    );

  add(
    "L16",

    missingPrior.length
      ? "NOT_VERIFIED"
      : "PASS",

    "Files 63–69 audit evidence scripts remain present",

    missingPrior.join(", ")
  );

  /* L17 - Standard NODE_ENV value */

  add(
    "L17",

    shell.NODE_ENV === undefined ||
    [
      "development",
      "production",
      "test",
    ].includes(shell.NODE_ENV)
      ? "PASS"
      : "FAIL",

    "NODE_ENV is standard or unset (staging build uses production)"
  );

  /* L18 - Nonstandard staging dotenv */

  add(
    "L18",

    exists(".env.staging") ||
    exists(".env.staging.local")
      ? "NOT_VERIFIED"
      : "PASS",

    "No assumption that Next.js loads a custom .env.staging file",

    "Next.js does not use NODE_ENV=staging as a standard mode."
  );

  return {
    checks,

    policyIssues:
      policyIssues(POLICY),

    matrixIssues:
      matrixIssues(ACCESS),

    gates:
      EVIDENCE.map(
        ([
          id,
          area,
          requirement,
          expectedEvidence,
        ]) => ({
          id,
          area,
          requirement,
          expectedEvidence,
          status: "NOT_VERIFIED",
        })
      ),

    stagingAuthorized: false,
    productionAuthorized: false,
  };
}

/* ======================================================
   7. PRINT SECURITY RESULTS

   Never prints database URLs, credentials,
   API tokens or provider secrets.
   ====================================================== */

function format(report) {
  const lines = [
    "FILE 70 - STAGING INFRASTRUCTURE ACCESS & EVIDENCE REVIEW (OFFLINE)",
  ];

  lines.push(
    `ACCESS_MATRIX_POLICY: ${
      report.matrixIssues.length
        ? "FAIL"
        : "PASS"
    }`
  );

  lines.push(
    `STAGING_SECURITY_POLICY: ${
      report.policyIssues.length
        ? "FAIL"
        : "PASS"
    }`
  );

  for (
    const issue of [
      ...report.matrixIssues,
      ...report.policyIssues,
    ]
  ) {
    lines.push(
      `POLICY_ISSUE: ${issue}`
    );
  }

  for (
    const item of
      report.checks
  ) {
    lines.push(
      `${item.id} [${item.status}] ${item.description}`
    );

    if (item.action) {
      lines.push(
        `  REVIEW: ${item.action}`
      );
    }
  }

  const count =
    (x) =>
      report.checks.filter(
        (c) =>
          c.status === x
      ).length;

  lines.push(
    `LOCAL_SUMMARY: ${count("PASS")} PASS, ${count("FAIL")} FAIL, ${count("NOT_VERIFIED")} NOT_VERIFIED`
  );

  lines.push(
    "EXTERNAL INFRASTRUCTURE EVIDENCE (NOT TESTED):"
  );

  for (
    const gate of
      report.gates
  ) {
    lines.push(
      `${gate.id} [NOT_VERIFIED] ${gate.area}: ${gate.requirement}`
    );

    lines.push(
      `  REQUIRED EVIDENCE: ${gate.expectedEvidence}`
    );
  }

  lines.push(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

  lines.push(
    "PRODUCTION_ACTIVATION: NOT_AUTHORIZED"
  );

  lines.push(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0"
  );

  return lines.join("\n");
}

/* ======================================================
   8. PRINT TARGET ACCESS MATRIX

   This is intended policy, not actual grants.
   ====================================================== */

function printMatrix() {
  console.log(
    "FILE 70 - TARGET ACCESS MATRIX (POLICY, NOT HOSTING PERMISSIONS)"
  );

  for (
    const [
      role,
      rights,
    ] of Object.entries(ACCESS)
  ) {
    console.log(
      `${role}: ${rights.join(", ")}`
    );
  }

  console.log(
    `ACCESS_MATRIX_POLICY: ${
      matrixIssues(ACCESS).length
        ? "FAIL"
        : "PASS"
    }`
  );

  console.log(
    `STAGING_SECURITY_POLICY: ${
      policyIssues(POLICY).length
        ? "FAIL"
        : "PASS"
    }`
  );

  console.log(
    "ACTUAL_HOSTING_PERMISSIONS: NOT_VERIFIED"
  );

  console.log(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );
}

/* ======================================================
   9. FICTIONAL IN-MEMORY PROJECT

   No fixture files are created on disk.
   No real databases or passwords are used.
   ====================================================== */

function fixture() {
  const m = new Map([
    [
      ".env.local",

      FLAGS.map(
        (n) =>
          `${n}="false"`
      ).join("\n") +

      '\nDATABASE_URL="postgresql://bark_web_dev:fictional@127.0.0.1:5432/bark_ornament"' +

      '\nEMAIL_WORKER_DATABASE_URL="postgresql://bark_email_worker_service:fictional@127.0.0.1:5432/bark_ornament"',
    ],

    [
      ".gitignore",
      ".env*\n",
    ],

    [
      "package.json",

      JSON.stringify({
        scripts: {
          build: "next build",
          start: "next start",
        },

        dependencies: {
          next: "16.4.2",
        },
      }),
    ],

    [
      "next.config.ts",
      "export default { reactStrictMode: true };",
    ],

    [
      "src/app/api/quotations/route.ts",
      "export async function POST() {}",
    ],
  ]);

  for (const file of WORKER_MODULES) {
    m.set(
      file,
      'import "server-only";'
    );
  }

  for (const file of PRIOR) {
    m.set(
      file,
      "fictional previous evidence"
    );
  }

  return m;
}

/* ======================================================
   10. FICTIONAL TEST ADAPTER
   ====================================================== */

function simulate(
  files,
  shell = {}
) {
  return inspect({
    read:
      (name) =>
        files.has(name)
          ? files.get(name)
          : null,

    exists:
      (name) =>
        files.has(name),

    shell,
  });
}

/* ======================================================
   11. THIRTY-SEVEN AUTOMATED SELF-TESTS

   All scenarios use fictional data.

   No worker, database, hosting or email
   services are contacted.
   ====================================================== */

function selfTest() {
  let passed = 0;

  const test = (name, fn) => {
    fn();

    console.log(
      `PASS ${++passed}: ${name}`
    );
  };

  const status =
    (r, id) =>
      r.checks.find(
        (x) => x.id === id
      )?.status;

  const edit = (fn) => {
    const m = fixture();

    fn(m);

    return simulate(m);
  };

  const tamper = (fn) => {
    const m =
      structuredClone(POLICY);

    fn(m);

    return policyIssues(m);
  };

  const grant = (fn) => {
    const m =
      structuredClone(ACCESS);

    fn(m);

    return matrixIssues(m);
  };

  test(
    "Fictional local baseline passes all 18 checks",

    () =>
      assert.equal(
        simulate(
          fixture()
        ).checks.filter(
          (c) =>
            c.status === "PASS"
        ).length,
        18
      )
  );

  test(
    "Embedded access matrix validates",

    () =>
      assert.deepEqual(
        matrixIssues(ACCESS),
        []
      )
  );

  test(
    "Embedded staging policy validates",

    () =>
      assert.deepEqual(
        policyIssues(POLICY),
        []
      )
  );

  test(
    "Anonymous access to staging secrets rejected",

    () =>
      assert.ok(
        grant(
          (m) =>
            m["anonymous-visitor"].push(
              "staging-secrets:web-read"
            )
        ).length
      )
  );

  test(
    "Website access to worker credentials rejected",

    () =>
      assert.ok(
        grant(
          (m) =>
            m["staging-web-service"].push(
              "staging-worker:credentials"
            )
        ).length
      )
  );

  test(
    "Deployer production permission rejected",

    () =>
      assert.ok(
        grant(
          (m) =>
            m["staging-deployer"].push(
              "production-db:admin"
            )
        ).length
      )
  );

  test(
    "Unexpected staging worker principal rejected",

    () =>
      assert.ok(
        grant(
          (m) =>
            m["staging-worker"] = [
              "staging-db:worker",
            ]
        ).length
      )
  );

  test(
    "Missing required administrator grant rejected",

    () =>
      assert.ok(
        grant(
          (m) =>
            m["staging-administrator"].pop()
        ).length
      )
  );

  test(
    "Shared production database rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.stagingDatabaseId =
              m.productionDatabaseId
        ).includes(
          "DATABASE_ISOLATION"
        )
      )
  );

  test(
    "Shared production hosting rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.stagingHostingId =
              m.productionHostingId
        ).includes(
          "HOSTING_ISOLATION"
        )
      )
  );

  test(
    "Public staging access rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.publicAccess = "public"
        ).includes(
          "ACCESS_RESTRICTION"
        )
      )
  );

  test(
    "Missing administrator MFA rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.adminMfaRequired = false
        ).includes(
          "ADMIN_MFA"
        )
      )
  );

  test(
    "Unverified database TLS policy rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.databaseTls = "disabled"
        ).includes(
          "DATABASE_TLS"
        )
      )
  );

  test(
    "Running worker rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.workerDeployment = "running"
        ).includes(
          "WORKER_DEPLOYMENT"
        )
      )
  );

  test(
    "Injected worker credentials rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.workerCredentials = "present"
        ).includes(
          "WORKER_CREDENTIALS"
        )
      )
  );

  test(
    "Provider network egress rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.providerEgress = "allowed"
        ).includes(
          "PROVIDER_EGRESS"
        )
      )
  );

  test(
    "Real customer records rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.customerData = "production-copy"
        ).includes(
          "CUSTOMER_DATA"
        )
      )
  );

  test(
    "Missing restore-drill requirement rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.restoreDrill = "not-required"
        ).includes(
          "RESTORE_DRILL"
        )
      )
  );

  test(
    "Forged deployment approval rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.approvals = "approved"
        ).includes(
          "APPROVAL"
        )
      )
  );

  test(
    "Enabled policy quotation flag rejected",

    () =>
      assert.ok(
        tamper(
          (m) =>
            m.flags[FLAGS[0]] = "true"
        ).includes(
          `FLAG_${FLAGS[0]}`
        )
      )
  );

  test(
    "Missing local safety flag detected",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                ".env.local",

                m.get(".env.local").replace(
                  `${FLAGS[0]}="false"`,
                  ""
                )
              )
          ),
          "L01"
        ),
        "FAIL"
      )
  );

  test(
    "Enabled local safety flag detected",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                ".env.local",

                m.get(".env.local").replace(
                  `${FLAGS[0]}="false"`,
                  `${FLAGS[0]}="true"`
                )
              )
          ),
          "L01"
        ),
        "FAIL"
      )
  );

  test(
    "Duplicated local safety flag detected",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                ".env.local",

                m.get(".env.local") +
                  `\n${FLAGS[0]}=false`
              )
          ),
          "L01"
        ),
        "FAIL"
      )
  );

  test(
    "Production dotenv unsafe override detected",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                ".env.production.local",

                `${FLAGS[1]}=true`
              )
          ),
          "L02"
        ),
        "FAIL"
      )
  );

  test(
    "Shell unsafe override detected",

    () =>
      assert.equal(
        status(
          simulate(
            fixture(),

            {
              [FLAGS[2]]: "true",
            }
          ),
          "L03"
        ),
        "FAIL"
      )
  );

  test(
    "Production-mode unsafe flag resolution detected",

    () =>
      assert.equal(
        status(
          simulate(
            fixture(),

            {
              [FLAGS[2]]: "true",
            }
          ),
          "L05"
        ),
        "FAIL"
      )
  );

  test(
    "Static export detected",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                "next.config.ts",

                "export default {output:'export'}"
              )
          ),
          "L09"
        ),
        "FAIL"
      )
  );

  test(
    "Next config env exposure remains unverified",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                "next.config.ts",

                'export default {env:{TEST:"x"}}'
              )
          ),
          "L10"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Missing server-only worker boundary remains unverified",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                WORKER_MODULES[0],
                "export {}"
              )
          ),
          "L11"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Public secret name detected",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                ".env",

                "NEXT_PUBLIC_DATABASE_PASSWORD=fictional"
              )
          ),
          "L12"
        ),
        "FAIL"
      )
  );

  test(
    "Missing Git ignore evidence remains unverified",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.delete(
                ".gitignore"
              )
          ),
          "L13"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Shared local PostgreSQL identity detected",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                ".env.local",

                m.get(".env.local").replace(
                  "bark_email_worker_service:fictional",
                  "bark_web_dev:fictional"
                )
              )
          ),
          "L14"
        ),
        "FAIL"
      )
  );

  test(
    "Production TLS disable detected",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.set(
                ".env.production",

                "DATABASE_SSL_MODE=disable"
              )
          ),
          "L15"
        ),
        "FAIL"
      )
  );

  test(
    "Missing prior audit evidence remains unverified",

    () =>
      assert.equal(
        status(
          edit(
            (m) =>
              m.delete(
                PRIOR[0]
              )
          ),
          "L16"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Nonstandard NODE_ENV detected",

    () =>
      assert.equal(
        status(
          simulate(
            fixture(),

            {
              NODE_ENV: "staging",
            }
          ),
          "L17"
        ),
        "FAIL"
      )
  );

  test(
    "External infrastructure gates never auto-pass",

    () =>
      assert.ok(
        simulate(
          fixture()
        ).gates.every(
          (g) =>
            g.status === "NOT_VERIFIED"
        )
      )
  );

  test(
    "Reports contain no fictional passwords or approval",

    () => {
      const output =
        format(
          simulate(
            fixture()
          )
        );

      assert.ok(
        !output.includes(
          "fictional@"
        )
      );

      assert.match(
        output,
        /STAGING_ACTIVATION: NOT_AUTHORIZED/
      );

      assert.match(
        output,
        /PRODUCTION_ACTIVATION: NOT_AUTHORIZED/
      );
    }
  );

  console.log(
    `FILE 70 SELF-TEST: ${passed}/37 PASSED`
  );

  console.log(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0"
  );
}

/* ======================================================
   12. READ-ONLY PROJECT AUDIT
   ====================================================== */

function auditProject() {
  const root =
    process.cwd();

  const read = (relative) => {
    try {
      return fs.readFileSync(
        path.join(
          root,
          relative
        ),
        "utf8"
      );

    } catch (e) {
      if (e?.code === "ENOENT") {
        return null;
      }

      throw e;
    }
  };

  const exists =
    (relative) =>
      fs.existsSync(
        path.join(
          root,
          relative
        )
      );

  const result = inspect({
    read,
    exists,

    shell:
      process.env,
  });

  console.log(
    format(result)
  );

  if (
    result.policyIssues.length ||
    result.matrixIssues.length ||
    result.checks.some(
      (x) =>
        x.status === "FAIL"
    )
  ) {
    process.exitCode = 1;
  }
}

/* ======================================================
   13. COMMAND-LINE ENTRYPOINT
   ====================================================== */

const arg =
  process.argv[2];

if (
  process.argv.length !== 3 ||
  ![
    "--self-test",
    "--matrix",
    "--audit",
  ].includes(arg)
) {
  console.error(
    "Usage: node scripts/quotation-staging-infrastructure-evidence.mjs --self-test|--matrix|--audit"
  );

  process.exitCode = 2;

} else if (
  arg === "--self-test"
) {
  selfTest();

} else if (
  arg === "--matrix"
) {
  printMatrix();

} else {
  auditProject();
}

/*
 * END FILE 70
 *
 * No hosting provisioning.
 * No database changes.
 * No quotation submissions.
 * No actual email delivery.
 *
 * STAGING AND PRODUCTION NOT AUTHORIZED.
 */
