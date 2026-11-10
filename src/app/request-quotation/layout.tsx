
/**
 * BARK ORNAMENT — FILE 117
 *
 * REQUEST QUOTATION SEO PROTECTION
 *
 * File:
 * src/app/request-quotation/layout.tsx
 *
 * PURPOSE
 * - Prevent quotation page indexing.
 * - Preserve the existing client-side page.
 * - Add server-rendered metadata.
 * - Avoid modifications to quotation logic.
 *
 * SECURITY
 * - No database operations.
 * - No API requests.
 * - No email operations.
 * - No changes to environment variables.
 *
 * Important:
 * This layout adds a noindex directive.
 * It does not provide authentication.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";

/* ==========================================
   1. QUOTATION SEO METADATA
   ========================================== */

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,

    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/* ==========================================
   2. REQUEST QUOTATION LAYOUT
   ========================================== */

/**
 * The existing quotation page remains
 * a Client Component.
 *
 * This server-side layout simply wraps
 * the existing page without changing
 * its controls, state or functionality.
 */

export default function RequestQuotationLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <>{children}</>;
}
