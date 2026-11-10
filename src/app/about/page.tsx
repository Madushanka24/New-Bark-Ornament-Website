
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Our Story | Bark Ornament",
  description:
    "Discover Bark Ornament's journey from Bees Digital in 1998 to a Sri Lankan hospitality product supplier serving the Maldives, Seychelles and beyond.",
};

/**
 * BARK ORNAMENT — FILE 81
 * About Us & Company Story
 *
 * File: src/app/about/page.tsx
 *
 * Company history:
 * 1998 — Bees Digital
 * 2002 — Bark Ornament established as a sole proprietorship
 * Today — Bark Ornament (Pvt) Ltd
 *
 * Does not assert an unverified incorporation date.
 *
 * UI FIX 07:
 * Correct dark-background heading visibility in:
 * 1. About Us hero
 * 2. Discover Our Collections CTA
 *
 * No database calls, API requests, server actions,
 * quotation submissions, email delivery or new packages.
 */

const milestones = [
  {
    year: "1998",
    label: "Where the story began",
    title: "Bees Digital",
    description:
      "The journey began with Bees Digital. A wooden-covered pen became an early defining product, bringing together everyday function and distinctive presentation.",
  },
  {
    year: "2002",
    label: "A new business identity",
    title: "Bark Ornament",
    description:
      "Mr. Upul Nanayakkara established Bark Ornament as a sole proprietorship, building on the original idea of creating practical products with a memorable finish.",
  },
  {
    year: "Today",
    label: "Hospitality-focused solutions",
    title: "Bark Ornament (Pvt) Ltd",
    description:
      "Today, Bark Ornament serves business and hospitality requirements across product categories including printing, branded materials, bags, crafts and guest presentation.",
  },
] as const;

const capabilities = [
  {
    number: "01",
    title: "Print & brand presentation",
    text:
      "Corporate stationery, printed collateral, tags, cards, menus and other guest-facing details.",
    href: "/categories/printing-stationery",
    linkText: "Explore printing",
  },
  {
    number: "02",
    title: "Bags & packaging",
    text:
      "Customized bags and packaging formats that help carry a property's identity beyond the first impression.",
    href: "/categories/bags-packaging",
    linkText: "Explore packaging",
  },
  {
    number: "03",
    title: "Craft & natural materials",
    text:
      "Wooden items, cane products, ceramic pieces and traditional Laksha crafts for selected applications.",
    href: "/categories/wooden-products",
    linkText: "Explore wooden craft",
  },
  {
    number: "04",
    title: "Operational & gifting essentials",
    text:
      "Laundry-related products, guest gifts, promotional accessories and selected decorative items.",
    href: "/categories/gifts-promotional",
    linkText: "Explore gifting",
  },
] as const;

const process = [
  {
    number: "01",
    title: "Understand your requirement",
    text:
      "We begin with the intended use, destination, quantity, brand identity and product specifications.",
  },
  {
    number: "02",
    title: "Consider material & finish",
    text:
      "Paper, board, wood, fabrics and other materials can be discussed alongside printing and customization options.",
  },
  {
    number: "03",
    title: "Confirm the practical details",
    text:
      "Order-specific feasibility, samples where appropriate, production planning and freight arrangements require confirmation.",
  },
] as const;

const primaryMarkets = [
  {
    name: "Maldives",
    href: "/markets/maldives",
    note: "Resort and island hospitality",
  },
  {
    name: "Seychelles",
    href: "/markets/seychelles",
    note: "Hospitality and branded supply",
  },
  {
    name: "Sri Lanka",
    href: "/markets/sri-lanka",
    note: "Home market and operating base",
  },
] as const;

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

/**
 * Abstract brand-history artwork.
 *
 * No image dependency or fictional founder photo.
 * Replace with approved company photography
 * in a future one-file milestone if desired.
 */

