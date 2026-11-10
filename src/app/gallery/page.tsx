
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, cache } from "react";

import ApprovedProductImage from "@/components/ApprovedProductImage";

import {
  getSanityGalleryPhotography,
  type GalleryCollectionId,
  type GalleryImagePosition,
} from "@/lib/sanity-gallery-photography";

export const metadata: Metadata = {
  title: "Gallery & Product Showcase | Bark Ornament",
  description:
    "Explore Bark Ornament's hospitality product collections, from menus and printed stationery to bags, wooden accessories, ceramics and guest gifting.",
};

type ShowcaseItem = {
  title: string;
  description: string;
};

type ShowcaseCollection = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  introduction: string;
  categorySlug: string;
  items: readonly ShowcaseItem[];
};

/**
 * BARK ORNAMENT — FILE 77
 * Gallery & Portfolio
 *
 * UI FIX 11:
 * - Fixed hero heading visibility.
 * - Fixed bottom CTA heading visibility.
 * - Updated primary buttons to brand orange.
 *
 * Editorial examples only.
 *
 * These are not client case studies, verified deliveries,
 * priced listings or live inventory records.
 *
 * Category slugs match:
 * src/app/categories/[slug]/page.tsx
 *
 * Sanity photography integration added in File 148.
 * No direct database access or submissions.
 */

const collections = [
  {
    id: "printing",
    number: "01",
    eyebrow: "BRAND COMMUNICATION",
    title: "Printing & Stationery",
    introduction:
      "Considered printed details for everyday guest communication and the business behind each stay.",
    categorySlug: "printing-stationery",
    items: [
      {
        title: "Corporate Stationery",
        description:
          "Letterheads, envelopes and business card presentation.",
      },
      {
        title: "Printed Guest Collaterals",
        description:
          "Branded notices, information cards and notepads.",
      },
    ],
  },
  {
    id: "menus",
    number: "02",
    eyebrow: "DINING & GUEST SERVICES",
    title: "Menus & Guest Presentation",
    introduction:
      "The details guests hold, browse and remember, designed around each hospitality setting.",
    categorySlug: "menus-guest-service",
    items: [
      {
        title: "Menu Covers",
        description:
          "Presentation options for restaurant and in-room menus.",
      },
      {
        title: "Guest Information Folders",
        description:
          "Organised printed materials for guest-facing spaces.",
      },
    ],
  },
  {
    id: "packaging",
    number: "03",
    eyebrow: "PACKAGING & TAKEAWAYS",
    title: "Bags & Packaging",
    introduction:
      "Thoughtful packaging can extend a resort's visual identity beyond the moment of purchase.",
    categorySlug: "bags-packaging",
    items: [
      {
        title: "Branded Paper Bags",
        description:
          "Retail, welcome-gift and promotional bag concepts.",
      },
      {
        title: "Cloth & Gift Bags",
        description:
          "Reusable presentation options for different requirements.",
      },
    ],
  },
  {
    id: "woodcraft",
    number: "04",
    eyebrow: "MATERIAL & CRAFT",
    title: "Wooden Accessories",
    introduction:
      "Natural textures and crafted finishes suited to warm, understated resort interiors.",
    categorySlug: "wooden-products",
    items: [
      {
        title: "Wooden Covers",
        description:
          "Crafted presentation pieces for selected guest uses.",
      },
      {
        title: "Wooden Accessories",
        description:
          "Customisable functional and decorative accessories.",
      },
    ],
  },
  {
    id: "artisan",
    number: "05",
    eyebrow: "ARTISAN DETAIL",
    title: "Ceramics & Decorative Craft",
    introduction:
      "Decorative materials and distinctive finishes that bring character to a hospitality setting.",
    categorySlug: "ceramic-pottery-laksha",
    items: [
      {
        title: "Pottery & Ceramics",
        description:
          "Selected functional and decorative product forms.",
      },
      {
        title: "Laksha Craft",
        description:
          "Colourful craft-led accessories and gift ideas.",
      },
    ],
  },
  {
    id: "gifting",
    number: "06",
    eyebrow: "MEMORABLE OCCASIONS",
    title: "Gifts & Promotional Products",
    introduction:
      "Customised details for welcome moments, events and considered corporate gifting.",
    categorySlug: "gifts-promotional",
    items: [
      {
        title: "Guest Welcome Gifts",
        description:
          "Branded gift concepts tailored to an occasion.",
      },
      {
        title: "Promotional Merchandise",
        description:
          "Product ideas for events and brand touchpoints.",
      },
    ],
  },
] as const satisfies readonly ShowcaseCollection[];

