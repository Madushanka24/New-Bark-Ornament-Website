
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ApprovedProductImage from "@/components/ApprovedProductImage";
import { approvedHomepageImages } from "@/lib/approved-homepage-images";
import { Suspense } from "react";

type Collection = {
  slug: string;
  name: string;
  number: string;
  eyebrow: string;
  introduction: string;
  description: string;
  examples: readonly string[];
  considerations: readonly string[];
};

/**
 * BARK ORNAMENT — CATEGORY DETAIL PAGES
 *
 * File: src/app/categories/[slug]/page.tsx
 *
 * UI FIX 14:
 * - Corrected dark-background hero headings.
 * - Corrected bottom quotation CTA heading.
 * - Corrected Suspense loading heading.
 * - Standardized primary buttons to brand orange.
 *
 * All ten category names and slugs are preserved.
 * Editorial descriptions are not live inventory.
 *
 * FILE 150 — STEP E7T:
 * - Preserve editorial content and photography.
 * - Keep original product links when CMS is disabled.
 * - When publication is enabled, use the guarded
 *   product-category listing route from E7R.
 * - CMS-only categories use that separate route.
 *
 * No database access, quotation submissions
 * or automated email delivery.
 */

const collections = [
  {
    slug: "printing-stationery",
    name: "Printing & Corporate Stationery",
    number: "01",
    eyebrow: "PRINT & PAPER",
    introduction: "Make every written touchpoint feel considered.",
    description:
      "Explore printed materials and corporate stationery designed for professional communication throughout hotels, resorts and businesses.",
    examples: [
      "Letterheads",
      "Business cards",
      "Envelopes",
      "Notepads",
    ],
    considerations: [
      "Paper weight and finish",
      "Print quantity and format",
      "Brand colours and artwork",
    ],
  },
  {
    slug: "menus-guest-service",
    name: "Menus & Guest Service Products",
    number: "02",
    eyebrow: "GUEST PRESENTATION",
    introduction: "Present the guest experience beautifully.",
    description:
      "Discover menu presentation materials and guest-facing printed accessories for a coordinated hospitality setting.",
    examples: [
      "Menu covers",
      "Menu paper",
      "Menu folders",
      "Guest information folders",
    ],
    considerations: [
      "Usage and durability",
      "Cover material and finishing",
      "Page sizes and branding",
    ],
  },
  {
    slug: "tags-stickers-cards",
    name: "Tags, Stickers & Cards",
    number: "03",
    eyebrow: "BRANDED DETAILS",
    introduction: "The smallest details can carry the brand.",
    description:
      "Explore practical printed tags, stickers and cards for guest identification, packaging and everyday resort operations.",
    examples: [
      "Custom tags",
      "Printed stickers",
      "Key cards",
      "Product labels",
    ],
    considerations: [
      "Material and adhesive options",
      "Required dimensions",
      "Printing and personalisation",
    ],
  },
  {
    slug: "bags-packaging",
    name: "Bags & Packaging",
    number: "04",
    eyebrow: "PACKAGING",
    introduction: "Packaging is part of the presentation.",
    description:
      "Explore customized bags and packaging ideas for guest use, gifting, retail and hospitality presentation.",
    examples: [
      "Paper bags",
      "Cloth bags",
      "Gift bags",
      "Takeaway packaging",
    ],
    considerations: [
      "Material and handle type",
      "Size and intended contents",
      "Printing and minimum order quantity",
    ],
  },
  {
    slug: "wooden-products",
    name: "Wooden Products & Crafts",
    number: "05",
    eyebrow: "NATURAL CRAFT",
    introduction: "A natural expression of lasting detail.",
    description:
      "Explore wooden and crafted items that bring texture and warmth to selected hospitality applications.",
    examples: [
      "Wooden pens",
      "Wooden covers",
      "Wooden accessories",
      "Crafted presentation items",
    ],
    considerations: [
      "Wood type and finish",
      "Engraving or printing",
      "Size and intended placement",
    ],
  },
  {
    slug: "cane-natural",
    name: "Cane & Natural Products",
    number: "06",
    eyebrow: "NATURAL MATERIALS",
    introduction: "Texture that complements a coastal setting.",
    description:
      "Discover cane and natural-material accessories suited to selected resort presentation and operational needs.",
    examples: [
      "Cane baskets",
      "Woven accessories",
      "Natural-material containers",
      "Presentation pieces",
    ],
    considerations: [
      "Weave and material",
      "Size and intended use",
      "Finish and care requirements",
    ],
  },
  {
    slug: "ceramic-pottery-laksha",
    name: "Ceramic, Pottery & Laksha",
    number: "07",
    eyebrow: "ARTISAN COLLECTION",
    introduction: "Craft traditions with a distinct character.",
    description:
      "Explore ceramic, pottery and Laksha craft ideas for functional and decorative hospitality settings.",
    examples: [
      "Ceramic items",
      "Pottery pieces",
      "Laksha crafts",
      "Decorative accessories",
    ],
    considerations: [
      "Shape and dimensions",
      "Colour and surface finish",
      "Packing and shipping protection",
    ],
  },
  {
    slug: "candles-party",
    name: "Candles & Party Products",
    number: "08",
    eyebrow: "AMBIENCE & EVENTS",
    introduction: "Small touches for memorable occasions.",
    description:
      "Explore decorative candles and selected event items for celebrations, guest experiences and branded occasions.",
    examples: [
      "Decorative candles",
      "Event accessories",
      "Party supplies",
      "Celebration gifts",
    ],
    considerations: [
      "Event style and quantity",
      "Colours and presentation",
      "Packaging and delivery requirements",
    ],
  },
  {
    slug: "gifts-promotional",
    name: "Gifts & Promotional Products",
    number: "09",
    eyebrow: "THOUGHTFUL GIFTING",
    introduction: "Make a brand moment worth remembering.",
    description:
      "Discover customized guest gifts and promotional products for hospitality occasions and corporate communications.",
    examples: [
      "Corporate gifts",
      "Guest gifts",
      "Promotional merchandise",
      "Soft toys",
    ],
    considerations: [
      "Recipient and occasion",
      "Branding and personalisation",
      "Quantity and presentation",
    ],
  },
  {
    slug: "laundry-operations",
    name: "Laundry & Hotel Operations",
    number: "10",
    eyebrow: "HOTEL OPERATIONS",
    introduction: "Practical details that support the stay.",
    description:
      "Explore selected laundry and operational items for everyday hospitality workflows and guest services.",
    examples: [
      "Laundry bags",
      "Laundry tags",
      "Laundry stationery",
      "Operational print materials",
    ],
    considerations: [
      "Department workflow",
      "Material and durability",
      "Quantity and recurring supply needs",
    ],
  },
] as const satisfies readonly Collection[];

