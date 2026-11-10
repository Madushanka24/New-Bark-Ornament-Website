
import type { Metadata } from "next";
import Link from "next/link";

/**
 * BARK ORNAMENT — FILE 94
 *
 * Cookie Information — Pre-publication Page
 *
 * Route:
 * /cookie-information
 *
 * Matches the existing footer link.
 *
 * IMPORTANT:
 * This page is NOT an approved cookie policy.
 * No actual cookie inventory has been verified.
 *
 * This file does not claim that the website uses
 * particular cookies, analytics tools, advertising
 * systems, consent mechanisms or storage periods.
 *
 * No client-side state, forms, API requests,
 * database access, quotations or emails.
 */

export const metadata: Metadata = {
  title: "Cookie Information | Bark Ornament",
  description:
    "Information about the preparation and publication status of Bark Ornament's website cookie documentation.",
  robots: {
    index: false,
    follow: true,
  },
};

const reviewTopics = [
  {
    number: "01",
    title: "Cookies and Browser Storage",
    description:
      "Identify any cookies or other browser-storage mechanisms actually used by the website, including their purposes.",
  },
  {
    number: "02",
    title: "Essential Website Functions",
    description:
      "Review whether technical storage is required for navigation, security, user preferences or other website functions.",
  },
  {
    number: "03",
    title: "Analytics and Performance",
    description:
      "Verify whether any analytics or performance-measurement services are installed, enabled or collecting information.",
  },
  {
    number: "04",
    title: "Advertising and External Services",
    description:
      "Check whether any advertising technologies, embedded content or third-party services introduce cookies or similar storage.",
  },
  {
    number: "05",
    title: "Consent and User Controls",
    description:
      "Determine which choices or consent controls, if any, are required for the website's actual technologies and applicable rules.",
  },
  {
    number: "06",
    title: "Retention and Documentation",
    description:
      "Verify storage lifetimes, relevant service providers and the information that should appear in the approved cookie documentation.",
  },
] as const;

const preparationSteps = [
  {
    number: "01",
    title: "Inspect the Website",
    description:
      "Review the deployed website, including its pages, browser storage and integrated services.",
  },
  {
    number: "02",
    title: "Confirm the Findings",
    description:
      "Check each identified technology, its purpose, provider, duration and any applicable consent requirements.",
  },
  {
    number: "03",
    title: "Approve and Publish",
    description:
      "Replace this placeholder with verified information and an approved publication date, then review indexing settings.",
  },
] as const;

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function CookieArtwork() {
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
          className="mt-9 text-[#E3B65D]"
        >
          <rect
            x="19"
            y="24"
            width="82"
            height="72"
            rx="6"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19 43H101"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <circle cx="29" cy="34" r="2.5" fill="currentColor" />
          <circle cx="39" cy="34" r="2.5" fill="currentColor" />
          <circle cx="49" cy="34" r="2.5" fill="currentColor" />
          <path
            d="M45 70L55 80L77 57"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="mt-8 font-serif text-3xl text-[#E3B65D]">
          Clarity Matters.
        </span>

        <span className="mt-5 max-w-56 text-sm leading-7 text-[#E9DDC9]">
          Preparing clear information about website
          technologies and visitor choices.
        </span>
      </div>
    </div>
  );
}

