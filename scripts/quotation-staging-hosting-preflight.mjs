
/**
 * BARK ORNAMENT (PVT) LTD
 *
 * FILE 67 - STAGING HOSTING PREFLIGHT
 *
 * File:
 * scripts/quotation-staging-hosting-preflight.mjs
 *
 * Commands:
 *   node scripts/quotation-staging-hosting-preflight.mjs --self-test
 *   node scripts/quotation-staging-hosting-preflight.mjs --audit
 *
 * SAFETY:
 * - No network connections
 * - No database connections
 * - No provider connections
 * - No file writes
 * - No child processes
 * - No migrations
 * - No email sending
 *
 * Existing website files remain unchanged.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/* =======================================================
   1. QUOTATION AND EMAIL SAFETY SWITCHES
   ======================================================= */

const SWITCHES = Object.freeze([
  "QUOTATION_SUBMISSIONS_ENABLED",
  "QUOTATION_E2E_TEST_MODE",
  "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
]);

/* =======================================================
   2. NEXT.JS ENVIRONMENT FILES
   ======================================================= */

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

/* =======================================================
   3. PREVIOUS READINESS TEST FILES
   ======================================================= */

const PRIOR = Object.freeze([
  "scripts/quotation-email-operational-readiness-review.sql",
  "scripts/quotation-deployment-readiness-review.mjs",
  "scripts/quotation-hosting-environment-audit.mjs",
  "scripts/quotation-staging-isolation-review.mjs",
]);

/* =======================================================
   4. EXTERNAL HOSTING REQUIREMENTS

   None of these requirements can be verified
   by scanning the local source code.

   They are always marked NOT_VERIFIED.
   ======================================================= */

const GATES = Object.freeze([
  [
    "G01",
    "Selected staging hostname and restricted HTTPS access",
  ],
  [
    "G02",
    "Hosting platform supports persistent Next.js server runtime",
  ],
  [
    "G03",
    "Ingress or reverse proxy request and connection controls",
  ],
  [
    "G04",
    "Dedicated staging PostgreSQL network, database and roles",
  ],
  [
    "G05",
    "Database TLS certificate and hostname validation",
  ],
  [
    "G06",
    "Server-side secret injection and credentials rotation",
  ],
  [
    "G07",
    "Real staging flags all false with worker stopped",
  ],
  [
    "G08",
    "Outbound provider traffic blocked and recipients isolated",
  ],
  [
    "G09",
    "Independent backups and successful restore test",
  ],
  [
    "G10",
    "Monitoring, data retention and release rollback drill",
  ],
  [
    "G11",
    "Security headers, bot controls and accessibility smoke tests",
  ],
  [
    "G12",
    "Formal staging change approval and production separation",
  ],
]);

/* =======================================================
   5. READ ENVIRONMENT ASSIGNMENTS

   This parser checks simple dotenv values.

   It does not fully interpret:
   - Interpolation
   - Multiline secrets
   - Complex dynamic environment loaders

   No credential values are printed.
   ======================================================= */

function parseEnv(raw) {
  const values = new Map();

  if (
    typeof raw !== "string"
  ) {
    return values;
  }

  for (
    const line of raw
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
  ) {
    const match =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*?)\s*$/
        .exec(line);

    if (!match) {
      continue;
    }

    const trimmed =
      match[2].trim();

    const quote =
      /^(?:"([^"]*)"|'([^']*)')(?:\s*#.*)?$/
        .exec(trimmed);

    const value =
      quote
        ? quote[1] ?? quote[2]
        : trimmed
            .replace(/\s+#.*$/, "")
            .trim();

    if (
      !values.has(match[1])
    ) {
      values.set(
        match[1],
        []
      );
    }

    values.get(
      match[1]
    ).push(value);
  }

  return values;
}

/* =======================================================
   6. SIMULATE NEXT.JS ENVIRONMENT PRECEDENCE

   For the three protected switches only:

   1. Process environment
   2. .env.<mode>.local
   3. .env.local (except test)
   4. .env.<mode>
   5. .env

   Does not start Next.js.
   ======================================================= */

