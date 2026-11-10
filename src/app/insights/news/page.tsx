
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "News & Updates | Bark Ornament Insights",
  description:
    "Explore Bark Ornament's news categories and a dedicated space for verified company announcements, product developments and hospitality market updates.",
};

/**
 * FILE 84 — /insights/news
 *
 * One new, read-only News Listing page.
 *
 * No approved news records or publication files
 * have been supplied.
 *
 * Add only verified, approved entries to the
 * array below in a later development step.
 *
 * Do not insert sample headlines, invented dates
 * or unverified company announcements.
 *
 * No database queries, API requests, forms,
 * server actions or automated email delivery.
 */

type NewsCategory =
  | "Company Announcements"
  | "Products & Materials"
  | "Hospitality Market Updates";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  category: NewsCategory;
  publishedAt: string; // Verified ISO date: YYYY-MM-DD
  dateLabel: string; // Approved human-readable publication date
};

/**
 * The collection is intentionally empty.
 * This prevents fictional news from appearing.
 *
 * A future milestone can add real approved articles
 * and their verified publication dates.
 */
const approvedNews: readonly NewsItem[] = [];

const newsTopics = [
  {
    id: "company-announcements",
    number: "01",
    eyebrow: "COMPANY NEWS",
    title: "Company Announcements",
    description:
      "A future home for verified Bark Ornament announcements, initiatives and company milestones.",
    examples: [
      "Company developments",
      "Business initiatives",
    ],
  },
  {
    id: "products-materials",
    number: "02",
    eyebrow: "PRODUCT FOCUS",
    title: "Products & Materials",
    description:
      "Updates on approved product introductions, materials, finishes and applications for hospitality buyers.",
    examples: [
      "Product developments",
      "Material updates",
    ],
  },
  {
    id: "hospitality-markets",
    number: "03",
    eyebrow: "INDUSTRY CONTEXT",
    title: "Hospitality Market Updates",
    description:
      "Selected, source-checked developments relevant to hotel and resort operations in the markets we serve.",
    examples: [
      "Hospitality developments",
      "Market context",
    ],
  },
] as const;

