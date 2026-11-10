
import { Suspense } from "react";

import CatalogueClient from "./CatalogueClient";

import {
  getPublicCatalogueSnapshot,
} from "@/lib/catalogue-cms-bridge";

import {
  getSanityProductMainImages,
} from "@/lib/sanity-product-photography";

import {
  products as localProducts,
  productCategories as localProductCategories,
  type Product,
} from "@/lib/products";

/**
 * BARK ORNAMENT — FILE 152 STEP G
 *
 * PRODUCTS CATALOGUE SERVER PAGE
 * Theme: Golden Coastal Luxury
 *
 * PURPOSE
 * -------
 * Separate local development previews from
 * customer-facing production catalogue data.
 *
 * DEVELOPMENT MODE
 * ----------------
 * - Preserve the complete local catalogue.
 * - Preserve development previews.
 * - Preserve existing categories.
 * - Preserve search, filters and sorting.
 * - Preserve approved Sanity photography
 *   for published, non-demo local products.
 *
 * PRODUCTION, CMS DISABLED
 * ------------------------
 * - Do not expose local draft products.
 * - Do not expose demonstration products.
 * - Show published non-demo local products.
 * - Keep Sanity photography disabled
 *   unless separately authorized.
 *
 * INDEPENDENT PHOTOGRAPHY CONTROL
 * -------------------------------
 * CATALOGUE_SANITY_PHOTOS_ENABLED
 *
 * - Missing or false: disabled.
 * - Exactly true: enabled.
 * - Applies to production when public
 *   CMS catalogue publication is disabled.
 * - Does not activate CMS product records.
 * - Only approved photographs belonging
 *   to published local products are used.
 *
 * CMS PUBLICATION ENABLED
 * -----------------------
 * - Use the existing guarded CMS bridge.
 * - Filter products for publication.
 * - Preserve existing approved photography.
 * - Preserve the existing Suspense boundary.
 *
 * PHOTOGRAPHY SAFETY
 * ------------------
 * - Photograph lookup uses stable product IDs.
 * - Draft/demo records are never submitted
 *   to the bulk Sanity photography reader.
 * - Reuse existing URL and approval checks.
 * - Missing photographs use local fallbacks.
 * - No browser-side Sanity requests.
 *
 * GENERAL SAFETY
 * --------------
 * - Does not activate CMS publication.
 * - Does not modify quotation behavior.
 * - Does not write to the database.
 * - Does not send email.
 * - Does not change product eligibility.
 */

/* ==========================================
   1. VERIFIED PHOTOGRAPHY MAPPING
   ========================================== */

/**
 * Prepare approved primary photographs
 * using existing product records only.
 *
 * The caller determines which products
 * belong to the current catalogue mode.
 *
 * This helper independently excludes
 * draft and demonstration products.
 *
 * The bulk reader validates Sanity data
 * and returns an empty mapping if the
 * service is unavailable or unconfigured.
 */

async function loadApprovedCataloguePhotos(
  catalogueProducts: readonly Product[]
) {
  const eligibleProductIds =
    catalogueProducts
      .filter(
        (product) =>
          product.status === "published" &&
          product.isDemo === false
      )
      .map((product) => product.id);

  if (eligibleProductIds.length === 0) {
    return {};
  }

  return getSanityProductMainImages(
    eligibleProductIds
  );
}

/* ==========================================
   2. DEVELOPMENT CATALOGUE
   ========================================== */

/**
 * Only the local development server may
 * render the full development catalogue
 * when CMS publication is disabled.
 *
 * Development preview products remain
 * visible as before.
 *
 * Approved Sanity photographs are loaded
 * only for eligible published local records.
 *
 * Existing File 152 Step F behavior is
 * preserved in this development branch.
 */

async function DevelopmentCatalogueContent() {
  const cataloguePhotos =
    await loadApprovedCataloguePhotos(
      localProducts
    );

  return (
    <CatalogueClient
      catalogueMode="development"
      catalogueProducts={localProducts}
      catalogueCategories={localProductCategories}
      cataloguePhotos={cataloguePhotos}
    />
  );
}

/* ==========================================
   3. PUBLISHED LOCAL PRODUCT SELECTION
   ========================================== */

/**
 * Select only published local products.
 *
 * This selection is shared between
 * production modes with photography
 * disabled and photography enabled.
 *
 * Product publication eligibility
 * remains identical in both cases.
 */

function getPublishedLocalProducts(): Product[] {
  return localProducts.filter(
    (product) =>
      product.status === "published" &&
      product.isDemo === false
  );
}

/* ==========================================
   4. PUBLISHED LOCAL CATALOGUE
      PHOTOGRAPHY DISABLED
   ========================================== */

/**
 * Original production behavior.
 *
 * Public CMS publication is disabled.
 * Sanity catalogue photography is disabled.
 *
 * No Sanity request is performed here.
 *
 * Product cards use existing locally
 * approved photographs or placeholders.
 */

function PublishedLocalCatalogueContent() {
  const publishedProducts =
    getPublishedLocalProducts();

  return (
    <CatalogueClient
      catalogueMode="public"
      catalogueProducts={publishedProducts}
      catalogueCategories={localProductCategories}
    />
  );
}

/* ==========================================
   5. PUBLISHED LOCAL CATALOGUE
      PHOTOGRAPHY ENABLED
   ========================================== */