function effective(
  name,
  mode,
  envMaps,
  shell
) {
  if (
    Object.hasOwn(
      shell,
      name
    ) &&
    shell[name] !== undefined
  ) {
    return shell[name];
  }

  const files = [
    `.env.${mode}.local`,

    ...(
      mode === "test"
        ? []
        : [".env.local"]
    ),

    `.env.${mode}`,
    ".env",
  ];

  for (
    const file of files
  ) {
    const values =
      envMaps.get(file)
        ?.get(name) ?? [];

    if (
      values.length
    ) {
      return values.at(-1);
    }
  }

  return undefined;
}

/* =======================================================
   7. LOCAL POSTGRESQL URL CHECK

   Acceptable hosts:
   - localhost
   - 127.0.0.1
   - ::1

   No connection is attempted.
   ======================================================= */

function loopbackUrl(raw) {
  if (!raw) {
    return "NOT_VERIFIED";
  }

  try {
    const u =
      new URL(raw);

    return (
      [
        "postgres:",
        "postgresql:",
      ].includes(u.protocol) &&

      [
        "localhost",
        "127.0.0.1",
        "[::1]",
      ].includes(u.hostname)
    )
      ? "PASS"
      : "FAIL";

  } catch {
    return "FAIL";
  }
}

/* =======================================================
   8. FICTIONAL STAGING ARCHITECTURE ASSESSMENT

   This function evaluates a proposed design.

   It does not deploy, create or verify
   infrastructure.

   The fictional self-tests check that unsafe
   design choices are rejected.
   ======================================================= */

function stagedArchitectureIssues(d) {
  if (
    !d ||
    typeof d !== "object"
  ) {
    return [
      "No architecture provided",
    ];
  }

  const problems = [];

  const need =
    (condition, message) => {
      if (!condition) {
        problems.push(message);
      }
    };

  need(
    d.runtime === "node-server" ||
    d.runtime === "docker-node",

    "Server-capable Next.js runtime required"
  );

  need(
    d.nodeEnv === "production",

    "NODE_ENV must be production"
  );

  need(
    d.stagingHost &&
    d.stagingHost !==
      d.productionHost,

    "Hosting hostname not isolated"
  );

  need(
    d.stagingDatabase &&
    d.stagingDatabase !==
      d.productionDatabase,

    "Database not isolated"
  );

  need(
    d.stagingRole &&
    d.stagingRole !==
      d.productionRole,

    "Database role not isolated"
  );

  need(
    d.databaseNetwork ===
      "private",

    "Database network not private"
  );

  need(
    d.dbTlsVerified === true,

    "Remote database TLS not verified"
  );

  need(
    d.httpsVerified === true,

    "Staging HTTPS not verified"
  );

  need(
    d.worker === "disabled",

    "Email worker must remain disabled"
  );

  need(
    d.providerEgress ===
      "blocked",

    "Provider egress must be blocked"
  );

  need(
    d.productionDataCopied ===
      false,

    "Production customer data must not be copied"
  );

  need(
    d.backupRestored === true,

    "Backup restore not verified"
  );

  need(
    d.rollbackTested === true,

    "Deployment rollback not verified"
  );

  for (
    const flag of SWITCHES
  ) {
    need(
      d.switches?.[flag] ===
        "false",

      `Unsafe ${flag}`
    );
  }

  return problems;
}

/* =======================================================
   9. LOCAL PROJECT PREFLIGHT

   Performs 16 local checks.

   A successful local result does not
   authorize staging or production.
   ======================================================= */

