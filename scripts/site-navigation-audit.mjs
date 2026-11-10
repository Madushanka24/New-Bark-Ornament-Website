/**
 * BARK ORNAMENT — FILE 89
 *
 * Read-only Global Navigation & Route Audit
 *
 * Run from the project root:
 *
 * node scripts/site-navigation-audit.mjs --audit
 *
 * No dependencies beyond Node.js.
 * Does not create, edit or delete project files.
 * Does not connect to PostgreSQL.
 * Does not submit quotations or send emails.
 */

import fs from "node:fs";
import path from "node:path";

if (process.argv.slice(2).some((arg) => arg !== "--audit")) {
  console.error(
    "Usage: node scripts/site-navigation-audit.mjs --audit"
  );

  process.exitCode = 2;
} else {
  const root = process.cwd();

  const appRoot = path.join(root, "src", "app");
  const srcRoot = path.join(root, "src");

  const relative = (file) =>
    path.relative(root, file).split(path.sep).join("/");

  const sourceExtensions = /\.(?:tsx|jsx|ts|js)$/i;

  function collectFiles(folder) {
    if (!fs.existsSync(folder)) {
      return [];
    }

    const found = [];

    for (const entry of fs.readdirSync(folder, {
      withFileTypes: true,
    })) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const full = path.join(folder, entry.name);

      if (entry.isDirectory()) {
        if (
          entry.name !== "node_modules" &&
          entry.name !== ".next"
        ) {
          found.push(...collectFiles(full));
        }
      } else if (
        entry.isFile() &&
        sourceExtensions.test(entry.name)
      ) {
        found.push(full);
      }
    }

    return found;
  }

  function pageRoute(file) {
    const folder = path.relative(
      appRoot,
      path.dirname(file)
    );

    const segments =
      folder === "" ? [] : folder.split(path.sep);

    const publicSegments = segments.filter(
      (segment) => {
        // Route groups do not appear in the URL.
        if (/^\(.*\)$/.test(segment)) {
          return false;
        }

        // Parallel route slots are not URL segments.
        if (segment.startsWith("@")) {
          return false;
        }

        return true;
      }
    );

    return "/" + publicSegments.join("/");
  }

  function normaliseUrl(url) {
    const pathname = url.split(/[?#]/, 1)[0] || "/";

    return pathname === "/"
      ? "/"
      : pathname.replace(/\/+$/, "");
  }

  function findStaticHrefs(source) {
    const links = new Set();

    const pattern =
      /\bhref\s*(?:=|:)\s*(?:\{\s*)?(['"`])(\/[^'"`\s}]+)\1/g;

    for (const match of source.matchAll(pattern)) {
      if (!match[2].includes("${")) {
        links.add(normaliseUrl(match[2]));
      }
    }

    return [...links].sort();
  }

  const checkedRoutes = [
    "/",
    "/about",
    "/products",
    "/solutions",
    "/markets",
    "/gallery",
    "/insights",
    "/insights/news",
    "/insights/knowledge",
    "/insights/downloads",
    "/contact",
    "/request-quotation",
  ];

  console.log(
    "FILE_89: READ_ONLY_NAVIGATION_AUDIT"
  );

  console.log("PROJECT_ROOT: " + root);

  if (!fs.existsSync(appRoot)) {
    console.log(
      "REVIEW APP_ROUTER: src/app not found. " +
      "Run from the correct project root."
    );

    process.exitCode = 1;
  } else {
    const allSourceFiles = collectFiles(srcRoot);

    const pageFiles = allSourceFiles.filter(
      (file) =>
        /[/\\]page\.(?:tsx|jsx|ts|js)$/i.test(file) &&
        file.startsWith(appRoot + path.sep)
    );

    const routes = new Map();

    for (const file of pageFiles) {
      const route = pageRoute(file);

      if (!routes.has(route)) {
        routes.set(route, relative(file));
      }
    }

    console.log(
      "ROUTE_PAGES_FOUND: " + pageFiles.length
    );

    // Check the expected public website pages.
    for (const route of checkedRoutes) {
      const location = routes.get(route);

      console.log(
        `${location ? "PASS" : "REVIEW"} ROUTE ${route}: ` +
          (
            location ??
            "No matching App Router page found"
          )
      );
    }

    // Discover likely shared navigation components.
    const candidates = [];

    for (const file of allSourceFiles) {
      const name = path.basename(file);
      const rel = relative(file);

      const namedNavigation =
        /(header|navbar|navigation|main[-_]?nav|site[-_]?nav|mobile[-_]?menu|topbar)/i.test(
          name
        );

      const isLayout =
        /[/\\]layout\.(?:tsx|jsx|ts|js)$/i.test(
          file
        );

      const isShared =
        rel.startsWith("src/components/");

      if (
        !namedNavigation &&
        !isLayout &&
        !isShared
      ) {
        continue;
      }

      const source = fs.readFileSync(
        file,
        "utf8"
      );

      const hasHeader =
        /<header\b/i.test(source);

      const hasNav =
        /<nav\b/i.test(source);

      const links = findStaticHrefs(source);

      const score =
        (namedNavigation ? 5 : 0) +
        (hasHeader ? 4 : 0) +
        (hasNav ? 3 : 0) +
        (isLayout ? 1 : 0) +
        Math.min(links.length, 4);

      if (score >= 4) {
        candidates.push({
          rel,
          source,
          links,
          score,
        });
      }
    }

    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        a.rel.localeCompare(b.rel)
    );

    console.log(
      "NAV_CANDIDATES_FOUND: " +
        candidates.length
    );

    for (const candidate of candidates.slice(
      0,
      8
    )) {
      console.log(
        `NAV_SOURCE: ${candidate.rel} ` +
          `(score ${candidate.score})`
      );

      console.log(
        "NAV_STATIC_LINKS: " +
          (
            candidate.links.length
              ? candidate.links.join(", ")
              : "none detected"
          )
      );
    }

    if (candidates.length === 0) {
      console.log(
        "REVIEW NAV_SOURCE: Header source not " +
        "found automatically; inspect " +
        "src/app/layout.tsx and its imports."
      );
    }

    const candidateLinks = new Set(
      candidates.flatMap(
        (candidate) => candidate.links
      )
    );

    for (const route of [
      "/solutions",
      "/insights",
    ]) {
      const detected =
        candidateLinks.has(route);

      console.log(
        `${detected ? "FOUND" : "REVIEW"} NAV_LINK ${route}: ` +
          (
            detected
              ? "Static href appears in a navigation " +
                "candidate; test in browser"
              : "Static href not detected; link " +
                "may be generated dynamically"
          )
      );
    }

    // Determine the next development action.
    if (!routes.has("/solutions")) {
      console.log(
        "NEXT_ACTION: A /solutions page was not " +
        "found; verify the Solutions header " +
        "destination before building or " +
        "replacing any header."
      );
    } else {
      console.log(
        "NEXT_ACTION: /solutions exists; " +
        "inspect its content before deciding " +
        "whether it needs a separate " +
        "development milestone."
      );
    }

    // Read only three explicitly known safety flags.
    // Do not print any other environment values.
    const envFile = path.join(
      root,
      ".env.local"
    );

    const requiredFlags = [
      "QUOTATION_SUBMISSIONS_ENABLED",
      "QUOTATION_E2E_TEST_MODE",
      "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
    ];

    const envText = fs.existsSync(envFile)
      ? fs.readFileSync(envFile, "utf8")
      : "";

    for (const flag of requiredFlags) {
      const match = envText.match(
        new RegExp(
          `^\\s*${flag}\\s*=\\s*(.+?)\\s*$`,
          "m"
        )
      );

      const value = match?.[1]
        ?.trim()
        .replace(
          /^(?:"([^"]*)"|'([^']*)')$/,
          "$1$2"
        );

      const disabled = value === "false";

      console.log(
        `${disabled ? "PASS" : "REVIEW"} SAFETY ${flag}: ` +
          (
            disabled
              ? "disabled"
              : "not confirmed disabled"
          )
      );
    }

    console.log(
      "AUDIT_COMPLETE: Read-only checks " +
      "finished; no files changed."
    );

    console.log(
      "MANUAL_CHECKS: Open desktop/mobile menus, " +
      "keyboard focus, cart count, all route " +
      "links, and reduced motion in the browser."
    );
  }
}
