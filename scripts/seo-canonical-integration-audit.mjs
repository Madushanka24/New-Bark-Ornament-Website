/**
 * BARK ORNAMENT — FILE 124
 * SEO Metadata Inheritance & Canonical Integration Audit
 *
 * Run from the project root:
 * node scripts/seo-canonical-integration-audit.mjs --audit
 * node scripts/seo-canonical-integration-audit.mjs --live
 *
 * --audit: read-only source inspection; no HTTP requests.
 * --live: same inspection, plus GET requests to 127.0.0.1:3000 only.
 *
 * No writes, database access, email or quotation submissions.
 */

import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const mode = process.argv[2];

if (
  process.argv.length !== 3 ||
  !["--audit", "--live"].includes(mode)
) {
  console.error(
    "Usage: node scripts/seo-canonical-integration-audit.mjs --audit|--live"
  );
  process.exit(2);
}

const projectRoot = process.cwd();

const productionOrigin =
  "https://www.barkornament.com";

const localOrigin =
  "http://127.0.0.1:3000";

const categorySlugs = [
  "printing-stationery",
  "menus-guest-service",
  "tags-stickers-cards",
  "bags-packaging",
  "wooden-products",
  "cane-natural",
  "ceramic-pottery-laksha",
  "candles-party",
  "gifts-promotional",
  "laundry-operations",
];

let passed = 0;
let failed = 0;
let reviews = 0;

/* ==========================================
   AUDIT RESULT HELPERS
   ========================================== */

function check(condition, id, message) {
  const ok = Boolean(condition);

  console.log(
    `${ok ? "PASS" : "FAIL"} ${id}: ${message}`
  );

  if (ok) passed++;
  else failed++;
}

function review(id, message) {
  console.log(
    `REVIEW ${id}: ${message}`
  );

  reviews++;
}

/* ==========================================
   STATIC SOURCE INSPECTION
   ========================================== */

function fileSource(
  relative,
  required = true
) {
  const absolute = path.resolve(
    projectRoot,
    relative
  );

  try {
    const stat = fs.lstatSync(absolute);

    if (
      !stat.isFile() ||
      stat.isSymbolicLink()
    ) {
      throw Error(
        "Not a regular file"
      );
    }

    const text = fs.readFileSync(
      absolute,
      "utf8"
    );

    const ast = ts.createSourceFile(
      absolute,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    if (
      ast.parseDiagnostics.length
    ) {
      throw Error(
        "TypeScript syntax diagnostics"
      );
    }

    return {
      text,
      ast,
      relative,
    };

  } catch (error) {
    if (required) {
      check(
        false,
        "SOURCE",
        `${relative}: ${error.message}`
      );
    }

    return null;
  }
}

function exported(node) {
  return (
    node.modifiers?.some(
      (modifier) =>
        modifier.kind ===
        ts.SyntaxKind.ExportKeyword
    ) ?? false
  );
}

function propName(property) {
  if (
    !ts.isPropertyAssignment(property)
  ) {
    return null;
  }

  if (
    ts.isIdentifier(property.name) ||
    ts.isStringLiteral(property.name)
  ) {
    return property.name.text;
  }

  return null;
}

function field(object, key) {
  if (
    !object ||
    !ts.isObjectLiteralExpression(object)
  ) {
    return null;
  }

  const hits =
    object.properties.filter(
      (property) =>
        propName(property) === key
    );

  return hits.length === 1
    ? hits[0].initializer
    : null;
}

function staticMetadata(file) {
  if (!file) {
    return null;
  }

  const matches = [];

  for (
    const statement of
    file.ast.statements
  ) {
    if (
      !ts.isVariableStatement(statement) ||
      !exported(statement)
    ) {
      continue;
    }

    for (
      const declaration of
      statement.declarationList.declarations
    ) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "metadata"
      ) {
        matches.push(
          declaration.initializer
        );
      }
    }
  }

  return (
    matches.length === 1 &&
    ts.isObjectLiteralExpression(
      matches[0]
    )
  )
    ? matches[0]
    : null;
}

function canonicalExpr(metadata) {
  return field(
    field(
      metadata,
      "alternates"
    ),
    "canonical"
  );
}

