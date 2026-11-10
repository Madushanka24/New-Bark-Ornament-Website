
/**
 * BARK ORNAMENT — FILE 123
 *
 * CATEGORY LANDING SEO LAYOUT
 *
 * File:
 * src/app/categories/layout.tsx
 *
 * PURPOSE
 * - Define the canonical URL for /categories.
 * - Supply category collection SEO metadata.
 * - Keep all ten category-detail URLs independent.
 * - Preserve existing design and interactions.
 *
 * DEPENDENCIES
 * - File 118: Root metadataBase.
 * - File 122: Category-detail canonical URLs.
 *
 * SAFETY
 * - No database access.
 * - No API calls.
 * - No quotation submissions.
 * - No email operations.
 * - No environment changes.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";

/* ==========================================
   CATEGORY COLLECTION SEO METADATA
   ========================================== */

/**
 * The landing page uses /categories.
 *
 * Each category-detail page defines its own
 * alternates.canonical through generateMetadata.
 *
 * Next.js applies the child page's canonical
 * in preference to this parent layout value.
 */

export const metadata: Metadata = {
  title: {
    absolute:
      "Hospitality Product Categories | Bark Ornament",
  },

  description:
    "Explore Bark Ornament's customized hospitality product collections, including stationery, guest service products, bags, packaging, wooden accessories, crafts and hotel operational supplies.",

  alternates: {
    canonical: "/categories",
  },
};

/* ==========================================
   CATEGORY COLLECTION LAYOUT
   ========================================== */

/**
 * Preserve the exact child page structure.
 *
 * Do not add an extra HTML wrapper, CSS,
 * animation or stateful component.
 *
 * Existing landing and category-detail
 * pages continue rendering unchanged.
 */

export default function CategoriesLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <>{children}</>;
}
