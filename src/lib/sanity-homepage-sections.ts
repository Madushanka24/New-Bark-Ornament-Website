
import "server-only";

import type { ApprovedPhoto } from
  "@/components/ApprovedProductImage";

/**
 * BARK ORNAMENT — FILE 150 STEP D2C
 *
 * Sanity homepage section image reader.
 *
 * SECURITY:
 * - Server-only execution
 * - Approved published documents only
 * - Explicit draft exclusion
 * - Trusted Sanity CDN URLs
 * - Exact project and dataset validation
 * - Image MIME type validation
 * - Positive asset size validation
 * - Image extension and MIME consistency
 * - Meaningful alternative text
 * - Deterministic duplicate-slot handling
 * - Safe fallback if CMS is unavailable
 *
 * No PostgreSQL access.
 * No quotation submissions.
 * No automatic email sending.
 * No source or homepage UI changes.
 */

const API_VERSION = "2025-02-19";

/**
 * Preserve all 15 established homepage slots.
 *
 * Do not change these identifiers without
 * updating the matching homepage registry
 * and Sanity schema.
 */
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

/**
 * Preserve the public return type.
 *
 * The homepage expects an object keyed by
 * approved section slots, with ApprovedPhoto
 * values matching the existing component.
 */
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
  mimeType?: unknown;
  size?: unknown;
};

type ValidatedSanityImage = SanityImageRecord & {
  src: string;
  alt: string;
  mimeType: string;
  size: number;
};

type SanityQueryResponse = {
  result?: unknown;
};

type SanityConfiguration = Readonly<{
  projectId: string;
  dataset: string;
}>;

/**
 * Supported original asset MIME types.
 *
 * A future image-format policy update
 * should update this list and the
 * extension-to-MIME mapping together.
 */
const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

const IMAGE_EXTENSION_MIME_TYPES:
  Readonly<Record<string, string>> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  };

/**
 * Preserve the approved-image query and
 * deterministic ordering.
 *
 * New fields:
 * - mimeType
 * - size
 *
 * These are retrieved from the referenced
 * Sanity image asset document.
 */
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
    "mimeType": image.asset->mimeType,
    "size": image.asset->size,
    alt
  }
`;

function getSanityConfiguration():
  SanityConfiguration | null {
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

/**
 * Validate an allowed homepage slot.
 *
 * Unknown slots must not be passed
 * through to the homepage.
 */
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

/**
 * Validate the asset MIME type.
 */
function isValidImageMimeType(
  value: unknown
): value is
  (typeof ALLOWED_IMAGE_MIME_TYPES)[number] {
  return (
    typeof value === "string" &&
    (
      ALLOWED_IMAGE_MIME_TYPES as readonly string[]
    ).includes(value)
  );
}

/**
 * Require real positive image size metadata.
 *
 * A maximum byte limit is intentionally
 * NOT enforced in this step, because
 * existing approved image sizes must be
 * reviewed before applying such a policy.
 */
function isValidImageSize(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

/**
 * Validate an original Sanity image URL.
 *
 * Security checks:
 * - HTTPS only
 * - Exact Sanity CDN hostname
 * - No custom port or credentials
 * - No query string or fragment
 * - Exact project and dataset path
 * - Allowed filename extension
 * - Extension consistent with MIME type
 *
 * URL metadata validation does not
 * replace actual file-content scanning.
 */
function isValidSanityImageUrl(
  value: unknown,
  projectId: string,
  dataset: string,
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
      `/images/${projectId}/${dataset}/`;

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

    const extension =
      match[1].toLowerCase();

    return (
      IMAGE_EXTENSION_MIME_TYPES[extension] ===
      mimeType
    );
  } catch {
    return false;
  }
}

/**
 * Validate one approved homepage image.
 *
 * Reject incomplete or unsupported
 * asset metadata without affecting
 * other approved section images.
 */
function isValidSanityImage(
  value: unknown,
  projectId: string,
  dataset: string
): value is ValidatedSanityImage {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const record =
    value as SanityImageRecord;

  if (
    typeof record.src !== "string" ||
    typeof record.alt !== "string" ||
    !isValidImageMimeType(record.mimeType) ||
    !isValidImageSize(record.size)
  ) {
    return false;
  }

  const alt =
    record.alt.trim();

  if (
    alt.length < 10 ||
    alt.length > 250
  ) {
    return false;
  }

  return isValidSanityImageUrl(
    record.src,
    projectId,
    dataset,
    record.mimeType
  );
}

/**
 * Returns zero or more approved section photos.
 *
 * If multiple published approved documents
 * target the same slot, the newest valid
 * image wins.
 *
 * Invalid newer images do not prevent an
 * older valid image from being selected.
 *
 * Missing slots are omitted so existing
 * homepage fallbacks continue to work.
 */
export async function getSanityHomepageSectionImages():
  Promise<SanityHomepageSectionImages> {
  const config =
    getSanityConfiguration();

  if (!config) {
    return {};
  }

  const {
    projectId,
    dataset,
  } = config;

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
      return {};
    }

    const data =
      (await response.json()) as SanityQueryResponse;

    if (!Array.isArray(data.result)) {
      return {};
    }

    const images:
      Partial<
        Record<SanityHomepageSlot, ApprovedPhoto>
      > = {};

    for (const entry of data.result) {
      if (
        !entry ||
        typeof entry !== "object" ||
        Array.isArray(entry)
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

      /**
       * Keep the first valid approved
       * candidate for each slot.
       *
       * The query is already ordered by
       * updated time and document ID.
       */
      if (images[record.slot]) {
        continue;
      }

      images[record.slot] = {
        src:
          record.src as ApprovedPhoto["src"],
        alt:
          record.alt.trim(),
        approved: true,
      };
    }

    return images;
  } catch {
    /**
     * CMS errors must not crash
     * the homepage.
     */
    return {};
  }
}