function inspect({
  read,
  exists,
  shell = {},
}) {
  const checks = [];

  const add =
    (
      id,
      status,
      detail,
      next = ""
    ) => {
      checks.push({
        id,
        status,
        detail,

        next:
          status === "PASS"
            ? ""
            : next,
      });
    };

  const maps =
    new Map(
      ENV_FILES.map(
        (f) => [
          f,
          parseEnv(
            read(f)
          ),
        ]
      )
    );

  const local =
    maps.get(
      ".env.local"
    );

  /* -----------------------------------------------------
     L01 - Three local switches false
     ----------------------------------------------------- */

  const validLocal =
    SWITCHES.every(
      (f) =>
        local.get(f)?.length === 1 &&
        local.get(f)[0] === "false"
    );

  add(
    "L01",

    validLocal
      ? "PASS"
      : "FAIL",

    "Three local switches exactly false",

    "Review switch names in .env.local; do not reveal values."
  );

  /* -----------------------------------------------------
     L02 - No other dotenv enablement
     ----------------------------------------------------- */

  const overrides =
    ENV_FILES.filter(
      (f) =>
        f !== ".env.local"
    ).flatMap(
      (f) =>
        SWITCHES.filter(
          (k) => {
            const v =
              maps.get(f).get(k)
              ?? [];

            return (
              v.length > 1 ||
              v.some(
                (x) =>
                  x !== "false"
              )
            );
          }
        ).map(
          (k) =>
            `${f}:${k}`
        )
    );

  add(
    "L02",

    overrides.length
      ? "FAIL"
      : "PASS",

    "Other dotenv files do not enable switches",

    overrides.join(", ")
  );

  /* -----------------------------------------------------
     L03 - No process overrides
     ----------------------------------------------------- */

  const badShell =
    SWITCHES.filter(
      (k) =>
        shell[k] !== undefined &&
        shell[k] !== "false"
    );

  add(
    "L03",

    badShell.length
      ? "FAIL"
      : "PASS",

    "Current process does not override switches",

    badShell.join(", ")
  );

  /* -----------------------------------------------------
     L04 - Effective local production flags
     ----------------------------------------------------- */

  const badProd =
    SWITCHES.filter(
      (k) =>
        effective(
          k,
          "production",
          maps,
          shell
        ) !== "false"
    );

  add(
    "L04",

    badProd.length
      ? "FAIL"
      : "PASS",

    "Local production-mode flag resolution remains false",

    badProd.join(", ")
  );

  /* -----------------------------------------------------
     L05 - NODE_ENV values

     Staging runtime later uses production.
     Current audit process may be unset.
     ----------------------------------------------------- */

  const nodeMode =
    shell.NODE_ENV;

  add(
    "L05",

    !nodeMode ||
    [
      "production",
      "development",
      "test",
    ].includes(nodeMode)
      ? "PASS"
      : "FAIL",

    "NODE_ENV has standard value or is unset",

    "Next.js staging must use production, not staging."
  );

  /* -----------------------------------------------------
     L06 - Application build/start scripts
     ----------------------------------------------------- */

  let pkg = null;

  try {
    pkg =
      JSON.parse(
        read(
          "package.json"
        ) ?? ""
      );
  } catch {
    pkg = null;
  }

  const validScripts =
    typeof pkg?.scripts?.build ===
      "string" &&

    typeof pkg?.scripts?.start ===
      "string";

  add(
    "L06",

    validScripts
      ? "PASS"
      : "NOT_VERIFIED",

    "Next.js build/start scripts available",

    "Check deployment process for selected host."
  );

  /* -----------------------------------------------------
     L07 - Next.js project dependency
     ----------------------------------------------------- */

  const nextPresent =
    typeof pkg?.dependencies?.next ===
      "string" ||

    typeof pkg?.devDependencies?.next ===
      "string";

  add(
    "L07",

    nextPresent
      ? "PASS"
      : "NOT_VERIFIED",

    "Next.js listed as project dependency",

    "Review package.json dependency metadata."
  );

  /* -----------------------------------------------------
     L08 - Server-side quotation API
     ----------------------------------------------------- */

  const route =
    [
      "src/app/api/quotations/route.ts",
      "app/api/quotations/route.ts",
    ].some(exists);

  add(
    "L08",

    route
      ? "PASS"
      : "NOT_VERIFIED",

    "Server-side quotation route found",

    "Locate quotation route before staging."
  );

  /* -----------------------------------------------------
     L09 - No static-only export
     ----------------------------------------------------- */

  const configs = [
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
  ];

  const configText =
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
      .test(configText)
      ? "FAIL"
      : "PASS",

    "No obvious static export config",

    "Static export cannot run the full quotation API."
  );

  /* -----------------------------------------------------
     L10 - Next config env exposure
     ----------------------------------------------------- */

  add(
    "L10",

    /(?:^|[,{]\s*)env\s*:/m
      .test(configText)
      ? "NOT_VERIFIED"
      : "PASS",

    "No obvious Next.js env config bundling risk",

    "Manually inspect next.config env object."
  );

  /* -----------------------------------------------------
     L11 - Local-only worker guard evidence
     ----------------------------------------------------- */

  const dbSource =
    read(
      "src/lib/quotation-email-worker-handoff-db.ts"
    );

  const guarded =
    typeof dbSource ===
      "string" &&

    /\bserver-only\b/
      .test(dbSource) &&

    /NODE_ENV/
      .test(dbSource) &&

    /development/
      .test(dbSource) &&

    /DATABASE_SSL_MODE/
      .test(dbSource);

  add(
    "L11",

    guarded
      ? "PASS"
      : "NOT_VERIFIED",

    "Existing worker has local-only guard evidence",

    "Do not deploy or run the worker in staging; inspect File 55."
  );

  /* -----------------------------------------------------
     L12 - No obvious NEXT_PUBLIC secrets
     ----------------------------------------------------- */

  const riskyPublic = [];

  const secretName =
    /(?:DATABASE|PASSWORD|SECRET|PRIVATE|API[_-]?KEY|AUTH[_-]?TOKEN|SMTP|WORKER)/i;

  for (
    const [
      file,
      parsed,
    ] of maps
  ) {
    for (
      const name of
      parsed.keys()
    ) {
      if (
        name.startsWith(
          "NEXT_PUBLIC_"
        ) &&

        secretName.test(
          name
        )
      ) {
        riskyPublic.push(
          `${file}:${name}`
        );
      }
    }
  }

  add(
    "L12",

    riskyPublic.length
      ? "FAIL"
      : "PASS",

    "No suspicious public-prefixed secret variable names",

    riskyPublic.join(", ")
  );

  /* -----------------------------------------------------
     L13 - Local database URL hosts
     ----------------------------------------------------- */

  const dbUrl =
    local.get(
      "DATABASE_URL"
    )?.[0];

  const workerUrl =
    local.get(
      "EMAIL_WORKER_DATABASE_URL"
    )?.[0];

  const urlChecks = [
    loopbackUrl(dbUrl),
    loopbackUrl(workerUrl),
  ];

  add(
    "L13",

    urlChecks.includes(
      "FAIL"
    )
      ? "FAIL"
      : urlChecks.includes(
          "NOT_VERIFIED"
        )
        ? "NOT_VERIFIED"
        : "PASS",

    "Local DB URLs point only to loopback addresses",

    "Inspect local DB URLs privately, without sharing credentials."
  );

  /* -----------------------------------------------------
     L14 - Separate database identities
     ----------------------------------------------------- */

  let identities =
    "NOT_VERIFIED";

  if (
    urlChecks.every(
      (x) =>
        x === "PASS"
    )
  ) {
    const web =
      new URL(dbUrl);

    const worker =
      new URL(workerUrl);

    identities =
      worker.username ===
        "bark_email_worker_service" &&

      worker.username !==
        web.username

        ? "PASS"
        : "FAIL";
  }

  add(
    "L14",

    identities,

    "Separate website and worker local DB identities",

    "Check local DB usernames without exposing credentials."
  );

  /* -----------------------------------------------------
     L15 - Production dotenv TLS settings
     ----------------------------------------------------- */

  const tlsOff =
    [
      ".env.production",
      ".env.production.local",
    ].some(
      (f) =>
        (
          maps.get(f)
            .get(
              "DATABASE_SSL_MODE"
            ) ?? []
        ).includes(
          "disable"
        )
    );

  add(
    "L15",

    tlsOff
      ? "FAIL"
      : "PASS",

    "No explicit TLS-disable in production dotenv files",

    "Production/staging TLS still requires independent proof."
  );

  /* -----------------------------------------------------
     L16 - Prior readiness evidence
     ----------------------------------------------------- */

  const absentPrior =
    PRIOR.filter(
      (f) =>
        !exists(f)
    );

  add(
    "L16",

    absentPrior.length
      ? "NOT_VERIFIED"
      : "PASS",

    "Prior Files 63–66 review scripts retained",

    absentPrior.join(", ")
  );

  /* -----------------------------------------------------
     External checks remain unverified.
     ----------------------------------------------------- */

  return {
    checks,

    gates:
      GATES.map(
        ([id, detail]) => ({
          id,
          detail,

          status:
            "NOT_VERIFIED",
        })
      ),

    stagingAuthorized:
      false,

    productionAuthorized:
      false,
  };
}