function literalEquals(
  expression,
  value
) {
  return Boolean(
    expression &&
    (
      ts.isStringLiteral(expression) ||
      ts.isNoSubstitutionTemplateLiteral(
        expression
      )
    ) &&
    expression.text === value
  );
}

/* ==========================================
   DYNAMIC PRODUCT / CATEGORY CANONICALS
   ========================================== */

function dynamicCanonical(
  file,
  objectName
) {
  if (!file) {
    return false;
  }

  const functions =
    file.ast.statements.filter(
      (node) =>
        ts.isFunctionDeclaration(node) &&
        exported(node) &&
        node.name?.text ===
          "generateMetadata"
    );

  if (
    functions.length !== 1 ||
    !functions[0].body
  ) {
    return false;
  }

  const found = [];

  const visit = (node) => {
    if (
      ts.isReturnStatement(node) &&
      node.expression &&
      ts.isObjectLiteralExpression(
        node.expression
      )
    ) {
      const expression =
        canonicalExpr(
          node.expression
        );

      if (expression) {
        found.push(expression);
      }
    }

    ts.forEachChild(
      node,
      visit
    );
  };

  visit(
    functions[0].body
  );

  if (
    found.length !== 1 ||
    !ts.isTemplateExpression(
      found[0]
    )
  ) {
    return false;
  }

  const expression = found[0];

  const collectionName =
    objectName === "product"
      ? "products"
      : "categories";

  return (
    expression.head.text ===
      `/${collectionName}/` &&

    expression.templateSpans.length === 1 &&

    expression.templateSpans[0]
      .expression
      .getText(file.ast)
      .replace(/\s/g, "") ===
        `${objectName}.slug` &&

    expression.templateSpans[0]
      .literal.text === ""
  );
}

/* ==========================================
   PARENT LAYOUT INHERITANCE
   ========================================== */

function alternativeIsSafe(
  page,
  expected
) {
  if (!page) {
    return false;
  }

  const metadata =
    staticMetadata(page);

  if (!metadata) {
    return !/\bexport\s+(?:const\s+metadata|(?:async\s+)?function\s+generateMetadata)\b/.test(
      page.text
    );
  }

  const alternates =
    field(
      metadata,
      "alternates"
    );

  return (
    !alternates ||
    literalEquals(
      field(
        alternates,
        "canonical"
      ),
      expected
    )
  );
}

/* ==========================================
   LOAD REQUIRED FILES
   ========================================== */

console.log(
  "FILE_124: SEO_CANONICAL_INTEGRATION_AUDIT"
);

console.log(
  `MODE: ${
    mode === "--live"
      ? "SOURCE_AND_LOCAL_HTTP"
      : "SOURCE_ONLY"
  }`
);

console.log(
  `PROJECT_ROOT: ${projectRoot}`
);

const sources = {
  root:
    fileSource("src/app/layout.tsx"),

  home:
    fileSource("src/app/page.tsx"),

  catalogueLayout:
    fileSource("src/app/products/layout.tsx"),

  cataloguePage:
    fileSource("src/app/products/page.tsx"),

  productDetail:
    fileSource(
      "src/app/products/[slug]/page.tsx"
    ),

  categoriesLayout:
    fileSource(
      "src/app/categories/layout.tsx"
    ),

  categoriesPage:
    fileSource(
      "src/app/categories/page.tsx"
    ),

  categoryDetail:
    fileSource(
      "src/app/categories/[slug]/page.tsx"
    ),

  quoteLayout:
    fileSource(
      "src/app/request-quotation/layout.tsx"
    ),

  quotePage:
    fileSource(
      "src/app/request-quotation/page.tsx"
    ),

  sitemap:
    fileSource(
      "src/app/sitemap.ts"
    ),

  robots:
    fileSource(
      "src/app/robots.ts"
    ),
};

/* ==========================================
   METADATA INHERITANCE CHECKS
   ========================================== */

console.log(
  "\n=== STATIC METADATA INHERITANCE ==="
);

const rootMeta =
  staticMetadata(sources.root);

const base =
  field(
    rootMeta,
    "metadataBase"
  );

check(
  Boolean(
    base &&
    ts.isNewExpression(base) &&

    base.expression.getText(
      sources.root.ast
    ) === "URL" &&

    base.arguments?.length === 1 &&

    literalEquals(
      base.arguments[0],
      productionOrigin
    )
  ),

  "M01",

  "Root metadataBase is the expected production origin"
);

