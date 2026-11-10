
import "server-only";

/**
 * BARK ORNAMENT — FILE 150 STEP D2B
 *
 * Read-only Sanity homepage hero reader.
 *
 * Requirements:
 * - Public, published Sanity documents
 * - Explicit editorial approval
 * - Valid image asset reference
 * - Trusted HTTPS Sanity CDN URL
 * - Image MIME type and size metadata
 * - Meaningful alternative text
 * - Deterministic candidate selection
 * - Safe fallback if CMS data is unavailable
 *
 * No API write token, PostgreSQL access,
 * quotation submission or email sending.
 */

export type SanityHomepageHero = Readonly<{
  src: string;
  alt: string;
}>;

type QueryResponse = {
  result?: unknown;
};

type SanityConfiguration = Readonly<{
  projectId: string;
  dataset: string;
}>;

const API_VERSION = "2025-02-19";

/**
 * Query a limited set of approved candidates.
 *
 * Validate them individually so a malformed
 * newest record does not hide an otherwise
 * valid older approved hero.
 */
const HERO_QUERY = `
  *[
    _type == "homepageHeroImage" &&
    approved == true &&
    !(_id in path("drafts.**")) &&
    defined(image.asset)
  ]
  | order(_updatedAt desc, _id asc)[0...10] {
    "src": image.asset->url,
    "mimeType": image.asset->mimeType,
    "size": image.asset->size,
    alt
  }
`;

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

function getConfiguration():
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

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validImageMimeType(
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

function validImageSize(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

/**
 * Validate both the source CDN and
 * the filename extension.
 *
 * The image URL must belong to our exact
 * configured Sanity project and dataset.
 */
function validImageUrl(
  value: unknown,
  config: SanityConfiguration,
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

    const extension = match[1].toLowerCase();

    const expectedMimeType: Record<
      string,
      string
    > = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      avif: "image/avif",
    };

    return (
      expectedMimeType[extension] === mimeType
    );
  } catch {
    return false;
  }
}

/**
 * Validate one projected Sanity hero
 * before returning any public image URL.
 */
function parseHero(
  value: unknown,
  config: SanityConfiguration
): SanityHomepageHero | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.alt !== "string" ||
    value.alt.trim().length < 10 ||
    value.alt.trim().length > 250 ||
    !validImageMimeType(value.mimeType) ||
    !validImageSize(value.size) ||
    !validImageUrl(
      value.src,
      config,
      value.mimeType
    )
  ) {
    return null;
  }

  return {
    src: value.src,
    alt: value.alt.trim(),
  };
}

/**
 * Read the latest valid approved hero.
 *
 * The returned shape stays unchanged,
 * preserving the existing homepage UI.
 */
export async function getSanityHomepageHero():
  Promise<SanityHomepageHero | null> {
  const config = getConfiguration();

  if (!config) {
    return null;
  }

  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/query/${config.dataset}`
  );

  endpoint.searchParams.set(
    "query",
    HERO_QUERY
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
      return null;
    }

    const data =
      (await response.json()) as QueryResponse;

    if (!Array.isArray(data.result)) {
      return null;
    }

    for (const candidate of data.result) {
      const hero = parseHero(
        candidate,
        config
      );

      if (hero) {
        return hero;
      }
    }

    // Preserve the existing homepage
    // fallback if no candidate is valid.
    return null;
  } catch {
    // CMS failures must not break the homepage.
    return null;
  }
}
