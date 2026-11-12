import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";

import ApprovedProductImage, {
  type ApprovedPhoto,
} from "@/components/ApprovedProductImage";

import {
  getApprovedProductMainImage,
} from "@/lib/approved-product-images";

import {
  getSanityProductMainImages,
} from "@/lib/sanity-product-photography";

import {
  productCategories,
  getProductsByCategory,
  type Product,
} from "@/lib/products";

import {
  getPublicCatalogueSnapshot,
} from "@/lib/catalogue-cms-bridge";

/**
 * BARK ORNAMENT — FILE 163 STEP F40
 *
 * CATEGORY PRODUCT LISTING PAGE
 * Theme: Golden Coastal Luxury
 *
 * FILE 163
 * - Set the correct editorial category canonical.
 * - Preserve noindex/nofollow for this
 *   secondary product-listing route.
 *
 * EXISTING FUNCTIONALITY PRESERVED
 * - CMS-approved category product records.
 * - Local development product previews.
 * - Production draft/demo exclusion.
 * - Approved Sanity product photography.
 * - Approved local photograph fallback.
 * - Original missing-photo placeholder.
 * - Category links and product navigation.
 * - Next.js 16 Suspense boundary.
 * - Existing layout and brand colours.
 *
 * SAFETY
 * - CMS publication is not enabled here.
 * - No new database operations.
 * - No quotation or email changes.
 * - No production deployment changes.
 */

type CategoryPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

/* ==========================================
   STATIC CATEGORY ROUTES
   ========================================== */

export function generateStaticParams() {
  return productCategories.map((category) => ({
    slug: category.slug,
  }));
}

/* ==========================================
   CATEGORY DATA RESOLUTION
   ========================================== */

async function resolveCategoryPageData(
  slug: string
) {
  if (
    typeof slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 160
  ) {
    return null;
  }

  const publicModeRequested =
    process.env.CATALOGUE_CMS_PUBLIC_ENABLED ===
    "true";

  const developmentPreviewAllowed =
    process.env.NODE_ENV === "development" &&
    !publicModeRequested;

  const snapshot =
    await getPublicCatalogueSnapshot();

  const useCmsCatalogue =
    publicModeRequested && snapshot.cmsEnabled;

  const categories = useCmsCatalogue
    ? snapshot.categories
    : productCategories;

  const category = categories.find(
    (item) => item.slug === slug
  );

  if (!category) {
    return null;
  }

  const localCategoryProducts =
    getProductsByCategory(
      category.slug,
      true
    );

  const categoryProducts: readonly Product[] =
    useCmsCatalogue
      ? snapshot.products.filter(
          (product) =>
            product.categorySlug ===
              category.slug &&
            product.status === "published" &&
            product.isDemo === false
        )
      : localCategoryProducts.filter(
          (product) =>
            developmentPreviewAllowed ||
            (product.status === "published" &&
              product.isDemo === false)
        );

  const categoryNumber =
    categories.findIndex(
      (item) => item.slug === category.slug
    ) + 1;

  const otherCategories = categories
    .filter(
      (item) => item.slug !== category.slug
    )
    .slice(0, 4);

  return {
    category,
    categoryProducts,
    categoryNumber,
    otherCategories,
    publicCatalogueMode:
      !developmentPreviewAllowed,
  };
}