/* =======================================================
   10. SAFE AUDIT OUTPUT

   Never prints actual database URLs,
   passwords, tokens or provider secrets.
   ======================================================= */

function format(report) {
  const lines = [
    "FILE 67 - STAGING HOSTING PREFLIGHT (OFFLINE)",
  ];

  for (
    const c of
    report.checks
  ) {
    lines.push(
      `${c.id} [${c.status}] ${c.detail}`
    );

    if (c.next) {
      lines.push(
        `  ACTION: ${c.next}`
      );
    }
  }

  const n =
    (s) =>
      report.checks.filter(
        (x) =>
          x.status === s
      ).length;

  lines.push(
    `LOCAL_SUMMARY: ${n("PASS")} PASS, ${n("FAIL")} FAIL, ${n("NOT_VERIFIED")} NOT_VERIFIED`
  );

  lines.push(
    "EXTERNAL HOSTING EVIDENCE (NOT TESTED):"
  );

  for (
    const gate of
    report.gates
  ) {
    lines.push(
      `${gate.id} [NOT_VERIFIED] ${gate.detail}`
    );
  }

  lines.push(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

  lines.push(
    "PRODUCTION_ACTIVATION: NOT_AUTHORIZED"
  );

  lines.push(
    "DATABASE_CONNECTIONS: 0"
  );

  lines.push(
    "NETWORK_CALLS: 0"
  );

  lines.push(
    "EMAILS_SENT: 0"
  );

  return lines.join("\n");
}

/* =======================================================
   11. FICTIONAL IN-MEMORY PROJECT

   Used by automated self-tests only.

   Nothing is written to disk.
   ======================================================= */

function fakeFiles() {
  const f =
    new Map();

  f.set(
    ".env.local",

    SWITCHES.map(
      (k) =>
        `${k}="false"`
    ).join("\n") +

    '\nDATABASE_URL="postgresql://web:fictional@127.0.0.1:5432/staging_fake"' +

    '\nEMAIL_WORKER_DATABASE_URL="postgresql://bark_email_worker_service:fictional@127.0.0.1:5432/staging_fake"'
  );

  f.set(
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
    })
  );

  f.set(
    "next.config.ts",

    "export default { reactStrictMode:true };"
  );

  f.set(
    "src/app/api/quotations/route.ts",

    "export async function POST() {}"
  );

  f.set(
    "src/lib/quotation-email-worker-handoff-db.ts",

    'import "server-only"; if (process.env.NODE_ENV !== "development" || process.env.DATABASE_SSL_MODE !== "disable") throw Error("blocked");'
  );

  for (
    const item of PRIOR
  ) {
    f.set(
      item,
      "fictional evidence"
    );
  }

  return f;
}

