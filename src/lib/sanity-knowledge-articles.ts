
import "server-only";

/**
 * BARK ORNAMENT — FILE 150 STEP B
 *
 * Read-only Sanity Knowledge Article reader.
 *
 * Security and consistency:
 * - Published, approved documents only
 * - Strict metadata and Portable Text validation
 * - Same validation for article list and detail
 * - Invalid articles omitted from public listings
 * - Exact, validated article slugs
 * - Sanity CDN image URL validation
 * - Safe fallback on CMS errors
 *
 * The existing GSM editorial article
 * remains authoritative in its own route.
 *
 * No PostgreSQL, write tokens, quotation
 * submission or email functionality.
 */

const API_VERSION = "2025-02-19";

const KNOWLEDGE_CATEGORIES = [
  "materials-printing",
  "export-planning",
  "branding-responsibility",
] as const;

export type KnowledgeCategory =
  (typeof KNOWLEDGE_CATEGORIES)[number];

export type KnowledgeArticleSummary = Readonly<{
  title: string;
  slug: string;
  category: KnowledgeCategory;
  series: string;
  edition: string | null;
  summary: string;
  seoDescription: string | null;
  publishedAt: string | null;
  cover: Readonly<{
    src: string;
    alt: string;
  }> | null;
}>;

export type KnowledgeArticle =
  KnowledgeArticleSummary &
    Readonly<{
      body: readonly unknown[];
    }>;

type QueryResponse = {
  result?: unknown;
};

type SanityConfig = {
  projectId: string;
  dataset: string;
};

const SUMMARY_FIELDS = `
  title,
  "slug": slug.current,
  category,
  series,
  edition,
  summary,
  seoDescription,
  publishedAt,
  "cover": select(
    defined(cover.image.asset) => {
      "src": cover.image.asset->url,
      "alt": cover.alt
    },
    null
  )
`;

/**
 * FILE 150 FIX:
 *
 * Include the article body when retrieving
 * Knowledge Hub summaries.
 *
 * We must validate the article body before
 * publishing its Read Article link.
 *
 * Full bodies are read only on the server.
 * They are not passed to Knowledge Hub cards.
 */
const LIST_QUERY = `
  *[
    _type == "knowledgeArticle" &&
    approved == true &&
    defined(slug.current) &&
    defined(body)
  ]
  | order(_updatedAt desc, _id asc)[0...50] {
    ${SUMMARY_FIELDS},
    body
  }
`;

const DETAIL_QUERY = `
  *[
    _type == "knowledgeArticle" &&
    approved == true &&
    slug.current == $slug &&
    defined(body)
  ]
  | order(_updatedAt desc, _id asc)[0...20] {
    ${SUMMARY_FIELDS},
    body
  }
`;

function configuration(): SanityConfig | null {
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

function validSlug(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length >= 2 &&
    value.length <= 100 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

function validCategory(
  value: unknown
): value is KnowledgeCategory {
  return (
    typeof value === "string" &&
    (
      KNOWLEDGE_CATEGORIES as readonly string[]
    ).includes(value)
  );
}

function validString(
  value: unknown,
  min: number,
  max: number
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= min &&
    value.trim().length <= max
  );
}

function optionalString(
  value: unknown,
  max: number
): string | null | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value !== "string" ||
    value.trim().length > max
  ) {
    return undefined;
  }

  return value.trim() || null;
}

function optionalDate(
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
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return undefined;
  }

  const date = new Date(
    `${value}T00:00:00Z`
  );

  if (
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return undefined;
  }

  return value;
}

