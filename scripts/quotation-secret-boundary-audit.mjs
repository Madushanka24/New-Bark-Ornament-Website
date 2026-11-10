
/**
 * BARK ORNAMENT (PVT) LTD — FILE 69
 * Offline deployment secret inventory and credential-boundary audit.
 *
 * Commands (run from project root):
 *   node scripts/quotation-secret-boundary-audit.mjs --self-test
 *   node scripts/quotation-secret-boundary-audit.mjs --inventory
 *   node scripts/quotation-secret-boundary-audit.mjs --audit
 *
 * No writes, network calls, database connections,
 * email or child processes.
 *
 * Reports configuration KEY NAMES only,
 * never credential values.
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
]);

const GATES = Object.freeze([
  "Staging uses separately provisioned database and website credentials",
  "No email-worker database identity injected into staging website",
  "Production credentials are never shared with staging or development",
  "Managed secret store and least-privilege access reviewed",
  "HTTPS ingress and staging database certificate verification tested",
  "No outbound email provider credentials or egress in staging",
  "Actual running staging feature flags verified false",
  "Production secret rotation and revocation procedure approved",
  "Real browser bundles inspected for exposed values",
  "Backup encryption, monitoring and release rollback verified",
]);

const SECRET_HINT =
  /(?:DATABASE_URL|DATABASE_PASSWORD|DB_PASS|PASSWORD|PASSWD|SECRET|PRIVATE|API_?KEY|ACCESS_?TOKEN|AUTH_?TOKEN|SMTP|SENDGRID|RESEND|MAILGUN|POSTMARK|EMAIL_PROVIDER|WORKER_?DATABASE)/i;

const WORKER_HINT =
  /(?:EMAIL_WORKER_DATABASE_URL|SMTP_|SENDGRID|RESEND|MAILGUN|POSTMARK|EMAIL_PROVIDER_)/i;

const PUBLIC_ALLOWED = new Set([
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY",
]);

/*
 * Classifications describe intended access
 * boundaries, not proof that a credential
 * value is valid or safely stored.
 */

function classification(name) {
  if (FLAGS.includes(name)) {
    return "SAFETY_SWITCH";
  }

  if (PUBLIC_ALLOWED.has(name)) {
    return "PUBLIC_SITE_KEY";
  }

  if (name.startsWith("NEXT_PUBLIC_")) {
    return SECRET_HINT.test(name) ||
      /QUOTATION|EMAIL_WORKER/i.test(name)
      ? "UNSAFE_PUBLIC_NAME"
      : "PUBLIC_REVIEW";
  }

  if (name === "DATABASE_URL") {
    return "WEB_SERVER_SECRET";
  }

  if (name === "EMAIL_WORKER_DATABASE_URL") {
    return "WORKER_ONLY_SECRET";
  }

  if (
    /^(?:TURNSTILE_SECRET_KEY|CLOUDFLARE_TURNSTILE_SECRET_KEY|CF_TURNSTILE_SECRET_KEY)$/
      .test(name)
  ) {
    return "WEB_SERVER_SECRET";
  }

  if (WORKER_HINT.test(name)) {
    return "WORKER_ONLY_REVIEW";
  }

  if (SECRET_HINT.test(name)) {
    return "PRIVATE_REVIEW";
  }

  return "OTHER_REVIEW";
}

/*
 * Simple dotenv assignment parser.
 *
 * Multiline values and interpolation
 * are not fully interpreted.
 *
 * Values are used internally only.
 * They are never included in reports.
 */

function parseEnv(input) {
  const out = new Map();

  if (typeof input !== "string") {
    return out;
  }

  for (
    const line of input
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
  ) {
    const match =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*?)\s*$/
        .exec(line);

    if (!match) {
      continue;
    }

    const q =
      /^(?:"([^"]*)"|'([^']*)')(?:\s*#.*)?$/
        .exec(match[2].trim());

    const val = q
      ? (q[1] ?? q[2])
      : match[2]
          .replace(/\s+#.*$/, "")
          .trim();

    out.set(
      match[1],
      [
        ...(out.get(match[1]) ?? []),
        val,
      ]
    );
  }

  return out;
}

