
import Link from "next/link";
import type { Metadata } from "next";

import {
  getPublicCatalogueSnapshot,
} from "@/lib/catalogue-cms-bridge";

export const metadata: Metadata = {
  title: "Product Categories",
  description:
    "Explore customized hospitality product categories from Bark Ornament (Pvt) Ltd, including printing, menus, bags, wooden items, crafts, gifting and operational supplies.",
};

/**
 * BARK ORNAMENT — FILE 150 STEP E7S
 *
 * CATEGORIES LANDING PAGE
 * Theme: Golden Coastal Luxury
 *
 * PRESERVED:
 * - Ten original editorial categories
 * - Category names, descriptions and tags
 * - Original category detail links
 * - Category artwork placeholders
 * - Hero and business support sections
 * - Existing styling and animations
 * - Accessibility and responsive layout
 * - Page metadata
 *
 * CMS INTEGRATION:
 * - Server-only catalogue bridge
 * - Local editorial categories first
 * - Approved CMS-only categories appended
 * - No CMS category overrides local content
 * - CMS-only categories use prepared product
 *   category routes
 *
 * SAFETY:
 * - CMS publication remains disabled
 * - No Sanity mutations
 * - No database writes
 * - No quotation submissions
 * - No email delivery
 */

/* ==========================================
   1. ORIGINAL EDITORIAL CATEGORY DATA
   ========================================== */

const categories = [
  {
    number: "01",
    name: "Printing & Corporate Stationery",
    slug: "printing-stationery",
    shortLabel: "PRINT & PAPER",
    description:
      "Printed materials and corporate stationery designed to support professional hotel, resort and business communications.",
    tags: ["Corporate stationery", "Printing"],
  },
  {
    number: "02",
    name: "Menus & Guest Service Products",
    slug: "menus-guest-service",
    shortLabel: "GUEST PRESENTATION",
    description:
      "Menu presentation products and guest-facing accessories that help create a coordinated hospitality experience.",
    tags: ["Menus", "Guest service"],
  },
  {
    number: "03",
    name: "Tags, Stickers & Cards",
    slug: "tags-stickers-cards",
    shortLabel: "BRANDED DETAILS",
    description:
      "Customized tags, printed cards, labels and stickers for hospitality branding and daily operations.",
    tags: ["Key cards", "Labels"],
  },
  {
    number: "04",
    name: "Bags & Packaging",
    slug: "bags-packaging",
    shortLabel: "PACKAGING",
    description:
      "Branded bags and packaging solutions for guest presentation, gifting and hospitality requirements.",
    tags: ["Bags", "Packaging"],
  },
  {
    number: "05",
    name: "Wooden Products & Crafts",
    slug: "wooden-products",
    shortLabel: "NATURAL CRAFT",
    description:
      "Wooden accessories and crafted products that combine practical use with distinctive natural presentation.",
    tags: ["Wooden items", "Crafts"],
  },
  {
    number: "06",
    name: "Cane & Natural Products",
    slug: "cane-natural",
    shortLabel: "NATURAL MATERIALS",
    description:
      "Cane products and natural-material accessories suited to selected resort and hospitality applications.",
    tags: ["Cane", "Natural textures"],
  },
  {
    number: "07",
    name: "Ceramic, Pottery & Laksha",
    slug: "ceramic-pottery-laksha",
    shortLabel: "ARTISAN COLLECTION",
    description:
      "Decorative and functional pottery, ceramic and traditional Laksha craft products for hospitality settings.",
    tags: ["Ceramics", "Laksha"],
  },
  {
    number: "08",
    name: "Candles & Party Products",
    slug: "candles-party",
    shortLabel: "AMBIENCE & EVENTS",
    description:
      "Decorative candles and selected event accessories for guest experiences, celebrations and special occasions.",
    tags: ["Candles", "Events"],
  },
  {
    number: "09",
    name: "Gifts & Promotional Products",
    slug: "gifts-promotional",
    shortLabel: "THOUGHTFUL GIFTING",
    description:
      "Customized gifts and promotional merchandise for guest appreciation, branding and corporate occasions.",
    tags: ["Guest gifts", "Promotional"],
  },
  {
    number: "10",
    name: "Laundry & Hotel Operations",
    slug: "laundry-operations",
    shortLabel: "HOTEL OPERATIONS",
    description:
      "Selected laundry and operational products that support everyday hotel and resort requirements.",
    tags: ["Laundry", "Operations"],
  },
] as const;

