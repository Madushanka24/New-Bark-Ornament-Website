
/**
 * BARK ORNAMENT — FILE 72
 * Offline staging hosting selection and deployment preflight.
 *
 * NEW FILE:
 * scripts/quotation-staging-host-selection.mjs
 *
 * Commands from project root:
 *   node scripts/quotation-staging-host-selection.mjs --self-test
 *   node scripts/quotation-staging-host-selection.mjs --compare
 *   node scripts/quotation-staging-host-selection.mjs --plan
 *   node scripts/quotation-staging-host-selection.mjs --audit
 *
 * NO deployments, network, database, email, child processes,
 * or writes. No passwords or connection strings printed.
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
  "scripts/quotation-hosting-environment-audit.mjs",
  "scripts/quotation-staging-isolation-review.mjs",
  "scripts/quotation-staging-hosting-preflight.mjs",
  "scripts/quotation-staging-deployment-manifest.mjs",
  "scripts/quotation-secret-boundary-audit.mjs",
  "scripts/quotation-staging-infrastructure-evidence.mjs",
  "scripts/quotation-staging-evidence-register.mjs",
]);

/*
 * Based on provider documentation reviewed October 2026.
 *
 * Features are descriptive, NOT live verification
 * of a plan, credential, certificate, price,
 * or security configuration.
 */

const PROVIDERS = Object.freeze([
  Object.freeze({
    id: "railway",
    name: "Railway (provisional preference)",
    nextServer: true,
    postgres: true,
    privateDatabase: true,
    isolatedEnvironments: true,
    backupCapabilities: true,
    tlsIdentity: "UNVERIFIED",
    verdict: "PROVISIONAL_ONLY",

    note:
      "Requires real driver-specific TLS identity test, " +
      "private-role audit, restricted staging ingress " +
      "and restore drill.",
  }),

  Object.freeze({
    id: "render",
    name: "Render (conditional alternative)",
    nextServer: true,
    postgres: true,
    privateDatabase: true,
    isolatedEnvironments: "REQUIRES_PLAN_REVIEW",
    backupCapabilities: true,
    tlsIdentity: "INTERNAL_VERIFY_FULL_UNSUPPORTED",
    verdict: "BLOCKED_BY_CURRENT_TLS_POLICY",

    note:
      "Documented Render Postgres internal URL cannot " +
      "use verify-full; alternate design/security review required.",
  }),

  Object.freeze({
    id: "self-managed",
    name: "Self-managed VPS (not preferred)",
    nextServer: "OPERATOR_REQUIRED",
    postgres: "OPERATOR_REQUIRED",
    privateDatabase: "OPERATOR_REQUIRED",
    isolatedEnvironments: "OPERATOR_REQUIRED",
    backupCapabilities: "OPERATOR_REQUIRED",
    tlsIdentity: "UNVERIFIED",
    verdict: "NOT_ASSESSED_FOR_ACTIVATION",

    note:
      "Requires independent patching, firewall, TLS, " +
      "backup, restore, monitoring and incident ownership.",
  }),
]);

/*
 * These are deployment prerequisites,
 * not evidence that a hosting service exists.
 */

const GATES = Object.freeze([
  [
    "G01",
    "Provider account, ownership, billing and MFA verified",
  ],
  [
    "G02",
    "Empty staging environment created, no production duplication",
  ],
  [
    "G03",
    "Restricted staging ingress and HTTPS independently tested",
  ],
  [
    "G04",
    "Next.js Node.js runtime and supported Node version verified",
  ],
  [
    "G05",
    "Staging PostgreSQL private and separately provisioned",
  ],
  [
    "G06",
    "Least-privilege staging website DB role verified",
  ],
  [
    "G07",
    "PostgreSQL client TLS and server hostname verification proven",
  ],
  [
    "G08",
    "Server-only secrets independently scoped to staging",
  ],
  [
    "G09",
    "All three disabled flags verified in running staging process",
  ],
  [
    "G10",
    "No email worker or outbound provider credentials/egress",
  ],
  [
    "G11",
    "Synthetic-only data, backup and restore drill completed",
  ],
  [
    "G12",
    "Monitoring, rollback test and human authorization completed",
  ],
]);

