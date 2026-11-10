
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

import ApprovedProductImage from "@/components/ApprovedProductImage";
import type { ApprovedPhoto } from "@/components/ApprovedProductImage";
import { approvedHomepageImages } from "@/lib/approved-homepage-images";
import { getSanityHomepageHero } from "@/lib/sanity-homepage-hero";

/**
 * BARK ORNAMENT — FILE 102
 *
 * Homepage: Golden Coastal Luxury
 *
 * Connects the approved homepage photography registry
 * to all existing ApprovedProductImage components.
 *
 * Image slots:
 * - Hero: 1
 * - Company: 1
 * - Product categories: 10
 * - Hospitality solutions: 1
 * - Knowledge articles: 3
 *
 * Total: 16 image slots.
 *
 * IMPORTANT:
 * - No images are approved or added by this file.
 * - Null registry entries display placeholders.
 * - All seven homepage sections are preserved.
 * - All ten product categories are preserved.
 * - All existing navigation routes are preserved.
 * - Hero text is visible without entrance animations.
 * - Responsive accessibility and reduced motion retained.
 * - No database or API operations.
 * - No quotation submissions or actual email delivery.
 */

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  title: "Customized Hospitality Products",
  description:
    "Discover Bark Ornament's customized hospitality products, including printing, stationery, wooden accessories, packaging, crafts and gifts for hotels and resorts.",
};

/* ==========================================
   PRODUCT CATEGORY DATA
   ========================================== */

const categories = [
  {
    number: "01",
    name: "Printing & Corporate Stationery",
    description:
      "Printed materials and stationery solutions for hospitality businesses.",
    slug: "printing-stationery",
  },
  {
    number: "02",
    name: "Menus & Guest Service Products",
    description:
      "Menu presentation and guest-facing products for hotels and resorts.",
    slug: "menus-guest-service",
  },
  {
    number: "03",
    name: "Tags, Stickers & Cards",
    description:
      "Custom tags, labels, stickers and printed cards.",
    slug: "tags-stickers-cards",
  },
  {
    number: "04",
    name: "Bags & Packaging",
    description:
      "Branded bags and packaging for hospitality applications.",
    slug: "bags-packaging",
  },
  {
    number: "05",
    name: "Wooden Products & Crafts",
    description:
      "Wooden accessories, decorative items and hospitality crafts.",
    slug: "wooden-products",
  },
  {
    number: "06",
    name: "Cane & Natural Products",
    description:
      "Natural-material crafts and accessories for hospitality spaces.",
    slug: "cane-natural",
  },
  {
    number: "07",
    name: "Ceramic, Pottery & Laksha",
    description:
      "Craft-based decorative and functional product collections.",
    slug: "ceramic-pottery-laksha",
  },
  {
    number: "08",
    name: "Candles & Party Products",
    description:
      "Selected decorative products and event accessories.",
    slug: "candles-party",
  },
  {
    number: "09",
    name: "Gifts & Promotional Products",
    description:
      "Customized gifts and branded promotional merchandise.",
    slug: "gifts-promotional",
  },
  {
    number: "10",
    name: "Laundry & Hotel Operations",
    description:
      "Selected operational products and hospitality supplies.",
    slug: "laundry-operations",
  },
] as const;

/* ==========================================
   MARKET DATA
   ========================================== */

const markets = [
  {
    country: "Maldives",
    slug: "maldives",
    description:
      "Customized product solutions for resort and hospitality requirements.",
  },
  {
    country: "Seychelles",
    slug: "seychelles",
    description:
      "Hospitality products for hotel and resort operations.",
  },
  {
    country: "Sri Lanka",
    slug: "sri-lanka",
    description:
      "Locally supported customized hospitality product requirements.",
  },
] as const;

/* ==========================================
   KNOWLEDGE CENTRE DATA

   imageKey must match a File 101 registry key.

   Only GSM currently has a dedicated article
   detail route in this homepage listing.
   ========================================== */

const insights = [
  {
    imageKey: "paper-types",
    title:
      "Understanding Paper Types Used in Hospitality Printing",
    description:
      "Learn about common paper choices and their applications.",
    href: "/insights/knowledge",
    label: "Explore Knowledge Hub",
    status: "Topic preview",
  },
  {
    imageKey: "understanding-gsm",
    title:
      "What Does GSM Mean, and Why Does It Matter for Hospitality Products?",
    description:
      "Understand paper weight and how it influences material selection for hospitality products.",
    href: "/insights/knowledge/understanding-gsm",
    label: "Read GSM Article",
    status: "Knowledge Series · Edition 01",
  },
  {
    imageKey: "sea-vs-air",
    title: "Sea Freight vs Air Freight",
    description:
      "Explore important considerations when planning transportation.",
    href: "/insights/knowledge",
    label: "Explore Knowledge Hub",
    status: "Planned topic",
  },
] as const;