/* =======================================================
   12. FICTIONAL STAGING ARCHITECTURE

   No real hostname, database or credentials.
   ======================================================= */

function fakeArchitecture() {
  return {
    runtime:
      "node-server",

    nodeEnv:
      "production",

    stagingHost:
      "staging.example.invalid",

    productionHost:
      "www.example.invalid",

    stagingDatabase:
      "stage_db",

    productionDatabase:
      "prod_db",

    stagingRole:
      "stage_web",

    productionRole:
      "prod_web",

    databaseNetwork:
      "private",

    dbTlsVerified:
      true,

    httpsVerified:
      true,

    worker:
      "disabled",

    providerEgress:
      "blocked",

    productionDataCopied:
      false,

    backupRestored:
      true,

    rollbackTested:
      true,

    switches:
      Object.fromEntries(
        SWITCHES.map(
          (k) => [
            k,
            "false",
          ]
        )
      ),
  };
}

/* =======================================================
   13. IN-MEMORY AUDIT ADAPTER
   ======================================================= */

function simulation(
  files,
  shell = {}
) {
  return inspect({
    read:
      (p) =>
        files.get(p) ??
        null,

    exists:
      (p) =>
        files.has(p),

    shell,
  });
}

/* =======================================================
   14. AUTOMATED SELF-TESTS

   All scenarios are fictional.

   25 tests total.
   ======================================================= */

