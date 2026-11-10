/**
 * BARK ORNAMENT — FILE 112
 * Website Photography Integration Audit
 *
 * Run from the project root:
 * node scripts/website-photography-integration-audit.mjs --audit
 *
 * READ-ONLY: no website code execution, file writes, network,
 * database operations, quotation submissions or email delivery.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

if (process.argv.length !== 3 || process.argv[2] !== "--audit") {
  console.error("Usage: node scripts/website-photography-integration-audit.mjs --audit");
  process.exit(2);
}

const root = process.cwd();
const paths = {
  homepage: "src/app/page.tsx",
  catalogue: "src/app/products/page.tsx",
  productDetail: "src/app/products/[slug]/page.tsx",
  categoryDetail: "src/app/categories/[slug]/page.tsx",
  imageComponent: "src/components/ApprovedProductImage.tsx",
  catalogueImage: "src/components/ApprovedCatalogueImage.tsx",
  homepageRegistry: "src/lib/approved-homepage-images.ts",
  productRegistry: "src/lib/approved-product-images.ts",
};

let passed = 0;
let failed = 0;
let reviews = 0;

function check(ok, id, description) {
  console.log(`${ok ? "PASS" : "FAIL"} ${id}: ${description}`);
  if (ok) passed++;
  else failed++;
}

function review(id, description) {
  console.log(`REVIEW ${id}: ${description}`);
  reviews++;
}

function normal(text) {
  return String(text ?? "").replace(/\s+/g, "");
}

function load(label, relativePath) {
  const file = path.join(root, relativePath);
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular file");
    const code = fs.readFileSync(file, "utf8");
    const ast = ts.createSourceFile(
      file, code, ts.ScriptTarget.Latest, true,
      relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const diagnostics = ast.parseDiagnostics;
    check(diagnostics.length === 0, `SOURCE_${label}`, `${relativePath} parses without syntax errors`);
    if (diagnostics.length > 0) {
      for (const d of diagnostics.slice(0, 3)) {
        review("SYNTAX", ts.flattenDiagnosticMessageText(d.messageText, " "));
      }
    }
    return { code, ast };
  } catch {
    check(false, `SOURCE_${label}`, `${relativePath} missing or unreadable`);
    return null;
  }
}

function imports(source, specifier) {
  if (!source) return false;
  return source.ast.statements.some(
    (node) => ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === specifier
  );
}

function jsx(source, componentName) {
  if (!source) return [];
  const found = [];
  const visit = (node) => {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(source.ast) === componentName
    ) found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source.ast);
  return found;
}

function property(source, node, name) {
  if (!source || !node) return null;
  const attr = node.attributes.properties.find(
    (item) => ts.isJsxAttribute(item) && item.name.text === name
  );
  if (!attr || !ts.isJsxAttribute(attr) || !attr.initializer) return null;
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
    return normal(attr.initializer.expression.getText(source.ast));
  }
  return null;
}

function variable(source, name) {
  if (!source) return null;
  for (const statement of source.ast.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const item of statement.declarationList.declarations) {
      if (ts.isIdentifier(item.name) && item.name.text === name) {
        return item.initializer ?? null;
      }
    }
  }
  return null;
}

function members(obj) {
  if (!obj || !ts.isObjectLiteralExpression(obj)) return null;
  const result = new Map();
  for (const item of obj.properties) {
    if (!ts.isPropertyAssignment(item)) return null;
    if (!ts.isIdentifier(item.name) && !ts.isStringLiteral(item.name)) return null;
    const key = item.name.text;
    if (result.has(key)) return null;
    result.set(key, item.initializer);
  }
  return result;
}

function exactKeys(map, expected, id) {
  check(
    map !== null && map.size === expected.length && expected.every((key) => map.has(key)),
    id,
    `Exact expected keys (${expected.length}) with no duplicates or extras`
  );
}

console.log("FILE_112: WEBSITE_PHOTOGRAPHY_INTEGRATION_AUDIT");
console.log("MODE: READ_ONLY | STATIC_TYPESCRIPT_INSPECTION | NO_NETWORK");
console.log(`PROJECT_ROOT: ${root}`);

const records = Object.fromEntries(
  Object.entries(paths).map(([key, p]) => [key, load(key, p)])
);
const {
  homepage, catalogue, productDetail, categoryDetail,
  imageComponent, catalogueImage, homepageRegistry, productRegistry,
} = records;

console.log("\n=== HOMEPAGE ===");
if (homepage) {
  check(imports(homepage, "@/components/ApprovedProductImage"), "H01", "ApprovedProductImage imported");
  check(imports(homepage, "@/lib/approved-homepage-images"), "H02", "Homepage image registry imported");
  const imgs = jsx(homepage, "ApprovedProductImage");
  check(imgs.length === 5, "H03", "Five homepage image component locations");
  const expressions = imgs.map((item) => property(homepage, item, "photo"));
  const expected = [
    "approvedHomepageImages.hero",
    "approvedHomepageImages.company",
    "approvedHomepageImages.categories[category.slug]",
    "approvedHomepageImages.solutions",
    "approvedHomepageImages.knowledge[article.imageKey]",
  ];
  check(expected.every((value) => expressions.includes(value)), "H04", "All five image locations connected to correct registry slots");
  check(jsx(homepage, "section").length === 7, "H05", "Seven homepage sections preserved");
  check(jsx(homepage, "h1").length === 1, "H06", "Single homepage H1 preserved");
  check(!/\banimate-fade-(?:up|in)\b/.test(homepage.code), "H07", "No animation-dependent hero visibility");
}

console.log("\n=== CATALOGUE ===");
if (catalogue) {
  check(imports(catalogue, "@/components/ApprovedCatalogueImage"), "C01", "ApprovedCatalogueImage imported");
  check(imports(catalogue, "@/components/ApprovedProductImage"), "C02", "ApprovedProductImage imported for categories");
  check(imports(catalogue, "@/lib/approved-homepage-images"), "C03", "Category image registry imported");
  const cards = jsx(catalogue, "ApprovedCatalogueImage");
  const cats = jsx(catalogue, "ApprovedProductImage");
  check(cards.length === 1 && property(catalogue, cards[0], "product") === "product" && property(catalogue, cards[0], "variant") === "card", "C04", "ProductCard uses its own product with card image variant");
  const categoryPhoto = property(catalogue, cats[0], "photo") ?? "";
  check(cats.length === 1 && property(catalogue, cats[0], "label") === "category.name" && categoryPhoto.includes("Object.prototype.hasOwnProperty.call(") && categoryPhoto.includes("approvedHomepageImages.categories[") && categoryPhoto.endsWith(":null"), "C05", "CategoryCard uses guarded slug lookup and null fallback");
  check(catalogue.code.includes("filteredProducts.map"), "C06", "Filtered product rendering retained");
  check(/\bfunction\s+ProductCard\s*\(/.test(catalogue.code) && /\bfunction\s+CategoryCard\s*\(/.test(catalogue.code), "C07", "Original product and category card components retained");
}

console.log("\n=== PRODUCT DETAIL ===");
if (productDetail) {
  check(imports(productDetail, "@/components/ApprovedProductImage"), "P01", "Shared product photography component imported");
  check(imports(productDetail, "@/lib/approved-product-images"), "P02", "Product image registry imported");
  check(/getApprovedProductImages\s*\(\s*product\.slug\s*\)/.test(productDetail.code), "P03", "Product-specific gallery lookup uses slug");
  check(/getApprovedProductMainImage\s*\(\s*product\.slug\s*\)/.test(productDetail.code), "P04", "Related cards look up their own main image");
  const photos = jsx(productDetail, "ProductPhotoPlaceholder").map((node) => property(productDetail, node, "photo"));
  check(["gallery.main", "gallery.additional", "gallery.material", "gallery.finish", "photo"].every((value) => photos.includes(value)), "P05", "Four gallery images and related-card image connected");
  check(jsx(productDetail, "ApprovedProductImage").length === 1, "P06", "Shared image display used in wrapper");
  check(jsx(productDetail, "AddToQuote").length === 1, "P07", "Add to Quote component retained");
  check(productDetail.code.includes("product.isDemo") && productDetail.code.includes("Not Verified Inventory"), "P08", "Development-preview warning retained");
  check(productDetail.code.includes("generateMetadata") && productDetail.code.includes("getRelatedProducts") && productDetail.code.includes("SpecificationList"), "P09", "SEO, related-product and specification logic retained");
}

console.log("\n=== CATEGORY DETAIL ===");
if (categoryDetail) {
  check(imports(categoryDetail, "@/components/ApprovedProductImage") && imports(categoryDetail, "@/lib/approved-homepage-images"), "D01", "Approved category photo imports present");
  const imgs = jsx(categoryDetail, "ApprovedProductImage");
  const photos = imgs.map((node) => property(categoryDetail, node, "photo"));
  check(imgs.length === 2 && photos.includes("approvedHomepageImages.categories[category.slug]") && photos.includes("approvedHomepageImages.categories[item.slug]"), "D02", "Hero and related-collection image slots connected");
  check(categoryDetail.code.includes("The Collection") && /approvedHomepageImages\.categories\[category\.slug\]\s*\?/.test(categoryDetail.code), "D03", "Original editorial illustration remains the no-photo fallback");
  check(categoryDetail.code.includes("category.examples.map") && categoryDetail.code.includes("category.considerations.map") && categoryDetail.code.includes("moreCollections.map"), "D04", "Examples, guidance and related categories retained");
  check(
    /export\s+function\s+generateStaticParams\s*\(/.test(categoryDetail.code) &&
    /export\s+async\s+function\s+generateMetadata\s*\(/.test(categoryDetail.code) &&
    /if\s*\(\s*!category\s*\)\s*notFound\s*\(\s*\)/.test(categoryDetail.code) &&
    /<Suspense\b/.test(categoryDetail.code) &&
    /<CategoryDetailContent\b/.test(categoryDetail.code) &&
    !/export\s+const\s+dynamicParams\s*=/.test(categoryDetail.code),
    "D05",
    "Static params, category SEO, 404 guard and Suspense retained"
);
  check(categoryDetail.code.includes("/request-quotation"), "D06", "Quotation navigation retained");
}

console.log("\n=== SHARED PHOTOGRAPHY COMPONENTS ===");
if (imageComponent) {
  check(imports(imageComponent, "next/image") && jsx(imageComponent, "Image").length === 1, "I01", "Next.js optimized Image renderer retained");
  const image = jsx(imageComponent, "Image")[0];
  check(property(imageComponent, image, "alt") === "photo.alt" && property(imageComponent, image, "sizes") === "sizes", "I02", "Approved image uses alt and responsive sizes");
  check(imageComponent.code.includes("isApprovedLocalPath(photo.src)") && /photo\.approved\s*===\s*true/.test(imageComponent.code), "I03", "Local-path and explicit approval safeguards retained");
  check(imageComponent.code.includes("PhotographPlaceholder") && imageComponent.code.includes("motion-reduce:"), "I04", "Placeholder and reduced-motion support retained");
}
if (catalogueImage) {
  check(imports(catalogueImage, "@/lib/approved-product-images"), "I05", "Catalogue image uses product image registry");
  check(/getApprovedProductMainImage\s*\(\s*product\.slug\s*\)/.test(catalogueImage.code), "I06", "Catalogue image looks up the actual product slug");
  const image = jsx(catalogueImage, "ApprovedProductImage")[0];
  check(property(catalogueImage, image, "photo") === "photo" && property(catalogueImage, image, "label") === "product.name", "I07", "Photo and accurate product label forwarded");
}

console.log("\n=== IMAGE REGISTRIES ===");
const categoryKeys = [
  "printing-stationery", "menus-guest-service", "tags-stickers-cards",
  "bags-packaging", "wooden-products", "cane-natural",
  "ceramic-pottery-laksha", "candles-party", "gifts-promotional",
  "laundry-operations",
];
const knowledgeKeys = ["paper-types", "understanding-gsm", "sea-vs-air"];
let placeholderSlots = 0;
let configuredSlots = 0;

if (homepageRegistry) {
  const outer = members(variable(homepageRegistry, "approvedHomepageImages"));
  exactKeys(outer, ["hero", "company", "solutions", "categories", "knowledge"], "R01");
  const cats = members(outer?.get("categories"));
  const knowledge = members(outer?.get("knowledge"));
  exactKeys(cats, categoryKeys, "R02");
  exactKeys(knowledge, knowledgeKeys, "R03");
  if (outer && cats && knowledge) {
    const slots = [
      outer.get("hero"), outer.get("company"), outer.get("solutions"),
      ...cats.values(), ...knowledge.values(),
    ];
    for (const value of slots) {
      if (value?.kind === ts.SyntaxKind.NullKeyword) placeholderSlots++;
      else configuredSlots++;
    }
    check(slots.length === 16, "R04", "Exactly 16 homepage image slots present");
    if (configuredSlots > 0) {
      review("IMAGE_APPROVAL", `${configuredSlots} configured homepage images: run File 103 asset-readiness audit`);
    }
  }
}

if (productRegistry) {
  const reg = variable(productRegistry, "approvedProductImages");
  const isFreeze = reg && ts.isCallExpression(reg) &&
    normal(reg.expression.getText(productRegistry.ast)) === "Object.freeze" &&
    reg.arguments.length === 1;
  const entries = isFreeze ? members(reg.arguments[0]) : null;
  check(entries !== null, "R05", "Approved product registry is a static frozen object");
  if (entries && entries.size > 0) {
    review("PRODUCT_IMAGES", `${entries.size} product galleries configured: verify approvals and assets separately`);
  }
  check(productRegistry.code.includes("getApprovedProductImages") && productRegistry.code.includes("getApprovedProductMainImage"), "R06", "Product gallery and primary-image lookups retained");
}

console.log(`IMAGE_SLOT_SUMMARY: homepage_total=${placeholderSlots + configuredSlots} placeholders=${placeholderSlots} configured=${configuredSlots}`);

console.log("\n=== PROTECTED BACKEND FLAGS ===");
const envPath = path.join(root, ".env.local");
let env = null;
try { env = fs.readFileSync(envPath, "utf8"); }
catch { check(false, "S00", ".env.local missing or unreadable"); }

if (env !== null) {
  for (const [index, key] of [
    "QUOTATION_SUBMISSIONS_ENABLED",
    "QUOTATION_E2E_TEST_MODE",
    "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
  ].entries()) {
    const matches = [...env.matchAll(new RegExp(`^\\s*${key}\\s*=\\s*(.*?)\\s*$`, "gm"))];
    const values = matches.map((m) => m[1].trim().replace(/^(?:"([^"]*)"|'([^']*)')$/, "$1$2").toLowerCase());
    check(values.length === 1 && values[0] === "false", `S0${index + 1}`, `${key} disabled exactly once`);
  }
}

console.log(`AUDIT_SUMMARY: passed=${passed} failed=${failed} reviews=${reviews}`);
console.log(`FILE_112_RESULT: ${failed === 0 ? "PASS" : "FAIL"}`);
console.log("AUDIT_COMPLETE: Source inspection only; no files modified or network requests made.");
if (failed > 0) process.exitCode = 1;
