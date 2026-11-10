/**
 * BARK ORNAMENT — FILE 116
 * SEO Metadata, Canonical & Noindex Audit
 *
 * Run:
 * node scripts/seo-metadata-readiness-audit.mjs --audit
 *
 * READ ONLY:
 * - No website files modified
 * - No network requests
 * - No database operations
 * - No quotation submissions
 * - No environment variable changes
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
    "Usage: node scripts/seo-metadata-readiness-audit.mjs --audit"
  );
  process.exit(2);
}

const root = process.cwd();

let passed = 0;
let failed = 0;
let reviews = 0;

function check(ok, id, description) {
  console.log(
    `${ok ? "PASS" : "FAIL"} ${id}: ${description}`
  );

  if (ok) passed++;
  else failed++;
}

function review(id, description) {
  console.log(`REVIEW ${id}: ${description}`);
  reviews++;
}

/* ==========================================
   1. READ AND PARSE SOURCE FILES
   ========================================== */

function read(relativePath, required = true) {
  const absolute = path.join(
    root,
    relativePath
  );

  try {
    const stat = fs.lstatSync(absolute);

    if (
      !stat.isFile() ||
      stat.isSymbolicLink()
    ) {
      throw new Error("Not a regular file");
    }

    const code = fs.readFileSync(
      absolute,
      "utf8"
    );

    const ast = ts.createSourceFile(
      absolute,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    if (ast.parseDiagnostics.length) {
      check(
        false,
        "PARSE",
        `${relativePath}: ${ast.parseDiagnostics.length} syntax diagnostics`
      );

      return null;
    }

    return {
      rel: relativePath,
      code,
      ast,
    };
  } catch {
    if (required) {
      check(
        false,
        "FILE",
        `Missing or unreadable: ${relativePath}`
      );
    }

    return null;
  }
}

/* ==========================================
   2. METADATA EXPORT INSPECTION
   ========================================== */

function isExported(node) {
  return (
    node.modifiers?.some(
      (modifier) =>
        modifier.kind ===
        ts.SyntaxKind.ExportKeyword
    ) ?? false
  );
}

function metadataOf(file) {
  if (!file) {
    return {
      count: 0,
      text: "",
      names: [],
    };
  }

  const items = [];

  for (const statement of file.ast.statements) {
    if (!isExported(statement)) {
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (
        const declaration of
        statement.declarationList.declarations
      ) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === "metadata" &&
          declaration.initializer
        ) {
          items.push({
            name: "metadata",
            text:
              declaration.initializer.getText(
                file.ast
              ),
          });
        }
      }
    }

    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text ===
        "generateMetadata"
    ) {
      items.push({
        name: "generateMetadata",
        text:
          statement.body?.getText(
            file.ast
          ) ?? "",
      });
    }
  }

  return {
    count: items.length,

    text: items
      .map((item) => item.text)
      .join("\n"),

    names: items.map(
      (item) => item.name
    ),
  };
}

function hasField(source, field) {
  return new RegExp(
    `\\b${field}\\s*:`
  ).test(source);
}

/* ==========================================
   3. PUBLIC ROUTE INVENTORY
   ========================================== */

/**
 * These routes are expected to be public
 * according to the File 114 sitemap.
 *
 * Dynamic product and category pages
 * are inspected through their templates.
 */

const publicPages = [
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/products/page.tsx",
  "src/app/categories/page.tsx",
  "src/app/hospitality-solutions/page.tsx",
  "src/app/markets/page.tsx",
  "src/app/gallery/page.tsx",
  "src/app/insights/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/products/[slug]/page.tsx",
  "src/app/categories/[slug]/page.tsx",
];

console.log(
  "FILE_116: SEO_METADATA_READINESS_AUDIT"
);

console.log(
  "MODE: READ_ONLY | STATIC_SOURCE | NO_NETWORK"
);

/* ==========================================
   4. ROOT LAYOUT METADATA
   ========================================== */

console.log(
  "\n=== ROOT METADATA ==="
);

const layout = read(
  "src/app/layout.tsx"
);

const layoutMeta = metadataOf(layout);

check(
  layoutMeta.count === 1,
  "L01",
  "Exactly one root metadata export"
);

if (
  !hasField(
    layoutMeta.text,
    "metadataBase"
  )
) {
  review(
    "L02",
    "Root metadataBase absent; relative canonical URLs require a valid absolute base"
  );
} else {
  check(
    true,
    "L02",
    "Root metadataBase declared; verify production origin manually"
  );
}

if (
  !hasField(layoutMeta.text, "title")
) {
  review(
    "L03",
    "Root title metadata not found"
  );
}

if (
  !hasField(
    layoutMeta.text,
    "description"
  )
) {
  review(
    "L04",
    "Root description metadata not found"
  );
}

if (
  hasField(
    layoutMeta.text,
    "canonical"
  )
) {
  review(
    "L05",
    "Root canonical declared; verify that child pages do not inherit an incorrect homepage canonical"
  );
}

/* ==========================================
   5. PUBLIC PAGE METADATA
   ========================================== */

console.log(
  "\n=== PUBLIC PAGE METADATA ==="
);

let explicitMetadata = 0;
let explicitCanonical = 0;

