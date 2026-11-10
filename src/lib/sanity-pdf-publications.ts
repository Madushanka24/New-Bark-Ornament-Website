
import "server-only";

/**
 * BARK ORNAMENT — FILE 150 STEP D1
 *
 * Read-only Sanity PDF Publications reader.
 *
 * Public website eligibility requires:
 * - Published Sanity document
 * - Explicit approved == true
 * - Supported resource category
 * - Valid publication metadata
 * - Genuine Sanity PDF asset metadata
 * - Valid HTTPS CDN URL for this dataset
 * - Positive file size within category limit
 *
 * IMPORTANT:
 * This controls website display.
 * It does not make public Sanity assets private.
 */

const API_VERSION = "2025-02-19";

const MEBIBYTE = 1024 * 1024;

const RESOURCE_CATEGORIES = [
  "knowledge-series",
  "product-catalogues",
  "company-profiles",
  "technical-guides",
] as const;

export type PdfResourceCategory =
  (typeof RESOURCE_CATEGORIES)[number];

/**
 * Maximum public website PDF sizes.
 *
 * These are Bark Ornament application limits,
 * not Sanity platform upload limits.
 */
const MAX_PDF_BYTES: Readonly<
  Record<PdfResourceCategory, number>
> = {
  "knowledge-series": 25 * MEBIBYTE,
  "product-catalogues": 50 * MEBIBYTE,
  "company-profiles": 25 * MEBIBYTE,
  "technical-guides": 25 * MEBIBYTE,
};

export type SanityPdfPublication = Readonly<{
  id: string;
  title: string;
  category: PdfResourceCategory;
  edition: string | null;
  description: string;
  publishedAt: string;
  href: string;
  mimeType: "application/pdf";
  fileSizeBytes: number;
  fileSizeLabel: string;
  cover: Readonly<{
    src: string;
    alt: string;
  }> | null;
}>;

type Config = {
  projectId: string;
  dataset: string;
};

type QueryResponse = {
  result?: unknown;
};

const PDF_QUERY = `
  *[
    _type == "knowledgePublication" &&
    approved == true &&
    defined(pdfFile.asset) &&
    defined(publishedAt)
  ]
  | order(publishedAt desc, _id asc)[0...100] {
    _id,
    title,
    category,
    edition,
    description,
    publishedAt,
    "pdf": pdfFile.asset->{
      url,
      mimeType,
      size
    },
    "cover": select(
      defined(cover.image.asset) => {
        "src": cover.image.asset->url,
        "alt": cover.alt
      },
      null
    )
  }
`;

function getConfig(): Config | null {
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

function isCategory(
  value: unknown
): value is PdfResourceCategory {
  return (
    typeof value === "string" &&
    (
      RESOURCE_CATEGORIES as readonly string[]
    ).includes(value)
  );
}

function isValidDate(
  value: unknown
): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00Z`
  );

  return (
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function optionalEdition(
  value: unknown
): string | null | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value !== "string" ||
    value.trim().length > 80
  ) {
    return undefined;
  }

  return value.trim() || null;
}

/**
 * Ensure the asset URL belongs to the
 * configured Sanity project and dataset.
 *
 * File assets use /files/.
 * Image assets use /images/.
 */
function validAssetUrl(
  value: unknown,
  config: Config,
  assetType: "files" | "images"
): value is string {
  if (
    typeof value !== "string"
  ) {
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
      `/${assetType}/${config.projectId}/${config.dataset}/`;

    if (
      !url.pathname.startsWith(prefix)
    ) {
      return false;
    }

    const filename =
      url.pathname.slice(prefix.length);

    if (
      assetType === "files"
    ) {
      return /^[a-zA-Z0-9][a-zA-Z0-9_.-]*\.pdf$/i
        .test(filename);
    }

    return /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:jpg|jpeg|png|webp|avif)$/i
      .test(filename);
  } catch {
    return false;
  }
}

function formatFileSize(
  bytes: number
): string {
  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes < MEBIBYTE
  ) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / MEBIBYTE).toFixed(1)} MB`;
}

/**
 * Check a verified PDF asset size against
 * its resource category limit.
 *
 * Equal-to-limit is permitted.
 * Anything larger is rejected.
 */
function isAllowedPdfSize(
  bytes: unknown,
  category: PdfResourceCategory
): bytes is number {
  return (
    typeof bytes === "number" &&
    Number.isSafeInteger(bytes) &&
    bytes > 0 &&
    bytes <= MAX_PDF_BYTES[category]
  );
}

function parsePublication(
  value: unknown,
  config: Config
): SanityPdfPublication | null {
  if (
    !isRecord(value)
  ) {
    return null;
  }

  if (
    !isText(value._id, 1, 200) ||
    value._id.startsWith("drafts.") ||
    !isText(value.title, 5, 180) ||
    !isCategory(value.category) ||
    !isText(value.description, 30, 500) ||
    !isValidDate(value.publishedAt)
  ) {
    return null;
  }

  const category = value.category;

  const edition =
    optionalEdition(value.edition);

  if (
    edition === undefined
  ) {
    return null;
  }

  if (
    !isRecord(value.pdf)
  ) {
    return null;
  }

  if (
    value.pdf.mimeType !== "application/pdf" ||
    !validAssetUrl(
      value.pdf.url,
      config,
      "files"
    ) ||
    !isAllowedPdfSize(
      value.pdf.size,
      category
    )
  ) {
    return null;
  }

  let cover:
    SanityPdfPublication["cover"] = null;

  if (
    value.cover !== null &&
    value.cover !== undefined
  ) {
    if (
      !isRecord(value.cover)
    ) {
      return null;
    }

    if (
      !validAssetUrl(
        value.cover.src,
        config,
        "images"
      ) ||
      !isText(
        value.cover.alt,
        10,
        250
      )
    ) {
      return null;
    }

    cover = {
      src: value.cover.src,
      alt: value.cover.alt.trim(),
    };
  }

  return {
    id: value._id,
    title: value.title.trim(),
    category,
    edition,
    description: value.description.trim(),
    publishedAt: value.publishedAt,
    href: value.pdf.url,
    mimeType: "application/pdf",
    fileSizeBytes: value.pdf.size,
    fileSizeLabel: formatFileSize(
      value.pdf.size
    ),
    cover,
  };
}

/**
 * Read eligible PDF publications.
 *
 * Invalid records are skipped individually.
 * Empty results and CMS failures preserve
 * the Downloads page's existing fallback.
 */
export async function getSanityPdfPublications():
  Promise<readonly SanityPdfPublication[]> {
  const config = getConfig();

  if (
    !config
  ) {
    return [];
  }

  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/query/${config.dataset}`
  );

  endpoint.searchParams.set(
    "query",
    PDF_QUERY
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

    if (
      !response.ok
    ) {
      return [];
    }

    const data =
      (await response.json()) as QueryResponse;

    if (
      !Array.isArray(data.result)
    ) {
      return [];
    }

    const publications:
      SanityPdfPublication[] = [];

    const seenIds =
      new Set<string>();

    for (
      const entry of data.result
    ) {
      const publication =
        parsePublication(
          entry,
          config
        );

      if (
        !publication ||
        seenIds.has(publication.id)
      ) {
        continue;
      }

      seenIds.add(
        publication.id
      );

      publications.push(
        publication
      );
    }

    return publications;
  } catch {
    return [];
  }
}
