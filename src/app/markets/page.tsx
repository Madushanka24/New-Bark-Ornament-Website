
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Our Markets | Bark Ornament",
  description:
    "Discover how Bark Ornament (Pvt) Ltd supports hospitality product requirements in the Maldives, Seychelles, Sri Lanka and other island markets.",
};

/**
 * BARK ORNAMENT — MARKETS LANDING PAGE
 *
 * Route: /markets
 *
 * UI FIX 10:
 * - Corrected hero heading visibility
 * - Corrected final CTA heading visibility
 * - Standardized primary buttons to brand orange
 * - Preserved all market content and navigation
 *
 * No database queries, quotation submissions,
 * automated emails or new dependencies.
 */

const primaryMarkets = [
  {
    id: "maldives",
    number: "01",
    name: "Maldives",
    descriptor: "Resort & island hospitality",
    headline: "Distinctive details for resort experiences.",
    description:
      "We work with hospitality customers in the Maldives on customised presentation and operational product requirements, bringing brand details into everyday guest experiences.",
    applications: [
      {
        label: "Menus & guest presentation",
        slug: "menus-guest-service",
      },
      {
        label: "Bags & packaging",
        slug: "bags-packaging",
      },
      {
        label: "Tags, stickers & cards",
        slug: "tags-stickers-cards",
      },
    ],
    note:
      "Production specifications, quantities and delivery arrangements are discussed for each enquiry.",
  },
  {
    id: "seychelles",
    number: "02",
    name: "Seychelles",
    descriptor: "Hospitality & branded supply",
    headline: "Considered products for island destinations.",
    description:
      "Our Seychelles-facing product offering includes printed collateral, guest presentation materials, packaging and selected crafted products for hospitality requirements.",
    applications: [
      {
        label: "Printing & stationery",
        slug: "printing-stationery",
      },
      {
        label: "Wooden products & crafts",
        slug: "wooden-products",
      },
      {
        label: "Gifts & promotional items",
        slug: "gifts-promotional",
      },
    ],
    note:
      "Export logistics and lead times depend on order scope and the available shipping arrangements.",
  },
  {
    id: "sri-lanka",
    number: "03",
    name: "Sri Lanka",
    descriptor: "Our home market & operating base",
    headline: "Craftsmanship and customisation begin here.",
    description:
      "Based in Sri Lanka, Bark Ornament develops and supplies customised product solutions for hospitality and business customers, while supporting export requirements for overseas markets.",
    applications: [
      {
        label: "Printing & corporate stationery",
        slug: "printing-stationery",
      },
      {
        label: "Laundry & hotel operations",
        slug: "laundry-operations",
      },
      {
        label: "Ceramic, pottery & Laksha",
        slug: "ceramic-pottery-laksha",
      },
    ],
    note:
      "Product materials, branding methods and quantities are considered according to the project brief.",
  },
] as const;

const additionalMarkets = [
  {
    name: "Mauritius",
    descriptor: "Additional international market",
    description:
      "Discuss selected hospitality product requirements, customisation possibilities and order-specific export arrangements.",
  },
  {
    name: "Fiji",
    descriptor: "Additional international market",
    description:
      "Explore suitable product categories and confirm feasibility, specifications and logistics with our team.",
  },
] as const;

/* ==========================================
   REUSABLE BRAND BUTTON STYLES
   ========================================== */

const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-7 py-3 text-sm font-bold text-white transition-[background-color,transform] duration-200 hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transform-none motion-reduce:transition-none";

const outlineButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors duration-200 hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none";

function Arrow({
  down = false,
}: {
  down?: boolean;
}) {
  return (
    <span aria-hidden="true">
      {down ? "↓" : "→"}
    </span>
  );
}

/* ==========================================
   DECORATIVE MARKET ARTWORK
   ========================================== */

/**
 * Retained decorative artwork.
 * No external images or geographic route claims.
 */

function MarketMotif() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-[340px] items-center justify-center overflow-hidden rounded-[2rem] border border-[#E3B65D]/40 bg-[#49382E] p-7 shadow-2xl"
    >
      <div className="absolute -right-20 -top-16 h-64 w-64 rounded-full border border-[#E3B65D]/25" />
      <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <svg
        viewBox="0 0 240 260"
        fill="none"
        className="relative w-full max-w-60 text-[#E3B65D]"
      >
        <circle
          cx="120"
          cy="122"
          r="90"
          stroke="currentColor"
          strokeOpacity="0.35"
        />

        <circle
          cx="120"
          cy="122"
          r="63"
          stroke="currentColor"
          strokeOpacity="0.45"
        />

        <circle
          cx="120"
          cy="122"
          r="36"
          stroke="currentColor"
          strokeOpacity="0.65"
        />

        <path
          d="M20 122H220M120 22V222"
          stroke="currentColor"
          strokeOpacity="0.3"
        />

        <path
          d="M46 181C79 150 115 160 145 121S194 89 212 63"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <circle
          cx="70"
          cy="165"
          r="6"
          fill="currentColor"
        />

        <circle
          cx="145"
          cy="121"
          r="6"
          fill="currentColor"
        />

        <circle
          cx="194"
          cy="83"
          r="6"
          fill="currentColor"
        />

        <path
          d="M66 236H174"
          stroke="currentColor"
          strokeOpacity="0.6"
        />
      </svg>

      <div className="absolute inset-x-6 bottom-8 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[#F4DBAF]">
        Connected by hospitality
      </div>
    </div>
  );
}

