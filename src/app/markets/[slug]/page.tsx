
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * BARK ORNAMENT — FILE 79
 * src/app/markets/[slug]/page.tsx
 *
 * Three editorial market profiles. No external fetching, database
 * access, forms, email, or dependency on unavailable photographs.
 *
 * Keep slugs consistent with File 78 and File 75.
 */

type ProductCategory = {
  name: string;
  slug: string;
  context: string;
};

type Market = {
  slug: string;
  number: string;
  name: string;
  symbol: string;
  eyebrow: string;
  headline: string;
  introduction: string;
  overview: string;
  note: string;
  categories: readonly ProductCategory[];
  planning: readonly string[];
};

const markets = [
  {
    slug: "maldives",
    number: "01",
    name: "Maldives",
    symbol: "MV",
    eyebrow: "RESORT & ISLAND HOSPITALITY",
    headline: "Distinctive details for exceptional resort experiences.",
    introduction:
      "Supporting hospitality product requirements across the Maldives, from everyday guest touchpoints to customised brand presentation.",
    overview:
      "Bark Ornament works with hospitality customers in the Maldives on printed materials, guest-facing accessories, bags and other made-to-order product requirements. Material selection, artwork, quantities and delivery planning are reviewed for each project.",
    note:
      "Island delivery arrangements depend on the destination, confirmed order scope and available freight options; no fixed transit time is implied.",
    categories: [
      {
        name: "Menus & Guest Service Products",
        slug: "menus-guest-service",
        context: "Restaurant menu presentation and guest-facing materials",
      },
      {
        name: "Tags, Stickers & Cards",
        slug: "tags-stickers-cards",
        context: "Printed guest details, identifiers and labels",
      },
      {
        name: "Bags & Packaging",
        slug: "bags-packaging",
        context: "Branded bags and selected presentation packaging",
      },
      {
        name: "Gifts & Promotional Products",
        slug: "gifts-promotional",
        context: "Guest gifts and branded promotional concepts",
      },
    ],
    planning: [
      "Specify the resort, department and intended product use.",
      "Confirm artwork, dimensions, materials and required quantities.",
      "Discuss packing, consolidation and destination-specific delivery arrangements.",
    ],
  },
  {
    slug: "seychelles",
    number: "02",
    name: "Seychelles",
    symbol: "SC",
    eyebrow: "ISLAND HOSPITALITY SUPPLY",
    headline: "Considered presentation for remarkable island destinations.",
    introduction:
      "Exploring tailored printing, guest presentation and crafted product solutions for hospitality requirements in the Seychelles.",
    overview:
      "For Seychelles hospitality customers, Bark Ornament offers discussions around customised printing, menu products, wooden accessories, packaging and branded gifts. Order specifications and export logistics are considered together before commitments are made.",
    note:
      "Production schedules and shipping arrangements are confirmed order by order; routes and lead times can change.",
    categories: [
      {
        name: "Printing & Corporate Stationery",
        slug: "printing-stationery",
        context: "Printed communication and branded stationery",
      },
      {
        name: "Menus & Guest Service Products",
        slug: "menus-guest-service",
        context: "Menu materials and guest presentation products",
      },
      {
        name: "Wooden Products & Crafts",
        slug: "wooden-products",
        context: "Natural-material and crafted presentation accessories",
      },
      {
        name: "Gifts & Promotional Products",
        slug: "gifts-promotional",
        context: "Customised guest gifts and promotional merchandise",
      },
    ],
    planning: [
      "Share product applications, quantities and delivery destination.",
      "Confirm print files, finishing options and sample requirements.",
      "Review production timing and available freight arrangements before ordering.",
    ],
  },
  {
    slug: "sri-lanka",
    number: "03",
    name: "Sri Lanka",
    symbol: "LK",
    eyebrow: "OUR HOME MARKET & OPERATING BASE",
    headline: "Craftsmanship and customisation begin at home.",
    introduction:
      "Based in Sri Lanka, Bark Ornament develops and supplies customised products for hospitality and business applications.",
    overview:
      "Sri Lanka is Bark Ornament's operating base, where its team coordinates product development and customer requirements. From printed stationery to crafted accessories, projects are discussed around purpose, material, branding and quantity.",
    note:
      "Product options and production arrangements vary by specification; samples and final availability are subject to confirmation.",
    categories: [
      {
        name: "Printing & Corporate Stationery",
        slug: "printing-stationery",
        context: "Everyday corporate and guest communication materials",
      },
      {
        name: "Laundry & Hotel Operations",
        slug: "laundry-operations",
        context: "Selected operational printed products and laundry supplies",
      },
      {
        name: "Ceramic, Pottery & Laksha",
        slug: "ceramic-pottery-laksha",
        context: "Decorative crafts and selected functional pieces",
      },
      {
        name: "Cane & Natural Products",
        slug: "cane-natural",
        context: "Woven and natural-material hospitality accessories",
      },
    ],
    planning: [
      "Explain the intended use and preferred quantity or dimensions.",
      "Review material selection, custom branding and finish options.",
      "Agree on production feasibility, quality requirements and fulfilment details.",
    ],
  },
] as const satisfies readonly Market[];

