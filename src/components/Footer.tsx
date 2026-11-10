
import Link from "next/link";

/* =========================================
   BARK ORNAMENT - WEBSITE FOOTER
   Theme: Golden Coastal Luxury

   UI FIXES:
   - Aligned footer columns
   - Consistent gold footer headings
   - Visible quotation section typography
   - White quotation button text
   - Responsive desktop and mobile layout
   ========================================= */

const companyLinks = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  {
    label: "Hospitality Solutions",
    href: "/hospitality-solutions",
  },
  { label: "Our Markets", href: "/markets" },
  { label: "Gallery & Portfolio", href: "/gallery" },
  { label: "Contact Us", href: "/contact" },
];

const resourceLinks = [
  {
    label: "Insights & Knowledge",
    href: "/insights",
  },
  {
    label: "News & Events",
    href: "/insights/news",
  },
  {
    label: "Download Centre",
    href: "/insights/downloads",
  },
  {
    label: "Request a Quotation",
    href: "/request-quotation",
  },
];

const productLinks = [
  {
    label: "Printing & Corporate Stationery",
    href: "/products?category=printing-stationery",
  },
  {
    label: "Menus & Guest Service Products",
    href: "/products?category=menus-guest-service",
  },
  {
    label: "Bags & Packaging",
    href: "/products?category=bags-packaging",
  },
  {
    label: "Wooden Products & Crafts",
    href: "/products?category=wooden-products",
  },
  {
    label: "Cane & Natural Products",
    href: "/products?category=cane-natural",
  },
  {
    label: "Gifts & Promotional Products",
    href: "/products?category=gifts-promotional",
  },
];

/* =========================================
   CACHED CURRENT YEAR
   ========================================= */

async function getCurrentYear() {
  "use cache";
  return new Date().getFullYear();
}

/* =========================================
   FOOTER DESIGN STYLES
   ========================================= */

const headingClass =
  "mb-6 flex h-10 min-w-0 items-center border-b border-[#6D584A] pb-3 font-sans text-sm font-bold uppercase tracking-[0.12em] text-[#E3B65D]";

const headingStyle = {
  color: "#E3B65D",
  fontFamily: "Arial, Helvetica, sans-serif",
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: "20px",
} as const;

const linkClass =
  "inline-block text-sm leading-7 text-[#E9DDC9] transition-colors duration-200 hover:text-white hover:underline hover:underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E3B65D]";

/* =========================================
   FOOTER COMPONENT
   ========================================= */

