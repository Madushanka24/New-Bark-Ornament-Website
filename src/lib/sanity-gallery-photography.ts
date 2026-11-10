
import "server-only";

import type { ApprovedPhoto } from
  "@/components/ApprovedProductImage";

/**
 * BARK ORNAMENT — FILE 148 STEP C
 *
 * Sanity Gallery Photography Reader
 *
 * Retrieves approved, published photographs
 * for the existing Gallery page.
 *
 * This file does not modify:
 * - Gallery layout or editorial content
 * - Product or category registries
 * - Quotation basket or submission controls
 * - Existing homepage photography
 */

const API_VERSION = "2025-02-19";

const GALLERY_COLLECTIONS = [
  "printing",
  "menus",
  "packaging",
  "woodcraft",
  "artisan",
  "gifting",
] as const;

const GALLERY_POSITIONS = [
  "first",
  "second",
] as const;

export type GalleryCollectionId =
  (typeof GALLERY_COLLECTIONS)[number];

export type GalleryImagePosition =
  (typeof GALLERY_POSITIONS)[number];

export type SanityGalleryPhotography =
  Readonly<
    Partial<
      Record<
        GalleryCollectionId,
        Readonly<
          Partial<
            Record<
              GalleryImagePosition,
              ApprovedPhoto
            >
          >
        >
      >
    >
  >;

type SanityGalleryRecord = {
  collectionId?: unknown;
  itemSlot?: unknown;
  src?: unknown;
  alt?: unknown;
};

type SanityQueryResponse = {
  result?: unknown;
};

/**
 * The query returns only approved
 * documents in a stable order.
 *
 * The published perspective is applied
 * explicitly in the API request.
 */
const GALLERY_QUERY = `
  *[
    _type == "galleryPhotography" &&
    approved == true &&
    !(_id in path("drafts.**")) &&
    defined(image.asset)
  ]
  | order(_updatedAt desc, _id asc) {
    collectionId,
    itemSlot,
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

function isGalleryCollection(
  value: unknown
): value is GalleryCollectionId {
  return (
    typeof value === "string" &&
    (
      GALLERY_COLLECTIONS as readonly string[]
    ).includes(value)
  );
}

function isGalleryPosition(
  value: unknown
): value is GalleryImagePosition {
  return (
    typeof value === "string" &&
    (
      GALLERY_POSITIONS as readonly string[]
    ).includes(value)
  );
}

/**
 * Accept only image assets from the
 * configured Sanity project and dataset.
 */
function isValidSanityImage(
  value: unknown,
  projectId: string,
  dataset: string
): value is SanityGalleryRecord & {
  src: ApprovedPhoto["src"];
  alt: string;
} {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const record = value as SanityGalleryRecord;

  if (
    typeof record.src !== "string" ||
    typeof record.alt !== "string"
  ) {
    return false;
  }

  const alt = record.alt.trim();

  if (
    alt.length < 10 ||
    alt.length > 250
  ) {
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
 * Returns up to 12 approved photographs.
 *
 * Each collection has:
 * - first
 * - second
 *
 * If duplicate approved documents exist
 * for the same position, the newest valid
 * document wins. Document ID breaks ties.
 *
 * Missing positions are omitted.
 *
 * The Gallery page remains responsible
 * for rendering its existing placeholder
 * when no approved photograph exists.
 */
export async function getSanityGalleryPhotography():
  Promise<SanityGalleryPhotography> {

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
    GALLERY_QUERY
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

    const images: Partial<
      Record<
        GalleryCollectionId,
        Partial<
          Record<
            GalleryImagePosition,
            ApprovedPhoto
          >
        >
      >
    > = {};

    for (const entry of data.result) {
      if (
        typeof entry !== "object" ||
        entry === null
      ) {
        continue;
      }

      const record =
        entry as SanityGalleryRecord;

      if (
        !isGalleryCollection(
          record.collectionId
        ) ||
        !isGalleryPosition(
          record.itemSlot
        ) ||
        !isValidSanityImage(
          record,
          projectId,
          dataset
        )
      ) {
        continue;
      }

      const collectionId =
        record.collectionId;

      const position =
        record.itemSlot;

      if (!images[collectionId]) {
        images[collectionId] = {};
      }

      const collection =
        images[collectionId];

      if (!collection || collection[position]) {
        continue;
      }

      collection[position] = {
        src: record.src,
        alt: record.alt.trim(),
        approved: true,
      };
    }

    return images;
  } catch {
    // Sanity failures must not crash
    // the Gallery or affect navigation.
    return {};
  }
}