check(
  !canonicalExpr(rootMeta),

  "M02",

  "Root layout does not impose a homepage canonical on every page"
);

check(
  literalEquals(
    canonicalExpr(
      staticMetadata(
        sources.home
      )
    ),
    "/"
  ),

  "M03",

  "Homepage declares its own canonical /"
);

check(
  literalEquals(
    canonicalExpr(
      staticMetadata(
        sources.catalogueLayout
      )
    ),
    "/products"
  ),

  "M04",

  "Products layout canonical is /products"
);

check(
  alternativeIsSafe(
    sources.cataloguePage,
    "/products"
  ),

  "M05",

  "Catalogue page does not override its inherited canonical incorrectly"
);

check(
  dynamicCanonical(
    sources.productDetail,
    "product"
  ),

  "M06",

  "Product detail page overrides parent with its own slug canonical"
);

check(
  literalEquals(
    canonicalExpr(
      staticMetadata(
        sources.categoriesLayout
      )
    ),
    "/categories"
  ),

  "M07",

  "Categories layout canonical is /categories"
);

check(
  alternativeIsSafe(
    sources.categoriesPage,
    "/categories"
  ),

  "M08",

  "Category landing page does not override its inherited canonical incorrectly"
);

check(
  dynamicCanonical(
    sources.categoryDetail,
    "category"
  ),

  "M09",

  "Category detail page overrides parent with its own slug canonical"
);

/* ==========================================
   PUBLICATION AND NOINDEX SAFEGUARDS
   ========================================== */

console.log(
  "\n=== PUBLICATION AND NOINDEX SAFEGUARDS ==="
);

const productText =
  sources.productDetail?.text ?? "";

check(
  /product\.status\s*===\s*["']published["']\s*&&\s*!product\.isDemo/s.test(
    productText
  ),

  "S01",

  "Product metadata retains the published and non-demo index guard"
);