/*
 * Non-executable staging setup runbook.
 *
 * Display only. No operations are performed.
 */

const PLAN = Object.freeze([
  "Select Railway only provisionally; compare the current service terms and security fit before purchasing.",

  "Identify a company-controlled account owner, billing approver and MFA-protected administrators.",

  "Create an EMPTY staging environment only after explicit authorization; never duplicate production.",

  "Define a private, restricted staging hostname with working HTTPS and no indexing.",

  "Choose one Node.js web service with build npm run build and start npm run start; do not use static export.",

  "Provision a distinct staging PostgreSQL service with no public TCP proxy.",

  "Create a restricted staging web DB role: do not inject the Postgres superuser into the website.",

  "Prove private connection TLS and hostname validation with the actual Node.js pg adapter. If unsupported, STOP.",

  "Configure server-side staging secrets only; keep worker credentials and email-provider secrets absent.",

  "Set QUOTATION_SUBMISSIONS_ENABLED, QUOTATION_E2E_TEST_MODE and QUOTATION_EMAIL_NOTIFICATIONS_ENABLED all to false.",

  "Do not deploy an email worker, cron email job, or live email-provider integration.",

  "Use synthetic staging records only; approve any schema application separately, never auto-run migrations.",

  "Verify authentication to staging, logs, backups, a real restore exercise and a rollback drill.",

  "Keep staging and production NOT_AUTHORIZED until independently reviewed evidence and explicit human approval.",
]);

/* =======================================================
   1. PARSE SIMPLE DOTENV ASSIGNMENTS

   Read only.

   No values are printed.

   This does not fully implement variable
   expansion or multiline dotenv syntax.
   ======================================================= */

function parseEnv(raw) {
  const map = new Map();

  if (typeof raw !== "string") {
    return map;
  }

  for (
    const line of raw
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
  ) {
    const match =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/
        .exec(line);

    if (!match) {
      continue;
    }

    const rhs = match[2].trim();

    const quoted =
      /^(?:"([^"]*)"|'([^']*)')(?:\s*#.*)?$/
        .exec(rhs);

    const value = quoted
      ? quoted[1] ?? quoted[2]
      : rhs
          .replace(/\s+#.*$/, "")
          .trim();

    map.set(
      match[1],

      [
        ...(map.get(match[1]) ?? []),
        value,
      ]
    );
  }

  return map;
}

/* =======================================================
   2. SIMULATE NEXT.JS ENVIRONMENT PRECEDENCE

   Only used for three protected safety flags.

   Does not load or export credentials.
   ======================================================= */