/*
 * Model Next.js dotenv precedence for
 * the three protected feature switches.
 *
 * Process environment
 * .env.<mode>.local
 * .env.local (except test)
 * .env.<mode>
 * .env
 */

function effectiveFlag(
  name,
  mode,
  envMaps,
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
      envMaps.get(file)?.get(name)
      ?? [];

    if (values.length) {
      return values.at(-1);
    }
  }

  return undefined;
}

/*
 * Detect obvious Client Component
 * directives after optional comments.
 *
 * This is heuristic, not a compiler.
 */

function isClient(source) {
  return /^\s*(?:(?:\/\/[^\n]*\n\s*)|(?:\/\*[\s\S]*?\*\/\s*))*['"]use client['"]\s*;?/
    .test(source);
}

/*
 * Inventory direct process.env references.
 *
 * Supports:
 *   process.env.KEY
 *   process.env["KEY"]
 *   process.env['KEY']
 *
 * Dynamic or destructured references require
 * separate review.
 */

function refsIn(source) {
  const refs = new Set();

  const re =
    /\bprocess\s*\.\s*env\s*(?:\.\s*([A-Za-z_][A-Za-z0-9_]*)|\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\])/g;

  for (const m of source.matchAll(re)) {
    refs.add(
      m[1] ?? m[2]
    );
  }

  return refs;
}

/*
 * Inspect a LOCAL PostgreSQL URL's
 * username and host only.
 *
 * No database connection is attempted.
 * Passwords and URLs are never printed.
 */

function loopbackIdentity(raw) {
  if (!raw) {
    return null;
  }

  try {
    const u =
      new URL(raw);

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

    return decodeURIComponent(
      u.username
    );

  } catch {
    return null;
  }
}

/*
 * Read project files without modifying them.
 *
 * Scan source directories only.
 * Skip symbolic links.
 * Limit to 3,000 files / 1 MiB per file.
 *
 * Skipped source files cause a
 * NOT_VERIFIED completeness result.
 */

function readProject(root) {
  function read(rel) {
    try {
      return fs.readFileSync(
        path.join(root, rel),
        "utf8"
      );

    } catch (e) {
      if (e?.code === "ENOENT") {
        return null;
      }

      throw e;
    }
  }

  function exists(rel) {
    return fs.existsSync(
      path.join(root, rel)
    );
  }

  const source =
    new Map();

  let incomplete =
    false;

  const stack = [
    "src",
    "app",
    "pages",
    "components",
  ];

  const skip = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
    "coverage",
    ".turbo",
  ]);

  let scanned = 0;

  while (stack.length) {
    const rel =
      stack.pop();

    if (!exists(rel)) {
      continue;
    }

    const info =
      fs.lstatSync(
        path.join(root, rel)
      );

    if (
      !info.isDirectory() ||
      info.isSymbolicLink()
    ) {
      continue;
    }

    for (
      const ent of
      fs.readdirSync(
        path.join(root, rel),
        { withFileTypes: true }
      )
    ) {
      if (ent.isSymbolicLink()) {
        incomplete = true;
        continue;
      }

      const child =
        `${rel}/${ent.name}`;

      if (ent.isDirectory()) {
        if (!skip.has(ent.name)) {
          stack.push(child);
        }

      } else if (
        ent.isFile() &&
        /\.(?:ts|tsx|js|jsx|mjs|cjs)$/
          .test(ent.name)
      ) {
        scanned++;

        if (scanned > 3000) {
          incomplete = true;
          continue;
        }

        const stats =
          fs.statSync(
            path.join(root, child)
          );

        if (
          stats.size >
          1024 * 1024
        ) {
          incomplete = true;
          continue;
        }

        source.set(
          child,
          read(child)
        );
      }
    }
  }

  return {
    read,
    exists,
    source,
    incomplete,
  };
}

