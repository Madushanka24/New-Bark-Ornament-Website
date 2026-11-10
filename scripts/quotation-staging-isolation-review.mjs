
/**
 * BARK ORNAMENT (PVT) LTD — FILE 66
 *
 * OFFLINE STAGING ISOLATION REVIEW
 *
 * File:
 * scripts/quotation-staging-isolation-review.mjs
 *
 * Commands:
 *   node scripts/quotation-staging-isolation-review.mjs --self-test
 *   node scripts/quotation-staging-isolation-review.mjs --audit
 *
 * Strict safety:
 * - No network connections
 * - No database connections
 * - No email-provider connections
 * - No email sending
 * - No file writes
 * - No child processes
 * - No migrations
 * - No staging deployment
 * - No secret values printed
 *
 * This script is diagnostic only.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/* =======================================================
   1. REQUIRED DISABLED FEATURE SWITCHES
   ======================================================= */

const SWITCHES = Object.freeze([
  "QUOTATION_SUBMISSIONS_ENABLED",
  "QUOTATION_E2E_TEST_MODE",
  "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
]);

/* =======================================================
   2. STANDARD NEXT.JS ENVIRONMENT FILES

   These are inspected locally.

   Next.js does not automatically use
   .env.staging as a separate NODE_ENV mode.
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
   3. EXTERNAL STAGING REQUIREMENTS

   None can be proven by a local source scan.

   Each stays NOT_VERIFIED until the actual
   staging infrastructure is provisioned
   and tested independently.
   ======================================================= */

const EXTERNAL_GATES = Object.freeze([
  [
    "G01",
    "Dedicated staging hostname and HTTPS certificate",
  ],
  [
    "G02",
    "Staging hosting project isolated from production",
  ],
  [
    "G03",
    "Separate staging PostgreSQL database and credentials",
  ],
  [
    "G04",
    "Staging database TLS and network rules validated",
  ],
  [
    "G05",
    "Server-side secret storage and least-privilege access",
  ],
  [
    "G06",
    "Staging submissions and E2E testing explicitly disabled",
  ],
  [
    "G07",
    "Staging worker and outbound email delivery disabled",
  ],
  [
    "G08",
    "Provider egress and recipient isolation verified",
  ],
  [
    "G09",
    "Independent staging storage, logs and retention",
  ],
  [
    "G10",
    "Staging backup and restore exercise",
  ],
  [
    "G11",
    "Release rollback and promotion approval process",
  ],
  [
    "G12",
    "Isolated smoke tests, accessibility and monitoring",
  ],
]);

/* =======================================================
   4. PARSE ENVIRONMENT ASSIGNMENTS

   Read only.

   Secret values are never included in
   generated audit output.

   This lightweight parser is not a complete
   implementation of dotenv interpolation.
   ======================================================= */

function parseEnv(source) {
  const map = new Map();

  if (typeof source !== "string") {
    return map;
  }

  for (
    const line of source
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
  ) {
    const match =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*?)\s*$/
        .exec(line);

    if (!match) {
      continue;
    }

    let value = match[2];

    const quoted =
      /^(?:"([^"]*)"|'([^']*)')(?:\s*#.*)?$/
        .exec(value);

    value = quoted
      ? quoted[1] ?? quoted[2]
      : value
          .replace(/\s+#.*$/, "")
          .trim();

    if (!map.has(match[1])) {
      map.set(match[1], []);
    }

    map.get(match[1]).push(value);
  }

  return map;
}

/* =======================================================
   5. MODEL NEXT.JS ENVIRONMENT PRECEDENCE

   Priority:
   1. Process environment
   2. .env.<mode>.local
   3. .env.local (except test)
   4. .env.<mode>
   5. .env

   This is used only for the three exact
   safety switches.

   It does not run Next.js or load
   credentials into another process.
   ======================================================= */