function BrandMotif() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/45 bg-[#473629] p-7 shadow-2xl"
    >
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#E3B65D]/35 px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E3B65D]">
          Our beginnings
        </p>

        <p className="mt-6 font-serif text-7xl leading-none text-[#E3B65D] sm:text-8xl">
          1998
        </p>

        <div className="my-7 h-px w-20 bg-[#E3B65D]/50" />

        <p className="max-w-[13rem] text-sm leading-7 text-[#E9DDC9]">
          Thoughtful objects. Distinctive details.
        </p>
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="bg-[#FAF7F0] text-[#30251F]">
      {/* =====================================
          1. HERO AND BREADCRUMB
          ===================================== */}

      <section
        aria-labelledby="about-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20 lg:py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-44 h-[500px] w-[500px] rounded-full border border-[#C59A45]/20"
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
                About Us
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament · Our Story
              </p>

              {/* UI FIX 07 — HERO HEADING */}

              <h1
                id="about-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
                style={{
                  color: "#FAF7F0",
                }}
              >
                A Story of Craft.

                <span
                  className="mt-2 block"
                  style={{
                    color: "#E3B65D",
                  }}
                >
                  A Focus on Hospitality.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                From an early idea built around a
                wooden-covered pen to a broad range of
                customized hospitality products,
                Bark Ornament&apos;s journey has been shaped
                by material, detail and presentation.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#our-journey"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Discover our journey

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

            <BrandMotif />
          </div>
        </div>
      </section>

      {/* =====================================
          2. WHO WE ARE
          ===================================== */}

      <section
        aria-labelledby="who-we-are-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
              Who we are
            </p>

            <h2
              id="who-we-are-title"
              className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            >
              Practical Products. Considered Presentation.
            </h2>
          </div>

          <div className="space-y-5 text-base leading-8 text-[#66584F]">
            <p>
              Bark Ornament (Pvt) Ltd is a Sri Lanka-based
              supplier serving business-to-business
              requirements, with a particular focus on
              hotels and resorts.
            </p>

            <p>
              Founded by Mr. Upul Nanayakkara, the business
              grew from the beginnings of Bees Digital
              into a broader product offering that brings
              together printing, packaging, wooden
              accessories, crafts and guest-facing
              essentials.
            </p>

            <p>
              Rather than treating every requirement as
              identical, we work around the product&apos;s
              intended use, brand identity, material
              choices and the practical details of an
              order.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================
          3. COMPANY HISTORY
          ===================================== */}

      <section
        id="our-journey"
        aria-labelledby="journey-title"
        className="scroll-mt-20 border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            The journey
          </p>

          <h2
            id="journey-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            From the First Idea to Today
          </h2>

          <p className="mt-5 max-w-2xl text-base leading-8 text-[#74675E]">
            Three moments that introduce the company&apos;s
            origins and development.
          </p>

          <ol className="mt-10 grid gap-5 lg:grid-cols-3">
            {milestones.map((milestone) => (
              <li
                key={milestone.year}
                className="relative flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7 shadow-sm sm:p-8"
              >
                <span className="font-serif text-5xl text-[#A87935]">
                  {milestone.year}
                </span>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  {milestone.label}
                </p>

                <h3 className="mt-3 font-serif text-2xl text-[#30251F]">
                  {milestone.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#74675E]">
                  {milestone.description}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-sm leading-7 text-[#74675E]">
            The year 2002 refers to Bark Ornament&apos;s
            establishment as a sole proprietorship; it
            is not presented as the date of incorporation
            of the present company.
          </p>
        </div>
      </section>

      {/* =====================================
          4. PRODUCT CAPABILITIES
          ===================================== */}

      <section
        aria-labelledby="capabilities-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            What we offer
          </p>

          <h2
            id="capabilities-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Product Expertise for Hospitality
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Explore representative product families for
            hotel operations, guest presentation and
            branded requirements. Specific availability
            and customization are confirmed by enquiry.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {capabilities.map((item) => (
              <article
                key={item.number}
                className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-white p-7 shadow-sm sm:p-8"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {item.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F]">
                  {item.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {item.text}
                </p>

                <Link
                  href={item.href}
                  className="mt-7 inline-flex min-h-11 items-center gap-2 self-start rounded-sm text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
                >
                  {item.linkText}
                  <Arrow />
                </Link>
              </article>
            ))}
          </div>

          <Link
            href="/categories"
            className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
          >
            View all product categories
            <Arrow />
          </Link>
        </div>
      </section>

      {/* =====================================
          5. HOW WE WORK
          ===================================== */}

      <section
        aria-labelledby="approach-title"
        className="border-y border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            How we approach a brief
          </p>

          <h2
            id="approach-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            From Requirement to Product Discussion
          </h2>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {process.map((step) => (
              <article
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
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================
          6. INTERNATIONAL MARKETS
          ===================================== */}

      <section
        aria-labelledby="markets-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Our international focus
          </p>

          <h2
            id="markets-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Rooted in Sri Lanka. Serving Island Hospitality.
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Our primary markets include the Maldives,
            Seychelles and Sri Lanka. We also serve
            requirements associated with Mauritius and
            Fiji, subject to order-specific feasibility
            and arrangements.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {primaryMarkets.map((market) => (
              <Link
                key={market.href}
                href={market.href}
                className="group flex min-h-44 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  {market.note}
                </span>

                <span className="mt-8 flex items-end justify-between gap-3 font-serif text-2xl text-[#30251F]">
                  {market.name}
                  <Arrow />
                </span>
              </Link>
            ))}
          </div>

          <Link
            href="/markets"
            className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
          >
            Explore all markets
            <Arrow />
          </Link>
        </div>
      </section>

      {/* =====================================
          7. SAFE NAVIGATION
          NO FORM OR POST REQUEST
          ===================================== */}

      <section
        aria-labelledby="about-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Discover our collections
          </p>

          {/* UI FIX 07 — BOTTOM HEADING */}

          <h2
            id="about-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Every Product Starts with a Purpose.
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Browse our catalogue or explore the product
            showcase for ideas. Product specifications,
            availability and order arrangements are
            confirmed through discussion.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/gallery"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Explore gallery
              <Arrow />
            </Link>

            <Link
              href="/request-quotation"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              View quotation page
              <Arrow />
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-[#D8C8B5]">
            Online quotation submissions remain disabled
            during development.
          </p>
        </div>
      </section>
    </main>
  );
}
