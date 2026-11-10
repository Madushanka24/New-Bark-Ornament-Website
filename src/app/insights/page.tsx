
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Insights | News, Knowledge & Downloads | Bark Ornament",
  description:
    "Explore hospitality product knowledge, printing and material guides, company updates and downloadable resource collections from Bark Ornament (Pvt) Ltd.",
};

/**
 * BARK ORNAMENT — FILE 88
 *
 * Insights Landing Page — Navigation Integration
 *
 * File:
 * src/app/insights/page.tsx
 *
 * Completed routes:
 * /insights/news
 * /insights/knowledge
 * /insights/downloads
 * /insights/knowledge/understanding-gsm
 *
 * UI FIX 12:
 * - Corrected hero heading color.
 * - Corrected final CTA heading color.
 * - Updated primary CTA buttons to brand orange.
 *
 * The GSM article remains an editorial website draft.
 * No publication dates or PDF files are invented.
 *
 * No client-side state, external images, API requests,
 * database access, quotation submissions or emails.
 */

const insightSections = [
  {
    id: "news",
    number: "01",
    label: "NEWS & UPDATES",
    title: "News",
    description:
      "Company announcements, selected product developments and relevant hospitality industry updates.",
    href: "/insights/news",
    linkLabel: "Explore News",
  },
  {
    id: "knowledge",
    number: "02",
    label: "LEARN & EXPLORE",
    title: "Knowledge Hub",
    description:
      "Practical explanations of printing, materials, packaging and the details that shape hospitality products.",
    href: "/insights/knowledge",
    linkLabel: "Explore Knowledge Hub",
  },
  {
    id: "downloads",
    number: "03",
    label: "PUBLICATIONS & TOOLS",
    title: "Downloads",
    description:
      "A dedicated home for approved catalogues, educational magazines, guides and technical resources.",
    href: "/insights/downloads",
    linkLabel: "Explore Downloads",
  },
] as const;

const newsTopics = [
  {
    number: "01",
    title: "Company Announcements",
    description:
      "Updates about Bark Ornament initiatives, milestones, service developments and company activities.",
  },
  {
    number: "02",
    title: "Products & Materials",
    description:
      "New product concepts, material developments and applications relevant to hospitality operations.",
  },
  {
    number: "03",
    title: "Hospitality Market Insights",
    description:
      "Selected developments relevant to hotels, resorts, purchasing teams and island hospitality markets.",
  },
] as const;

const knowledgeTopics = [
  {
    label: "KNOWLEDGE SERIES · EDITION 01",
    title:
      "What Does GSM Mean, and Why Does It Matter for Hospitality Products?",
    description:
      "Understand paper weight and how GSM relates to the appearance, handling and suitability of printed hospitality products.",
    status: "Existing editorial topic",
  },
  {
    label: "PLANNED KNOWLEDGE TOPIC",
    title: "Choosing the Right Finish for Printed Products",
    description:
      "Explore matte and gloss lamination, embossing, debossing, foil stamping and spot UV.",
    status: "Content planned",
  },
  {
    label: "PLANNED KNOWLEDGE TOPIC",
    title: "Paper vs Board: Choosing the Right Material",
    description:
      "Compare common material considerations for stationery, packaging, menus and guest collateral.",
    status: "Content planned",
  },
  {
    label: "PLANNED KNOWLEDGE TOPIC",
    title: "Sea Freight vs Air Freight",
    description:
      "Introduce the cost, volume, transit and planning considerations involved in international supply.",
    status: "Content planned",
  },
] as const;

const resourceTypes = [
  {
    number: "01",
    type: "PDF MAGAZINES",
    title: "Knowledge Series",
    description:
      "A growing archive of educational editions about materials, printing, packaging and hospitality product decisions.",
    example: "Example: Edition 01 — Understanding GSM",
  },
  {
    number: "02",
    type: "PRODUCT REFERENCES",
    title: "Product Catalogues",
    description:
      "Approved company and product brochures for customers who want to explore categories and discuss requirements.",
    example: "Publication files to be connected",
  },
  {
    number: "03",
    type: "PRACTICAL GUIDES",
    title: "Technical Resources",
    description:
      "Future printable reference material such as artwork preparation, packaging measurements and material-selection guides.",
    example: "Publication files to be connected",
  },
] as const;

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

/**
 * Decorative editorial artwork.
 * No photography, remote requests or nonexistent image assets.
 */

