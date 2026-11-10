
/**
 * BARK ORNAMENT — FILE 73
 * Customer-facing page and feature evidence audit (read-only).
 *
 * Run from C:\BarkProjects\bark-ornament-website:
 *   node scripts/quotation-customer-experience-audit.mjs --self-test
 *   node scripts/quotation-customer-experience-audit.mjs --routes
 *   node scripts/quotation-customer-experience-audit.mjs --audit
 *
 * This script does NOT change files, run Next.js, connect to any
 * network/database/provider, submit quotations or send emails.
 * Findings are evidence of files/patterns, NOT proof of UX quality.
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

const ROOTS = Object.freeze([
  "src/app", "app", "src/pages", "pages",
  "src/components", "components",
  "src/styles", "styles",
  "src/i18n", "i18n",
  "messages", "public",
]);

const CODE = /\.(?:tsx?|jsx?|mdx|css|scss)$/i;
const IMAGES = /\.(?:png|jpe?g|webp|avif|gif|svg)$/i;

const SKIP_DIR = new Set([
  "node_modules", ".next", ".git",
  "dist", "build", "coverage",
]);

const MAX_FILES = 4000;
const MAX_SOURCE_BYTES = 600 * 1024;

/* ======================================================
   1. NORMALIZE FILE PATHS

   Output uses project-relative paths.
   Environment values are never printed.
   ====================================================== */

function normalize(p) {
  return p
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

/* ======================================================
   2. DISCOVER NEXT.JS PAGE ROUTES

   Supports:
   - App Router
   - Pages Router
   - Route groups
   - Dynamic slug paths
   - Locale-prefixed pages

   Does not treat API route handlers
   as customer-facing pages.
   ====================================================== */

function routeForFile(relative) {
  const file = normalize(relative);
  const parts = file.split("/");

  const offset =
    parts[0] === "src" ? 1 : 0;

  if (
    !["app", "pages"].includes(
      parts[offset]
    )
  ) {
    return null;
  }

  const router = parts[offset];

  const pieces =
    parts.slice(offset + 1);

  const last =
    pieces.at(-1) ?? "";

  const folders =
    pieces.slice(0, -1);

  if (
    folders.some(
      (p) =>
        p.startsWith("_") ||
        p.startsWith("@") ||
        /^\(\.{1,3}\)/.test(p)
    )
  ) {
    return null;
  }

  if (router === "app") {
    if (
      !/^page\.(?:tsx?|jsx?|mdx)$/i.test(
        last
      )
    ) {
      return null;
    }

    const visible =
      folders.filter(
        (p) =>
          !/^\([^)]*\)$/.test(p)
      );

    return "/" + visible.join("/");
  }

  if (
    folders[0] === "api" ||
    /^_(?:app|document|error)\./.test(
      last
    )
  ) {
    return null;
  }

  if (
    !/\.(?:tsx?|jsx?|mdx)$/i.test(last)
  ) {
    return null;
  }

  const stem =
    last.replace(
      /\.(?:tsx?|jsx?|mdx)$/i,
      ""
    );

  return "/" + [
    ...folders,
    ...(
      stem === "index"
        ? []
        : [stem]
    ),
  ].join("/");
}

function visibleRoute(route) {
  const withoutLocale =
    route.replace(
      /^\/\[(?:locale|lang|language)\](?=\/|$)/i,
      ""
    );

  return withoutLocale || "/";
}

/* ======================================================
   3. READ SIMPLE DOTENV ASSIGNMENTS

   Used only to verify protected flags.

   This is not a complete dotenv parser.
   It does not resolve every possible
   custom loader or interpolation.

   Never prints secret values.
   ====================================================== */

function parseEnv(text) {
  const assignments = new Map();

  if (typeof text !== "string") {
    return assignments;
  }

  for (
    const line of text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
  ) {
    const m =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/
        .exec(line);

    if (!m) continue;

    const raw = m[2].trim();

    const q =
      /^(?:"([^"]*)"|'([^']*)')(?:\s*#.*)?$/
        .exec(raw);

    const value = q
      ? (q[1] ?? q[2])
      : raw
          .replace(/\s+#.*$/, "")
          .trim();

    assignments.set(
      m[1],
      [
        ...(assignments.get(m[1]) ?? []),
        value,
      ]
    );
  }

  return assignments;
}