/*
 * 18 local security checks.
 *
 * No hosting or live infrastructure is
 * automatically certified.
 */

function inspect({
  read,
  exists,
  source,
  incomplete = false,
  shell = {},
}) {
  const env = new Map(
    ENV_FILES.map(
      (name) => [
        name,
        parseEnv(read(name)),
      ]
    )
  );

  const checks = [];

  function add(
    id,
    status,
    description,
    action = ""
  ) {
    checks.push({
      id,
      status,
      description,

      action:
        status === "PASS"
          ? ""
          : action,
    });
  }

  /* Collect declared environment names. */

  const assigned =
    new Map();

  for (
    const [file, values] of env
  ) {
    for (const key of values.keys()) {
      if (!assigned.has(key)) {
        assigned.set(
          key,
          new Set()
        );
      }

      assigned.get(key)
        .add(file);
    }
  }

  /* Collect source references. */

  const referenced =
    new Map();

  const clientRefs =
    new Set();

  const apiWorkerRefs =
    new Set();

  const clientImports = [];

  for (
    const [filename, body] of source
  ) {
    const refs =
      refsIn(body);

    for (const key of refs) {
      if (!referenced.has(key)) {
        referenced.set(
          key,
          new Set()
        );
      }

      referenced.get(key)
        .add(filename);

      if (isClient(body)) {
        clientRefs.add(key);
      }

      if (
        /\/(?:api|route)\//
          .test(filename) &&
        WORKER_HINT.test(key)
      ) {
        apiWorkerRefs.add(key);
      }
    }

    if (
      isClient(body) &&

      /(?:\bfrom\s*|\bimport\s*\()['"][^'"]*(?:quotation-email-worker|handoff-db|\/server\/|\/db\/)[^'"]*['"]/
        .test(body)
    ) {
      clientImports.push(
        filename
      );
    }
  }

  /* Build key-name-only inventory. */

  const names = new Set([
    ...assigned.keys(),
    ...referenced.keys(),
  ]);

  for (
    const key of
    Object.keys(shell)
  ) {
    if (
      FLAGS.includes(key) ||
      key.startsWith("NEXT_PUBLIC_")
    ) {
      names.add(key);
    }
  }

  const inventory =
    [...names]
      .sort()
      .map(
        (name) => ({
          name,

          scope:
            classification(name),

          files:
            [
              ...(
                assigned.get(name) ??
                []
              ),
            ].sort(),

          references:
            (
              referenced.get(name) ??
              new Set()
            ).size,

          source:
            Object.hasOwn(
              shell,
              name
            )
              ? "SHELL_PRESENT"
              : "NOT_OBSERVED_IN_SHELL",
        })
      );

  const local =
    env.get(".env.local");

  /* S01: Exact safety flags. */

  add(
    "S01",

    FLAGS.every(
      (n) =>
        local.get(n)?.length === 1 &&
        local.get(n)[0] === "false"
    )
      ? "PASS"
      : "FAIL",

    "All three .env.local feature switches explicitly false exactly once",

    "Review only the three protected switch names."
  );

  /* S02: No other dotenv override. */

  const otherFlagRisk =
    ENV_FILES.some(
      (file) =>
        file !== ".env.local" &&

        FLAGS.some(
          (n) => {
            const v =
              env.get(file).get(n) ??
              [];

            return (
              v.length > 1 ||
              v.some(
                (x) =>
                  x !== "false"
              )
            );
          }
        )
    );

  add(
    "S02",

    otherFlagRisk
      ? "FAIL"
      : "PASS",

    "Other dotenv files do not override protected switches unsafely"
  );

  /* S03: Process override. */

  add(
    "S03",

    FLAGS.some(
      (n) =>
        shell[n] !== undefined &&
        shell[n] !== "false"
    )
      ? "FAIL"
      : "PASS",

    "Current shell does not override protected switches unsafely"
  );

  /* S04: Production-mode resolution. */

  add(
    "S04",

    FLAGS.every(
      (n) =>
        effectiveFlag(
          n,
          "production",
          env,
          shell
        ) === "false"
    )
      ? "PASS"
      : "FAIL",

    "Local production-mode switch resolution remains false"
  );

  /* S05: Public-prefixed secret names. */

  const publicRisk =
    inventory.filter(
      (x) =>
        x.scope ===
          "UNSAFE_PUBLIC_NAME"
    );

  add(
    "S05",

    publicRisk.length
      ? "FAIL"
      : "PASS",

    "No obviously secret or protected NEXT_PUBLIC_ names",

    publicRisk
      .map(
        (x) => x.name
      )
      .join(", ")
  );

  /* S06: Client Component env boundary. */

  const clientSecret =
    [...clientRefs].filter(
      (key) =>
        [
          "WEB_SERVER_SECRET",
          "WORKER_ONLY_SECRET",
          "WORKER_ONLY_REVIEW",
          "PRIVATE_REVIEW",
          "SAFETY_SWITCH",
          "UNSAFE_PUBLIC_NAME",
        ].includes(
          classification(key)
        )
    );

  const clientUnknown =
    [...clientRefs].filter(
      (key) =>
        classification(key) ===
          "OTHER_REVIEW" &&
        key !== "NODE_ENV"
    );

  add(
    "S06",

    clientSecret.length
      ? "FAIL"
      : clientUnknown.length
        ? "NOT_VERIFIED"
        : "PASS",

    "No directly referenced private variables or safety switches in Client Components",

    [
      ...clientSecret,
      ...clientUnknown,
    ].join(", ")
  );

  /* S07: Client imports of worker code. */

  add(
    "S07",

    clientImports.length
      ? "FAIL"
      : "PASS",

    "No obvious protected worker/database imports in Client Components",

    clientImports.join(", ")
  );

  /* S08: next.config env injection. */

  const configFiles = [
    "next.config.ts",
    "next.config.js",
    "next.config.mjs",
  ];

  const configPresent =
    configFiles.filter(
      (f) =>
        /(?:^|[,{]\s*)env\s*:/m
          .test(read(f) ?? "")
    );

  add(
    "S08",

    configPresent.length
      ? "NOT_VERIFIED"
      : "PASS",

    "No obvious next.config env injection needing browser-bundle review",

    configPresent.join(", ")
  );

  /* S09: Git ignore heuristic. */

  const ignored =
    read(".gitignore");

  const ignoreRules =
    (ignored ?? "")
      .split(/\r?\n/)
      .map(
        (x) => x.trim()
      )
      .filter(
        (x) =>
          x &&
          !x.startsWith("#")
      );

  const protectedByIgnore =
    ignoreRules.some(
      (x) =>
        [
          ".env.local",
          ".env*",
          ".env*.local",
          "/.env.local",
          "/.env*",
        ].includes(x)
    ) &&

    !ignoreRules.some(
      (x) =>
        [
          "!.env.local",
          "!/.env.local",
        ].includes(x)
    );

  add(
    "S09",

    protectedByIgnore
      ? "PASS"
      : "NOT_VERIFIED",

    ".gitignore appears to protect .env.local (Git tracking requires separate check)"
  );

  /* S10: Local DB role separation. */

  const webId =
    loopbackIdentity(
      local.get(
        "DATABASE_URL"
      )?.at(-1)
    );

  const workerId =
    loopbackIdentity(
      local.get(
        "EMAIL_WORKER_DATABASE_URL"
      )?.at(-1)
    );

  const identities =
    (
      !local.has("DATABASE_URL") ||
      !local.has(
        "EMAIL_WORKER_DATABASE_URL"
      )
    )
      ? "NOT_VERIFIED"
      : (
        webId &&
        workerId &&
        workerId ===
          "bark_email_worker_service" &&
        webId !== workerId
      )
        ? "PASS"
        : "FAIL";

  add(
    "S10",

    identities,

    "Local website/worker PostgreSQL identities distinct and loopback-only",

    "Inspect URL hostnames and login usernames privately; do not share URLs."
  );

  /* S11: Worker credential in API routes. */

  add(
    "S11",

    apiWorkerRefs.size
      ? "FAIL"
      : "PASS",

    "No worker-only credential reference directly in API routes",

    [...apiWorkerRefs].join(", ")
  );

  /*
   * S12: Compare secret values in memory
   * across local and production dotenv.
   *
   * Never print compared values.
   * Real hosted secrets are not inspected.
   */

  const localSensitive =
    env.get(".env.local");

  const prodSensitive = [
    ".env.production",
    ".env.production.local",
  ];

  let duplicated = false;
  let compared = 0;

  for (
    const [name, values] of
    localSensitive
  ) {
    if (
      ![
        "WEB_SERVER_SECRET",
        "WORKER_ONLY_SECRET",
        "WORKER_ONLY_REVIEW",
        "PRIVATE_REVIEW",
      ].includes(
        classification(name)
      )
    ) {
      continue;
    }

    if (
      values.length !== 1 ||
      !values[0]
    ) {
      continue;
    }

    for (
      const file of
      prodSensitive
    ) {
      const remoteValues =
        env.get(file).get(name) ??
        [];

      if (remoteValues.length) {
        compared++;

        if (
          remoteValues.includes(
            values[0]
          )
        ) {
          duplicated = true;
        }
      }
    }
  }

  add(
    "S12",

    duplicated
      ? "FAIL"
      : compared
        ? "PASS"
        : "NOT_VERIFIED",

    "No identical credentials observed between local and production dotenv files",

    "Actual hosted credentials cannot be validated by this local audit."
  );

  /* S13: Unknown credential classifications. */

  const unexpected =
    inventory.filter(
      (x) =>
        [
          "PUBLIC_REVIEW",
          "PRIVATE_REVIEW",
          "WORKER_ONLY_REVIEW",
        ].includes(x.scope)
    );

  add(
    "S13",

    unexpected.length
      ? "NOT_VERIFIED"
      : "PASS",

    "Non-standard public/private credential names classified for manual review",

    unexpected
      .map(
        (x) => x.name
      )
      .join(", ")
  );

  /* S14: Previous audit scripts preserved. */

  const missing =
    PRIOR.filter(
      (f) => !exists(f)
    );

  add(
    "S14",

    missing.length
      ? "NOT_VERIFIED"
      : "PASS",

    "Files 63–68 readiness scripts retained",

    missing.join(", ")
  );

  /* S15: Source scan completeness. */

  add(
    "S15",

    incomplete
      ? "NOT_VERIFIED"
      : "PASS",

    "Supported source-tree scan completed within size and file limits",

    "Review skipped symbolic links, large files and dynamic imports manually."
  );

  /* S16: Restricted module imports. */

  const workerModules = [
    "src/lib/quotation-email-worker-handoff-db.ts",
    "src/lib/quotation-email-worker-handoff-coordinator.ts",
  ];

  add(
    "S16",

    workerModules.every(
      (f) =>
        /\bimport\s*['"]server-only['"]\s*;?/
          .test(read(f) ?? "")
    )
      ? "PASS"
      : "NOT_VERIFIED",

    "Restricted worker modules retain server-only imports"
  );

  /* S17: Production dotenv TLS. */

  const configPolicy =
    [
      ".env.production",
      ".env.production.local",
    ].some(
      (f) =>
        (
          env.get(f).get(
            "DATABASE_SSL_MODE"
          ) ?? []
        ).includes("disable")
    );

  add(
    "S17",

    configPolicy
      ? "FAIL"
      : "PASS",

    "No explicit TLS disable in production dotenv settings"
  );

  /* S18: Nonstandard staging dotenv. */

  add(
    "S18",

    read(".env.staging") !== null ||
    read(".env.staging.local") !== null
      ? "NOT_VERIFIED"
      : "PASS",

    "No assumed nonstandard .env.staging auto-loading"
  );

  return {
    checks,
    inventory,

    gates:
      GATES.map(
        (label, i) => ({
          id:
            `G${
              String(i + 1)
                .padStart(2, "0")
            }`,

          label,
          status: "NOT_VERIFIED",
        })
      ),

    stagingAuthorized:
      false,

    productionAuthorized:
      false,
  };
}

/*
 * Render privacy-safe results.
 *
 * Inventory shows KEY NAMES and counts only.
 * No dotenv or shell secret values.
 */

function formatReport(
  result,
  showInventory
) {
  const out = [
    "FILE 69 — OFFLINE SECRET INVENTORY AND BOUNDARY REVIEW",
  ];

  if (showInventory) {
    out.push(
      "INVENTORY — KEY NAMES ONLY (NEVER VALUES)"
    );

    for (
      const x of
      result.inventory
    ) {
      out.push(
        `${x.name} | ${x.scope} | dotenv: ${
          x.files.length
            ? x.files.join(",")
            : "none"
        } | source files: ${
          x.references
        } | ${x.source}`
      );
    }
  }

  for (
    const c of
    result.checks
  ) {
    out.push(
      `${c.id} [${c.status}] ${c.description}`
    );

    if (c.action) {
      out.push(
        `  REVIEW: ${c.action}`
      );
    }
  }

  const tally =
    (status) =>
      result.checks.filter(
        (c) =>
          c.status === status
      ).length;

  out.push(
    `LOCAL_SUMMARY: ${
      tally("PASS")
    } PASS, ${
      tally("FAIL")
    } FAIL, ${
      tally("NOT_VERIFIED")
    } NOT_VERIFIED`
  );

  out.push(
    "EXTERNAL EVIDENCE — ALL REQUIRE SEPARATE VERIFICATION"
  );

  for (
    const g of
    result.gates
  ) {
    out.push(
      `${g.id} [${g.status}] ${g.label}`
    );
  }

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

/*
 * Fictional test project.
 *
 * No test files or credentials are written
 * to disk. Example database URLs contain
 * fictional credentials.
 */

function fixture() {
  const f = new Map();

  f.set(
    ".env.local",

    FLAGS.map(
      (n) =>
        `${n}="false"`
    ).join("\n") +

    '\nDATABASE_URL="postgresql://web:fictional@127.0.0.1:5432/fictional"' +

    '\nEMAIL_WORKER_DATABASE_URL="postgresql://bark_email_worker_service:fictional@127.0.0.1:5432/fictional"'
  );

  f.set(
    ".gitignore",
    ".env*\n"
  );

  f.set(
    "src/components/QuoteForm.tsx",

    '"use client"; export function Form(){return null;}'
  );

  for (const p of PRIOR) {
    f.set(
      p,
      "fictional"
    );
  }

  for (
    const p of [
      "src/lib/quotation-email-worker-handoff-db.ts",
      "src/lib/quotation-email-worker-handoff-coordinator.ts",
    ]
  ) {
    f.set(
      p,
      'import "server-only";'
    );
  }

  return f;
}

function simulate(
  files,
  shell = {},
  incomplete = false
) {
  return inspect({
    read:
      (p) =>
        files.get(p) ?? null,

    exists:
      (p) =>
        files.has(p),

    source:
      new Map(
        [...files].filter(
          ([p]) =>
            /^(?:src|app|pages|components)\//
              .test(p) &&

            /\.(?:ts|tsx|js|jsx|mjs|cjs)$/
              .test(p)
        )
      ),

    shell,
    incomplete,
  });
}

/*
 * Thirty controlled, fictional self-tests.
 */

function selfTest() {
  let count = 0;

  const test =
    (label, fn) => {
      fn();

      console.log(
        `PASS ${++count}: ${label}`
      );
    };

  const s =
    (r, id) =>
      r.checks.find(
        (c) =>
          c.id === id
      )?.status;

  const edit =
    (change, shell = {}) => {
      const f = fixture();

      change(f);

      return simulate(
        f,
        shell
      );
    };

  test(
    "Fictional baseline has no local FAIL",
    () =>
      assert.equal(
        simulate(
          fixture()
        ).checks.filter(
          (x) =>
            x.status === "FAIL"
        ).length,
        0
      )
  );

  test(
    "Fictional baseline safety switches pass",
    () =>
      assert.equal(
        s(
          simulate(fixture()),
          "S01"
        ),
        "PASS"
      )
  );

  test(
    "Missing safety switch fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env.local",
                f.get(".env.local")
                  .replace(
                    `${FLAGS[0]}="false"`,
                    ""
                  )
              )
          ),
          "S01"
        ),
        "FAIL"
      )
  );

  test(
    "Enabled safety switch fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env.local",
                f.get(".env.local")
                  .replace(
                    '="false"',
                    '="true"'
                  )
              )
          ),
          "S01"
        ),
        "FAIL"
      )
  );

  test(
    "Duplicate safety switch fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env.local",
                f.get(".env.local") +
                  `\n${FLAGS[0]}=false`
              )
          ),
          "S01"
        ),
        "FAIL"
      )
  );

  test(
    "Production dotenv switch override fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env.production.local",
                `${FLAGS[1]}=true`
              )
          ),
          "S02"
        ),
        "FAIL"
      )
  );

  test(
    "Shell switch override fails",
    () =>
      assert.equal(
        s(
          simulate(
            fixture(),
            {
              [FLAGS[0]]: "true",
            }
          ),
          "S03"
        ),
        "FAIL"
      )
  );

  test(
    "Effective production switch override fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env.production.local",
                `${FLAGS[2]}=true`
              )
          ),
          "S04"
        ),
        "FAIL"
      )
  );

  test(
    "Turnstile site key stays public-safe",
    () =>
      assert.equal(
        classification(
          "NEXT_PUBLIC_TURNSTILE_SITE_KEY"
        ),
        "PUBLIC_SITE_KEY"
      )
  );

  test(
    "Turnstile secret classified website-private",
    () =>
      assert.equal(
        classification(
          "TURNSTILE_SECRET_KEY"
        ),
        "WEB_SERVER_SECRET"
      )
  );

  test(
    "Worker database credential classified worker-only",
    () =>
      assert.equal(
        classification(
          "EMAIL_WORKER_DATABASE_URL"
        ),
        "WORKER_ONLY_SECRET"
      )
  );

  test(
    "Public database password name fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env",
                "NEXT_PUBLIC_DATABASE_PASSWORD=fictional"
              )
          ),
          "S05"
        ),
        "FAIL"
      )
  );

  test(
    "Private env reference in Client Component fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                "src/components/QuoteForm.tsx",
                '"use client"; process.env.DATABASE_URL'
              )
          ),
          "S06"
        ),
        "FAIL"
      )
  );

  test(
    "Bracket env reference in Client Component fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                "src/components/QuoteForm.tsx",
                '"use client"; process.env["TURNSTILE_SECRET_KEY"]'
              )
          ),
          "S06"
        ),
        "FAIL"
      )
  );

  test(
    "Server-only worker import in Client Component fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                "src/components/QuoteForm.tsx",
                '"use client"; import x from "@/lib/quotation-email-worker-handoff-db"'
              )
          ),
          "S07"
        ),
        "FAIL"
      )
  );

  test(
    "Next config env field requires review",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                "next.config.ts",
                'export default {env:{KEY:"fictional"}}'
              )
          ),
          "S08"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Missing ignore rule requires review",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.delete(
                ".gitignore"
              )
          ),
          "S09"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Distinct local worker and website identities pass",
    () =>
      assert.equal(
        s(
          simulate(
            fixture()
          ),
          "S10"
        ),
        "PASS"
      )
  );

  test(
    "Shared database login fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env.local",
                f.get(".env.local")
                  .replace(
                    "bark_email_worker_service:fictional",
                    "web:fictional"
                  )
              )
          ),
          "S10"
        ),
        "FAIL"
      )
  );

  test(
    "Worker credential in API route fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                "src/app/api/quotations/route.ts",
                "export const x = process.env.EMAIL_WORKER_DATABASE_URL"
              )
          ),
          "S11"
        ),
        "FAIL"
      )
  );

  test(
    "Cross-environment duplicated credential fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env.production.local",
                'DATABASE_URL="postgresql://web:fictional@127.0.0.1:5432/fictional"'
              )
          ),
          "S12"
        ),
        "FAIL"
      )
  );

  test(
    "Unknown private credential name requires review",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env",
                "PAYMENT_PRIVATE_KEY=fictional"
              )
          ),
          "S13"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Missing prior review requires verification",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.delete(
                PRIOR[0]
              )
          ),
          "S14"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Partial source scan cannot be certified",
    () =>
      assert.equal(
        s(
          simulate(
            fixture(),
            {},
            true
          ),
          "S15"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Missing server-only boundary not certified",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                "src/lib/quotation-email-worker-handoff-db.ts",
                "export {}"
              )
          ),
          "S16"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Production dotenv TLS disable fails",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env.production",
                "DATABASE_SSL_MODE=disable"
              )
          ),
          "S17"
        ),
        "FAIL"
      )
  );

  test(
    "Nonstandard staging dotenv requires review",
    () =>
      assert.equal(
        s(
          edit(
            (f) =>
              f.set(
                ".env.staging",
                "X=1"
              )
          ),
          "S18"
        ),
        "NOT_VERIFIED"
      )
  );

  test(
    "Inventory includes keys but never credential values",
    () => {
      const f = fixture();

      f.set(
        ".env",
        "EMAIL_PROVIDER_API_KEY=FICTIONAL_PRIVATE_SENTINEL"
      );

      const output =
        formatReport(
          simulate(f),
          true
        );

      assert.ok(
        output.includes(
          "EMAIL_PROVIDER_API_KEY"
        )
      );

      assert.ok(
        !output.includes(
          "FICTIONAL_PRIVATE_SENTINEL"
        )
      );
    }
  );

  test(
    "All external gates remain unverified",
    () =>
      assert.ok(
        simulate(
          fixture()
        ).gates.every(
          (x) =>
            x.status ===
              "NOT_VERIFIED"
        )
      )
  );

  test(
    "Staging and production activation remain forbidden",
    () => {
      const r =
        simulate(
          fixture()
        );

      assert.equal(
        r.stagingAuthorized,
        false
      );

      assert.equal(
        r.productionAuthorized,
        false
      );

      assert.match(
        formatReport(
          r,
          false
        ),

        /PRODUCTION_ACTIVATION: NOT_AUTHORIZED/
      );
    }
  );

  console.log(
    `FILE 69 SELF-TEST: ${count}/30 PASSED`
  );

  console.log(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0"
  );
}

/*
 * Command line entrypoint.
 */

const arg =
  process.argv[2];

if (
  process.argv.length !== 3 ||

  ![
    "--self-test",
    "--inventory",
    "--audit",
  ].includes(arg)
) {
  console.error(
    "Usage: node scripts/quotation-secret-boundary-audit.mjs --self-test|--inventory|--audit"
  );

  process.exitCode = 2;

} else if (
  arg === "--self-test"
) {
  selfTest();

} else {
  const files =
    readProject(
      process.cwd()
    );

  const r =
    inspect({
      ...files,

      shell:
        process.env,
    });

  console.log(
    formatReport(
      r,
      arg === "--inventory"
    )
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

/*
 * END FILE 69
 *
 * No infrastructure activation.
 * No real quotations.
 * No real email delivery.
 * No production authorization.
 */
