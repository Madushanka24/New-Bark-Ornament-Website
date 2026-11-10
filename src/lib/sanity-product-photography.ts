
import "server-only";

import type { ApprovedPhoto } from
  "@/components/ApprovedProductImage";

/**
 * BARK ORNAMENT — FILE 152 STEP E
 *
 * Read-only Sanity product photography.
 *
 * Preserves the existing product registry,
 * publication rules, quotation basket,
 * image fallbacks and frontend architecture.
 *
 * FILE 152 ADDITION:
 * - Bulk primary photograph retrieval.
 * - Reuse existing collection validation.
 * - Avoid one request per catalogue card.
 * - Preserve the original single-product API.
 * - Fail safely when Sanity is unavailable.
 */

const API_VERSION = "2025-02-19";

const PRODUCT_QUERY = `
  *[
    _type == "productPhotography" &&
    productId == $productId &&
    approved == true &&
    defined(photos)
  ]
  | order(_updatedAt desc, _id asc) {
    productId,
    "photos": photos[] {
      role,
      alt,
      "src": image.asset->url
    }
  }
`;

/**
 * Retrieve multiple approved photography
 * collections through one Sanity query.
 *
 * Each collection is independently validated
 * using the existing validation function.
 */

const BULK_PRODUCT_QUERY = `
  *[
    _type == "productPhotography" &&
    productId in $productIds &&
    approved == true &&
    defined(photos)
  ]
  | order(_updatedAt desc, _id asc) {
    productId,
    "photos": photos[] {
      role,
      alt,
      "src": image.asset->url
    }
  }
`;

const MAX_IDS_PER_QUERY = 40;
const MAX_TOTAL_PRODUCT_IDS = 200;

export type SanityProductPhotography =
  Readonly<{
    productId: string;
    main: ApprovedPhoto;
    additional: readonly ApprovedPhoto[];
    material: ApprovedPhoto | null;
    finish: ApprovedPhoto | null;
  }>;

type PhotoRole =
  | "main"
  | "additional"
  | "material"
  | "finish";

type SanityPhotoRecord = {
  role?: unknown;
  src?: unknown;
  alt?: unknown;
};

type SanityCollectionRecord = {
  productId?: unknown;
  photos?: unknown;
};

type SanityQueryResponse = {
  result?: unknown;
};

function getConfiguration() {
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

function isValidRole(
  value: unknown
): value is PhotoRole {
  return (
    value === "main" ||
    value === "additional" ||
    value === "material" ||
    value === "finish"
  );
}

function isValidPhoto(
  value: unknown,
  projectId: string,
  dataset: string
): value is {
  role: PhotoRole;
  src: ApprovedPhoto["src"];
  alt: string;
} {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const record =
    value as SanityPhotoRecord;

  if (
    !isValidRole(record.role) ||
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

    return /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(jpg|jpeg|png|webp|avif)$/i
      .test(filename);
  } catch {
    return false;
  }
}

function validateCollection(
  value: unknown,
  expectedProductId: string,
  projectId: string,
  dataset: string
): SanityProductPhotography | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const collection =
    value as SanityCollectionRecord;

  if (
    collection.productId !== expectedProductId ||
    !Array.isArray(collection.photos) ||
    collection.photos.length < 1 ||
    collection.photos.length > 20
  ) {
    return null;
  }

  const photos: Array<{
    role: PhotoRole;
    photo: ApprovedPhoto;
  }> = [];

  for (const entry of collection.photos) {
    if (
      !isValidPhoto(
        entry,
        projectId,
        dataset
      )
    ) {
      // Reject an incomplete or invalid collection.
      return null;
    }

    photos.push({
      role: entry.role,
      photo: {
        src: entry.src,
        alt: entry.alt.trim(),
        approved: true,
      },
    });
  }

  const mainPhotos =
    photos.filter((item) => item.role === "main");

  const materialPhotos =
    photos.filter((item) => item.role === "material");

  const finishPhotos =
    photos.filter((item) => item.role === "finish");

  if (
    mainPhotos.length !== 1 ||
    materialPhotos.length > 1 ||
    finishPhotos.length > 1
  ) {
    return null;
  }

  return {
    productId: expectedProductId,

    main: mainPhotos[0].photo,

    additional: photos
      .filter((item) => item.role === "additional")
      .map((item) => item.photo),

    material:
      materialPhotos[0]?.photo ?? null,

    finish:
      finishPhotos[0]?.photo ?? null,
  };
}

/**
 * Fetches approved photography for a product.
 *
 * IMPORTANT:
 * The caller must obtain productId from an
 * existing, verified Next.js product record
 * and enforce its publication rules.
 *
 * This reader must not be used to publish
 * draft or demonstration products.
 *
 * Existing File 146 behavior preserved.
 */
