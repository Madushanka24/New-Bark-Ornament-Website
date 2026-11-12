
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  getSanityKnowledgeArticles,
  type KnowledgeArticleSummary,
} from "@/lib/sanity-knowledge-articles";

export const metadata: Metadata = {
  title: "Knowledge Hub | Insights",
  description:
    "Explore Bark Ornament's Knowledge Series and planned learning topics on GSM, printing finishes, packaging, freight planning and hospitality products.",
};

/**
 * FILE 85 — src/app/insights/knowledge/page.tsx
 *
 * Read-only educational landing page.
 * Edition 01 is existing editorial material, but its public article URL,
 * publication date and approved PDF path have not been supplied.
 * Other topics are explicitly labelled as planned.
 *
 * No database operations, form submissions or emails.
 *
 * FILE 149 — STEP E4:
 * Adds approved Sanity article summaries.
 * Full CMS article pages are not included in this step.
 */

type PlannedTopic = {
  title: string;
  description: string;
  subject: string;
};

type TopicGroup = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  introduction: string;
  topics: readonly PlannedTopic[];
};

const topicGroups = [
  {
    id: "materials-printing",
    number: "01",
    eyebrow: "MATERIALS & FINISHING",
    title: "Materials & Printing",
    introduction:
      "Explore how materials and finishing choices affect the appearance, handling and suitability of hospitality products.",
    topics: [
      {
        subject: "Printing finishes",
        title: "Choosing the Right Finish for Printed Products",
        description:
          "Explore matte and gloss lamination, embossing, debossing, foil stamping and spot UV, with practical selection considerations.",
      },
      {
        subject: "Paper selection",
        title: "Paper vs Board: What Is the Difference?",
        description:
          "Understand why material weight, stiffness and intended use matter for stationery, presentation pieces and packaging.",
      },
      {
        subject: "Product specifications",
        title: "Choosing Materials for Guest-Facing Products",
        description:
          "Consider handling, presentation, function and finishing requirements when preparing a product brief.",
      },
    ],
  },
  {
    id: "export-planning",
    number: "02",
    eyebrow: "EXPORT & LOGISTICS",
    title: "Export & Order Planning",
    introduction:
      "Build familiarity with common freight and ordering concepts before discussing an international hospitality requirement.",
    topics: [
      {
        subject: "Freight options",
        title: "Sea Freight vs Air Freight",
        description:
          "Compare general considerations around speed, cost, volume and destination requirements without assuming fixed transit times.",
      },
      {
        subject: "Shipping measurements",
        title: "Understanding CBM",
        description:
          "Learn what cubic metre measurements represent and why package dimensions matter when discussing freight.",
      },
      {
        subject: "Consolidation",
        title: "How Shipment Consolidation Works",
        description:
          "Introduce the idea of combining suitable cargo and the planning questions to clarify with a logistics provider.",
      },
      {
        subject: "Production planning",
        title: "Understanding Lead Times",
        description:
          "Consider artwork approval, sampling, production, packing and freight when discussing a realistic order schedule.",
      },
    ],
  },
  {
    id: "branding-responsibility",
    number: "03",
    eyebrow: "BRANDING & RESPONSIBLE CHOICES",
    title: "Branding & Thoughtful Choices",
    introduction:
      "Look at the details that shape consistent brand presentation and more considered product decisions.",
    topics: [
      {
        subject: "Brand identity",
        title: "Brand Identity & Customization",
        description:
          "Explore how artwork, colour, material and format contribute to a consistent guest-facing experience.",
      },
      {
        subject: "Seasonal presentation",
        title: "Festive Packaging & Guest Gifting",
        description:
          "Consider packaging and presentation requirements for events, welcome gifts and seasonal hospitality programmes.",
      },
      {
        subject: "Material considerations",
        title: "Sustainability in Hospitality Products",
        description:
          "Examine material, durability, reuse and end-of-life questions without making unsupported environmental claims.",
      },
      {
        subject: "Procurement preparation",
        title: "Planning Ahead for a New Operating Year",
        description:
          "Identify specifications, quantities, approvals and ordering lead times that may influence procurement planning.",
      },
    ],
  },
] as const satisfies readonly TopicGroup[];

