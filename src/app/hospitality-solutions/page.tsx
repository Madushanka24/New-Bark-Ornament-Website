
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hospitality Solutions | Bark Ornament",
  description:
    "Explore customised hospitality product solutions for hotel and resort front office, food and beverage, housekeeping, marketing, events and spa operations.",
};

/**
 * BARK ORNAMENT — FILE 90
 *
 * Hospitality Solutions Landing Page
 *
 * Route:
 * /hospitality-solutions
 *
 * Matches the existing navigation destination used in:
 * src/components/Header.tsx
 * src/components/Footer.tsx
 *
 * UI FIX 09:
 * Corrected dark-background heading visibility
 * in the hero and final CTA sections.
 *
 * No forms, API calls, database operations,
 * quotation submissions or automated emails.
 */

const solutions = [
  {
    id: "front-office",
    number: "01",
    eyebrow: "GUEST ARRIVAL & COMMUNICATION",
    title: "Front Office & Guest Services",
    description:
      "Thoughtful printed and customised products for guest arrival, communication and presentation throughout the stay.",
    examples: [
      "Welcome folders and printed guest information",
      "Key card holders, luggage tags and identification items",
      "Branded stationery and guest-facing accessories",
    ],
    productLinks: [
      {
        label: "Menus & Guest Service",
        href: "/categories/menus-guest-service",
      },
      {
        label: "Tags, Stickers & Cards",
        href: "/categories/tags-stickers-cards",
      },
      {
        label: "Printing & Stationery",
        href: "/categories/printing-stationery",
      },
    ],
    guidance:
      "Prepare the branding artwork, quantities, format and intended guest experience.",
  },
  {
    id: "food-beverage",
    number: "02",
    eyebrow: "DINING & SERVICE PRESENTATION",
    title: "Hotel & Resort Food and Beverage",
    description:
      "Customised presentation materials and packaging suited to hotel and resort dining operations.",
    examples: [
      "Printed menus, menu covers and table collateral",
      "Branded food packaging and sugar sachets",
      "Selected wooden presentation accessories",
    ],
    productLinks: [
      {
        label: "Menus & Guest Service",
        href: "/categories/menus-guest-service",
      },
      {
        label: "Bags & Packaging",
        href: "/categories/bags-packaging",
      },
      {
        label: "Wooden Products",
        href: "/categories/wooden-products",
      },
    ],
    guidance:
      "Confirm the intended use, contact requirements, material specifications and branding details before production.",
  },
  {
    id: "housekeeping",
    number: "03",
    eyebrow: "IN-ROOM & OPERATIONAL DETAILS",
    title: "Housekeeping & Guest Rooms",
    description:
      "Practical materials and branded accessories that support guest-room presentation and daily hotel operations.",
    examples: [
      "Laundry bags and guest-room printed collateral",
      "Amenities and presentation packaging",
      "Information cards, tags and selected room accessories",
    ],
    productLinks: [
      {
        label: "Laundry & Operations",
        href: "/categories/laundry-operations",
      },
      {
        label: "Bags & Packaging",
        href: "/categories/bags-packaging",
      },
      {
        label: "Printing & Stationery",
        href: "/categories/printing-stationery",
      },
    ],
    guidance:
      "Define handling needs, product dimensions, quantities and housekeeping procedures.",
  },
  {
    id: "marketing-events",
    number: "04",
    eyebrow: "BRAND EXPRESSION & OCCASIONS",
    title: "Marketing, Events & Corporate Gifting",
    description:
      "Customised products that help present a hospitality brand consistently across events, campaigns and guest gifting.",
    examples: [
      "Marketing and promotional printed materials",
      "Branded gifts, event items and presentation packaging",
      "Decorative and seasonal guest-presentation products",
    ],
    productLinks: [
      {
        label: "Gifts & Promotional Products",
        href: "/categories/gifts-promotional",
      },
      {
        label: "Printing & Stationery",
        href: "/categories/printing-stationery",
      },
      {
        label: "Candles & Party Supplies",
        href: "/categories/candles-party",
      },
    ],
    guidance:
      "Share the brand guidelines, occasion, recipient requirements, target quantities and approval schedule.",
  },
  {
    id: "spa-wellness",
    number: "05",
    eyebrow: "CALM & CONSIDERED PRESENTATION",
    title: "Spa & Wellness",
    description:
      "Natural-material accessories, printed pieces and decorative products for considered wellness presentation.",
    examples: [
      "Wooden and cane accessories",
      "Spa presentation folders and guest information",
      "Decorative candles and selected handcrafted items",
    ],
    productLinks: [
      {
        label: "Wooden Products",
        href: "/categories/wooden-products",
      },
      {
        label: "Cane & Natural Products",
        href: "/categories/cane-natural",
      },
      {
        label: "Candles & Party Supplies",
        href: "/categories/candles-party",
      },
      {
        label: "Ceramic, Pottery & Laksha",
        href: "/categories/ceramic-pottery-laksha",
      },
    ],
    guidance:
      "Clarify the desired visual style, materials, product dimensions and intended placement.",
  },
] as const;

