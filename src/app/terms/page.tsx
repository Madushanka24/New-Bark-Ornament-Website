
import type { Metadata } from "next";
import Link from "next/link";

/**
 * BARK ORNAMENT — FILE 95
 *
 * Terms & Conditions — Pre-publication Page
 *
 * Route:
 * /terms
 *
 * Matches the existing footer destination.
 *
 * IMPORTANT:
 * - This is NOT an approved set of legal terms.
 * - The topics below are review items only.
 * - No contractual commitments are created by
 *   this page's editorial review checklist.
 * - No payment, delivery, warranty, liability,
 *   governing-law or other legal terms are invented.
 *
 * The approved legal text must replace this
 * placeholder before public launch.
 *
 * Read-only Server Component.
 * No forms, database operations, API calls,
 * quotation submissions or automated emails.
 */

export const metadata: Metadata = {
  title: "Terms & Conditions | Bark Ornament",
  description:
    "Information about the preparation and publication status of Bark Ornament's website terms and conditions.",
  robots: {
    index: false,
    follow: true,
  },
};

const reviewTopics = [
  {
    number: "01",
    label: "WEBSITE ACCESS",
    title: "Website Use",
    description:
      "Review the intended use of the website, any applicable visitor requirements, and any conditions governing website access.",
  },
  {
    number: "02",
    label: "PRODUCT INFORMATION",
    title: "Product Descriptions",
    description:
      "Confirm how product illustrations, descriptions, specifications, customisation options and availability should be explained.",
  },
  {
    number: "03",
    label: "COMMERCIAL ENQUIRIES",
    title: "Quotation Requests",
    description:
      "Establish the appropriate relationship between website enquiries, formal quotations, order confirmation and any agreed commercial terms.",
  },
  {
    number: "04",
    label: "ORDERS & DELIVERY",
    title: "Commercial Conditions",
    description:
      "Identify which payment, production, shipping, delivery and cancellation conditions should be addressed, where applicable and approved.",
  },
  {
    number: "05",
    label: "BRAND & CONTENT",
    title: "Intellectual Property",
    description:
      "Review the appropriate treatment of company branding, website content, product imagery and customer-supplied artwork.",
  },
  {
    number: "06",
    label: "EXTERNAL RESOURCES",
    title: "Third-Party Links",
    description:
      "Determine whether the website links to external services and what information, if any, should accompany those links.",
  },
  {
    number: "07",
    label: "LEGAL REVIEW",
    title: "Responsibility and Disputes",
    description:
      "Obtain appropriate legal review of proposed responsibility, remedies, dispute procedures and other relevant legal provisions.",
  },
  {
    number: "08",
    label: "PUBLICATION",
    title: "Contact and Updates",
    description:
      "Confirm the correct legal contact, effective date, amendment process and publication arrangements for the approved terms.",
  },
] as const;

