
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/*
===========================================================
BARK ORNAMENT (PVT) LTD

FILE 65 - HOSTING AND DEPLOYMENT ENVIRONMENT AUDIT

File:
scripts/quotation-hosting-environment-audit.mjs

MODES:
--self-test
--audit

READ-ONLY SAFETY:
- No network connections
- No PostgreSQL connections
- No email provider connections
- No emails sent
- No writes to project files
- No migrations
- No Next.js server started
- No credentials printed
- Git commands are read-only

All live quotation and email switches stay disabled.

The static source checks are indicators, not
a comprehensive security or information-flow audit.
===========================================================
*/

const FLAGS = [
  "QUOTATION_SUBMISSIONS_ENABLED",
  "QUOTATION_E2E_TEST_MODE",
  "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
];

const ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
];

const SENSITIVE_NAME =
  /(?:DATABASE|PASSWORD|PASSWD|SECRET|PRIVATE|API[_-]?KEY|ACCESS[_-]?TOKEN|AUTH[_-]?TOKEN|SMTP|WORKER[_-]?DATABASE|SESSION[_-]?KEY)/i;

const MODULES = [
  "src/lib/quotation-email-worker-handoff-db.ts",
  "src/lib/quotation-email-worker-handoff-coordinator.ts",
];

const EXTERNAL = [
  [
    "X01",
    "Approved hosting platform and deployment topology",
  ],
  [
    "X02",
    "Production HTTPS certificates, routing and secure headers",
  ],
  [
    "X03",
    "Managed production secrets, rotation and access logs",
  ],
  [
    "X04",
    "Production PostgreSQL TLS, network restrictions and role isolation",
  ],
  [
    "X05",
    "Independent staging database, keys and test recipients",
  ],
  [
    "X06",
    "Encrypted backup and successful restore drill",
  ],
  [
    "X07",
    "Turnstile production keys and server-side verification",
  ],
  [
    "X08",
    "Email-provider domain authentication, idempotency and recovery",
  ],
  [
    "X09",
    "Monitoring, audit access, incident and rollback runbooks",
  ],
  [
    "X10",
    "Browser bundle inspection and real deployment penetration review",
  ],
];

/* =======================================================
   1. PARSE ENVIRONMENT ASSIGNMENTS

   Reads named assignments without reporting
   credential values.

   Complex multiline dotenv expressions and variable
   interpolation are not fully evaluated here.
   Those require deployment-environment validation.
   ======================================================= */

function parseAssignments(contents) {
  const map = new Map();

  if (contents === null) {
    return map;
  }

  for (
    const line of contents
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
  ) {
    const m =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*?)\s*$/
        .exec(line);

    if (!m) {
      continue;
    }

    let value = m[2].trim();

    const quoted =
      /^(?:"([^"]*)"|'([^']*)')(?:\s*#.*)?$/
        .exec(value);

    if (quoted) {
      value = quoted[1] ?? quoted[2];
    } else {
      value = value
        .replace(/\s+#.*$/, "")
        .trim();
    }

    if (!map.has(m[1])) {
      map.set(m[1], []);
    }

    map.get(m[1]).push(value);
  }

  return map;
}

/* =======================================================
   2. SIMULATE NEXT.JS ENVIRONMENT PRECEDENCE

   Priority:
   1. Process environment
   2. .env.<mode>.local
   3. .env.local (except test)
   4. .env.<mode>
   5. .env

   This checks only the three exact safety
   switches, not arbitrary secret expansion.
   ======================================================= */