function Arrow({ down = false }: { down?: boolean }) {
  return <span aria-hidden="true">{down ? "↓" : "→"}</span>;
}

function KnowledgeMotif() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/40 bg-[#49372C] p-7 shadow-2xl"
    >
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />
      <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full border border-[#E3B65D]/25" />
      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#E3B65D]/35 px-5 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
          Bark Ornament
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 96 96"
          width="104"
          height="104"
          fill="none"
          className="mt-9 text-[#E3B65D]"
        >
          <path
            d="M48 25C36 18 22 18 11 22V75C24 72 38 73 48 81V25Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M48 25C60 18 74 18 85 22V75C72 72 58 73 48 81V25Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M19 37C26 35 34 36 41 40M55 40C62 36 70 35 77 37M19 49C27 47 34 49 41 52M55 52C62 49 70 47 77 49"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
        </svg>
        <span className="mt-8 font-serif text-3xl text-[#E3B65D]">
          The Knowledge Hub
        </span>
        <span className="mt-5 max-w-56 text-sm leading-7 text-[#E9DDC9]">
          Better understanding for considered hospitality products.
        </span>
      </div>
    </div>
  );
}

/* ==========================================
   FILE 149 — STEP E4

   APPROVED KNOWLEDGE ARTICLE SUMMARIES
   ========================================== */

const KNOWLEDGE_CATEGORY_LABELS = {
  "materials-printing": "Materials & Printing",
  "export-planning": "Export & Order Planning",
  "branding-responsibility":
    "Branding & Thoughtful Choices",
} as const;