export default async function Footer() {
  const year = await getCurrentYear();

  return (
    <footer className="w-full bg-[#30251F] text-[#FAF7F0]">

      {/* =====================================
          QUOTATION CALL TO ACTION
          UI FIX 04 - TEXT VISIBILITY
          ===================================== */}

      <div className="border-b border-[#6D584A]">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-8 px-5 py-14 md:grid-cols-[1fr_auto] md:px-8 md:py-20">

          <div className="max-w-2xl">

            <p
              className="mb-4 text-xs font-bold uppercase tracking-[0.18em]"
              style={{
                color: "#E3B65D",
              }}
            >
              Customized Hospitality Solutions
            </p>

            <h2
              className="font-serif text-3xl leading-tight sm:text-4xl md:text-5xl"
              style={{
                color: "#FAF7F0",
                fontWeight: 500,
                lineHeight: 1.2,
              }}
            >
              Let&apos;s create something exceptional.
            </h2>

            <p
              className="mt-5 max-w-xl text-base leading-8"
              style={{
                color: "#E9DDC9",
              }}
            >
              Explore customized products for hotels and
              resorts. Share your requirements with our
              team and request a quotation for your next
              project.
            </p>

          </div>

          <div className="flex justify-start md:justify-end">

            <Link
              href="/request-quotation"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-[#B95016] px-7 py-4 text-sm font-bold transition-colors duration-200 hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D] motion-reduce:transition-none"
              style={{
                color: "#FFFFFF",
              }}
            >
              Request a Quotation
              <span aria-hidden="true">↗</span>
            </Link>

          </div>

        </div>
      </div>

      {/* =====================================
          MAIN FOOTER
          ===================================== */}

      <div className="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-8 md:py-20">

        <div className="grid grid-cols-1 items-start gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-[1.25fr_0.85fr_1.3fr_1fr]">

          {/* =================================
              COLUMN 1 - COMPANY INFORMATION
              ================================= */}

          <div className="min-w-0">

            <div className="mb-6 flex h-10 min-w-0 items-center border-b border-[#6D584A] pb-3">

              <Link
                href="/"
                aria-label="Bark Ornament - Homepage"
                className="inline-flex flex-col"
              >
                <span
                  className="font-serif text-xl font-semibold tracking-wide sm:text-2xl"
                  style={{ color: "#FAF7F0" }}
                >
                  BARK{" "}
                  <span style={{ color: "#E3B65D" }}>
                    ORNAMENT
                  </span>
                </span>
              </Link>

            </div>

            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E3B65D]">
              Hospitality Products
            </p>

            <p className="max-w-sm text-sm leading-7 text-[#E9DDC9]">
              Bark Ornament (Pvt) Ltd is a Sri Lankan
              supplier of customized products for the
              hospitality industry, including printed
              products, wooden accessories, packaging
              and gift solutions.
            </p>

            <p className="mt-5 max-w-sm text-sm leading-7 text-[#E9DDC9]">
              Serving hospitality customers in the
              Maldives, Seychelles and Sri Lanka.
            </p>

          </div>

          {/* =================================
              COLUMN 2 - EXPLORE
              ================================= */}

          <nav
            aria-label="Company footer navigation"
            className="min-w-0"
          >

            <h3
              className={headingClass}
              style={headingStyle}
            >
              Explore
            </h3>

            <ul className="m-0 list-none space-y-3 p-0">
              {companyLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={linkClass}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

          </nav>

          {/* =================================
              COLUMN 3 - OUR PRODUCTS
              ================================= */}

          <nav
            aria-label="Product footer navigation"
            className="min-w-0"
          >

            <h3
              className={headingClass}
              style={headingStyle}
            >
              Our Products
            </h3>

            <ul className="m-0 list-none space-y-3 p-0">

              {productLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={linkClass}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              <li className="pt-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#E3B65D] transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
                >
                  View All Products
                  <span aria-hidden="true">→</span>
                </Link>
              </li>

            </ul>

          </nav>

          {/* =================================
              COLUMN 4 - CONTACT AND RESOURCES
              ================================= */}

          <div className="min-w-0">

            <h3
              className={headingClass}
              style={headingStyle}
            >
              Get in Touch
            </h3>

            <address className="not-italic">

              <p className="mb-3 text-sm font-semibold leading-7 text-white">
                Bark Ornament (Pvt) Ltd
              </p>

              <p className="mb-4 text-sm leading-7 text-[#E9DDC9]">
                Sri Lanka
              </p>

              <a
                href="mailto:it@barkornament.lk"
                className="break-all text-sm leading-7 text-[#E9DDC9] transition-colors duration-200 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E3B65D]"
              >
                it@barkornament.lk
              </a>

            </address>

            {/* =================================
                RESOURCES
                ================================= */}

            <nav
              aria-label="Footer resources navigation"
              className="mt-10"
            >

              <h3
                className={headingClass}
                style={headingStyle}
              >
                Resources
              </h3>

              <ul className="m-0 list-none space-y-3 p-0">

                {resourceLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={linkClass}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}

              </ul>

            </nav>

          </div>

        </div>
      </div>

      {/* =====================================
          COPYRIGHT AND LEGAL LINKS
          ===================================== */}

      <div className="border-t border-[#6D584A]">

        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-5 px-5 py-7 text-center text-sm text-[#E9DDC9] md:flex-row md:px-8 md:text-left">

          <p className="m-0">
            © {year} Bark Ornament (Pvt) Ltd.
            All rights reserved.
          </p>

          <nav
            aria-label="Legal navigation"
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:justify-end"
          >

            <Link
              href="/privacy-policy"
              className={linkClass}
            >
              Privacy Policy
            </Link>

            <Link
              href="/cookie-information"
              className={linkClass}
            >
              Cookie Information
            </Link>

            <Link
              href="/terms"
              className={linkClass}
            >
              Terms & Conditions
            </Link>

          </nav>

        </div>
      </div>

    </footer>
  );
}
