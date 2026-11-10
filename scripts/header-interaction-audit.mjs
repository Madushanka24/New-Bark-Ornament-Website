/**
 * BARK ORNAMENT — FILE 92
 *
 * Header, Mobile Navigation & Basket Audit
 *
 * Usage:
 * node scripts/header-interaction-audit.mjs --audit
 *
 * READ-ONLY:
 * - No existing files are changed.
 * - No modules are imported from the website.
 * - No browser or database requests are made.
 * - No quotation submissions or emails are sent.
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

if (args.length !== 1 || args[0] !== "--audit") {
  console.error(
    "Usage: node scripts/header-interaction-audit.mjs --audit"
  );
  process.exitCode = 2;
} else {
  const root = process.cwd();

  const headerPath = path.join(
    root,
    "src",
    "components",
    "Header.tsx"
  );

  const footerPath = path.join(
    root,
    "src",
    "components",
    "Footer.tsx"
  );

  const envPath = path.join(root, ".env.local");

  function report(status, name, description) {
    console.log(
      `${status} ${name}: ${description}`
    );
  }

  function containsAny(source, patterns) {
    return patterns.some((pattern) =>
      pattern.test(source)
    );
  }

  function extractStaticHrefs(source) {
    const values = new Set();

    // Recognises:
    // href="/about"
    // href: "/about"
    // href={"/about"}
    //
    // Does not attempt to evaluate dynamic JavaScript.
    const pattern =
      /\bhref\s*(?:=|:)\s*(?:\{\s*)?(["'])(\/[^"']*)\1/g;

    for (const match of source.matchAll(pattern)) {
      values.add(match[2]);
    }

    return [...values].sort();
  }

  function readFile(file) {
    return fs.existsSync(file)
      ? fs.readFileSync(file, "utf8")
      : null;
  }

  console.log(
    "FILE_92: HEADER_INTERACTION_AUDIT"
  );

  console.log("PROJECT_ROOT: " + root);
  console.log("AUDIT_MODE: READ_ONLY");

  const header = readFile(headerPath);

  if (header === null) {
    report(
      "FAIL",
      "HEADER",
      "src/components/Header.tsx not found"
    );

    process.exitCode = 1;
  } else {
    report(
      "PASS",
      "HEADER",
      "src/components/Header.tsx found"
    );

    console.log(
      "HEADER_LINES: " + header.split(/\r?\n/).length
    );

    // 1. Inspect existing navigation destinations.
    const hrefs = extractStaticHrefs(header);

    console.log(
      "STATIC_HEADER_LINKS: " +
      (hrefs.length ? hrefs.join(", ") : "None detected")
    );

    const expectedRoutes = [
      "/",
      "/about",
      "/products",
      "/hospitality-solutions",
      "/markets",
      "/gallery",
      "/insights",
      "/contact",
    ];

    for (const route of expectedRoutes) {
      if (hrefs.includes(route)) {
        report(
          "FOUND",
          `HEADER_ROUTE ${route}`,
          "Static link detected"
        );
      } else {
        report(
          "REVIEW",
          `HEADER_ROUTE ${route}`,
          "Not detected as a static href; " +
          "may be generated dynamically"
        );
      }
    }

    // 2. Inspect mobile menu implementation hints.
    const mobilePatterns = [
      /\bmobile\b/i,
      /\bmenuOpen\b/i,
      /\bisMenuOpen\b/i,
      /\bsetMenuOpen\b/i,
      /\bsetIsMenuOpen\b/i,
      /\bMenuButton\b/,
    ];

    report(
      containsAny(header, mobilePatterns)
        ? "FOUND"
        : "REVIEW",
      "MOBILE_MENU",
      "Mobile menu implementation marker " +
      (
        containsAny(header, mobilePatterns)
          ? "detected"
          : "not detected in Header.tsx"
      )
    );

    // 3. Accessibility implementation hints.
    const accessibilityChecks = [
      {
        name: "ARIA_LABELS",
        patterns: [/\baria-label\s*=/],
      },
      {
        name: "ARIA_EXPANDED",
        patterns: [/\baria-expanded\s*=/],
      },
      {
        name: "ARIA_CONTROLS",
        patterns: [/\baria-controls\s*=/],
      },
      {
        name: "KEYBOARD_FOCUS",
        patterns: [
          /focus-visible:/,
          /focus-within:/,
        ],
      },
      {
        name: "ACTIVE_PAGE",
        patterns: [
          /\baria-current\s*=/,
          /\busePathname\s*\(/,
          /\bpathname\s*===/,
          /\bisActive\b/,
        ],
      },
      {
        name: "ESCAPE_HANDLING",
        patterns: [
          /\bEscape\b/,
          /\bEsc\b/,
        ],
      },
      {
        name: "REDUCED_MOTION",
        patterns: [
          /\bmotion-reduce:/,
          /\bMotionConfig\b/,
          /prefers-reduced-motion/,
        ],
      },
    ];

    for (const check of accessibilityChecks) {
      const detected = containsAny(
        header,
        check.patterns
      );

      report(
        detected ? "FOUND" : "REVIEW",
        check.name,
        detected
          ? "Source marker detected"
          : "Not detected in Header.tsx; " +
            "may be handled by a child component " +
            "or shared CSS"
      );
    }

    // 4. Inspect quotation-basket integration hints.
    const basketPatterns = [
      /\bQuoteBasket\b/,
      /\bQuoteBasketProvider\b/,
      /\buseQuoteBasket\b/,
      /\bBasketCount\b/,
      /\bQuoteBasketButton\b/,
      /\bquotationBasket\b/i,
      /\bquoteBasket\b/i,
    ];

    report(
      containsAny(header, basketPatterns)
        ? "FOUND"
        : "REVIEW",
      "QUOTE_BASKET_INTEGRATION",
      containsAny(header, basketPatterns)
        ? "Basket integration marker detected"
        : "No basket integration marker detected " +
          "in Header.tsx; inspect related components"
    );

    // 5. Show local component imports for review.
    const importPattern =
      /from\s+["']([^"']+)["']/g;

    const componentImports = new Set();

    for (const match of header.matchAll(importPattern)) {
      const target = match[1];

      if (
        target.startsWith("@/components/") ||
        target.startsWith("./") ||
        target.startsWith("../")
      ) {
        componentImports.add(target);
      }
    }

    console.log(
      "HEADER_COMPONENT_IMPORTS: " +
      (
        componentImports.size
          ? [...componentImports].sort().join(", ")
          : "None detected"
      )
    );

    // 6. Confirm existing footer corrections if present.
    const footer = readFile(footerPath);

    if (footer === null) {
      report(
        "REVIEW",
        "FOOTER",
        "Footer.tsx not found"
      );
    } else {
      const footerHrefs = extractStaticHrefs(footer);

      for (const [oldRoute, newRoute] of [
        ["/news", "/insights/news"],
        ["/downloads", "/insights/downloads"],
      ]) {
        const corrected =
          footerHrefs.includes(newRoute) &&
          !footerHrefs.includes(oldRoute);

        report(
          corrected ? "PASS" : "REVIEW",
          `FOOTER_ROUTE ${newRoute}`,
          corrected
            ? "Correct destination found; " +
              "legacy destination absent"
            : "Footer correction not confirmed"
        );
      }
    }

    // 7. Check only the known safety flags.
    // Never print unrelated environment variables.
    const envText = readFile(envPath) ?? "";

    const flags = [
      "QUOTATION_SUBMISSIONS_ENABLED",
      "QUOTATION_E2E_TEST_MODE",
      "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
    ];

    for (const name of flags) {
      const escaped = name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const pattern = new RegExp(
        `^\\s*${escaped}\\s*=\\s*(.+?)\\s*$`,
        "m"
      );

      const match = envText.match(pattern);

      const value = match?.[1]
        ?.trim()
        .replace(/^(["'])(.*)\1$/, "$2");

      const disabled =
        value?.toLowerCase() === "false";

      report(
        disabled ? "PASS" : "REVIEW",
        `SAFETY ${name}`,
        disabled
          ? "disabled"
          : "not confirmed disabled"
      );
    }

    console.log(
      "IMPORTANT: FOUND means a source marker was " +
      "detected. It does not prove correct runtime behavior."
    );

    console.log(
      "MANUAL_TESTS: Verify desktop/mobile menus, " +
      "Escape handling, keyboard focus, active links, " +
      "basket count and reduced motion in a browser."
    );

    console.log(
      "AUDIT_COMPLETE: No existing files were modified."
    );
  }
}
