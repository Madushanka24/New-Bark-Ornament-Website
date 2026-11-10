
import "server-only";

/**
 * BARK ORNAMENT — FILE 150 STEP E5
 *
 * Read-only Sanity Product Category reader.
 *
 * - Published and approved categories only
 * - Validates category IDs and URL slugs
 * - Validates category editorial content
 * - Validates optional Sanity cover photographs
 * - Rejects duplicate IDs and slugs
 * - Preserves deterministic display ordering
 * - Returns empty results on CMS failure
 *
 * Does not replace src/lib/products.ts.
 * Does not publish CMS categories.
 * Does not access PostgreSQL.
 * Does not submit quotations or emails.
 */

const API_VERSION = "2025-02-19";

const CATEGORY_ID_PATTERN =
  /^cat-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const IMAGE_MIME_TYPES: Readonly<
  Record<string, string>
> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export type SanityCatalogCategory = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string;
  eyebrow: string | null;
  introduction: string | null;
  examples: readonly string[];
  considerations: readonly string[];
  displayOrder: number;
  seoDescription: string | null;
  image: string | null;
  cover: Readonly<{
    src: string;
    alt: string;
  }> | null;
}>;

type SanityConfig = Readonly<{
  projectId: string;
  dataset: string;
}>;

type QueryResponse = {
  result?: unknown;
};

const CATEGORY_FIELDS = `
  categoryId,
  name,
  "slug": slug.current,
  description,
  eyebrow,
  introduction,
  examples,
  considerations,
  displayOrder,
  seoDescription,
  "cover": select(
    defined(cover.image.asset) => {
      "src": cover.image.asset->url,
      "mimeType": cover.image.asset->mimeType,
      "size": cover.image.asset->size,
      "alt": cover.alt
    },
    null
  )
`;

const CATEGORY_QUERY = `
  *[
    _type == "catalogCategory" &&
    approved == true &&
    !(_id in path("drafts.**"))
  ]
  | order(displayOrder asc, _updatedAt desc, _id asc)[0...100] {
    ${CATEGORY_FIELDS}
  }
`;

function getConfig(): SanityConfig | null {
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

  return {
    projectId,
    dataset,
  };
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

function isText(
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

function validCategoryId(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length <= 64 &&
    CATEGORY_ID_PATTERN.test(value)
  );
}

function validSlug(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 100 &&
    SLUG_PATTERN.test(value)
  );
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

function parseTextArray(
  value: unknown
): readonly string[] | null {
  if (value === null || value === undefined) {
    return [];
  }

  if (
    !Array.isArray(value) ||
    value.length > 12
  ) {
    return null;
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (
      !isText(item, 1, 250)
    ) {
      return null;
    }

    const text = item.trim();
    const key = text.toLocaleLowerCase("en");

    if (seen.has(key)) {
      return null;
    }

    seen.add(key);
    result.push(text);
  }

  return result;
}

function validImageUrl(
  value: unknown,
  config: SanityConfig,
  mimeType: string
): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.hostname !== "cdn.sanity.io" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return false;
    }

    const prefix =
      `/images/${config.projectId}/${config.dataset}/`;

    if (!url.pathname.startsWith(prefix)) {
      return false;
    }

    const filename =
      url.pathname.slice(prefix.length);

    const match = filename.match(
      /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(jpg|jpeg|png|webp|avif)$/i
    );

    if (!match) {
      return false;
    }

    return (
      IMAGE_MIME_TYPES[match[1].toLowerCase()] ===
      mimeType
    );
  } catch {
    return false;
  }
}

function parseCover(
  value: unknown,
  config: SanityConfig
): SanityCatalogCategory["cover"] | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (
    !isText(value.alt, 10, 250) ||
    typeof value.mimeType !== "string" ||
    !Object.values(IMAGE_MIME_TYPES).includes(
      value.mimeType
    ) ||
    typeof value.size !== "number" ||
    !Number.isSafeInteger(value.size) ||
    value.size <= 0 ||
    !validImageUrl(
      value.src,
      config,
      value.mimeType
    )
  ) {
    return undefined;
  }

  return {
    src: value.src,
    alt: value.alt.trim(),
  };
}

function parseCategory(
  value: unknown,
  config: SanityConfig
): SanityCatalogCategory | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !validCategoryId(value.categoryId) ||
    !isText(value.name, 3, 120) ||
    !validSlug(value.slug) ||
    !isText(value.description, 30, 600) ||
    typeof value.displayOrder !== "number" ||
    !Number.isInteger(value.displayOrder) ||
    value.displayOrder < 1 ||
    value.displayOrder > 999
  ) {
    return null;
  }

  const eyebrow =
    optionalText(value.eyebrow, 60);

  const introduction =
    optionalText(value.introduction, 220);

  const seoDescription =
    optionalText(value.seoDescription, 160);

  const examples =
    parseTextArray(value.examples);

  const considerations =
    parseTextArray(value.considerations);

  const cover =
    parseCover(value.cover, config);

  if (
    eyebrow === undefined ||
    introduction === undefined ||
    seoDescription === undefined ||
    examples === null ||
    considerations === null ||
    cover === undefined
  ) {
    return null;
  }

  return {
    id: value.categoryId,
    name: value.name.trim(),
    slug: value.slug,
    description: value.description.trim(),
    eyebrow,
    introduction,
    examples,
    considerations,
    displayOrder: value.displayOrder,
    seoDescription,
    image: cover?.src ?? null,
    cover,
  };
}

/**
 * Read all eligible Sanity categories.
 *
 * Existing local categories remain
 * authoritative until a later integration.
 */
export async function getSanityCatalogCategories():
  Promise<readonly SanityCatalogCategory[]> {
  const config = getConfig();

  if (!config) {
    return [];
  }

  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/query/${config.dataset}`
  );

  endpoint.searchParams.set(
    "query",
    CATEGORY_QUERY
  );

  endpoint.searchParams.set(
    "perspective",
    "published"
  );

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data =
      (await response.json()) as QueryResponse;

    if (!Array.isArray(data.result)) {
      return [];
    }

    const categories: SanityCatalogCategory[] = [];

    const usedIds = new Set<string>();
    const usedSlugs = new Set<string>();

    for (const entry of data.result) {
      const category = parseCategory(
        entry,
        config
      );

      if (
        !category ||
        usedIds.has(category.id) ||
        usedSlugs.has(category.slug)
      ) {
        continue;
      }

      usedIds.add(category.id);
      usedSlugs.add(category.slug);
      categories.push(category);
    }

    return categories;
  } catch {
    // CMS errors must not break the website.
    return [];
  }
}

/**
 * Retrieve one eligible category by slug.
 *
 * Uses the same complete validation
 * and duplicate handling as the list.
 */
export async function getSanityCatalogCategoryBySlug(
  slug: string
): Promise<SanityCatalogCategory | null> {
  if (!validSlug(slug)) {
    return null;
  }

  const categories =
    await getSanityCatalogCategories();

  return (
    categories.find(
      (category) => category.slug === slug
    ) ?? null
  );
}
