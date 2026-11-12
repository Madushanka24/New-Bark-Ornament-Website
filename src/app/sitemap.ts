
/**
 * BARK ORNAMENT — FILE 162 STEP F37
 *
 * Search Engine XML Sitemap
 *
 * File: src/app/sitemap.ts
 * Route: /sitemap.xml
 *
 * PURPOSE
 * - Preserve canonical website URLs.
 * - Include established customer-facing pages.
 * - Include the ten supported editorial
 *   category detail pages.
 * - Include published, non-demo local products.
 * - Include approved CMS products only when
 *   public CMS publication is enabled.
 * - Do not advertise unsupported CMS-only
 *   editorial category URLs.
 * - Exclude API and quotation submission routes.
 *
 * SAFETY
 * - CMS remains disabled by default.
 * - Existing local products remain protected.
 * - CMS products use the guarded catalogue bridge.
 * - No database writes.
 * - No quotation or email operations.
 * - No fabricated modification dates.
 * - No production activation.
 */

import type { MetadataRoute } from "next";

import { connection } from "next/server";

import {
  products,
  type Product,
} from "@/lib/products";

import {
  getPublicCatalogueSnapshot,
} from "@/lib/catalogue-cms-bridge";

/* ==========================================
   CANONICAL PRODUCTION DOMAIN
   ========================================== */

const SITE_ORIGIN =
  "https://www.barkornament.com";

/* ==========================================
   ESTABLISHED PUBLIC PAGES
   ========================================== */

const publicPages = [
  "/",
  "/about",
  "/products",
  "/categories",
  "/hospitality-solutions",
  "/markets",
  "/gallery",
  "/insights",
  "/contact",
] as const;

/* ==========================================
   SUPPORTED EDITORIAL CATEGORY SLUGS

   These ten slugs are implemented in:

   src/app/categories/[slug]/page.tsx

   File 162:
   Do not add CMS-only category slugs here
   until their editorial pages are supported.

   The guarded CMS product/category listing
   routes are unaffected by this restriction.
   ========================================== */

const categorySlugs = [
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
] as const;

/* ==========================================
   CANONICAL URL BUILDER
   ========================================== */

function canonicalUrl(
  pathname: string
): string {
  return new URL(
    pathname,
    SITE_ORIGIN
  ).toString();
}

/* ==========================================
   SAFE PRODUCT SLUG VALIDATION
   ========================================== */

function isValidProductSlug(
  slug: unknown
): slug is string {
  return (
    typeof slug === "string" &&
    slug.length > 0 &&
    slug.length <= 160 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug
    )
  );
}

/* ==========================================
   PRODUCT PUBLICATION SAFEGUARD

   Applies to local and CMS records.

   CMS-specific validation, association
   and collision checks remain the
   responsibility of the guarded bridge.
   ========================================== */

function isIndexableProduct(
  product: Product
): boolean {
  return (
    product.status === "published" &&
    product.isDemo === false &&
    isValidProductSlug(product.slug)
  );
}

/* ==========================================
   PRODUCT SOURCE SELECTION

   CMS DISABLED
   - Use original local product registry.
   - Do not request Sanity product data.
   - Preserve original publication rules.

   CMS ENABLED
   - Wait for request-time rendering.
   - Use the existing public CMS bridge.
   - Include only approved merged records.
   - Preserve bridge-level safe fallback.

   This function does not modify
   environment settings.
   ========================================== */

async function getSitemapProducts():
  Promise<readonly Product[]> {

  const cmsEnabled =
    process.env.CATALOGUE_CMS_PUBLIC_ENABLED ===
    "true";

  if (!cmsEnabled) {
    return products;
  }

  /*
   * Next.js 16 Cache Components:
   *
   * In CMS-enabled mode, do not freeze
   * the catalogue during prerendering.
   *
   * The public CMS switch must already
   * be explicitly enabled by the operator.
   */

  await connection();

  const snapshot =
    await getPublicCatalogueSnapshot();

  /*
   * The bridge supplies its guarded
   * local fallback if CMS retrieval fails.
   */

  return snapshot.products;
}

/* ==========================================
   SITEMAP GENERATION

   Modification dates are omitted until
   genuine content-update timestamps
   become available.
   ========================================== */

export default async function sitemap():
  Promise<MetadataRoute.Sitemap> {

  const catalogueProducts =
    await getSitemapProducts();

  /* ----------------------------------------
     1. ESTABLISHED CUSTOMER PAGES
     ---------------------------------------- */

  const mainEntries:
    MetadataRoute.Sitemap =
      publicPages.map((pathname) => ({
        url: canonicalUrl(pathname),
      }));

  /* ----------------------------------------
     2. SUPPORTED CATEGORY PAGES

     Include only the ten verified
     editorial category destinations.

     File 162 intentionally does not
     generate category URLs from CMS
     category records.

     CMS-only categories may still
     function through the guarded
     product-category listing route.
     ---------------------------------------- */

  const categoryEntries:
    MetadataRoute.Sitemap =
      categorySlugs.map((slug) => ({
        url: canonicalUrl(
          `/categories/${slug}`
        ),
      }));

  /* ----------------------------------------
     3. PUBLISHED PRODUCT URLS

     CMS disabled:
     Original local registry.

     CMS enabled:
     Guarded merged catalogue.

     All products must pass the final
     publication validation.
     ---------------------------------------- */

  const productEntries:
    MetadataRoute.Sitemap =
      catalogueProducts
        .filter(isIndexableProduct)
        .map((product) => ({
          url: canonicalUrl(
            `/products/${product.slug}`
          ),
        }));

  /* ----------------------------------------
     4. REMOVE DUPLICATE CANONICAL URLS
     ---------------------------------------- */

  const unique = new Map<
    string,
    MetadataRoute.Sitemap[number]
  >();

  for (const entry of [
    ...mainEntries,
    ...categoryEntries,
    ...productEntries,
  ]) {
    unique.set(
      entry.url,
      entry
    );
  }

  return Array.from(
    unique.values()
  );
}