/* ==========================================
   2. DISPLAY CATEGORY CONTRACT
   ========================================== */

type DisplayCategory = {
  number: string;
  name: string;
  slug: string;
  shortLabel: string;
  description: string;
  tags: readonly string[];
  href: string;
};

/* ==========================================
   3. CONTROLLED CMS CATEGORY RESOLUTION
   ========================================== */

/**
 * Preserve all ten original editorial cards.
 *
 * When CMS publication is disabled:
 * - Return exactly the original ten cards.
 *
 * When publication is enabled:
 * - Request the guarded catalogue snapshot.
 * - Retain original editorial category data.
 * - Append eligible CMS-only categories.
 *
 * The bridge already checks publication
 * and identity collisions.
 *
 * CMS-only categories link to the prepared
 * /products/category/[slug] route.
 */

async function getDisplayCategories():
  Promise<DisplayCategory[]> {
  const editorialCategories: DisplayCategory[] =
    categories.map((category) => ({
      ...category,
      href:
        `/categories/${encodeURIComponent(
          category.slug
        )}`,
    }));

  if (
    process.env.CATALOGUE_CMS_PUBLIC_ENABLED !==
    "true"
  ) {
    return editorialCategories;
  }

  const snapshot =
    await getPublicCatalogueSnapshot();

  if (!snapshot.cmsEnabled) {
    return editorialCategories;
  }

  const existingSlugs = new Set(
    editorialCategories.map(
      (category) => category.slug
    )
  );

  const cmsOnlyCategories =
    snapshot.categories.filter(
      (category) =>
        !existingSlugs.has(category.slug)
    );

  const addedCategories: DisplayCategory[] =
    cmsOnlyCategories.map((category, index) => ({
      number: String(
        editorialCategories.length + index + 1
      ).padStart(2, "0"),

      name: category.name,
      slug: category.slug,

      shortLabel: "PRODUCT COLLECTION",

      description: category.description,

      tags: [],

      href:
        `/products/category/${encodeURIComponent(
          category.slug
        )}`,
    }));

  return [
    ...editorialCategories,
    ...addedCategories,
  ];
}

/* ==========================================
   4. CATEGORY ARTWORK
   ========================================== */

/**
 * Preserve the original editorial placeholder.
 *
 * CMS category imagery will be connected in
 * a separate photography integration step.
 *
 * No unverified image is introduced here.
 */

