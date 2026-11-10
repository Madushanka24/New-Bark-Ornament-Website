
import "server-only";

import {
  getCategoryBySlug,
  getProductBySlug,
  type Product,
  type ProductCategory,
} from "@/lib/products";

import {
  getPublicCatalogueSnapshot,
} from "@/lib/catalogue-cms-bridge";

/**
 * BARK ORNAMENT
 * FILE 150 — STEP E8E
 *
 * PUBLIC PRODUCT DETAIL RESOLVER
 *
 * PURPOSE
 * -------
 * Resolve product-detail records while
 * preventing draft/demo exposure through
 * direct URLs in production.
 *
 * DEVELOPMENT
 * -----------
 * When NODE_ENV is development and CMS
 * publication is disabled:
 *
 * - Preserve local draft previews.
 * - Preserve local demonstration pages.
 * - Preserve existing local product URLs.
 *
 * PRODUCTION
 * ----------
 * Regardless of whether CMS publication
 * is enabled:
 *
 * - Reject local draft products.
 * - Reject local demo products.
 * - Require valid product categories.
 *
 * CMS MODE
 * --------
 * - Preserve local-first identity.
 * - Reject local draft slug collisions.
 * - Allow eligible CMS-only products.
 * - Reject unpublished CMS products.
 * - Require valid CMS categories.
 *
 * SAFETY
 * ------
 * - Server-only module.
 * - No database writes.
 * - No quotation changes.
 * - No email sending.
 * - Does not enable CMS publication.
 */

export type CatalogueProductSource =
  | "local"
  | "cms";

export type ResolvedCatalogueProduct = Readonly<{
  product: Product;
  category: ProductCategory | null;
  source: CatalogueProductSource;
  indexable: boolean;
}>;

/* ==========================================
   1. SLUG VALIDATION
   ========================================== */

function isValidCatalogueSlug(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 160 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

/* ==========================================
   2. PUBLIC PRODUCT ELIGIBILITY
   ========================================== */

function isPublicProduct(
  product: Product
): boolean {
  return (
    product.status === "published" &&
    product.isDemo === false
  );
}

/* ==========================================
   3. PRODUCT RESOLVER
   ========================================== */

export async function resolveCatalogueProductBySlug(
  slug: string
): Promise<ResolvedCatalogueProduct | null> {
  /*
   * Reject malformed URLs before accessing
   * local or CMS catalogue data.
   */

  if (!isValidCatalogueSlug(slug)) {
    return null;
  }

  /*
   * CMS publication is controlled by the
   * existing server-side environment flag.
   *
   * This step does not change its value.
   */

  const publicModeRequested =
    process.env.CATALOGUE_CMS_PUBLIC_ENABLED ===
    "true";

  /*
   * Development previews are permitted
   * only when BOTH conditions are true:
   *
   * 1. Next.js is running in development.
   * 2. Public CMS mode is disabled.
   *
   * Importantly, CMS disabled does not
   * automatically mean previews allowed.
   */

  const developmentPreviewAllowed =
    process.env.NODE_ENV === "development" &&
    !publicModeRequested;

  /* ========================================
     4. LOCAL PRODUCT RESOLUTION
     ======================================== */

  /*
   * Always check local products first.
   *
   * Include drafts in this lookup so a CMS
   * product cannot bypass a reserved local
   * draft slug.
   */

  const localProduct = getProductBySlug(
    slug,
    true
  );

  if (localProduct) {
    const eligibleForPublic =
      isPublicProduct(localProduct);

    /*
     * Outside local preview mode, reject
     * unpublished and demonstration products
     * regardless of the CMS flag.
     */

    if (
      !developmentPreviewAllowed &&
      !eligibleForPublic
    ) {
      return null;
    }

    const category =
      getCategoryBySlug(
        localProduct.categorySlug
      ) ?? null;

    /*
     * A published product must belong to a
     * valid category.
     *
     * Development previews retain the
     * original nullable category behavior.
     */

    if (
      !developmentPreviewAllowed &&
      !category
    ) {
      return null;
    }

    return {
      product: localProduct,
      category,
      source: "local",
      indexable: eligibleForPublic,
    };
  }

  /* ========================================
     5. CMS PRODUCT RESOLUTION
     ======================================== */

  /*
   * CMS-only products cannot be accessed
   * when public CMS publication is disabled.
   */

  if (!publicModeRequested) {
    return null;
  }

  /*
   * Continue through the existing guarded
   * public CMS catalogue bridge.
   */

  const snapshot =
    await getPublicCatalogueSnapshot();

  if (!snapshot.cmsEnabled) {
    return null;
  }

  /*
   * Only resolve the requested CMS product.
   */

  const cmsProduct = snapshot.products.find(
    (item) => item.slug === slug
  );

  if (
    !cmsProduct ||
    !isPublicProduct(cmsProduct)
  ) {
    return null;
  }

  /*
   * CMS-only products must reference an
   * available public catalogue category.
   */

  const cmsCategory =
    snapshot.categories.find(
      (item) =>
        item.slug === cmsProduct.categorySlug
    ) ?? null;

  if (!cmsCategory) {
    return null;
  }

  return {
    product: cmsProduct,
    category: cmsCategory,
    source: "cms",
    indexable: true,
  };
}
