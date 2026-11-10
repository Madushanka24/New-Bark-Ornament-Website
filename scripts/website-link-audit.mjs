/**
 * BARK ORNAMENT — FILE 96
 * Read-only internal link audit for a Next.js App Router site.
 *
 * node scripts/website-link-audit.mjs --audit
 * node scripts/website-link-audit.mjs --audit --probe
 * node scripts/website-link-audit.mjs --audit --probe --base=http://127.0.0.1:3000
 *
 * No files are written; no API routes, forms, or external hosts are contacted.
 * Runtime probing issues GET for pages and HEAD for linked static assets only.
 */

import fs from "node:fs";
import path from "node:path";

const argumentsList = process.argv.slice(2);

const allowed = argumentsList.every(
  (arg) =>
    arg === "--audit" ||
    arg === "--probe" ||
    arg.startsWith("--base=")
);

const probe = argumentsList.includes("--probe");
const audit = argumentsList.includes("--audit");

const baseInputs = argumentsList.filter(
  (arg) => arg.startsWith("--base=")
);

if (
  !allowed ||
  !audit ||
  baseInputs.length > 1 ||
  (baseInputs.length && !probe)
) {
  console.error(
    "Usage: node scripts/website-link-audit.mjs --audit [--probe] [--base=http://localhost:3000]"
  );
  process.exit(2);
}

const root = process.cwd();
const appRoot = path.join(root, "src", "app");
const srcRoot = path.join(root, "src");
const publicRoot = path.resolve(root, "public");

const maxRuntimeRequests = 200;

function fileLabel(filename) {
  return path
    .relative(root, filename)
    .split(path.sep)
    .join("/");
}

function filesUnder(folder) {
  if (!fs.existsSync(folder)) return [];

  const output = [];

  const excluded = new Set([
    "node_modules",
    ".next",
    "__tests__",
    "__mocks__",
    "fixtures",
  ]);

  for (const entry of fs.readdirSync(folder, {
    withFileTypes: true,
  })) {
    if (entry.isSymbolicLink()) continue;

    const filename = path.join(folder, entry.name);

    if (
      entry.isDirectory() &&
      !excluded.has(entry.name)
    ) {
      output.push(...filesUnder(filename));
    } else if (
      entry.isFile() &&
      /\.(?:tsx|jsx|ts|js)$/.test(entry.name) &&
      !/(?:\.d\.ts|\.(?:test|spec|stories)\.[jt]sx?)$/.test(
        entry.name
      )
    ) {
      output.push(filename);
    }
  }

  return output;
}

function routeForPage(file) {
  const relativeFolder = path.relative(
    appRoot,
    path.dirname(file)
  );

  const segments =
    relativeFolder === ""
      ? []
      : relativeFolder.split(path.sep);

  // Route groups and parallel slots are not URL segments.
  const publicSegments = segments.filter(
    (segment) =>
      !/^\(.*\)$/.test(segment) &&
      !segment.startsWith("@")
  );

  return "/" + publicSegments.join("/");
}

function regexEscape(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

function matcherForRoute(route) {
  if (route === "/") return /^\/$/;

  let expression = "^";

  for (const segment of route.slice(1).split("/")) {
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) {
      expression += "(?:/.*)?";
    } else if (/^\[\.\.\.[^\]]+\]$/.test(segment)) {
      expression += "/.+";
    } else if (/^\[[^\]]+\]$/.test(segment)) {
      expression += "/[^/]+";
    } else {
      expression += "/" + regexEscape(segment);
    }
  }

  return new RegExp(expression + "$");
}