export default function CookieInformationPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#30251F]">
      {/* 1. HERO */}
      <section
        aria-labelledby="cookie-title"
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
                Cookie Information
              </li>
            </ol>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
                Bark Ornament · Website Information
              </p>

              <h1
                id="cookie-title"
                className="mt-6 max-w-3xl font-serif text-4xl leading-[1.12] sm:text-5xl lg:text-6xl"
              >
                Cookie
                <span className="mt-2 block text-[#E3B65D]">
                  Information.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
                Understanding the status of our website
                cookie and browser-storage documentation.
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D8C8B5]">
                This page describes the review process
                required before accurate information about
                the website&apos;s technologies can be
                published.
              </p>

              <div className="mt-8 inline-flex items-center gap-3 rounded-md border border-[#C59A45]/45 bg-[#49372C] px-5 py-3">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full bg-[#E3B65D]"
                />

                <span className="text-sm font-semibold text-[#F5E6C8]">
                  Cookie documentation under review
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#cookie-review"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#E3B65D] px-7 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#F4CE83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Explore Review Areas
                  <span aria-hidden="true">↓</span>
                </a>

                <Link
                  href="/privacy-policy"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-[#C59A45] px-7 py-3 text-sm font-bold text-[#FAF7F0] transition-colors hover:bg-[#49382E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none"
                >
                  Privacy Policy Status
                  <Arrow />
                </Link>
              </div>
            </div>

            <CookieArtwork />
          </div>
        </div>
      </section>

      {/* 2. PUBLICATION NOTICE */}
      <section
        aria-labelledby="cookie-status-title"
        className="px-5 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-[#D9C8B0] bg-white p-7 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
              Publication Status
            </p>

            <h2
              id="cookie-status-title"
              className="mt-4 font-serif text-2xl leading-tight sm:text-3xl"
            >
              Cookie Documentation in Preparation
            </h2>

            <p className="mt-5 max-w-4xl text-base leading-8 text-[#66584F]">
              Bark Ornament (Pvt) Ltd&apos;s website
              cookie information has not yet been
              finalised and approved for publication.
            </p>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-[#74675E]">
              This is a temporary information placeholder,
              not an approved cookie notice or a complete
              inventory of browser-storage technologies.
              It should not be interpreted as confirmation
              that a particular cookie, analytics service,
              tracking system or consent mechanism is
              present or absent.
            </p>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-[#74675E]">
              No consent control or cookie-preference
              setting is implemented by this page.
              Appropriate visitor controls, where
              required, must be considered separately
              after the website&apos;s actual configuration
              has been reviewed.
            </p>
          </div>
        </div>
      </section>

      {/* 3. GENERAL EXPLANATION */}
      <section
        aria-labelledby="cookie-explainer-title"
        className="border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
            General Background
          </p>

          <h2
            id="cookie-explainer-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            What Are Cookies?
          </h2>

          <p className="mt-5 max-w-4xl text-base leading-8 text-[#66584F]">
            Cookies are small pieces of information
            that websites can ask browsers to store.
            Websites may also use other browser-storage
            technologies. Depending on how they are
            implemented, these technologies can support
            website functions, remember preferences or
            assist with measurement.
          </p>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-[#74675E]">
            This is general background information.
            It does not describe or confirm the
            technologies used by the Bark Ornament
            website. Those details require a separate
            technical review.
          </p>
        </div>
      </section>

      {/* 4. REVIEW TOPICS */}
      <section
        id="cookie-review"
        aria-labelledby="cookie-review-title"
        className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Documentation Review
          </p>

          <h2
            id="cookie-review-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Information to Be Verified
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            Before an approved notice can be published,
            the website&apos;s actual technologies and
            applicable requirements must be established.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviewTopics.map((topic) => (
              <article
                key={topic.number}
                className="flex h-full flex-col rounded-xl border border-[#D9C8B0] bg-white p-7 shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {topic.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl leading-snug text-[#30251F]">
                  {topic.title}
                </h3>

                <p className="mt-4 flex-1 text-sm leading-7 text-[#74675E]">
                  {topic.description}
                </p>

                <p className="mt-6 border-t border-[#E8DCCB] pt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#8B775E]">
                  Verification required
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. APPROVAL PROCESS */}
      <section
        aria-labelledby="cookie-preparation-title"
        className="border-y border-[#E0D2BF] bg-[#F1E8DB] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Before Publication
          </p>

          <h2
            id="cookie-preparation-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Preparing Accurate Cookie Information
          </h2>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {preparationSteps.map((step) => (
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

      {/* 6. RELATED INFORMATION */}
      <section
        aria-labelledby="related-information-title"
        className="px-5 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
            Related Information
          </p>

          <h2
            id="related-information-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Privacy and Website Information
          </h2>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Link
              href="/privacy-policy"
              className="flex min-h-36 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Policy Status
              </span>

              <span className="mt-5 flex items-center justify-between gap-3 font-serif text-2xl">
                Privacy Policy
                <Arrow />
              </span>
            </Link>

            <Link
              href="/contact"
              className="flex min-h-36 flex-col justify-between rounded-xl border border-[#D9C8B0] bg-[#F3EBDF] p-7 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#C59A45] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#A94C19]">
                Company Information
              </span>

              <span className="mt-5 flex items-center justify-between gap-3 font-serif text-2xl">
                Contact Bark Ornament
                <Arrow />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA — READ-ONLY */}
      <section
        aria-labelledby="cookie-cta-title"
        className="bg-[#30251F] px-5 py-16 text-center text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Bark Ornament
          </p>

          <h2
            id="cookie-cta-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Need to Contact Our Team?
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Our Contact page provides existing company
            contact information. Any privacy-specific
            request process must be confirmed in the
            approved privacy documentation.
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
        </div>
      </section>
    </main>
  );
}
