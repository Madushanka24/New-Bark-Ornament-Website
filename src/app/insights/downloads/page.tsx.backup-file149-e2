
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Downloads & Resources | Bark Ornament Insights",
  description:
    "Explore Bark Ornament's resource library for Knowledge Series magazines, hospitality product catalogues, company profiles and technical guides.",
};

/**
 * BARK ORNAMENT — FILE 86
 * Downloads & Resources Library
 *
 * One new file:
 * src/app/insights/downloads/page.tsx
 *
 * IMPORTANT:
 * - No approved public PDF paths have been supplied.
 * - No download links are enabled initially.
 * - No publication dates or file sizes are invented.
 * - Knowledge Series Edition 01 exists as editorial
 *   content, but is not yet connected as a website PDF.
 *
 * No database access, API requests, forms,
 * server actions or automated email delivery.
 */

type ResourceCategoryId =
  | "knowledge-series"
  | "product-catalogues"
  | "company-profiles"
  | "technical-guides";

type ResourceCategory = {
  id: ResourceCategoryId;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  plannedResources: readonly string[];
};

/**
 * For a future milestone only.
 *
 * An item should be added here only after:
 * 1. The PDF has been approved.
 * 2. Its actual website path is verified.
 * 3. Its publication date is confirmed.
 * 4. Its file size is checked.
 *
 * The array remains EMPTY in File 86.
 */
type ApprovedPdf = {
  id: string;
  title: string;
  description: string;
  category: ResourceCategoryId;
  href: string;
  publishedAt: string;
  dateLabel: string;
  fileSizeLabel: string;
};

const approvedDownloads: readonly ApprovedPdf[] = [];

const resourceCategories = [
  {
    id: "knowledge-series",
    number: "01",
    eyebrow: "EDUCATIONAL PUBLICATIONS",
    title: "Knowledge Series Magazines",
    description:
      "Educational editions exploring materials, printing methods, product applications and practical hospitality purchasing considerations.",
    plannedResources: [
      "Knowledge Series editions",
      "Printing and material learning resources",
      "Hospitality product education",
    ],
  },
  {
    id: "product-catalogues",
    number: "02",
    eyebrow: "PRODUCT REFERENCES",
    title: "Product Catalogues",
    description:
      "A future library for approved product brochures and category references to support product discovery and specification discussions.",
    plannedResources: [
      "Hospitality product catalogues",
      "Category brochures",
      "Selected product reference sheets",
    ],
  },
  {
    id: "company-profiles",
    number: "03",
    eyebrow: "CORPORATE INFORMATION",
    title: "Company Profiles",
    description:
      "A dedicated location for approved company presentation material covering Bark Ornament's story, capabilities and markets.",
    plannedResources: [
      "Company profile",
      "Product and service overview",
      "International market overview",
    ],
  },
  {
    id: "technical-guides",
    number: "04",
    eyebrow: "PRACTICAL REFERENCES",
    title: "Technical Guides",
    description:
      "Reference material to help customers prepare artwork, compare materials, understand measurements and plan product requirements.",
    plannedResources: [
      "Artwork preparation guidance",
      "Paper and material selection",
      "Dimensions and freight measurement guides",
    ],
  },
] as const satisfies readonly ResourceCategory[];

const publicationChecks = [
  {
    number: "01",
    title: "Approved content",
    description:
      "Confirm that the publication's text, graphics, specifications and any company claims have been reviewed.",
  },
  {
    number: "02",
    title: "Verified document details",
    description:
      "Check the genuine PDF path, publication date, edition or version and file size before displaying them.",
  },
  {
    number: "03",
    title: "Accessible presentation",
    description:
      "Provide a meaningful document title and description, a readable PDF and a clearly labelled file link.",
  },
] as const;

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <span aria-hidden="true">
      {down ? "↓" : "→"}
    </span>
  );
}

/**
 * Decorative resource illustration.
 * Uses inline SVG and CSS only.
 * It is not a preview of a real PDF document.
 */