/* ======================================================
   4. NEXT.JS ENVIRONMENT PRECEDENCE

   Priority:
   1. Process environment
   2. .env.<mode>.local
   3. .env.local (except test)
   4. .env.<mode>
   5. .env

   Only the three safety flags are resolved.
   ====================================================== */

function resolved(
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

  for (const nameOfFile of order) {
    const vals =
      maps.get(nameOfFile)
        ?.get(name) ?? [];

    if (vals.length) {
      return vals.at(-1);
    }
  }

  return undefined;
}

/* ======================================================
   5. VERIFY FEATURE SAFETY FLAGS

   No network or database operations.
   ====================================================== */

function flagChecks(read, shell) {
  const maps = new Map(
    ENV_FILES.map(
      (file) => [
        file,
        parseEnv(read(file)),
      ]
    )
  );

  const local =
    maps.get(".env.local");

  const checks = [];

  const add =
    (id, good, title) =>
      checks.push({
        id,
        status:
          good ? "PASS" : "FAIL",
        title,
      });

  add(
    "S01",

    FLAGS.every(
      (k) =>
        local.get(k)?.length === 1 &&
        local.get(k)[0] === "false"
    ),

    "All three .env.local flags are false exactly once"
  );

  add(
    "S02",

    ENV_FILES.filter(
      (f) => f !== ".env.local"
    ).every(
      (f) =>
        FLAGS.every(
          (k) => {
            const v =
              maps.get(f).get(k)
              ?? [];

            return (
              v.length <= 1 &&
              v.every(
                (x) => x === "false"
              )
            );
          }
        )
    ),

    "Other dotenv files do not enable or duplicate protected flags"
  );

  add(
    "S03",

    FLAGS.every(
      (k) =>
        shell[k] === undefined ||
        shell[k] === "false"
    ),

    "Current process has no unsafe flag overrides"
  );

  add(
    "S04",

    FLAGS.every(
      (k) =>
        resolved(
          k,
          "production",
          maps,
          shell
        ) === "false"
    ),

    "Effective local production-mode flags remain false"
  );

  return checks;
}

/* ======================================================
   6. READ-ONLY PROJECT SCANNER

   Scans named application directories.

   Skips symbolic links, oversized source
   files, generated build folders and
   backend API handler contents.

   At most 4000 files are inspected.
   ====================================================== */