function InsightsArtwork() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/40 bg-[#49372C] p-7 shadow-2xl"
    >
      <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#E3B65D]/35 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#E3B65D]">
          Bark Ornament
        </span>

        <svg
          viewBox="0 0 120 120"
          width="108"
          height="108"
          fill="none"
          className="mt-10 text-[#E3B65D]"
        >
          <path
            d="M60 30C47 22 32 20 16 24V89C33 85 47 87 60 96V30Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <path
            d="M60 30C73 22 88 20 104 24V89C87 85 73 87 60 96V30Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <path
            d="M27 40C37 38 44 40 51 44M27 53C37 51 44 53 51 57M69 44C77 40 85 38 94 40M69 57C77 53 85 51 94 53"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
        </svg>

        <span className="mt-9 font-serif text-3xl text-[#E3B65D]">
          The Art of Knowing.
        </span>

        <span className="mt-5 max-w-56 text-sm leading-7 text-[#E9DDC9]">
          Insights into materials, craftsmanship and hospitality presentation.
        </span>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <main className="bg-[#FAF7F0] text-[#30251F]">

      {/* =====================================
          1. HERO
          ===================================== */}

      <section
        aria-labelledby="insights-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20 lg:py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-48 h-[520px] w-[520px] rounded-full border border-[#C59A45]/20"
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
                Insights
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament · Insights
              </p>

              {/* UI FIX 12 — HERO HEADING */}

              <h1
                id="insights-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
                style={{
                  color: "#FAF7F0",
                }}
              >
                Knowledge Behind

                <span
                  className="mt-2 block"
                  style={{
                    color: "#E3B65D",
                  }}
                >
                  Every Detail.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                Explore ideas, material knowledge and practical
                resources that support informed choices in
                hospitality products, printing and packaging.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8C8B5]">
                Our Insights centre brings together company
                news, educational content and a growing
                collection of resources for hospitality
                professionals.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#insight-sections"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none"
                >
                  Explore insights
                  <Arrow down />
                </a>

                <Link
                  href="/insights/knowledge"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Knowledge Hub
                  <Arrow />
                </Link>
              </div>
            </div>

            <InsightsArtwork />
          </div>
        </div>
      </section>

      {/* =====================================
          2. THREE INSIGHTS DESTINATIONS
          ===================================== */}

      <section
        id="insight-sections"
        aria-labelledby="insight-sections-title"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Discover & learn
          </p>

          <h2
            id="insight-sections-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore Our Insights
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Three connected areas for staying informed,
            learning about hospitality products and
            finding useful reference materials.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {insightSections.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                aria-label={`${section.linkLabel} — ${section.title}`}
                className="group flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-white p-7 shadow-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[#C59A45] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {section.number}
                </span>

                <span className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                  {section.label}
                </span>

                <h3 className="mt-3 font-serif text-2xl text-[#30251F]">
                  {section.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {section.description}
                </p>

                <span
                  aria-hidden="true"
                  className="mt-7 inline-flex items-center gap-2 border-t border-[#E8DCCB] pt-5 text-sm font-bold text-[#A94C19]"
                >
                  {section.linkLabel}
                  <Arrow />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================
          3. NEWS — EDITORIAL TOPIC AREAS
          ===================================== */}

      <section
        id="news"
        aria-labelledby="news-title"
        className="scroll-mt-20 border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Insights · 01
          </p>

          <h2
            id="news-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            News & Updates
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            A dedicated space for verified company
            announcements, product updates and selected
            developments affecting hospitality supply.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {newsTopics.map((topic) => (
              <article
                key={topic.number}
                className="rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {topic.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F]">
                  {topic.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#74675E]">
                  {topic.description}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-7 text-sm leading-7 text-[#74675E]">
            These are planned news categories, not
            published announcements. Dated news items
            will appear after their content is approved.
          </p>

          <Link
            href="/insights/news"
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#913E11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
          >
            Visit News & Updates
            <Arrow />
          </Link>
        </div>
      </section>

      {/* =====================================
          4. KNOWLEDGE HUB
          ===================================== */}

      <section
        id="knowledge"
        aria-labelledby="knowledge-title"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Insights · 02
          </p>

          <h2
            id="knowledge-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Knowledge Hub
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Material selection, printing finishes,
            packaging decisions and export concepts
            explained through practical educational content.
          </p>

          {/* FEATURED KNOWLEDGE SERIES EDITION */}

          <article className="mt-9 grid overflow-hidden rounded-2xl border border-[#D9C8B0] bg-[#F3EBDF] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-[#DED0BA] p-10">
              <div
                aria-hidden="true"
                className="absolute -left-20 -top-24 h-64 w-64 rounded-full border border-[#A87935]/25"
              />

              <div
                aria-hidden="true"
                className="absolute -bottom-28 -right-16 h-64 w-64 rounded-full border border-[#A87935]/25"
              />

              <div className="relative flex w-full max-w-64 flex-col items-center rounded-xl border border-[#A87935]/45 bg-[#FAF7F0]/85 px-7 py-10 text-center shadow-sm">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                  Knowledge Series
                </span>

                <span className="mt-6 font-serif text-6xl text-[#30251F]">
                  GSM
                </span>

                <span className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8E663D]">
                  Edition 01
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-center p-7 sm:p-9 lg:p-12">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                Knowledge Series · Edition 01
              </p>

              <h3 className="mt-5 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl">
                What Does GSM Mean, and Why Does It Matter
                for Hospitality Products?
              </h3>

              <p className="mt-5 text-base leading-8 text-[#74675E]">
                Explore how paper weight influences
                product feel, appearance and suitability
                across printed hospitality applications.
              </p>

              <p className="mt-6 border-l-2 border-[#C59A45] pl-4 text-sm leading-7 text-[#74675E]">
                This topic comes from Bark Ornament&apos;s
                existing Knowledge Series. Its website
                article is available as an editorial draft,
                pending final approval. The approved
                magazine PDF has not yet been connected.
              </p>

              <Link
                href="/insights/knowledge/understanding-gsm"
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#913E11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                Read GSM Article Draft
                <Arrow />
              </Link>
            </div>
          </article>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {knowledgeTopics.slice(1).map((topic) => (
              <article
                key={topic.title}
                className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-white p-7 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  {topic.label}
                </p>

                <h3 className="mt-4 font-serif text-2xl leading-snug text-[#30251F]">
                  {topic.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {topic.description}
                </p>

                <p className="mt-6 border-t border-[#E8DCCB] pt-4 text-xs font-semibold text-[#8B775E]">
                  {topic.status}
                </p>
              </article>
            ))}
          </div>

          <p className="mt-7 text-sm leading-7 text-[#74675E]">
            These subjects form an editorial roadmap.
            Separate article pages and publication dates
            will be added as approved content becomes available.
          </p>

          <Link
            href="/insights/knowledge"
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#B95016] px-6 py-3 text-sm font-bold text-[#A94C19] transition-colors hover:bg-[#F3EBDF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
          >
            Visit Knowledge Hub
            <Arrow />
          </Link>
        </div>
      </section>

      {/* =====================================
          5. DOWNLOADS
          ===================================== */}

      <section
        id="downloads"
        aria-labelledby="downloads-title"
        className="scroll-mt-20 border-y border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Insights · 03
          </p>

          <h2
            id="downloads-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Downloads & Resources
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            A future library of approved company
            publications, educational magazines,
            catalogues and technical reference documents.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {resourceTypes.map((resource) => (
              <article
                key={resource.number}
                className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {resource.number}
                </span>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  {resource.type}
                </p>

                <h3 className="mt-3 font-serif text-2xl leading-snug text-[#30251F]">
                  {resource.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {resource.description}
                </p>

                <p className="mt-6 border-t border-[#E8DCCB] pt-4 text-xs leading-6 text-[#806F5E]">
                  {resource.example}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-9 rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-6 sm:p-8">
            <p className="text-sm font-bold text-[#5B402B]">
              Publication library preparation
            </p>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-[#74675E]">
              Download links will be introduced only
              after actual, approved PDF files are
              available on the website. Each resource
              can then include its title, publication
              date, edition, document type and file size.
            </p>
          </div>

          <Link
            href="/insights/downloads"
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#913E11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
          >
            Visit Downloads Library
            <Arrow />
          </Link>
        </div>
      </section>

      {/* =====================================
          6. RELATED PRODUCT COLLECTIONS
          ===================================== */}

      <section
        aria-labelledby="related-products-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            From knowledge to application
          </p>

          <h2
            id="related-products-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore the Products Behind the Topics
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Learning about materials and finishes can
            help you discuss the right product
            specifications for your next hospitality project.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            <Link
              href="/categories/printing-stationery"
              className="group flex min-h-36 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Materials & printing
              </span>

              <span className="mt-6 flex items-center justify-between gap-3 font-serif text-2xl text-[#30251F]">
                Printing & Corporate Stationery
                <Arrow />
              </span>
            </Link>

            <Link
              href="/categories/bags-packaging"
              className="group flex min-h-36 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Material & packaging choices
              </span>

              <span className="mt-6 flex items-center justify-between gap-3 font-serif text-2xl text-[#30251F]">
                Bags & Packaging
                <Arrow />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================
          7. FINAL NAVIGATION
          ===================================== */}

      <section
        aria-labelledby="insights-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Better material choices
          </p>

          {/* UI FIX 12 — BOTTOM HEADING */}

          <h2
            id="insights-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Knowledge That Supports Better Decisions.
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Continue exploring our product range or
            contact Bark Ornament to discuss your
            materials, branding and operational requirements.
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
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Contact Us
              <Arrow />
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-[#D8C8B5]">
            This page does not collect enquiry data,
            submit quotations or send automated emails.
          </p>
        </div>
      </section>
    </main>
  );
}
