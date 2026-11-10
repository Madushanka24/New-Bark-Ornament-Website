
/**
 * BARK ORNAMENT — FILE 106
 *
 * Approved Product Image Registry
 *
 * File:
 * src/lib/approved-product-images.ts
 *
 * Theme:
 * Golden Coastal Luxury
 *
 * PURPOSE
 * - Centralise approved product photography.
 * - Support main and supplementary product images.
 * - Provide safe fallback gallery configurations.
 * - Reuse main photography in related product cards.
 * - Avoid assigning unverified product images.
 *
 * IMPORTANT
 * - No photographs are currently configured.
 * - No product slugs are invented.
 * - No external image URLs are permitted.
 * - Product information is not modified.
 * - No client-side effects are introduced.
 * - No database or API operations.
 * - No quotation submissions or email delivery.
 *
 * Actual approved photographs must be stored under:
 *
 * public/images/approved/
 *
 * And referenced using local paths beginning with:
 *
 * /images/approved/
 *
 * Image approval does not imply that a demo
 * product is verified or available for sale.
 */

import type {
  ApprovedPhoto,
} from "@/components/ApprovedProductImage";

/* ==========================================
   PRODUCT IMAGE GALLERY TYPE
   ========================================== */

/**
 * Each product supports four image locations.
 *
 * main:
 * Primary catalogue and product detail photograph.
 *
 * additional:
 * Secondary product view.
 *
 * material:
 * Material texture or construction detail.
 *
 * finish:
 * Close-up of the product finishing.
 *
 * All four are optional in practice because
 * null is an explicitly supported value.
 */

export type ApprovedProductGallery = Readonly<{
  main: ApprovedPhoto | null;

  additional: ApprovedPhoto | null;

  material: ApprovedPhoto | null;

  finish: ApprovedPhoto | null;
}>;

/* ==========================================
   DEFAULT PRODUCT GALLERY
   ========================================== */

/**
 * The empty gallery is used whenever no
 * approved photography has been assigned.
 *
 * Every slot remains null.
 *
 * The shared ApprovedProductImage component
 * will therefore display its placeholder.
 */

export const EMPTY_APPROVED_PRODUCT_GALLERY:
  ApprovedProductGallery = Object.freeze({

  main: null,

  additional: null,

  material: null,

  finish: null,
});

/* ==========================================
   APPROVED PRODUCT IMAGE REGISTRY
   ========================================== */

/**
 * Product slugs must come from the actual
 * Bark Ornament product catalogue.
 *
 * Do not create fictional products or slugs.
 *
 * When real photographs are supplied:
 *
 * 1. Verify the product record exists.
 * 2. Confirm permission to use the image.
 * 3. Confirm that the photo matches the product.
 * 4. Confirm the physical image file exists.
 * 5. Provide accurate descriptive alt text.
 * 6. Assign it to the correct gallery slot.
 *
 * The ApprovedPhoto type requires:
 *
 * - A local approved-image path
 * - Descriptive alternative text
 * - Explicit approved: true
 *
 * Do not add a gallery entry merely because
 * a product appears in the development catalogue.
 */

/**
 * INITIAL REGISTRY
 *
 * No approved product photography assigned.
 *
 * Future approved product entries will be
 * added inside this registry using existing
 * product slugs.
 */

export const approvedProductImages:
  Readonly<Record<string, ApprovedProductGallery>> =
    Object.freeze({});

/* ==========================================
   PRODUCT GALLERY LOOKUP
   ========================================== */

/**
 * Returns the approved image configuration
 * for the supplied product slug.
 *
 * If no gallery exists:
 * Returns EMPTY_APPROVED_PRODUCT_GALLERY.
 *
 * This function does not create records,
 * modify files or call external services.
 *
 * The caller is responsible for obtaining
 * the product slug from verified catalogue data.
 */

export function getApprovedProductImages(
  productSlug: string
): ApprovedProductGallery {
  if (
    Object.prototype.hasOwnProperty.call(
      approvedProductImages,
      productSlug
    )
  ) {
    return (
      approvedProductImages[productSlug] ??
      EMPTY_APPROVED_PRODUCT_GALLERY
    );
  }

  return EMPTY_APPROVED_PRODUCT_GALLERY;
}

/* ==========================================
   MAIN PRODUCT IMAGE LOOKUP
   ========================================== */

/**
 * Returns the primary image for a product.
 *
 * Intended for:
 * - Catalogue product cards
 * - Related product suggestions
 * - Featured product previews
 *
 * Returns null until an approved primary
 * photograph is configured.
 *
 * Does not determine product publication
 * or inventory verification status.
 */

export function getApprovedProductMainImage(
  productSlug: string
): ApprovedPhoto | null {
  const gallery = getApprovedProductImages(
    productSlug
  );

  return gallery.main;
}

/* ==========================================
   REGISTRY INSPECTION
   ========================================== */

/**
 * Returns product slugs with a gallery
 * configuration explicitly registered.
 *
 * Initially returns an empty array.
 *
 * This is not a list of verified inventory.
 * The catalogue's own product publication
 * rules remain authoritative.
 */

export function getConfiguredProductImageSlugs():
  readonly string[] {
  return Object.keys(
    approvedProductImages
  );
}
