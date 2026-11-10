
/**
 * BARK ORNAMENT — FILE 121
 *
 * PRODUCT CATALOGUE SEO LAYOUT
 *
 * File:
 * src/app/products/layout.tsx
 *
 * PURPOSE
 * - Set metadata for the main /products catalogue.
 * - Consolidate filter and sorting URL variations.
 * - Preserve individual product canonical URLs.
 * - Keep existing interactive catalogue unchanged.
 *
 * IMPORTANT
 * Individual product pages define their own
 * alternates.canonical in File 120.
 *
 * No database, API, quotation or email changes.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";

/* ==========================================
   PRODUCT CATALOGUE SEO METADATA
   ========================================== */

export const metadata: Metadata = {
  title: {
    absolute:
      "Hospitality Product Catalogue | Bark Ornament",
  },

  description:
    "Explore customized hospitality products from Bark Ornament, including printing, guest stationery, wooden items, bags, packaging and gifts for hotels and resorts.",

  alternates: {
    canonical: "/products",
  },
};

/* ==========================================
   PRODUCT CATALOGUE LAYOUT
   ========================================== */

/**
 * The layout does not introduce additional
 * wrappers, styling, state or interactions.
 *
 * The existing catalogue and product detail
 * page components remain unchanged.
 */

export default function ProductsLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <>{children}</>;
}
