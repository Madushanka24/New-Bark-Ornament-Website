
"use client";

import ApprovedProductImage, {
  type ApprovedPhoto,
} from "@/components/ApprovedProductImage";

import {
  approvedHomepageImages,
} from "@/lib/approved-homepage-images";

import ApprovedCatalogueImage from "@/components/ApprovedCatalogueImage";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import type {
  Product,
  ProductCategory,
  ProductSort,
} from "@/lib/products";

/* ==========================================
   BARK ORNAMENT - PRODUCT CATALOGUE
   File: src/app/products/CatalogueClient.tsx
   Theme: Golden Coastal Luxury

   FILE 155 - STEP F27

   - Restore File 152 cataloguePhotos contract.
   - Preserve approved Sanity photography.
   - Preserve local approved-image fallbacks.
   - Support multi-word product searching.
   - Preserve category filtering and sorting.
   - Preserve public product safeguards.
   - Preserve development preview behavior.
   - Preserve product and category navigation.
   - Preserve existing Golden Coastal design.

   No CMS publication, quotation submission
   or automatic email functionality is enabled.
   ========================================== */

/* ==========================================
   SERVER DATA CONTRACT

   The server supplies:
   - Validated products
   - Validated categories
   - Current catalogue mode
   - Optional approved photography

   The photography mapping uses stable
   product IDs rather than URL slugs.
   ========================================== */

export type CatalogueClientProps = {
  catalogueProducts: readonly Product[];
  catalogueCategories: readonly ProductCategory[];
  catalogueMode: "development" | "public";
  cataloguePhotos?: Readonly<
    Record<string, ApprovedPhoto>
  >;
};

const EMPTY_PRODUCTS: readonly Product[] = [];

const EMPTY_CATEGORIES:
  readonly ProductCategory[] = [];

const EMPTY_PHOTOS: Readonly<
  Record<string, ApprovedPhoto>
> = {};

/* ==========================================
   CATEGORY VALIDATION
   ========================================== */

function validCategory(
  value: string | null,
  categories: readonly ProductCategory[]
): string {
  if (
    value &&
    categories.some(
      (item) => item.slug === value
    )
  ) {
    return value;
  }

  return "all";
}

/* ==========================================
   FILE 155 - MULTI-WORD SEARCH

   Search: "menu folder"

   Product:
   "Customized Hotel Menu Folder"

   Both terms must match but need not
   appear next to each other.

   Preserves case-insensitive matching.
   ========================================== */

function matchesSearchTerms(
  searchableText: string,
  search: string
): boolean {
  const terms = search
    .trim()
    .toLocaleLowerCase("en")
    .split(/\s+/)
    .filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const normalizedText =
    searchableText.toLocaleLowerCase("en");

  return terms.every(
    (term) => normalizedText.includes(term)
  );
}

/* ==========================================
   PRODUCT PHOTO PLACEHOLDER

   Preserved from the existing catalogue.
   ========================================== */

