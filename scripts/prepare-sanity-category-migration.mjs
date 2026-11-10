
/**
 * BARK ORNAMENT — FILE 150 STEP E7A
 *
 * Read-only migration preparation.
 *
 * Extracts and compares category information
 * from the existing Next.js source files.
 *
 * DOES NOT:
 * - Connect to Sanity
 * - Create or modify CMS documents
 * - Modify the website
 * - Change category IDs or URLs
 * - Publish any category
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();

const PRODUCT_SOURCE = path.join(
  ROOT,
  "src",
  "lib",
  "products.ts"
);

const DETAIL_SOURCE = path.join(
  ROOT,
  "src",
  "app",
  "categories",
  "[slug]",
  "page.tsx"
);

const EXPECTED_COUNT = 10;

function fail(message) {
  throw new Error(
    `CATEGORY MIGRATION AUDIT: ${message}`
  );
}

function unwrap(expression) {
  let current = expression;

  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function readSource(file) {
  if (!fs.existsSync(file)) {
    fail(`Missing source file: ${file}`);
  }

  const content = fs.readFileSync(
    file,
    "utf8"
  );

  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS
  );

  if (source.parseDiagnostics.length > 0) {
    fail(`Unable to parse ${file}`);
  }

  return source;
}

function findArray(source, variableName) {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (
      const declaration of
      statement.declarationList.declarations
    ) {
      if (
        !ts.isIdentifier(declaration.name) ||
        declaration.name.text !== variableName ||
        !declaration.initializer
      ) {
        continue;
      }

      const expression = unwrap(
        declaration.initializer
      );

      if (!ts.isArrayLiteralExpression(expression)) {
        fail(
          `${variableName} is not an array literal`
        );
      }

      return expression.elements;
    }
  }

  fail(`Cannot find ${variableName}`);
}

function getProperty(objectNode, fieldName) {
  const object = unwrap(objectNode);

  if (!ts.isObjectLiteralExpression(object)) {
    fail("Expected an object literal");
  }

  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const name = property.name;

    const key = (
      ts.isIdentifier(name) ||
      ts.isStringLiteral(name)
    )
      ? name.text
      : null;

    if (key === fieldName) {
      return unwrap(property.initializer);
    }
  }

  return undefined;
}

function readString(object, field) {
  const expression = getProperty(
    object,
    field
  );

  if (
    !expression ||
    (
      !ts.isStringLiteral(expression) &&
      !ts.isNoSubstitutionTemplateLiteral(expression)
    )
  ) {
    fail(`Invalid string field: ${field}`);
  }

  return expression.text;
}

function readNumberString(object, field) {
  const expression = getProperty(
    object,
    field
  );

  if (
    expression &&
    ts.isNumericLiteral(expression)
  ) {
    return Number(expression.text);
  }

  return Number(readString(object, field));
}

function readStringArray(object, field) {
  const expression = getProperty(
    object,
    field
  );

  if (
    !expression ||
    !ts.isArrayLiteralExpression(expression)
  ) {
    fail(`Invalid array field: ${field}`);
  }

  return expression.elements.map(
    (item) => {
      const value = unwrap(item);

      if (!ts.isStringLiteral(value)) {
        fail(
          `${field} contains a non-string value`
        );
      }

      return value.text;
    }
  );
}

function validateString(
  value,
  field,
  min,
  max
) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  ) {
    fail(
      `Invalid ${field}: ${String(value)}`
    );
  }
}

function main() {
  const productSource = readSource(
    PRODUCT_SOURCE
  );

  const detailSource = readSource(
    DETAIL_SOURCE
  );

  const registry = findArray(
    productSource,
    "productCategories"
  );

  const collections = findArray(
    detailSource,
    "collections"
  );

  if (
    registry.length !== EXPECTED_COUNT ||
    collections.length !== EXPECTED_COUNT
  ) {
    fail(
      `Expected ${EXPECTED_COUNT} categories. ` +
      `Registry: ${registry.length}; ` +
      `detail pages: ${collections.length}`
    );
  }

  const detailsBySlug = new Map();

  for (const collection of collections) {
    const slug = readString(
      collection,
      "slug"
    );

    if (detailsBySlug.has(slug)) {
      fail(`Duplicate editorial slug: ${slug}`);
    }

    detailsBySlug.set(
      slug,
      collection
    );
  }

  const usedIds = new Set();
  const usedSlugs = new Set();

  const documents = [];

  registry.forEach((category, index) => {
    const id = readString(
      category,
      "id"
    );

    const name = readString(
      category,
      "name"
    );

    const slug = readString(
      category,
      "slug"
    );

    const registryDescription =
      readString(
        category,
        "description"
      );

    const expectedId =
      `cat-${String(index + 1).padStart(3, "0")}`;

    if (id !== expectedId) {
      fail(
        `Unexpected ID at position ${index + 1}: ${id}`
      );
    }

    if (
      usedIds.has(id) ||
      usedSlugs.has(slug)
    ) {
      fail(
        `Duplicate ID or slug: ${id}, ${slug}`
      );
    }

    usedIds.add(id);
    usedSlugs.add(slug);

    const detail =
      detailsBySlug.get(slug);

    if (!detail) {
      fail(
        `No category detail for ${slug}`
      );
    }

    const detailName =
      readString(detail, "name");

    const detailNumber =
      readNumberString(detail, "number");

    if (
      detailName !== name ||
      detailNumber !== index + 1
    ) {
      fail(
        `Category identity mismatch: ${id}`
      );
    }

    const description =
      readString(detail, "description");

    const eyebrow =
      readString(detail, "eyebrow");

    const introduction =
      readString(
        detail,
        "introduction"
      );

    const examples =
      readStringArray(
        detail,
        "examples"
      );

    const considerations =
      readStringArray(
        detail,
        "considerations"
      );

    validateString(name, "name", 3, 120);
    validateString(
      description,
      "description",
      30,
      600
    );
    validateString(
      eyebrow,
      "eyebrow",
      1,
      60
    );
    validateString(
      introduction,
      "introduction",
      1,
      220
    );

    validateString(
      registryDescription,
      "SEO description",
      1,
      160
    );

    if (
      examples.length > 12 ||
      considerations.length > 12
    ) {
      fail(
        `Too many editorial items: ${id}`
      );
    }

    documents.push({
      _id: `catalogCategory.${id}`,
      _type: "catalogCategory",

      categoryId: id,
      name,

      slug: {
        _type: "slug",
        current: slug,
      },

      description,
      eyebrow,
      introduction,
      examples,
      considerations,

      displayOrder: index + 1,

      seoDescription:
        registryDescription,

      approved: false,
    });
  });

  console.error(
    `PASS: ${documents.length} categories verified`
  );

  console.error(
    "PASS: IDs, slugs, names and order match"
  );

  console.error(
    "PASS: Editorial fields validated"
  );

  console.error(
    "PASS: Approval remains false"
  );

  console.error(
    "PASS: No Sanity API access or writes"
  );

  console.log(
    JSON.stringify(documents, null, 2)
  );
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