const workingApproach = [
  {
    number: "01",
    title: "Share the Requirement",
    description:
      "Identify the department, intended use, approximate quantity, preferred dimensions and branding requirements.",
  },
  {
    number: "02",
    title: "Review Product Options",
    description:
      "Consider appropriate product families, materials, finishes and relevant samples where available.",
  },
  {
    number: "03",
    title: "Confirm Specifications",
    description:
      "Discuss artwork, production requirements and practical delivery considerations before final approval.",
  },
] as const;

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <span aria-hidden="true">
      {down ? "↓" : "→"}
    </span>
  );
}

/**
 * Decorative, CSS/SVG-only editorial illustration.
 * Not presented as actual Bark Ornament photography.
 */

function SolutionsArtwork() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/40 bg-[#49372C] p-7 shadow-2xl"
    >
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#E3B65D]/35 px-5 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
          Bark Ornament
        </span>

        <svg
          viewBox="0 0 120 120"
          width="112"
          height="112"
          fill="none"
          className="mt-8 text-[#E3B65D]"
        >
          <rect
            x="17"
            y="29"
            width="48"
            height="64"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.7"
          />

          <path
            d="M28 44H54M28 56H54M28 68H47"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          <path
            d="M75 20L104 36V76L75 92L46 76V36L75 20Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />

          <path
            d="M46 36L75 53L104 36M75 53V92"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>

        <span className="mt-8 font-serif text-3xl text-[#E3B65D]">
          Thoughtful Solutions
        </span>

        <span className="mt-5 max-w-56 text-sm leading-7 text-[#E9DDC9]">
          Products selected around the needs of hospitality.
        </span>
      </div>
    </div>
  );
}

