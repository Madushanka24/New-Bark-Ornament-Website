
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Bark Ornament (Pvt) Ltd about customised hospitality products, printed materials, packaging, crafts and guest presentation requirements.",
};

/**
 * BARK ORNAMENT — FILE 82
 * Contact Us page
 *
 * File: src/app/contact/page.tsx
 *
 * UI FIX 13:
 * - Corrected hero heading visibility.
 * - Corrected bottom CTA heading visibility.
 * - Updated primary buttons to brand orange.
 *
 * FILE 184:
 * - Avoid nested main landmarks.
 * - Prevent duplicate branding in page title.
 *
 * The enquiry email below was supplied in earlier
 * Bark Ornament marketing material. Confirm that it
 * is appropriate as a public website contact before launch.
 *
 * No invented telephone numbers, street addresses,
 * working hours or social media accounts.
 *
 * This page contains no contact submission form,
 * database access, server action, API call or
 * server-side email delivery.
 */

const contact = {
  email: "gm@barkornament.com",
  operatingBase: "Sri Lanka",
} as const;

const enquirySteps = [
  {
    number: "01",
    title: "Select your products",
    description:
      "Tell us which printed, crafted, packaging or hospitality products you wish to discuss.",
  },
  {
    number: "02",
    title: "Prepare your specifications",
    description:
      "Include dimensions, preferred materials, quantities, customization details and artwork where applicable.",
  },
  {
    number: "03",
    title: "Share your destination",
    description:
      "Specify the country and delivery destination so fulfilment considerations can be discussed.",
  },
] as const;

const markets = [
  {
    name: "Maldives",
    descriptor: "Resort & island hospitality",
    href: "/markets/maldives",
  },
  {
    name: "Seychelles",
    descriptor: "Hospitality & branded supply",
    href: "/markets/seychelles",
  },
  {
    name: "Sri Lanka",
    descriptor: "Home market & operating base",
    href: "/markets/sri-lanka",
  },
] as const;

const enquiryDetails = [
  "Company or resort name",
  "Contact name and preferred reply details",
  "Product description and intended use",
  "Approximate quantity and dimensions",
  "Custom branding, artwork or finish requirements",
  "Destination and preferred delivery date",
] as const;

const relatedPages = [
  {
    title: "Product Catalogue",
    description:
      "Explore products for hospitality presentation, operations and branded requirements.",
    href: "/products",
    cta: "Explore Products",
  },
  {
    title: "Product Categories",
    description:
      "Discover the main product families and options relevant to your enquiry.",
    href: "/categories",
    cta: "Browse Categories",
  },
  {
    title: "Gallery & Portfolio",
    description:
      "Explore representative product types while approved photography is being prepared.",
    href: "/gallery",
    cta: "View Gallery",
  },
] as const;

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

/**
 * Decorative editorial artwork.
 *
 * No geographical map, business address,
 * client photo or external image dependency.
 */