const approvalSteps = [
  {
    number: "01",
    title: "Review Website Functions",
    description:
      "Identify which website features are available and how visitors interact with product information and enquiry workflows.",
  },
  {
    number: "02",
    title: "Confirm Commercial Procedures",
    description:
      "Check the company's actual quotation, order acceptance, customisation and delivery procedures before drafting any commitments.",
  },
  {
    number: "03",
    title: "Approve Legal Wording",
    description:
      "Have authorised company representatives and appropriate legal advisers review the proposed terms and applicable requirements.",
  },
  {
    number: "04",
    title: "Publish the Final Terms",
    description:
      "Replace the placeholder with approved terms, include the confirmed effective date and review search-indexing settings.",
  },
] as const;

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function TermsArtwork() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-2xl border border-[#C59A45]/40 bg-[#49372C] p-7 shadow-2xl"
    >
      <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full border border-[#E3B65D]/25" />

      <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[#E3B65D]/35 px-6 text-center">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
          Bark Ornament
        </span>

        <svg
          viewBox="0 0 120 120"
          width="108"
          height="108"
          fill="none"
          className="mt-8 text-[#E3B65D]"
        >
          <path
            d="M32 17H74L91 34V100H32V17Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          <path
            d="M74 17V34H91"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          <path
            d="M44 49H79M44 60H79M44 71H68"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          <path
            d="M47 85L53 91L65 79"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="mt-8 font-serif text-3xl text-[#E3B65D]">
          Clarity & Trust.
        </span>

        <span className="mt-5 max-w-56 text-sm leading-7 text-[#E9DDC9]">
          Preparing clear, accurate and approved
          website terms.
        </span>
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#30251F]">
      {/* 1. HERO */}
      <section
        aria-labelledby="terms-title"
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

              <li
                aria-hidden="true"
                className="text-[#E3B65D]"
              >
                /
              </li>

              <li
                aria-current="page"
                className="text-white"
              >
                Terms &amp; Conditions
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament · Legal Information
              </p>

              <h1
                id="terms-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
              >
                Terms &amp;
                <span className="mt-2 block text-[#E3B65D]">
                  Conditions.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                Information about the preparation and
                publication status of our website
                terms and conditions.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8C8B5]">
                The final wording must be confirmed
                against the website&apos;s actual
                operations and the company&apos;s
                approved commercial and legal procedures.
              </p>

              <div className="mt-8 inline-flex items-center gap-3 rounded-md border border-[#C59A45]/45 bg-[#49372C] px-5 py-3">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full bg-[#E3B65D]"
                />

                <span className="text-sm font-semibold text-[#F5E6C8]">
                  Terms under review
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#terms-review"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Explore Review Topics
                  <span aria-hidden="true">↓</span>
                </a>

                <Link
                  href="/privacy-policy"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Privacy Information
                  <Arrow />
                </Link>
              </div>
            </div>

            <TermsArtwork />
          </div>
        </div>
      </section>

      {/* 2. STATUS NOTICE */}
      <section
        aria-labelledby="terms-status-title"
        className="px-5 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-[#D9C8B0] bg-white p-7 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
              Publication Status
            </p>

            <h2
              id="terms-status-title"
              className="mt-4 font-serif text-2xl leading-tight sm:text-3xl"
            >
              Terms and Conditions in Preparation
            </h2>

            <p className="mt-5 max-w-4xl text-base leading-8 text-[#66584F]">
              Bark Ornament (Pvt) Ltd&apos;s website
              terms and conditions have not yet
              been finalised and approved for
              publication.
            </p>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-[#74675E]">
              This page is a temporary information
              placeholder. It is not a published
              set of contractual terms and should
              not be relied upon to determine the
              conditions of a purchase, quotation,
              product supply or other agreement.
            </p>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-[#74675E]">
              The topics listed below identify
              matters requiring company and legal
              review. They do not establish
              policies, commercial conditions,
              warranties or legal commitments.
            </p>
          </div>
        </div>
      </section>

      {/* 3. SUBJECTS FOR REVIEW */}
      <section
        id="terms-review"
        aria-labelledby="terms-review-title"
        className="scroll-mt-20 border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Terms Preparation
          </p>

          <h2
            id="terms-review-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Subjects Requiring Confirmation
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Accurate website terms depend on
            confirmed business procedures,
            website functionality and applicable
            legal requirements.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {reviewTopics.map((topic) => (
              <article
                key={topic.number}
                className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7 shadow-sm sm:p-8"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {topic.number}
                </span>

                <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                  {topic.label}
                </p>

                <h3 className="mt-3 font-serif text-2xl leading-snug text-[#30251F]">
                  {topic.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {topic.description}
                </p>

                <p className="mt-6 border-t border-[#E8DCCB] pt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#806F5E]">
                  Review and approval required
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. BUSINESS CONTEXT */}
      <section
        aria-labelledby="commercial-context-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
            Website & Commercial Context
          </p>

          <h2
            id="commercial-context-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Product Information and Enquiries
          </h2>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-[#D9C8B0] bg-white p-7 sm:p-8">
              <h3 className="font-serif text-2xl text-[#30251F]">
                Website Product Information
              </h3>

              <p className="mt-4 text-sm leading-7 text-[#74675E]">
                The website presents product
                categories and hospitality-related
                information. The appropriate
                contractual treatment of product
                descriptions, samples, artwork
                and specifications must be
                confirmed before final terms
                are published.
              </p>

              <Link
                href="/products"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D9C8B0] px-5 py-2.5 text-sm font-bold text-[#A94C19] transition-colors hover:bg-[#F3EBDF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                Explore Products
                <Arrow />
              </Link>
            </div>

            <div className="rounded-xl border border-[#D9C8B0] bg-white p-7 sm:p-8">
              <h3 className="font-serif text-2xl text-[#30251F]">
                Commercial Arrangements
              </h3>

              <p className="mt-4 text-sm leading-7 text-[#74675E]">
                The company must confirm how
                formal quotations, orders,
                payment arrangements, production
                approvals and delivery conditions
                are documented and agreed.
                This page does not establish
                those conditions.
              </p>

              <Link
                href="/contact"
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md border border-[#D9C8B0] px-5 py-2.5 text-sm font-bold text-[#A94C19] transition-colors hover:bg-[#F3EBDF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transition-none"
              >
                Contact Bark Ornament
                <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. APPROVAL ROADMAP */}
      <section
        aria-labelledby="approval-title"
        className="border-y border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
            Before Publication
          </p>

          <h2
            id="approval-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Finalising the Terms &amp; Conditions
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            The final document should reflect
            verified company practices and
            authorised legal wording.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {approvalSteps.map((step) => (
              <article
                key={step.number}
                className="rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {step.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F]">
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

      {/* 6. RELATED LEGAL INFORMATION */}
      <section
        aria-labelledby="related-legal-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
            Related Website Information
          </p>

          <h2
            id="related-legal-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Privacy and Cookie Documentation
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            The following pages describe the
            pre-publication status of additional
            website documentation.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Link
              href="/privacy-policy"
              className="flex min-h-36 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Legal Information
              </span>

              <span className="mt-5 flex items-center justify-between gap-3 font-serif text-2xl">
                Privacy Policy
                <Arrow />
              </span>
            </Link>

            <Link
              href="/cookie-information"
              className="flex min-h-36 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Website Information
              </span>

              <span className="mt-5 flex items-center justify-between gap-3 font-serif text-2xl">
                Cookie Information
                <Arrow />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA — READ-ONLY */}
      <section
        aria-labelledby="terms-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Bark Ornament
          </p>

          <h2
            id="terms-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Need More Information?
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Our Contact page provides company
            contact information. The appropriate
            legal contact and procedures will
            be confirmed as part of the final
            approved documentation.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Contact Us
              <Arrow />
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
            >
              Return Home
              <Arrow />
            </Link>
          </div>

          <p className="mt-6 text-sm leading-6 text-[#D8C8B5]">
            This page does not accept orders,
            submit quotations or send emails.
          </p>
        </div>
      </section>
    </main>
  );
}
