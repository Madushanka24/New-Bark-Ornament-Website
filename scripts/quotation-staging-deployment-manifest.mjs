
/**
 * BARK ORNAMENT — FILE 68
 * Provider-neutral, NON-DEPLOYABLE staging deployment manifest.
 *
 * Read-only:
 * - No network requests
 * - No child processes
 * - No database connections
 * - No email-provider access
 * - No file writes
 *
 * Commands (from project root):
 *   node scripts/quotation-staging-deployment-manifest.mjs --self-test
 *   node scripts/quotation-staging-deployment-manifest.mjs --manifest
 *   node scripts/quotation-staging-deployment-manifest.mjs --audit
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/* =======================================================
   1. DISABLED QUOTATION AND EMAIL SWITCHES
   ======================================================= */

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

const PREVIOUS = Object.freeze([
  "scripts/quotation-email-operational-readiness-review.sql",
  "scripts/quotation-deployment-readiness-review.mjs",
  "scripts/quotation-hosting-environment-audit.mjs",
  "scripts/quotation-staging-isolation-review.mjs",
  "scripts/quotation-staging-hosting-preflight.mjs",
]);

const SERVER_MODULES = Object.freeze([
  "src/lib/quotation-email-worker-handoff-db.ts",
  "src/lib/quotation-email-worker-handoff-coordinator.ts",
]);

/* =======================================================
   2. EMBEDDED STAGING DEPLOYMENT MANIFEST

   This is a DECLARATION OF REQUIREMENTS.

   It is not real staging infrastructure and
   is not directly deployable.

   No hostname, URL, password, token, database
   address or email-provider credential exists
   in this manifest.

   All external evidence remains UNVERIFIED.
   ======================================================= */

const STAGING_MANIFEST = Object.freeze({
  schemaVersion: 1,

  label: "Bark Ornament - staging policy draft",

  environment: "staging",

  authorization: "not-authorized",

  runtime: {
    type: "node-server",
    nodeEnv: "production",
    build: "npm run build",
    start: "npm run start",
    staticExport: false,
  },

  ingress: {
    httpsRequired: true,
    restrictedAccessRequired: true,
    separateFromProduction: true,
  },

  database: {
    service: "postgresql",
    separateFromProduction: true,
    privateNetworkRequired: true,
    verifiedTlsRequired: true,
    distinctRestrictedWebRole: true,
    workerCredentialsNotInjected: true,
    realCustomerDataForbidden: true,
  },

  features: Object.fromEntries(
    FLAGS.map((name) => [name, "false"])
  ),

  email: {
    worker: "absent",
    providerCredentials: "absent",
    providerEgress: "blocked",
    outboundDelivery: "disabled",
  },

  secrets: {
    storage: "host-managed-server-only",
    committedToRepository: false,
    publicExposure: false,
  },

  recovery: {
    independentBackupRequired: true,
    restoreDrillRequired: true,
    releaseRollbackRequired: true,
  },

  controls: {
    monitoringRequired: true,
    retentionReviewRequired: true,
    explicitApprovalRequired: true,
  },

  evidence: {
    stagingProvisioned: "UNVERIFIED",
    httpsAndIngress: "UNVERIFIED",
    databaseIsolationAndTls: "UNVERIFIED",
    managedSecrets: "UNVERIFIED",
    providerEgress: "UNVERIFIED",
    backupsAndRestore: "UNVERIFIED",
    monitoringAndRollback: "UNVERIFIED",
    stagingAcceptance: "UNVERIFIED",
  },
});

/* =======================================================
   3. EXTERNAL DEPLOYMENT GATES

   These cannot be proved by a local audit.

   All remain NOT_VERIFIED.
   ======================================================= */