function scan(root) {
  const paths = new Set();
  const sources = new Map();
  const issues = [];

  let seen = 0;

  const stack = [...ROOTS];

  while (stack.length) {
    const rel = stack.pop();
    const abs = path.join(root, rel);

    let info;

    try {
      info = fs.lstatSync(abs);

    } catch (e) {
      if (e.code !== "ENOENT") {
        issues.push("UNREADABLE_PATH");
      }

      continue;
    }

    if (info.isSymbolicLink()) {
      issues.push("SYMLINK_SKIPPED");
      continue;
    }

    if (!info.isDirectory()) {
      continue;
    }

    let entries;

    try {
      entries = fs.readdirSync(
        abs,
        { withFileTypes: true }
      );

    } catch {
      issues.push(
        "UNREADABLE_DIRECTORY"
      );

      continue;
    }

    for (const entry of entries) {
      if (
        SKIP_DIR.has(entry.name)
      ) {
        continue;
      }

      const child =
        normalize(
          path.posix.join(
            rel,
            entry.name
          )
        );

      if (entry.isSymbolicLink()) {
        issues.push(
          "SYMLINK_SKIPPED"
        );
        continue;
      }

      if (entry.isDirectory()) {
        stack.push(child);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (++seen > MAX_FILES) {
        issues.push(
          "FILE_LIMIT_REACHED"
        );
        continue;
      }

      paths.add(child);

      if (
        !CODE.test(child) ||
        /(?:^|\/)api\//.test(child)
      ) {
        continue;
      }

      let size;

      try {
        size = fs.statSync(
          path.join(root, child)
        ).size;

      } catch {
        issues.push(
          "UNREADABLE_SOURCE"
        );
        continue;
      }

      if (
        size > MAX_SOURCE_BYTES
      ) {
        issues.push(
          "LARGE_SOURCE_SKIPPED"
        );
        continue;
      }

      try {
        sources.set(
          child,
          fs.readFileSync(
            path.join(root, child),
            "utf8"
          )
        );

      } catch {
        issues.push(
          "UNREADABLE_SOURCE"
        );
      }
    }
  }

  /* Root-level config and middleware */

  for (
    const p of [
      "next.config.ts",
      "next.config.js",
      "next.config.mjs",
      "next.config.cjs",
      "middleware.ts",
      "src/middleware.ts",
    ]
  ) {
    try {
      if (
        fs.statSync(
          path.join(root, p)
        ).size <= MAX_SOURCE_BYTES
      ) {
        paths.add(p);

        sources.set(
          p,
          fs.readFileSync(
            path.join(root, p),
            "utf8"
          )
        );

      } else {
        issues.push(
          "LARGE_SOURCE_SKIPPED"
        );
      }

    } catch (e) {
      if (e.code !== "ENOENT") {
        issues.push(
          "UNREADABLE_SOURCE"
        );
      }
    }
  }

  const read =
    (name) => {
      try {
        return fs.readFileSync(
          path.join(root, name),
          "utf8"
        );

      } catch (e) {
        if (e.code === "ENOENT") {
          return null;
        }

        throw e;
      }
    };

  return {
    paths,
    sources,

    issues:
      [...new Set(issues)],

    read,

    shell:
      process.env,
  };
}

/* ======================================================
   7. COLLECT EVIDENCE FOR 25 FEATURES

   No feature is automatically declared
   production-ready by this static scan.

   ROUTE_FOUND:
     Matching page route exists.

   SOURCE_SIGNAL:
     Related source pattern exists.

   ASSET_FILES_FOUND:
     Matching public image exists.

   NOT_FOUND:
     No matching evidence in scan scope.
   ====================================================== */

function evidence(model) {
  const paths =
    [...model.paths].sort();

  const routes =
    [
      ...new Set(
        paths
          .map(routeForFile)
          .filter(
            (p) => p !== null
          )
      ),
    ].sort();

  const normRoutes =
    routes.map(
      (path) => ({
        path,
        norm:
          visibleRoute(path),
      })
    );

  const src =
    [...model.sources.entries()];

  const findRoute =
    (predicate) =>
      normRoutes
        .filter(
          (x) =>
            predicate(x.norm)
        )
        .map(
          (x) => x.path
        );

  const findCode =
    (pattern, max = 3) =>
      src
        .filter(
          ([, text]) =>
            pattern.test(text)
        )
        .map(
          ([name]) => name
        )
        .slice(0, max);

  const findFiles =
    (pattern, max = 3) =>
      paths
        .filter(
          (p) =>
            pattern.test(p)
        )
        .slice(0, max);

  const features = [];

  const feature =
    (
      id,
      label,
      kind,
      found
    ) =>
      features.push({
        id,
        label,

        status:
          found.length
            ? kind
            : "NOT_FOUND",

        examples:
          found.slice(0, 3),
      });

  /* Customer-facing pages */

  feature(
    "F01",
    "Home page",
    "ROUTE_FOUND",
    findRoute(
      (p) => p === "/"
    )
  );

  feature(
    "F02",
    "Product catalogue",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:products|catalogue|catalog|shop)$/
          .test(p)
    )
  );

  feature(
    "F03",
    "Individual product pages",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:products|catalogue|catalog|shop)\/\[[^/]+\]$/
          .test(p)
    )
  );

  feature(
    "F04",
    "Category landing page",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:categories|product-categories)$/
          .test(p)
    )
  );

  feature(
    "F05",
    "Category detail pages",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:categories|product-categories|category)\/\[[^/]+\]$/
          .test(p)
    )
  );

  feature(
    "F06",
    "Request quotation page",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:request-quotation|request-a-quotation|request-quote|quote|quotation|request-for-quotation|rfq)$/
          .test(p)
    )
  );

  feature(
    "F07",
    "Gallery / portfolio page",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:gallery|portfolio|our-work)$/
          .test(p)
    )
  );

  feature(
    "F08",
    "Markets landing page",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:markets|destinations)$/
          .test(p)
    )
  );

  feature(
    "F09",
    "Market-specific pages",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:markets|destinations)\/(?:\[[^/]+\]|maldives|seychelles|sri-lanka|mauritius|fiji)$/
          .test(p)
    )
  );

  feature(
    "F10",
    "About / company story page",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:about|about-us|our-story|company)$/
          .test(p)
    )
  );

  feature(
    "F11",
    "Contact page",
    "ROUTE_FOUND",
    findRoute(
      (p) =>
        /^\/(?:contact|contact-us|enquiry|inquiry)$/
          .test(p)
    )
  );

  /* Catalogue interactions */

  feature(
    "F12",
    "Catalogue search implementation",
    "SOURCE_SIGNAL",
    findCode(
      /\b(?:searchParams|useSearchParams|searchQuery|searchTerm|setSearchQuery)\b/i
    )
  );

  feature(
    "F13",
    "Product filters",
    "SOURCE_SIGNAL",
    findCode(
      /\b(?:filterProducts|selectedFilters|activeFilters|setFilter|filterBy|categoryFilter)\b/i
    )
  );

  feature(
    "F14",
    "Catalogue sorting",
    "SOURCE_SIGNAL",
    findCode(
      /\b(?:sortBy|sortOrder|sortProducts|selectedSort|setSort)\b/i
    )
  );

  feature(
    "F15",
    "Quote basket interaction",
    "SOURCE_SIGNAL",
    findCode(
      /\b(?:quoteBasket|quotationBasket|addToQuote|quoteItems|quoteCart)\b/i
    )
  );

  /* Language and accessibility */

  const localeRoutes =
    routes.filter(
      (p) =>
        /^\/\[(?:locale|lang|language)\](?:\/|$)/i
          .test(p)
    );

  const i18nFiles =
    findFiles(
      /(?:^|\/)(?:i18n|messages|locales|translations)(?:\/|\.)/i
    );

  feature(
    "F16",
    "Multilingual structure",
    "SOURCE_SIGNAL",
    [
      ...localeRoutes,
      ...i18nFiles,
    ].slice(0, 3)
  );

  feature(
    "F17",
    "Responsive layout evidence",
    "SOURCE_SIGNAL",
    findCode(
      /@media\s*\(|\b(?:sm|md|lg|xl|2xl):[\w\[!-]/
    )
  );

  feature(
    "F18",
    "Reduced-motion support",
    "SOURCE_SIGNAL",
    findCode(
      /prefers-reduced-motion|motion-reduce:|useReducedMotion|reducedMotion/i
    )
  );

  feature(
    "F19",
    "Subtle transition / animation patterns",
    "SOURCE_SIGNAL",
    findCode(
      /@keyframes|\btransition(?:-[a-z]+)?:|\banimation(?:-[a-z]+)?:|\banimate(?:-[a-z]+)?:|\b(?:motion\.|framer-motion)/i
    )
  );

  feature(
    "F20",
    "Accessibility markup evidence",
    "SOURCE_SIGNAL",
    findCode(
      /aria-[\w-]+\s*=|\bhtmlFor\s*=|\balt\s*=|\bonKeyDown\s*=/
    )
  );

  /* SEO and site structure */

  feature(
    "F21",
    "SEO metadata / sitemap evidence",
    "SOURCE_SIGNAL",
    [
      ...findFiles(
        /(?:^|\/)(?:sitemap|robots)\.(?:tsx?|jsx?)$/i
      ),

      ...findCode(
        /(?:\bgenerateMetadata\b|\bmetadata\s*[:=])/,
        2
      ),
    ].slice(0, 3)
  );

  feature(
    "F22",
    "Header and footer implementation",
    "SOURCE_SIGNAL",
    [
      ...findFiles(
        /(?:^|\/)(?:header|footer|site-header|site-footer)\.(?:tsx|jsx)$/i
      ),

      ...findCode(
        /<header\b|<footer\b/i,
        2
      ),
    ].slice(0, 3)
  );

  /* Images and brand design */

  feature(
    "F23",
    "Public product / portfolio images",
    "ASSET_FILES_FOUND",
    findFiles(
      /^public\/(?:.*\/)?[^/]+\.(?:png|jpe?g|webp|avif)$/i
    )
  );

  feature(
    "F24",
    "Golden Coastal palette signals",
    "SOURCE_SIGNAL",
    findCode(
      /\b(?:gold|golden|amber|orange|ivory|sand|espresso|ochre|terracotta)\b|(?:bg|text|from|to)-(?:amber|orange)-|--(?:color-)?(?:gold|orange|sand|ivory|espresso)/i
    )
  );

  feature(
    "F25",
    "Optimized image usage signals",
    "SOURCE_SIGNAL",
    findCode(
      /\bnext\/image\b|<Image\b|\bimagesrcset\b/i
    )
  );

  return {
    routes,
    features,

    mediaCount:
      paths.filter(
        (p) =>
          p.startsWith("public/") &&
          IMAGES.test(p)
      ).length,
  };
}

/* ======================================================
   8. COMBINE CUSTOMER-FACING AUDIT

   All infrastructure approval gates
   remain closed.
   ====================================================== */

function inspect(model) {
  return {
    ...evidence(model),

    safety:
      flagChecks(
        model.read,
        model.shell ?? {}
      ),

    scanIssues:
      model.issues ?? [],

    stagingAuthorized:
      false,

    productionAuthorized:
      false,
  };
}

/* ======================================================
   9. FORMAT PRIVACY-SAFE REPORT

   Prints route paths and evidence filenames,
   not source contents or secret values.
   ====================================================== */

function format(result) {
  const lines = [
    "FILE 73 - CUSTOMER-FACING WEBSITE EVIDENCE AUDIT",

    "DEFINITION: ROUTE_FOUND / SOURCE_SIGNAL / ASSET_FILES_FOUND means evidence only, NOT feature completion.",

    `ROUTES_DISCOVERED: ${result.routes.length}`,
  ];

  for (
    const f of result.features
  ) {
    lines.push(
      `${f.id} [${f.status}] ${f.label}${
        f.examples.length
          ? " | " + f.examples.join(", ")
          : ""
      }`
    );
  }

  const count =
    (status) =>
      result.features.filter(
        (f) =>
          f.status === status
      ).length;

  lines.push(
    `FEATURE_SUMMARY: ${
      count("ROUTE_FOUND")
    } ROUTE_FOUND, ${
      count("SOURCE_SIGNAL")
    } SOURCE_SIGNAL, ${
      count("ASSET_FILES_FOUND")
    } ASSET_FILES_FOUND, ${
      count("NOT_FOUND")
    } NOT_FOUND`
  );

  lines.push(
    `PUBLIC_IMAGE_FILES_DISCOVERED: ${
      result.mediaCount
    }`
  );

  for (
    const s of result.safety
  ) {
    lines.push(
      `${s.id} [${s.status}] ${s.title}`
    );
  }

  lines.push(
    `SAFETY_SUMMARY: ${
      result.safety.filter(
        (s) =>
          s.status === "PASS"
      ).length
    }/4 PASS`
  );

  lines.push(
    `SCAN_COMPLETENESS: ${
      result.scanIssues.length
        ? "REVIEW_REQUIRED (" +
          result.scanIssues.join(", ") +
          ")"
        : "COMPLETE_WITHIN_STATIC_SCOPE"
    }`
  );

  const missing =
    result.features
      .filter(
        (f) =>
          f.status === "NOT_FOUND"
      )
      .map(
        (f) => f.id
      );

  lines.push(
    `NEXT_REVIEW_CANDIDATES: ${
      missing.length
        ? missing.join(", ")
        : "NONE_DETECTED"
    }`
  );

  lines.push(
    "UX_VISUAL_QA: NOT_VERIFIED"
  );

  lines.push(
    "FUNCTIONAL_BROWSER_TESTS: NOT_VERIFIED"
  );

  lines.push(
    "HOSTED_STAGING_EVIDENCE: NOT_VERIFIED"
  );

  lines.push(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

  lines.push(
    "PRODUCTION_ACTIVATION: NOT_AUTHORIZED"
  );

  lines.push(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0; FILE_WRITES: 0"
  );

  return lines.join("\n");
}

/* ======================================================
   10. FICTIONAL IN-MEMORY WEBSITE

   Used by self-tests only.

   No files or database records created.
   ====================================================== */

function fake(overrides = {}) {
  const paths = new Set([
    "src/app/page.tsx",
    "src/app/products/page.tsx",
    "src/app/products/[slug]/page.tsx",
    "src/app/categories/page.tsx",
    "src/app/request-quotation/page.tsx",
    "src/app/layout.tsx",
    "src/app/globals.css",
    "src/components/Catalogue.tsx",
    "public/products/menu.webp",
  ]);

  const sources = new Map([
    [
      "src/app/page.tsx",

      "export default function Home(){ return <main>Home</main>; }",
    ],

    [
      "src/app/layout.tsx",

      'export const metadata = { title: "Bark" }; export default function Layout(){return <><header /><footer /></>}',
    ],

    [
      "src/app/globals.css",

      "@media (max-width: 600px) { body {} } @media (prefers-reduced-motion: reduce) { * { animation: none; } } :root { --color-gold: #c6a04f; }",
    ],

    [
      "src/components/Catalogue.tsx",

      '"use client"; import Image from "next/image"; const searchParams = 1; const selectedFilters = []; const sortBy = "name"; const addToQuote = () => {}; return <Image alt="product" />;',
    ],
  ]);

  const env = new Map([
    [
      ".env.local",

      FLAGS.map(
        (k) =>
          `${k}="false"`
      ).join("\n"),
    ],
  ]);

  return {
    paths,
    sources,
    issues: [],

    read:
      (p) =>
        env.get(p) ?? null,

    shell: {},
    env,
    ...overrides,
  };
}

/* ======================================================
   11. FORTY-THREE AUTOMATED SELF-TESTS

   All test scenarios are fictional and
   use in-memory project structures.
   ====================================================== */

function selfTest() {
  let passed = 0;

  const test =
    (name, fn) => {
      fn();

      console.log(
        `PASS ${++passed}: ${name}`
      );
    };

  const feature =
    (m, id) =>
      evidence(m).features.find(
        (f) =>
          f.id === id
      );

  const edited =
    (mutate) => {
      const m = fake();

      mutate(m);

      return m;
    };

  test(
    "Fictional home route detected",
    () =>
      assert.equal(
        feature(fake(), "F01").status,
        "ROUTE_FOUND"
      )
  );

  test(
    "Fictional catalogue route detected",
    () =>
      assert.equal(
        feature(fake(), "F02").status,
        "ROUTE_FOUND"
      )
  );

  test(
    "Fictional product detail route detected",
    () =>
      assert.equal(
        feature(fake(), "F03").status,
        "ROUTE_FOUND"
      )
  );

  test(
    "Fictional category landing route detected",
    () =>
      assert.equal(
        feature(fake(), "F04").status,
        "ROUTE_FOUND"
      )
  );

  test(
    "Missing category detail route remains NOT_FOUND",
    () =>
      assert.equal(
        feature(fake(), "F05").status,
        "NOT_FOUND"
      )
  );

  test(
    "Quotation route evidence detected",
    () =>
      assert.equal(
        feature(fake(), "F06").status,
        "ROUTE_FOUND"
      )
  );

  test(
    "Missing gallery route remains NOT_FOUND",
    () =>
      assert.equal(
        feature(fake(), "F07").status,
        "NOT_FOUND"
      )
  );

  test(
    "Missing markets landing remains NOT_FOUND",
    () =>
      assert.equal(
        feature(fake(), "F08").status,
        "NOT_FOUND"
      )
  );

  test(
    "Market-specific route detected",
    () =>
      assert.equal(
        feature(
          edited(
            (m) =>
              m.paths.add(
                "src/app/markets/[slug]/page.tsx"
              )
          ),
          "F09"
        ).status,
        "ROUTE_FOUND"
      )
  );

  test(
    "About route detected when present",
    () =>
      assert.equal(
        feature(
          edited(
            (m) =>
              m.paths.add(
                "src/app/about/page.tsx"
              )
          ),
          "F10"
        ).status,
        "ROUTE_FOUND"
      )
  );

  test(
    "Contact route detected when present",
    () =>
      assert.equal(
        feature(
          edited(
            (m) =>
              m.paths.add(
                "src/app/contact/page.tsx"
              )
          ),
          "F11"
        ).status,
        "ROUTE_FOUND"
      )
  );

  test(
    "Search source evidence detected",
    () =>
      assert.equal(
        feature(fake(), "F12").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Filter source evidence detected",
    () =>
      assert.equal(
        feature(fake(), "F13").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Sorting source evidence detected",
    () =>
      assert.equal(
        feature(fake(), "F14").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Quote basket source evidence detected",
    () =>
      assert.equal(
        feature(fake(), "F15").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Multilingual absent without routes or resources",
    () =>
      assert.equal(
        feature(fake(), "F16").status,
        "NOT_FOUND"
      )
  );

  test(
    "Multilingual locale route evidence detected",
    () =>
      assert.equal(
        feature(
          edited(
            (m) =>
              m.paths.add(
                "src/app/[locale]/page.tsx"
              )
          ),
          "F16"
        ).status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Responsive media query detected",
    () =>
      assert.equal(
        feature(fake(), "F17").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Reduced motion media query detected",
    () =>
      assert.equal(
        feature(fake(), "F18").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Animation CSS pattern detected",
    () =>
      assert.equal(
        feature(fake(), "F19").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Accessibility markup detected",
    () =>
      assert.equal(
        feature(fake(), "F20").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "SEO metadata detected",
    () =>
      assert.equal(
        feature(fake(), "F21").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Header/footer evidence detected",
    () =>
      assert.equal(
        feature(fake(), "F22").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Public image presence does not certify photo quality",
    () =>
      assert.equal(
        feature(fake(), "F23").status,
        "ASSET_FILES_FOUND"
      )
  );

  test(
    "Golden Coastal palette token found",
    () =>
      assert.equal(
        feature(fake(), "F24").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "Image optimization signal found",
    () =>
      assert.equal(
        feature(fake(), "F25").status,
        "SOURCE_SIGNAL"
      )
  );

  test(
    "App route group excluded from URL",
    () =>
      assert.equal(
        routeForFile(
          "src/app/(marketing)/gallery/page.tsx"
        ),
        "/gallery"
      )
  );

  test(
    "Locale route retained",
    () =>
      assert.equal(
        visibleRoute(
          "/[locale]/markets"
        ),
        "/markets"
      )
  );

  test(
    "Pages router index normalized",
    () =>
      assert.equal(
        routeForFile(
          "pages/index.tsx"
        ),
        "/"
      )
  );

  test(
    "Pages router direct path normalized",
    () =>
      assert.equal(
        routeForFile(
          "src/pages/contact.tsx"
        ),
        "/contact"
      )
  );

  test(
    "API routes are not public pages",
    () =>
      assert.equal(
        routeForFile(
          "src/pages/api/quote.ts"
        ),
        null
      )
  );

  test(
    "App route handlers are not public pages",
    () =>
      assert.equal(
        routeForFile(
          "src/app/api/quote/route.ts"
        ),
        null
      )
  );

  test(
    "Private app folder ignored",
    () =>
      assert.equal(
        routeForFile(
          "src/app/_internal/page.tsx"
        ),
        null
      )
  );

  test(
    "Parallel route ignored",
    () =>
      assert.equal(
        routeForFile(
          "src/app/@modal/page.tsx"
        ),
        null
      )
  );

  test(
    "Protected local switches PASS",
    () =>
      assert.ok(
        flagChecks(
          fake().read,
          {}
        ).every(
          (s) =>
            s.status === "PASS"
        )
      )
  );

  test(
    "Enabled local flag FAIL",
    () => {
      const m = fake();

      m.env.set(
        ".env.local",

        `${FLAGS[0]}=true\n${FLAGS[1]}=false\n${FLAGS[2]}=false`
      );

      assert.equal(
        flagChecks(
          m.read,
          {}
        )[0].status,
        "FAIL"
      );
    }
  );

  test(
    "Duplicate local flag FAIL",
    () => {
      const m = fake();

      m.env.set(
        ".env.local",

        m.env.get(
          ".env.local"
        ) +
        `\n${FLAGS[0]}=false`
      );

      assert.equal(
        flagChecks(
          m.read,
          {}
        )[0].status,
        "FAIL"
      );
    }
  );

  test(
    "Unsafe production dotenv override FAIL",
    () => {
      const m = fake();

      m.env.set(
        ".env.production.local",

        `${FLAGS[1]}=true`
      );

      assert.equal(
        flagChecks(
          m.read,
          {}
        )[1].status,
        "FAIL"
      );
    }
  );

  test(
    "Unsafe shell override FAIL",
    () =>
      assert.equal(
        flagChecks(
          fake().read,
          {
            [FLAGS[0]]:
              "true",
          }
        )[2].status,
        "FAIL"
      )
  );

  test(
    "Effective production flags FAIL on override",
    () =>
      assert.equal(
        flagChecks(
          fake().read,
          {
            [FLAGS[1]]:
              "true",
          }
        )[3].status,
        "FAIL"
      )
  );

  test(
    "Output does not print fictional environment secrets",
    () => {
      const m = fake();

      m.env.set(
        ".env",

        "DATABASE_URL=PRIVATE_SENTINEL"
      );

      assert.ok(
        !format(
          inspect(m)
        ).includes(
          "PRIVATE_SENTINEL"
        )
      );
    }
  );

  test(
    "All outputs explicitly block activation",
    () => {
      const r =
        inspect(fake());

      assert.equal(
        r.stagingAuthorized,
        false
      );

      assert.match(
        format(r),
        /PRODUCTION_ACTIVATION: NOT_AUTHORIZED/
      );
    }
  );

  test(
    "Incomplete scan never presented as complete",
    () =>
      assert.match(
        format(
          inspect(
            fake({
              issues: [
                "FILE_LIMIT_REACHED",
              ],
            })
          )
        ),
        /SCAN_COMPLETENESS: REVIEW_REQUIRED/
      )
  );

  console.log(
    `FILE 73 SELF-TEST: ${passed}/43 PASSED`
  );

  console.log(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0; FILE_WRITES: 0"
  );
}

/* ======================================================
   12. COMMAND-LINE ENTRYPOINT

   --self-test:
      Fictional security and feature tests.

   --routes:
      List discovered Next.js page routes.

   --audit:
      Scan feature evidence and local flags.

   No command starts a server or
   authorizes staging/production.
   ====================================================== */

const args =
  process.argv.slice(2);

if (
  args.length !== 1 ||
  ![
    "--self-test",
    "--routes",
    "--audit",
  ].includes(
    args[0]
  )
) {
  console.error(
    "Usage: node scripts/quotation-customer-experience-audit.mjs --self-test|--routes|--audit"
  );

  process.exitCode = 2;

} else if (
  args[0] === "--self-test"
) {
  selfTest();

} else {
  const model =
    scan(
      process.cwd()
    );

  const result =
    inspect(model);

  if (
    args[0] === "--routes"
  ) {
    console.log(
      "FILE 73 - ROUTE INVENTORY (STATIC FILE SYSTEM EVIDENCE ONLY)"
    );

    for (
      const route of
      result.routes
    ) {
      console.log(route);
    }

    console.log(
      `ROUTES_DISCOVERED: ${result.routes.length}`
    );

    console.log(
      "BROWSER_ROUTING: NOT_VERIFIED"
    );

  } else {
    console.log(
      format(result)
    );

    if (
      result.safety.some(
        (s) =>
          s.status === "FAIL"
      ) ||
      result.scanIssues.length
    ) {
      process.exitCode = 1;
    }
  }
}

/*
=======================================================
END FILE 73

NO EXISTING WEBSITE FILE MODIFICATIONS.
NO DATABASE WRITES.
NO QUOTATION SUBMISSIONS.
NO REAL EMAIL DELIVERY.
NO DEPLOYMENT AUTHORIZATION.
=======================================================
*/