/**
 * The other four product categories remain accessible.
 * Together these links cover all ten category slugs.
 */

const additionalCategories = [
  {
    title: "Tags, Stickers & Cards",
    slug: "tags-stickers-cards",
  },
  {
    title: "Cane & Natural Products",
    slug: "cane-natural",
  },
  {
    title: "Candles & Party Products",
    slug: "candles-party",
  },
  {
    title: "Laundry & Hotel Operations",
    slug: "laundry-operations",
  },
] as const;

const previewTones = [
  "bg-[#E8D7C0]",
  "bg-[#E5D1B2]",
  "bg-[#EFE3D2]",
  "bg-[#DDD0BF]",
] as const;

function Arrow({
  direction = "right",
}: {
  direction?: "right" | "down";
}) {
  return (
    <span aria-hidden="true">
      {direction === "down" ? "↓" : "→"}
    </span>
  );
}

/**
 * Intentional photography placeholder.
 *
 * It uses CSS and an inline decorative SVG,
 * not an external image or a nonexistent asset.
 *
 * Actual approved images can replace this component
 * in a subsequent development milestone.
 */

function ProductPreview({
  number,
  label,
  tone,
}: {
  number: string;
  label: string;
  tone: string;
}) {
  return (
    <div
      className={`relative flex aspect-[5/4] items-center justify-center overflow-hidden ${tone}`}
      aria-label={`Photography placeholder for ${label}`}
      role="img"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full border border-[#A77C40]/25"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-12 h-64 w-64 rounded-full border border-[#A77C40]/25"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-5 rounded-lg border border-[#A77C40]/25 sm:inset-7"
      />

      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 72 64"
          width="64"
          height="58"
          fill="none"
          className="text-[#94713C]"
        >
          <rect
            x="9"
            y="9"
            width="54"
            height="46"
            rx="4"
            stroke="currentColor"
            strokeWidth="1.5"
          />

          <circle
            cx="24"
            cy="23"
            r="5"
            stroke="currentColor"
            strokeWidth="1.5"
          />

          <path
            d="M11 48 27 34l10 9 11-12 13 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>

        <span
          className="font-serif text-3xl text-[#745633]"
          aria-hidden="true"
        >
          {number}
        </span>

        <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#745633]">
          Product photo to follow
        </span>
      </div>
    </div>
  );
}

/* ==========================================
   FILE 148 — STEP D

   SANITY GALLERY PHOTO INTEGRATION
   ========================================== */

/**
 * Share the same Sanity result across all
 * twelve gallery positions in one render.
 *
 * This prevents twelve independent
 * requests to the same CMS query.
 */
const getGalleryPhotographyOnce = cache(
  getSanityGalleryPhotography
);

/**
 * Retrieve an approved Gallery photograph.
 *
 * If a photograph is missing or invalid,
 * render the original Gallery placeholder.
 */
async function SanityProductPreview({
  collectionId,
  position,
  number,
  label,
  tone,
}: {
  collectionId: GalleryCollectionId;
  position: GalleryImagePosition;
  number: string;
  label: string;
  tone: string;
}) {
  const galleries =
    await getGalleryPhotographyOnce();

  const photo =
    galleries[collectionId]?.[position];

  if (!photo) {
    return (
      <ProductPreview
        number={number}
        label={label}
        tone={tone}
      />
    );
  }

  return (
    <ApprovedProductImage
      label={label}
      photo={photo}
      aspect="hero"
      fit="cover"
      sizes="(max-width: 640px) 100vw, 50vw"
      className="rounded-none"
    />
  );
}

export default function GalleryPage() {
  return (
    <main className="bg-[#FAF7F0] text-[#30251F]">

      {/* =====================================
          1. HERO SECTION
          ===================================== */}

      <section
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20 lg:py-24"
        aria-labelledby="gallery-title"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-52 h-[540px] w-[540px] rounded-full border border-[#C59A45]/20"
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
                Gallery & Portfolio
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(290px,0.7fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E3B65D]">
                Bark Ornament · Product Showcase
              </p>

              {/* UI FIX 11 — HERO TEXT VISIBILITY */}

              <h1
                id="gallery-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
                style={{
                  color: "#FAF7F0",
                }}
              >
                Beautifully Considered.

                <span
                  className="mt-2 block"
                  style={{
                    color: "#E3B65D",
                  }}
                >
                  Made for Hospitality.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                Explore the product families and material
                details behind thoughtful guest experiences
                —from printed presentation to crafted
                accessories and gifting.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8C8B5]">
                This is a category showcase. Approved
                product photographs and verified project
                case studies will be added separately;
                the previews below are not photographs
                of completed client work.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#gallery-collections"
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#B95016] px-7 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none"
                >
                  Explore the showcase
                  <Arrow direction="down" />
                </a>

                <Link
                  href="/categories"
                  className="inline-flex min-h-12 items-center gap-3 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49362B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  All product categories
                  <Arrow />
                </Link>
              </div>
            </div>

            {/* Abstract editorial artwork; no external images */}

            <div
              aria-hidden="true"
              className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-[#C59A45]/45 bg-[#473629] p-8 shadow-2xl"
            >
              <div className="relative flex aspect-[4/5] flex-col items-center justify-center rounded-xl border border-[#C59A45]/40 px-6 text-center">
                <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full border border-[#C59A45]/30" />

                <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full border border-[#C59A45]/30" />

                <span className="relative text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                  The Collection
                </span>

                <span className="relative mt-8 font-serif text-7xl text-[#E3B65D]">
                  BO
                </span>

                <span className="relative mt-8 max-w-[16rem] text-sm leading-6 text-[#E9DDC9]">
                  A study of material, detail and presentation
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          2. INTRODUCTION AND COLLECTION NAVIGATION
          ===================================== */}

      <section
        id="gallery-collections"
        className="scroll-mt-24 px-5 pb-9 pt-16 sm:px-8 sm:pt-20"
        aria-labelledby="showcase-title"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B95016]">
            Explore by product family
          </p>

          <h2
            id="showcase-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl lg:text-5xl"
          >
            Our Product Showcase
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Browse six curated groups of representative
            hospitality products. Choose a section below
            or explore the full category catalogue.
          </p>

          <nav
            aria-label="Jump to a gallery collection"
            className="mt-8 flex flex-wrap gap-2"
          >
            {collections.map((collection) => (
              <a
                key={collection.id}
                href={`#${collection.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-[#D4C1A5] bg-white px-4 py-2 text-sm font-medium text-[#5D4837] transition-[background-color,border-color,color] hover:border-[#B95016] hover:bg-[#F0E0CB] hover:text-[#783B18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                {collection.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* =====================================
          3. CATEGORY-BASED GALLERY SECTIONS
          ===================================== */}

      {collections.map((collection, sectionIndex) => (
        <section
          key={collection.id}
          id={collection.id}
          aria-labelledby={`${collection.id}-title`}
          className={`scroll-mt-24 border-t border-[#E7D9C5] px-5 py-14 sm:px-8 sm:py-20 ${
            sectionIndex % 2 === 1
              ? "bg-[#F3EBDF]"
              : "bg-[#FAF7F0]"
          }`}
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
                  Collection {collection.number} ·{" "}
                  {collection.eyebrow}
                </p>

                <h2
                  id={`${collection.id}-title`}
                  className="mt-4 font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl"
                >
                  {collection.title}
                </h2>

                <p className="mt-4 text-base leading-8 text-[#74675E]">
                  {collection.introduction}
                </p>
              </div>

              <Link
                href={`/categories/${collection.categorySlug}`}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-sm text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
              >
                Explore this category
                <Arrow />
              </Link>
            </div>

            <div className="mt-9 grid gap-6 sm:grid-cols-2">
              {collection.items.map((item, itemIndex) => (
                <article
                  key={item.title}
                  className="overflow-hidden rounded-xl border border-[#D9C8B0] bg-white shadow-sm transition-[box-shadow,border-color] duration-300 hover:border-[#C59A45] hover:shadow-lg motion-reduce:transition-none"
                >
                  <Suspense
                    fallback={
                      <ProductPreview
                        number={`${collection.number}.${itemIndex + 1}`}
                        label={item.title}
                        tone={
                          previewTones[
                            (sectionIndex + itemIndex) %
                              previewTones.length
                          ]
                        }
                      />
                    }
                  >
                    <SanityProductPreview
                      collectionId={collection.id}
                      position={
                        itemIndex === 0 ? "first" : "second"
                      }
                      number={`${collection.number}.${itemIndex + 1}`}
                      label={item.title}
                      tone={
                        previewTones[
                          (sectionIndex + itemIndex) %
                            previewTones.length
                        ]
                      }
                    />
                  </Suspense>

                  <div className="p-6 sm:p-7">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                      Representative product type
                    </span>

                    <h3 className="mt-3 font-serif text-2xl leading-snug text-[#30251F]">
                      {item.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-[#74675E]">
                      {item.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* =====================================
          4. ADDITIONAL PRODUCT FAMILIES
          ===================================== */}

      <section
        className="border-t border-[#E7D9C5] bg-[#FAF7F0] px-5 py-16 sm:px-8 sm:py-20"
        aria-labelledby="more-families-title"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Beyond the showcase
          </p>

          <h2
            id="more-families-title"
            className="mt-4 font-serif text-3xl sm:text-4xl"
          >
            More Product Families
          </h2>

          <p className="mt-4 max-w-3xl text-base leading-8 text-[#74675E]">
            Our category catalogue includes additional
            everyday hospitality and specialty product
            families.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {additionalCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group flex min-h-32 items-center justify-between gap-3 rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-5 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span className="font-serif text-lg leading-snug text-[#30251F]">
                  {category.title}
                </span>

                <Arrow />
              </Link>
            ))}
          </div>

          <div className="mt-9">
            <Link
              href="/categories"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
            >
              View all ten product categories
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================
          5. CATALOGUE AND QUOTATION NAVIGATION
          ===================================== */}

      <section
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
        aria-labelledby="gallery-cta-title"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Your next hospitality project
          </p>

          {/* UI FIX 11 — BOTTOM HEADING VISIBILITY */}

          <h2
            id="gallery-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Let&apos;s Explore the Possibilities.
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Browse the full product catalogue and prepare
            specifications for your preferred designs,
            materials and quantities.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#B95016] px-7 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none"
            >
              Browse Products
              <Arrow />
            </Link>

            <Link
              href="/request-quotation"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49362B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Request Quotation
              <Arrow />
            </Link>
          </div>

          <p className="mt-5 text-sm leading-6 text-[#D8C8B5]">
            Online quotation submissions are disabled
            during development. Product specifications
            and availability require confirmation.
          </p>
        </div>
      </section>
    </main>
  );
}