/* ==========================================
   FILE 163 — CATEGORY SEO METADATA

   The primary editorial category page is:

   /categories/[slug]

   This secondary product-listing page is:

   /products/category/[slug]

   Preserve noindex/nofollow.

   Override the inherited /products canonical
   so it points to the matching editorial
   category page instead.

   This does not change the global pre-launch
   search-engine crawling restriction.
   ========================================== */

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;

  const resolved =
    await resolveCategoryPageData(slug);

  if (!resolved) {
    return {
      title: "Category Not Found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const hasEditorialCategoryPage =
    productCategories.some(
      (item) =>
        item.slug === resolved.category.slug
    );

  const canonicalPath = hasEditorialCategoryPage
    ? `/categories/${resolved.category.slug}`
    : `/products/category/${resolved.category.slug}`;

  return {
    title: {
      absolute: `${resolved.category.name} | Bark Ornament`,
    },
    description:
      resolved.category.description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

/* ==========================================
   APPROVED CATEGORY PHOTOGRAPHY

   DEVELOPMENT / CMS DISABLED:
   - Approved photos may be loaded for
     published, non-demo local products.
   - Development preview products never
     receive Sanity photographs.

   PRODUCTION / CMS DISABLED:
   - Do not request Sanity photographs unless
     the independent photo setting is enabled.

   CMS PUBLICATION ENABLED:
   - Load photos for published, non-demo
     products only.

   Existing product publication rules
   remain authoritative.
   ========================================== */

async function loadCategoryProductPhotos(
  categoryProducts: readonly Product[]
): Promise<
  Readonly<Record<string, ApprovedPhoto>>
> {
  const cmsPublicationEnabled =
    process.env.CATALOGUE_CMS_PUBLIC_ENABLED ===
    "true";

  const independentPhotosEnabled =
    process.env.CATALOGUE_SANITY_PHOTOS_ENABLED ===
    "true";

  const localDevelopmentMode =
    process.env.NODE_ENV === "development";

  const photographyAllowed =
    cmsPublicationEnabled ||
    independentPhotosEnabled ||
    localDevelopmentMode;

  if (!photographyAllowed) {
    return {};
  }

  const eligibleProductIds = [
    ...new Set(
      categoryProducts
        .filter(
          (product) =>
            product.status === "published" &&
            product.isDemo === false
        )
        .map((product) => product.id)
    ),
  ];

  if (eligibleProductIds.length === 0) {
    return {};
  }

  try {
    return await getSanityProductMainImages(
      eligibleProductIds
    );
  } catch {
    return {};
  }
}

/* ==========================================
   ORIGINAL PRODUCT IMAGE PLACEHOLDER
   ========================================== */

function ProductPlaceholder({
  label,
}: {
  label: string;
}) {
  return (
    <div className="relative flex min-h-[220px] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#E9DDC9] via-[#F3E8D6] to-[#D8C3A4] p-6 text-center">
      <div
        aria-hidden="true"
        className="absolute -right-12 -top-12 h-44 w-44 rounded-full border border-[#C59A45]/30"
      />

      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#92744A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="2"
        />

        <circle
          cx="8.5"
          cy="8.5"
          r="1.5"
        />

        <path d="m21 15-5-5L5 21" />
      </svg>

      <p className="relative mt-4 mb-0 max-w-xs text-xs font-bold uppercase leading-6 tracking-[0.12em] text-[#725D43]">
        {label}
      </p>

      <p className="relative mt-2 mb-0 text-xs text-[#725D43]">
        Approved photograph coming later
      </p>
    </div>
  );
}

/* ==========================================
   CATEGORY PRODUCT CARD

   PHOTO PRIORITY
   1. Approved Sanity primary image.
   2. Approved local product image.
   3. Original placeholder.

   Preserve product navigation and
   development preview labels.
   ========================================== */

function CategoryProductCard({
  product,
  sanityPhoto,
}: {
  product: Product;
  sanityPhoto: ApprovedPhoto | null;
}) {
  const productEligibleForPhotography =
    product.status === "published" &&
    product.isDemo === false;

  const localPhoto =
    productEligibleForPhotography
      ? getApprovedProductMainImage(
          product.slug
        )
      : null;

  const approvedPhoto =
    productEligibleForPhotography
      ? sanityPhoto ?? localPhoto
      : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#E4D7C4] bg-white text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none">
      {approvedPhoto ? (
        <ApprovedProductImage
          label={product.name}
          photo={approvedPhoto}
          aspect="wide"
          fit="contain"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="min-h-[220px]"
        />
      ) : (
        <ProductPlaceholder
          label={product.name}
        />
      )}

      <div className="flex flex-1 flex-col items-center p-6">
        {product.isDemo && (
          <span className="mb-4 rounded-full border border-[#C59A45] bg-[#FAF7F0] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[#87512C]">
            Development Preview
          </span>
        )}

        <h3 className="font-serif text-2xl leading-snug text-[#30251F]">
          {product.name}
        </h3>

        <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
          {product.shortDescription}
        </p>

        <Link
          href={`/products/${product.slug}`}
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
        >
          View Product Details
          <span aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

/* ==========================================
   CATEGORY DETAIL CONTENT
   ========================================== */

async function CategoryDetailContent({
  params,
}: CategoryPageProps) {
  const { slug } = await params;

  const resolved =
    await resolveCategoryPageData(slug);

  if (!resolved) {
    notFound();
  }

  const {
    category,
    categoryProducts,
    categoryNumber,
    otherCategories,
    publicCatalogueMode,
  } = resolved;

  const approvedProductPhotos =
    await loadCategoryProductPhotos(
      categoryProducts
    );

  return (
    <>
      {/* ====================================
          1. CATEGORY HERO
          ==================================== */}

      <section className="relative overflow-hidden bg-[#30251F] px-5 py-20 text-center text-[#FAF7F0] sm:py-24">
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-32 h-80 w-80 rounded-full border border-[#C59A45]/20"
        />

        <div className="relative mx-auto max-w-4xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Bark Ornament Collection{" "}
            {String(categoryNumber).padStart(
              2,
              "0"
            )}
          </p>

          <h1
            className="font-serif text-4xl leading-tight text-[#FAF7F0] sm:text-5xl lg:text-6xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            {category.name}
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9]">
            {category.description}
          </p>

          <nav
            aria-label="Breadcrumb"
            className="mt-9"
          >
            <ol className="flex flex-wrap items-center justify-center gap-2 text-sm text-[#E9DDC9]">
              <li>
                <Link
                  href="/"
                  className="hover:text-white hover:underline"
                >
                  Home
                </Link>
              </li>

              <li aria-hidden="true">
                /
              </li>

              <li>
                <Link
                  href="/products"
                  className="hover:text-white hover:underline"
                >
                  Products
                </Link>
              </li>

              <li aria-hidden="true">
                /
              </li>

              <li
                aria-current="page"
                className="text-[#E3B65D]"
              >
                {category.name}
              </li>
            </ol>
          </nav>
        </div>
      </section>

      {/* ====================================
          2. CATEGORY INTRODUCTION
          ==================================== */}

      <section className="bg-[#FAF7F0] px-5 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">
            Our Product Collection
          </p>

          <h2 className="font-serif text-3xl text-[#30251F] sm:text-4xl">
            Discover This Collection
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#74675E]">
            Browse product records in our{" "}
            {category.name.toLowerCase()} collection.
            Our catalogue is being prepared with
            verified specifications and photography.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <span className="rounded-full border border-[#D9C8B0] bg-white px-5 py-2 text-sm font-medium text-[#30251F]">
              {categoryProducts.length}{" "}
              {categoryProducts.length === 1
                ? "Product Record"
                : "Product Records"}
            </span>

            <span className="rounded-full border border-[#D9C8B0] bg-white px-5 py-2 text-sm font-medium text-[#30251F]">
              {publicCatalogueMode
                ? "Product Catalogue"
                : "Development Catalogue"}
            </span>
          </div>
        </div>
      </section>

      {/* ====================================
          3. CATEGORY PRODUCT LISTINGS
          ==================================== */}

      <section className="section bg-[#E9DDC9]">
        <div className="container">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="eyebrow">
              Browse Products
            </p>

            <h2 className="font-serif text-3xl text-[#30251F] sm:text-4xl">
              Products in This Collection
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#74675E]">
              Explore individual product pages
              to see descriptions and available
              product information.
            </p>
          </div>

          {categoryProducts.length > 0 ? (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {categoryProducts.map(
                (product) => (
                  <CategoryProductCard
                    key={product.id}
                    product={product}
                    sanityPhoto={
                      approvedProductPhotos[
                        product.id
                      ] ?? null
                    }
                  />
                )
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-2xl rounded-xl border border-[#D9C8B0] bg-white px-6 py-14 text-center">
              <h3 className="font-serif text-2xl text-[#30251F]">
                Products Coming Soon
              </h3>

              <p className="mt-5 text-sm leading-7 text-[#74675E]">
                Product listings for this collection
                have not been published yet.
              </p>

              <Link
                href="/products"
                className="btn btn-primary mt-7"
              >
                Browse All Collections →
              </Link>
            </div>
          )}

          <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-6 text-[#74675E]">
            {publicCatalogueMode
              ? "Please confirm current availability, specifications, lead times and pricing with Bark Ornament before ordering."
              : "Development product records are illustrative only and do not confirm current inventory, specifications, lead times or pricing."}
          </p>
        </div>
      </section>

      {/* ====================================
          4. OTHER PRODUCT CATEGORIES
          ==================================== */}

      <section className="section bg-[#FAF7F0]">
        <div className="container">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="eyebrow">
              Discover More
            </p>

            <h2 className="font-serif text-3xl text-[#30251F] sm:text-4xl">
              Explore Other Collections
            </h2>

            <p className="mt-5 text-base leading-8 text-[#74675E]">
              Browse additional hospitality
              product categories.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {otherCategories.map(
              (item) => (
                <Link
                  key={item.slug}
                  href={`/products/category/${item.slug}`}
                  className="group flex min-h-44 flex-col items-center justify-center rounded-xl border border-[#E4D7C4] bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none"
                >
                  <span
                    aria-hidden="true"
                    className="mb-5 h-1 w-12 rounded-full bg-[#C59A45]"
                  />

                  <h3 className="font-serif text-xl leading-snug text-[#30251F]">
                    {item.name}
                  </h3>

                  <span className="mt-5 text-sm font-bold text-[#B95016]">
                    Explore Category →
                  </span>
                </Link>
              )
            )}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/products"
              className="btn btn-secondary"
            >
              View All Product Categories
              <span aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ====================================
          5. ENQUIRY INFORMATION
          ==================================== */}

      <section className="bg-[#30251F] px-5 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Customized Hospitality Products
          </p>

          <h2
            className="font-serif text-3xl text-[#FAF7F0] sm:text-4xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Need a Customized Product?
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#E9DDC9]">
            Bark Ornament works with hospitality
            product requirements. Our online
            quotation system is under development.
          </p>

          <Link
            href="/products"
            className="btn btn-primary mt-8"
          >
            Continue Browsing Products →
          </Link>
        </div>
      </section>
    </>
  );
}

/* ==========================================
   NEXT.JS 16 INSTANT NAVIGATION

   Preserve the asynchronous child inside
   the existing Suspense boundary.
   ========================================== */

export default function CategoryPage({
  params,
}: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F0] text-[#30251F]">
          <section className="relative overflow-hidden bg-[#30251F] px-5 py-20 text-center text-[#FAF7F0] sm:py-24">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full border border-[#C59A45]/20"
            />

            <div className="relative mx-auto max-w-4xl">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament Collections
              </p>

              <h1
                className="font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl"
                style={{
                  color: "#FAF7F0",
                }}
              >
                Explore Our Product Collections
              </h1>

              <p
                role="status"
                className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9]"
              >
                Loading collection details…
              </p>
            </div>
          </section>
        </div>
      }
    >
      <CategoryDetailContent params={params} />
    </Suspense>
  );
}