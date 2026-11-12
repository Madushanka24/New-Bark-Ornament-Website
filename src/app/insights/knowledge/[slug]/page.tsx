
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import KnowledgePortableText from "@/components/KnowledgePortableText";

import {
  getSanityKnowledgeArticleBySlug,
  type KnowledgeArticle,
} from "@/lib/sanity-knowledge-articles";

/**
 * BARK ORNAMENT — FILE 87
 *
 * Dynamic Knowledge Article Detail Page
 *
 * Route:
 * /insights/knowledge/[slug]
 *
 * Initial article:
 * /insights/knowledge/understanding-gsm
 *
 * IMPORTANT:
 * - The website article is an editorial draft.
 * - No publication date has been assigned.
 * - No PDF download is claimed to be available.
 * - Unrecognised article slugs return HTTP 404.
 * - No dynamicParams export (Cache Components compatibility).
 * - No database, API, forms or automated email delivery.
 */

const articles = [
  {
    slug: "understanding-gsm",
    edition: "Edition 01",
    series: "Knowledge Series",
    category: "Paper & Printing Materials",
    title:
      "What Does GSM Mean, and Why Does It Matter for Hospitality Products?",
    description:
      "Understand paper GSM, what it measures, what it does not measure, and how to consider paper weight when selecting printed hospitality products.",
  },
] as const;

type PageProps = {
  params: Promise<{ slug: string }>;
};

function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

/**
 * Prebuild the known article route.
 * Additional approved article slugs can be added later.
 */
export function generateStaticParams() {
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

/**
 * Metadata is specific to the requested article.
 *
 * Keep this editorial draft out of search indexing
 * until its final content is approved for publication.
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      slug.length > 100
    ) {
      notFound();
    }

    /*
     * CMS articles receive conservative metadata
     * until their publication and SEO checks pass.
     *
     * Detailed CMS metadata will be introduced
     * in a later, separately tested milestone.
     */
    return {
      title: "Knowledge Article",
      description:
        "Hospitality product knowledge and educational resources from Bark Ornament.",
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    title: article.title,
    description: article.description,
    robots: {
      index: false,
      follow: true,
    },
  };
}

const contents = [
  {
    id: "what-is-gsm",
    label: "What does GSM mean?",
  },
  {
    id: "gsm-example",
    label: "A simple GSM example",
  },
  {
    id: "gsm-limitations",
    label: "What GSM cannot tell you",
  },
  {
    id: "hospitality-applications",
    label: "Hospitality applications",
  },
  {
    id: "choosing-paper",
    label: "Choosing suitable paper",
  },
  {
    id: "common-questions",
    label: "Common questions",
  },
  {
    id: "key-takeaways",
    label: "Key takeaways",
  },
] as const;

const applications = [
  {
    number: "01",
    title: "Guest Stationery",
    description:
      "Paper weight can influence the feel and presentation of letterheads, writing sheets, notepads and other printed guest materials.",
    consideration:
      "Consider writing performance, print quality, opacity and the desired presentation.",
  },
  {
    number: "02",
    title: "Menus & Guest Information",
    description:
      "Menu inserts and information cards must suit their intended handling, presentation and replacement requirements.",
    consideration:
      "Review material stiffness, surface treatment and whether the item will be protected by a cover.",
  },
  {
    number: "03",
    title: "Packaging & Printed Cards",
    description:
      "Packaging components and printed cards may require a different material construction from ordinary writing paper.",
    consideration:
      "Evaluate foldability, structural needs, finishing and compatibility with the selected printing process.",
  },
] as const;

const selectionQuestions = [
  "What will the printed product be used for?",
  "How frequently will guests or employees handle it?",
  "Is the material intended for writing, display or packaging?",
  "What appearance, opacity and surface finish are required?",
  "Does the design require folding, creasing or another finishing process?",
  "Can a physical material sample be reviewed before approval?",
] as const;