function cleanPathname(value) {
  try {
    const pathname = new URL(
      value,
      "http://audit.invalid"
    ).pathname;

    return pathname === "/"
      ? "/"
      : pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function sourceLinkOccurrences(file, source) {
  const occurrences = [];

  // Finds static JSX href values and object properties
  // such as href="/about" or href: "/about".
  const pattern =
    /\bhref\s*(?:=|:)\s*(?:\{\s*)?(["'`])([^"'`]*?)\1/g;

  for (const match of source.matchAll(pattern)) {
    const href = match[2];

    if (href.includes("${")) continue;

    if (
      !href.startsWith("/") &&
      !href.startsWith("#")
    ) {
      continue;
    }

    const line = source
      .slice(0, match.index)
      .split("\n").length;

    occurrences.push({
      href,
      file,
      line,
    });
  }

  return occurrences;
}

function isApi(pathname) {
  return (
    pathname === "/api" ||
    pathname.startsWith("/api/")
  );
}

function isAsset(pathname) {
  return /\.(?:pdf|zip|png|jpg|jpeg|gif|webp|svg|ico|avif|webmanifest|txt|csv|docx?|xlsx?|pptx?|mp4|webm)$/i.test(
    pathname
  );
}

function publicAssetExists(pathname) {
  let decoded;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }

  const target = path.resolve(
    publicRoot,
    decoded.replace(/^\/+/, "")
  );

  if (!target.startsWith(publicRoot + path.sep)) {
    return false;
  }

  return (
    fs.existsSync(target) &&
    fs.statSync(target).isFile()
  );
}

function hrefDetails(href) {
  if (href.startsWith("//")) {
    return { kind: "external" };
  }

  if (
    !href.startsWith("/") &&
    !href.startsWith("#")
  ) {
    return { kind: "external" };
  }

  try {
    const url = new URL(
      href,
      "http://audit.invalid/"
    );

    const pathname = cleanPathname(url.pathname);

    if (!pathname) {
      return { kind: "invalid" };
    }

    if (isApi(pathname)) {
      return { kind: "api" };
    }

    return {
      kind: "internal",
      pathname,
      fragment: url.hash.slice(1),
      search: url.search,
    };
  } catch {
    return { kind: "invalid" };
  }
}

function literalAnchorFound(source, fragment) {
  if (!fragment) return true;

  let decoded = fragment;

  try {
    decoded = decodeURIComponent(fragment);
  } catch {
    // Retain the original fragment.
  }

  return (
    source.includes(`id="${decoded}"`) ||
    source.includes(`id='${decoded}'`)
  );
}

function htmlDecode(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (entity, n) => {
      const point = Number(n);

      return point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : entity;
    })
    .replace(
      /&#x([0-9a-f]+);/gi,
      (entity, n) => {
        const point = Number.parseInt(n, 16);

        return point >= 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : entity;
      }
    );
}

function renderedLinks(html) {
  const results = [];

  const pattern =
    /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi;

  for (const match of html.matchAll(pattern)) {
    results.push(htmlDecode(match[2]));
  }

  return results;
}

async function main() {
  console.log("FILE_96: WEBSITE_LINK_AUDIT");
  console.log("PROJECT_ROOT: " + root);

  console.log(
    "MODE: " +
      (probe
        ? "STATIC_PLUS_LOCALHOST_PROBE"
        : "STATIC_ONLY")
  );

  console.log(
    "READ_ONLY: no project files are written"
  );

  if (!fs.existsSync(appRoot)) {
    console.error(
      "ERROR: src/app was not found. Run from the website project root."
    );

    process.exitCode = 1;
    return;
  }

  // ======================================
  // 1. DISCOVER NEXT.JS APP ROUTER PAGES
  // ======================================

  const sources = filesUnder(srcRoot);

  const pageFiles = sources.filter(
    (file) =>
      file.startsWith(appRoot + path.sep) &&
      /[/\\]page\.(?:tsx|jsx|ts|js)$/.test(file)
  );

  const routeFiles = new Map();
  const dynamicRoutes = [];

  for (const file of pageFiles) {
    const route = routeForPage(file);

    if (route.includes("[")) {
      dynamicRoutes.push({
        route,
        file,
        matches: matcherForRoute(route),
      });
    } else {
      routeFiles.set(route, file);
    }
  }

  function resolvePage(pathname) {
    if (routeFiles.has(pathname)) {
      return routeFiles.get(pathname);
    }

    return (
      dynamicRoutes.find((item) =>
        item.matches.test(pathname)
      )?.file ?? null
    );
  }

  console.log(
    `PAGES_FOUND: ${pageFiles.length}`
  );

  console.log(
    `SOURCE_FILES_SCANNED: ${sources.length}`
  );

  for (const [route, file] of [...routeFiles].sort(
    ([a], [b]) => a.localeCompare(b)
  )) {
    console.log(
      `ROUTE: ${route} -> ${fileLabel(file)}`
    );
  }

  for (const item of dynamicRoutes) {
    console.log(
      `DYNAMIC_ROUTE: ${item.route} -> ${fileLabel(item.file)}`
    );
  }

  // ======================================
  // 2. CHECK STATIC INTERNAL LINKS
  // ======================================

  const sourceByFile = new Map(
    sources.map((file) => [
      file,
      fs.readFileSync(file, "utf8"),
    ])
  );

  const occurrences = sources.flatMap((file) =>
    sourceLinkOccurrences(
      file,
      sourceByFile.get(file)
    )
  );

  const dynamicExpressions = sources.reduce(
    (sum, file) => {
      const source = sourceByFile.get(file);

      return (
        sum +
        [
          ...source.matchAll(
            /\bhref\s*=\s*\{\s*(?!["'`])/g
          ),
        ].length
      );
    },
    0
  );

  let checked = 0;
  let resolved = 0;
  let potentialMissing = 0;
  let anchorReview = 0;
  let assetsFound = 0;
  let skipped = 0;

  const candidates = new Set(["/"]);

  for (const {
    href,
    file,
    line,
  } of occurrences) {
    const details = hrefDetails(href);

    if (details.kind !== "internal") {
      skipped += 1;
      continue;
    }

    checked += 1;

    const pathname = href.startsWith("#")
      ? routeForPage(file)
      : details.pathname;

    const page = href.startsWith("#")
      ? pageFiles.includes(file)
        ? file
        : null
      : resolvePage(pathname);

    const asset =
      isAsset(pathname) &&
      publicAssetExists(pathname);

    if (page || asset) {
      resolved += 1;

      if (asset) {
        assetsFound += 1;
      }

      if (
        page &&
        details.fragment &&
        !literalAnchorFound(
          sourceByFile.get(page),
          details.fragment
        )
      ) {
        anchorReview += 1;

        console.log(
          `REVIEW_ANCHOR: ${fileLabel(file)}:${line} ${href} (target may be generated dynamically)`
        );
      }
    } else if (
      href.startsWith("#") &&
      !page
    ) {
      anchorReview += 1;

      console.log(
        `REVIEW_ANCHOR: ${fileLabel(file)}:${line} ${href} (cannot infer owner page from shared component)`
      );
    } else {
      potentialMissing += 1;

      console.log(
        `POTENTIAL_MISSING: ${fileLabel(file)}:${line} -> ${href} (check rewrites or runtime)`
      );
    }

    if (
      !href.startsWith("#") &&
      !isApi(pathname)
    ) {
      candidates.add(
        pathname + (details.search ?? "")
      );
    }
  }

  console.log(
    `STATIC_SUMMARY: links=${checked} resolved=${resolved} potential_missing=${potentialMissing} anchor_review=${anchorReview} assets_found=${assetsFound} skipped=${skipped} dynamic_expressions=${dynamicExpressions}`
  );

  console.log(
    "NOTE: Dynamic href expressions and links generated at runtime need the optional localhost probe."
  );

  if (!probe) {
    console.log(
      "AUDIT_COMPLETE: Static review finished; no HTTP requests made."
    );

    if (potentialMissing > 0) {
      process.exitCode = 1;
    }

    return;
  }

  // ======================================
  // 3. RESTRICT PROBING TO LOCALHOST
  // ======================================

  const input =
    baseInputs[0]?.slice("--base=".length) ||
    "http://localhost:3000";

  let base;

  try {
    base = new URL(input);
  } catch {
    console.error(
      "ERROR: Invalid --base URL."
    );

    process.exitCode = 1;
    return;
  }

  if (
    base.protocol !== "http:" ||
    ![
      "localhost",
      "127.0.0.1",
      "[::1]",
    ].includes(base.hostname) ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  ) {
    console.error(
      "ERROR: --base must be a local HTTP origin, e.g. http://localhost:3000"
    );

    process.exitCode = 1;
    return;
  }

  // ======================================
  // 4. CRAWL RENDERED INTERNAL PAGE LINKS
  // ======================================

  const queue = [];
  const scheduled = new Set();
  const seen = new Set();

  let externalSkipped = 0;
  let apiSkipped = 0;
  let httpFailures = 0;
  let httpReviews = 0;
  let httpSuccess = 0;

  function enqueue(raw) {
    let url;

    try {
      url = new URL(raw, base);
    } catch {
      return;
    }

    if (
      url.origin !== base.origin ||
      !["http:", "https:"].includes(
        url.protocol
      )
    ) {
      externalSkipped += 1;
      return;
    }

    if (
      isApi(url.pathname) ||
      url.pathname.startsWith("/_next/")
    ) {
      apiSkipped += 1;
      return;
    }

    url.hash = "";

    const key = url.pathname + url.search;

    if (!scheduled.has(key)) {
      scheduled.add(key);
      queue.push(key);
    }
  }

  for (const route of routeFiles.keys()) {
    enqueue(route);
  }

  for (const candidate of candidates) {
    enqueue(candidate);
  }

  console.log(
    `PROBE_BASE: ${base.origin} (GET pages / HEAD assets; redirects kept local)`
  );

  while (
    queue.length &&
    seen.size < maxRuntimeRequests
  ) {
    const target = queue.shift();

    if (seen.has(target)) {
      continue;
    }

    seen.add(target);

    const pathname = new URL(
      target,
      base
    ).pathname;

    const method = isAsset(pathname)
      ? "HEAD"
      : "GET";

    try {
      const response = await fetch(
        new URL(target, base),
        {
          method,
          redirect: "manual",
          signal: AbortSignal.timeout(12000),
          headers: {
            accept:
              method === "GET"
                ? "text/html"
                : "*/*",
          },
        }
      );

      // Handle redirects without leaving localhost.
      if (
        response.status >= 300 &&
        response.status < 400
      ) {
        const location =
          response.headers.get("location");

        if (location) {
          const destination = new URL(
            location,
            new URL(target, base)
          );

          console.log(
            `REDIRECT: ${target} (${response.status}) -> ${location}`
          );

          if (
            destination.origin !== base.origin ||
            isApi(destination.pathname)
          ) {
            httpReviews += 1;

            console.log(
              "REVIEW_HTTP: Redirect target not eligible for local crawling"
            );
          } else if (
            destination.pathname +
              destination.search ===
            target
          ) {
            httpReviews += 1;

            console.log(
              `REVIEW_HTTP: Self-redirect for ${target}`
            );
          } else {
            enqueue(destination.toString());
          }
        } else {
          httpReviews += 1;

          console.log(
            `REVIEW_HTTP: ${target} redirect without Location`
          );
        }

        continue;
      }

      if (
        method === "HEAD" &&
        response.status === 405
      ) {
        httpReviews += 1;

        console.log(
          `REVIEW_HTTP: ${target} HEAD not supported (405)`
        );

        continue;
      }

      if (!response.ok) {
        httpFailures += 1;

        console.log(
          `BROKEN_HTTP: ${target} -> ${response.status}`
        );

        continue;
      }

      httpSuccess += 1;

      console.log(
        `PASS_HTTP: ${target} -> ${response.status}`
      );

      if (method === "GET") {
        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        if (
          contentType.includes("text/html")
        ) {
          const html = await response.text();

          for (const href of renderedLinks(html)) {
            enqueue(href);
          }
        } else {
          httpReviews += 1;

          console.log(
            `REVIEW_HTTP: ${target} returned ${
              contentType ||
              "unknown content type"
            }`
          );
        }
      }
    } catch (error) {
      httpFailures += 1;

      console.log(
        `BROKEN_HTTP: ${target} -> ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }
  }

  // ======================================
  // 5. SUMMARY
  // ======================================

  const capped = queue.length > 0;

  if (capped) {
    httpReviews += 1;

    console.log(
      `REVIEW_LIMIT: Crawl stopped at ${maxRuntimeRequests} unique requests; ${queue.length} queued links were not tested.`
    );
  }

  console.log(
    `PROBE_SUMMARY: tested=${seen.size} success=${httpSuccess} broken=${httpFailures} review=${httpReviews} external_skipped=${externalSkipped} api_skipped=${apiSkipped}`
  );

  console.log(
    "AUDIT_COMPLETE: Source and localhost checks finished; no project files were modified."
  );

  if (
    httpFailures ||
    httpReviews ||
    capped
  ) {
    process.exitCode = 1;
  }
}

await main();