function CategoryArtwork({
  category,
}: {
  category: DisplayCategory;
}) {
  return (
    <div
      role="img"
      aria-label={`${category.name}. Product photography will be added later.`}
      className="relative flex min-h-[190px] flex-col items-center justify-center overflow-hidden bg-[#E9DDC9] px-6 py-10 text-center sm:min-h-[215px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-14 -top-14 h-44 w-44 rounded-full border border-[#C59A45]/30"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-12 h-56 w-56 rounded-full border border-[#C59A45]/30"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-5 rounded-lg border border-[#C59A45]/25"
      />

      <svg
        aria-hidden="true"
        width="42"
        height="42"
        viewBox="0 0 48 48"
        fill="none"
        className="relative mb-5 text-[#94713C]"
      >
        <rect
          x="7"
          y="7"
          width="34"
          height="34"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />

        <circle
          cx="17"
          cy="17"
          r="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />

        <path
          d="M9 35L20 24L26 30L33 22L41 31"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      <span className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-[#725D43]">
        {category.shortLabel}
      </span>

      <span className="relative mt-3 max-w-52 text-xs leading-5 text-[#84725F]">
        Product photography coming later
      </span>
    </div>
  );
}

/* ==========================================
   5. CATEGORY CARD

   Preserve the original accessible
   full-card link.

   Editorial categories retain their
   original /categories/[slug] links.

   CMS-only categories use the already
   prepared /products/category/[slug] route.
   ========================================== */

function CategoryCard({
  category,
}: {
  category: DisplayCategory;
}) {
  return (
    <Link
      href={category.href}
      aria-label={`Explore ${category.name} category`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#C59A45] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <CategoryArtwork category={category} />

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#B95016]">
          Collection {category.number}
        </p>

        <h3 className="font-serif text-2xl leading-snug text-[#30251F]">
          {category.name}
        </h3>

        <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
          {category.description}
        </p>

        <div
          className="mt-6 flex flex-wrap gap-2"
          aria-hidden="true"
        >
          {category.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#E0D2BF] px-3 py-1.5 text-xs text-[#725D43]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-7 border-t border-[#E7DCCB] pt-5">
          <span
            aria-hidden="true"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#A94C19] transition-colors group-hover:text-[#74330F] group-hover:underline motion-reduce:transition-none"
          >
            Explore Collection

            <span className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none">
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ==========================================
   6. CATEGORY LANDING PAGE

   Server Component.

   Resolve display categories on the server.
   Preserve the original page content.
   ========================================== */

export default async function CategoriesPage() {
  const displayCategories =
    await getDisplayCategories();

  return (
    <>
      {/* PAGE INTRODUCTION */}

      <section
        aria-labelledby="categories-hero-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-20 text-[#FAF7F0] sm:px-8 sm:py-24 lg:py-28"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-48 h-[520px] w-[520px] rounded-full border border-[#C59A45]/20"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-64 -left-48 h-[500px] w-[500px] rounded-full border border-[#C59A45]/15"
        />

        <div className="relative mx-auto flex max-w-5xl flex-col items-center text-center">
          <nav
            aria-label="Breadcrumb"
            className="mb-10 text-sm text-[#E9DDC9]"
          >
            <ol className="flex flex-wrap items-center justify-center gap-3">
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
                className="text-[#C59A45]"
              >
                /
              </li>

              <li
                aria-current="page"
                className="text-[#FAF7F0]"
              >
                Product Categories
              </li>
            </ol>
          </nav>

          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-[#E3B65D]">
            Bark Ornament · Our Collections
          </p>

          <h1
            id="categories-hero-title"
            className="max-w-4xl font-serif text-4xl leading-[1.13] tracking-tight text-[#FAF7F0] sm:text-5xl lg:text-7xl"
          >
            Thoughtful Details.

            <span className="mt-2 block text-[#E3B65D]">
              Distinctive Hospitality.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
            Discover customized printing, guest essentials,
            packaging, natural crafts and gifting solutions
            for hotels and resorts.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <a
              href="#product-collections"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#C59A45] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#E3B65D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FAF7F0] motion-reduce:transition-none"
            >
              Explore Collections

              <span aria-hidden="true">
                ↓
              </span>
            </a>

            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#C59A45] hover:text-[#30251F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FAF7F0] motion-reduce:transition-none"
            >
              View All Products

              <span aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          <p className="mt-9 text-sm tracking-wide text-[#E9DDC9]">
            Serving hospitality customers in the Maldives,
            Seychelles and Sri Lanka.
          </p>
        </div>
      </section>

      {/* COLLECTION INTRODUCTION */}

      <section
        id="product-collections"
        aria-labelledby="collections-title"
        className="scroll-mt-16 bg-[#FAF7F0] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-14">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#B95016]">
              Our Product Families
            </p>

            <h2
              id="collections-title"
              className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl lg:text-5xl"
            >
              Explore Our Collections
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#74675E]">
              From printed guest touchpoints to crafted
              accessories, explore our main product families
              and find options for your next hospitality
              requirement.
            </p>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-[#A94C19]">
              {displayCategories.length} Product Collections
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayCategories.map((category) => (
              <CategoryCard
                key={category.slug}
                category={category}
              />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-[#913E11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
            >
              Browse Full Product Catalogue

              <span aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* BUSINESS-TO-BUSINESS SUPPORT */}

      <section
        aria-labelledby="category-support-title"
        className="border-t border-[#E5D8C4] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-5xl text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#B95016]">
            Hospitality Solutions
          </p>

          <h2
            id="category-support-title"
            className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
          >
            Your Brand, In Every Detail.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#74675E]">
            Selecting products for a resort opening,
            an operational requirement or a branded
            guest experience? Share your specifications
            with our team to discuss suitable options.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              href="/request-quotation"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#30251F] px-8 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#B95016] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
            >
              Request a Quotation

              <span aria-hidden="true">
                →
              </span>
            </Link>

            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#94713C] px-8 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#E9DDC9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
            >
              Explore Products

              <span aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-[#74675E]">
            Product availability, customization and
            specifications are confirmed through enquiry.
          </p>
        </div>
      </section>
    </>
  );
}