function PhotoPlaceholder({
  label,
}: {
  label: string;
}) {
  return (
    <div className="relative flex min-h-[210px] w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#E9DDC9] via-[#F3E9D8] to-[#D7C2A0] p-6 text-center">
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
   CATEGORY CARD

   Preserves:
   - Category photography
   - Category detail links
   - Filter button
   - Selected state
   - Existing styling and transitions
   ========================================== */

function CategoryCard({
  category,
  selected,
  onFilter,
}: {
  category: ProductCategory;
  selected: boolean;
  onFilter: (slug: string) => void;
}) {
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-xl border bg-white text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:transform-none ${
        selected
          ? "border-[#B95016] ring-2 ring-[#B95016]/20"
          : "border-[#E4D7C4]"
      }`}
    >
      <ApprovedProductImage
        label={category.name}
        photo={
          Object.prototype.hasOwnProperty.call(
            approvedHomepageImages.categories,
            category.slug
          )
            ? approvedHomepageImages.categories[
                category.slug as keyof typeof approvedHomepageImages.categories
              ]
            : null
        }
        aspect="wide"
        fit="cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="min-h-[200px] sm:min-h-[220px]"
      />

      <div className="flex flex-1 flex-col items-center p-6">
        <h3 className="font-serif text-xl leading-snug text-[#30251F]">
          {category.name}
        </h3>

        <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
          {category.description}
        </p>

        <div className="mt-6 flex w-full flex-wrap justify-center gap-3">
          <Link
            href={`/products/category/${category.slug}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#B95016] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#963E10]"
          >
            View Category Page
            <span aria-hidden="true">
              →
            </span>
          </Link>

          <button
            type="button"
            onClick={() =>
              onFilter(category.slug)
            }
            aria-pressed={selected}
            className={`inline-flex min-h-11 items-center justify-center rounded-md border px-5 py-3 text-sm font-bold transition-colors ${
              selected
                ? "border-[#B95016] bg-[#E9DDC9] text-[#963E10]"
                : "border-[#C59A45] bg-transparent text-[#30251F] hover:bg-[#E9DDC9]"
            }`}
          >
            {selected
              ? "Filter Active ✓"
              : "Filter Products"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ==========================================
   PRODUCT CARD

   FILE 155 / FILE 152 COMPATIBILITY

   The server may provide one approved
   Sanity primary photo per product ID.

   If an approved photo is available:
   render it through ApprovedProductImage.

   Otherwise:
   preserve ApprovedCatalogueImage,
   including its existing local image
   lookup and placeholder behavior.

   No browser-side Sanity requests.
   ========================================== */

function ProductCard({
  product,
  categories,
  photo,
}: {
  product: Product;
  categories: readonly ProductCategory[];
  photo: ApprovedPhoto | null;
}) {
  const category = categories.find(
    (item) =>
      item.slug === product.categorySlug
  );

  const eligiblePhoto =
    product.status === "published" &&
    product.isDemo === false
      ? photo
      : null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E4D7C4] bg-white text-center shadow-sm transition-shadow duration-300 hover:shadow-lg">
      {eligiblePhoto ? (
        <ApprovedProductImage
          label={product.name}
          photo={eligiblePhoto}
          aspect="wide"
          fit="contain"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="min-h-[210px] sm:min-h-[220px]"
        />
      ) : (
        <ApprovedCatalogueImage
          product={product}
          variant="card"
        />
      )}

      <div className="flex flex-1 flex-col items-center p-6">
        {product.isDemo && (
          <span className="mb-4 rounded-full border border-[#C59A45] bg-[#FAF7F0] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-[#87512C]">
            Development Preview
          </span>
        )}

        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#B95016]">
          {category?.name ??
            "Hospitality Products"}
        </p>

        <h3 className="mt-4 font-serif text-xl leading-snug text-[#30251F]">
          {product.name}
        </h3>

        <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
          {product.shortDescription}
        </p>

        {product.isDemo && (
          <p className="mt-4 text-xs text-[#74675E]">
            Example record — specifications not verified
          </p>
        )}

        <Link
          href={`/products/${product.slug}`}
          className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#B95016] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#963E10]"
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
   MAIN CATALOGUE CLIENT

   - All product data supplied by server.
   - All category data supplied by server.
   - Photography supplied by server.
   - No local product registry import.
   - No server-only Sanity reader import.
   - Public mode excludes draft/demo.
   - Development mode retains previews.
   ========================================== */

export default function CatalogueClient({
  catalogueProducts,
  catalogueCategories,
  catalogueMode,
  cataloguePhotos,
}: CatalogueClientProps) {
  const publicCatalogue =
    catalogueMode !== "development";

  const activeProducts =
    catalogueProducts ?? EMPTY_PRODUCTS;

  const activeCategories =
    catalogueCategories ?? EMPTY_CATEGORIES;

  const activePhotos =
    cataloguePhotos ?? EMPTY_PHOTOS;

  /* ========================================
     CATEGORY DROPDOWN OPTIONS
     ======================================== */

  const categoryOptions = useMemo(
    () => [
      {
        label: "All Categories",
        value: "all",
      },
      ...activeCategories.map((item) => ({
        label: item.name,
        value: item.slug,
      })),
    ],
    [activeCategories]
  );

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("all");

  const [sort, setSort] =
    useState<ProductSort>("name-asc");

  const [showPreviews, setShowPreviews] =
    useState(true);

  /* ========================================
     READ CATEGORY FROM URL

     Preserve browser Back/Forward behavior
     and synchronization with the active
     server-provided category list.
     ======================================== */

  useEffect(() => {
    function syncCategoryFromURL() {
      const params = new URLSearchParams(
        window.location.search
      );

      setCategory(
        validCategory(
          params.get("category"),
          activeCategories
        )
      );
    }

    syncCategoryFromURL();

    window.addEventListener(
      "popstate",
      syncCategoryFromURL
    );

    return () => {
      window.removeEventListener(
        "popstate",
        syncCategoryFromURL
      );
    };
  }, [activeCategories]);

  /* ========================================
     CATEGORY FILTER AND URL
     ======================================== */

  function selectCategory(slug: string) {
    const nextCategory = validCategory(
      slug,
      activeCategories
    );

    setCategory(nextCategory);

    const url = new URL(
      window.location.href
    );

    if (nextCategory === "all") {
      url.searchParams.delete(
        "category"
      );
    } else {
      url.searchParams.set(
        "category",
        nextCategory
      );
    }

    window.history.replaceState(
      window.history.state,
      "",
      url.pathname +
        url.search +
        url.hash
    );
  }

  function resetFilters() {
    setSearch("");
    setSort("name-asc");
    selectCategory("all");
  }

  function filterFromCard(
    slug: string
  ) {
    selectCategory(slug);

    document
      .getElementById(
        "product-results"
      )
      ?.scrollIntoView({
        behavior: window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
          ? "auto"
          : "smooth",
      });
  }

  /* ========================================
     FILTER AND SORT PRODUCTS

     File 155:
     Multi-word search is supported.

     Search and category filtering remain
     combined.

     Publication eligibility does not
     depend on search or photo availability.
     ======================================== */

  const filteredProducts = useMemo(() => {
    const source = activeProducts.filter(
      (product) =>
        !publicCatalogue && showPreviews
          ? true
          : product.status === "published" &&
            product.isDemo === false
    );

    const matches = source.filter(
      (product) => {
        const productCategory =
          activeCategories.find(
            (item) =>
              item.slug ===
              product.categorySlug
          );

        const matchesCategory =
          category === "all" ||
          product.categorySlug === category;

        const searchableText = [
          product.name,
          product.shortDescription,
          product.description,
          productCategory?.name ?? "",
          ...product.materials,
          ...product.sizes,
          ...product.finishes,
        ].join(" ");

        return (
          matchesCategory &&
          matchesSearchTerms(
            searchableText,
            search
          )
        );
      }
    );

    return [...matches].sort(
      (a, b) => {
        if (sort === "name-desc") {
          return b.name.localeCompare(
            a.name
          );
        }

        return a.name.localeCompare(
          b.name
        );
      }
    );
  }, [
    search,
    category,
    sort,
    showPreviews,
    publicCatalogue,
    activeProducts,
    activeCategories,
  ]);

  /* ========================================
     CATEGORY CARD SEARCH

     A category remains visible when:
     - Its name/description matches; or
     - An eligible product in it matches.

     This ensures that "menu folder"
     can also reveal the menu category.
     ======================================== */

  const visibleCategories = useMemo(() => {
    if (search.trim() === "") {
      return activeCategories;
    }

    return activeCategories.filter(
      (item) => {
        const categoryText = [
          item.name,
          item.description,
        ].join(" ");

        if (
          matchesSearchTerms(
            categoryText,
            search
          )
        ) {
          return true;
        }

        return activeProducts.some(
          (product) => {
            const productEligible =
              !publicCatalogue &&
              showPreviews
                ? true
                : product.status ===
                    "published" &&
                  product.isDemo === false;

            if (
              !productEligible ||
              product.categorySlug !==
                item.slug
            ) {
              return false;
            }

            const searchableText = [
              product.name,
              product.shortDescription,
              product.description,
              item.name,
              ...product.materials,
              ...product.sizes,
              ...product.finishes,
            ].join(" ");

            return matchesSearchTerms(
              searchableText,
              search
            );
          }
        );
      }
    );
  }, [
    search,
    activeCategories,
    activeProducts,
    publicCatalogue,
    showPreviews,
  ]);

  const selectedCategory =
    activeCategories.find(
      (item) =>
        item.slug === category
    );

  const hasFilters =
    search.trim() !== "" ||
    category !== "all" ||
    sort !== "name-asc";

  return (
    <>
      {/* ====================================
          1. PAGE HERO
          ==================================== */}

      <section className="relative overflow-hidden bg-[#30251F] px-5 py-20 text-center text-[#FAF7F0] sm:py-24">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#C59A45]/20"
        />

        <div className="relative mx-auto max-w-3xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Bark Ornament Product Collections
          </p>

          <h1
            className="font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Explore Our Products
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#E9DDC9]">
            Explore hospitality product collections,
            including printing, menus, wooden accessories,
            packaging, natural crafts and gifts.
          </p>

          <nav
            aria-label="Breadcrumb"
            className="mt-8 flex justify-center gap-2 text-sm text-[#E9DDC9]"
          >
            <Link
              href="/"
              className="hover:underline"
            >
              Home
            </Link>

            <span aria-hidden="true">
              /
            </span>

            <span aria-current="page">
              Products
            </span>
          </nav>
        </div>
      </section>

      {/* ====================================
          2. SEARCH AND FILTERS
          ==================================== */}

      <section className="border-b border-[#E4D7C4] bg-[#FAF7F0] px-5 py-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 text-center">
            <p className="eyebrow">
              Catalogue Search
            </p>

            <h2 className="font-serif text-3xl text-[#30251F]">
              Find a Product
            </h2>
          </div>

          <div className="grid items-end gap-5 md:grid-cols-3">
            <div>
              <label
                htmlFor="product-search"
                className="mb-2 block text-sm font-bold text-[#30251F]"
              >
                Search Products
              </label>

              <input
                id="product-search"
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search products or materials..."
                className="h-12 w-full rounded-md border border-[#D9C8B0] bg-white px-4 text-sm text-[#30251F] focus:border-[#B95016] focus:outline-none focus:ring-2 focus:ring-[#B95016]/20"
              />
            </div>

            <div>
              <label
                htmlFor="category-filter"
                className="mb-2 block text-sm font-bold text-[#30251F]"
              >
                Product Category
              </label>

              <select
                id="category-filter"
                value={category}
                onChange={(event) =>
                  selectCategory(
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-md border border-[#D9C8B0] bg-white px-3 text-sm text-[#30251F] focus:border-[#B95016] focus:outline-none focus:ring-2 focus:ring-[#B95016]/20"
              >
                {categoryOptions.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="product-sort"
                className="mb-2 block text-sm font-bold text-[#30251F]"
              >
                Sort Products
              </label>

              <select
                id="product-sort"
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target.value as ProductSort
                  )
                }
                className="h-12 w-full rounded-md border border-[#D9C8B0] bg-white px-3 text-sm text-[#30251F] focus:border-[#B95016] focus:outline-none focus:ring-2 focus:ring-[#B95016]/20"
              >
                <option value="name-asc">
                  Name: A to Z
                </option>

                <option value="name-desc">
                  Name: Z to A
                </option>
              </select>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-5">
            {!publicCatalogue && (
              <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-[#30251F]">
                <input
                  type="checkbox"
                  checked={showPreviews}
                  onChange={(event) =>
                    setShowPreviews(
                      event.target.checked
                    )
                  }
                  className="h-5 w-5 accent-[#B95016]"
                />

                Show development product previews
              </label>
            )}

            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              className="inline-flex min-h-11 items-center rounded-md border border-[#C59A45] px-5 py-2 text-sm font-bold text-[#B95016] transition-colors hover:bg-[#E9DDC9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear Filters
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-[#74675E]">
            {publicCatalogue
              ? "Please confirm product availability and specifications with our team."
              : "Product data and specifications are being verified during website development."}
          </p>
        </div>
      </section>

      {/* ====================================
          3. CATEGORY COLLECTIONS
          ==================================== */}

      <section className="section bg-[#E9DDC9]">
        <div className="container">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="eyebrow">
              Browse Our Collections
            </p>

            <h2 className="font-serif text-3xl text-[#30251F] sm:text-4xl">
              Product Categories
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#74675E]">
              Explore a complete category page or
              filter matching products in this catalogue.
            </p>
          </div>

          {visibleCategories.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCategories.map(
                (item) => (
                  <CategoryCard
                    key={item.slug}
                    category={item}
                    selected={
                      category === item.slug
                    }
                    onFilter={
                      filterFromCard
                    }
                  />
                )
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-10 text-center">
              <p className="mb-0 text-[#74675E]">
                No category names match your search.
              </p>
            </div>
          )}

          {category !== "all" && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() =>
                  selectCategory("all")
                }
                className="btn btn-secondary"
              >
                View All Categories
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ====================================
          4. PRODUCT RESULTS
          ==================================== */}

      <section
        id="product-results"
        className="section scroll-mt-28 bg-[#FAF7F0]"
      >
        <div className="container">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="eyebrow">
              Product Catalogue
            </p>

            <h2 className="font-serif text-3xl text-[#30251F] sm:text-4xl">
              {selectedCategory
                ? selectedCategory.name
                : "Explore Product Listings"}
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#74675E]">
              {publicCatalogue
                ? "Browse available product listings and open individual product detail pages."
                : "View our developing product records and open individual product detail pages."}
            </p>

            {selectedCategory && (
              <Link
                href={`/products/category/${selectedCategory.slug}`}
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#B95016] hover:underline"
              >
                Open Complete Category Page
                <span aria-hidden="true">
                  →
                </span>
              </Link>
            )}
          </div>

          <p
            role="status"
            aria-live="polite"
            className="mb-8 text-center text-sm font-semibold text-[#74675E]"
          >
            Showing {filteredProducts.length}{" "}
            {filteredProducts.length === 1
              ? "product"
              : "products"}
          </p>

          {filteredProducts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map(
                (product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    categories={
                      activeCategories
                    }
                    photo={
                      activePhotos[
                        product.id
                      ] ?? null
                    }
                  />
                )
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-xl rounded-xl border border-[#E4D7C4] bg-white px-6 py-12 text-center">
              <h3 className="font-serif text-2xl text-[#30251F]">
                No Products Found
              </h3>

              <p className="mt-4 text-sm leading-7 text-[#74675E]">
                {publicCatalogue
                  ? "No published products match this search or category. Try another keyword or category."
                  : "There are no matching records. Try another category or keyword. Approved public products have not been published yet."}
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="btn btn-primary mt-7"
              >
                Reset Filters
              </button>

              {!publicCatalogue &&
                !showPreviews && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowPreviews(true)
                    }
                    className="btn btn-secondary mt-4 ml-2"
                  >
                    Show Development Previews
                  </button>
                )}
            </div>
          )}

          {!publicCatalogue &&
            showPreviews && (
              <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-6 text-[#74675E]">
                Development previews are illustrative.
                They do not confirm product availability,
                specifications, stock, prices or lead times.
              </p>
            )}
        </div>
      </section>

      {/* ====================================
          Shared footer quotation CTA
          is preserved outside this component.
          ==================================== */}
    </>
  );
}