const GATES = Object.freeze([
  [
    "G01",
    "Staging hosting and distinct hostname established",
  ],
  [
    "G02",
    "HTTPS certificate and restricted ingress verified",
  ],
  [
    "G03",
    "Server-capable Next.js runtime deployed and observed",
  ],
  [
    "G04",
    "Dedicated PostgreSQL, restricted role and private network verified",
  ],
  [
    "G05",
    "Driver-specific database TLS and hostname validation tested",
  ],
  [
    "G06",
    "Managed server-only credentials and rotation policy checked",
  ],
  [
    "G07",
    "Staging switches verified false in the actual running process",
  ],
  [
    "G08",
    "No worker process, provider credentials or outbound provider egress",
  ],
  [
    "G09",
    "No production customer information in staging",
  ],
  [
    "G10",
    "Independent backup and completed restoration drill",
  ],
  [
    "G11",
    "Monitoring, privacy/retention and incident response reviewed",
  ],
  [
    "G12",
    "Rehearsed release rollback and formal deployment approval",
  ],
]);

/* =======================================================
   4. VALIDATE MANDATORY MANIFEST POLICY

   This validates the declared policy, not
   the existence of deployed infrastructure.

   Returns issue codes only.

   No automatic repair or activation.
   ======================================================= */

function validateManifest(m) {
  const issues = [];

  const requireValue = (condition, code) => {
    if (!condition) {
      issues.push(code);
    }
  };

  if (
    !m ||
    typeof m !== "object" ||
    Array.isArray(m)
  ) {
    return ["MANIFEST_INVALID"];
  }

  requireValue(
    m.schemaVersion === 1,
    "MANIFEST_VERSION"
  );

  requireValue(
    m.environment === "staging",
    "ENVIRONMENT"
  );

  requireValue(
    m.authorization === "not-authorized",
    "AUTHORIZATION"
  );

  requireValue(
    ["node-server", "docker-node"].includes(
      m.runtime?.type
    ),
    "RUNTIME"
  );

  requireValue(
    m.runtime?.nodeEnv === "production",
    "NODE_ENV"
  );

  requireValue(
    m.runtime?.build === "npm run build",
    "BUILD_COMMAND"
  );

  requireValue(
    m.runtime?.start === "npm run start",
    "START_COMMAND"
  );

  requireValue(
    m.runtime?.staticExport === false,
    "STATIC_EXPORT"
  );

  for (const k of [
    "httpsRequired",
    "restrictedAccessRequired",
    "separateFromProduction",
  ]) {
    requireValue(
      m.ingress?.[k] === true,
      `INGRESS_${k}`
    );
  }

  requireValue(
    m.database?.service === "postgresql",
    "DATABASE_TYPE"
  );

  for (const k of [
    "separateFromProduction",
    "privateNetworkRequired",
    "verifiedTlsRequired",
    "distinctRestrictedWebRole",
    "workerCredentialsNotInjected",
    "realCustomerDataForbidden",
  ]) {
    requireValue(
      m.database?.[k] === true,
      `DATABASE_${k}`
    );
  }

  for (const name of FLAGS) {
    requireValue(
      m.features?.[name] === "false",
      `FLAG_${name}`
    );
  }

  requireValue(
    m.email?.worker === "absent",
    "WORKER"
  );

  requireValue(
    m.email?.providerCredentials === "absent",
    "PROVIDER_CREDENTIALS"
  );

  requireValue(
    m.email?.providerEgress === "blocked",
    "PROVIDER_EGRESS"
  );

  requireValue(
    m.email?.outboundDelivery === "disabled",
    "OUTBOUND_DELIVERY"
  );

  requireValue(
    m.secrets?.storage === "host-managed-server-only",
    "SECRET_STORAGE"
  );

  requireValue(
    m.secrets?.committedToRepository === false,
    "SECRET_REPOSITORY"
  );

  requireValue(
    m.secrets?.publicExposure === false,
    "SECRET_PUBLIC"
  );

  for (const k of [
    "independentBackupRequired",
    "restoreDrillRequired",
    "releaseRollbackRequired",
  ]) {
    requireValue(
      m.recovery?.[k] === true,
      `RECOVERY_${k}`
    );
  }

  for (const k of [
    "monitoringRequired",
    "retentionReviewRequired",
    "explicitApprovalRequired",
  ]) {
    requireValue(
      m.controls?.[k] === true,
      `CONTROL_${k}`
    );
  }

  const expectedEvidence =
    Object.keys(STAGING_MANIFEST.evidence);

  requireValue(
    m.evidence &&
      expectedEvidence.every(
        (k) =>
          m.evidence[k] === "UNVERIFIED"
      ),
    "EXTERNAL_EVIDENCE_MUST_REMAIN_UNVERIFIED"
  );

  return issues;
}