function validImageUrl(
  value: unknown,
  config: SanityConfig
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

    if (
      !url.pathname.startsWith(prefix)
    ) {
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

function parseSummary(
  value: unknown,
  config: SanityConfig
): KnowledgeArticleSummary | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  if (
    !validString(record.title, 10, 180) ||
    !validSlug(record.slug) ||
    !validCategory(record.category) ||
    !validString(record.series, 3, 100) ||
    !validString(record.summary, 30, 500)
  ) {
    return null;
  }

  const edition =
    optionalString(record.edition, 60);

  const seoDescription =
    optionalString(record.seoDescription, 160);

  const publishedAt =
    optionalDate(record.publishedAt);

  if (
    edition === undefined ||
    seoDescription === undefined ||
    publishedAt === undefined
  ) {
    return null;
  }

  let cover:
    KnowledgeArticleSummary["cover"] = null;

  if (
    record.cover !== null &&
    record.cover !== undefined
  ) {
    if (
      !record.cover ||
      typeof record.cover !== "object" ||
      Array.isArray(record.cover)
    ) {
      return null;
    }

    const image =
      record.cover as Record<string, unknown>;

    if (
      !validImageUrl(image.src, config) ||
      !validString(image.alt, 10, 250)
    ) {
      return null;
    }

    cover = {
      src: image.src,
      alt: image.alt.trim(),
    };
  }

  return {
    title: record.title.trim(),
    slug: record.slug,
    category: record.category,
    series: record.series.trim(),
    edition,
    summary: record.summary.trim(),
    seoDescription,
    publishedAt,
    cover,
  };
}

/**
 * Validate the supported Portable Text structure.
 *
 * This validates article eligibility.
 * Rendering remains the responsibility of
 * KnowledgePortableText.tsx.
 *
 * Arbitrary HTML is not accepted here.
 */
function validBody(
  value: unknown
): value is readonly unknown[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 200
  ) {
    return false;
  }

  return value.every((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry)
    ) {
      return false;
    }

    const block =
      entry as Record<string, unknown>;

    if (
      block._type !== "block" ||
      typeof block._key !== "string" ||
      block._key.length < 1 ||
      !Array.isArray(block.children) ||
      block.children.length > 200 ||
      !Array.isArray(block.markDefs) ||
      block.markDefs.length > 100
    ) {
      return false;
    }

    if (
      block.style !== undefined &&
      ![
        "normal",
        "h2",
        "h3",
        "blockquote",
      ].includes(String(block.style))
    ) {
      return false;
    }

    if (
      block.listItem !== undefined &&
      ![
        "bullet",
        "number",
      ].includes(String(block.listItem))
    ) {
      return false;
    }

    if (
      block.level !== undefined &&
      (
        typeof block.level !== "number" ||
        !Number.isInteger(block.level) ||
        block.level < 1 ||
        block.level > 6
      )
    ) {
      return false;
    }

    const childrenValid =
      block.children.every(
        (child: unknown) => {
          if (
            !child ||
            typeof child !== "object" ||
            Array.isArray(child)
          ) {
            return false;
          }

          const span =
            child as Record<string, unknown>;

          return (
            span._type === "span" &&
            typeof span.text === "string" &&
            span.text.length <= 20000 &&
            Array.isArray(span.marks) &&
            span.marks.every(
              (mark: unknown) =>
                typeof mark === "string" &&
                mark.length <= 100
            )
          );
        }
      );

    if (!childrenValid) {
      return false;
    }

    return block.markDefs.every(
      (entry: unknown) => {
        if (
          !entry ||
          typeof entry !== "object" ||
          Array.isArray(entry)
        ) {
          return false;
        }

        const mark =
          entry as Record<string, unknown>;

        if (
          mark._type !== "link" ||
          typeof mark._key !== "string" ||
          typeof mark.href !== "string"
        ) {
          return false;
        }

        try {
          const url =
            new URL(mark.href);

          return (
            [
              "http:",
              "https:",
            ].includes(url.protocol) &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      }
    );
  });
}

function parseArticle(
  value: unknown,
  config: SanityConfig
): KnowledgeArticle | null {
  const summary =
    parseSummary(value, config);

  if (
    !summary ||
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const body =
    (value as Record<string, unknown>).body;

  if (!validBody(body)) {
    return null;
  }

  return {
    ...summary,
    body,
  };
}

async function querySanity(
  query: string,
  params?: Readonly<Record<string, string>>
): Promise<{
  result: unknown;
  config: SanityConfig;
} | null> {
  const config = configuration();

  if (!config) {
    return null;
  }

  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/query/${config.dataset}`
  );

  endpoint.searchParams.set(
    "query",
    query
  );

  endpoint.searchParams.set(
    "perspective",
    "published"
  );

  for (
    const [key, value]
    of Object.entries(params ?? {})
  ) {
    endpoint.searchParams.set(
      `$${key}`,
      JSON.stringify(value)
    );
  }

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
      return null;
    }

    const data =
      (await response.json()) as QueryResponse;

    return {
      result: data.result,
      config,
    };
  } catch {
    return null;
  }
}

/**
 * FILE 150 FIX:
 *
 * Listing entries use the same parseArticle()
 * validation as detail-page entries.
 *
 * We return summary fields only; full
 * Portable Text bodies are not passed
 * to Knowledge Hub cards.
 *
 * Invalid articles are skipped before
 * a Read Article link is created.
 */
export async function getSanityKnowledgeArticles():
  Promise<readonly KnowledgeArticleSummary[]> {
  const response =
    await querySanity(LIST_QUERY);

  if (
    !response ||
    !Array.isArray(response.result)
  ) {
    return [];
  }

  const articles:
    KnowledgeArticleSummary[] = [];

  const slugs =
    new Set<string>();

  for (
    const entry of response.result
  ) {
    const article =
      parseArticle(
        entry,
        response.config
      );

    if (
      !article ||
      slugs.has(article.slug)
    ) {
      continue;
    }

    slugs.add(article.slug);

    const {
      body: _validatedBody,
      ...summary
    } = article;

    void _validatedBody;

    articles.push(summary);
  }

  return articles;
}

/**
 * Read one approved article by its exact slug.
 *
 * This uses the same complete article
 * validation as the Knowledge Hub listing.
 *
 * The website route independently handles
 * unknown and unapproved articles.
 */
export async function getSanityKnowledgeArticleBySlug(
  slug: string
): Promise<KnowledgeArticle | null> {
  if (!validSlug(slug)) {
    return null;
  }

  const response =
    await querySanity(
      DETAIL_QUERY,
      { slug }
    );

  if (
    !response ||
    !Array.isArray(response.result)
  ) {
    return null;
  }

  for (
    const entry of response.result
  ) {
    const article =
      parseArticle(
        entry,
        response.config
      );

    if (
      article &&
      article.slug === slug
    ) {
      return article;
    }
  }

  return null;
}
