
import ApprovedProductImage, {
  type ApprovedPhoto,
} from "@/components/ApprovedProductImage";

import {
  getApprovedProductMainImage,
} from "@/lib/approved-product-images";

import type { Product } from "@/lib/products";

/**
 * BARK ORNAMENT — FILE 152 STEP C
 *
 * Approved Catalogue Image
 *
 * File:
 * src/components/ApprovedCatalogueImage.tsx
 *
 * Theme: Golden Coastal Luxury
 *
 * PURPOSE
 * - Display a product's approved primary photograph.
 * - Accept verified Sanity photography from the server.
 * - Preserve existing local approved photographs.
 * - Show a placeholder when no image is available.
 * - Support catalogue, related and featured cards.
 * - Preserve the existing approved-image component.
 *
 * IMAGE PRIORITY
 * 1. Approved Sanity photograph supplied by the server.
 * 2. Existing locally approved photograph.
 * 3. Original luxury placeholder.
 *
 * SAFETY
 * - No direct Sanity API calls.
 * - No server-only imports.
 * - No product data modifications.
 * - No invented product images.
 * - No database or quotation operations.
 * - No client state or browser effects.
 *
 * The server remains responsible for validating
 * Sanity image URLs, product identity and approval.
 *
 * An approved photograph does not establish
 * that its product is verified inventory.
 */

type CatalogueImageVariant =
  | "card"
  | "related"
  | "featured";

type CatalogueImageProduct = Pick<
  Product,
  "slug" | "name"
>;

export type ApprovedCatalogueImageProps = {
  /**
   * Actual catalogue product.
   * Its slug determines the local image fallback.
   */
  product: CatalogueImageProduct;

  /**
   * Optional verified Sanity primary photograph.
   *
   * Must be obtained and validated by a server
   * component before passing it to the client.
   *
   * When absent, the existing local registry
   * remains authoritative.
   */
  sanityPhoto?: ApprovedPhoto | null;

  /**
   * Controls the intended display context.
   */
  variant?: CatalogueImageVariant;

  /**
   * Optional layout classes.
   * Applied to the outer image container.
   */
  className?: string;

  /**
   * Optional image styling.
   */
  imageClassName?: string;

  /**
   * Optional responsive image sizes.
   */
  sizes?: string;
};

/**
 * Responsive image sizing for each card.
 *
 * The browser receives the correct sizes
 * hint when an approved image is displayed.
 */

const defaultSizes: Record<
  CatalogueImageVariant,
  string
> = {
  card:
    "(max-width: 640px) 100vw, " +
    "(max-width: 1024px) 50vw, 33vw",

  related:
    "(max-width: 640px) 100vw, " +
    "(max-width: 1024px) 50vw, 33vw",

  featured:
    "(max-width: 1024px) 100vw, 50vw",
};

/**
 * Displays the approved image associated
 * with the supplied catalogue product.
 *
 * Approved Sanity photography, when provided,
 * takes precedence over the local image.
 *
 * Local fallback remains unchanged.
 *
 * No network request is performed here.
 */

export default function ApprovedCatalogueImage({
  product,
  sanityPhoto = null,
  variant = "card",
  className = "",
  imageClassName = "",
  sizes,
}: ApprovedCatalogueImageProps) {
  const localPhoto = getApprovedProductMainImage(
    product.slug
  );

  const photo =
    sanityPhoto?.approved === true
      ? sanityPhoto
      : localPhoto;

  const aspect =
    variant === "featured"
      ? "hero"
      : "landscape";

  const minimumHeight =
    variant === "featured"
      ? "min-h-[300px] sm:min-h-[420px]"
      : variant === "related"
        ? "min-h-[150px] sm:min-h-[190px]"
        : "min-h-[200px] sm:min-h-[230px]";

  return (
    <ApprovedProductImage
      label={product.name}
      photo={photo}
      aspect={aspect}
      fit="contain"
      sizes={sizes ?? defaultSizes[variant]}
      className={[
        minimumHeight,
        "border border-[#D9C8B0]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      imageClassName={imageClassName}
    />
  );
}
