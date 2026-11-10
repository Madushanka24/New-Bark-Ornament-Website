
import type { Metadata, Viewport } from "next";
import type {
  CSSProperties,
  ReactNode,
} from "react";

import "@fontsource-variable/cormorant-garamond/wght.css";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@fontsource-variable/manrope/wght.css";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { QuoteBasketProvider } from "@/components/QuoteBasketProvider";

import "./globals.css";

/* =========================================
   BARK ORNAMENT - ROOT LAYOUT
   Theme: Golden Coastal Luxury

   TYPOGRAPHY
   Headings: Cormorant Garamond
   Body/UI: Manrope

   FILE 150 - FONT BUILD CORRECTION

   Font files are provided by local
   Fontsource packages instead of
   next/font/google.

   This avoids Google Fonts requests
   during the Next.js production build.

   All existing layout, SEO, quotation,
   and accessibility behavior preserved.
   ========================================= */

/* Font family variables consumed by globals.css */
const fontVariables = {
  "--font-cormorant": '"Cormorant Garamond Variable"',
  "--font-manrope": '"Manrope Variable"',
} as CSSProperties;

/* Website SEO metadata */
export const metadata: Metadata = {
  metadataBase: new URL("https://www.barkornament.com"),

  title: {
    default:
      "Bark Ornament | Customized Hospitality Products",
    template: "%s | Bark Ornament",
  },

  description:
    "Explore customized hospitality products from Bark Ornament (Pvt) Ltd, including printed products, wooden accessories, packaging, gifts and hotel supplies.",

  applicationName: "Bark Ornament",

  keywords: [
    "Bark Ornament",
    "hospitality products",
    "hotel supplies",
    "customized hotel products",
    "wooden hotel accessories",
    "hotel stationery",
    "hospitality packaging",
    "Maldives hotel supplies",
    "Seychelles hotel supplies",
    "Sri Lanka hotel supplies",
  ],

  robots: {
    index: true,
    follow: true,
  },
};

/* Mobile viewport and browser theme */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF7F0",
};

/* Root layout component */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
    >
      <body style={fontVariables}>
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to main content
        </a>

        <QuoteBasketProvider>
          <Header />

          <main
            id="main-content"
            className="min-h-[60vh]"
          >
            {children}
          </main>

          <Footer />
        </QuoteBasketProvider>
      </body>
    </html>
  );
}
