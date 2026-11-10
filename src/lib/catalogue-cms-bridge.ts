
import "server-only";

import {
  getAllCategories,
  getAllProducts,
  products as localProductRegistry,
  type Product,
  type ProductCategory,
} from "@/lib/products";

import {
  getSanityCatalogCategories,
} from "@/lib/sanity-catalog-categories";

import {
  getSanityCatalogProducts,
} from "@/lib/sanity-catalog-products";

/**
 * BARK ORNAMENT — FILE 150 STEP E7K
 *
 * Controlled CMS catalogue bridge.
 *
 * Existing local categories and products
 * remain protected and authoritative.
 *
 * New CMS records are accepted only when:
 * - CMS public integration is enabled
 * - The CMS reader approves their publication
 * - Identifiers do not conflict
 * - Category relationships are valid
 *
 * This file does NOT modify public routes.
 * It does NOT change quotation behavior.
 * It does NOT enable CMS publication.
 */

export type PublicCatalogueSnapshot = Readonly<{
  categories: readonly ProductCategory[];
  products: readonly Product[];
  cmsEnabled: boolean;
  cmsCategoriesAdded: number;
  cmsProductsAdded: number;
}>;

/**
 * The switch is deliberately OFF unless
 * a server-side environment variable
 * explicitly contains "true".
 *
 * Do not create or enable this setting
 * during Step E7K.
 */
function isCmsPublicEnabled(): boolean {
  return (
    process.env.CATALOGUE_CMS_PUBLIC_ENABLED ===
    "true"
  );
}

/**
 * Preserve locally published products
 * while excluding demonstration records
 * from the public catalogue snapshot.
 *
 * The existing website may separately use
 * its development-preview functionality.
 * That behavior is not changed here.
 */
function getLocalSnapshot():
  PublicCatalogueSnapshot {
  const categories = [
    ...getAllCategories(),
  ];

  const products = getAllProducts(false).filter(
    (product) =>
      product.status === "published" &&
      product.isDemo === false
  );

  return {
    categories,
    products,
    cmsEnabled: false,
    cmsCategoriesAdded: 0,
    cmsProductsAdded: 0,
  };
}

/**
 * Convert a validated CMS product to the
 * established local Product interface.
 *
 * Photographs remain in the separate
 * Product Photography collection.
 */
function toLocalProduct(
  product: Awaited<
    ReturnType<typeof getSanityCatalogProducts>
  >[number]
): Product {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categorySlug: product.categorySlug,
    shortDescription: product.shortDescription,
    description: product.description,
    materials: [...product.materials],
    sizes: [...product.sizes],
    finishes: [...product.finishes],
    customizable: product.customizable,
    images: [],
    featured: product.featured,
    status: "published",
    isDemo: false,
  };
}

/**
 * Return a safely merged catalogue.
 *
 * IMPORTANT:
 * - The local category registry wins on
 *   an exact existing ID/slug match.
 * - Conflicting CMS category identities
 *   are skipped.
 * - Existing product IDs and slugs are
 *   reserved, including local draft IDs.
 * - New CMS products require a trusted
 *   approved CMS category.
 *
 * No public page calls this function yet.
 */
export async function getPublicCatalogueSnapshot():
  Promise<PublicCatalogueSnapshot> {
  const local = getLocalSnapshot();

  if (!isCmsPublicEnabled()) {
    return local;
  }

  try {
    const [
      cmsCategories,
      cmsProducts,
    ] = await Promise.all([
      getSanityCatalogCategories(),
      getSanityCatalogProducts(),
    ]);

    const categories: ProductCategory[] = [
      ...local.categories,
    ];

    const products: Product[] = [
      ...local.products,
    ];

    const localCategoryById = new Map(
      local.categories.map(
        (category) => [
          category.id,
          category,
        ]
      )
    );

    const localCategoryBySlug = new Map(
      local.categories.map(
        (category) => [
          category.slug,
          category,
        ]
      )
    );

    const usedCategoryIds = new Set(
      local.categories.map(
        (category) => category.id
      )
    );

    const usedCategorySlugs = new Set(
      local.categories.map(
        (category) => category.slug
      )
    );

    /**
     * Only these CMS category slugs
     * may be used by incoming CMS products.
     */
    const trustedCmsCategorySlugs =
      new Set<string>();

    let cmsCategoriesAdded = 0;

    for (const category of cmsCategories) {
      const existingById =
        localCategoryById.get(category.id);

      const existingBySlug =
        localCategoryBySlug.get(category.slug);

      /**
       * A matching imported category is
       * recognized, but the local description
       * and imagery remain authoritative.
       */
      if (
        existingById &&
        existingBySlug &&
        existingById.slug === category.slug &&
        existingBySlug.id === category.id
      ) {
        trustedCmsCategorySlugs.add(
          category.slug
        );

        continue;
      }

      /**
       * Reject mismatched existing IDs
       * or slugs rather than overriding
       * established website navigation.
       */
      if (
        usedCategoryIds.has(category.id) ||
        usedCategorySlugs.has(category.slug)
      ) {
        continue;
      }

      categories.push({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.cover?.src ?? null,
      });

      usedCategoryIds.add(category.id);
      usedCategorySlugs.add(category.slug);

      trustedCmsCategorySlugs.add(
        category.slug
      );

      cmsCategoriesAdded++;
    }

    /**
     * Reserve EVERY local product identity,
     * including draft/demo records.
     *
     * This prevents a CMS document from
     * unexpectedly replacing an existing
     * local quotation or product identity.
     */
    const usedProductIds = new Set(
      localProductRegistry.map(
        (product) => product.id
      )
    );

    const usedProductSlugs = new Set(
      localProductRegistry.map(
        (product) => product.slug
      )
    );

    let cmsProductsAdded = 0;

    for (const product of cmsProducts) {
      if (
        product.status !== "published" ||
        product.isDemo !== false
      ) {
        continue;
      }

      if (
        !trustedCmsCategorySlugs.has(
          product.categorySlug
        )
      ) {
        continue;
      }

      if (
        usedProductIds.has(product.id) ||
        usedProductSlugs.has(product.slug)
      ) {
        continue;
      }

      const normalized =
        toLocalProduct(product);

      products.push(normalized);

      usedProductIds.add(normalized.id);
      usedProductSlugs.add(
        normalized.slug
      );

      cmsProductsAdded++;
    }

    return {
      categories,
      products,
      cmsEnabled: true,
      cmsCategoriesAdded,
      cmsProductsAdded,
    };
  } catch {
    /**
     * Unexpected CMS failure:
     * preserve the working local catalogue.
     */
    return local;
  }
}
