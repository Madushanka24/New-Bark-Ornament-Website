
import "server-only";

import type { Product } from "@/lib/products";

import {
  getSanityCatalogCategories,
} from "@/lib/sanity-catalog-categories";

/**
 * BARK ORNAMENT — FILE 150 STEP E6
 *
 * Read-only Sanity Product Management reader.
 *
 * Existing product IDs, URL slugs and product
 * photography associations are preserved.
 *
 * CMS publication requirements:
 * - Published Sanity document
 * - approved == true
 * - status == "published"
 * - isDemo == false
 * - Valid approved category reference
 * - Valid product identity and specifications
 *
 * Local products.ts remains authoritative
 * until the separate website integration.
 *
 * No database writes, quotation submissions
 * or automatic email functionality.
 */

const API_VERSION = "2025-02-19";

const PRODUCT_ID_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const PRODUCT_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_PRODUCTS = 200;

export type SanityCatalogProduct = Product & {
  displayOrder: number | null;
  seoDescription: string | null;
};

type SanityConfig = Readonly<{
  projectId: string;
  dataset: string;
}>;

type QueryResponse = {
  result?: unknown;
};

type ApprovedCategory = Readonly<{
  id: string;
  slug: string;
}>;

/**
 * Project the category relationship as
 * an object rather than trusting a category
 * slug copied into a product document.
 *
 * The related document must also pass the
 * approved-category reader's validation.
 */
const PRODUCT_FIELDS = `
  productId,
  name,
  "slug": slug.current,
  shortDescription,
  description,
  materials,
  sizes,
  finishes,
  customizable,
  featured,
  displayOrder,
  status,
  isDemo,
  seoDescription,
  approved,
  "categoryRecord": category->{
    "_id": _id,
    "_type": _type,
    "id": categoryId,
    "slug": slug.current,
    approved
  }
`;

const PRODUCT_QUERY = `
  *[
    _type == "catalogProduct" &&
    approved == true &&
    status == "published" &&
    isDemo == false &&
    defined(productId) &&
    defined(slug.current) &&
    defined(category._ref) &&
    !(_id in path("drafts.**"))
  ]
  | order(
      displayOrder asc,
      _updatedAt desc,
      _id asc
    )[0...200] {
    ${PRODUCT_FIELDS}
  }
`;

function getConfiguration():
  SanityConfig | null {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
      ?.trim();

  const dataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET
      ?.trim();

  if (
    !projectId ||
    !dataset ||
    !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[a-z0-9_-]+$/.test(dataset)
  ) {
    return null;
  }

  return { projectId, dataset };
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validText(
  value: unknown,
  minimum: number,
  maximum: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= minimum &&
    value.trim().length <= maximum
  );
}

function validProductId(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length >= 3 &&
    value.length <= 64 &&
    PRODUCT_ID_PATTERN.test(value)
  );
}

function validProductSlug(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length >= 2 &&
    value.length <= 100 &&
    PRODUCT_SLUG_PATTERN.test(value)
  );
}

/**
 * Parse the product specification fields.
 *
 * Each value must be genuine structured text.
 * Missing arrays become empty arrays, which
 * matches the existing local Product model.
 */
function parseTextArray(
  value: unknown
): string[] | null {
  if (value === null || value === undefined) {
    return [];
  }

  if (
    !Array.isArray(value) ||
    value.length > 30
  ) {
    return null;
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!validText(item, 1, 250)) {
      return null;
    }

    const text = item.trim();
    const key = text.toLowerCase();

    if (seen.has(key)) {
      return null;
    }

    seen.add(key);
    result.push(text);
  }

  return result;
}

function optionalText(
  value: unknown,
  maximum: number
): string | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value !== "string" ||
    value.trim().length > maximum
  ) {
    return undefined;
  }

  return value.trim() || null;
}

function optionalDisplayOrder(
  value: unknown
): number | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 9999
  ) {
    return undefined;
  }

  return value;
}

/**
 * The referenced document must be an approved
 * category, and its ID and slug must match a
 * category accepted by our category reader.
 *
 * This does not replace a future migration
 * check for duplicate category document IDs.
 */
