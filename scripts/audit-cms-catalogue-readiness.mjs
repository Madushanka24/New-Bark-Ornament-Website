
/**
 * BARK ORNAMENT — FILE 150 STEP E7O
 *
 * CMS catalogue publication readiness audit.
 *
 * READ ONLY:
 * - No filesystem writes
 * - No Sanity requests
 * - No database connections
 * - No email or quotation submissions
 *
 * This audit verifies the existing baseline
 * and identifies the integration work still
 * needed before public CMS activation.
 *
 * A passing baseline does NOT authorize
 * enabling CMS public publication.
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();

let checksPassed = 0;
let checksFailed = 0;

const gaps = [];

function readFile(relativePath) {
  const fullPath = path.join(
    ROOT,
    relativePath
  );

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Required file missing: ${relativePath}`
    );
  }

  return fs.readFileSync(
    fullPath,
    "utf8"
  );
}

function check(label, condition) {
  if (condition) {
    checksPassed++;
    console.log(`PASS: ${label}`);
    return;
  }

  checksFailed++;
  console.error(`FAIL: ${label}`);
}

function gap(label, explanation) {
  gaps.push({
    label,
    explanation,
  });
}

function has(text, expression) {
  return expression.test(text);
}

function isClientComponent(source) {
  return has(
    source,
    /^\s*["']use client["'];?/m
  );
}

function getStaticArray(
  source,
  variableName
) {
  const file = ts.createSourceFile(
    "products.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  let array = null;

  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (
      const declaration of
      statement.declarationList.declarations
    ) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === variableName &&
        declaration.initializer &&
        ts.isArrayLiteralExpression(
          declaration.initializer
        )
      ) {
        array = declaration.initializer;
      }
    }
  }

  if (!array) {
    throw new Error(
      `Cannot inspect local ${variableName} array`
    );
  }

  return array.elements.map(
    (element, index) => {
      if (!ts.isObjectLiteralExpression(element)) {
        throw new Error(
          `${variableName}[${index}] is not an object`
        );
      }

      const record = {};

      for (const property of element.properties) {
        if (
          !ts.isPropertyAssignment(property)
        ) {
          continue;
        }

        const name = property.name;

        if (
          !ts.isIdentifier(name) &&
          !ts.isStringLiteral(name)
        ) {
          continue;
        }

        const value = property.initializer;

        if (ts.isStringLiteral(value)) {
          record[name.text] = value.text;
        } else if (
          value.kind === ts.SyntaxKind.TrueKeyword
        ) {
          record[name.text] = true;
        } else if (
          value.kind === ts.SyntaxKind.FalseKeyword
        ) {
          record[name.text] = false;
        }
      }

      return record;
    }
  );
}

function unique(values) {
  return (
    new Set(values).size === values.length
  );
}

function validIdentity(value) {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function checkEnvironment() {
  const envPath = path.join(
    ROOT,
    ".env.local"
  );

  const envSource = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";

  const enabledInFile = envSource
    .split(/\r?\n/)
    .some((line) =>
      /^\s*CATALOGUE_CMS_PUBLIC_ENABLED\s*=\s*["']?true["']?\s*(?:#.*)?$/i
        .test(line)
    );

  const enabledInProcess =
    process.env.CATALOGUE_CMS_PUBLIC_ENABLED ===
    "true";

  check(
    "CMS public flag is not enabled",
    !enabledInFile && !enabledInProcess
  );
}

function auditLocalRegistry() {
  const source = readFile(
    "src/lib/products.ts"
  );

  const categories = getStaticArray(
    source,
    "productCategories"
  );

  const products = getStaticArray(
    source,
    "products"
  );

  console.log("\n=== LOCAL REGISTRY ===");

  check(
    "Exactly ten local categories",
    categories.length === 10
  );

  check(
    "Category IDs are valid and unique",
    categories.every((item) =>
      validIdentity(item.id)
    ) &&
    unique(categories.map((item) => item.id))
  );

  check(
    "Category slugs are valid and unique",
    categories.every((item) =>
      validIdentity(item.slug)
    ) &&
    unique(categories.map((item) => item.slug))
  );

  check(
    "Product IDs are valid and unique",
    products.every((item) =>
      validIdentity(item.id)
    ) &&
    unique(products.map((item) => item.id))
  );

  check(
    "Product slugs are valid and unique",
    products.every((item) =>
      validIdentity(item.slug)
    ) &&
    unique(products.map((item) => item.slug))
  );

  const categorySlugs = new Set(
    categories.map((item) => item.slug)
  );

  check(
    "All local products reference known categories",
    products.every((item) =>
      categorySlugs.has(item.categorySlug)
    )
  );

  check(
    "All local products have valid publication states",
    products.every((item) =>
      (
        item.status === "draft" ||
        item.status === "published"
      ) &&
      typeof item.isDemo === "boolean"
    )
  );

  console.log(
    `LOCAL_CATEGORIES: ${categories.length}`
  );

  console.log(
    `LOCAL_PRODUCTS: ${products.length}`
  );
}

function auditCatalogueBoundary() {
  console.log("\n=== CATALOGUE BOUNDARY ===");

  const page = readFile(
    "src/app/products/page.tsx"
  );

  const client = readFile(
    "src/app/products/CatalogueClient.tsx"
  );

  const bridge = readFile(
    "src/lib/catalogue-cms-bridge.ts"
  );

  check(
    "Products page is a Server Component",
    !isClientComponent(page)
  );

  check(
    "Products page renders CatalogueClient",
    page.includes('from "./CatalogueClient"') &&
    page.includes("<CatalogueClient />")
  );

  check(
    "CatalogueClient is a Client Component",
    isClientComponent(client)
  );

  check(
    "CatalogueClient accepts server data",
    client.includes("catalogueProducts") &&
    client.includes("catalogueCategories")
  );

  check(
    "CatalogueClient retains local fallback",
    client.includes(
      "catalogueProducts ?? localProducts"
    ) &&
    client.includes(
      "catalogueCategories ?? localProductCategories"
    )
  );

  check(
    "CMS bridge is server-only",
    bridge.includes('import "server-only"')
  );

  check(
    "CMS bridge retains its publication gate",
    bridge.includes(
      "CATALOGUE_CMS_PUBLIC_ENABLED"
    ) &&
    bridge.includes(
      "if (!isCmsPublicEnabled())"
    )
  );

  check(
    "Public Products route is not yet using CMS data",
    !page.includes(
      "getPublicCatalogueSnapshot"
    )
  );
}

function auditProductAndCategoryRoutes() {
  console.log("\n=== ROUTE DEPENDENCIES ===");

  const detail = readFile(
    "src/app/products/[slug]/page.tsx"
  );

  const productCategory = readFile(
    "src/app/products/category/[slug]/page.tsx"
  );

  const categoryLanding = readFile(
    "src/app/categories/page.tsx"
  );

  const categoryDetail = readFile(
    "src/app/categories/[slug]/page.tsx"
  );

  const sitemap = readFile(
    "src/app/sitemap.ts"
  );

  check(
    "Existing product detail route has local resolution",
    detail.includes("getProductBySlug")
  );

  check(
    "Existing product detail route has metadata",
    detail.includes("generateMetadata")
  );

  check(
    "Existing product detail route has quote component",
    detail.includes("AddToQuote")
  );

  check(
    "Product-category route exists",
    productCategory.length > 100
  );

  check(
    "Category landing route exists",
    categoryLanding.length > 100
  );

  check(
    "Category detail route exists",
    categoryDetail.length > 100
  );

  check(
    "Sitemap source exists",
    sitemap.length > 100
  );

  if (
    !detail.includes(
      "getSanityCatalogProductBySlug"
    ) &&
    !detail.includes(
      "getPublicCatalogueSnapshot"
    )
  ) {
    gap(
      "CMS product-detail resolution",
      "Product detail pages still use the local registry. New CMS slugs may return 404."
    );
  }

  if (
    !productCategory.includes(
      "getSanityCatalogProducts"
    ) &&
    !productCategory.includes(
      "getPublicCatalogueSnapshot"
    )
  ) {
    gap(
      "Product-category pages",
      "The category product-listing route does not yet use the merged CMS catalogue."
    );
  }

  if (
    !categoryLanding.includes(
      "getSanityCatalogCategories"
    ) &&
    !categoryLanding.includes(
      "getPublicCatalogueSnapshot"
    )
  ) {
    gap(
      "Category landing page",
      "CMS category records are not yet integrated into the category landing page."
    );
  }

  if (
    !categoryDetail.includes(
      "getSanityCatalogCategoryBySlug"
    ) &&
    !categoryDetail.includes(
      "getPublicCatalogueSnapshot"
    )
  ) {
    gap(
      "Category detail pages",
      "CMS category detail resolution is not yet integrated."
    );
  }

  if (
    !sitemap.includes(
      "getSanityCatalogProducts"
    ) &&
    !sitemap.includes(
      "getPublicCatalogueSnapshot"
    )
  ) {
    gap(
      "CMS product sitemap",
      "New approved CMS products are not yet included in the sitemap."
    );
  }
}

function auditPhotographyAndQuotation() {
  console.log(
    "\n=== PHOTOGRAPHY AND QUOTATION ==="
  );

  const photography = readFile(
    "src/lib/sanity-product-photography.ts"
  );

  const productDetails = readFile(
    "src/app/products/[slug]/page.tsx"
  );

  const catalogueImages = readFile(
    "src/components/ApprovedCatalogueImage.tsx"
  );

  const client = readFile(
    "src/app/products/CatalogueClient.tsx"
  );

  readFile(
    "src/components/AddToQuote.tsx"
  );

  readFile(
    "src/components/QuoteBasketProvider.tsx"
  );

  check(
    "Photography uses stable product ID",
    photography.includes(
      "productId == $productId"
    )
  );

  check(
    "Photography requires approval",
    photography.includes(
      "approved == true"
    )
  );

  check(
    "Photography supports the main image role",
    photography.includes(
      'role === "main"'
    )
  );

  check(
    "Existing detail page uses Sanity photography",
    productDetails.includes(
      "getSanityProductPhotography(product.id)"
    )
  );

  check(
    "Catalogue image component exists",
    catalogueImages.length > 100
  );

  if (
    !photography.includes("mimeType") ||
    !photography.includes(
      "image.asset->size"
    )
  ) {
    gap(
      "Photography asset validation",
      "The photography reader still needs an explicit MIME and asset-size policy review."
    );
  }

  if (
    !catalogueImages.includes(
      "getSanityProductPhotography"
    )
  ) {
    gap(
      "CMS product-card photography",
      "Product cards do not yet receive a verified CMS photography payload. Review the server-side image-data boundary."
    );
  }

  if (
    client.includes(
      "useState(true)"
    ) &&
    client.includes(
      "Show development product previews"
    )
  ) {
    gap(
      "Public development previews",
      "The catalogue currently defaults to showing demonstration products. This must be explicitly reviewed before production activation."
    );
  }

  gap(
    "CMS quotation identity validation",
    "Verify that CMS-only product IDs, slugs and quotation data resolve consistently through the product-detail and quotation-basket flow."
  );
}

function printSummary() {
  console.log(
    "\n=== FILE 150 E7O SUMMARY ==="
  );

  console.log(
    `BASELINE_CHECKS_PASSED: ${checksPassed}`
  );

  console.log(
    `BASELINE_CHECKS_FAILED: ${checksFailed}`
  );

  console.log(
    `CMS_INTEGRATION_GAPS: ${gaps.length}`
  );

  for (let i = 0; i < gaps.length; i++) {
    const item = gaps[i];

    console.log(
      `\nGAP ${i + 1}: ${item.label}`
    );

    console.log(item.explanation);
  }

  console.log(
    "\nCMS_PUBLIC_ACTIVATION: NOT AUTHORIZED"
  );

  console.log(
    "SANITY_WRITES: 0"
  );

  console.log(
    "DATABASE_CONNECTIONS: 0"
  );

  console.log(
    "EMAILS_SENT: 0"
  );

  console.log(
    "FILES_MODIFIED: 0"
  );

  if (checksFailed > 0) {
    console.log(
      "E7O_RESULT: FAIL_BASELINE"
    );

    process.exitCode = 1;
    return;
  }

  console.log(
    "E7O_RESULT: PASS_BASELINE_PUBLICATION_BLOCKED"
  );
}

function main() {
  console.log(
    "FILE 150 E7O — CMS CATALOGUE READINESS"
  );

  console.log(
    "MODE: READ ONLY"
  );

  const packageSource = readFile(
    "package.json"
  );

  const project = JSON.parse(
    packageSource
  );

  check(
    "Correct website project",
    project.name === "bark-ornament-website"
  );

  checkEnvironment();
  auditLocalRegistry();
  auditCatalogueBoundary();
  auditProductAndCategoryRoutes();
  auditPhotographyAndQuotation();
  printSummary();
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exitCode = 1;
}
