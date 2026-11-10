
/**
 * BARK ORNAMENT — FILE 114
 *
 * Search Engine XML Sitemap
 *
 * File: src/app/sitemap.ts
 * Route: /sitemap.xml
 *
 * PURPOSE
 * - Provide canonical website URLs.
 * - Include established customer-facing pages.
 * - Include all ten established product categories.
 * - Include only published, non-demo products.
 * - Exclude quotation submission and API routes.
 *
 * SAFETY
 * - No database writes.
 * - No network requests.
 * - No quotation or email operations.
 * - No fictional product records.
 * - No fabricated modification dates.
 *
 * Review sitemap URLs again before switching
 * the existing website to the new deployment.
 */

import type { MetadataRoute } from "next";

import { products } from "@/lib/products";

/* ==========================================
   CANONICAL PRODUCTION DOMAIN
   ========================================== */

/**
 * The replacement website is intended to use
 * Bark Ornament's existing public domain.
 *
 * Do not replace with localhost or a staging URL.
 */
const SITE_ORIGIN =
  "https://www.barkornament.com";

/* ==========================================
   ESTABLISHED PUBLIC PAGES
   ========================================== */

/**
 * These are existing customer-facing routes.
 *
 * Development and transactional URLs are
 * intentionally excluded.
 *
 * Only add further pages when their content,
 * publication status and canonical URL have
 * been verified.
 */
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
   ESTABLISHED CATEGORY SLUGS
   ========================================== */

/**
 * Keep these aligned with the verified
 * category-detail route definitions.
 */
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

function canonicalUrl(pathname: string): string {
  return new URL(
    pathname,
    SITE_ORIGIN
  ).toString();
}

/* ==========================================
   PRODUCT PUBLICATION SAFEGUARD
   ========================================== */

/**
 * Product records are eligible only when:
 *
 * 1. status is "published"
 * 2. isDemo is explicitly false
 * 3. slug uses a safe URL format
 *
 * Having a photograph does not make a
 * development product eligible for indexing.
 */
function isIndexableProduct(
  product: (typeof products)[number]
): boolean {
  return (
    product.status === "published" &&
    product.isDemo === false &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      product.slug
    )
  );
}

/* ==========================================
   SITEMAP GENERATION
   ========================================== */

/**
 * Next.js automatically serves the returned
 * entries as /sitemap.xml.
 *
 * Modification dates are omitted until
 * genuine content-update dates are available.
 */
export default function sitemap():
  MetadataRoute.Sitemap {

  const mainEntries:
    MetadataRoute.Sitemap =
      publicPages.map((pathname) => ({
        url: canonicalUrl(pathname),
      }));

  const categoryEntries:
    MetadataRoute.Sitemap =
      categorySlugs.map((slug) => ({
        url: canonicalUrl(
          `/categories/${slug}`
        ),
      }));

  const productEntries:
    MetadataRoute.Sitemap =
      products
        .filter(isIndexableProduct)
        .map((product) => ({
          url: canonicalUrl(
            `/products/${product.slug}`
          ),
        }));

  /*
   * Avoid duplicate canonical URLs.
   *
   * This does not alter product records,
   * route data or publication status.
   */
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