/* =======================================================
   5. PARSE SIMPLE DOTENV ASSIGNMENTS

   No values from secrets are printed.

   This parser does not evaluate interpolation,
   multiline values or custom loaders.

   The real hosting configuration requires
   independent verification.
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

    const text = match[2].trim();

    const q =
      /^(?:"([^"]*)"|'([^']*)')(?:\s*#.*)?$/
        .exec(text);

    const value = q
      ? q[1] ?? q[2]
      : text
          .replace(/\s+#.*$/, "")
          .trim();

    const array =
      map.get(match[1]) ?? [];

    array.push(value);

    map.set(match[1], array);
  }

  return map;
}

/* =======================================================
   6. MODEL NEXT.JS ENVIRONMENT PRECEDENCE

   Restricted to the three feature flags.

   Priority:
   1. Process environment
   2. .env.<mode>.local
   3. .env.local (except test)
   4. .env.<mode>
   5. .env
   ======================================================= */

function effectiveFlag(
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

  const paths = [
    `.env.${mode}.local`,

    ...(
      mode === "test"
        ? []
        : [".env.local"]
    ),

    `.env.${mode}`,
    ".env",
  ];

  for (const filename of paths) {
    const values =
      maps.get(filename)?.get(name) ?? [];

    if (values.length > 0) {
      return values.at(-1);
    }
  }

  return undefined;
}

/* =======================================================
   7. READ-ONLY LOCAL PROJECT INSPECTION

   16 local checks.

   Actual remote staging configuration is
   not read or tested.

   The script never creates or modifies
   any website file.
   ======================================================= */