export default function HospitalitySolutionsPage() {
  return (
    <main className="bg-[#FAF7F0] text-[#30251F]">

      {/* =====================================
          1. HERO
          ===================================== */}

      <section
        aria-labelledby="solutions-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20 lg:py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-48 h-[520px] w-[520px] rounded-full border border-[#C59A45]/20"
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

              <li aria-hidden="true" className="text-[#E3B65D]">
                /
              </li>

              <li aria-current="page" className="text-white">
                Hospitality Solutions
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament · Hospitality Solutions
              </p>

              {/* UI FIX 09 — TOP HERO HEADING */}

              <h1
                id="solutions-title"
                className="mt-6 max-w-4xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
                style={{
                  color: "#FAF7F0",
                }}
              >
                Designed Around the Way

                <span
                  className="mt-2 block"
                  style={{
                    color: "#E3B65D",
                  }}
                >
                  Hospitality Works.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                Explore customised printing, packaging,
                crafts and guest-presentation products
                through the needs of your hotel or resort.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8C8B5]">
                From the front office to housekeeping,
                food and beverage, marketing and wellness,
                find product families relevant to each
                department&apos;s requirements.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#solution-areas"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Explore Solutions
                  <Arrow down />
                </a>

                <Link
                  href="/products"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Browse Products
                  <Arrow />
                </Link>
              </div>
            </div>

            <SolutionsArtwork />
          </div>
        </div>
      </section>

      {/* =====================================
          2. SOLUTION AREA NAVIGATION
          ===================================== */}

      <section
        id="solution-areas"
        aria-labelledby="solution-areas-title"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Explore by Department
          </p>

          <h2
            id="solution-areas-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Solutions for Hospitality Operations
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Browse by operational function rather than
            searching through individual product categories.
            Each area connects to relevant products.
          </p>

          <nav
            aria-label="Hospitality solution areas"
            className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {solutions.map((solution) => (
              <a
                key={solution.id}
                href={`#${solution.id}`}
                className="group flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-white p-7 shadow-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[#C59A45] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {solution.number}
                </span>

                <span className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  {solution.eyebrow}
                </span>

                <h3 className="mt-3 font-serif text-2xl leading-snug text-[#30251F]">
                  {solution.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {solution.description}
                </p>

                <span
                  aria-hidden="true"
                  className="mt-6 border-t border-[#E8DCCB] pt-5 text-sm font-bold text-[#A94C19]"
                >
                  Explore this solution
                  <span className="ml-2">↓</span>
                </span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* =====================================
          3. DEPARTMENT-SPECIFIC SOLUTIONS
          ===================================== */}

      {solutions.map((solution, index) => (
        <section
          key={solution.id}
          id={solution.id}
          aria-labelledby={`${solution.id}-title`}
          className={`scroll-mt-20 border-t border-[#E0D2BF] px-5 py-16 sm:px-8 sm:py-20 ${
            index % 2 === 0
              ? "bg-[#F3EBDF]"
              : "bg-[#FAF7F0]"
          }`}
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
                Solution {solution.number}
              </p>

              <h2
                id={`${solution.id}-title`}
                className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
              >
                {solution.title}
              </h2>

              <p className="mt-6 text-base leading-8 text-[#66584F]">
                {solution.description}
              </p>

              <div className="mt-8 border-l-2 border-[#C59A45] pl-5">
                <h3 className="text-sm font-bold text-[#5B402B]">
                  Planning Consideration
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#74675E]">
                  {solution.guidance}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border border-[#D9C8B0] bg-white p-7 sm:p-8">
                <h3 className="font-serif text-2xl text-[#30251F]">
                  Typical Product Requirements
                </h3>

                <ul className="mt-5 space-y-4">
                  {solution.examples.map((example) => (
                    <li
                      key={example}
                      className="flex items-start gap-3 text-sm leading-7 text-[#66584F]"
                    >
                      <span
                        aria-hidden="true"
                        className="font-bold text-[#A94C19]"
                      >
                        •
                      </span>

                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#D9C8B0] bg-white p-7 sm:p-8">
                <h3 className="font-serif text-2xl text-[#30251F]">
                  Explore Related Product Categories
                </h3>

                <div className="mt-6 flex flex-wrap gap-3">
                  {solution.productLinks.map((product) => (
                    <Link
                      key={product.href}
                      href={product.href}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D5C2A6] bg-[#FAF7F0] px-4 py-2.5 text-sm font-semibold text-[#7F3E18] transition-colors hover:border-[#B95016] hover:bg-[#F3E7D5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B95016] motion-reduce:transition-none"
                    >
                      {product.label}
                      <Arrow />
                    </Link>
                  ))}
                </div>

                <p className="mt-6 text-xs leading-6 text-[#806F5E]">
                  Product materials, specifications and
                  customisation options depend on the
                  individual requirement.
                </p>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* =====================================
          4. HOW TO PREPARE A REQUIREMENT
          ===================================== */}

      <section
        aria-labelledby="approach-title"
        className="border-t border-[#E0D2BF] bg-[#FAF7F0] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
            From Concept to Product Brief
          </p>

          <h2
            id="approach-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Preparing Your Product Requirement
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Clear specifications help the team understand
            your needs and identify appropriate product
            and material options.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {workingApproach.map((step) => (
              <article
                key={step.number}
                className="rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {step.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl text-[#30251F]">
                  {step.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-[#74675E]">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================
          5. KNOWLEDGE CONNECTION
          ===================================== */}

      <section
        aria-labelledby="knowledge-connection-title"
        className="border-t border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
            Understand the Details
          </p>

          <h2
            id="knowledge-connection-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore Hospitality Product Knowledge
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Learn more about paper, printing, packaging
            and product selection through the Bark Ornament
            Knowledge Hub.
          </p>

          <Link
            href="/insights/knowledge"
            className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#B95016] px-6 py-3 text-sm font-bold text-[#A94C19] transition-colors hover:bg-[#F3EBDF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
          >
            Visit Knowledge Hub
            <Arrow />
          </Link>
        </div>
      </section>

      {/* =====================================
          6. SAFE FINAL CTA

          UI FIX 09:
          Explicit light heading color
          ===================================== */}

      <section
        aria-labelledby="solutions-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Hospitality Product Solutions
          </p>

          <h2
            id="solutions-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            style={{
              color: "#FAF7F0",
            }}
          >
            Discuss Your Next Product Requirement.
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Explore the catalogue or contact Bark Ornament
            to discuss customised printed, branded and
            guest-presentation products for your property.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Explore Our Products
              <Arrow />
            </Link>

            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Contact Us
              <Arrow />
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-[#D8C8B5]">
            This page does not submit quotations or
            send automated emails.
          </p>
        </div>
      </section>
    </main>
  );
}