/* ==========================================
   REUSABLE BUTTON STYLES
   ========================================== */

const primaryButton =
  "inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#B95016] px-7 py-3 text-center text-sm font-bold text-white transition-colors duration-200 hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none";

const lightOutlineButton =
  "inline-flex min-h-12 items-center justify-center gap-3 rounded-md border border-[#C59A45] px-7 py-3 text-center text-sm font-bold text-[#FAF7F0] transition-colors duration-200 hover:bg-[#C59A45] hover:text-[#30251F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none";

const textLink =
  "inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#B95016] underline-offset-4 transition-colors duration-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none";

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

/* ==========================================
   REUSABLE SECTION HEADING
   ========================================== */

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div
      className={
        centered
          ? "mx-auto mb-10 max-w-3xl text-center sm:mb-12"
          : "mb-10 max-w-3xl sm:mb-12"
      }
    >
      <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-[#B95016]">
        {eyebrow}
      </p>

      <h2 className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl lg:text-5xl">
        {title}
      </h2>

      {description && (
        <p className="mt-5 text-base leading-8 text-[#74675E]">
          {description}
        </p>
      )}
    </div>
  );
}

/* ==========================================
   HERO PRODUCT VISUAL

   Registry: approvedHomepageImages.hero
   ========================================== */

function HeroVisual({
  photo = approvedHomepageImages.hero,
}: {
  photo?: ApprovedPhoto | null;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[590px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-2xl border border-[#C59A45]/25 sm:-inset-4"
      />

      <ApprovedProductImage
        label="Hospitality Product Collection"
        photo={photo}
        aspect="hero"
        fit="cover"
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="min-h-[320px] sm:min-h-[440px] lg:min-h-[500px]"
      />

      <div className="relative mx-3 -mt-8 max-w-sm rounded-lg border border-[#E9DDC9] bg-[#FAF7F0] px-5 py-4 shadow-xl sm:mx-6 sm:-mt-10 sm:px-6 sm:py-5">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#B95016]">
          Our Focus
        </p>

        <p className="font-serif text-lg leading-snug text-[#30251F] sm:text-xl">
          Customized Hospitality Products
        </p>
      </div>
    </div>
  );
}

/* ==========================================
   FILE 142 — STEP C

   APPROVED SANITY HOMEPAGE HERO
   ========================================== */

/**
 * Reads only approved, published Sanity
 * homepage photography through the
 * existing server-side reader.
 *
 * The local approved-image registry remains
 * the fallback when CMS content is missing.
 */
async function SanityHeroVisual() {
  const sanityHero = await getSanityHomepageHero();

  const heroPhoto: ApprovedPhoto | null =
    sanityHero
      ? {
          src: sanityHero.src as ApprovedPhoto["src"],
          alt: sanityHero.alt,
          approved: true,
        }
      : approvedHomepageImages.hero;

  return <HeroVisual photo={heroPhoto} />;
}

/* ==========================================
   HOMEPAGE
   ========================================== */

export default function HomePage() {
  return (
    <main className="min-w-0 overflow-x-clip bg-[#FAF7F0] text-[#30251F]">
      {/* =====================================
          1. HERO SECTION
          ===================================== */}

      <section
        aria-labelledby="home-hero-title"
        className="relative isolate overflow-hidden bg-[#30251F] text-[#FAF7F0]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full border border-[#C59A45]/20"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full border border-[#C59A45]/10"
        />

        <div className="relative mx-auto grid w-full max-w-[1320px] min-w-0 items-center gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-2 lg:gap-14 lg:py-24 xl:gap-20">
          {/*
            Hero text remains immediately visible.
            No opacity-zero entrance animation.
          */}

          <div className="min-w-0">
            <p className="mb-5 text-xs font-bold uppercase leading-6 tracking-[0.18em] text-[#E3B65D] sm:mb-6 sm:tracking-[0.22em]">
              Bark Ornament (Pvt) Ltd
            </p>

            <h1
              id="home-hero-title"
              className="max-w-2xl break-words font-serif text-[clamp(2.35rem,5vw,4.4rem)] font-normal leading-[1.13] tracking-[-0.025em] text-[#FAF7F0]"
            >
              Thoughtfully Crafted
              <span className="mt-2 block text-[#E3B65D]">
                for Hospitality.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-[#E9DDC9] sm:mt-7 sm:text-lg">
              Customized printing, wooden accessories,
              packaging, crafts and hospitality products
              for hotels and resorts.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href="/products"
                className={primaryButton}
              >
                Explore Our Products
                <Arrow />
              </Link>

              <Link
                href="/request-quotation"
                className={lightOutlineButton}
              >
                Request a Quotation
              </Link>
            </div>

            <p className="mt-9 max-w-lg border-l-2 border-[#C59A45] pl-4 text-sm leading-7 text-[#E9DDC9] sm:mt-12">
              Hospitality product solutions for Maldives,
              Seychelles and Sri Lanka.
            </p>
          </div>

          <div className="min-w-0 pb-2 sm:pb-4">
            <Suspense fallback={<HeroVisual />}>
              <SanityHeroVisual />
            </Suspense>
          </div>
        </div>
      </section>

      {/* =====================================
          2. COMPANY INTRODUCTION

          Registry: approvedHomepageImages.company
          ===================================== */}

      <section
        aria-labelledby="home-about-title"
        className="section bg-[#FAF7F0]"
      >
        <div className="container grid min-w-0 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="min-w-0">
            <ApprovedProductImage
              label="Company and Production Photography"
              photo={approvedHomepageImages.company}
              aspect="landscape"
              fit="cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="min-h-[310px] sm:min-h-[440px]"
            />
          </div>

          <div className="min-w-0">
            <p className="eyebrow">Who We Are</p>

            <h2
              id="home-about-title"
              className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl lg:text-5xl"
            >
              Details That Elevate Hospitality.
            </h2>

            <p className="mt-7 text-base leading-8 text-[#74675E]">
              Bark Ornament (Pvt) Ltd is a Sri Lankan
              supplier of customized products for the
              hospitality industry.
            </p>

            <p className="mt-4 text-base leading-8 text-[#74675E]">
              Our range includes printed materials,
              wooden accessories, packaging, decorative
              crafts, gifts and selected operational
              supplies for hotels and resorts.
            </p>

            <Link
              href="/about"
              className={`${textLink} mt-7 border-b-2 border-[#C59A45]`}
            >
              Discover Bark Ornament
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================
          3. PRODUCT COLLECTIONS

          Registry: approvedHomepageImages.categories
          ===================================== */}

      <section
        aria-labelledby="home-collections-title"
        className="section bg-[#E9DDC9]"
      >
        <div className="container">
          <div id="home-collections-title">
            <SectionHeading
              eyebrow="Our Product Collections"
              title="Explore Hospitality Products"
              description="Discover our main product categories and explore customized solutions for hotel and resort requirements."
              centered
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className="group min-w-0 overflow-hidden rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <ApprovedProductImage
                  label={category.name}
                  photo={
                    approvedHomepageImages.categories[
                      category.slug
                    ]
                  }
                  aspect="wide"
                  fit="cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="min-h-[200px] rounded-b-none sm:min-h-[210px]"
                />

                <div className="p-6">
                  <p className="mb-3 text-xs font-bold tracking-[0.15em] text-[#B95016]">
                    COLLECTION {category.number}
                  </p>

                  <h3 className="font-serif text-xl leading-snug text-[#30251F]">
                    {category.name}
                  </h3>

                  <p className="mt-3 min-h-[52px] text-sm leading-7 text-[#74675E]">
                    {category.description}
                  </p>

                  <span className="mt-5 inline-flex min-h-9 items-center gap-2 text-sm font-bold text-[#B95016]">
                    Explore Collection

                    <span
                      aria-hidden="true"
                      className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className={primaryButton}
            >
              View All Product Categories
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================
          4. CUSTOM HOSPITALITY SOLUTIONS

          Registry: approvedHomepageImages.solutions
          ===================================== */}

      <section
        aria-labelledby="home-solutions-title"
        className="section bg-[#FAF7F0]"
      >
        <div className="container grid min-w-0 items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="min-w-0">
            <p className="eyebrow">
              Customized Hospitality Solutions
            </p>

            <h2
              id="home-solutions-title"
              className="font-serif text-3xl leading-tight text-[#30251F] sm:text-4xl lg:text-5xl"
            >
              Products Tailored to Your Requirements.
            </h2>

            <p className="mt-6 text-base leading-8 text-[#74675E]">
              Every hospitality environment has its own
              functional and brand requirements. Explore
              product options for printing, materials,
              dimensions and finishing.
            </p>

            <ul className="mt-8 space-y-5">
              {[
                "Customized printing and branding",
                "Material and finishing options",
                "Product sizes and specifications",
                "Hospitality-focused product selection",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-4"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E9DDC9] text-sm text-[#B95016]"
                  >
                    ✓
                  </span>

                  <span className="text-sm font-medium leading-7 text-[#30251F]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/hospitality-solutions"
              className={`${primaryButton} mt-9`}
            >
              Explore Our Solutions
              <Arrow />
            </Link>
          </div>

          <div className="min-w-0">
            <ApprovedProductImage
              label="Custom Hospitality Product Photography"
              photo={approvedHomepageImages.solutions}
              aspect="landscape"
              fit="cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="min-h-[330px] sm:min-h-[500px]"
            />
          </div>
        </div>
      </section>

      {/* =====================================
          5. MARKETS
          ===================================== */}

      <section
        aria-labelledby="home-markets-title"
        className="section bg-white"
      >
        <div className="container">
          <div id="home-markets-title">
            <SectionHeading
              eyebrow="Our Markets"
              title="Hospitality Across the Indian Ocean"
              description="Bark Ornament serves hospitality customers in three key markets."
              centered
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {markets.map((market) => (
              <article
                key={market.slug}
                className="flex min-w-0 flex-col rounded-xl border border-[#E4D7C4] bg-[#FAF7F0] p-7 transition-shadow duration-300 hover:shadow-lg motion-reduce:transition-none sm:p-8"
              >
                <div
                  aria-hidden="true"
                  className="mb-7 h-1 w-14 rounded-full bg-[#C59A45]"
                />

                <h3 className="font-serif text-2xl text-[#30251F]">
                  {market.country}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {market.description}
                </p>

                <Link
                  href={`/markets/${market.slug}`}
                  className={`${textLink} mt-5`}
                >
                  Explore {market.country}
                  <Arrow />
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/markets"
              className={textLink}
            >
              View All Markets
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================
          6. KNOWLEDGE CENTRE

          Registry: approvedHomepageImages.knowledge
          ===================================== */}

      <section
        aria-labelledby="home-insights-title"
        className="section bg-[#E9DDC9]"
      >
        <div className="container">
          <div id="home-insights-title">
            <SectionHeading
              eyebrow="Hospitality Knowledge"
              title="Insights for Better Product Decisions"
              description="Explore practical information about hospitality printing, packaging, materials and logistics."
              centered
            />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {insights.map((article, index) => (
              <article
                key={article.imageKey}
                className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-[#FAF7F0] shadow-sm"
              >
                <ApprovedProductImage
                  label={`Knowledge Article ${index + 1}`}
                  photo={
                    approvedHomepageImages.knowledge[
                      article.imageKey
                    ]
                  }
                  aspect="wide"
                  fit="cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="min-h-[190px] rounded-b-none"
                />

                <div className="flex flex-1 flex-col p-7">
                  <p className="mb-3 text-xs font-bold uppercase leading-6 tracking-[0.12em] text-[#B95016]">
                    {article.status}
                  </p>

                  <h3 className="font-serif text-xl leading-snug text-[#30251F]">
                    {article.title}
                  </h3>

                  <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                    {article.description}
                  </p>

                  <Link
                    href={article.href}
                    className={`${textLink} mt-5 self-start`}
                  >
                    {article.label}
                    <Arrow />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/insights/knowledge"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#30251F] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors duration-200 hover:bg-[#49372C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
            >
              Explore Knowledge Hub
              <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================
          7. FINAL ENQUIRY SECTION
          ===================================== */}

      <section
        aria-labelledby="home-enquiry-title"
        className="relative isolate overflow-hidden bg-[#30251F] py-20 text-[#FAF7F0] md:py-28"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border border-[#C59A45]/20"
        />

        <div className="container relative z-10 text-center">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-[#E3B65D]">
            Let&apos;s Work Together
          </p>

          <h2
            id="home-enquiry-title"
            className="mx-auto max-w-3xl font-serif text-3xl leading-tight text-[#FAF7F0] sm:text-4xl lg:text-5xl"
          >
            Have a Hospitality Project in Mind?
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#E9DDC9]">
            Tell us about the products, quantities,
            materials and customization you need.
            Start your enquiry with Bark Ornament.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              href="/request-quotation"
              className={primaryButton}
            >
              Request a Quotation
              <Arrow />
            </Link>

            <Link
              href="/contact"
              className={lightOutlineButton}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