function inspectProject({
  read,
  exists,
  shell = {},
}) {
  const result = [];

  const add = (
    id,
    pass,
    label,
    note = ""
  ) => result.push({
    id,

    status:
      pass === true
        ? "PASS"
        : pass === false
          ? "FAIL"
          : "NOT_VERIFIED",

    label,

    note:
      pass === true
        ? ""
        : note,
  });

  const maps = new Map(
    ENV_FILES.map(
      (f) => [
        f,
        parseEnv(read(f)),
      ]
    )
  );

  const local =
    maps.get(".env.local");

  /* L01 - Exact disabled local switches */

  add(
    "L01",

    FLAGS.every(
      (f) =>
        local.get(f)?.length === 1 &&
        local.get(f)[0] === "false"
    ),

    "Three disabled .env.local switches exactly once",

    "Review .env.local switch names only."
  );

  /* L02 - No unsafe alternative dotenv values */

  const unsafeDotenv = [];

  for (
    const filename of
      ENV_FILES.filter(
        (f) =>
          f !== ".env.local"
      )
  ) {
    for (const f of FLAGS) {
      const v =
        maps.get(filename).get(f) ?? [];

      if (
        v.length > 1 ||
        v.some(
          (item) =>
            item !== "false"
        )
      ) {
        unsafeDotenv.push(
          `${filename}:${f}`
        );
      }
    }
  }

  add(
    "L02",

    unsafeDotenv.length === 0,

    "Other local dotenv files do not enable switches",

    unsafeDotenv.join(", ")
  );

  /* L03 - Process environment safety */

  const unsafeShell =
    FLAGS.filter(
      (f) =>
        shell[f] !== undefined &&
        shell[f] !== "false"
    );

  add(
    "L03",

    unsafeShell.length === 0,

    "Current shell has no unsafe switch overrides",

    unsafeShell.join(", ")
  );

  /* L04-L05 - Local environment precedence */

  for (
    const [id, mode] of [
      ["L04", "development"],
      ["L05", "production"],
    ]
  ) {
    const unsafe =
      FLAGS.filter(
        (f) =>
          effectiveFlag(
            f,
            mode,
            maps,
            shell
          ) !== "false"
      );

    add(
      id,

      unsafe.length === 0,

      `Effective local ${mode} flags all false`,

      unsafe.join(", ")
    );
  }

  /* L06-L07 - Application package metadata */

  let pkg = null;

  try {
    pkg = JSON.parse(
      read("package.json") ?? ""
    );
  } catch {
    // Read-only finding.
  }

  add(
    "L06",

    typeof pkg?.scripts?.build ===
      "string" &&
    pkg.scripts.build.length > 0 &&

    typeof pkg?.scripts?.start ===
      "string" &&
    pkg.scripts.start.length > 0,

    "Application build and start scripts exist",

    "Review package.json scripts."
  );

  add(
    "L07",

    typeof pkg?.dependencies?.next ===
      "string" ||

    typeof pkg?.devDependencies?.next ===
      "string",

    "Next.js package dependency exists",

    "Review package.json dependency."
  );

  /* L08 - Server-side quotation API */

  add(
    "L08",

    exists(
      "src/app/api/quotations/route.ts"
    ) ||
    exists(
      "app/api/quotations/route.ts"
    ),

    "Server-side quotation route exists",

    "Locate quotation route; do not create a placeholder."
  );

  /* L09-L10 - Next.js configuration */

  const configFiles = [
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
  ];

  const conf =
    configFiles
      .map(read)
      .filter(
        (x) =>
          x !== null
      )
      .join("\n");

  add(
    "L09",

    !/\boutput\s*:\s*['"]export['"]/
      .test(conf),

    "Next.js does not specify static export",

    "Server APIs require Node.js or a supported equivalent."
  );

  add(
    "L10",

    /(?:^|[,{]\s*)env\s*:/m
      .test(conf)
        ? null
        : true,

    "No obvious next.config env bundle exposure",

    "Review next.config env configuration manually."
  );

  /* L11 - Server-only worker modules */

  const absent =
    SERVER_MODULES.filter(
      (f) =>
        !/\bimport\s*['"]server-only['"]\s*;?/
          .test(read(f) ?? "")
    );

  add(
    "L11",

    absent.length === 0,

    "Restricted worker modules retain server-only imports",

    absent.join(", ")
  );

  /* L12 - Suspicious public secret names */

  const suspicious = [];

  const secretName =
    /(?:DATABASE|PASSWORD|PASSWD|SECRET|PRIVATE|API[_-]?KEY|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|SMTP|WORKER)/i;

  for (
    const [file, assignments] of maps
  ) {
    for (
      const name of assignments.keys()
    ) {
      if (
        name.startsWith("NEXT_PUBLIC_") &&
        secretName.test(name)
      ) {
        suspicious.push(
          `${file}:${name}`
        );
      }
    }
  }

  for (
    const name of Object.keys(shell)
  ) {
    if (
      name.startsWith("NEXT_PUBLIC_") &&
      secretName.test(name)
    ) {
      suspicious.push(
        `process:${name}`
      );
    }
  }

  add(
    "L12",

    suspicious.length === 0,

    "No suspicious NEXT_PUBLIC_ secret names in local environment",

    suspicious.join(", ")
  );

  /* L13 - Files 63-67 preserved */

  add(
    "L13",

    PREVIOUS.every(exists),

    "Files 63–67 readiness scripts retained",

    PREVIOUS.filter(
      (f) =>
        !exists(f)
    ).join(", ")
  );

  /* L14 - No false assumption about .env.staging */

  add(
    "L14",

    !exists(".env.staging") &&
    !exists(".env.staging.local")
      ? true
      : null,

    "No assumption that .env.staging loads automatically",

    "Review any .env.staging file: it is not a standard Next.js deployment mode."
  );

  /* L15 - Production dotenv TLS setting */

  add(
    "L15",

    ![
      ".env.production",
      ".env.production.local",
    ].some(
      (f) =>
        (
          maps.get(f).get(
            "DATABASE_SSL_MODE"
          ) ?? []
        ).includes("disable")
    ),

    "No explicit production dotenv setting disables database TLS",

    "TLS still requires driver-level verification."
  );

  /* L16 - Standard NODE_ENV value */

  add(
    "L16",

    shell.NODE_ENV === undefined ||
    [
      "development",
      "production",
      "test",
    ].includes(shell.NODE_ENV),

    "NODE_ENV uses a standard value or is absent",

    "Use NODE_ENV=production for staging builds."
  );

  return {
    manifestIssues:
      validateManifest(
        STAGING_MANIFEST
      ),

    checks: result,

    gates: GATES.map(
      ([id, label]) => ({
        id,
        label,
        status: "NOT_VERIFIED",
      })
    ),

    stagingAuthorized: false,

    productionAuthorized: false,
  };
}

/* =======================================================
   8. FORMAT PRIVACY-SAFE OUTPUT

   No actual database URLs, passwords,
   API keys or email-provider secrets
   are printed.
   ======================================================= */

function formatReport(report) {
  const out = [
    "FILE 68 - STAGING MANIFEST & DEPLOYMENT CONFIGURATION (OFFLINE)",
  ];

  out.push(
    `MANIFEST_POLICY: ${
      report.manifestIssues.length === 0
        ? "PASS"
        : "FAIL"
    }`
  );

  for (
    const code of
    report.manifestIssues
  ) {
    out.push(
      `MANIFEST_ISSUE: ${code}`
    );
  }

  for (
    const item of
    report.checks
  ) {
    out.push(
      `${item.id} [${item.status}] ${item.label}`
    );

    if (item.note) {
      out.push(
        `  REVIEW: ${item.note}`
      );
    }
  }

  const tally =
    (state) =>
      report.checks.filter(
        (x) =>
          x.status === state
      ).length;

  out.push(
    `LOCAL_SUMMARY: ${tally("PASS")} PASS, ${tally("FAIL")} FAIL, ${tally("NOT_VERIFIED")} NOT_VERIFIED`
  );

  out.push(
    "EXTERNAL STAGING EVIDENCE:"
  );

  for (
    const g of report.gates
  ) {
    out.push(
      `${g.id} [NOT_VERIFIED] ${g.label}`
    );
  }

  out.push(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

  out.push(
    "PRODUCTION_ACTIVATION: NOT_AUTHORIZED"
  );

  out.push(
    "DATABASE_CONNECTIONS: 0"
  );

  out.push(
    "NETWORK_CALLS: 0"
  );

  out.push(
    "EMAILS_SENT: 0"
  );

  return out.join("\n");
}

/* =======================================================
   9. FICTIONAL IN-MEMORY PROJECT

   Used only by --self-test.

   Does not write files to disk.
   ======================================================= */

function fixture() {
  const files = new Map();

  files.set(
    ".env.local",

    FLAGS.map(
      (f) =>
        `${f}="false"`
    ).join("\n")
  );

  files.set(
    "package.json",

    JSON.stringify({
      scripts: {
        build: "next build",
        start: "next start",
      },

      dependencies: {
        next: "16.4.2",
      },
    })
  );

  files.set(
    "next.config.ts",

    "export default { reactStrictMode: true };"
  );

  files.set(
    "src/app/api/quotations/route.ts",

    "export async function POST() {}"
  );

  for (
    const f of SERVER_MODULES
  ) {
    files.set(
      f,
      'import "server-only";'
    );
  }

  for (
    const f of PREVIOUS
  ) {
    files.set(
      f,
      "fictional test evidence"
    );
  }

  return files;
}

/* =======================================================
   10. IN-MEMORY TEST ADAPTER
   ======================================================= */

function simulate(
  files,
  shell = {}
) {
  return inspectProject({
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

/* =======================================================
   11. THIRTY-ONE AUTOMATED SELF-TESTS

   Every test is fictional.

   No database connections or external
   services are used.
   ======================================================= */

function selfTest() {
  let passed = 0;

  const test =
    (name, fn) => {
      fn();

      console.log(
        `PASS ${++passed}: ${name}`
      );
    };

  const status =
    (r, id) =>
      r.checks.find(
        (c) =>
          c.id === id
      )?.status;

  const modified =
    (change) => {
      const f = fixture();

      change(f);

      return simulate(f);
    };

  const mutate =
    (change) => {
      const m =
        structuredClone(
          STAGING_MANIFEST
        );

      change(m);

      return validateManifest(m);
    };

  /* TEST 1 */

  test(
    "Safe embedded staging policy validates",

    () =>
      assert.deepEqual(
        validateManifest(
          STAGING_MANIFEST
        ),

        []
      )
  );

  /* TEST 2 */

  test(
    "Manifest has no real hostnames, connection strings or credentials",

    () => {
      const s =
        JSON.stringify(
          STAGING_MANIFEST
        );

      assert.ok(
        !/postgres(?:ql)?:\/\//i
          .test(s)
      );

      assert.ok(
        !/https?:\/\//i
          .test(s)
      );

      assert.ok(
        !/BEGIN (?:RSA|OPENSSH) PRIVATE KEY/
          .test(s)
      );
    }
  );

  /* TEST 3 */

  test(
    "Fictional project passes all 16 local checks",

    () =>
      assert.equal(
        simulate(
          fixture()
        ).checks.filter(
          (c) =>
            c.status === "PASS"
        ).length,

        16
      )
  );

  /* TEST 4 */

  test(
    "Missing local switch rejected",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                ".env.local",

                FLAGS.slice(1)
                  .map(
                    (k) =>
                      `${k}=false`
                  ).join("\n")
              )
          ),

          "L01"
        ),

        "FAIL"
      )
  );

  /* TEST 5 */

  test(
    "Enabled local switch rejected",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                ".env.local",

                f.get(
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

  /* TEST 6 */

  test(
    "Duplicate local switch rejected",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                ".env.local",

                f.get(
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

  /* TEST 7 */

  test(
    "Production dotenv override rejected",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                ".env.production.local",

                `${FLAGS[0]}=true`
              )
          ),

          "L02"
        ),

        "FAIL"
      )
  );

  /* TEST 8 */

  test(
    "Shell override rejected",

    () =>
      assert.equal(
        status(
          simulate(
            fixture(),

            {
              [FLAGS[1]]: "true",
            }
          ),

          "L03"
        ),

        "FAIL"
      )
  );

  /* TEST 9 */

  test(
    "Development effective override rejected",

    () =>
      assert.equal(
        status(
          simulate(
            fixture(),

            {
              [FLAGS[1]]: "true",
            }
          ),

          "L04"
        ),

        "FAIL"
      )
  );

  /* TEST 10 */

  test(
    "Production effective override rejected",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                ".env.production.local",

                `${FLAGS[2]}=true`
              )
          ),

          "L05"
        ),

        "FAIL"
      )
  );

  /* TEST 11 */

  test(
    "Missing start script is reported",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                "package.json",

                JSON.stringify({
                  scripts: {
                    build: "next build",
                  },

                  dependencies: {
                    next: "16",
                  },
                })
              )
          ),

          "L06"
        ),

        "FAIL"
      )
  );

  /* TEST 12 */

  test(
    "Missing Next dependency is reported",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                "package.json",

                JSON.stringify({
                  scripts: {
                    build: "next build",
                    start: "next start",
                  },
                })
              )
          ),

          "L07"
        ),

        "FAIL"
      )
  );

  /* TEST 13 */

  test(
    "Missing quotation API route is reported",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.delete(
                "src/app/api/quotations/route.ts"
              )
          ),

          "L08"
        ),

        "FAIL"
      )
  );

  /* TEST 14 */

  test(
    "Static export rejected",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                "next.config.ts",

                "export default {output:'export'}"
              )
          ),

          "L09"
        ),

        "FAIL"
      )
  );

  /* TEST 15 */

  test(
    "Next config env object requires review",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                "next.config.ts",

                "export default {env:{KEY:'fictional'}}"
              )
          ),

          "L10"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 16 */

  test(
    "Missing server-only import rejected",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                SERVER_MODULES[0],

                "export {};"
              )
          ),

          "L11"
        ),

        "FAIL"
      )
  );

  /* TEST 17 */

  test(
    "Suspicious public secret name rejected",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                ".env",

                "NEXT_PUBLIC_DATABASE_PASSWORD=fictional"
              )
          ),

          "L12"
        ),

        "FAIL"
      )
  );

  /* TEST 18 */

  test(
    "Missing prior review is reported",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.delete(
                PREVIOUS[0]
              )
          ),

          "L13"
        ),

        "FAIL"
      )
  );

  /* TEST 19 */

  test(
    "Unexpected .env.staging is not certified",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                ".env.staging",

                "DEMO=1"
              )
          ),

          "L14"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 20 */

  test(
    "TLS-disabled production dotenv rejected",

    () =>
      assert.equal(
        status(
          modified(
            (f) =>
              f.set(
                ".env.production",

                "DATABASE_SSL_MODE=disable"
              )
          ),

          "L15"
        ),

        "FAIL"
      )
  );

  /* TEST 21 */

  test(
    "NODE_ENV=staging rejected",

    () =>
      assert.equal(
        status(
          simulate(
            fixture(),

            {
              NODE_ENV: "staging",
            }
          ),

          "L16"
        ),

        "FAIL"
      )
  );

  /* TEST 22 */

  test(
    "Manifest rejects enabled quotation submissions",

    () =>
      assert.ok(
        mutate(
          (m) =>
            m.features[
              FLAGS[0]
            ] = "true"
        ).includes(
          `FLAG_${FLAGS[0]}`
        )
      )
  );

  /* TEST 23 */

  test(
    "Manifest rejects worker deployment",

    () =>
      assert.ok(
        mutate(
          (m) =>
            m.email.worker =
              "running"
        ).includes(
          "WORKER"
        )
      )
  );

  /* TEST 24 */

  test(
    "Manifest rejects provider egress",

    () =>
      assert.ok(
        mutate(
          (m) =>
            m.email.providerEgress =
              "allowed"
        ).includes(
          "PROVIDER_EGRESS"
        )
      )
  );

  /* TEST 25 */

  test(
    "Manifest rejects shared production database",

    () =>
      assert.ok(
        mutate(
          (m) =>
            m.database.separateFromProduction =
              false
        ).includes(
          "DATABASE_separateFromProduction"
        )
      )
  );

  /* TEST 26 */

  test(
    "Manifest rejects unverified TLS omitted",

    () =>
      assert.ok(
        mutate(
          (m) =>
            m.database.verifiedTlsRequired =
              false
        ).includes(
          "DATABASE_verifiedTlsRequired"
        )
      )
  );

  /* TEST 27 */

  test(
    "Manifest rejects real customer data",

    () =>
      assert.ok(
        mutate(
          (m) =>
            m.database.realCustomerDataForbidden =
              false
        ).includes(
          "DATABASE_realCustomerDataForbidden"
        )
      )
  );

  /* TEST 28 */

  test(
    "Manifest rejects untested recovery rollback",

    () =>
      assert.ok(
        mutate(
          (m) =>
            m.recovery.releaseRollbackRequired =
              false
        ).includes(
          "RECOVERY_releaseRollbackRequired"
        )
      )
  );

  /* TEST 29 */

  test(
    "Manifest rejects forged approval status",

    () =>
      assert.ok(
        mutate(
          (m) =>
            m.authorization =
              "approved"
        ).includes(
          "AUTHORIZATION"
        )
      )
  );

  /* TEST 30 */

  test(
    "Manifest rejects falsely verified external evidence",

    () =>
      assert.ok(
        mutate(
          (m) =>
            m.evidence.stagingProvisioned =
              "VERIFIED"
        ).includes(
          "EXTERNAL_EVIDENCE_MUST_REMAIN_UNVERIFIED"
        )
      )
  );

  /* TEST 31 */

  test(
    "No production or staging authorization and no secret disclosure",

    () => {
      const f = fixture();

      f.set(
        ".env",

        "EMAIL_PROVIDER_PASSWORD=PRIVATE_FICTIONAL_TEST_SECRET"
      );

      const r =
        simulate(f);

      const output =
        formatReport(r);

      assert.equal(
        r.stagingAuthorized,
        false
      );

      assert.equal(
        r.productionAuthorized,
        false
      );

      assert.ok(
        r.gates.every(
          (g) =>
            g.status ===
              "NOT_VERIFIED"
        )
      );

      assert.ok(
        !output.includes(
          "PRIVATE_FICTIONAL_TEST_SECRET"
        )
      );

      assert.match(
        output,

        /STAGING_ACTIVATION: NOT_AUTHORIZED/
      );
    }
  );

  console.log(
    `FILE 68 SELF-TEST: ${passed}/31 PASSED`
  );

  console.log(
    "DATABASE_CONNECTIONS: 0; NETWORK_CALLS: 0; EMAILS_SENT: 0"
  );
}

