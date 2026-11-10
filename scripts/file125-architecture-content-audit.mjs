/**
 * BARK ORNAMENT — FILE 125
 * Architecture, CMS, PostgreSQL and SEO Gap Audit
 *
 * Usage:
 * node scripts/file125-architecture-content-audit.mjs --audit
 *
 * READ ONLY:
 * - Does not execute application modules
 * - Does not read .env files
 * - Does not print credentials
 * - Does not connect to PostgreSQL
 * - Does not make HTTP requests
 * - Does not modify source files
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

if (
  process.argv.length !== 3 ||
  process.argv[2] !== "--audit"
) {
  console.error(
    "Usage: node scripts/file125-architecture-content-audit.mjs --audit"
  );
  process.exit(2);
}

const root = process.cwd();
const srcRoot = path.join(root, "src");
const files = new Map();
const dependencies = new Map();

let passed = 0;
let failed = 0;
let reviews = 0;

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function pass(condition, id, message) {
  const ok = Boolean(condition);
  console.log(`${ok ? "PASS" : "FAIL"} ${id}: ${message}`);
  if (ok) passed++;
  else failed++;
}

function review(id, message) {
  console.log(`REVIEW ${id}: ${message}`);
  reviews++;
}

function regularFile(file) {
  try {
    const stat = fs.lstatSync(file);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function walk(directory) {
  if (!fs.existsSync(directory)) return;

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    const full = path.join(directory, entry.name);

    if (
      entry.isDirectory() &&
      !entry.isSymbolicLink()
    ) {
      walk(full);
      continue;
    }

    if (
      !entry.isFile() ||
      !/\.(tsx?|jsx?|mjs|cjs)$/.test(entry.name) ||
      entry.name.endsWith(".d.ts")
    ) {
      continue;
    }

    files.set(
      full,
      fs.readFileSync(full, "utf8")
    );
  }
}

console.log("FILE_125: ARCHITECTURE_CONTENT_AUDIT");
console.log("MODE: READ_ONLY | STATIC_SOURCE_INSPECTION");
console.log(`PROJECT_ROOT: ${root}`);

walk(srcRoot);

pass(
  files.size > 0,
  "A01",
  `Source files discovered: ${files.size}`
);

/* ==========================================
   PACKAGE DEPENDENCIES
   ========================================== */

const packagePath = path.join(root, "package.json");
let packageData = null;

try {
  packageData = JSON.parse(
    fs.readFileSync(packagePath, "utf8")
  );
} catch {
  // Reported below.
}

pass(
  packageData !== null,
  "A02",
  "package.json readable"
);

const installed = {
  ...packageData?.dependencies,
  ...packageData?.devDependencies,
};

const cmsPattern =
  /^(?:sanity|next-sanity|@sanity\/|payload|@payloadcms\/|@strapi\/|contentful|@contentful\/|@prismicio\/|@directus\/|@keystone-6\/)/i;

const dbPattern =
  /^(?:pg|pg-pool|postgres|prisma|@prisma\/client|drizzle-orm|@vercel\/postgres|@neondatabase\/serverless|kysely)$/i;

const cmsPackages = Object.keys(installed).filter(
  (name) => cmsPattern.test(name)
);

const dbPackages = Object.keys(installed).filter(
  (name) => dbPattern.test(name)
);

console.log("\n=== PACKAGE INVENTORY ===");
console.log(
  `FRAMEWORK: next=${installed.next ?? "unknown"}`
);
console.log(
  `CMS_PACKAGES: ${cmsPackages.join(", ") || "none detected"}`
);
console.log(
  `DATABASE_PACKAGES: ${dbPackages.join(", ") || "none detected"}`
);

/* ==========================================
   PARSE IMPORTS AND MODULE GRAPH
   ========================================== */

const extensions = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

