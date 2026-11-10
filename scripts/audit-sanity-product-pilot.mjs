
/**
 * BARK ORNAMENT — FILE 150 STEP E7I
 *
 * Authenticated read-only Product pilot audit.
 *
 * Checks:
 * - Product identity and publication flags
 * - Referenced Sanity category
 * - Product Photography ID association
 *
 * Does not create, update, approve,
 * publish or delete any documents.
 */

const API_VERSION = "2025-02-19";

function fail(message) {
  throw new Error(`FILE 150 E7I: ${message}`);
}

function getProductId() {
  const args = process.argv.slice(2);

  if (
    args.length !== 2 ||
    args[0] !== "--product-id" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(args[1])
  ) {
    fail(
      "Usage: node audit-sanity-product-pilot.mjs " +
      "--product-id <existing-product-id>"
    );
  }

  return args[1];
}

function getConfig() {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();

  const dataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();

  const token =
    process.env.SANITY_AUDIT_READ_TOKEN?.trim();

  if (
    !projectId ||
    !dataset ||
    !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[a-z0-9_-]+$/.test(dataset)
  ) {
    fail("Invalid Sanity project configuration");
  }

  if (!token) {
    fail("Read-only audit token is missing");
  }

  return { projectId, dataset, token };
}

const QUERY = `{
  "products": *[
    _type == "catalogProduct" &&
    productId == $productId
  ] | order(_id asc)[0...100] {
    _id,
    _type,
    productId,
    name,
    "slug": slug.current,
    status,
    isDemo,
    approved,
    "categoryRef": category._ref,
    "category": category->{
      _id,
      _type,
      categoryId,
      name,
      "slug": slug.current,
      approved
    }
  },

  "photography": *[
    _type == "productPhotography" &&
    productId == $productId
  ] | order(_id asc)[0...100] {
    _id,
    productId,
    approved
  }
}`;

async function readSanity(config, productId) {
  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/query/${config.dataset}`
  );

  endpoint.searchParams.set("query", QUERY);
  endpoint.searchParams.set(
    "$productId",
    JSON.stringify(productId)
  );
  endpoint.searchParams.set(
    "perspective",
    "raw"
  );

  let response;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.token}`,
      },
    });
  } catch {
    fail("Sanity read request failed");
  }

  if (!response.ok) {
    fail(
      `Sanity returned HTTP ${response.status}`
    );
  }

  const payload = await response.json();

  if (
    !payload?.result ||
    !Array.isArray(payload.result.products) ||
    !Array.isArray(payload.result.photography)
  ) {
    fail("Unexpected Sanity response");
  }

  return payload.result;
}

function inspectProduct(productId, products) {
  if (products.length !== 1) {
    fail(
      `Expected one pilot document; found ${products.length}. ` +
      "Review drafts and duplicate records."
    );
  }

  const product = products[0];

  if (
    typeof product._id !== "string" ||
    !product._id.startsWith("drafts.")
  ) {
    fail(
      "Pilot must remain an unpublished draft."
    );
  }

  if (product.productId !== productId) {
    fail("Product ID mismatch");
  }

  if (
    typeof product.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      product.slug
    )
  ) {
    fail("Invalid product slug");
  }

  if (
    product.status !== "draft" ||
    product.isDemo !== true ||
    product.approved !== false
  ) {
    fail(
      "Pilot publication safeguards do not match."
    );
  }

  const category = product.category;

  if (
    !category ||
    category._type !== "catalogCategory" ||
    typeof category.categoryId !== "string" ||
    typeof category.slug !== "string" ||
    typeof product.categoryRef !== "string" ||
    (
      product.categoryRef !== category._id &&
      product.categoryRef !==
        `drafts.${category._id}`
    )
  ) {
    fail("Product category reference is unresolved");
  }

  console.log("PRODUCT PILOT");
  console.log(`ID: ${product.productId}`);
  console.log(`Slug: ${product.slug}`);
  console.log(`Document: ${product._id}`);
  console.log(`Category ID: ${category.categoryId}`);
  console.log(`Category slug: ${category.slug}`);
  console.log(`Category approved: ${category.approved}`);

  console.log(
    "PASS: Draft and publication safeguards verified"
  );

  console.log(
    "PASS: Category reference resolved"
  );
}

function inspectPhotography(productId, photography) {
  const matching = photography.filter(
    (record) => record?.productId === productId
  );

  if (matching.length === 0) {
    console.log(
      "PHOTOGRAPHY MATCH: NOT FOUND BY PRODUCT ID"
    );

    console.log(
      "Review the existing Product Photography " +
      "schema and records before public integration."
    );

    return;
  }

  console.log(
    `PHOTOGRAPHY MATCHES: ${matching.length}`
  );

  for (const record of matching) {
    console.log(
      `- ${record._id} | approved=${record.approved}`
    );
  }

  console.log(
    "Product ID association found. " +
    "Photo roles and gallery ordering still " +
    "require separate verification."
  );
}

async function main() {
  const productId = getProductId();
  const config = getConfig();

  console.log("MODE: READ ONLY");
  console.log(`PROJECT: ${config.projectId}`);
  console.log(`DATASET: ${config.dataset}`);

  const result = await readSanity(
    config,
    productId
  );

  inspectProduct(
    productId,
    result.products
  );

  inspectPhotography(
    productId,
    result.photography
  );

  console.log(
    "NO SANITY DOCUMENTS MODIFIED"
  );

  console.log(
    "FILE 150 E7I: PILOT IDENTITY AUDIT PASSED"
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exitCode = 1;
});