function resolved(
  name,
  mode,
  maps,
  shell
) {
  if (
    Object.prototype.hasOwnProperty.call(
      shell,
      name
    ) &&
    shell[name] !== undefined
  ) {
    return {
      value: shell[name],
      source: "process environment",
    };
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

  for (const filename of files) {
    const values =
      maps.get(filename)?.get(name) ?? [];

    if (values.length) {
      return {
        value: values.at(-1),
        source: filename,
      };
    }
  }

  return {
    value: undefined,
    source: "undefined",
  };
}

/* =======================================================
   6. EVALUATE A FICTIONAL STAGING DESIGN

   No actual staging credentials are needed.

   This function tests logical isolation:
   - Distinct hosting
   - Distinct database
   - Distinct website and worker roles
   - Disabled worker
   - Disabled email
   - Blocked provider egress
   - Disabled submissions
   - All protected switches false

   Only fictional models are used in
   the automated self-tests.

   A real staging deployment remains
   NOT_VERIFIED.
   ======================================================= */

function assessDesign(design) {
  const issues = [];

  if (
    !design ||
    typeof design !== "object"
  ) {
    return [
      "no staging design supplied",
    ];
  }

  if (
    design.nodeEnv !== "production"
  ) {
    issues.push(
      "Next.js staging runtime must use NODE_ENV=production"
    );
  }

  if (
    design.environmentLabel !== "staging"
  ) {
    issues.push(
      "staging deployment label absent"
    );
  }

  if (
    !design.host ||
    design.host ===
      design.productionHost
  ) {
    issues.push(
      "staging hostname not isolated"
    );
  }

  if (
    !design.databaseId ||
    design.databaseId ===
      design.productionDatabaseId
  ) {
    issues.push(
      "staging database not isolated"
    );
  }

  if (
    !design.workerRole ||
    design.workerRole ===
      design.websiteRole ||
    design.workerRole ===
      design.productionWorkerRole
  ) {
    issues.push(
      "worker role not isolated"
    );
  }

  if (
    !design.websiteRole ||
    design.websiteRole ===
      design.productionWebsiteRole
  ) {
    issues.push(
      "website role not isolated"
    );
  }

  if (
    design.workerMode !== "disabled"
  ) {
    issues.push(
      "staging worker is not disabled"
    );
  }

  if (
    design.emailMode !== "disabled"
  ) {
    issues.push(
      "staging outbound email is not disabled"
    );
  }

  if (
    design.providerEgress !== "blocked"
  ) {
    issues.push(
      "provider egress is not blocked"
    );
  }

  if (
    design.publicSubmissions !==
      "disabled"
  ) {
    issues.push(
      "staging submissions are not disabled"
    );
  }

  if (
    design.storageId &&
    design.storageId ===
      design.productionStorageId
  ) {
    issues.push(
      "storage is shared with production"
    );
  }

  for (const name of SWITCHES) {
    if (
      design.switches?.[name] !==
        "false"
    ) {
      issues.push(
        `${name} not false`
      );
    }
  }

  return issues;
}

/* =======================================================
   7. READ-ONLY LOCAL PROJECT INSPECTION

   Exactly 14 local checks.

   A local PASS is not proof of staging
   hosting or production security.
   ======================================================= */

function inspect({
  read,
  exists,
  shell = {},
}) {
  const results = [];

  function add(
    id,
    status,
    title,
    action = ""
  ) {
    results.push({
      id,
      status,
      title,

      action:
        status === "PASS"
          ? ""
          : action,
    });
  }

  const maps = new Map(
    ENV_FILES.map(
      (filename) => [
        filename,
        parseEnv(
          read(filename)
        ),
      ]
    )
  );

  const local =
    maps.get(".env.local");

  /* -----------------------------------------------------
     L01 - All three local switches false.
     ----------------------------------------------------- */

  const wrongLocal =
    SWITCHES.filter(
      (name) =>
        local.get(name)?.length !== 1 ||
        local.get(name)[0] !== "false"
    );

  add(
    "L01",

    wrongLocal.length
      ? "FAIL"
      : "PASS",

    "All three local safety switches equal false exactly once",

    `Review switch names: ${wrongLocal.join(", ")}`
  );

  /* -----------------------------------------------------
     L02 - Other dotenv files do not enable flags.
     ----------------------------------------------------- */

  const badOverrides = [];

  for (
    const filename of
    ENV_FILES.filter(
      (f) => f !== ".env.local"
    )
  ) {
    for (const name of SWITCHES) {
      const values =
        maps.get(filename).get(name)
        ?? [];

      if (
        values.length > 1 ||
        values.some(
          (value) =>
            value !== "false"
        )
      ) {
        badOverrides.push(
          `${filename}:${name}`
        );
      }
    }
  }

  add(
    "L02",

    badOverrides.length
      ? "FAIL"
      : "PASS",

    "Other dotenv files do not enable or duplicate safety switches",

    `Review: ${badOverrides.join(", ")}`
  );

  /* -----------------------------------------------------
     L03 - Current shell cannot override to true.
     ----------------------------------------------------- */

  const unsafeShell =
    SWITCHES.filter(
      (name) =>
        shell[name] !== undefined &&
        shell[name] !== "false"
    );

  add(
    "L03",

    unsafeShell.length
      ? "FAIL"
      : "PASS",

    "Current process contains no unsafe flag overrides",

    `Review: ${unsafeShell.join(", ")}`
  );

  /* -----------------------------------------------------
     L04 and L05 - Effective flag resolution.

     These are local simulations of ordinary
     Next.js environment precedence.

     They cannot verify a remote hosting
     platform's environment variables.
     ----------------------------------------------------- */

  for (
    const [
      id,
      mode,
    ] of [
      ["L04", "development"],
      ["L05", "production"],
    ]
  ) {
    const wrong =
      SWITCHES.filter(
        (name) =>
          resolved(
            name,
            mode,
            maps,
            shell
          ).value !== "false"
      );

    add(
      id,

      wrong.length
        ? "FAIL"
        : "PASS",

      `Local ${mode} flag resolution is false`,

      `Review: ${wrong.join(", ")}`
    );
  }

  /* -----------------------------------------------------
     L06 - Do not assume .env.staging is loaded.
     ----------------------------------------------------- */

  const stagingFile =
    exists(".env.staging") ||
    exists(".env.staging.local");

  add(
    "L06",

    stagingFile
      ? "NOT_VERIFIED"
      : "PASS",

    "No standalone .env.staging file assumed to be loaded by Next.js",

    "Next.js does not automatically use NODE_ENV=staging; use platform-managed staging configuration with NODE_ENV=production."
  );

  /* -----------------------------------------------------
     L07 - Suspicious public-prefixed secrets.

     Check variable NAMES, not values.
     ----------------------------------------------------- */

  const publicNames = [];

  const sensitive =
    /(?:DATABASE|PASSWORD|PASSWD|SECRET|PRIVATE|API[_-]?KEY|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|SMTP|WORKER)/i;

  for (
    const [
      filename,
      map,
    ] of maps
  ) {
    for (
      const name of
      map.keys()
    ) {
      if (
        name.startsWith(
          "NEXT_PUBLIC_"
        ) &&
        sensitive.test(name)
      ) {
        publicNames.push(
          `${filename}:${name}`
        );
      }
    }
  }

  add(
    "L07",

    publicNames.length
      ? "FAIL"
      : "PASS",

    "No suspicious NEXT_PUBLIC_ secret variable names",

    `Review names only: ${publicNames.join(", ")}`
  );

  /* -----------------------------------------------------
     L08 - next.config env exposure heuristic.

     Some config forms are dynamic.

     If the scanner finds a suspicious env
     field, require a manual review rather
     than claiming safe or unsafe behavior
     without inspecting the exact config.
     ----------------------------------------------------- */

  const configNames = [
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
  ];

  const exposingConfig =
    configNames.filter(
      (filename) =>
        typeof read(filename) ===
          "string" &&

        /(?:^|[,{]\s*)env\s*:/m
          .test(
            read(filename)
          )
    );

  add(
    "L08",

    exposingConfig.length
      ? "NOT_VERIFIED"
      : "PASS",

    "No obvious next.config env object exposing private configuration",

    `Review: ${exposingConfig.join(", ")}`
  );

  /* -----------------------------------------------------
     L09 - Static export must not replace API.

     The website has server-side quotation
     endpoints, so a purely static export
     is not a suitable full deployment.
     ----------------------------------------------------- */

  const staticExport =
    configNames.filter(
      (filename) =>
        typeof read(filename) ===
          "string" &&

        /\boutput\s*:\s*['"]export['"]/
          .test(
            read(filename)
          )
    );

  add(
    "L09",

    staticExport.length
      ? "FAIL"
      : "PASS",

    "No static export configured for the server-side quotation API",

    `Review: ${staticExport.join(", ")}`
  );

  /* -----------------------------------------------------
     L10 - Project build script.
     ----------------------------------------------------- */

  let pkg;

  try {
    pkg = JSON.parse(
      read("package.json") ?? ""
    );
  } catch {
    pkg = null;
  }

  const build =
    typeof pkg?.scripts?.build ===
      "string" &&

    pkg.scripts.build.length > 0;

  add(
    "L10",

    build
      ? "PASS"
      : "FAIL",

    "Project has a build script",

    "Verify package.json scripts.build."
  );

  /* -----------------------------------------------------
     L11 - Quotation server route exists.
     ----------------------------------------------------- */

  const route =
    exists(
      "src/app/api/quotations/route.ts"
    ) ||

    exists(
      "app/api/quotations/route.ts"
    );

  add(
    "L11",

    route
      ? "PASS"
      : "NOT_VERIFIED",

    "Expected quotation API route is present",

    "Locate quotation API route and verify staging stays disabled."
  );

  /* -----------------------------------------------------
     L12 - Local-only worker guard evidence.

     This is a static source heuristic.

     It does not certify the worker as
     safe to deploy in staging.

     Staging worker must remain disabled.
     ----------------------------------------------------- */

  const workerPath =
    "src/lib/quotation-email-worker-handoff-db.ts";

  const workerSource =
    read(workerPath);

  const guard =
    typeof workerSource ===
      "string" &&

    /NODE_ENV/.test(
      workerSource
    ) &&

    /development/.test(
      workerSource
    ) &&

    /DATABASE_SSL_MODE/.test(
      workerSource
    ) &&

    /server-only/.test(
      workerSource
    );

  add(
    "L12",

    guard
      ? "PASS"
      : "NOT_VERIFIED",

    "Existing worker adapter contains local-development guard evidence",

    "Inspect File 55; staging must keep the worker disabled. This static check does not prove runtime safety."
  );

  /* -----------------------------------------------------
     L13 - Preserve prior readiness evidence.
     ----------------------------------------------------- */

  const previous = [
    "scripts/quotation-deployment-readiness-review.mjs",
    "scripts/quotation-hosting-environment-audit.mjs",
    "scripts/quotation-email-operational-readiness-review.sql",
  ];

  const missing =
    previous.filter(
      (filename) =>
        !exists(filename)
    );

  add(
    "L13",

    missing.length
      ? "NOT_VERIFIED"
      : "PASS",

    "Files 63–65 readiness evidence remains available",

    `Locate: ${missing.join(", ")}`
  );

  /* -----------------------------------------------------
     L14 - Public-prefixed shell variables.

     Checks names only.
     ----------------------------------------------------- */

  const nextEnv =
    Object.keys(shell).filter(
      (name) =>
        name.startsWith(
          "NEXT_PUBLIC_"
        ) &&
        sensitive.test(name)
    );

  add(
    "L14",

    nextEnv.length
      ? "FAIL"
      : "PASS",

    "Current shell has no suspicious NEXT_PUBLIC_ secret variable names",

    `Review names: ${nextEnv.join(", ")}`
  );

  /* -----------------------------------------------------
     Deployment gates are deliberately
     never marked PASS by source scanning.
     ----------------------------------------------------- */

  return {
    local: results,

    gates:
      EXTERNAL_GATES.map(
        ([
          id,
          title,
        ]) => ({
          id,
          title,

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
   8. FORMAT SAFE AUDIT OUTPUT

   The report never prints actual values
   from DATABASE_URL, passwords or provider
   secrets.

   Only control names, statuses and
   non-secret review guidance are shown.
   ======================================================= */

function format(report) {
  const output = [
    "FILE 66 — STAGING ISOLATION READINESS (OFFLINE)",
  ];

  for (
    const item of
    report.local
  ) {
    output.push(
      `${item.id} [${item.status}] ${item.title}`
    );

    if (item.action) {
      output.push(
        `  ACTION: ${item.action}`
      );
    }
  }

  const count =
    (status) =>
      report.local.filter(
        (item) =>
          item.status ===
            status
      ).length;

  output.push(
    `LOCAL_SUMMARY: ${count("PASS")} PASS, ${count("FAIL")} FAIL, ${count("NOT_VERIFIED")} NOT_VERIFIED`
  );

  output.push(
    "STAGING DEPLOYMENT EVIDENCE REQUIRED:"
  );

  for (
    const item of
    report.gates
  ) {
    output.push(
      `${item.id} [NOT_VERIFIED] ${item.title}`
    );
  }

  output.push(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

  output.push(
    "PRODUCTION_ACTIVATION: NOT_AUTHORIZED"
  );

  output.push(
    "NETWORK_CALLS: 0"
  );

  output.push(
    "DATABASE_CONNECTIONS: 0"
  );

  output.push(
    "REAL_EMAILS_SENT: 0"
  );

  return output.join("\n");
}

/* =======================================================
   9. CREATE FICTIONAL IN-MEMORY PROJECT

   Used for automated tests only.

   No files are created on disk.

   No real connection strings are used.
   ======================================================= */

function fakeFiles() {
  const files = new Map([
    [
      "package.json",

      JSON.stringify({
        scripts: {
          build: "next build",
          start: "next start",
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

    [
      "src/lib/quotation-email-worker-handoff-db.ts",

      'import "server-only"; if (process.env.NODE_ENV !== "development" || process.env.DATABASE_SSL_MODE !== "disable") throw new Error("blocked");',
    ],

    [
      "scripts/quotation-deployment-readiness-review.mjs",

      "fictional",
    ],

    [
      "scripts/quotation-hosting-environment-audit.mjs",

      "fictional",
    ],

    [
      "scripts/quotation-email-operational-readiness-review.sql",

      "fictional",
    ],

    [
      ".env.local",

      SWITCHES.map(
        (name) =>
          `${name}="false"`
      ).join("\n"),
    ],
  ]);

  return files;
}

/* =======================================================
   10. FICTIONAL STAGING DESIGN MODEL

   Uses invented identifiers only.

   This model is never deployed.

   No credentials, domains or databases
   are created by these tests.
   ======================================================= */

function fakeDesign() {
  return {
    environmentLabel:
      "staging",

    nodeEnv:
      "production",

    host:
      "staging.example.invalid",

    productionHost:
      "www.example.invalid",

    databaseId:
      "stage_db",

    productionDatabaseId:
      "prod_db",

    websiteRole:
      "stage_web",

    productionWebsiteRole:
      "prod_web",

    workerRole:
      "stage_worker",

    productionWorkerRole:
      "prod_worker",

    storageId:
      "stage-storage",

    productionStorageId:
      "prod-storage",

    workerMode:
      "disabled",

    emailMode:
      "disabled",

    providerEgress:
      "blocked",

    publicSubmissions:
      "disabled",

    switches:
      Object.fromEntries(
        SWITCHES.map(
          (name) => [
            name,
            "false",
          ]
        )
      ),
  };
}

/* =======================================================
   11. TWENTY-FOUR AUTOMATED SELF-TESTS

   All tests use fictional in-memory data.

   No external services are accessed.
   ======================================================= */

function runSelfTests() {
  let total = 0;

  const test =
    (name, fn) => {
      fn();

      console.log(
        `PASS ${++total}: ${name}`
      );
    };

  const evaluate =
    (
      files,
      shell = {}
    ) =>
      inspect({
        read:
          (p) =>
            files.get(p) ?? null,

        exists:
          (p) =>
            files.has(p),

        shell,
      });

  const state =
    (
      report,
      id
    ) =>
      report.local.find(
        (item) =>
          item.id === id
      )?.status;

  const tweak =
    (fn) => {
      const files = fakeFiles();

      fn(files);

      return evaluate(files);
    };

  /* TEST 1 */

  test(
    "Fictional baseline has 14 passing local checks",

    () =>
      assert.equal(
        evaluate(
          fakeFiles()
        ).local.filter(
          (item) =>
            item.status ===
              "PASS"
        ).length,

        14
      )
  );

  /* TEST 2 */

  test(
    "Missing safe switch fails",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                ".env.local",

                SWITCHES.slice(1)
                  .map(
                    (name) =>
                      `${name}=false`
                  )
                  .join("\n")
              )
          ),

          "L01"
        ),

        "FAIL"
      )
  );

  /* TEST 3 */

  test(
    "Duplicate safe switch fails",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                ".env.local",

                files.get(
                  ".env.local"
                ) +

                "\n" +
                SWITCHES[0] +
                "=false"
              )
          ),

          "L01"
        ),

        "FAIL"
      )
  );

  /* TEST 4 */

  test(
    "Enabled safe switch fails",

    () =>
      assert.equal(
        state(
          tweak(
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

  /* TEST 5 */

  test(
    "Production dotenv override fails",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                ".env.production.local",

                `${SWITCHES[0]}=true`
              )
          ),

          "L02"
        ),

        "FAIL"
      )
  );

  /* TEST 6 */

  test(
    "Shell override fails",

    () =>
      assert.equal(
        state(
          evaluate(
            fakeFiles(),

            {
              [SWITCHES[1]]:
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
    "Development effective override fails",

    () =>
      assert.equal(
        state(
          evaluate(
            fakeFiles(),

            {
              [SWITCHES[1]]:
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
    "Production effective override fails",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                ".env.production.local",

                `${SWITCHES[1]}=true`
              )
          ),

          "L05"
        ),

        "FAIL"
      )
  );

  /* TEST 9 */

  test(
    "Unrecognized .env.staging is not certified",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                ".env.staging",

                "DEMO=1"
              )
          ),

          "L06"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 10 */

  test(
    "Public secret name fails",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                ".env",

                "NEXT_PUBLIC_DATABASE_PASSWORD=fictional"
              )
          ),

          "L07"
        ),

        "FAIL"
      )
  );

  /* TEST 11 */

  test(
    "next.config env exposure requires review",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                "next.config.ts",

                'export default { env: { X: "demo" } };'
              )
          ),

          "L08"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 12 */

  test(
    "Static export is incompatible with API",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                "next.config.ts",

                'export default { output: "export" };'
              )
          ),

          "L09"
        ),

        "FAIL"
      )
  );

  /* TEST 13 */

  test(
    "Missing build script fails",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                "package.json",

                "{}"
              )
          ),

          "L10"
        ),

        "FAIL"
      )
  );

  /* TEST 14 */

  test(
    "Missing quotation route is not certified",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.delete(
                "src/app/api/quotations/route.ts"
              )
          ),

          "L11"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 15 */

  test(
    "Missing worker guard is not certified",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.set(
                "src/lib/quotation-email-worker-handoff-db.ts",

                "export {}"
              )
          ),

          "L12"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 16 */

  test(
    "Missing prior review is not certified",

    () =>
      assert.equal(
        state(
          tweak(
            (files) =>
              files.delete(
                "scripts/quotation-hosting-environment-audit.mjs"
              )
          ),

          "L13"
        ),

        "NOT_VERIFIED"
      )
  );

  /* TEST 17 */

  test(
    "Shell public secret name fails",

    () =>
      assert.equal(
        state(
          evaluate(
            fakeFiles(),

            {
              NEXT_PUBLIC_API_KEY:
                "fictional",
            }
          ),

          "L14"
        ),

        "FAIL"
      )
  );

  /* TEST 18 */

  test(
    "Safe staging design passes fictional constraints",

    () =>
      assert.deepEqual(
        assessDesign(
          fakeDesign()
        ),

        []
      )
  );

  /* TEST 19 */

  test(
    "Shared staging database fails design checks",

    () => {
      const design =
        fakeDesign();

      design.databaseId =
        design.productionDatabaseId;

      assert.ok(
        assessDesign(
          design
        ).some(
          (issue) =>
            issue.includes(
              "database"
            )
        )
      );
    }
  );

  /* TEST 20 */

  test(
    "Staging email worker activation fails design checks",

    () => {
      const design =
        fakeDesign();

      design.workerMode =
        "enabled";

      assert.ok(
        assessDesign(
          design
        ).some(
          (issue) =>
            issue.includes(
              "worker is not disabled"
            )
        )
      );
    }
  );

  /* TEST 21 */

  test(
    "Unsafe staging flag fails design checks",

    () => {
      const design =
        fakeDesign();

      design.switches[
        SWITCHES[0]
      ] = "true";

      assert.ok(
        assessDesign(
          design
        ).some(
          (issue) =>
            issue.includes(
              SWITCHES[0]
            )
        )
      );
    }
  );

  /* TEST 22 */

  test(
    "Staging NODE_ENV is production, not staging",

    () => {
      const design =
        fakeDesign();

      design.nodeEnv =
        "staging";

      assert.ok(
        assessDesign(
          design
        ).some(
          (issue) =>
            issue.includes(
              "NODE_ENV"
            )
        )
      );
    }
  );

  /* TEST 23 */

  test(
    "External gates never auto-pass",

    () =>
      assert.ok(
        evaluate(
          fakeFiles()
        ).gates.every(
          (item) =>
            item.status ===
              "NOT_VERIFIED"
        )
      )
  );

  /* TEST 24 */

  test(
    "No activation authorized and no secrets printed",

    () => {
      const files =
        fakeFiles();

      files.set(
        ".env",

        "DATABASE_PASSWORD=FICTIONAL_PRIVATE_TEST_VALUE"
      );

      const report =
        evaluate(files);

      const output =
        format(report);

      assert.equal(
        report.stagingAuthorized,
        false
      );

      assert.equal(
        report.productionAuthorized,
        false
      );

      assert.ok(
        !output.includes(
          "FICTIONAL_PRIVATE_TEST_VALUE"
        )
      );

      assert.match(
        output,

        /STAGING_ACTIVATION: NOT_AUTHORIZED/
      );
    }
  );

  console.log(
    `FILE 66 SELF-TEST: ${total}/24 PASSED`
  );

  console.log(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; REAL_EMAILS_SENT: 0"
  );
}

/* =======================================================
   12. AUDIT THE REAL LOCAL PROJECT

   Only named local files are read.

   No network activity.

   No PostgreSQL queries.

   No files are written.
   ======================================================= */

function auditProject() {
  const root =
    process.cwd();

  const read =
    (filename) => {
      try {
        return fs.readFileSync(
          path.join(
            root,
            filename
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

  const exists =
    (filename) =>
      fs.existsSync(
        path.join(
          root,
          filename
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
    report.local.some(
      (item) =>
        item.status === "FAIL"
    )
  ) {
    process.exitCode = 1;
  }
}

/* =======================================================
   13. COMMAND LINE ENTRYPOINT
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
    "Usage: node scripts/quotation-staging-isolation-review.mjs --self-test|--audit"
  );

  process.exitCode = 2;

} else if (
  process.argv[2] ===
    "--self-test"
) {
  runSelfTests();

} else {
  auditProject();
}

/*
===========================================================
END FILE 66

No staging deployment.
No database writes.
No quotation submissions.
No actual emails.

Both staging and production activation
remain unauthorized.
===========================================================
*/