/**
 * FILE 152 STEP G
 *
 * This component is used only when:
 *
 * - Public CMS product publication
 *   remains disabled.
 *
 * - The independent Sanity photography
 *   setting is explicitly enabled.
 *
 * This does not allow Sanity to create,
 * modify or publish catalogue products.
 *
 * Products still originate exclusively
 * from the verified local registry.
 *
 * Only published, non-demo local products
 * are supplied to the photography reader.
 */

async function PublishedLocalCatalogueWithPhotography() {
  const publishedProducts =
    getPublishedLocalProducts();

  const cataloguePhotos =
    await loadApprovedCataloguePhotos(
      publishedProducts
    );

  return (
    <CatalogueClient
      catalogueMode="public"
      catalogueProducts={publishedProducts}
      catalogueCategories={localProductCategories}
      cataloguePhotos={cataloguePhotos}
    />
  );
}

/* ==========================================
   6. GUARDED CMS CATALOGUE
   ========================================== */

/**
 * This component is used only when the
 * explicit public CMS flag is enabled.
 *
 * The bridge performs server-side catalogue
 * selection and validation.
 *
 * Only published, non-demo products
 * may receive catalogue photographs.
 *
 * Existing File 152 Step F CMS behavior
 * remains unchanged.
 */

async function PublishedCatalogueContent() {
  const snapshot =
    await getPublicCatalogueSnapshot();

  /*
   * Defence in depth:
   * Do not pass unpublished or demo products
   * to the browser even if they accidentally
   * appear in the bridge result.
   */

  const publicProducts =
    snapshot.products.filter(
      (product) =>
        product.status === "published" &&
        product.isDemo === false
    );

  /*
   * Use the stable IDs of eligible
   * published products.
   *
   * The bulk reader returns only validated
   * approved primary Sanity photographs.
   *
   * Missing images fall back to the local
   * registry in ApprovedCatalogueImage.
   */

  const cataloguePhotos =
    await loadApprovedCataloguePhotos(
      publicProducts
    );

  return (
    <CatalogueClient
      catalogueMode="public"
      catalogueProducts={publicProducts}
      catalogueCategories={snapshot.categories}
      cataloguePhotos={cataloguePhotos}
    />
  );
}

/* ==========================================
   7. SAFE PUBLIC LOADING FALLBACK
   ========================================== */

/**
 * Preserve the E7Y loading appearance.
 *
 * No development product information
 * is rendered while approved catalogue
 * data or photography is loading.
 */

function PublishedCatalogueFallback() {
  return (
    <main
      className="min-h-screen bg-[#FAF7F0] text-[#30251F]"
      aria-busy="true"
    >
      <section className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#C59A45]/20"
        />

        <div className="relative mx-auto max-w-4xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Bark Ornament Product Collection
          </p>

          <h1
            className="font-serif text-4xl leading-tight sm:text-5xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Explore Our Products
          </h1>

          <p
            role="status"
            className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#E9DDC9]"
          >
            Loading available product collections…
          </p>
        </div>
      </section>
    </main>
  );
}

/* ==========================================
   8. PRODUCTS PAGE SERVER ENTRY POINT
   ========================================== */

export default function ProductsPage() {
  const cmsPublicationEnabled =
    process.env.CATALOGUE_CMS_PUBLIC_ENABLED ===
    "true";

  const sanityPhotosEnabled =
    process.env.CATALOGUE_SANITY_PHOTOS_ENABLED ===
    "true";

  const localDevelopmentMode =
    process.env.NODE_ENV === "development";

  /*
   * CASE A:
   *
   * Local development server with
   * public CMS publication disabled.
   *
   * Preserve all development previews.
   *
   * Preserve existing approved Sanity
   * photography integration for eligible
   * local products.
   *
   * Async work stays inside Suspense.
   */

  if (
    !cmsPublicationEnabled &&
    localDevelopmentMode
  ) {
    return (
      <Suspense
        fallback={<PublishedCatalogueFallback />}
      >
        <DevelopmentCatalogueContent />
      </Suspense>
    );
  }

  /*
   * CASE B:
   *
   * Production build with public CMS
   * publication disabled.
   *
   * Published local products only.
   *
   * Independent Sanity photography
   * is not explicitly enabled.
   *
   * Preserve original production behavior.
   * Do not contact Sanity.
   */

  if (
    !cmsPublicationEnabled &&
    !sanityPhotosEnabled
  ) {
    return <PublishedLocalCatalogueContent />;
  }

  /*
   * CASE C:
   *
   * Production build with public CMS
   * publication disabled.
   *
   * Independent Sanity photography
   * has been explicitly enabled.
   *
   * The existing local product registry
   * remains authoritative.
   *
   * Only the approved primary photographs
   * are obtained from Sanity.
   */

  if (!cmsPublicationEnabled) {
    return (
      <Suspense
        fallback={<PublishedCatalogueFallback />}
      >
        <PublishedLocalCatalogueWithPhotography />
      </Suspense>
    );
  }

  /*
   * CASE D:
   *
   * Explicitly enabled public CMS mode.
   *
   * Continue through the existing
   * server-only catalogue bridge.
   *
   * Preserve its publication checks
   * and approved photography behavior.
   */

  return (
    <Suspense
      fallback={<PublishedCatalogueFallback />}
    >
      <PublishedCatalogueContent />
    </Suspense>
  );
}