function resolveLocal(fromFile, specifier) {
  let target;

  if (specifier.startsWith("@/")) {
    target = path.join(
      srcRoot,
      specifier.slice(2)
    );
  } else if (specifier.startsWith(".")) {
    target = path.resolve(
      path.dirname(fromFile),
      specifier
    );
  } else {
    return null;
  }

  const candidates = [
    target,
    ...extensions.map((ext) => target + ext),
    ...extensions.map((ext) => path.join(target, "index" + ext)),
  ];

  return candidates.find(
    (file) => files.has(file)
  ) ?? null;
}

const sourceImports = new Map();
const dynamicReview = new Set();

for (const [file, source] of files) {
  const scriptKind =
    /\.tsx$|\.jsx$/.test(file)
      ? ts.ScriptKind.TSX
      : /\.ts$/.test(file)
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;

  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  if (ast.parseDiagnostics.length) {
    review(
      "SOURCE_PARSE",
      `${rel(file)} has syntax diagnostics`
    );
  }

  const refs = new Set();

  function visit(node) {
    if (
      (
        ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node)
      ) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      refs.add(node.moduleSpecifier.text);
    }

    if (ts.isCallExpression(node)) {
      const isRequire =
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require";

      const isDynamicImport =
        node.expression.kind ===
        ts.SyntaxKind.ImportKeyword;

      if (isRequire || isDynamicImport) {
        const argument = node.arguments[0];

        if (
          argument &&
          ts.isStringLiteral(argument)
        ) {
          refs.add(argument.text);
        } else {
          dynamicReview.add(file);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(ast);

  sourceImports.set(file, [...refs]);
  dependencies.set(
    file,
    [...refs]
      .map((specifier) =>
        resolveLocal(file, specifier)
      )
      .filter(Boolean)
  );
}

/* ==========================================
   CMS / DATABASE EVIDENCE
   ========================================== */

function hasCmsEvidence(file) {
  const imports = sourceImports.get(file) ?? [];

  return (
    imports.some((name) => cmsPattern.test(name)) ||
    /(?:^|\/)(?:sanity|studio|payload|strapi|cms)(?:\/|\.|$)/i.test(
      rel(file)
    )
  );
}

function hasDbEvidence(file) {
  const imports = sourceImports.get(file) ?? [];
  const source = files.get(file) ?? "";

  return (
    imports.some((name) => dbPattern.test(name)) ||
    /(?:^|\/)(?:db|database)(?:\/|\.|$)/i.test(
      rel(file)
    ) ||
    /\b(?:DATABASE_URL|POSTGRES_URL|PGHOST|POSTGRES_PRISMA_URL)\b/.test(
      source
    ) ||
    /\b(?:new\s+PrismaClient|new\s+Pool)\s*\(/.test(
      source
    )
  );
}

const cmsSources = [...files.keys()].filter(
  hasCmsEvidence
);

const dbSources = [...files.keys()].filter(
  hasDbEvidence
);

const cmsConfigs = [
  "sanity.config.ts",
  "sanity.config.js",
  "sanity.cli.ts",
  "sanity.cli.js",
  "src/sanity.config.ts",
  "src/sanity/schemaTypes/index.ts",
].filter((name) =>
  regularFile(path.join(root, name))
);

console.log("\n=== CMS EVIDENCE ===");
console.log(
  `CMS_CONFIG_FILES: ${cmsConfigs.length}`
);
console.log(
  `CMS_SOURCE_MARKERS: ${cmsSources.length}`
);

for (const file of cmsConfigs) {
  console.log(`CMS_CONFIG: ${file}`);
}

for (const file of cmsSources.slice(0, 30)) {
  console.log(`CMS_SOURCE: ${rel(file)}`);
}

if (
  cmsPackages.length === 0 &&
  cmsConfigs.length === 0 &&
  cmsSources.length === 0
) {
  review(
    "CMS",
    "No known CMS markers found in scanned code; this does not prove that no CMS exists elsewhere"
  );
} else {
  review(
    "CMS",
    "CMS-related evidence found; verify actual admin login, editing, publishing and frontend delivery"
  );
}

console.log("\n=== DATABASE EVIDENCE ===");
console.log(
  `DATABASE_SOURCE_MARKERS: ${dbSources.length}`
);

for (const file of dbSources.slice(0, 30)) {
  console.log(`DB_SOURCE: ${rel(file)}`);
}

/* ==========================================
   TRACE PUBLIC PAGE / API DEPENDENCIES
   ========================================== */

function visitGraph(start) {
  const seen = new Set();
  const queue = [start];

  while (queue.length) {
    const current = queue.pop();

    if (!current || seen.has(current)) continue;

    seen.add(current);

    for (const next of dependencies.get(current) ?? []) {
      queue.push(next);
    }
  }

  return seen;
}

function routeFromFile(file) {
  let relative = rel(file)
    .replace(/^src\/app/, "")
    .replace(/\/(?:page|route)\.(?:tsx?|jsx?)$/, "")
    .replace(/\/\([^)]+\)/g, "");

  return relative || "/";
}

const pageFiles = [...files.keys()].filter(
  (file) =>
    /\/app\/.*\/page\.(?:tsx?|jsx?)$/.test(
      file.replace(/\\/g, "/")
    ) ||
    /\/app\/page\.(?:tsx?|jsx?)$/.test(
      file.replace(/\\/g, "/")
    )
);

const apiFiles = [...files.keys()].filter(
  (file) =>
    /\/app\/api\/.*\/route\.(?:tsx?|jsx?)$/.test(
      file.replace(/\\/g, "/")
    )
);

const dbSet = new Set(dbSources);
const cmsSet = new Set(cmsSources);

let publicDbChains = 0;
let apiDbChains = 0;
let publicCmsChains = 0;

console.log("\n=== PUBLIC PAGE DEPENDENCY CHAINS ===");

for (const file of pageFiles) {
  const route = routeFromFile(file);
  const graph = visitGraph(file);

  const dbHits = [...graph].filter(
    (item) => dbSet.has(item)
  );

  const cmsHits = [...graph].filter(
    (item) => cmsSet.has(item)
  );

  if (
    route.startsWith("/admin") ||
    route.startsWith("/studio")
  ) {
    continue;
  }

  if (dbHits.length) publicDbChains++;
  if (cmsHits.length) publicCmsChains++;

  console.log(
    `PAGE_DEPENDENCY: ${route} db_modules=${dbHits.length} cms_modules=${cmsHits.length}`
  );

  for (const hit of dbHits.slice(0, 4)) {
    console.log(
      `  DB_CHAIN_SOURCE: ${rel(hit)}`
    );
  }

  for (const hit of cmsHits.slice(0, 4)) {
    console.log(
      `  CMS_CHAIN_SOURCE: ${rel(hit)}`
    );
  }
}

console.log("\n=== API DATABASE DEPENDENCIES ===");

for (const file of apiFiles) {
  const graph = visitGraph(file);
  const hits = [...graph].filter(
    (item) => dbSet.has(item)
  );

  if (hits.length) apiDbChains++;

  console.log(
    `API_DEPENDENCY: ${routeFromFile(file)} db_modules=${hits.length}`
  );
}

/* ==========================================
   SEO INVENTORY FOR REMAINING PAGES
   ========================================== */

const seoRoutes = [
  "/about",
  "/hospitality-solutions",
  "/markets",
  "/gallery",
  "/insights",
  "/contact",
  "/news",
  "/downloads",
  "/clients",
];

console.log("\n=== REMAINING PUBLIC PAGE SEO ===");

function metadataDeclared(source) {
  return /\bexport\s+(?:const\s+metadata\b|(?:async\s+)?function\s+generateMetadata\b)/.test(
    source
  );
}

for (const route of seoRoutes) {
  const directory = path.join(
    root,
    "src",
    "app",
    ...route.slice(1).split("/")
  );

  const page = extensions
    .map((ext) => path.join(directory, "page" + ext))
    .find((item) => files.has(item));

  const layout = extensions
    .map((ext) => path.join(directory, "layout" + ext))
    .find((item) => files.has(item));

  if (!page) {
    review(
      "PAGE_SCOPE",
      `${route}: page source not found at the conventional path`
    );
    continue;
  }

  const pageSource = files.get(page);
  const layoutSource = layout
    ? files.get(layout)
    : "";

  const localMeta =
    metadataDeclared(pageSource);

  const layoutMeta =
    metadataDeclared(layoutSource);

  const hasCanonical =
    /\bcanonical\s*:/.test(pageSource) ||
    /\bcanonical\s*:/.test(layoutSource);

  console.log(
    `SEO_ROUTE: ${route} page_metadata=${localMeta} layout_metadata=${layoutMeta} canonical_declared=${hasCanonical}`
  );

  if (!localMeta && !layoutMeta) {
    review(
      "SEO_METADATA",
      `${route}: page-specific title/description may be missing`
    );
  }

  if (!hasCanonical) {
    review(
      "SEO_CANONICAL",
      `${route}: page-specific canonical not found`
    );
  }
}

/* ==========================================
   PRESERVATION AND SAFETY CHECKS
   ========================================== */

console.log("\n=== PRESERVATION CHECKS ===");

const requiredFiles = [
  "src/lib/products.ts",
  "src/lib/approved-homepage-images.ts",
  "src/lib/approved-product-images.ts",
  "src/components/ApprovedProductImage.tsx",
  "src/components/ApprovedCatalogueImage.tsx",
  "src/app/request-quotation/page.tsx",
  "src/app/products/page.tsx",
  "src/app/sitemap.ts",
  "src/app/robots.ts",
  "scripts/quotation-customer-experience-audit.mjs",
  "scripts/seo-canonical-integration-audit.mjs",
];

for (const name of requiredFiles) {
  pass(
    regularFile(path.join(root, name)),
    "PRESERVE",
    name
  );
}

console.log("\n=== ARCHITECTURE DECISION STATUS ===");

console.log(
  `PUBLIC_DB_CHAINS: ${publicDbChains}`
);
console.log(
  `API_DB_CHAINS: ${apiDbChains}`
);
console.log(
  `PUBLIC_CMS_CHAINS: ${publicCmsChains}`
);
console.log(
  `DYNAMIC_IMPORT_REVIEW_FILES: ${dynamicReview.size}`
);

if (dynamicReview.size) {
  for (const file of [...dynamicReview].slice(0, 15)) {
    review(
      "DYNAMIC_IMPORT",
      `${rel(file)} has a nonliteral dynamic module reference`
    );
  }
}

review(
  "DB_DEPLOYMENT",
  "Static imports alone cannot prove PostgreSQL is unnecessary; check server startup, build-time access, API calls and CMS runtime behavior before deciding"
);

console.log(
  "CMS_DECISION: PENDING_FUNCTIONAL_VERIFICATION"
);
console.log(
  "PRODUCTION_POSTGRES_DECISION: PENDING_RUNTIME_VERIFICATION"
);
console.log(
  "HOSTING_DECISION: RAILWAY_SINGAPORE_PROVISIONAL"
);

console.log(
  `ARCHITECTURE_AUDIT_SUMMARY: files=${files.size} pages=${pageFiles.length} api_routes=${apiFiles.length} public_db_chains=${publicDbChains} api_db_chains=${apiDbChains} cms_sources=${cmsSources.length} reviews=${reviews} failures=${failed}`
);

console.log(
  `FILE_125_RESULT: ${failed === 0 ? "PASS" : "FAIL"}`
);

console.log(
  "AUDIT_COMPLETE: No source files changed, no credentials read and no network requests made."
);

if (failed) {
  process.exitCode = 1;
}