function LibraryArtwork() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/40 bg-[#49372C] p-7 shadow-2xl"
    >
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#E3B65D]/35 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
          Bark Ornament
        </span>

        <svg
          viewBox="0 0 112 120"
          width="112"
          height="120"
          fill="none"
          className="mt-8 text-[#E3B65D]"
        >
          <path
            d="M26 12H69L88 31V105H26V12Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          <path
            d="M69 12V31H88"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          <path
            d="M38 47H75M38 58H75M38 69H65"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />

          <path
            d="M56 79V96M49 89L56 96L63 89"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M12 29V109H71"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeOpacity="0.5"
          />
        </svg>

        <span className="mt-7 font-serif text-3xl text-[#E3B65D]">
          The Resource Library
        </span>

        <span className="mt-5 max-w-56 text-sm leading-7 text-[#E9DDC9]">
          Considered knowledge for hospitality professionals.
        </span>
      </div>
    </div>
  );
}

export default function DownloadsPage() {
  return (
    <main className="bg-[#FAF7F0] text-[#30251F]">
      {/* 1. HERO */}
      <section
        aria-labelledby="downloads-title"
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

              <li aria-current="page" className="text-white">
                Downloads & Resources
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament Insights · Resources
              </p>

              <h1
                id="downloads-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
              >
                Resources for

                <span className="mt-2 block text-[#E3B65D]">
                  Every Detail.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                A dedicated library for educational magazines,
                product catalogues, company information and
                practical reference guides.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8C8B5]">
                Our digital collection is being prepared.
                Approved PDF publications will become available
                here after their files and details are verified.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#resource-library"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Explore resources
                  <Arrow down />
                </a>

                <Link
                  href="/insights/knowledge"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Visit Knowledge Hub
                  <Arrow />
                </Link>
              </div>
            </div>

            <LibraryArtwork />
          </div>
        </div>
      </section>

      {/* 2. LIBRARY NAVIGATION */}
      <section
        id="resource-library"
        aria-labelledby="resource-library-title"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Browse by resource type
          </p>

          <h2
            id="resource-library-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore the Resource Library
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            The library is organised into four publication
            families. Their descriptions explain the intended
            content, rather than implying that files are
            already available to download.
          </p>

          <nav
            aria-label="Jump to a resource category"
            className="mt-8 flex flex-wrap gap-3"
          >
            {resourceCategories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-[#D5C2A6] bg-white px-5 py-2 text-sm font-semibold text-[#5A4232] transition-colors hover:border-[#B95016] hover:bg-[#F3E7D5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                {category.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* 3. FEATURED EXISTING EDITORIAL EDITION */}
      <section
        id="featured-resource"
        aria-labelledby="featured-resource-title"
        className="scroll-mt-20 border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Featured educational edition
          </p>

          <h2
            id="featured-resource-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Knowledge Series · Edition 01
          </h2>

          <div className="mt-9 grid overflow-hidden rounded-2xl border border-[#D9C8B0] bg-[#FAF7F0] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div
              aria-hidden="true"
              className="relative flex min-h-72 items-center justify-center overflow-hidden bg-[#DED0BA] p-9"
            >
              <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full border border-[#A87935]/25" />

              <div className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full border border-[#A87935]/25" />

              <div className="relative flex w-full max-w-64 flex-col items-center rounded-xl border border-[#A87935]/40 bg-[#FAF7F0]/90 px-7 py-11 text-center shadow-sm">
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
                Existing editorial material
              </p>

              <h3 className="mt-5 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl">
                What Does GSM Mean, and Why Does It Matter
                for Hospitality Products?
              </h3>

              <p className="mt-5 text-base leading-8 text-[#66584F]">
                Explore how paper weight relates to material
                selection, product handling and presentation
                for printed hospitality applications.
              </p>

              <p className="mt-5 border-l-2 border-[#C59A45] pl-4 text-sm leading-7 text-[#74675E]">
                This edition exists as Bark Ornament
                educational material, but its approved PDF
                has not yet been connected to the website.
                No download link is currently available.
              </p>

              <Link
                href="/insights/knowledge#featured-edition"
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#913E11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                Explore the GSM Topic
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOUR RESOURCE COLLECTIONS */}
      {resourceCategories.map((category, index) => (
        <section
          key={category.id}
          id={category.id}
          aria-labelledby={`${category.id}-title`}
          className={`scroll-mt-20 border-b border-[#E0D2BF] px-5 py-16 sm:px-8 sm:py-20 ${
            index % 2 === 0
              ? "bg-[#FAF7F0]"
              : "bg-[#F3EBDF]"
          }`}
        >
          <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                Collection {category.number} ·{" "}
                {category.eyebrow}
              </p>

              <h2
                id={`${category.id}-title`}
                className="mt-4 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
              >
                {category.title}
              </h2>

              <p className="mt-5 max-w-xl text-base leading-8 text-[#66584F]">
                {category.description}
              </p>

              <p className="mt-6 text-sm font-semibold text-[#8B6741]">
                Resource collection in preparation
              </p>
            </div>

            <div className="rounded-2xl border border-[#D9C8B0] bg-white p-7 shadow-sm sm:p-8">
              <h3 className="font-serif text-2xl text-[#30251F]">
                Intended Resource Types
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#74675E]">
                The following are proposed content types,
                not available PDF files.
              </p>

              <ul className="mt-6 divide-y divide-[#E8DCCB]">
                {category.plannedResources.map((resource) => (
                  <li
                    key={resource}
                    className="flex items-start gap-3 py-4 text-sm leading-7 text-[#5A4A41]"
                  >
                    <span
                      aria-hidden="true"
                      className="font-bold text-[#A94C19]"
                    >
                      •
                    </span>

                    <span>{resource}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}

      {/* 5. AVAILABLE FILES — ACCURATE EMPTY STATE */}
      <section
        id="available-downloads"
        aria-labelledby="available-downloads-title"
        className="scroll-mt-20 bg-[#FAF7F0] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Verified publications
          </p>

          <h2
            id="available-downloads-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Available Downloads
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Only real, approved files will appear in this
            collection. Each published document will have
            a verified file location and descriptive details.
          </p>

          {approvedDownloads.length === 0 ? (
            <div className="mt-9 rounded-2xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 sm:p-10">
              <div
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#C59A45]/50 bg-[#FAF7F0] text-[#A94C19]"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  fill="none"
                >
                  <path
                    d="M7 3H14L19 8V21H7V3Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />

                  <path
                    d="M14 3V8H19M10 13H16M10 17H16"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F] sm:text-3xl">
                Our digital download collection is being prepared.
              </h3>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#66584F]">
                There are no approved PDF files available
                for direct website download at present.
                Resources will be listed here after the
                corresponding documents are verified and
                connected to the website.
              </p>

              <Link
                href="/insights/knowledge"
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
              >
                Explore educational topics
                <Arrow />
              </Link>
            </div>
          ) : (
            <ul className="mt-9 grid gap-5 md:grid-cols-2">
              {approvedDownloads.map((file) => (
                <li
                  key={file.id}
                  className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-white p-7 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                    {resourceCategories.find(
                      (category) => category.id === file.category
                    )?.title}
                  </p>

                  <h3 className="mt-4 font-serif text-2xl leading-snug text-[#30251F]">
                    {file.title}
                  </h3>

                  <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                    {file.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#74675E]">
                    <time dateTime={file.publishedAt}>
                      {file.dateLabel}
                    </time>

                    <span>
                      PDF · {file.fileSizeLabel}
                    </span>
                  </div>

                  <a
                    href={file.href}
                    download
                    type="application/pdf"
                    className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#913E11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
                  >
                    Download PDF
                    <Arrow />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 6. DOCUMENT PUBLISHING REQUIREMENTS */}
      <section
        aria-labelledby="publication-standards-title"
        className="border-y border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Resource preparation
          </p>

          <h2
            id="publication-standards-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Preparing Reliable Resources
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Publications should be reviewed and their
            document details confirmed before they are
            made available for download.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {publicationChecks.map((check) => (
              <article
                key={check.number}
                className="rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {check.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F]">
                  {check.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#74675E]">
                  {check.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 7. RELATED SECTIONS */}
      <section
        aria-labelledby="related-resources-title"
        className="bg-[#FAF7F0] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Continue exploring
          </p>

          <h2
            id="related-resources-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            More from Bark Ornament
          </h2>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Knowledge Hub",
                description:
                  "Learn about materials, printing finishes and hospitality product decisions.",
                href: "/insights/knowledge",
              },
              {
                title: "News & Updates",
                description:
                  "Explore company news categories and verified updates as they become available.",
                href: "/insights/news",
              },
              {
                title: "Product Catalogue",
                description:
                  "Browse products and collections for your next hospitality requirement.",
                href: "/products",
              },
            ].map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
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

      {/* 8. SAFE CALL TO ACTION */}
      <section
        aria-labelledby="downloads-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Knowledge & product discovery
          </p>

          <h2
            id="downloads-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            From Useful Knowledge to Thoughtful Products.
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Explore our product families and educational
            content while the downloadable resource
            collection is being prepared.
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
              href="/categories"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Explore Product Categories
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