function formatKnowledgeDate(
  value: string | null
): string | null {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function KnowledgeSummaryCard({
  article,
}: {
  article: KnowledgeArticleSummary;
}) {
  const dateLabel = formatKnowledgeDate(
    article.publishedAt
  );

  return (
    <article className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-white p-7 shadow-sm transition-shadow hover:shadow-md motion-reduce:transition-none">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
        {KNOWLEDGE_CATEGORY_LABELS[article.category]}
      </p>

      <h3 className="mt-4 font-serif text-2xl leading-snug text-[#30251F]">
        {article.title}
      </h3>

      <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
        {article.summary}
      </p>

      <div className="mt-6 border-t border-[#E8DCCB] pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#806F5E]">
          {article.series}
          {article.edition
            ? ` · ${article.edition}`
            : ""}
        </p>

        {dateLabel ? (
          <p className="mt-2 text-xs text-[#74675E]">
            Published {dateLabel}
          </p>
        ) : null}

        <Link
          href={`/insights/knowledge/${article.slug}`}
          aria-label={`Read article: ${article.title}`}
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#923D12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
        >
          Read Article
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

/**
 * Read approved Sanity article summaries.
 *
 * The full article renderer and reading
 * links will be introduced separately.
 *
 * An empty result leaves the existing
 * Knowledge Hub sections unchanged.
 */
async function PublishedKnowledgeArticles() {
  const approvedArticles =
    await getSanityKnowledgeArticles();

  /*
   * The original GSM editorial article retains
   * its existing featured presentation and route.
   *
   * Do not publish a separate CMS summary card
   * for that same slug until content migration
   * and editorial verification are complete.
   */
  const articles = approvedArticles.filter(
    (article) => article.slug !== "understanding-gsm"
  );

  if (articles.length === 0) {
    return null;
  }

  return (
    <section
      id="published-articles"
      aria-labelledby="published-articles-title"
      className="scroll-mt-20 border-t border-[#E0D2BF] bg-[#FAF7F0] px-5 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
          Approved educational content
        </p>

        <h2
          id="published-articles-title"
          className="mt-4 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
        >
          Published Knowledge Articles
        </h2>

        <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
          Explore approved educational summaries
          covering materials, production,
          branding and hospitality order planning.
        </p>

        <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <KnowledgeSummaryCard
              key={article.slug}
              article={article}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function KnowledgeHubPage() {
  return (
    <div className="bg-[#FAF7F0] text-[#30251F]">
      {/* HERO */}
      <section
        aria-labelledby="knowledge-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20 lg:py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-48 h-[520px] w-[520px] rounded-full border border-[#C59A45]/20"
        />
        <div className="relative mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="mb-12 text-sm text-[#E9DDC9]">
            <ol className="flex flex-wrap items-center gap-3">
              <li>
                <Link
                  href="/"
                  className="rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true" className="text-[#E3B65D]">
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
              <li aria-hidden="true" className="text-[#E3B65D]">
                /
              </li>
              <li aria-current="page" className="text-white">
                Knowledge Hub
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament Insights · Knowledge Hub
              </p>
              <h1
                id="knowledge-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
              >
                Knowledge That Shapes
                <span className="mt-2 block text-[#E3B65D]">
                  Every Detail.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                Explore practical ideas about paper, printing, packaging,
                branding and the planning behind hospitality products.
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8C8B5]">
                Our GSM knowledge edition is featured below. Approved article
                summaries are displayed when available, while the editorial
                roadmap remains separate.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#featured-edition"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Featured edition <Arrow down />
                </a>
                <a
                  href="#topic-library"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Explore learning topics <Arrow down />
                </a>
              </div>
            </div>
            <KnowledgeMotif />
          </div>
        </div>
      </section>

      {/* FEATURED EXISTING EDITION */}
      <section
        id="featured-edition"
        aria-labelledby="featured-title"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Featured Knowledge Series
          </p>
          <h2
            id="featured-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Edition 01 · Understanding GSM
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            An established Bark Ornament Knowledge Series topic about selecting
            paper for hospitality applications.
          </p>

          <article className="mt-9 grid overflow-hidden rounded-2xl border border-[#D9C8B0] bg-white shadow-sm lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div
              aria-hidden="true"
              className="relative flex min-h-72 items-center justify-center overflow-hidden bg-[#DED0BA] p-10"
            >
              <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full border border-[#A87935]/25" />
              <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full border border-[#A87935]/25" />
              <div className="relative flex w-full max-w-64 flex-col items-center rounded-xl border border-[#A87935]/40 bg-[#FAF7F0]/85 px-7 py-11 text-center shadow-sm">
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
                Existing educational edition · Print & materials
              </p>
              <h3 className="mt-5 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl">
                What Does GSM Mean, and Why Does It Matter for Hospitality
                Products?
              </h3>
              <p className="mt-5 text-base leading-8 text-[#66584F]">
                GSM stands for grams per square metre. It describes the mass of
                a paper or board sheet per unit area and is one useful factor
                when selecting materials for menus, stationery and packaging.
              </p>
              <p className="mt-4 text-sm leading-7 text-[#74675E]">
                A higher GSM does not automatically mean a better product:
                thickness, stiffness, coating and suitability also depend on
                the material and intended use.
              </p>
              <div className="mt-7 border-l-2 border-[#C59A45] pl-4">
                <p className="text-sm font-semibold text-[#5C4030]">
                  Website publication status
                </p>
                <p className="mt-2 text-sm leading-7 text-[#74675E]">
                  The Knowledge Series edition already exists as editorial
                  material. Its approved full article and downloadable PDF have
                  not yet been connected to the website. No publication date or
                  file link is shown here.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* APPROVED KNOWLEDGE ARTICLES — SANITY */}
      <Suspense fallback={null}>
        <PublishedKnowledgeArticles />
      </Suspense>

      {/* TOPIC NAVIGATION */}
      <section
        id="topic-library"
        aria-labelledby="topics-title"
        className="scroll-mt-20 border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Editorial roadmap
          </p>
          <h2
            id="topics-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore Planned Knowledge Topics
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Choose a subject area to preview upcoming educational themes.
            These topic descriptions are not published articles or download
            links.
          </p>
          <nav
            aria-label="Jump to a knowledge subject"
            className="mt-8 flex flex-wrap gap-3"
          >
            {topicGroups.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-[#D5C2A6] bg-white px-5 py-2 text-sm font-semibold text-[#5A4232] transition-colors hover:border-[#B95016] hover:bg-[#EADAC3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                {group.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* PLANNED TOPIC GROUPS */}
      {topicGroups.map((group, groupIndex) => (
        <section
          key={group.id}
          id={group.id}
          aria-labelledby={`${group.id}-title`}
          className={`scroll-mt-20 border-b border-[#E0D2BF] px-5 py-16 sm:px-8 sm:py-20 ${
            groupIndex % 2 === 0 ? "bg-[#FAF7F0]" : "bg-[#F3EBDF]"
          }`}
        >
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
              Series {group.number} · {group.eyebrow}
            </p>
            <h2
              id={`${group.id}-title`}
              className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            >
              {group.title}
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
              {group.introduction}
            </p>
            <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {group.topics.map((topic) => (
                <article
                  key={topic.title}
                  className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-white p-7 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                    {topic.subject}
                  </p>
                  <h3 className="mt-4 font-serif text-2xl leading-snug text-[#30251F]">
                    {topic.title}
                  </h3>
                  <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                    {topic.description}
                  </p>
                  <p className="mt-6 border-t border-[#E8DCCB] pt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#806F5E]">
                    Planned topic · Not yet published
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* READING AND DOWNLOAD GUIDANCE */}
      <section
        id="reading-resources"
        aria-labelledby="resources-title"
        className="scroll-mt-20 bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Publications & resources
          </p>
          <h2
            id="resources-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            From Knowledge to Practical Reference
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Approved articles and PDF editions can be added when their final
            text, artwork, publication details and files are ready.
          </p>
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Reading archive
              </p>
              <h3 className="mt-3 font-serif text-2xl text-[#30251F]">
                Articles & Magazine Editions
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#74675E]">
                Future article pages can present approved educational content
                with the correct edition number and verified publication date.
              </p>
              <p className="mt-5 text-xs font-semibold text-[#806F5E]">
                Additional article reading pages are being prepared.
              </p>
            </div>
            <div className="rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Resource library
              </p>
              <h3 className="mt-3 font-serif text-2xl text-[#30251F]">
                PDFs & Downloadable Guides
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#74675E]">
                The Downloads section will provide real file links only after
                approved PDFs are placed at verified website paths.
              </p>
              <Link
                href="/insights#downloads"
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
              >
                Explore resources overview <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT CONNECTION */}
      <section
        aria-labelledby="related-title"
        className="border-t border-[#E0D2BF] bg-[#FAF7F0] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Apply what you learn
          </p>
          <h2
            id="related-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore Related Product Collections
          </h2>
          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            <Link
              href="/categories/printing-stationery"
              className="group flex min-h-36 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Paper & printing topics
              </span>
              <span className="mt-6 flex items-center justify-between gap-3 font-serif text-2xl text-[#30251F]">
                Printing & Corporate Stationery <Arrow />
              </span>
            </Link>
            <Link
              href="/categories/bags-packaging"
              className="group flex min-h-36 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Packaging & branding topics
              </span>
              <span className="mt-6 flex items-center justify-between gap-3 font-serif text-2xl text-[#30251F]">
                Bags & Packaging <Arrow />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* SAFE NAVIGATION */}
      <section
        aria-labelledby="knowledge-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Better material choices
          </p>
          <h2
            id="knowledge-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Knowledge for Better Hospitality Decisions.
          </h2>
          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Return to Insights for news and resources, or browse the catalogue
            to consider your next product requirement.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/insights"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Back to Insights <Arrow />
            </Link>
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Browse Products <Arrow />
            </Link>
          </div>
          <p className="mt-6 text-sm leading-6 text-[#D8C8B5]">
            This page does not collect enquiries, submit quotations or send
            automated emails.
          </p>
        </div>
      </section>
    </div>
  );
}