type PageProps = {
  params: Promise<{ slug: string }>;
};

function findCollection(slug: string) {
  return collections.find(
    (item) => item.slug === slug
  );
}

/**
 * Pre-render the ten established category slugs.
 * Unknown slugs are rejected with notFound().
 */

export function generateStaticParams() {
  return collections.map(({ slug }) => ({ slug }));
}

/**
 * Category-specific SEO metadata.
 * Preserve the original canonical URL,
 * title and editorial description.
 */

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = findCollection(slug);

  if (!category) notFound();

  return {
    alternates: {
      canonical: `/categories/${category.slug}`,
    },
    title: `${category.name} | Bark Ornament`,
    description: category.description,
  };
}

function SmallArrow() {
  return <span aria-hidden="true">→</span>;
}

/* ==========================================
   REUSABLE BUTTON STYLES
   ========================================== */

const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none";

const outlineButton =
  "inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-[#C59A45] px-6 py-3 text-sm font-bold text-[#FAF7F0] transition-colors duration-200 hover:bg-[#49362B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none";

/* ==========================================
   CATEGORY DETAIL CONTENT
   ========================================== */

async function CategoryDetailContent({
  params,
}: PageProps) {
  const { slug } = await params;
  const category = findCollection(slug);

  if (!category) notFound();

  /*
   * FILE 150 — STEP E7T
   *
   * Keep the ten editorial category pages
   * independent of CMS product records.
   *
   * When public CMS publication is disabled,
   * retain the existing filtered catalogue URL.
   *
   * When publication is explicitly requested,
   * use the guarded E7R category listing.
   *
   * E7R filters out draft and demo records
   * even if the CMS bridge is unavailable.
   */

  const publicCatalogueRequested =
    process.env.CATALOGUE_CMS_PUBLIC_ENABLED === "true";

  const catalogueHref = publicCatalogueRequested
    ? `/products/category/${encodeURIComponent(category.slug)}`
    : `/products?category=${encodeURIComponent(category.slug)}`;

  const currentIndex = collections.findIndex(
    (item) => item.slug === category.slug
  );

  const moreCollections = [1, 2, 3].map(
    (offset) =>
      collections[
        (currentIndex + offset) % collections.length
      ]
  );

  return (
    <main className="bg-[#FAF7F0] text-[#30251F]">

      {/* =====================================
          1. CATEGORY HERO
          UI FIX 14 — HEADING VISIBILITY
          ===================================== */}

      <section
        aria-labelledby="category-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20 lg:py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-96 w-96 rounded-full border border-[#C59A45]/20"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-32 h-[440px] w-[440px] rounded-full border border-[#C59A45]/15"
        />

        <div className="relative mx-auto max-w-7xl">

          {/* BREADCRUMB */}

          <nav
            aria-label="Breadcrumb"
            className="mb-12 text-sm text-[#E9DDC9]"
          >
            <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <li>
                <Link
                  href="/"
                  className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
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
                  href="/categories"
                  className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
                >
                  Categories
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
                className="text-[#FAF7F0]"
              >
                {category.name}
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(270px,0.75fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E3B65D]">
                Collection {category.number} ·{" "}
                {category.eyebrow}
              </p>

              {/* UI FIX 14 — CATEGORY NAME */}

              <h1
                id="category-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl"
                style={{
                  color: "#FAF7F0",
                }}
              >
                {category.name}
              </h1>

              <p className="mt-6 max-w-2xl font-serif text-2xl leading-snug text-[#E3B65D] sm:text-3xl">
                {category.introduction}
              </p>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#E9DDC9]">
                {category.description}
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href={catalogueHref}
                  className={primaryButton}
                >
                  Browse category products
                  <SmallArrow />
                </Link>

                <Link
                  href="/categories"
                  className={outlineButton}
                >
                  All categories
                </Link>
              </div>
            </div>

            {/* APPROVED IMAGE OR EXISTING FALLBACK */}

            {approvedHomepageImages.categories[category.slug] ? (
              <ApprovedProductImage
                label={category.name}
                photo={
                  approvedHomepageImages.categories[
                    category.slug
                  ]
                }
                aspect="portrait"
                fit="cover"
                sizes="(max-width: 1024px) 100vw, 360px"
                className="mx-auto min-h-64 max-w-sm border border-[#C59A45]/50 shadow-2xl sm:min-h-80"
              />
            ) : (
              <div
                className="relative mx-auto flex min-h-64 w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/50 bg-[#463427] p-8 text-center shadow-2xl sm:min-h-80"
                aria-label={`Editorial collection illustration for ${category.name}`}
              >
                <div
                  aria-hidden="true"
                  className="absolute -left-14 -top-14 h-48 w-48 rounded-full border border-[#C59A45]/25"
                />

                <div
                  aria-hidden="true"
                  className="absolute -bottom-16 -right-12 h-60 w-60 rounded-full border border-[#C59A45]/25"
                />

                <div className="relative w-full rounded-xl border border-[#C59A45]/50 px-7 py-10">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E3B65D]">
                    Bark Ornament
                  </p>

                  <p
                    aria-hidden="true"
                    className="mt-6 font-serif text-7xl text-[#E3B65D]"
                  >
                    {category.number}
                  </p>

                  <p className="mt-5 text-xs uppercase tracking-[0.16em] text-[#E9DDC9]">
                    The Collection
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================
          2. PRODUCT TYPE EXAMPLES
          ===================================== */}

      <section
        aria-labelledby="examples-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
              Explore the possibilities
            </p>

            <h2
              id="examples-title"
              className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            >
              Product types in this collection
            </h2>

            <p className="mt-5 text-base leading-8 text-[#74675E]">
              These examples illustrate the kinds of
              products associated with this category.
              They are not a live inventory, price list
              or availability confirmation.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {category.examples.map(
              (example, index) => (
                <article
                  key={example}
                  className="flex min-h-48 flex-col justify-between rounded-xl border border-[#E0D2BF] bg-white p-6 shadow-sm transition-[box-shadow,border-color] duration-300 hover:border-[#C59A45] hover:shadow-md motion-reduce:transition-none"
                >
                  <span
                    aria-hidden="true"
                    className="font-serif text-4xl text-[#C59A45]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <h3 className="mt-10 font-serif text-xl leading-snug text-[#30251F]">
                    {example}
                  </h3>
                </article>
              )
            )}
          </div>

          <div className="mt-9">
            <Link
              href={catalogueHref}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A94C19]"
            >
              View available catalogue listings
              <SmallArrow />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================
          3. PRODUCT SELECTION GUIDANCE
          ===================================== */}

      <section
        aria-labelledby="planning-title"
        className="border-y border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
              Planning your requirement
            </p>

            <h2
              id="planning-title"
              className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            >
              Details worth considering
            </h2>

            <p className="mt-5 max-w-lg text-base leading-8 text-[#74675E]">
              The right specification depends on where
              the product will be used, how it should
              represent your brand and the quantity
              required.
            </p>
          </div>

          <ul className="space-y-4">
            {category.considerations.map(
              (item, index) => (
                <li
                  key={item}
                  className="flex items-start gap-4 rounded-lg border border-[#E0D2BF] bg-[#FAF7F0] px-5 py-5"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E9DDC9] text-sm font-bold text-[#784E22]"
                  >
                    {index + 1}
                  </span>

                  <span className="pt-1 text-base font-medium leading-7 text-[#30251F]">
                    {item}
                  </span>
                </li>
              )
            )}
          </ul>
        </div>
      </section>

      {/* =====================================
          4. MORE CATEGORIES
          ===================================== */}

      <section
        aria-labelledby="next-collections-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
                Continue exploring
              </p>

              <h2
                id="next-collections-title"
                className="mt-4 font-serif text-3xl sm:text-4xl"
              >
                More collections
              </h2>
            </div>

            <Link
              href="/categories"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A94C19]"
            >
              View all categories
              <SmallArrow />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {moreCollections.map((item) => (
              <Link
                key={item.slug}
                href={`/categories/${item.slug}`}
                className="group flex min-h-36 flex-col justify-between rounded-xl border border-[#E0D2BF] bg-[#FAF7F0] p-6 transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                {approvedHomepageImages.categories[item.slug] && (
                  <ApprovedProductImage
                    label={item.name}
                    photo={
                      approvedHomepageImages.categories[
                        item.slug
                      ]
                    }
                    aspect="wide"
                    fit="cover"
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="mb-4 min-h-32"
                  />
                )}

                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                  Collection {item.number}
                </span>

                <span className="mt-6 flex items-end justify-between gap-3 font-serif text-xl leading-snug text-[#30251F]">
                  {item.name}
                  <SmallArrow />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================
          5. QUOTATION NAVIGATION
          UI FIX 14 — HEADING & BUTTON COLORS
          ===================================== */}

      <section
        aria-labelledby="quote-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Customized hospitality solutions
          </p>

          <h2
            id="quote-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Have a specific requirement?
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Explore suitable product options and
            prepare your requirements for our team.
            Availability, customisation and
            specifications are confirmed through enquiry.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/request-quotation"
              className={primaryButton}
            >
              Request a quotation
              <SmallArrow />
            </Link>

            <Link
              href={catalogueHref}
              className={outlineButton}
            >
              Browse products
            </Link>
          </div>

          <p className="mt-5 text-sm text-[#E9DDC9]">
            Online quotation submission remains
            disabled during development.
          </p>
        </div>
      </section>
    </main>
  );
}

/* ==========================================
   NEXT.JS 16 INSTANT NAVIGATION
   ========================================== */

/**
 * URL-dependent category content is rendered
 * inside a Suspense boundary.
 */

export default function CategoryDetailPage({
  params,
}: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAF7F0] text-[#30251F]">
          <section className="bg-[#30251F] px-5 py-20 text-[#FAF7F0] sm:px-8">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament Collections
              </p>

              {/* UI FIX 14 — LOADING HEADING */}

              <h1
                className="mt-6 font-serif text-3xl sm:text-5xl"
                style={{
                  color: "#FAF7F0",
                }}
              >
                Explore Our Product Collections
              </h1>

              <p
                role="status"
                className="mt-6 text-base text-[#E9DDC9]"
              >
                Loading collection details…
              </p>
            </div>
          </section>
        </main>
      }
    >
      <CategoryDetailContent params={params} />
    </Suspense>
  );
}