const publishingPrinciples = [
  {
    number: "01",
    title: "Verified information",
    description:
      "Check company announcements with the responsible team and substantiate external industry claims before publishing.",
  },
  {
    number: "02",
    title: "Clear publication dates",
    description:
      "Display the real publication date for each approved update, without backdating or presenting planned stories as published.",
  },
  {
    number: "03",
    title: "Useful hospitality context",
    description:
      "Focus on information that helps purchasing, operations and marketing teams make informed decisions.",
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
 * Purely decorative luxury editorial artwork.
 * No image assets, remote requests or fictional
 * newspaper headlines are involved.
 */
function NewsArtwork() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/45 bg-[#48362B] p-7 shadow-2xl"
    >
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#C59A45]/25" />

      <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full border border-[#C59A45]/25" />

      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#E3B65D]/40 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
          Bark Ornament
        </span>

        <svg
          viewBox="0 0 96 96"
          width="96"
          height="96"
          fill="none"
          className="mt-9 text-[#E3B65D]"
        >
          <rect
            x="15"
            y="14"
            width="66"
            height="68"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.6"
          />

          <rect
            x="23"
            y="24"
            width="26"
            height="24"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.6"
          />

          <path
            d="M55 27H73M55 35H73M55 43H73M23 58H73M23 66H73M23 74H62"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>

        <span className="mt-8 font-serif text-3xl text-[#E3B65D]">
          Stories & Perspectives
        </span>

        <span className="mt-5 max-w-56 text-sm leading-7 text-[#E9DDC9]">
          Thoughtful updates for the hospitality industry.
        </span>
      </div>
    </div>
  );
}

export default function NewsPage() {
  return (
    <main className="bg-[#FAF7F0] text-[#30251F]">
      {/* 1. HERO */}
      <section
        aria-labelledby="news-title"
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

              <li>
                <Link
                  href="/insights"
                  className="rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
                >
                  Insights
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
                News
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament Insights · News
              </p>

              <h1
                id="news-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
              >
                Stories That Inform.

                <span className="mt-2 block text-[#E3B65D]">
                  Updates That Matter.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                A dedicated space for company updates,
                product developments and carefully
                selected hospitality news.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8C8B5]">
                News will appear here when its content
                and publication details have been
                verified and approved.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#latest-news"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Latest updates
                  <Arrow down />
                </a>

                <Link
                  href="/insights"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  All Insights
                  <Arrow />
                </Link>
              </div>
            </div>

            <NewsArtwork />
          </div>
        </div>
      </section>

      {/* 2. VERIFIED NEWS LIST */}
      <section
        id="latest-news"
        aria-labelledby="latest-news-title"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Newsroom
          </p>

          <h2
            id="latest-news-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Latest Verified Updates
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Approved, dated announcements and sourced news
            will be listed here once available.
          </p>

          {approvedNews.length === 0 ? (
            <div className="mt-9 rounded-2xl border border-[#D9C8B0] bg-[#F3EBDF] px-6 py-10 sm:px-10 sm:py-12">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#C59A45]/50 bg-[#FAF7F0] text-[#A94C19]"
                aria-hidden="true"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 5H19V19H5V5ZM8 9H16M8 12H16M8 15H13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F] sm:text-3xl">
                Our news collection is being prepared.
              </h3>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#66584F]">
                No approved news items are listed on this
                page yet. We will add verified announcements
                and industry updates with their correct
                publication dates as they are ready.
              </p>

              <div className="mt-7 flex flex-wrap gap-4">
                <a
                  href="#news-topics"
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
                >
                  Explore news topics
                  <Arrow down />
                </a>

                <Link
                  href="/insights#knowledge"
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
                >
                  Explore Knowledge Hub
                  <Arrow />
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {approvedNews.map((item) => (
                <article
                  key={item.id}
                  className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-white p-7 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                    {item.category}
                  </p>

                  <time
                    dateTime={item.publishedAt}
                    className="mt-4 text-sm text-[#74675E]"
                  >
                    {item.dateLabel}
                  </time>

                  <h3 className="mt-4 font-serif text-2xl leading-snug text-[#30251F]">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-[#74675E]">
                    {item.summary}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. EDITORIAL CATEGORIES */}
      <section
        id="news-topics"
        aria-labelledby="news-topics-title"
        className="scroll-mt-20 border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Editorial categories
          </p>

          <h2
            id="news-topics-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            What You Will Find Here
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            These categories describe our intended
            coverage. They are not published headlines
            or announcements.
          </p>

          <nav
            aria-label="Jump to a news category"
            className="mt-8 flex flex-wrap gap-3"
          >
            {newsTopics.map((topic) => (
              <a
                key={topic.id}
                href={`#${topic.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-[#D5C2A6] bg-white px-5 py-2 text-sm font-semibold text-[#5A4232] transition-colors hover:border-[#B95016] hover:bg-[#EADAC3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                {topic.title}
              </a>
            ))}
          </nav>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {newsTopics.map((topic) => (
              <article
                id={topic.id}
                key={topic.id}
                aria-labelledby={`${topic.id}-title`}
                className="scroll-mt-24 rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {topic.number}
                </span>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  {topic.eyebrow}
                </p>

                <h3
                  id={`${topic.id}-title`}
                  className="mt-3 font-serif text-2xl leading-snug text-[#30251F]"
                >
                  {topic.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#74675E]">
                  {topic.description}
                </p>

                <div
                  aria-label={`Potential topics within ${topic.title}`}
                  className="mt-6 flex flex-wrap gap-2"
                >
                  {topic.examples.map((example) => (
                    <span
                      key={example}
                      className="rounded-full border border-[#E0D2BF] px-3 py-1.5 text-xs text-[#6B5949]"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. EDITORIAL PUBLISHING STANDARDS */}
      <section
        aria-labelledby="publishing-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Our publishing approach
          </p>

          <h2
            id="publishing-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Useful Information, Responsibly Shared
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Before adding a news item, our publishing
            process should confirm the facts, publication
            date and relevance to hospitality readers.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {publishingPrinciples.map((principle) => (
              <article
                key={principle.number}
                className="rounded-xl border border-[#D9C8B0] bg-white p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {principle.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F]">
                  {principle.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#74675E]">
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. RELATED INSIGHTS AND PRODUCTS */}
      <section
        aria-labelledby="explore-title"
        className="border-t border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Continue exploring
          </p>

          <h2
            id="explore-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            More from Bark Ornament
          </h2>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Knowledge Hub",
                description:
                  "Material, printing and packaging topics for informed product decisions.",
                href: "/insights#knowledge",
              },
              {
                title: "Our Markets",
                description:
                  "Explore our main hospitality markets and related product applications.",
                href: "/markets",
              },
              {
                title: "Product Catalogue",
                description:
                  "Browse product categories and options for your next requirement.",
                href: "/products",
              },
            ].map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <h3 className="font-serif text-2xl text-[#30251F]">
                  {page.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {page.description}
                </p>

                <span
                  aria-hidden="true"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#A94C19]"
                >
                  Explore
                  <Arrow />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SAFE CALL TO ACTION */}
      <section
        aria-labelledby="news-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Learn · Explore · Discover
          </p>

          <h2
            id="news-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore Insights Beyond the Headlines.
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Visit our Insights centre for knowledge
            topics, publications in preparation and
            connections to the products behind the stories.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/insights"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Back to Insights
              <Arrow />
            </Link>

            <Link
              href="/insights#downloads"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Explore Resources
              <Arrow />
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-[#D8C8B5]">
            This page does not collect data, submit
            quotations or send automated emails.
          </p>
        </div>
      </section>
    </main>
  );
}
