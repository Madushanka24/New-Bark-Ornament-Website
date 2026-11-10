
import Image from "next/image";

/**
 * BARK ORNAMENT — FILE 142, STEP B2
 *
 * Approved Product Photography
 *
 * File:
 * src/components/ApprovedProductImage.tsx
 *
 * Theme: Golden Coastal Luxury
 *
 * PURPOSE
 * - Display approved local photography
 * - Display approved Sanity CDN photography
 * - Display placeholders when no approved photo exists
 * - Support responsive image optimisation
 * - Maintain predictable image aspect ratios
 * - Avoid layout shifts
 * - Respect reduced-motion preferences
 *
 * SAFETY
 * - No arbitrary remote image hosts
 * - Only local approved paths or the configured Sanity CDN
 * - No client-side JavaScript required
 * - No database or API calls from this component
 * - No quotation submissions
 * - No email delivery
 *
 * IMPORTANT
 * Photos must be reviewed and approved separately.
 * Passing an approval flag is an explicit application
 * declaration, not a substitute for company approval.
 */

export type ApprovedPhoto = Readonly<{
  /**
   * Supported photograph sources:
   *
   * 1. Local asset:
   * /images/approved/filename.webp
   *
   * 2. Sanity CDN asset:
   * https://cdn.sanity.io/images/PROJECT/DATASET/filename.jpg
   *
   * Runtime validation checks both formats.
   */
  src:
    | `/images/approved/${string}`
    | `https://cdn.sanity.io/images/${string}`;

  /**
   * Describe the actual photograph.
   * Do not invent product details.
   */
  alt: string;

  /**
   * Must be explicitly declared for every photo.
   */
  approved: true;
}>;

type ImageAspect =
  | "square"
  | "landscape"
  | "portrait"
  | "wide"
  | "hero";

type ImageFit = "cover" | "contain";

export type ApprovedProductImageProps = {
  /**
   * Human-readable name used for the placeholder.
   */
  label: string;

  /**
   * Omit or pass null until an approved photo exists.
   */
  photo?: ApprovedPhoto | null;

  /**
   * Controls the image container ratio.
   */
  aspect?: ImageAspect;

  /**
   * cover: editorial and lifestyle photography
   * contain: isolated product photography
   */
  fit?: ImageFit;

  /**
   * Controls browser responsive image selection.
   */
  sizes?: string;

  /**
   * Only enable when the image is a confirmed
   * above-the-fold image worth preloading.
   */
  preload?: boolean;

  /**
   * Additional classes applied to the outer wrapper.
   */
  className?: string;

  /**
   * Additional classes applied to the photo itself.
   */
  imageClassName?: string;
};

const aspectClasses: Record<ImageAspect, string> = {
  square: "aspect-square",
  landscape: "aspect-[4/3]",
  portrait: "aspect-[3/4]",
  wide: "aspect-video",
  hero: "aspect-[5/4]",
};

const fitClasses: Record<ImageFit, string> = {
  cover: "object-cover",
  contain: "object-contain",
};

/**
 * Do not accept arbitrary local paths.
 *
 * Local image validation:
 *
 * - Only /images/approved/ assets
 * - No path traversal
 * - No query strings or fragments
 * - No SVG files
 * - Raster images only
 */
function isApprovedLocalPath(
  value: string
): value is `/images/approved/${string}` {
  if (
    !/^\/images\/approved\/[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(?:jpg|jpeg|png|webp|avif)$/i.test(
      value
    )
  ) {
    return false;
  }

  const segments = value.split("/");

  if (
    segments.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        segment === ""
    )
  ) {
    // The first path segment is empty for an
    // absolute local path; check the rest instead.
    return segments
      .slice(1)
      .every(
        (segment) =>
          segment !== "" &&
          segment !== "." &&
          segment !== ".."
      );
  }

  return true;
}

/* ==========================================
   FILE 142 — STEP B2

   SANITY CDN IMAGE VALIDATION
   ========================================== */

function isApprovedSanityImageUrl(
  value: string
): value is `https://cdn.sanity.io/images/${string}` {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();

  const dataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();

  if (
    !projectId ||
    !dataset ||
    !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[a-z0-9_-]+$/.test(dataset)
  ) {
    return false;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.hostname !== "cdn.sanity.io" ||
      url.port !== "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return false;
    }

    const prefix =
      `/images/${projectId}/${dataset}/`;

    if (!url.pathname.startsWith(prefix)) {
      return false;
    }

    const filename =
      url.pathname.slice(prefix.length);

    return /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.(?:jpg|jpeg|png|webp|avif)$/i.test(
      filename
    );
  } catch {
    return false;
  }
}

function PlaceholderArtwork() {
  return (
    <svg
      width="46"
      height="46"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-[#94764B]"
    >
      <rect
        x="6"
        y="8"
        width="36"
        height="32"
        rx="3"
      />

      <circle
        cx="17"
        cy="19"
        r="3.5"
      />

      <path d="M6 34L18 24L26 31L32 25L42 35" />
    </svg>
  );
}

function PhotographPlaceholder({
  label,
}: {
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${label}. Approved photography not yet available.`}
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#E9DDC9] via-[#F3EBDF] to-[#D6C19E] p-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border border-[#C59A45]/30"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full border border-[#C59A45]/20"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-4 rounded-lg border border-white/40 sm:inset-6"
      />

      <div className="relative z-10 flex max-w-xs flex-col items-center gap-4 text-center">
        <PlaceholderArtwork />

        <span className="text-xs font-bold uppercase leading-6 tracking-[0.12em] text-[#725D43]">
          {label}
        </span>

        <span className="text-xs leading-6 text-[#725D43]">
          Approved photography coming later
        </span>
      </div>
    </div>
  );
}

/**
 * The same component supports:
 *
 * 1. Placeholder mode:
 *
 *    <ApprovedProductImage
 *      label="Wooden Products"
 *    />
 *
 * 2. Approved local-photo mode:
 *
 *    Pass a real image from
 *    public/images/approved/
 *    with accurate alt text.
 *
 * 3. Approved Sanity-photo mode:
 *
 *    Pass a validated image URL from the
 *    configured Sanity project and dataset.
 *
 * Important:
 *
 * Only published, company-approved CMS content
 * should be passed by the server-side data reader.
 *
 * No unapproved photos should be added merely
 * to remove the placeholder.
 */

export default function ApprovedProductImage({
  label,
  photo = null,
  aspect = "landscape",
  fit = "cover",
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  preload = false,
  className = "",
  imageClassName = "",
}: ApprovedProductImageProps) {
  const sourceIsValid =
    photo !== null &&
    photo.approved === true &&
    typeof photo.alt === "string" &&
    photo.alt.trim().length > 0 &&
    (
      isApprovedLocalPath(photo.src) ||
      isApprovedSanityImageUrl(photo.src)
    );

  return (
    <div
      className={[
        "relative isolate w-full min-w-0",
        "overflow-hidden rounded-xl",
        "bg-[#F3EBDF]",
        aspectClasses[aspect],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {sourceIsValid && photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          preload={preload}
          className={[
            fitClasses[fit],
            "transition-transform duration-500",
            "motion-reduce:transition-none",
            "motion-reduce:transform-none",
            imageClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        />
      ) : (
        <PhotographPlaceholder label={label} />
      )}
    </div>
  );
}
