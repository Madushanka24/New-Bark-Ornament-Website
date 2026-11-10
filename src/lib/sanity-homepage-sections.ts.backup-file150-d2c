
import "server-only";

import type { ApprovedPhoto } from
  "@/components/ApprovedProductImage";

/**
 * BARK ORNAMENT — FILE 144 STEP B
 *
 * Sanity homepage section image reader.
 *
 * Does not change the homepage or hero reader.
 * Does not access PostgreSQL.
 * Does not send emails or quotations.
 */

const API_VERSION = "2025-02-19";

const HOMEPAGE_SLOTS = [
  "company",
  "solutions",
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
  "paper-types",
  "understanding-gsm",
  "sea-vs-air",
] as const;

export type SanityHomepageSlot =
  (typeof HOMEPAGE_SLOTS)[number];

export type SanityHomepageSectionImages =
  Readonly<
    Partial<
      Record<SanityHomepageSlot, ApprovedPhoto>
    >
  >;

type SanityImageRecord = {
  slot?: unknown;
  src?: unknown;
  alt?: unknown;
};

type SanityQueryResponse = {
  result?: unknown;
};

const SECTION_QUERY = `
  *[
    _type == "homepageSectionImage" &&
    approved == true &&
    !(_id in path("drafts.**")) &&
    defined(image.asset)
  ]
  | order(_updatedAt desc, _id asc) {
    slot,
    "src": image.asset->url,
    alt
  }
`;

function getSanityConfiguration() {
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

function isHomepageSlot(
  value: unknown
): value is SanityHomepageSlot {
  return (
    typeof value === "string" &&
    (
      HOMEPAGE_SLOTS as readonly string[]
    ).includes(value)
  );
}

function isValidSanityImage(
  value: unknown,
  projectId: string,
  dataset: string
): value is SanityImageRecord & {
  src: string;
  alt: string;
} {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const record =
    value as SanityImageRecord;

  if (
    typeof record.src !== "string" ||
    typeof record.alt !== "string"
  ) {
    return false;
  }

  const alt = record.alt.trim();

  if (alt.length < 10 || alt.length > 250) {
    return false;
  }

  try {
    const url = new URL(record.src);

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
      `/images/${projectId}/${dataset}/`;

    if (!url.pathname.startsWith(prefix)) {
      return false;
    }

    const filename =
      url.pathname.slice(prefix.length);

    return /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:jpg|jpeg|png|webp|avif)$/i
      .test(filename);
  } catch {
    return false;
  }
}

/**
 * Returns zero or more approved section photos.
 *
 * If multiple approved published documents
 * target one slot, the most recently updated
 * valid document wins. Document ID breaks ties.
 *
 * A missing slot is omitted from the result.
 * The homepage will supply its local fallback.
 */
export async function getSanityHomepageSectionImages():
  Promise<SanityHomepageSectionImages> {

  const config = getSanityConfiguration();

  if (!config) {
    return {};
  }

  const { projectId, dataset } = config;

  const endpoint = new URL(
    `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}`
  );

  endpoint.searchParams.set(
    "query",
    SECTION_QUERY
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
      return {};
    }

    const data =
      (await response.json()) as SanityQueryResponse;

    if (!Array.isArray(data.result)) {
      return {};
    }

    const images:
      Partial<Record<SanityHomepageSlot, ApprovedPhoto>> =
      {};

    for (const entry of data.result) {
      if (
        !entry ||
        typeof entry !== "object"
      ) {
        continue;
      }

      const record =
        entry as SanityImageRecord;

      if (
        !isHomepageSlot(record.slot) ||
        !isValidSanityImage(
          record,
          projectId,
          dataset
        )
      ) {
        continue;
      }

      // Keep the first valid approved result
      // from the deterministic query order.
      if (images[record.slot]) {
        continue;
      }

      images[record.slot] = {
        src: record.src as ApprovedPhoto["src"],
        alt: record.alt.trim(),
        approved: true,
      };
    }

    return images;
  } catch {
    // CMS errors must not crash the homepage.
    return {};
  }
}