export async function getSanityProductPhotography(
  productId: string
): Promise<SanityProductPhotography | null> {
  if (
    typeof productId !== "string" ||
    productId.length < 1 ||
    productId.length > 120 ||
    productId !== productId.trim()
  ) {
    return null;
  }

  const config = getConfiguration();

  if (!config) {
    return null;
  }

  const { projectId, dataset } = config;

  const endpoint = new URL(
    `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}`
  );

  endpoint.searchParams.set(
    "query",
    PRODUCT_QUERY
  );

  endpoint.searchParams.set(
    "$productId",
    JSON.stringify(productId)
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
      (await response.json()) as SanityQueryResponse;

    if (!Array.isArray(data.result)) {
      return null;
    }

    // Results are ordered newest first,
    // then by document ID for stable ties.
    // The first fully valid collection wins.
    for (const entry of data.result) {
      const collection = validateCollection(
        entry,
        productId,
        projectId,
        dataset
      );

      if (collection) {
        return collection;
      }
    }

    return null;
  } catch {
    // CMS outages must not break product pages.
    return null;
  }
}

/* ==========================================
   FILE 152 STEP E
   BULK CATALOGUE PHOTOGRAPHY
   ========================================== */

/**
 * Fetches approved main photographs for
 * multiple verified product IDs.
 *
 * The calling server component must supply
 * only products permitted by its catalogue
 * publication and preview rules.
 *
 * A photograph never grants publication
 * permission to its associated product.
 *
 * Features:
 * - Deduplicates supplied product IDs.
 * - Limits the maximum input size.
 * - Batches requests for manageable URLs.
 * - Uses published Sanity perspective.
 * - Reuses strict photo validation.
 * - Selects the newest valid collection.
 * - Omits missing or invalid photographs.
 * - Returns an empty mapping on failure.
 *
 * No client-side Sanity requests occur.
 */

export async function getSanityProductMainImages(
  productIds: readonly string[]
): Promise<Readonly<Record<string, ApprovedPhoto>>> {
  if (
    !Array.isArray(productIds) ||
    productIds.length === 0 ||
    productIds.length > MAX_TOTAL_PRODUCT_IDS
  ) {
    return {};
  }

  const uniqueProductIds = [
    ...new Set(productIds),
  ];

  /*
   * Apply the same product ID requirements
   * as the original single-product reader.
   *
   * Invalid input fails closed instead of
   * requesting unexpected CMS records.
   */

  if (
    uniqueProductIds.some(
      (productId) =>
        typeof productId !== "string" ||
        productId.length < 1 ||
        productId.length > 120 ||
        productId !== productId.trim()
    )
  ) {
    return {};
  }

  const config = getConfiguration();

  if (!config) {
    return {};
  }

  const { projectId, dataset } = config;

  const photoByProductId =
    new Map<string, ApprovedPhoto>();

  /*
   * Multiple products share a query.
   *
   * The batch limit prevents an excessively
   * long URL when product IDs are supplied.
   */

  for (
    let offset = 0;
    offset < uniqueProductIds.length;
    offset += MAX_IDS_PER_QUERY
  ) {
    const batchIds =
      uniqueProductIds.slice(
        offset,
        offset + MAX_IDS_PER_QUERY
      );

    const permittedIds =
      new Set(batchIds);

    const endpoint = new URL(
      `https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}`
    );

    endpoint.searchParams.set(
      "query",
      BULK_PRODUCT_QUERY
    );

    endpoint.searchParams.set(
      "$productIds",
      JSON.stringify(batchIds)
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
        continue;
      }

      const data =
        (await response.json()) as SanityQueryResponse;

      if (!Array.isArray(data.result)) {
        continue;
      }

      /*
       * Results are ordered newest first.
       *
       * Only accept matching product IDs.
       *
       * The first fully valid collection
       * for each product ID wins.
       */

      for (const entry of data.result) {
        if (
          typeof entry !== "object" ||
          entry === null
        ) {
          continue;
        }

        const record =
          entry as SanityCollectionRecord;

        const productId =
          record.productId;

        if (
          typeof productId !== "string" ||
          !permittedIds.has(productId) ||
          photoByProductId.has(productId)
        ) {
          continue;
        }

        const validated =
          validateCollection(
            entry,
            productId,
            projectId,
            dataset
          );

        if (!validated) {
          continue;
        }

        photoByProductId.set(
          productId,
          validated.main
        );
      }
    } catch {
      /*
       * A failed Sanity batch must not
       * break the catalogue.
       *
       * Other batches may still succeed.
       *
       * Missing photographs will fall
       * back to the local registry.
       */
      continue;
    }
  }

  /*
   * Return a standard serializable object
   * suitable for a Server-to-Client prop.
   *
   * Using Object.fromEntries also avoids
   * special-property assignment issues.
   */

  return Object.fromEntries(
    photoByProductId
  );
}
