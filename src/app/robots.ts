
/**
 * BARK ORNAMENT — FILE 115
 *
 * ROBOTS.TXT & CRAWLING POLICY
 *
 * File: src/app/robots.ts
 * Public route: /robots.txt
 *
 * Next.js 16 — MetadataRoute.Robots
 *
 * PURPOSE
 * - Prevent premature crawling during development.
 * - Disallow crawlers by default on staging.
 * - Require explicit production indexing approval.
 * - Advertise the canonical sitemap only after approval.
 * - Avoid blocking CSS, JavaScript and images
 *   on an approved public deployment.
 *
 * SAFETY
 * - No database access.
 * - No quotation or email operations.
 * - No network requests.
 * - No modifications to environment variables.
 *
 * IMPORTANT
 * robots.txt is not an authentication or
 * confidentiality mechanism.
 *
 * Use authentication for private deployments.
 * Use appropriate noindex controls for URLs
 * that should not appear in search results.
 */

import type { MetadataRoute } from "next";

/* ==========================================
   CANONICAL PRODUCTION WEBSITE
   ========================================== */

const SITE_ORIGIN =
  "https://www.barkornament.com";

/* ==========================================
   PUBLIC INDEXING APPROVAL
   ========================================== */

/**
 * Fail-closed policy.
 *
 * All conditions must be true:
 *
 * 1. Next.js runs in production mode.
 * 2. The SEO approval flag is explicitly true.
 * 3. The deployment target is production.
 * 4. If deployed on Vercel, its environment
 *    must also be production.
 *
 * Do not set the approval flag during
 * website development or staging.
 *
 * This file may be generated at build time.
 * Changing an environment variable can
 * require a new production build/deployment.
 */

function isPublicCrawlingApproved():
  boolean {
  const productionMode =
    process.env.NODE_ENV === "production";

  const explicitlyApproved =
    process.env.BARK_SEO_INDEXING_APPROVED ===
    "true";

  const productionTarget =
    process.env.BARK_DEPLOYMENT_TARGET ===
    "production";

  const vercelEnvironment =
    process.env.VERCEL_ENV;

  const validVercelEnvironment =
    !vercelEnvironment ||
    vercelEnvironment === "production";

  return (
    productionMode &&
    explicitlyApproved &&
    productionTarget &&
    validVercelEnvironment
  );
}

/* ==========================================
   ROBOTS METADATA ROUTE
   ========================================== */

export default function robots():
  MetadataRoute.Robots {

  /**
   * Development, staging and
   * unapproved production deployments.
   *
   * Disallow crawling of all paths.
   *
   * No production sitemap is advertised
   * until public indexing is approved.
   */
  if (!isPublicCrawlingApproved()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  /**
   * Explicitly approved public deployment.
   *
   * Public pages can be crawled.
   * API and administrative paths are
   * excluded from routine crawler access.
   *
   * Do not block /_next/ assets:
   * search engines need CSS and
   * JavaScript to render public pages.
   *
   * Individual non-indexable pages
   * must also have correct metadata.
   */
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
      ],
    },

    sitemap:
      `${SITE_ORIGIN}/sitemap.xml`,
  };
}