function resolveCategory(
  value: unknown,
  approvedCategories: ReadonlyMap<
    string,
    ApprovedCategory
  >
): ApprovedCategory | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    value._type !== "catalogCategory" ||
    value.approved !== true ||
    typeof value._id !== "string" ||
    value._id.startsWith("drafts.") ||
    typeof value.id !== "string" ||
    typeof value.slug !== "string"
  ) {
    return null;
  }

  const category = approvedCategories.get(
    value.id
  );

  if (
    !category ||
    category.slug !== value.slug
  ) {
    return null;
  }

  return category;
}

function parseProduct(
  value: unknown,
  approvedCategories: ReadonlyMap<
    string,
    ApprovedCategory
  >
): SanityCatalogProduct | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !validProductId(value.productId) ||
    !validText(value.name, 3, 150) ||
    !validProductSlug(value.slug) ||
    !validText(value.shortDescription, 15, 300) ||
    !validText(value.description, 30, 3000) ||
    value.customizable !== true &&
      value.customizable !== false
  ) {
    return null;
  }

  if (
    value.featured !== true &&
    value.featured !== false
  ) {
    return null;
  }

  if (
    value.approved !== true ||
    value.status !== "published" ||
    value.isDemo !== false
  ) {
    return null;
  }

  const category = resolveCategory(
    value.categoryRecord,
    approvedCategories
  );

  if (!category) {
    return null;
  }

  const materials = parseTextArray(
    value.materials
  );

  const sizes = parseTextArray(
    value.sizes
  );

  const finishes = parseTextArray(
    value.finishes
  );

  const displayOrder = optionalDisplayOrder(
    value.displayOrder
  );

  const seoDescription = optionalText(
    value.seoDescription,
    160
  );

  if (
    materials === null ||
    sizes === null ||
    finishes === null ||
    displayOrder === undefined ||
    seoDescription === undefined
  ) {
    return null;
  }

  return {
    id: value.productId,
    name: value.name.trim(),
    slug: value.slug,
    categorySlug: category.slug,
    shortDescription:
      value.shortDescription.trim(),
    description:
      value.description.trim(),
    materials,
    sizes,
    finishes,
    customizable: value.customizable,
    images: [],
    featured: value.featured,
    status: "published",
    isDemo: false,
    displayOrder,
    seoDescription,
  };
}

async function queryProducts():
  Promise<readonly unknown[]> {
  const config = getConfiguration();

  if (!config) {
    return [];
  }

  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/query/${config.dataset}`
  );

  endpoint.searchParams.set(
    "query",
    PRODUCT_QUERY
  );

  endpoint.searchParams.set(
    "perspective",
    "published"
  );

  try {
    const response = await fetch(
      endpoint,
      {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data =
      (await response.json()) as QueryResponse;

    return Array.isArray(data.result)
      ? data.result
      : [];
  } catch {
    return [];
  }
}

/**
 * Read valid, approved, published products.
 *
 * Product-category references are verified
 * using approved category records.
 *
 * A failed category lookup results in an
 * empty product list rather than allowing
 * products with unverified categories.
 */
export async function getSanityCatalogProducts():
  Promise<readonly SanityCatalogProduct[]> {
  const [
    records,
    categories,
  ] = await Promise.all([
    queryProducts(),
    getSanityCatalogCategories(),
  ]);

  if (
    records.length === 0 ||
    categories.length === 0
  ) {
    return [];
  }

  const categoryMap = new Map<
    string,
    ApprovedCategory
  >(
    categories.map(
      (category) => [
        category.id,
        {
          id: category.id,
          slug: category.slug,
        },
      ]
    )
  );

  const products: SanityCatalogProduct[] = [];

  const usedIds = new Set<string>();
  const usedSlugs = new Set<string>();

  for (const entry of records) {
    const product = parseProduct(
      entry,
      categoryMap
    );

    if (
      !product ||
      usedIds.has(product.id) ||
      usedSlugs.has(product.slug)
    ) {
      continue;
    }

    usedIds.add(product.id);
    usedSlugs.add(product.slug);

    products.push(product);

    if (products.length >= MAX_PRODUCTS) {
      break;
    }
  }

  return products;
}

/**
 * Retrieve a single eligible CMS product
 * using exactly the same validation rules
 * as the product catalogue listing.
 *
 * Existing local product routes remain
 * authoritative until integration.
 */
export async function getSanityCatalogProductBySlug(
  slug: string
): Promise<SanityCatalogProduct | null> {
  if (!validProductSlug(slug)) {
    return null;
  }

  const products =
    await getSanityCatalogProducts();

  return (
    products.find(
      (product) => product.slug === slug
    ) ?? null
  );
}