check(
  Boolean(
    sources.categoryDetail &&

    /\bgenerateStaticParams\b/.test(
      sources.categoryDetail.text
    ) &&

    /\bnotFound\s*\(/.test(
      sources.categoryDetail.text
    )
  ),

  "S02",

  "Category static-route generation and unknown-slug 404 safeguards are present"
);

const quoteRobots =
  field(
    staticMetadata(
      sources.quoteLayout
    ),
    "robots"
  );

const quoteGoogleBot =
  field(
    quoteRobots,
    "googleBot"
  );

const falseValue = (node) =>
  Boolean(
    node &&
    node.kind ===
      ts.SyntaxKind.FalseKeyword
  );

check(
  falseValue(
    field(
      quoteRobots,
      "index"
    )
  ) &&

  falseValue(
    field(
      quoteRobots,
      "follow"
    )
  ) &&

  falseValue(
    field(
      quoteGoogleBot,
      "index"
    )
  ) &&

  falseValue(
    field(
      quoteGoogleBot,
      "follow"
    )
  ),

  "S03",

  "Quotation layout contains robots and Googlebot noindex/nofollow"
);

check(
  Boolean(
    sources.quotePage &&

    /^[\s\uFEFF]*["']use client["']\s*;?/.test(
      sources.quotePage.text
    )
  ),

  "S04",

  "Existing quotation page remains a Client Component"
);

check(
  Boolean(
    sources.sitemap &&

    /product\.status\s*===\s*["']published["']/.test(
      sources.sitemap.text
    ) &&

    /product\.isDemo\s*===\s*false/.test(
      sources.sitemap.text
    ) &&

    !/["']\/request-quotation["']\s*,/.test(
      sources.sitemap.text
    )
  ),

  "S05",

  "Sitemap guards demo products and excludes the quotation route"
);

check(
  Boolean(
    sources.robots &&

    sources.robots.text.includes(
      "BARK_SEO_INDEXING_APPROVED"
    ) &&

    sources.robots.text.includes(
      "BARK_DEPLOYMENT_TARGET"
    ) &&

    /disallow\s*:\s*["']\/["']/.test(
      sources.robots.text
    )
  ),

  "S06",

  "Crawling remains approval-gated and disallowed by default"
);

/* ==========================================
   CANONICAL COVERAGE SUMMARY
   ========================================== */

console.log(
  "\n=== CANONICAL COVERAGE ==="
);

console.log(
  "INHERITED: /products from products/layout.tsx"
);

console.log(
  "INHERITED: /categories from categories/layout.tsx"
);

console.log(
  "OVERRIDDEN: /products/[slug] and /categories/[slug]"
);

console.log(
  `CATEGORY_SLUGS_EXPECTED: ${categorySlugs.length}`
);

/* ==========================================
   HTML METADATA HELPERS
   ========================================== */

function attributes(tag) {
  const result = new Map();

  for (
    const match of tag.matchAll(
      /([\w:-]+)\s*=\s*(["'])(.*?)\2/gis
    )
  ) {
    result.set(
      match[1].toLowerCase(),
      match[3]
    );
  }

  return result;
}

function tags(
  html,
  tagName
) {
  const regex = new RegExp(
    `<${tagName}\\b[^>]*>`,
    "gis"
  );

  return [
    ...html.matchAll(regex),
  ].map(
    (match) =>
      attributes(
        match[0]
      )
  );
}

function canonicalUrls(html) {
  return tags(
    html,
    "link"
  )
    .filter(
      (attributesMap) =>
        (
          attributesMap.get("rel") ??
          ""
        )
          .toLowerCase()
          .split(/\s+/)
          .includes(
            "canonical"
          )
    )

    .map(
      (attributesMap) =>
        attributesMap.get(
          "href"
        ) ?? ""
    );
}

function metaContent(
  html,
  name
) {
  return tags(
    html,
    "meta"
  )
    .filter(
      (attributesMap) =>
        (
          attributesMap.get("name") ??
          ""
        ).toLowerCase() === name
    )

    .map(
      (attributesMap) =>
        (
          attributesMap.get(
            "content"
          ) ?? ""
        ).toLowerCase()
    );
}

/* ==========================================
   SAFE LOCAL-ONLY HTTP TESTING
   ========================================== */

/**
 * Only accesses the local development server
 * at 127.0.0.1:3000.
 *
 * It never requests the current public site,
 * staging server, database or external API.
 */

function localGet(pathname) {
  return new Promise(
    (resolve, reject) => {
      const url = new URL(
        pathname,
        localOrigin
      );

      if (
        url.origin !==
        localOrigin
      ) {
        return reject(
          Error(
            "Non-local URL denied"
          )
        );
      }

      const request = http.get(
        url,

        {
          headers: {
            "user-agent":
              "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",

            "accept":
              "text/html,application/xml,text/plain",
          },

          timeout: 10000,
        },

        (response) => {
          const chunks = [];
          let length = 0;

          response.on(
            "data",
            (chunk) => {
              length +=
                chunk.length;

              if (
                length >
                6 * 1024 * 1024
              ) {
                response.destroy(
                  Error(
                    "HTML exceeded 6 MB"
                  )
                );

                return;
              }

              chunks.push(
                chunk
              );
            }
          );

          response.on(
            "end",
            () =>
              resolve({
                status:
                  response.statusCode,

                html:
                  Buffer.concat(
                    chunks
                  ).toString(
                    "utf8"
                  ),
              })
          );

          response.on(
            "error",
            reject
          );
        }
      );

      request.on(
        "timeout",
        () =>
          request.destroy(
            Error(
              "Local request timed out"
            )
          )
      );

      request.on(
        "error",
        reject
      );
    }
  );
}

/* ==========================================
   RENDERED CANONICAL VALIDATION
   ========================================== */

async function liveCheck(
  route,
  id,
  expectedCanonical
) {
  try {
    const response =
      await localGet(
        route
      );

    if (
      response.status !== 200
    ) {
      check(
        false,
        id,
        `${route}: expected HTTP 200; received ${response.status}`
      );

      return null;
    }

    const values =
      canonicalUrls(
        response.html
      );

    check(
      values.length === 1 &&
        values[0] ===
          expectedCanonical,

      id,

      `${route}: exactly one canonical ${expectedCanonical}; found ${JSON.stringify(values)}`
    );

    return response.html;

  } catch (error) {
    check(
      false,
      id,
      `${route}: ${error.message}`
    );

    return null;
  }
}

/* ==========================================
   LIVE TESTS — OPTIONAL
   ========================================== */

if (
  mode === "--live"
) {
  console.log(
    "\n=== LIVE METADATA (LOCALHOST ONLY) ==="
  );

  const homepageHtml =
    await liveCheck(
      "/",
      "L01",
      `${productionOrigin}`
    );

  const catalogueHtml =
    await liveCheck(
      "/products",
      "L02",
      `${productionOrigin}/products`
    );

  await liveCheck(
    "/products?category=bags-packaging",
    "L03",
    `${productionOrigin}/products`
  );

  await liveCheck(
    "/products?sort=name-asc",
    "L04",
    `${productionOrigin}/products`
  );

  await liveCheck(
    "/categories",
    "L05",
    `${productionOrigin}/categories`
  );

  for (
    let i = 0;
    i < categorySlugs.length;
    i++
  ) {
    const slug =
      categorySlugs[i];

    await liveCheck(
      `/categories/${slug}`,

      `C${String(
        i + 1
      ).padStart(
        2,
        "0"
      )}`,

      `${productionOrigin}/categories/${slug}`
    );
  }

  /* QUOTATION NOINDEX */

  try {
    const quote =
      await localGet(
        "/request-quotation"
      );

    const robots =
      metaContent(
        quote.html,
        "robots"
      );

    const googlebot =
      metaContent(
        quote.html,
        "googlebot"
      );

    const has = (
      items,
      directive
    ) =>
      items.length === 1 &&
      items[0]
        .split(
          /\s*,\s*/
        )
        .includes(
          directive
        );

    check(
      quote.status === 200 &&

      has(
        robots,
        "noindex"
      ) &&

      has(
        robots,
        "nofollow"
      ) &&

      has(
        googlebot,
        "noindex"
      ) &&

      has(
        googlebot,
        "nofollow"
      ),

      "L06",

      "Request Quotation emits robots and Googlebot noindex,nofollow"
    );

  } catch (error) {
    check(
      false,
      "L06",
      `Quotation metadata: ${error.message}`
    );
  }

  /* ROBOTS.TXT */

  try {
    const robots =
      await localGet(
        "/robots.txt"
      );

    check(
      robots.status === 200 &&

      /^\s*Disallow:\s*\/\s*$/im.test(
        robots.html
      ) &&

      !/^\s*Sitemap:/im.test(
        robots.html
      ),

      "L07",

      "Local robots.txt disallows crawling without advertising a sitemap"
    );

  } catch (error) {
    check(
      false,
      "L07",
      `Local robots.txt: ${error.message}`
    );
  }

  /* XML SITEMAP */

  try {
    const sitemap =
      await localGet(
        "/sitemap.xml"
      );

    check(
      sitemap.status === 200 &&

      sitemap.html.includes(
        "<urlset"
      ) &&

      sitemap.html.includes(
        `${productionOrigin}/categories/printing-stationery`
      ),

      "L08",

      "Local sitemap.xml retains public canonical URLs"
    );

  } catch (error) {
    check(
      false,
      "L08",
      `Local sitemap.xml: ${error.message}`
    );
  }

  /* INDIVIDUAL PRODUCT */

  if (catalogueHtml) {
    const match =
      catalogueHtml.match(
        /\bhref\s*=\s*["'](\/products\/[a-z0-9-]+)(?:\?[^"']*)?["']/i
      );

    if (match) {
      await liveCheck(
        match[1],
        "L09",
        `${productionOrigin}${match[1]}`
      );
    } else {
      review(
        "L09",
        "No product detail link in catalogue HTML; verify a known product URL manually"
      );
    }
  }

  /* HOMEPAGE TITLE */

  if (homepageHtml) {
    check(
      /<title\b[^>]*>\s*[^<\s][^<]*<\/title>/i.test(
        homepageHtml
      ),

      "L10",

      "Homepage renders a nonempty HTML title"
    );
  }
}

/* ==========================================
   FINAL SUMMARY
   ========================================== */

console.log(
  "\n=== FILE 124 SUMMARY ==="
);

console.log(
  `SEO_INTEGRATION_SUMMARY: passed=${passed} failed=${failed} reviews=${reviews}`
);

console.log(
  `FILE_124_RESULT: ${
    failed === 0
      ? "PASS"
      : "FAIL"
  }`
);

console.log(
  "AUDIT_COMPLETE: Source only or local GET requests; no files modified."
);

if (
  failed > 0
) {
  process.exitCode = 1;
}