function resolveFlag(
  name,
  mode,
  maps,
  shell
) {
  if (
    Object.hasOwn(shell, name) &&
    shell[name] !== undefined
  ) {
    return shell[name];
  }

  const order = [
    `.env.${mode}.local`,

    ...(
      mode === "test"
        ? []
        : [".env.local"]
    ),

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

/* =======================================================
   3. PROVIDER REQUIREMENT EVALUATION

   A missing item remains unverified.

   Even an acceptable fictional candidate
   would not authorize deployment.
   ======================================================= */

function candidateIssues(candidate) {
  const errors = [];

  if (
    !candidate ||
    typeof candidate !== "object"
  ) {
    return ["INVALID_PROVIDER"];
  }

  if (candidate.nextServer !== true) {
    errors.push(
      "NEXT_SERVER_UNVERIFIED"
    );
  }

  if (candidate.postgres !== true) {
    errors.push(
      "POSTGRES_UNVERIFIED"
    );
  }

  if (
    candidate.privateDatabase !== true
  ) {
    errors.push(
      "PRIVATE_DATABASE_UNVERIFIED"
    );
  }

  if (
    candidate.isolatedEnvironments !== true
  ) {
    errors.push(
      "ENVIRONMENT_ISOLATION_UNVERIFIED"
    );
  }

  if (
    candidate.backupCapabilities !== true
  ) {
    errors.push(
      "BACKUP_CAPABILITY_UNVERIFIED"
    );
  }

  if (
    candidate.tlsIdentity !== "VERIFIED"
  ) {
    errors.push(
      "DB_TLS_IDENTITY_NOT_VERIFIED"
    );
  }

  return errors;
}

/* =======================================================
   4. FOURTEEN LOCAL PREFLIGHT CHECKS

   Local PASS only verifies observable
   prerequisites.

   It does not establish hosting,
   TLS, backups or actual staging access.
   ======================================================= */

function inspect({
  read,
  exists,
  shell = {},
}) {
  const maps = new Map(
    ENV_FILES.map(
      (name) => [
        name,
        parseEnv(read(name)),
      ]
    )
  );

  const base =
    maps.get(".env.local");

  const checks = [];

  function add(
    id,
    status,
    title,
    note = ""
  ) {
    checks.push({
      id,
      status,
      title,

      note:
        status === "PASS"
          ? ""
          : note,
    });
  }

  /* L01 - Protected local flags */

  const exactFlags =
    FLAGS.every(
      (name) =>
        base.get(name)?.length === 1 &&
        base.get(name)[0] === "false"
    );

  add(
    "L01",

    exactFlags
      ? "PASS"
      : "FAIL",

    "Local quotation and email switches all false exactly once"
  );

  /* L02 - Other dotenv overrides */

  const unsafeOverrides =
    ENV_FILES.filter(
      (file) =>
        file !== ".env.local"
    ).flatMap(
      (file) =>
        FLAGS.filter(
          (name) => {
            const values =
              maps.get(file)
                ?.get(name) ?? [];

            return (
              values.length > 1 ||
              values.some(
                (x) =>
                  x !== "false"
              )
            );
          }
        ).map(
          (name) =>
            `${file}:${name}`
        )
    );

  add(
    "L02",

    unsafeOverrides.length
      ? "FAIL"
      : "PASS",

    "No unsafe dotenv flag overrides",

    unsafeOverrides.join(", ")
  );

  /* L03 - Shell flag overrides */

  const badShell =
    FLAGS.filter(
      (name) =>
        shell[name] !== undefined &&
        shell[name] !== "false"
    );

  add(
    "L03",

    badShell.length
      ? "FAIL"
      : "PASS",

    "No unsafe process flag overrides",

    badShell.join(", ")
  );

  /* L04 - Development mode */

  const dev =
    FLAGS.every(
      (name) =>
        resolveFlag(
          name,
          "development",
          maps,
          shell
        ) === "false"
    );

  add(
    "L04",

    dev
      ? "PASS"
      : "FAIL",

    "Local development flag resolution remains disabled"
  );

  /* L05 - Local production mode */

  const prod =
    FLAGS.every(
      (name) =>
        resolveFlag(
          name,
          "production",
          maps,
          shell
        ) === "false"
    );

  add(
    "L05",

    prod
      ? "PASS"
      : "FAIL",

    "Local production-mode flag resolution remains disabled"
  );

  /* L06 - Build and start scripts */

  let pkg = null;

  try {
    pkg = JSON.parse(
      read("package.json") ?? ""
    );
  } catch {
    // Failure reported below.
  }

  const scripts =
    pkg?.scripts;

  add(
    "L06",

    typeof scripts?.build === "string" &&
    typeof scripts?.start === "string"
      ? "PASS"
      : "FAIL",

    "Next.js build and start commands present"
  );

  /* L07 - Next.js dependency */

  const next =
    pkg?.dependencies?.next ??
    pkg?.devDependencies?.next;

  add(
    "L07",

    typeof next === "string"
      ? "PASS"
      : "FAIL",

    "Next.js package dependency present"
  );

  /* L08 - Server quotation route */

  const api = [
    "src/app/api/quotations/route.ts",
    "app/api/quotations/route.ts",
  ].some(exists);

  add(
    "L08",

    api
      ? "PASS"
      : "NOT_VERIFIED",

    "Server-side quotation API route located"
  );

  /* L09-L10 - Next.js configuration */

  const configs = [
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
  ];

  const conf =
    configs
      .map(read)
      .filter(
        (x) =>
          typeof x === "string"
      )
      .join("\n");

  add(
    "L09",

    /\boutput\s*:\s*['"]export['"]/
      .test(conf)
        ? "FAIL"
        : "PASS",

    "No obvious static export"
  );

  add(
    "L10",

    /(?:^|[,{]\s*)env\s*:/m
      .test(conf)
        ? "NOT_VERIFIED"
        : "PASS",

    "No obvious next.config env injection",

    "Review browser bundle exposure."
  );

  /* L11 - Public-prefixed secret names */

  const sensitiveName =
    /(?:DATABASE|PASSWORD|PASSWD|SECRET|PRIVATE|API[_-]?KEY|AUTH[_-]?TOKEN|SMTP|WORKER)/i;

  const risky = [];

  for (
    const [
      file,
      assignments,
    ] of maps
  ) {
    for (
      const name of
      assignments.keys()
    ) {
      if (
        name.startsWith(
          "NEXT_PUBLIC_"
        ) &&
        sensitiveName.test(name)
      ) {
        risky.push(
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
      name.startsWith(
        "NEXT_PUBLIC_"
      ) &&
      sensitiveName.test(name)
    ) {
      risky.push(
        `shell:${name}`
      );
    }
  }

  add(
    "L11",

    risky.length
      ? "FAIL"
      : "PASS",

    "No suspicious publicly prefixed secret names",

    risky.join(", ")
  );

  /* L12 - Prior audit files retained */

  const missing =
    PRIOR.filter(
      (file) =>
        !exists(file)
    );

  add(
    "L12",

    missing.length
      ? "NOT_VERIFIED"
      : "PASS",

    "Files 65–71 staging audit scripts retained",

    missing.join(", ")
  );

  /* L13 - Standard NODE_ENV */

  add(
    "L13",

    shell.NODE_ENV === undefined ||
    [
      "development",
      "production",
      "test",
    ].includes(
      shell.NODE_ENV
    )
      ? "PASS"
      : "FAIL",

    "NODE_ENV is standard or unset"
  );

  /* L14 - Staging dotenv limitation */

  const stagingDotenv = [
    ".env.staging",
    ".env.staging.local",
  ].some(exists);

  add(
    "L14",

    stagingDotenv
      ? "NOT_VERIFIED"
      : "PASS",

    "No assumption .env.staging auto-loads",

    "Next.js staging runtime uses NODE_ENV=production."
  );

  return {
    checks,

    gates:
      GATES.map(
        ([id, title]) => ({
          id,
          title,

          status:
            "NOT_VERIFIED",
        })
      ),

    selection:
      "RAILWAY_PROVISIONAL_NOT_APPROVED",

    stagingAuthorized:
      false,

    productionAuthorized:
      false,
  };
}

/* =======================================================
   5. SAFE REPORT OUTPUT

   No environment values are displayed.
   ======================================================= */

function formatAudit(result) {
  const out = [
    "FILE 72 — OFFLINE HOSTING SELECTION PREFLIGHT",
  ];

  out.push(
    `HOSTING_SELECTION: ${result.selection}`
  );

  for (
    const item of
    result.checks
  ) {
    out.push(
      `${item.id} [${item.status}] ${item.title}`
    );

    if (item.note) {
      out.push(
        `  REVIEW: ${item.note}`
      );
    }
  }

  const count =
    (status) =>
      result.checks.filter(
        (item) =>
          item.status ===
            status
      ).length;

  out.push(
    `LOCAL_SUMMARY: ${count("PASS")} PASS, ${count("FAIL")} FAIL, ${count("NOT_VERIFIED")} NOT_VERIFIED`
  );

  out.push(
    "EXTERNAL STAGING EVIDENCE:"
  );

  for (
    const gate of
    result.gates
  ) {
    out.push(
      `${gate.id} [NOT_VERIFIED] ${gate.title}`
    );
  }

  out.push(
    "DATABASE_TLS_IDENTITY: NOT_VERIFIED"
  );

  out.push(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

  out.push(
    "PRODUCTION_ACTIVATION: NOT_AUTHORIZED"
  );

  out.push(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0"
  );

  return out.join("\n");
}

/* =======================================================
   6. DISPLAY HOSTING COMPARISON

   Descriptive only.

   No connection to hosting services.
   ======================================================= */

function printCompare() {
  console.log(
    "FILE 72 — PROVIDER SHORTLIST (DOCUMENTATION, NOT LIVE SECURITY PROOF)"
  );

  for (
    const provider of
    PROVIDERS
  ) {
    console.log(
      `${provider.id.toUpperCase()} | ${provider.name}`
    );

    console.log(
      `  DECISION: ${provider.verdict}`
    );

    console.log(
      `  TLS_IDENTITY: ${provider.tlsIdentity}`
    );

    console.log(
      `  REMAINING_CHECKS: ${
        candidateIssues(provider)
          .join(", ") || "NONE"
      }`
    );

    console.log(
      `  NOTE: ${provider.note}`
    );
  }

  console.log(
    "SELECTED_FOR_LATER_EVALUATION: RAILWAY_PROVISIONAL"
  );

  console.log(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );
}

/* =======================================================
   7. DISPLAY NON-EXECUTABLE DEPLOYMENT PLAN
   ======================================================= */

function printPlan() {
  console.log(
    "FILE 72 — NON-EXECUTABLE STAGING SETUP PREREQUISITES"
  );

  PLAN.forEach(
    (step, i) =>
      console.log(
        `${String(i + 1).padStart(2, "0")}. ${step}`
      )
  );

  console.log(
    "ACTIONS_PERFORMED: 0"
  );

  console.log(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

  console.log(
    "PRODUCTION_ACTIVATION: NOT_AUTHORIZED"
  );
}

/* =======================================================
   8. FICTIONAL IN-MEMORY PROJECT

   No files created.
   No real databases or secrets.
   ======================================================= */

function fakeProject() {
  const files = new Map([
    [
      ".env.local",

      FLAGS.map(
        (name) =>
          `${name}="false"`
      ).join("\n"),
    ],

    [
      "package.json",

      JSON.stringify({
        scripts: {
          build:
            "next build",

          start:
            "next start",
        },

        dependencies: {
          next:
            "16.4.2",
        },
      }),
    ],

    [
      "next.config.ts",

      "export default {reactStrictMode:true};",
    ],

    [
      "src/app/api/quotations/route.ts",

      "export async function POST() {}",
    ],
  ]);

  for (
    const filename of PRIOR
  ) {
    files.set(
      filename,
      "fictional"
    );
  }

  return files;
}

function simulate(
  files,
  shell = {}
) {
  return inspect({
    read:
      (name) =>
        files.get(name) ?? null,

    exists:
      (name) =>
        files.has(name),

    shell,
  });
}

/* =======================================================
   9. THIRTY-TWO FICTIONAL SELF-TESTS
   ======================================================= */

function selfTest() {
  let count = 0;

  function test(title, fn) {
    fn();

    console.log(
      `PASS ${++count}: ${title}`
    );
  }

  const status =
    (result, id) =>
      result.checks.find(
        (item) =>
          item.id === id
      )?.status;

  const change =
    (fn) => {
      const files =
        fakeProject();

      fn(files);

      return simulate(files);
    };

  test(
    "Fictional local baseline passes 14/14",

    () =>
      assert.equal(
        simulate(
          fakeProject()
        ).checks.filter(
          (x) =>
            x.status === "PASS"
        ).length,

        14
      )
  );

  test(
    "Preferred provider is provisional, never approved",

    () =>
      assert.equal(
        PROVIDERS[0].verdict,
        "PROVISIONAL_ONLY"
      )
  );

  test(
    "Railway database identity remains unverified",

    () =>
      assert.ok(
        candidateIssues(
          PROVIDERS[0]
        ).includes(
          "DB_TLS_IDENTITY_NOT_VERIFIED"
        )
      )
  );

  test(
    "Render internal verify-full limitation blocks current policy",

    () =>
      assert.equal(
        PROVIDERS[1].verdict,
        "BLOCKED_BY_CURRENT_TLS_POLICY"
      )
  );

  test(
    "Self-managed hosting requires operational verification",

    () =>
      assert.ok(
        candidateIssues(
          PROVIDERS[2]
        ).length > 1
      )
  );

  test(
    "Fully verified fictional candidate has no missing capabilities",

    () =>
      assert.deepEqual(
        candidateIssues({
          nextServer: true,
          postgres: true,
          privateDatabase: true,
          isolatedEnvironments: true,
          backupCapabilities: true,
          tlsIdentity: "VERIFIED",
        }),

        []
      )
  );

  test(
    "Missing full-stack runtime rejected",

    () =>
      assert.ok(
        candidateIssues({
          ...PROVIDERS[0],
          nextServer: false,
        }).includes(
          "NEXT_SERVER_UNVERIFIED"
        )
      )
  );

  test(
    "Missing database rejected",

    () =>
      assert.ok(
        candidateIssues({
          ...PROVIDERS[0],
          postgres: false,
        }).includes(
          "POSTGRES_UNVERIFIED"
        )
      )
  );

  test(
    "Missing private network rejected",

    () =>
      assert.ok(
        candidateIssues({
          ...PROVIDERS[0],
          privateDatabase: false,
        }).includes(
          "PRIVATE_DATABASE_UNVERIFIED"
        )
      )
  );

  test(
    "Missing environment isolation rejected",

    () =>
      assert.ok(
        candidateIssues({
          ...PROVIDERS[0],
          isolatedEnvironments: false,
        }).includes(
          "ENVIRONMENT_ISOLATION_UNVERIFIED"
        )
      )
  );

  test(
    "Missing backup capability rejected",

    () =>
      assert.ok(
        candidateIssues({
          ...PROVIDERS[0],
          backupCapabilities: false,
        }).includes(
          "BACKUP_CAPABILITY_UNVERIFIED"
        )
      )
  );

  test(
    "Null provider rejected",

    () =>
      assert.deepEqual(
        candidateIssues(null),
        ["INVALID_PROVIDER"]
      )
  );

  test(
    "Missing local switch fails",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                ".env.local",

                FLAGS.slice(1)
                  .map(
                    (x) =>
                      `${x}=false`
                  )
                  .join("\n")
              )
          ),

          "L01"
        ),

        "FAIL"
      )
  );

  test(
    "Enabled local switch fails",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                ".env.local",

                files.get(
                  ".env.local"
                ).replace(
                  '"false"',
                  '"true"'
                )
              )
          ),

          "L01"
        ),

        "FAIL"
      )
  );

  test(
    "Duplicate local switch fails",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                ".env.local",

                files.get(
                  ".env.local"
                ) +
                `\n${FLAGS[0]}=false`
              )
          ),

          "L01"
        ),

        "FAIL"
      )
  );

  test(
    "Production dotenv override fails",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                ".env.production.local",

                `${FLAGS[0]}=true`
              )
          ),

          "L02"
        ),

        "FAIL"
      )
  );

  test(
    "Shell override fails",

    () =>
      assert.equal(
        status(
          simulate(
            fakeProject(),

            {
              [FLAGS[0]]:
                "true",
            }
          ),

          "L03"
        ),

        "FAIL"
      )
  );

  test(
    "Development resolution fails on unsafe shell flag",

    () =>
      assert.equal(
        status(
          simulate(
            fakeProject(),

            {
              [FLAGS[1]]:
                "true",
            }
          ),

          "L04"
        ),

        "FAIL"
      )
  );

  test(
    "Production resolution fails on unsafe dotenv flag",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                ".env.production.local",

                `${FLAGS[2]}=true`
              )
          ),

          "L05"
        ),

        "FAIL"
      )
  );

  test(
    "Missing build script fails",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                "package.json",

                JSON.stringify({
                  scripts: {
                    start:
                      "next start",
                  },

                  dependencies: {
                    next:
                      "16",
                  },
                })
              )
          ),

          "L06"
        ),

        "FAIL"
      )
  );

  test(
    "Missing Next.js dependency fails",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                "package.json",

                JSON.stringify({
                  scripts: {
                    build:
                      "next build",

                    start:
                      "next start",
                  },
                })
              )
          ),

          "L07"
        ),

        "FAIL"
      )
  );

  test(
    "Missing quotation route remains unverified",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.delete(
                "src/app/api/quotations/route.ts"
              )
          ),

          "L08"
        ),

        "NOT_VERIFIED"
      )
  );

  test(
    "Static export rejected",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                "next.config.ts",

                "export default {output:'export'};"
              )
          ),

          "L09"
        ),

        "FAIL"
      )
  );

  test(
    "Next config env injection needs review",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                "next.config.ts",

                'export default {env:{X:"fixture"}};'
              )
          ),

          "L10"
        ),

        "NOT_VERIFIED"
      )
  );

  test(
    "Public secret variable name fails",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                ".env",

                "NEXT_PUBLIC_DATABASE_PASSWORD=fictional"
              )
          ),

          "L11"
        ),

        "FAIL"
      )
  );

  test(
    "Missing previous file remains unverified",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.delete(
                PRIOR[0]
              )
          ),

          "L12"
        ),

        "NOT_VERIFIED"
      )
  );

  test(
    "NODE_ENV=staging rejected",

    () =>
      assert.equal(
        status(
          simulate(
            fakeProject(),

            {
              NODE_ENV:
                "staging",
            }
          ),

          "L13"
        ),

        "FAIL"
      )
  );

  test(
    "Unsupported .env.staging requires review",

    () =>
      assert.equal(
        status(
          change(
            (files) =>
              files.set(
                ".env.staging",

                "FIXTURE=1"
              )
          ),

          "L14"
        ),

        "NOT_VERIFIED"
      )
  );

  test(
    "External gates remain unverified",

    () =>
      assert.ok(
        simulate(
          fakeProject()
        ).gates.every(
          (gate) =>
            gate.status ===
              "NOT_VERIFIED"
        )
      )
  );

  test(
    "Real deployment remains unauthorized even with passing local checks",

    () => {
      const result =
        simulate(
          fakeProject()
        );

      assert.equal(
        result.stagingAuthorized,
        false
      );

      assert.equal(
        result.productionAuthorized,
        false
      );
    }
  );

  test(
    "Safe report hides fictional credentials",

    () => {
      const files =
        fakeProject();

      files.set(
        ".env",

        "PRIVATE_API_KEY=FICTIONAL_SECRET_SENTINEL"
      );

      assert.ok(
        !formatAudit(
          simulate(files)
        ).includes(
          "FICTIONAL_SECRET_SENTINEL"
        )
      );
    }
  );

  test(
    "Report explicitly retains TLS and deployment blockers",

    () => {
      const output =
        formatAudit(
          simulate(
            fakeProject()
          )
        );

      assert.match(
        output,

        /DATABASE_TLS_IDENTITY: NOT_VERIFIED/
      );

      assert.match(
        output,

        /STAGING_ACTIVATION: NOT_AUTHORIZED/
      );
    }
  );

  console.log(
    `FILE 72 SELF-TEST: ${count}/32 PASSED`
  );

  console.log(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0"
  );
}