type PageProps = {
  params: Promise<{ slug: string }>;
};

function getMarket(slug: string) {
  return markets.find((item) => item.slug === slug);
}

/** Generate the three known profiles during the build. */
export function generateStaticParams() {
  return markets.map((market) => ({ slug: market.slug }));
}

/** Metadata is resolved independently for each market. */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const market = getMarket(slug);

  if (!market) notFound();

  return {
    title: `${market.name} Hospitality Supply | Bark Ornament`,
    description: market.introduction,
  };
}

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

export default async function MarketDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const market = getMarket(slug);

  if (!market) notFound();

  const otherMarkets = markets.filter(
    (item) => item.slug !== market.slug
  );

  return (
    <main className="bg-[#FAF7F0] text-[#30251F]">
      {/* HERO AND BREADCRUMBS */}
      <section
        aria-labelledby="market-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20 lg:py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-36 -top-44 h-[480px] w-[480px] rounded-full border border-[#C59A45]/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-52 -left-40 h-[500px] w-[500px] rounded-full border border-[#C59A45]/15"
        />

        <div className="relative mx-auto max-w-7xl">
          <nav
            aria-label="Breadcrumb"
            className="mb-12 text-sm text-[#E9DDC9]"
          >
            <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
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
              <li>
                <Link
                  href="/markets"
                  className="rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
                >
                  Our Markets
                </Link>
              </li>
              <li aria-hidden="true" className="text-[#E3B65D]">
                /
              </li>
              <li aria-current="page" className="text-white">
                {market.name}
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Market {market.number} · {market.eyebrow}
              </p>

              <h1
                id="market-title"
                className="mt-6 font-serif text-5xl leading-tight sm:text-6xl lg:text-7xl"
              >
                {market.name}
              </h1>

              <p className="mt-6 max-w-3xl font-serif text-2xl leading-snug text-[#E3B65D] sm:text-3xl">
                {market.headline}
              </p>

              <p className="mt-6 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                {market.introduction}
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#market-products"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Explore product families
                  <span aria-hidden="true">↓</span>
                </a>

                <Link
                  href="/markets"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  View all markets <Arrow />
                </Link>
              </div>
            </div>

            {/* Abstract editorial motif; not a flag or location map. */}
            <div
              aria-hidden="true"
              className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/45 bg-[#473629] p-7 shadow-2xl"
            >
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#C59A45]/25" />
              <div className="absolute -bottom-24 -left-16 h-60 w-60 rounded-full border border-[#C59A45]/25" />

              <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#C59A45]/40 px-5 text-center">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                  Bark Ornament
                </span>
                <span className="mt-7 font-serif text-7xl text-[#E3B65D]">
                  {market.symbol}
                </span>
                <span className="mt-7 text-xs uppercase tracking-[0.18em] text-[#E9DDC9]">
                  International hospitality
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARKET CONTEXT */}
      <section
        aria-labelledby="market-overview-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-9 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
              Our approach
            </p>
            <h2
              id="market-overview-title"
              className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
            >
              Supporting hospitality requirements in{" "}
              {market.name}
            </h2>
          </div>

          <div>
            <p className="text-base leading-8 text-[#66584F]">
              {market.overview}
            </p>
            <p className="mt-6 border-l-2 border-[#C59A45] pl-5 text-sm leading-7 text-[#74675E]">
              {market.note}
            </p>
          </div>
        </div>
      </section>

      {/* RELEVANT PRODUCT FAMILY LINKS */}
      <section
        id="market-products"
        aria-labelledby="market-products-title"
        className="scroll-mt-20 border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Relevant collections
          </p>

          <h2
            id="market-products-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Explore product families
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            These categories illustrate possible applications
            for hospitality projects in {market.name}. They do
            not represent live inventory or locally held stock.
          </p>

          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {market.categories.map((category, index) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                aria-label={`Explore ${category.name} category`}
                className="group flex min-h-52 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-6 shadow-sm transition-[transform,border-color,box-shadow] hover:-translate-y-1 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none sm:p-7"
              >
                <div>
                  <span
                    aria-hidden="true"
                    className="font-serif text-3xl text-[#AE7C35]"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F]">
                    {category.name}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#74675E]">
                    {category.context}
                  </p>
                </div>

                <span
                  aria-hidden="true"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#A94C19]"
                >
                  Explore collection <Arrow />
                </span>
              </Link>
            ))}
          </div>

          <Link
            href="/categories"
            className="mt-9 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
          >
            View all product categories <Arrow />
          </Link>
        </div>
      </section>

      {/* PRACTICAL BRIEF REQUIREMENTS */}
      <section
        aria-labelledby="planning-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            From concept to specification
          </p>

          <h2
            id="planning-title"
            className="mt-4 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl"
          >
            Planning a requirement for {market.name}
          </h2>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {market.planning.map((step, index) => (
              <div
                key={step}
                className="rounded-xl border border-[#D9C8B0] bg-white p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#AE7C35]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <p className="mt-5 text-base leading-8 text-[#5A4A41]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OTHER EXISTING MARKET PROFILES */}
      <section
        aria-labelledby="other-markets-title"
        className="border-t border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Continue exploring
          </p>

          <h2
            id="other-markets-title"
            className="mt-4 font-serif text-3xl sm:text-4xl"
          >
            Other markets
          </h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {otherMarkets.map((other) => (
              <Link
                key={other.slug}
                href={`/markets/${other.slug}`}
                className="group flex min-h-36 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-6 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  Market {other.number}
                </span>

                <span className="mt-6 flex items-center justify-between gap-4 font-serif text-2xl text-[#30251F]">
                  {other.name} <Arrow />
                </span>
              </Link>
            ))}
          </div>

          <Link
            href="/markets"
            className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#A94C19] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016]"
          >
            All markets, including Mauritius & Fiji <Arrow />
          </Link>
        </div>
      </section>

      {/* NO FORMS OR SERVER ACTIONS */}
      <section
        aria-labelledby="enquiry-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Tailored hospitality products
          </p>

          <h2
            id="enquiry-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Preparing an order for {market.name}?
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Explore suitable products and prepare your intended
            specifications, quantities and branding requirements.
            Feasibility and shipping details are confirmed for
            each project.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Browse products <Arrow />
            </Link>

            <Link
              href="/request-quotation"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              View quotation page <Arrow />
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-[#D8C8B5]">
            Online quotation submissions remain disabled
            during development.
          </p>
        </div>
      </section>
    </main>
  );
}