/* ==========================================
   MARKETS PAGE
   ========================================== */

export default function MarketsPage() {
  return (
    <main className="bg-[#FAF7F0] text-[#30251F]">

      {/* =====================================
          1. EDITORIAL HERO
          ===================================== */}

      <section
        aria-labelledby="markets-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20 lg:py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-48 h-[500px] w-[500px] rounded-full border border-[#C59A45]/20"
        />

        <div className="relative mx-auto max-w-7xl">

          {/* BREADCRUMB */}

          <nav
            aria-label="Breadcrumb"
            className="mb-12 text-sm text-[#E9DDC9]"
          >
            <ol className="flex flex-wrap items-center gap-3">
              <li>
                <Link
                  href="/"
                  className="rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
                >
                  Home
                </Link>
              </li>

              <li
                aria-hidden="true"
                className="text-[#E3B65D]"
              >
                /
              </li>

              <li
                aria-current="page"
                className="text-white"
              >
                Our Markets
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E3B65D]">
                Bark Ornament · International Hospitality
              </p>

              {/* UI FIX 10 - HERO HEADING */}

              <h1
                id="markets-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
                style={{
                  color: "#FAF7F0",
                }}
              >
                Rooted in Sri Lanka.

                <span
                  className="mt-2 block"
                  style={{
                    color: "#E3B65D",
                  }}
                >
                  Connected to Island Hospitality.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                From the Maldives and Seychelles to our home
                market in Sri Lanka, we help hospitality
                businesses explore tailored printed, crafted
                and branded product solutions.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#primary-markets"
                  className={primaryButton}
                >
                  Explore our markets
                  <Arrow down />
                </a>

                <Link
                  href="/products"
                  className={outlineButton}
                >
                  Browse products
                  <Arrow />
                </Link>
              </div>
            </div>

            <MarketMotif />
          </div>
        </div>
      </section>

      {/* =====================================
          2. CORE MARKET NAVIGATION
          ===================================== */}

      <section
        id="primary-markets"
        aria-labelledby="primary-markets-title"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B95016]">
            Markets we serve
          </p>

          <h2
            id="primary-markets-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl"
          >
            Our Core Markets
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Every hospitality destination brings different
            brand, operational and logistics considerations.
            Explore our three principal markets to see
            relevant product families and approaches.
          </p>

          <nav
            aria-label="Jump to a market"
            className="mt-9 flex flex-wrap gap-3"
          >
            {primaryMarkets.map((market) => (
              <a
                key={market.id}
                href={`#${market.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D5C2A6] bg-white px-5 py-2 text-sm font-semibold text-[#5A4232] transition-colors hover:border-[#B95016] hover:bg-[#F3E7D5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                {market.name}
                <Arrow down />
              </a>
            ))}

            <a
              href="#additional-markets"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D5C2A6] bg-white px-5 py-2 text-sm font-semibold text-[#5A4232] transition-colors hover:border-[#B95016] hover:bg-[#F3E7D5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016] motion-reduce:transition-none"
            >
              Other markets
              <Arrow down />
            </a>
          </nav>
        </div>
      </section>

      {/* =====================================
          3. MAIN MARKET PROFILES
          ===================================== */}

      {primaryMarkets.map((market, index) => (
        <section
          key={market.id}
          id={market.id}
          aria-labelledby={`${market.id}-title`}
          className={`scroll-mt-20 border-t border-[#E0D2BF] px-5 py-16 sm:px-8 sm:py-20 ${
            index % 2 === 0
              ? "bg-[#F3EBDF]"
              : "bg-[#FAF7F0]"
          }`}
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">

            {/* MARKET INFORMATION */}

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
                Market {market.number} · {market.descriptor}
              </p>

              <h2
                id={`${market.id}-title`}
                className="mt-4 font-serif text-4xl leading-tight sm:text-5xl"
              >
                {market.name}
              </h2>

              <p className="mt-5 font-serif text-2xl leading-snug text-[#9B6427] sm:text-3xl">
                {market.headline}
              </p>

              <p className="mt-6 max-w-xl text-base leading-8 text-[#66584F]">
                {market.description}
              </p>

              <p className="mt-6 max-w-xl border-l-2 border-[#C59A45] pl-4 text-sm leading-7 text-[#74675E]">
                {market.note}
              </p>

              <div className="mt-8">
                <Link
                  href={`/markets/${market.id}`}
                  aria-label={`Explore ${market.name} market details`}
                  className={primaryButton}
                >
                  Explore {market.name}
                  <Arrow />
                </Link>
              </div>
            </div>

            {/* RELEVANT PRODUCT COLLECTIONS */}

            <div className="rounded-2xl border border-[#D9C8B0] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                Explore relevant collections
              </p>

              <h3 className="mt-3 font-serif text-2xl leading-tight text-[#30251F]">
                Product families for discussion
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#74675E]">
                These are examples of applicable categories,
                not a claim of local stock or guaranteed
                availability.
              </p>

              <ul className="mt-6 divide-y divide-[#E8DCCB]">
                {market.applications.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/categories/${item.slug}`}
                      className="group flex min-h-14 items-center justify-between gap-4 rounded-sm py-4 text-sm font-semibold text-[#4E392F] transition-colors hover:text-[#A94C19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016] motion-reduce:transition-none"
                    >
                      {item.label}

                      <span
                        aria-hidden="true"
                        className="text-[#A94C19]"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* UI FIX 10 - ORANGE CATALOGUE BUTTON */}

              <Link
                href="/products"
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none"
              >
                Browse full catalogue
                <Arrow />
              </Link>
            </div>
          </div>
        </section>
      ))}

      {/* =====================================
          4. ADDITIONAL INTERNATIONAL MARKETS
          ===================================== */}

      <section
        id="additional-markets"
        aria-labelledby="additional-markets-title"
        className="scroll-mt-20 border-t border-[#E0D2BF] bg-[#FAF7F0] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B95016]">
            Additional international reach
          </p>

          <h2
            id="additional-markets-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Mauritius & Fiji
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Bark Ornament also serves requirements associated
            with Mauritius and Fiji. Product suitability and
            export arrangements are evaluated for each enquiry.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {additionalMarkets.map((market, index) => (
              <article
                key={market.name}
                className="relative overflow-hidden rounded-2xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 sm:p-9"
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-5 -top-12 font-serif text-[140px] leading-none text-[#C59A45]/10"
                >
                  {index + 4}
                </span>

                <div className="relative">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                    {market.descriptor}
                  </p>

                  <h3 className="mt-4 font-serif text-3xl text-[#30251F]">
                    {market.name}
                  </h3>

                  <p className="mt-4 max-w-md text-sm leading-7 text-[#66584F]">
                    {market.description}
                  </p>

                  <Link
                    href="/products"
                    className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
                  >
                    Explore products
                    <Arrow />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================
          5. EXPORT PROJECT WORKFLOW
          ===================================== */}

      <section
        aria-labelledby="working-together-title"
        className="border-t border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B95016]">
            From brief to specification
          </p>

          <h2
            id="working-together-title"
            className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl"
          >
            How We Approach International Requirements
          </h2>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Understand the brief",
                text:
                  "Share the destination, intended use, quantity and product specifications.",
              },
              {
                number: "02",
                title: "Review materials & branding",
                text:
                  "Discuss suitable formats, materials, printing finishes and customisation options.",
              },
              {
                number: "03",
                title: "Confirm fulfilment details",
                text:
                  "Review production feasibility, delivery method and estimated lead time for the specific order.",
              },
            ].map((step) => (
              <article
                key={step.number}
                className="rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#AE7C35]"
                >
                  {step.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl text-[#30251F]">
                  {step.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#74675E]">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================
          6. SAFE QUOTATION NAVIGATION
          ===================================== */}

      <section
        aria-labelledby="market-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Thoughtful products, across markets
          </p>

          {/* UI FIX 10 - BOTTOM HEADING VISIBILITY */}

          <h2
            id="market-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Planning a Hospitality Requirement?
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Browse suitable products and prepare your
            requirements. Our team can discuss
            customisation and market-specific fulfilment
            once the project scope is confirmed.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/products"
              className={primaryButton}
            >
              Explore products
              <Arrow />
            </Link>

            <Link
              href="/request-quotation"
              className={outlineButton}
            >
              View quotation page
              <Arrow />
            </Link>
          </div>

          <p className="mt-6 text-sm text-[#D8C8B5]">
            Online quotation submissions remain disabled
            during development.
          </p>
        </div>
      </section>
    </main>
  );
}