function selfTest() {
  let count = 0;

  const test =
    (name, fn) => {
      fn();

      console.log(
        `PASS ${++count}: ${name}`
      );
    };

  const status =
    (r, id) =>
      r.checks.find(
        (x) =>
          x.id === id
      )?.status;

  const changed =
    (edit) => {
      const f =
        fakeFiles();

      edit(f);

      return simulation(f);
    };

  /* TEST 1 */

  test(
    "Fictional local baseline passes all 16 checks",

    () =>
      assert.equal(
        simulation(
          fakeFiles()
        ).checks.filter(
          (c) =>
            c.status ===
              "PASS"
        ).length,

        16
      )
  );

  /* TEST 2 */

  test(
    "Missing local safety flag fails",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
                ".env.local",

                f.get(
                  ".env.local"
                ).replace(
                  `${SWITCHES[0]}="false"`,
                  ""
                )
              )
          ),

          "L01"
        ),

        "FAIL"
      )
  );

  /* TEST 3 */

  test(
    "Enabled local safety flag fails",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
                ".env.local",

                f.get(
                  ".env.local"
                ).replace(
                  `${SWITCHES[0]}="false"`,
                  `${SWITCHES[0]}=true`
                )
              )
          ),

          "L01"
        ),

        "FAIL"
      )
  );

  /* TEST 4 */

  test(
    "Duplicate local safety flag fails",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
                ".env.local",

                f.get(
                  ".env.local"
                ) +

                `\n${SWITCHES[0]}=false`
              )
          ),

          "L01"
        ),

        "FAIL"
      )
  );

  /* TEST 5 */

  test(
    "Other dotenv enablement fails",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
                ".env.production.local",

                `${SWITCHES[1]}=true`
              )
          ),

          "L02"
        ),

        "FAIL"
      )
  );

  /* TEST 6 */

  test(
    "Process override fails",

    () =>
      assert.equal(
        status(
          simulation(
            fakeFiles(),

            {
              [SWITCHES[2]]:
                "true",
            }
          ),

          "L03"
        ),

        "FAIL"
      )
  );

  /* TEST 7 */

  test(
    "Effective production flag override fails",

    () =>
      assert.equal(
        status(
          simulation(
            fakeFiles(),

            {
              [SWITCHES[2]]:
                "true",
            }
          ),

          "L04"
        ),

        "FAIL"
      )
  );

  /* TEST 8 */

  test(
    "Invalid NODE_ENV fails",

    () =>
      assert.equal(
        status(
          simulation(
            fakeFiles(),

            {
              NODE_ENV:
                "staging",
            }
          ),

          "L05"
        ),

        "FAIL"
      )
  );

  /* TEST 9 */

  test(
    "Missing start script is not certified",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
                "package.json",

                JSON.stringify({
                  scripts: {
                    build:
                      "next build",
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

        "NOT_VERIFIED"
      )
  );

  /* TEST 10 */

  test(
    "Missing Next dependency is not certified",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
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

        "NOT_VERIFIED"
      )
  );

  /* TEST 11 */

  test(
    "Missing quotation route is not certified",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.delete(
                "src/app/api/quotations/route.ts"
              )
          ),

          "L08"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 12 */

  test(
    "Static export is rejected",

    () =>
      assert.equal(
        status(
          changed(
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

  /* TEST 13 */

  test(
    "Next config env object requires review",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
                "next.config.ts",

                "export default {env:{SECRET:'fictional'}}"
              )
          ),

          "L10"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 14 */

  test(
    "Missing worker guard is not certified",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
                "src/lib/quotation-email-worker-handoff-db.ts",

                "export {}"
              )
          ),

          "L11"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 15 */

  test(
    "Public secret name fails",

    () =>
      assert.equal(
        status(
          changed(
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

  /* TEST 16 */

  test(
    "Remote database URL fails loopback check",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
                ".env.local",

                f.get(
                  ".env.local"
                ).replace(
                  "127.0.0.1",
                  "db.example.invalid"
                )
              )
          ),

          "L13"
        ),

        "FAIL"
      )
  );

  /* TEST 17 */

  test(
    "Shared website and worker login fails",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.set(
                ".env.local",

                f.get(
                  ".env.local"
                ).replace(
                  "bark_email_worker_service:fictional",
                  "web:fictional"
                )
              )
          ),

          "L14"
        ),

        "FAIL"
      )
  );

  /* TEST 18 */

  test(
    "Production TLS disable fails",

    () =>
      assert.equal(
        status(
          changed(
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

  /* TEST 19 */

  test(
    "Missing previous audit is not certified",

    () =>
      assert.equal(
        status(
          changed(
            (f) =>
              f.delete(
                PRIOR[0]
              )
          ),

          "L16"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 20 */

  test(
    "Fictional isolated architecture is accepted as model",

    () =>
      assert.deepEqual(
        stagedArchitectureIssues(
          fakeArchitecture()
        ),

        []
      )
  );

  /* TEST 21 */

  test(
    "Architecture rejects shared production database",

    () => {
      const d =
        fakeArchitecture();

      d.stagingDatabase =
        d.productionDatabase;

      assert.ok(
        stagedArchitectureIssues(
          d
        ).some(
          (x) =>
            x.includes(
              "Database"
            )
        )
      );
    }
  );

  /* TEST 22 */

  test(
    "Architecture rejects running worker",

    () => {
      const d =
        fakeArchitecture();

      d.worker =
        "enabled";

      assert.ok(
        stagedArchitectureIssues(
          d
        ).some(
          (x) =>
            x.includes(
              "worker"
            )
        )
      );
    }
  );

  /* TEST 23 */

  test(
    "Architecture rejects outbound provider egress",

    () => {
      const d =
        fakeArchitecture();

      d.providerEgress =
        "allowed";

      assert.ok(
        stagedArchitectureIssues(
          d
        ).some(
          (x) =>
            x.includes(
              "egress"
            )
        )
      );
    }
  );

  /* TEST 24 */

  test(
    "No external gate is auto-certified or authorized",

    () => {
      const r =
        simulation(
          fakeFiles()
        );

      assert.equal(
        r.stagingAuthorized,
        false
      );

      assert.ok(
        r.gates.every(
          (x) =>
            x.status ===
              "NOT_VERIFIED"
        )
      );
    }
  );

  /* TEST 25 */

  test(
    "Audit output hides fictional database passwords",

    () => {
      const text =
        format(
          simulation(
            fakeFiles()
          )
        );

      assert.ok(
        !text.includes(
          "fictional@"
        )
      );

      assert.match(
        text,

        /STAGING_ACTIVATION: NOT_AUTHORIZED/
      );
    }
  );

  console.log(
    `FILE 67 SELF-TEST: ${count}/25 PASSED`
  );

  console.log(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0"
  );
}

/* =======================================================
   15. ACTUAL LOCAL PROJECT AUDIT

   Reads local files only.

   Does not contact PostgreSQL or hosting.
   ======================================================= */

function auditProject() {
  const root =
    process.cwd();

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

      } catch (e) {
        if (
          e.code ===
            "ENOENT"
        ) {
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

  const report =
    inspect({
      read,
      exists,

      shell:
        process.env,
    });

  console.log(
    format(report)
  );

  if (
    report.checks.some(
      (x) =>
        x.status ===
          "FAIL"
    )
  ) {
    process.exitCode = 1;
  }
}

/* =======================================================
   16. COMMAND LINE ENTRYPOINT
   ======================================================= */

if (
  process.argv.length !== 3 ||

  ![
    "--self-test",
    "--audit",
  ].includes(
    process.argv[2]
  )
) {
  console.error(
    "Usage: node scripts/quotation-staging-hosting-preflight.mjs --self-test|--audit"
  );

  process.exitCode = 2;

} else if (
  process.argv[2] ===
    "--self-test"
) {
  selfTest();

} else {
  auditProject();
}

/*
===========================================================
END FILE 67

NO STAGING DEPLOYMENT.
NO DATABASE CHANGES.
NO SUBMISSION ACTIVATION.
NO ACTUAL EMAILS.

STAGING AND PRODUCTION
REMAIN UNAUTHORIZED.
===========================================================
*/