for (const relativePath of publicPages) {
  const page = read(relativePath);

  if (!page) {
    continue;
  }

  const metadata = metadataOf(page);

  const isClient =
    /^\s*['"]use client['"]/.test(
      page.code
    );

  check(
    metadata.count <= 1,
    "META_EXPORT",
    `${relativePath}: no conflicting metadata exports`
  );

  if (
    isClient &&
    metadata.count > 0
  ) {
    check(
      false,
      "CLIENT_META",
      `${relativePath}: Client Component exports metadata`
    );
  }

  if (metadata.count > 0) {
    explicitMetadata++;
  } else {
    review(
      "META_MISSING",
      `${relativePath}: local metadata absent; inspect inherited title and description`
    );
  }

  if (
    metadata.count > 0 &&
    !hasField(
      metadata.text,
      "title"
    )
  ) {
    review(
      "TITLE",
      `${relativePath}: title not evident in metadata`
    );
  }

  if (
    metadata.count > 0 &&
    !hasField(
      metadata.text,
      "description"
    )
  ) {
    review(
      "DESCRIPTION",
      `${relativePath}: description not evident in metadata`
    );
  }

  if (
    hasField(
      metadata.text,
      "canonical"
    )
  ) {
    explicitCanonical++;
  } else {
    review(
      "CANONICAL",
      `${relativePath}: page-specific canonical not evident; verify rendered canonical link`
    );
  }
}

console.log(
  `PAGE_SUMMARY: expected=${publicPages.length} local_metadata=${explicitMetadata} local_canonical=${explicitCanonical}`
);

/* ==========================================
   6. PRODUCT INDEXING
   ========================================== */

console.log(
  "\n=== PRODUCT AND QUOTATION INDEXING ==="
);

const product = read(
  "src/app/products/[slug]/page.tsx"
);

if (product) {
  const metadata = metadataOf(
    product
  );

  check(
    metadata.names.includes(
      "generateMetadata"
    ),
    "P01",
    "Product detail exports generateMetadata"
  );

  /**
   * File 107 protected demo and
   * unpublished products using:
   *
   * index:
   *   product.status === "published" &&
   *   !product.isDemo
   */
  const publicationGuard =
    /index\s*:\s*product\.status\s*===\s*["']published["']\s*&&\s*!product\.isDemo/s.test(
      metadata.text
    );

  if (publicationGuard) {
    check(
      true,
      "P02",
      "Published and non-demo indexing guard detected"
    );
  } else {
    review(
      "P02",
      "Product indexing logic differs from the expected guard; verify demo/unpublished pages return noindex"
    );
  }

  if (
    !/getProductBySlug\s*\(\s*slug\s*,\s*true\s*\)/.test(
      product.code
    )
  ) {
    review(
      "P03",
      "Verify unknown product URL handling and publication rules"
    );
  }
}

/* ==========================================
   7. REQUEST QUOTATION NOINDEX
   ========================================== */

/**
 * The quotation page uses client-side
 * basket controls.
 *
 * Next.js metadata exports belong in
 * Server Components, so a route-specific
 * layout may be needed.
 */

const quote = read(
  "src/app/request-quotation/page.tsx"
);

const quoteLayout = read(
  "src/app/request-quotation/layout.tsx",
  false
);

const quoteMetadata = metadataOf(
  quote
);

const quoteLayoutMetadata = metadataOf(
  quoteLayout
);

const combinedQuoteMetadata =
  quoteMetadata.text +
  "\n" +
  quoteLayoutMetadata.text;

if (
  /\bindex\s*:\s*false\b/.test(
    combinedQuoteMetadata
  )
) {
  check(
    true,
    "Q01",
    "Quotation route declares noindex metadata"
  );
} else {
  review(
    "Q01",
    "Explicit quotation-route noindex not found; review a server layout or HTTP X-Robots-Tag"
  );
}

if (
  quote &&
  /^\s*['"]use client['"]/.test(
    quote.code
  )
) {
  console.log(
    "INFO Q02: Quotation page is a Client Component; server layout metadata may be required."
  );
}

/* ==========================================
   8. SITEMAP AND ROBOTS PROTECTION
   ========================================== */

console.log(
  "\n=== SITEMAP AND ROBOTS GUARDS ==="
);

const sitemap = read(
  "src/app/sitemap.ts"
);

const robots = read(
  "src/app/robots.ts"
);

if (sitemap) {
  check(
    /product\.status\s*===\s*["']published["']/.test(
      sitemap.code
    ) &&
      /product\.isDemo\s*===\s*false/.test(
        sitemap.code
      ),
    "S01",
    "Sitemap filters published, non-demo products"
  );

  check(
    !sitemap.code.includes(
      '"/request-quotation"'
    ),
    "S02",
    "Quotation route not explicitly listed in sitemap"
  );
}

if (robots) {
  check(
    robots.code.includes(
      "BARK_SEO_INDEXING_APPROVED"
    ) &&
      robots.code.includes(
        "BARK_DEPLOYMENT_TARGET"
      ) &&
      /disallow\s*:\s*["']\/["']/.test(
        robots.code
      ),
    "S03",
    "Robots source retains default restriction and production approval gate"
  );
}

/* ==========================================
   9. FINAL SUMMARY
   ========================================== */

console.log(
  "\n=== RESULTS ==="
);

console.log(
  `SEO_SUMMARY: passed=${passed} failed=${failed} reviews=${reviews}`
);

console.log(
  `FILE_116_RESULT: ${failed === 0 ? "PASS" : "FAIL"}`
);

console.log(
  "AUDIT_COMPLETE: Static source audit only; rendered metadata must also be verified before launch."
);

if (failed > 0) {
  process.exitCode = 1;
}
