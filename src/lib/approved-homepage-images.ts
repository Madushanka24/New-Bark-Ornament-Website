
/**
 * BARK ORNAMENT — FILE 101
 *
 * Approved Homepage Image Registry
 *
 * File:
 * src/lib/approved-homepage-images.ts
 *
 * PURPOSE
 * - Keep homepage image references in one place.
 * - Prevent accidental use of unapproved photography.
 * - Map images to existing homepage sections.
 * - Support gradual addition of verified photographs.
 *
 * IMPORTANT
 * - Every image location is initially null.
 * - No photographs are approved by this file.
 * - No files are created or copied.
 * - No database or API calls.
 * - No quotation submission or email delivery.
 *
 * Approved image assets must be stored under:
 *
 * public/images/approved/
 *
 * Their website URLs must begin with:
 *
 * /images/approved/
 */

import type {
  ApprovedPhoto,
} from "@/components/ApprovedProductImage";

/* ==========================================
   PRODUCT CATEGORY KEYS

   Must match existing homepage categories.
   ========================================== */

export type HomepageCategorySlug =
  | "printing-stationery"
  | "menus-guest-service"
  | "tags-stickers-cards"
  | "bags-packaging"
  | "wooden-products"
  | "cane-natural"
  | "ceramic-pottery-laksha"
  | "candles-party"
  | "gifts-promotional"
  | "laundry-operations";

/* ==========================================
   KNOWLEDGE CARD KEYS

   These identify homepage content cards.

   Only understanding-gsm currently has
   an existing article detail route.

   Other keys do not imply that their
   article pages are published.
   ========================================== */

export type HomepageKnowledgeKey =
  | "paper-types"
  | "understanding-gsm"
  | "sea-vs-air";

/* ==========================================
   IMAGE SLOT

   null:
   - No approved photo configured.
   - Display the shared placeholder.

   ApprovedPhoto:
   - Image supplied and approved.
   - Local file verified separately.
   - Accurate alt text provided.
   ========================================== */

export type HomepageImageSlot =
  | ApprovedPhoto
  | null;

/* ==========================================
   REGISTRY STRUCTURE
   ========================================== */

export type HomepageImageRegistry = Readonly<{
  hero: HomepageImageSlot;

  company: HomepageImageSlot;

  solutions: HomepageImageSlot;

  categories: Readonly<
    Record<
      HomepageCategorySlug,
      HomepageImageSlot
    >
  >;

  knowledge: Readonly<
    Record<
      HomepageKnowledgeKey,
      HomepageImageSlot
    >
  >;
}>;

/* ==========================================
   APPROVED HOMEPAGE IMAGES

   INITIAL STATE:
   No photos configured.

   Keep each slot null until:

   1. The actual photograph is supplied.
   2. The company approves its use.
   3. The file exists in the approved folder.
   4. Accurate alternative text is written.
   5. The photo is assigned to its correct slot.

   Do not use invented filenames or image URLs.
   ========================================== */

export const approvedHomepageImages:
  HomepageImageRegistry = {

  /* ----------------------------------------
     MAIN HOMEPAGE PHOTOGRAPHY
     ---------------------------------------- */

  hero: null,

  company: null,

  solutions: null,

  /* ----------------------------------------
     PRODUCT CATEGORY PHOTOGRAPHY
     ---------------------------------------- */

  categories: {
    "printing-stationery": null,

    "menus-guest-service": null,

    "tags-stickers-cards": null,

    "bags-packaging": null,

    "wooden-products": null,

    "cane-natural": null,

    "ceramic-pottery-laksha": null,

    "candles-party": null,

    "gifts-promotional": null,

    "laundry-operations": null,
  },

  /* ----------------------------------------
     HOMEPAGE KNOWLEDGE CARDS
     ---------------------------------------- */

  knowledge: {
    "paper-types": null,

    "understanding-gsm": null,

    "sea-vs-air": null,
  },
};