/* =======================================================
   12. AUDIT ACTUAL LOCAL PROJECT

   Reads selected project files only.

   No writes, deployments, migrations
   or connections.
   ======================================================= */

function auditProject() {
  const root =
    process.cwd();

  const read =
    (rel) => {
      try {
        return fs.readFileSync(
          path.join(
            root,
            rel
          ),

          "utf8"
        );
      } catch (e) {
        if (
          e?.code === "ENOENT"
        ) {
          return null;
        }

        throw e;
      }
    };

  const exists =
    (rel) =>
      fs.existsSync(
        path.join(
          root,
          rel
        )
      );

  const report =
    inspectProject({
      read,
      exists,

      shell:
        process.env,
    });

  console.log(
    formatReport(report)
  );

  if (
    report.manifestIssues.length ||

    report.checks.some(
      (c) =>
        c.status ===
          "FAIL"
    )
  ) {
    process.exitCode = 1;
  }
}

/* =======================================================
   13. COMMAND LINE ENTRYPOINT

   --self-test:
     Fictional tests only

   --manifest:
     Print safe policy draft

   --audit:
     Inspect local project

   None deploy or activate services.
   ======================================================= */

const arg =
  process.argv[2];

if (
  process.argv.length !== 3 ||

  ![
    "--self-test",
    "--audit",
    "--manifest",
  ].includes(arg)
) {
  console.error(
    "Usage: node scripts/quotation-staging-deployment-manifest.mjs --self-test|--audit|--manifest"
  );

  process.exitCode = 2;

} else if (
  arg === "--self-test"
) {
  selfTest();

} else if (
  arg === "--manifest"
) {
  console.log(
    JSON.stringify(
      STAGING_MANIFEST,
      null,
      2
    )
  );

  console.log(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

} else {
  auditProject();
}

/*
===========================================================
END FILE 68

No staging deployment.
No production deployment.
No real customer submissions.
No PostgreSQL changes.
No email delivery.

ALL ACTIVATION REMAINS UNAUTHORIZED.
===========================================================
*/
