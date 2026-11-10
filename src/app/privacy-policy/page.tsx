
import type { Metadata } from "next";
import Link from "next/link";

/**
 * BARK ORNAMENT — FILE 93
 *
 * Privacy Policy — Pre-publication Page
 *
 * Route: /privacy-policy
 *
 * IMPORTANT:
 * This is NOT a final approved legal policy.
 *
 * The company's actual website data practices,
 * privacy contacts, retention rules and legal
 * obligations must be verified before publication.
 *
 * No forms, API calls, database access,
 * quotation submissions or email delivery.
 */

export const metadata: Metadata = {
  title: "Privacy Policy | Bark Ornament",
  description:
    "Information about the publication status of Bark Ornament's website privacy policy.",
  robots: {
    index: false,
    follow: true,
  },
};

const reviewTopics = [
  {
    number: "01",
    title: "Information Collected",
    description:
      "Confirm what information is received through the website, quotation workflow, technical logs and any integrated services.",
  },
  {
    number: "02",
    title: "How Information Is Used",
    description:
      "Document the actual purposes for processing information and identify the applicable legal bases where required.",
  },
  {
    number: "03",
    title: "Cookies and Analytics",
    description:
      "Verify whether essential storage, analytics, consent tools or other tracking technologies are used.",
  },
  {
    number: "04",
    title: "Storage and Retention",
    description:
      "Confirm how information is stored, protected and retained, including relevant deletion procedures.",
  },
  {
    number: "05",
    title: "Service Providers and Transfers",
    description:
      "Identify relevant hosting, security, communication and other providers, together with any applicable international data transfers.",
  },
  {
    number: "06",
    title: "Privacy Requests and Contact",
    description:
      "Confirm the appropriate privacy contact and how applicable access, correction, deletion or other requests should be handled.",
  },
] as const;

const approvalSteps = [
  {
    number: "01",
    title: "Verify Website Operations",
    description:
      "Review the actual production configuration, including quotation handling, cookies, hosting logs and integrations.",
  },
  {
    number: "02",
    title: "Approve the Legal Content",
    description:
      "Have the company confirm the policy statements, contact details and applicable legal requirements.",
  },
  {
    number: "03",
    title: "Publish the Approved Policy",
    description:
      "Replace this placeholder with the approved text, add its effective date and review search-indexing settings.",
  },
] as const;

function Arrow() {
  return (
    <span aria-hidden="true">→</span>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#30251F]">
      {/* HERO */}
      <section
        aria-labelledby="privacy-title"
        className="relative overflow-hidden bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-40 h-96 w-96 rounded-full border border-[#C59A45]/25"
        />

        <div className="relative mx-auto max-w-6xl">
          <nav
            aria-label="Breadcrumb"
            className="text-sm text-[#E9DDC9]"
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

              <li
                aria-current="page"
                className="text-white"
              >
                Privacy Policy
              </li>
            </ol>
          </nav>

          <p className="mt-12 text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Bark Ornament · Legal Information
          </p>

          <h1
            id="privacy-title"
            className="mt-5 font-serif text-4xl leading-tight sm:text-5xl"
          >
            Privacy Policy
          </h1>

          <p className="mt-6 max-w-3xl text-base leading-8 text-[#E9DDC9] sm:text-lg">
            Information about the status of our website
            privacy documentation.
          </p>

          <div className="mt-8 inline-flex items-center gap-3 rounded-md border border-[#C59A45]/45 bg-[#49372C] px-5 py-3">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-[#E3B65D]"
            />

            <span className="text-sm font-semibold text-[#F5E6C8]">
              Policy under review
            </span>
          </div>
        </div>
      </section>

      {/* PUBLICATION NOTICE */}
      <section
        aria-labelledby="publication-status-title"
        className="px-5 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl border border-[#D9C8B0] bg-white p-7 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A94C19]">
              Publication Status
            </p>

            <h2
              id="publication-status-title"
              className="mt-4 font-serif text-2xl leading-tight sm:text-3xl"
            >
              Privacy Documentation in Preparation
            </h2>

            <p className="mt-5 max-w-4xl text-base leading-8 text-[#66584F]">
              Bark Ornament (Pvt) Ltd&apos;s website
              privacy policy has not yet been finalised
              and approved for publication.
            </p>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-[#74675E]">
              This page is a temporary information
              placeholder, not an approved privacy
              notice or a complete statement of the
              company&apos;s data-processing practices.
              The final policy must reflect the actual
              operation of the website and relevant
              company procedures.
            </p>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-[#74675E]">
              No personal-information collection form
              is included on this page.
            </p>
          </div>
        </div>
      </section>

      {/* CONTENT REQUIRING VERIFICATION */}
      <section
        aria-labelledby="privacy-topics-title"
        className="border-y border-[#E0D2BF] bg-[#F3EBDF] px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Policy Preparation
          </p>

          <h2
            id="privacy-topics-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Information Being Reviewed
          </h2>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#74675E]">
            The following subjects must be verified
            before the company publishes its final
            privacy policy. They describe the review
            requirements, not confirmed website practices.
          </p>

          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {reviewTopics.map((topic) => (
              <article
                key={topic.number}
                className="rounded-xl border border-[#D9C8B0] bg-[#FAF7F0] p-7 shadow-sm sm:p-8"
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

                <p className="mt-4 text-sm leading-7 text-[#74675E]">
                  {topic.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* APPROVAL ROADMAP */}
      <section
        aria-labelledby="approval-title"
        className="px-5 py-16 sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A94C19]">
            Before Publication
          </p>

          <h2
            id="approval-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Finalising the Privacy Policy
          </h2>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {approvalSteps.map((step) => (
              <article
                key={step.number}
                className="rounded-xl border border-[#D9C8B0] bg-white p-7"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-4xl text-[#A87935]"
                >
                  {step.number}
                </span>

                <h3 className="mt-5 font-serif text-2xl leading-snug">
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

      {/* CONTACT */}
      <section
        aria-labelledby="privacy-contact-title"
        className="bg-[#30251F] px-5 py-16 text-[#FAF7F0] sm:px-8 sm:py-20"
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Contact Bark Ornament
          </p>

          <h2
            id="privacy-contact-title"
            className="mt-4 font-serif text-3xl leading-tight sm:text-4xl"
          >
            Need to Contact Our Team?
          </h2>

          <p className="mt-5 text-base leading-8 text-[#E9DDC9]">
            Our Contact page provides the company&apos;s
            existing contact information. The appropriate
            privacy-specific contact and request process
            will be confirmed in the approved policy.
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