/* =======================================================
   10. ACTUAL PROJECT FILE READER

   Read-only.
   No secrets included in report.
   ======================================================= */

function readProject(root) {
  const read =
    (relative) => {
      try {
        return fs.readFileSync(
          path.join(
            root,
            relative
          ),

          "utf8"
        );

      } catch (error) {
        if (
          error?.code ===
            "ENOENT"
        ) {
          return null;
        }

        throw error;
      }
    };

  return {
    read,

    exists:
      (relative) =>
        fs.existsSync(
          path.join(
            root,
            relative
          )
        ),

    shell:
      process.env,
  };
}

/* =======================================================
   11. COMMAND-LINE ENTRYPOINT
   ======================================================= */

const args =
  process.argv.slice(2);

if (
  args.length !== 1 ||

  ![
    "--self-test",
    "--compare",
    "--plan",
    "--audit",
  ].includes(
    args[0]
  )
) {
  console.error(
    "Usage: node scripts/quotation-staging-host-selection.mjs --self-test|--compare|--plan|--audit"
  );

  process.exitCode = 2;

} else if (
  args[0] === "--self-test"
) {
  selfTest();

} else if (
  args[0] === "--compare"
) {
  printCompare();

} else if (
  args[0] === "--plan"
) {
  printPlan();

} else {
  const result =
    inspect(
      readProject(
        process.cwd()
      )
    );

  console.log(
    formatAudit(result)
  );

  if (
    result.checks.some(
      (item) =>
        item.status === "FAIL"
    )
  ) {
    process.exitCode = 1;
  }
}

/*
 * END FILE 72
 *
 * NO HOSTING, DATABASE, EMAIL
 * OR DEPLOYMENT ACTIONS.
 */