function effective(
  name,
  mode,
  maps,
  shell
) {
  if (
    Object.hasOwn(shell, name) &&
    shell[name] !== undefined
  ) {
    return {
      value: shell[name],
      source: "shell",
    };
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

  for (const filename of order) {
    const values =
      maps.get(filename)?.get(name);

    if (values?.length) {
      return {
        value: values[values.length - 1],
        source: filename,
      };
    }
  }

  return {
    value: undefined,
    source: "not-defined",
  };
}

/* =======================================================
   3. IDENTIFY CLIENT COMPONENT DIRECTIVES

   Conservative source scan:
   - Supports normal use client directives
   - Permits leading comments

   It does not replace a full compiler-level
   import graph or browser bundle inspection.
   ======================================================= */

function hasClientDirective(source) {
  return /^\s*(?:(?:\/\/[^\n]*\n\s*)|(?:\/\*[\s\S]*?\*\/\s*))*["']use client["']\s*;?/
    .test(source);
}

/* =======================================================
   4. CHECK LOCAL POSTGRESQL URL HOSTS

   Only:
   localhost
   127.0.0.1
   ::1

   The returned value is just PASS/FAIL.
   Database credentials are never printed.
   ======================================================= */

function localUrlVerdict(value) {
  if (!value) {
    return "NOT_VERIFIED";
  }

  try {
    const u = new URL(value);

    if (
      ![
        "postgres:",
        "postgresql:",
      ].includes(u.protocol)
    ) {
      return "FAIL";
    }

    return [
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(u.hostname)
      ? "PASS"
      : "FAIL";

  } catch {
    return "FAIL";
  }
}

/* =======================================================
   5. MAIN OFFLINE SECURITY AUDIT
   ======================================================= */

function review({
  read,
  paths,
  shell = {},
  git = {
    tracked: "UNKNOWN",
    ignored: "UNKNOWN",
  },
}) {
  const checks = [];

  const add = (
    id,
    status,
    title,
    next = ""
  ) => {
    checks.push({
      id,
      status,
      title,

      next:
        status === "PASS"
          ? ""
          : next,
    });
  };

  const maps = new Map(
    ENV_FILES.map(
      (f) => [
        f,
        parseAssignments(read(f)),
      ]
    )
  );

  /* -----------------------------------------------------
     E01 - Exact .env.local safety values
     ----------------------------------------------------- */

  const local =
    maps.get(".env.local");

  const localProblems =
    FLAGS.filter(
      (name) =>
        local.get(name)?.length !== 1 ||
        local.get(name)[0] !== "false"
    );

  add(
    "E01",

    localProblems.length
      ? "FAIL"
      : "PASS",

    "All three .env.local safety switches occur exactly once and equal false",

    `Review these switch names locally: ${localProblems.join(", ")}`
  );

  /* -----------------------------------------------------
     E02 - Other dotenv safety switches
     ----------------------------------------------------- */

  const extraProblems = [];

  for (const f of ENV_FILES) {
    if (f === ".env.local") {
      continue;
    }

    for (const name of FLAGS) {
      const values =
        maps.get(f).get(name) ?? [];

      if (
        values.length > 1 ||
        values.some(
          (v) =>
            v !== "false"
        )
      ) {
        extraProblems.push(
          `${f}:${name}`
        );
      }
    }
  }

  add(
    "E02",

    extraProblems.length
      ? "FAIL"
      : "PASS",

    "Other dotenv files do not enable or duplicate protected switches",

    `Check assignments: ${extraProblems.join(", ")}`
  );

  /* -----------------------------------------------------
     E03 - Current shell overrides
     ----------------------------------------------------- */

  const shellProblems =
    FLAGS.filter(
      (name) =>
        Object.hasOwn(shell, name) &&
        shell[name] !== undefined &&
        shell[name] !== "false"
    );

  add(
    "E03",

    shellProblems.length
      ? "FAIL"
      : "PASS",

    "Current shell does not override protected switches to unsafe values",

    `Check shell variable names: ${shellProblems.join(", ")}`
  );

  /* -----------------------------------------------------
     E04 - Development effective safety state
     ----------------------------------------------------- */

  const devProblems =
    FLAGS.filter(
      (name) =>
        effective(
          name,
          "development",
          maps,
          shell
        ).value !== "false"
    );

  add(
    "E04",

    devProblems.length
      ? "FAIL"
      : "PASS",

    "Effective local development switches resolve to false",

    `Check Next.js loading precedence for: ${devProblems.join(", ")}`
  );

  /* -----------------------------------------------------
     E05 - Local production-mode resolution

     This is NOT proof of actual hosting settings.
     ----------------------------------------------------- */

  const productionStates =
    FLAGS.map(
      (name) => ({
        name,

        ...effective(
          name,
          "production",
          maps,
          shell
        ),
      })
    );

  const prodUnsafe =
    productionStates.filter(
      (x) =>
        x.value !== undefined &&
        x.value !== "false"
    );

  const prodMissing =
    productionStates.filter(
      (x) =>
        x.value === undefined
    );

  add(
    "E05",

    prodUnsafe.length
      ? "FAIL"
      : prodMissing.length
        ? "NOT_VERIFIED"
        : "PASS",

    "Local production-mode dotenv resolution does not enable protected switches",

    prodUnsafe.length
      ? `Review: ${prodUnsafe.map(
          (x) =>
            `${x.name} (${x.source})`
        ).join(", ")}`

      : "No complete local production-mode configuration; real hosting environment still needs separate verification."
  );

  /* -----------------------------------------------------
     E06 - Suspicious NEXT_PUBLIC_ secrets
     ----------------------------------------------------- */

  const publicRisk = [];

  for (const [f, map] of maps) {
    for (const name of map.keys()) {
      if (
        name.startsWith("NEXT_PUBLIC_") &&
        SENSITIVE_NAME.test(name)
      ) {
        publicRisk.push(
          `${f}:${name}`
        );
      }
    }
  }

  add(
    "E06",

    publicRisk.length
      ? "FAIL"
      : "PASS",

    "No suspicious public-prefixed secret names in local dotenv files",

    `Inspect suspicious names (never print values): ${publicRisk.join(", ")}`
  );

  /* -----------------------------------------------------
     E07 - next.config env field

     The Next.js env config property can
     expose variables through browser bundles.
     ----------------------------------------------------- */

  const configPaths = [
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
  ];

  const configRisk =
    configPaths.filter(
      (f) => {
        const content = read(f);

        return (
          content !== null &&
          /(?:^|[,{]\s*)env\s*:/m
            .test(content)
        );
      }
    );

  add(
    "E07",

    configRisk.length
      ? "FAIL"
      : "PASS",

    "No next.config env field that can bundle private values",

    `Review Next.js config files: ${configRisk.join(", ")}`
  );

  /* -----------------------------------------------------
     E08 - server-only import boundaries
     ----------------------------------------------------- */

  const serverMissing =
    MODULES.filter(
      (f) => {
        const content =
          read(f);

        return (
          content === null ||
          !/\bimport\s*["']server-only["']\s*;?/
            .test(content)
        );
      }
    );

  add(
    "E08",

    serverMissing.length
      ? "FAIL"
      : "PASS",

    "Database handoff and coordinator modules have server-only imports",

    `Review: ${serverMissing.join(", ")}`
  );

  /* -----------------------------------------------------
     Source collection for client boundary checks
     ----------------------------------------------------- */

  const sourcePaths =
    paths.filter(
      (p) =>
        /^(?:src\/|app\/|pages\/|components\/)/
          .test(p) &&

        /\.(?:js|jsx|ts|tsx)$/
          .test(p)
    );

  const clientFiles =
    sourcePaths.filter(
      (p) =>
        hasClientDirective(
          read(p) ?? ""
        )
    );

  /* -----------------------------------------------------
     E09 - Private env access in Client Components
     ----------------------------------------------------- */

  const privateEnv =
    /\bprocess\s*\.\s*env\s*\.\s*(?:DATABASE_URL|EMAIL_WORKER_DATABASE_URL|[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|API_KEY|ACCESS_TOKEN|AUTH_TOKEN)[A-Z0-9_]*)\b/;

  const sensitiveRefs =
    clientFiles.filter(
      (p) =>
        privateEnv.test(
          read(p) ?? ""
        )
    );

  add(
    "E09",

    sensitiveRefs.length
      ? "FAIL"
      : "PASS",

    "No obvious private environment references inside Client Components",

    `Inspect Client Components: ${sensitiveRefs.join(", ")}`
  );

  /* -----------------------------------------------------
     E10 - Worker/server import paths in client files
     ----------------------------------------------------- */

  const riskyImports =
    clientFiles.filter(
      (p) =>
        /(?:\bfrom\s*|\bimport\s*\()["'][^"']*(?:quotation-email-worker|quotation-email-worker-handoff-db|\/server\/|\/db\/)[^"']*["']/
          .test(read(p) ?? "")
    );

  add(
    "E10",

    riskyImports.length
      ? "FAIL"
      : "PASS",

    "No obvious imports of protected worker/server modules by Client Components",

    `Inspect import paths in: ${riskyImports.join(", ")}`
  );

  /* -----------------------------------------------------
     E11 - Git tracking state
     ----------------------------------------------------- */

  add(
    "E11",

    git.tracked === "YES"
      ? "FAIL"

      : git.tracked === "NO"
        ? "PASS"
        : "NOT_VERIFIED",

    "Git does not track .env.local",

    "Use git ls-files --error-unmatch -- .env.local (do not show file contents)."
  );

  /* -----------------------------------------------------
     E12 - Git ignore state
     ----------------------------------------------------- */

  add(
    "E12",

    git.ignored === "YES"
      ? "PASS"

      : git.ignored === "NO"
        ? "FAIL"
        : "NOT_VERIFIED",

    "Git excludes .env.local through ignore configuration",

    "Review .gitignore; do not remove .env.local or disclose secrets."
  );

  /* -----------------------------------------------------
     E13 - Local database hosts
     ----------------------------------------------------- */

  const webUrl =
    maps.get(".env.local")
      .get("DATABASE_URL")?.[0];

  const workerUrl =
    maps.get(".env.local")
      .get("EMAIL_WORKER_DATABASE_URL")?.[0];

  const urlChecks = [
    localUrlVerdict(webUrl),
    localUrlVerdict(workerUrl),
  ];

  add(
    "E13",

    urlChecks.includes("FAIL")
      ? "FAIL"

      : urlChecks.includes(
          "NOT_VERIFIED"
        )
        ? "NOT_VERIFIED"
        : "PASS",

    "Configured local database URLs use PostgreSQL loopback addresses only",

    "Check local DATABASE_URL and EMAIL_WORKER_DATABASE_URL hostnames without sharing credentials."
  );

  /* -----------------------------------------------------
     E14 - Distinct restricted worker identity
     ----------------------------------------------------- */

  let workerIdentity =
    "NOT_VERIFIED";

  if (
    webUrl &&
    workerUrl &&
    urlChecks.every(
      (v) =>
        v === "PASS"
    )
  ) {
    try {
      const web =
        new URL(webUrl);

      const worker =
        new URL(workerUrl);

      workerIdentity =
        decodeURIComponent(
          worker.username
        ) ===
          "bark_email_worker_service" &&

        web.username !==
          worker.username &&

        worker.href !==
          web.href

          ? "PASS"
          : "FAIL";

    } catch {
      workerIdentity =
        "FAIL";
    }
  }

  add(
    "E14",

    workerIdentity,

    "Local email worker has distinct restricted database identity",

    "Inspect database username and separation locally; no connection is attempted."
  );

  /* -----------------------------------------------------
     E15 - Production TLS safety

     DATABASE_SSL_MODE=disable is acceptable
     only for controlled local development.

     Production connections require a
     separate secure configuration review.
     ----------------------------------------------------- */

  const productionFiles = [
    ".env.production",
    ".env.production.local",
  ];

  const badSsl =
    productionFiles.filter(
      (f) =>
        (
          maps.get(f)
            .get("DATABASE_SSL_MODE")
            ?? []
        ).some(
          (v) =>
            v === "disable"
        )
    );

  add(
    "E15",

    badSsl.length
      ? "FAIL"
      : "PASS",

    "Production dotenv files do not explicitly disable database TLS",

    `Review: ${badSsl.join(", ")}`
  );

  /* -----------------------------------------------------
     E16 - Server build/start capability
     ----------------------------------------------------- */

  let packageJson;

  try {
    packageJson =
      JSON.parse(
        read("package.json") ?? ""
      );
  } catch {
    packageJson = null;
  }

  const scriptsOk =
    packageJson &&

    typeof packageJson.scripts
      ?.build === "string" &&

    typeof packageJson.scripts
      ?.start === "string";

  add(
    "E16",

    scriptsOk
      ? "PASS"
      : "NOT_VERIFIED",

    "Node deployment build/start scripts are present",

    "Confirm hosting mode and build/start scripts for the chosen platform."
  );

  /* -----------------------------------------------------
     External deployment evidence is never
     auto-certified by local source scanning.
     ----------------------------------------------------- */

  return {
    checks,

    external:
      EXTERNAL.map(
        ([id, title]) => ({
          id,
          title,
          status:
            "NOT_VERIFIED",
        })
      ),

    goLive: false,

    sourceCount:
      sourcePaths.length,

    clientCount:
      clientFiles.length,
  };
}

/* =======================================================
   6. FORMAT OUTPUT

   Reports result metadata only.

   Never prints dotenv contents, database
   passwords or secret values.
   ======================================================= */

function format(report) {
  const out = [
    "FILE 65 - HOSTING AND ENVIRONMENT SECURITY (OFFLINE)",
  ];

  for (const x of report.checks) {
    out.push(
      `${x.id} [${x.status}] ${x.title}`
    );

    if (x.next) {
      out.push(
        `  NEXT: ${x.next}`
      );
    }
  }

  const total =
    (s) =>
      report.checks.filter(
        (c) =>
          c.status === s
      ).length;

  out.push(
    `LOCAL_SUMMARY: ${total("PASS")} PASS, ${total("FAIL")} FAIL, ${total("NOT_VERIFIED")} NOT_VERIFIED`
  );

  out.push(
    `SOURCE_SCOPE: ${report.sourceCount} source files, ${report.clientCount} Client Component files scanned`
  );

  out.push(
    "EXTERNAL DEPLOYMENT REQUIREMENTS:"
  );

  for (const x of report.external) {
    out.push(
      `${x.id} [${x.status}] ${x.title}`
    );
  }

  out.push(
    "GO_LIVE_DECISION: NOT_AUTHORIZED"
  );

  out.push(
    "NETWORK_CALLS: 0"
  );

  out.push(
    "DATABASE_CONNECTIONS: 0"
  );

  out.push(
    "EMAILS_SENT: 0"
  );

  return out.join("\n");
}

/* =======================================================
   7. FICTIONAL IN-MEMORY TEST PROJECT

   Test credentials are fictional strings.

   No test files are created on disk.
   ======================================================= */

function fictional() {
  const f = new Map();

  f.set(
    ".env.local",

    FLAGS.map(
      (n) =>
        `${n}="false"`
    ).join("\n") +

    '\nDATABASE_URL="postgresql://web:private@127.0.0.1:5432/bark_ornament"' +

    '\nEMAIL_WORKER_DATABASE_URL="postgresql://bark_email_worker_service:private@127.0.0.1:5432/bark_ornament"'
  );

  f.set(
    "src/lib/quotation-email-worker-handoff-db.ts",
    'import "server-only";'
  );

  f.set(
    "src/lib/quotation-email-worker-handoff-coordinator.ts",
    'import "server-only";'
  );

  f.set(
    "src/components/form.tsx",
    '"use client"; export default function Form(){ return null; }'
  );

  f.set(
    "package.json",

    JSON.stringify({
      scripts: {
        build: "next build",
        start: "next start",
      },
    })
  );

  return f;
}

/* =======================================================
   8. IN-MEMORY AUDIT ADAPTER
   ======================================================= */

function simulate(
  files,
  env = {},
  git = {
    tracked: "NO",
    ignored: "YES",
  }
) {
  return review({
    read:
      (p) =>
        files.get(p) ?? null,

    paths:
      [...files.keys()],

    shell:
      env,

    git,
  });
}

/* =======================================================
   9. TWENTY AUTOMATED SELF-TESTS
   ======================================================= */

function selfTest() {
  let n = 0;

  const test =
    (label, fn) => {
      fn();

      console.log(
        `PASS ${++n}: ${label}`
      );
    };

  const find =
    (r, id) =>
      r.checks.find(
        (c) =>
          c.id === id
      ).status;

  test(
    "Safe fictional baseline has no FAIL",

    () =>
      assert.equal(
        simulate(fictional())
          .checks.filter(
            (c) =>
              c.status === "FAIL"
          ).length,
        0
      )
  );

  test(
    "Three disabled local switches pass",

    () =>
      assert.equal(
        find(
          simulate(fictional()),
          "E01"
        ),
        "PASS"
      )
  );

  test(
    "Enabled local switch fails",

    () => {
      const f = fictional();

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
          simulate(f),
          "E01"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Duplicate local switch fails",

    () => {
      const f = fictional();

      f.set(
        ".env.local",

        f.get(".env.local") +
          "\n" +
          FLAGS[0] +
          "=false"
      );

      assert.equal(
        find(
          simulate(f),
          "E01"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Production dotenv override fails",

    () => {
      const f = fictional();

      f.set(
        ".env.production.local",
        FLAGS[1] + "=true"
      );

      assert.equal(
        find(
          simulate(f),
          "E02"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Shell override fails",

    () =>
      assert.equal(
        find(
          simulate(
            fictional(),
            {
              [FLAGS[0]]:
                "true",
            }
          ),
          "E03"
        ),
        "FAIL"
      )
  );

  test(
    "Development mode respects safe flags",

    () =>
      assert.equal(
        find(
          simulate(fictional()),
          "E04"
        ),
        "PASS"
      )
  );

  test(
    "Production effective flag override detected",

    () => {
      const f = fictional();

      f.set(
        ".env.production.local",
        FLAGS[0] + "=true"
      );

      assert.equal(
        find(
          simulate(f),
          "E05"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Unsafe public secret name fails",

    () => {
      const f = fictional();

      f.set(
        ".env",

        "NEXT_PUBLIC_DATABASE_PASSWORD=fictional"
      );

      assert.equal(
        find(
          simulate(f),
          "E06"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Public site key is allowed by name",

    () => {
      const f = fictional();

      f.set(
        ".env",

        "NEXT_PUBLIC_TURNSTILE_SITE_KEY=fictional"
      );

      assert.equal(
        find(
          simulate(f),
          "E06"
        ),
        "PASS"
      );
    }
  );

  test(
    "next.config env object detected",

    () => {
      const f = fictional();

      f.set(
        "next.config.ts",

        'export default { env: { SAFE: "x" } };'
      );

      assert.equal(
        find(
          simulate(f),
          "E07"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Missing server-only import detected",

    () => {
      const f = fictional();

      f.set(
        "src/lib/quotation-email-worker-handoff-db.ts",
        "export {}"
      );

      assert.equal(
        find(
          simulate(f),
          "E08"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Client secret environment access detected",

    () => {
      const f = fictional();

      f.set(
        "src/components/form.tsx",

        '"use client"; console.log(process.env.DATABASE_URL)'
      );

      assert.equal(
        find(
          simulate(f),
          "E09"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Client worker import detected",

    () => {
      const f = fictional();

      f.set(
        "src/components/form.tsx",

        '"use client"; import x from "@/lib/quotation-email-worker-handoff-db";'
      );

      assert.equal(
        find(
          simulate(f),
          "E10"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Tracked .env.local detected",

    () =>
      assert.equal(
        find(
          simulate(
            fictional(),
            {},

            {
              tracked: "YES",
              ignored: "NO",
            }
          ),
          "E11"
        ),
        "FAIL"
      )
  );

  test(
    "Unverifiable Git state is not certified",

    () =>
      assert.equal(
        find(
          simulate(
            fictional(),
            {},

            {
              tracked:
                "UNKNOWN",

              ignored:
                "UNKNOWN",
            }
          ),
          "E11"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Remote database URL fails",

    () => {
      const f = fictional();

      f.set(
        ".env.local",

        f.get(".env.local")
          .replace(
            "127.0.0.1",
            "production.example.com"
          )
      );

      assert.equal(
        find(
          simulate(f),
          "E13"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Worker and web DB logins are distinct",

    () =>
      assert.equal(
        find(
          simulate(fictional()),
          "E14"
        ),
        "PASS"
      )
  );

  test(
    "Production TLS disable is detected",

    () => {
      const f = fictional();

      f.set(
        ".env.production",

        "DATABASE_SSL_MODE=disable"
      );

      assert.equal(
        find(
          simulate(f),
          "E15"
        ),
        "FAIL"
      );
    }
  );

  test(
    "Production gates cannot be auto-approved and secrets not printed",

    () => {
      const f = fictional();

      f.set(
        ".env",

        "EMAIL_PROVIDER_PASSWORD=super_fake_private_secret"
      );

      const r =
        simulate(f);

      const output =
        format(r);

      assert.equal(
        r.goLive,
        false
      );

      assert.ok(
        r.external.every(
          (x) =>
            x.status ===
              "NOT_VERIFIED"
        )
      );

      assert.ok(
        !output.includes(
          "super_fake_private_secret"
        )
      );

      assert.match(
        output,

        /GO_LIVE_DECISION: NOT_AUTHORIZED/
      );
    }
  );

  console.log(
    `FILE 65 SELF-TEST: ${n}/20 PASSED`
  );

  console.log(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0"
  );
}

/* =======================================================
   10. LIST PROJECT SOURCE FILES

   Scans source only.

   Skips:
   - node_modules
   - .next
   - .git
   - coverage
   - build output
   - symbolic links

   This does not inspect compiled browser bundles.
   ======================================================= */

function projectPaths(root) {
  const paths = [];

  const skip = new Set([
    "node_modules",
    ".next",
    ".git",
    "coverage",
    "dist",
    "build",
    ".turbo",
  ]);

  for (
    const base of [
      "src",
      "app",
      "pages",
      "components",
    ]
  ) {
    const full =
      path.join(
        root,
        base
      );

    if (!fs.existsSync(full)) {
      continue;
    }

    const todo = [
      base,
    ];

    while (todo.length) {
      const relative =
        todo.pop();

      for (
        const e of
        fs.readdirSync(
          path.join(
            root,
            relative
          ),
          {
            withFileTypes: true,
          }
        )
      ) {
        if (e.isSymbolicLink()) {
          continue;
        }

        const rel =
          relative +
          "/" +
          e.name;

        if (
          e.isDirectory() &&
          !skip.has(e.name)
        ) {
          todo.push(rel);

        } else if (
          e.isFile() &&
          /\.(?:ts|tsx|js|jsx)$/
            .test(e.name)
        ) {
          paths.push(rel);
        }
      }

      if (
        paths.length > 5000
      ) {
        throw new Error(
          "Source tree exceeds safe audit size (5000 files)."
        );
      }
    }
  }

  return paths;
}

/* =======================================================
   11. READ-ONLY GIT STATUS

   Git checks:
   - Is .env.local tracked?
   - Is .env.local ignored?

   Git is not asked to add, stage, commit,
   push, remove or modify any file.

   No file content is printed.
   ======================================================= */

function gitState(root) {
  const cmd =
    (args) =>
      spawnSync(
        "git",
        args,

        {
          cwd: root,
          stdio: "ignore",
          windowsHide: true,
          timeout: 4000,
        }
      );

  const tracked =
    cmd([
      "ls-files",
      "--error-unmatch",
      "--",
      ".env.local",
    ]);

  const ignored =
    cmd([
      "check-ignore",
      "-q",
      "--",
      ".env.local",
    ]);

  return {
    tracked:
      tracked.error ||

      (
        tracked.status !== 0 &&
        tracked.status !== 1
      )

        ? "UNKNOWN"

        : tracked.status === 0
          ? "YES"
          : "NO",

    ignored:
      ignored.error ||

      (
        ignored.status !== 0 &&
        ignored.status !== 1
      )

        ? "UNKNOWN"

        : ignored.status === 0
          ? "YES"
          : "NO",
  };
}

/* =======================================================
   12. AUDIT THE ACTUAL LOCAL PROJECT

   Only named local source and configuration
   files are read.

   No browser, network or database connection.
   ======================================================= */

function auditProject() {
  const root =
    process.cwd();

  const read =
    (p) => {
      try {
        return fs.readFileSync(
          path.join(
            root,
            p
          ),
          "utf8"
        );

      } catch (e) {
        if (
          e.code === "ENOENT"
        ) {
          return null;
        }

        throw e;
      }
    };

  const r =
    review({
      read,

      paths:
        projectPaths(root),

      shell:
        process.env,

      git:
        gitState(root),
    });

  console.log(
    format(r)
  );

  if (
    r.checks.some(
      (x) =>
        x.status === "FAIL"
    )
  ) {
    process.exitCode = 1;
  }
}

/* =======================================================
   13. COMMAND LINE ENTRYPOINT
   ======================================================= */

const arg =
  process.argv[2];

if (
  process.argv.length !== 3 ||

  ![
    "--self-test",
    "--audit",
  ].includes(arg)
) {
  console.error(
    "Usage: node scripts/quotation-hosting-environment-audit.mjs --self-test|--audit"
  );

  process.exitCode = 2;

} else if (
  arg === "--self-test"
) {
  selfTest();

} else {
  auditProject();
}

/*
===========================================================
END FILE 65

This is an offline review, not a deployment.

No real submissions.
No real email delivery.
No production authorization.
===========================================================
*/