const relatedCollections = [
  {
    title: "Printing & Corporate Stationery",
    description:
      "Explore stationery and printed communication products.",
    href: "/categories/printing-stationery",
  },
  {
    title: "Menus & Guest Service Products",
    description:
      "Explore guest-facing presentation materials and accessories.",
    href: "/categories/menus-guest-service",
  },
  {
    title: "Bags & Packaging",
    description:
      "Explore branded packaging and presentation products.",
    href: "/categories/bags-packaging",
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
 * Decorative editorial illustration.
 *
 * This is not the approved cover of the actual
 * Knowledge Series magazine.
 */
function ArticleArtwork() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/40 bg-[#49372C] p-7 shadow-2xl"
    >
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#E3B65D]/35 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
          Knowledge Series
        </span>

        <span className="mt-9 font-serif text-7xl text-[#E3B65D]">
          GSM
        </span>

        <div className="my-8 h-px w-24 bg-[#E3B65D]/50" />

        <span className="font-serif text-2xl text-[#E9DDC9]">
          Edition 01
        </span>

        <span className="mt-5 max-w-52 text-sm leading-7 text-[#E9DDC9]">
          Understanding materials for hospitality products.
        </span>
      </div>
    </div>
  );
}

/* ==========================================
   FILE 149 — STEP E5B

   APPROVED SANITY KNOWLEDGE ARTICLE VIEW
   ========================================== */

const CMS_CATEGORY_LABELS = {
  "materials-printing": "Materials & Printing",
  "export-planning": "Export & Order Planning",
  "branding-responsibility":
    "Branding & Thoughtful Choices",
} as const;

function CmsKnowledgeArticleView({
  article,
}: {
  article: KnowledgeArticle;
}) {
  const dateLabel = article.publishedAt
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(
        new Date(`${article.publishedAt}T00:00:00Z`)
      )
    : null;

  return (
    <div className="bg-[#FAF7F0] text-[#30251F]">
      {/* APPROVED ARTICLE HERO */}
      <section
        aria-labelledby="cms-article-title"
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
                  className="underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
                >
                  Home
                </Link>
              </li>

              <li aria-hidden="true">/</li>

              <li>
                <Link
                  href="/insights/knowledge"
                  className="underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
                >
                  Knowledge Hub
                </Link>
              </li>

              <li aria-hidden="true">/</li>

              <li aria-current="page" className="text-[#E3B65D]">
                Article
              </li>
            </ol>
          </nav>

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            {CMS_CATEGORY_LABELS[article.category]}
          </p>

          <h1
            id="cms-article-title"
            className="mt-5 max-w-4xl font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl"
          >
            {article.title}
          </h1>

          <p className="mt-7 max-w-3xl text-lg leading-8 text-[#E9DDC9]">
            {article.summary}
          </p>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#E9DDC9]">
            <span>{article.series}</span>

            {article.edition ? (
              <span>{article.edition}</span>
            ) : null}

            {dateLabel ? (
              <span>Published {dateLabel}</span>
            ) : null}
          </div>
        </div>
      </section>

      {/* STRUCTURED ARTICLE CONTENT */}
      <section
        aria-label="Article content"
        className="px-5 py-14 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <KnowledgePortableText
            value={article.body}
          />
        </div>
      </section>

      {/* SAFE NAVIGATION */}
      <section className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            More Hospitality Knowledge
          </p>

          <h2 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
            Explore More Knowledge and Products.
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Discover educational resources and
            product collections for hospitality
            requirements.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/insights/knowledge"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Explore Knowledge Hub
            </Link>

            <Link
              href="/categories"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Browse Product Categories
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

async function KnowledgeArticleContent({
  params,
}: PageProps) {
  const { slug } = await params;
  const article = getArticle(slug);

  /*
   * Keep the original GSM editorial article
   * authoritative for its existing URL.
   */
  if (!article) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      slug.length > 100
    ) {
      notFound();
    }

    const cmsArticle =
      await getSanityKnowledgeArticleBySlug(slug);

    if (!cmsArticle) {
      notFound();
    }

    return (
      <CmsKnowledgeArticleView
        article={cmsArticle}
      />
    );
  }

  return (
    <div className="bg-[#FAF7F0] text-[#30251F]">
      {/* 1. ARTICLE HERO */}
      <section
        aria-labelledby="article-title"
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
            <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
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

              <li>
                <Link
                  href="/insights/knowledge"
                  className="rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
                >
                  Knowledge Hub
                </Link>
              </li>

              <li aria-hidden="true" className="text-[#E3B65D]">
                /
              </li>

              <li aria-current="page" className="text-white">
                Understanding GSM
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                {article.series} · {article.edition}
              </p>

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-[#E9DDC9]">
                {article.category}
              </p>

              <h1
                id="article-title"
                className="mt-5 max-w-4xl font-serif text-4xl leading-[1.13] sm:text-5xl lg:text-6xl"
              >
                {article.title}
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                Understand the meaning of GSM, why
                paper weight matters and what else
                to consider when selecting printed
                hospitality products.
              </p>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#D8C8B5]">
                Educational website draft based on the
                established Edition 01 topic. Final
                editorial approval is pending.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#article-content"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Read the Article
                  <Arrow down />
                </a>

                <Link
                  href="/insights/knowledge"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Back to Knowledge Hub
                  <Arrow />
                </Link>
              </div>
            </div>

            <ArticleArtwork />
          </div>
        </div>
      </section>

      {/* 2. ARTICLE AND TABLE OF CONTENTS */}
      <section
        id="article-content"
        aria-label="Knowledge article"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(230px,0.7fr)_minmax(0,1.8fr)] lg:gap-16">
          {/* ARTICLE NAVIGATION */}
          <aside className="self-start lg:sticky lg:top-24">
            <nav
              aria-label="On this page"
              className="rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-6"
            >
              <h2 className="font-serif text-2xl text-[#30251F]">
                In This Article
              </h2>

              <ol className="mt-5 space-y-1">
                {contents.map((item, index) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 text-sm leading-6 text-[#5A493F] transition-colors hover:bg-[#E8D8C2] hover:text-[#A94C19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016] motion-reduce:transition-none"
                    >
                      <span
                        aria-hidden="true"
                        className="text-xs font-bold text-[#A87935]"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="mt-5 rounded-xl border border-[#D9C8B0] bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#A94C19]">
                About This Edition
              </p>

              <p className="mt-3 text-sm leading-7 text-[#74675E]">
                Knowledge Series · Edition 01
              </p>

              <p className="mt-3 text-sm leading-7 text-[#74675E]">
                This website draft has no assigned
                publication date or downloadable PDF.
              </p>
            </div>
          </aside>

          {/* MAIN ARTICLE */}
          <article
            aria-label="Understanding paper GSM"
            className="min-w-0"
          >
            {/* DEFINITION */}
            <section
              id="what-is-gsm"
              aria-labelledby="definition-title"
              className="scroll-mt-24"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                The Basics
              </p>

              <h2
                id="definition-title"
                className="mt-4 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
              >
                What Does GSM Mean?
              </h2>

              <p className="mt-6 text-base leading-8 text-[#66584F]">
                GSM stands for{" "}
                <strong className="text-[#30251F]">
                  grams per square metre
                </strong>
                . In paper and board specifications,
                it describes the mass of the material
                for a standard area of one square metre.
              </p>

              <p className="mt-5 text-base leading-8 text-[#66584F]">
                This is also called the material&apos;s
                grammage. It provides a common reference
                when comparing the nominal weight of
                different paper and board options.
              </p>

              <div className="mt-7 rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 text-center sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  Simple definition
                </p>

                <p className="mt-4 font-serif text-3xl text-[#30251F] sm:text-4xl">
                  GSM = g/m²
                </p>

                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#74675E]">
                  The mass of the paper, in grams,
                  divided by its area in square metres.
                </p>
              </div>
            </section>

            {/* WORKED EXAMPLE */}
            <section
              id="gsm-example"
              aria-labelledby="example-title"
              className="scroll-mt-24 border-t border-[#E5D8C4] pt-12 mt-12"
            >
              <h2
                id="example-title"
                className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
              >
                A Simple GSM Example
              </h2>

              <p className="mt-6 text-base leading-8 text-[#66584F]">
                Imagine a paper stock specified as
                150 GSM. This means that one square
                metre of that stock has a nominal mass
                of 150 grams.
              </p>

              <div className="mt-7 rounded-xl border border-[#D9C8B0] bg-white p-7 sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  Illustrative calculation
                </p>

                <p className="mt-5 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl">
                  150 g ÷ 1 m² = 150 GSM
                </p>

                <p className="mt-5 text-sm leading-7 text-[#74675E]">
                  This describes mass per area.
                  It does not independently tell us
                  how thick the sheet will be.
                </p>
              </div>

              <p className="mt-6 text-base leading-8 text-[#66584F]">
                Within the same paper family, a
                higher GSM generally indicates more
                material mass per square metre. However,
                two stocks with the same GSM can still
                feel different.
              </p>
            </section>

            {/* LIMITATIONS */}
            <section
              id="gsm-limitations"
              aria-labelledby="limitations-title"
              className="scroll-mt-24 border-t border-[#E5D8C4] pt-12 mt-12"
            >
              <h2
                id="limitations-title"
                className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
              >
                What GSM Cannot Tell You
              </h2>

              <p className="mt-6 text-base leading-8 text-[#66584F]">
                GSM is useful, but it is only one
                material property. Selecting a paper
                based on GSM alone can overlook
                important product requirements.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: "Thickness",
                    description:
                      "Two papers of equal GSM may have different thicknesses because of their structure and density.",
                  },
                  {
                    title: "Stiffness",
                    description:
                      "A sheet's resistance to bending depends on more than its mass per unit area.",
                  },
                  {
                    title: "Surface & Finish",
                    description:
                      "Coating, texture and printing finish can affect appearance and handling.",
                  },
                  {
                    title: "Overall Suitability",
                    description:
                      "The best material depends on product use, printing method and finishing requirements.",
                  },
                ].map((point) => (
                  <div
                    key={point.title}
                    className="rounded-xl border border-[#D9C8B0] bg-white p-6"
                  >
                    <h3 className="font-serif text-xl text-[#30251F]">
                      {point.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-[#74675E]">
                      {point.description}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-7 border-l-2 border-[#C59A45] pl-5 text-sm leading-7 text-[#66584F]">
                A heavier sheet is not automatically
                the better choice. The product&apos;s
                intended use is equally important.
              </p>
            </section>

            {/* HOSPITALITY APPLICATIONS */}
            <section
              id="hospitality-applications"
              aria-labelledby="applications-title"
              className="scroll-mt-24 border-t border-[#E5D8C4] pt-12 mt-12"
            >
              <h2
                id="applications-title"
                className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
              >
                Why GSM Matters for Hospitality Products
              </h2>

              <p className="mt-6 text-base leading-8 text-[#66584F]">
                Hotels and resorts use paper-based
                products across many guest-facing
                and operational applications.
                Each has different practical needs.
              </p>

              <div className="mt-8 space-y-5">
                {applications.map((item) => (
                  <section
                    key={item.number}
                    aria-labelledby={`application-${item.number}`}
                    className="rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-6 sm:p-8"
                  >
                    <p
                      aria-hidden="true"
                      className="font-serif text-3xl text-[#A87935]"
                    >
                      {item.number}
                    </p>

                    <h3
                      id={`application-${item.number}`}
                      className="mt-4 font-serif text-2xl text-[#30251F]"
                    >
                      {item.title}
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-[#66584F]">
                      {item.description}
                    </p>

                    <p className="mt-4 text-sm leading-7 text-[#66584F]">
                      <strong className="text-[#30251F]">
                        Selection consideration:
                      </strong>{" "}
                      {item.consideration}
                    </p>
                  </section>
                ))}
              </div>
            </section>

            {/* SELECTION CHECKLIST */}
            <section
              id="choosing-paper"
              aria-labelledby="choosing-title"
              className="scroll-mt-24 border-t border-[#E5D8C4] pt-12 mt-12"
            >
              <h2
                id="choosing-title"
                className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
              >
                How to Choose a Suitable Paper
              </h2>

              <p className="mt-6 text-base leading-8 text-[#66584F]">
                Rather than starting with a GSM figure
                alone, begin with the intended
                application and the experience the
                finished product should provide.
              </p>

              <div className="mt-7 rounded-xl border border-[#D9C8B0] bg-white p-7 sm:p-9">
                <h3 className="font-serif text-2xl text-[#30251F]">
                  Questions to Consider
                </h3>

                <ul className="mt-6 space-y-4">
                  {selectionQuestions.map((question) => (
                    <li
                      key={question}
                      className="flex items-start gap-3 text-sm leading-7 text-[#66584F]"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1 font-bold text-[#A94C19]"
                      >
                        ✓
                      </span>

                      <span>{question}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-6 text-base leading-8 text-[#66584F]">
                Once these requirements are clear,
                compare paper samples and specifications
                for the selected print and finishing
                processes. A final material decision
                should reflect both appearance and
                practical performance.
              </p>
            </section>

            {/* FAQ */}
            <section
              id="common-questions"
              aria-labelledby="faq-title"
              className="scroll-mt-24 border-t border-[#E5D8C4] pt-12 mt-12"
            >
              <h2
                id="faq-title"
                className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
              >
                Common Questions About GSM
              </h2>

              <div className="mt-8 space-y-5">
                <div>
                  <h3 className="font-serif text-xl text-[#30251F]">
                    Does a higher GSM always mean
                    better quality?
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#66584F]">
                    No. A higher GSM means greater
                    mass per square metre. Material
                    quality and suitability depend
                    on several additional factors.
                  </p>
                </div>

                <div className="border-t border-[#E5D8C4] pt-5">
                  <h3 className="font-serif text-xl text-[#30251F]">
                    Is GSM the same as paper thickness?
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#66584F]">
                    No. Thickness is a separate physical
                    measurement, often called caliper.
                    Different papers can have the same
                    GSM but different thicknesses.
                  </p>
                </div>

                <div className="border-t border-[#E5D8C4] pt-5">
                  <h3 className="font-serif text-xl text-[#30251F]">
                    Should all hospitality products
                    use the same GSM?
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#66584F]">
                    No. Writing sheets, menus, printed
                    cards and packaging may need different
                    combinations of weight, structure,
                    finish and durability.
                  </p>
                </div>
              </div>
            </section>

            {/* CONCLUSION */}
            <section
              id="key-takeaways"
              aria-labelledby="takeaways-title"
              className="scroll-mt-24 border-t border-[#E5D8C4] pt-12 mt-12"
            >
              <div className="rounded-2xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  The Key Takeaway
                </p>

                <h2
                  id="takeaways-title"
                  className="mt-4 font-serif text-3xl leading-tight text-[#30251F]"
                >
                  Choose the Material for the Purpose.
                </h2>

                <p className="mt-5 text-base leading-8 text-[#66584F]">
                  GSM is a useful starting point
                  for comparing paper and board
                  specifications. But selecting the
                  right hospitality product requires
                  considering how it looks, feels
                  and performs in its intended setting.
                </p>

                <p className="mt-5 text-base leading-8 text-[#66584F]">
                  Better product decisions come from
                  matching material properties,
                  printing requirements and
                  real-world use.
                </p>
              </div>
            </section>

            {/* EDITORIAL AND PUBLICATION NOTE */}
            <div className="mt-12 border-t border-[#E5D8C4] pt-8">
              <h2 className="font-serif text-2xl text-[#30251F]">
                About This Knowledge Series Article
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#74675E]">
                This is a website adaptation of the
                existing Bark Ornament Knowledge Series
                Edition 01 topic. The final article
                should be reviewed against the
                approved magazine before public release.
                No publication date or PDF download
                is currently assigned to this page.
              </p>

              <Link
                href="/insights/knowledge"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold text-[#A94C19] underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
              >
                Return to Knowledge Hub
                <Arrow />
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* 3. RELATED PRODUCT FAMILIES */}
      <section
        aria-labelledby="related-collections-title"
        className="border-t border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
            From Knowledge to Application
          </p>

          <h2
            id="related-collections-title"
            className="mt-4 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
          >
            Explore Related Products
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Review relevant product families to
            connect material knowledge with your
            hospitality requirements.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {relatedCollections.map((collection) => (
              <Link
                key={collection.href}
                href={collection.href}
                className="group flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <h3 className="font-serif text-2xl leading-snug text-[#30251F]">
                  {collection.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {collection.description}
                </p>

                <span
                  aria-hidden="true"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#A94C19]"
                >
                  Explore Collection
                  <Arrow />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SAFE NAVIGATION */}
      <section
        aria-labelledby="article-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Better Material Choices
          </p>

          <h2
            id="article-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Knowledge That Supports Better Decisions.
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Explore more knowledge topics or browse
            our product categories to prepare your
            next hospitality requirement.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/insights/knowledge"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Explore Knowledge Hub
              <Arrow />
            </Link>

            <Link
              href="/categories"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Browse Product Categories
              <Arrow />
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-[#D8C8B5]">
            No quotation submissions or automated
            email delivery are performed here.
          </p>
        </div>
      </section>
    </div>
  );
}

/**
 * File 85 - Knowledge Hub instant navigation support
 *
 * Keeps URL-dependent article rendering inside Suspense.
 * Preserves the existing article implementation.
 */
export default function KnowledgeArticlePage({
  params,
}: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] bg-[#FAF7F0] px-5 py-20 text-[#30251F] sm:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
              Bark Ornament Knowledge Series
            </p>

            <h1 className="mt-5 font-serif text-3xl sm:text-4xl">
              Preparing your article
            </h1>

            <p
              role="status"
              className="mt-5 text-base text-[#74675E]"
            >
              Loading knowledge article…
            </p>
          </div>
        </div>
      }
    >
      <KnowledgeArticleContent params={params} />
    </Suspense>
  );
}