function ContactArtwork() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/45 bg-[#473629] p-7 shadow-2xl"
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#C59A45]/25" />

      <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full border border-[#C59A45]/25" />

      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#C59A45]/40 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
          Bark Ornament
        </span>

        <svg
          viewBox="0 0 96 96"
          width="88"
          height="88"
          fill="none"
          className="mt-9 text-[#E3B65D]"
        >
          <rect
            x="15"
            y="27"
            width="66"
            height="44"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.5"
          />

          <path
            d="M16 29L48 53L80 29"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          <path
            d="M17 69L37 48M79 69L59 48"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
        </svg>

        <span className="mt-8 font-serif text-3xl text-[#E3B65D]">
          Every Detail Matters.
        </span>

        <span className="mt-5 max-w-56 text-sm leading-7 text-[#E9DDC9]">
          Thoughtful conversations begin with a clear brief.
        </span>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div className="bg-[#FAF7F0] text-[#30251F]">
      {/* =====================================
          1. HERO
          ===================================== */}

      <section
        aria-labelledby="contact-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20 lg:py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-44 -top-48 h-[520px] w-[520px] rounded-full border border-[#C59A45]/20"
        />

        <div className="relative mx-auto max-w-7xl">
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
                Contact Us
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament · Get in Touch
              </p>

              {/* UI FIX 13 — HERO HEADING VISIBILITY */}

              <h1
                id="contact-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
                style={{
                  color: "#FAF7F0",
                }}
              >
                Let&apos;s Create Something

                <span
                  className="mt-2 block"
                  style={{
                    color: "#E3B65D",
                  }}
                >
                  Considered.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                Exploring customized hospitality products?
                Share your ideas, specifications and intended
                destination to start a product discussion.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#contact-details"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none"
                >
                  View contact details

                  <span aria-hidden="true">↓</span>
                </a>

                <Link
                  href="/products"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Explore products
                  <Arrow />
                </Link>
              </div>
            </div>

            <ContactArtwork />
          </div>
        </div>
      </section>

      {/* =====================================
          2. DIRECT CONTACT DETAILS
          ===================================== */}

      <section
        id="contact-details"
        aria-labelledby="contact-details-title"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Contact information
          </p>

          <h2
            id="contact-details-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Start a Conversation
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Contact Bark Ornament with your product requirements,
            or browse the catalogue to identify suitable
            product categories before preparing your enquiry.
          </p>

          <div className="mt-9 grid gap-6 md:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-[#D9C8B0] bg-white p-7 shadow-sm sm:p-9">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3E5CE] text-[#A94C19]"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />

                  <path
                    d="M4 7L12 13L20 7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                Product enquiries
              </p>

              <h3 className="mt-3 font-serif text-2xl text-[#30251F]">
                Email Us
              </h3>

              <a
                href={`mailto:${contact.email}?subject=Bark%20Ornament%20Product%20Enquiry`}
                className="mt-4 break-all rounded-sm text-lg font-semibold text-[#A94C19] underline decoration-[#C59A45]/50 underline-offset-4 hover:text-[#783510] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
              >
                {contact.email}
              </a>

              <p className="mt-5 flex-1 text-sm leading-7 text-[#74675E]">
                Use your own email application to prepare
                an enquiry. The website does not send
                or submit an email on your behalf.
              </p>

              <a
                href={`mailto:${contact.email}?subject=Bark%20Ornament%20Product%20Enquiry`}
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#913E11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                Compose an Email
                <Arrow />
              </a>
            </article>

            <article className="flex flex-col rounded-2xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 sm:p-9">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E7D6BB] text-[#A94C19]"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M20 10C20 16 12 21 12 21S4 16 4 10a8 8 0 1 1 16 0Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />

                  <circle
                    cx="12"
                    cy="10"
                    r="2.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                Company location
              </p>

              <h3 className="mt-3 font-serif text-2xl text-[#30251F]">
                Our Operating Base
              </h3>

              <p className="mt-4 text-xl font-semibold text-[#5A4232]">
                {contact.operatingBase}
              </p>

              <p className="mt-5 flex-1 text-sm leading-7 text-[#74675E]">
                Bark Ornament is based in Sri Lanka and
                supports hospitality product requirements
                across its international markets.
                Detailed delivery arrangements are
                discussed according to each enquiry.
              </p>

              <Link
                href="/markets"
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-md border border-[#A87935] px-6 py-3 text-sm font-bold text-[#5A4232] transition-colors hover:bg-[#E7D6BB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                Explore Our Markets
                <Arrow />
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* =====================================
          3. PREPARE AN ENQUIRY
          ===================================== */}

      <section
        aria-labelledby="enquiry-guide-title"
        className="border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Enquiry guidance
          </p>

          <h2
            id="enquiry-guide-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Tell Us About Your Requirement
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            A clear brief makes it easier to discuss
            materials, customization possibilities,
            order quantities and fulfilment arrangements.
          </p>

          <ol className="mt-9 grid gap-5 md:grid-cols-3">
            {enquirySteps.map((step) => (
              <li
                key={step.number}
                className="rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {step.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F]">
                  {step.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#74675E]">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-9 rounded-2xl border border-[#D9C8B0] bg-white p-7 sm:p-9">
            <h3 className="font-serif text-2xl text-[#30251F]">
              Helpful Information to Include
            </h3>

            <ul className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {enquiryDetails.map((detail) => (
                <li
                  key={detail}
                  className="flex items-start gap-3 text-sm leading-7 text-[#66584F]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1 font-bold text-[#A94C19]"
                  >
                    ✓
                  </span>

                  <span>{detail}</span>
                </li>
              ))}
            </ul>

            <p className="mt-7 text-sm leading-7 text-[#74675E]">
              Please avoid including confidential
              information or unnecessary personal data
              in an initial product enquiry.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================
          4. MARKET-SPECIFIC INFORMATION
          ===================================== */}

      <section
        aria-labelledby="contact-markets-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            International hospitality
          </p>

          <h2
            id="contact-markets-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore Your Market
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Review the products and planning considerations
            relevant to Bark Ornament&apos;s three principal
            markets. Mauritius and Fiji are also
            referenced on our Markets page.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {markets.map((market) => (
              <Link
                key={market.href}
                href={market.href}
                className="group flex min-h-44 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  {market.descriptor}
                </span>

                <span className="mt-8 flex items-end justify-between gap-3 font-serif text-2xl text-[#30251F]">
                  {market.name}
                  <Arrow />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================
          5. RELATED EXISTING PAGES
          ===================================== */}

      <section
        aria-labelledby="explore-title"
        className="border-t border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Before you enquire
          </p>

          <h2
            id="explore-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore Our Product Offering
          </h2>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {relatedPages.map((page) => (
              <article
                key={page.href}
                className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7"
              >
                <h3 className="font-serif text-2xl text-[#30251F]">
                  {page.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {page.description}
                </p>

                <Link
                  href={page.href}
                  className="mt-7 inline-flex min-h-11 items-center gap-2 self-start rounded-sm text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
                >
                  {page.cta}
                  <Arrow />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================
          6. QUOTATION NAVIGATION
          NO FORM SUBMISSION
          ===================================== */}

      <section
        aria-labelledby="contact-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Hospitality product solutions
          </p>

          {/* UI FIX 13 — BOTTOM HEADING VISIBILITY */}

          <h2
            id="contact-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Ready to Plan Your Next Requirement?
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Browse the product catalogue or review the
            quotation page to prepare your requirements.
            Online quotation submissions are not yet
            available during development.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none"
            >
              Browse Products
              <Arrow />
            </Link>

            <Link
              href="/request-quotation"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              View Quotation Page
              <Arrow />
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-[#D8C8B5]">
            No enquiry is submitted through this page.
            Website quotation submissions and automated
            email notifications remain disabled.
          </p>
        </div>
      </section>
    </div>
  );
}
