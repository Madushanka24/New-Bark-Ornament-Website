/**
 * BARK ORNAMENT — FILE 104
 * Product catalogue and category photography audit.
 *
 * Read-only. No code execution from the project,
 * network requests or file modifications.
 *
 * Usage:
 * node scripts/catalogue-image-audit.mjs --audit
 */

import fs from "node:fs";
import path from "node:path";

if (
  process.argv.length !== 3 ||
  process.argv[2] !== "--audit"
) {
  console.error(
    "Usage: node scripts/catalogue-image-audit.mjs --audit"
  );
  process.exit(2);
}

const root = process.cwd();
const srcRoot = path.resolve(root, "src");
const appRoot = path.join(srcRoot, "app");
const publicRoot = path.resolve(root, "public");

const catalogueRoots = [
  path.join(appRoot, "products"),
  path.join(appRoot, "categories"),
];

const MAX_FILES = 120;
const MAX_DETAILS = 60;

let failures = 0;
let reviews = 0;
let detailLines = 0;

function report(status, topic, message, detail = false) {
  if (status === "FAIL") failures++;
  if (status === "REVIEW") reviews++;

  if (detail && detailLines++ >= MAX_DETAILS) {
    return;
  }

  console.log(`${status} ${topic}: ${message}`);
}

function relative(file) {
  return path
    .relative(root, file)
    .split(path.sep)
    .join("/");
}

function safeFile(file) {
  try {
    const stat = fs.lstatSync(file);

    return (
      stat.isFile() &&
      !stat.isSymbolicLink()
    );
  } catch {
    return false;
  }
}

/* ==========================================
   1. DISCOVER CATALOGUE SOURCE FILES
   ========================================== */

function sourceFilesUnder(folder) {
  if (!fs.existsSync(folder)) return [];

  const results = [];
  const pending = [folder];

  while (
    pending.length &&
    results.length < MAX_FILES
  ) {
    const current = pending.pop();

    for (const entry of fs.readdirSync(current, {
      withFileTypes: true,
    })) {
      if (entry.isSymbolicLink()) continue;

      const file = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (
          ![
            "node_modules",
            ".next",
            "__tests__",
            "fixtures",
          ].includes(entry.name)
        ) {
          pending.push(file);
        }
      } else if (
        entry.isFile() &&
        /\.[jt]sx?$/.test(entry.name) &&
        !/(?:\.d\.ts|\.(?:test|spec|stories)\.[jt]sx?)$/.test(
          entry.name
        )
      ) {
        results.push(file);
      }
    }
  }

  return results.sort();
}

/* ==========================================
   2. RESOLVE LOCAL SOURCE IMPORTS
   ========================================== */

function resolveImport(from, specifier) {
  const base = specifier.startsWith("@/")
    ? path.resolve(
        srcRoot,
        specifier.slice(2)
      )
    : specifier.startsWith(".")
      ? path.resolve(
          path.dirname(from),
          specifier
        )
      : null;

  if (!base) return null;

  const rel = path.relative(srcRoot, base);

  if (
    rel.startsWith("..") ||
    path.isAbsolute(rel)
  ) {
    return null;
  }

  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
    path.join(base, "index.jsx"),
    path.join(base, "index.js"),
  ];

  return (
    candidates.find((candidate) =>
      safeFile(candidate)
    ) ?? null
  );
}

function collectSources() {
  const queue = catalogueRoots.flatMap(
    sourceFilesUnder
  );

  const initial = queue.length;
  const sources = new Map();

  while (
    queue.length &&
    sources.size < MAX_FILES
  ) {
    const file = queue.shift();

    if (
      sources.has(file) ||
      !safeFile(file)
    ) {
      continue;
    }

    const contents = fs.readFileSync(
      file,
      "utf8"
    );

    sources.set(file, contents);

    const imports =
      /\bfrom\s*["']([^"']+)["']/g;

    for (const match of contents.matchAll(imports)) {
      const dependency = resolveImport(
        file,
        match[1]
      );

      if (
        dependency &&
        !sources.has(dependency) &&
        !queue.includes(dependency)
      ) {
        queue.push(dependency);
      }
    }
  }

  return {
    sources,
    initial,
    truncated: queue.length > 0,
  };
}

function lineAt(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

/* ==========================================
   3. VALIDATE STATIC IMAGE PATHS
   ========================================== */

function imagePathInfo(src) {
  if (
    /^https?:\/\//i.test(src) ||
    src.startsWith("//")
  ) {
    return { type: "remote" };
  }

  if (!src.startsWith("/")) {
    return { type: "other" };
  }

  const pathname = src.split(/[?#]/)[0];

  if (
    !/\.(?:png|jpe?g|webp|avif|gif|svg)$/i.test(
      pathname
    )
  ) {
    return { type: "other" };
  }

  let decoded;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { type: "invalid" };
  }

  const target = path.resolve(
    publicRoot,
    decoded.replace(/^\/+/, "")
  );

  if (
    !target.startsWith(
      publicRoot + path.sep
    )
  ) {
    return { type: "invalid" };
  }

  return {
    type: safeFile(target)
      ? "found"
      : "missing",
    target,
  };
}

/* ==========================================
   4. MAIN AUDIT
   ========================================== */

console.log(
  "FILE_104: CATALOGUE_IMAGE_AUDIT"
);

console.log(`PROJECT_ROOT: ${root}`);

console.log("MODE: STATIC_READ_ONLY");

console.log(
  "NO_NETWORK_NO_FILE_WRITES: true"
);

if (!fs.existsSync(appRoot)) {
  report(
    "FAIL",
    "PROJECT_ROOT",
    "src/app missing; run in website project directory"
  );

  process.exitCode = 1;
} else {
  console.log(
    "\n=== PRODUCT AND CATEGORY ROUTES ==="
  );

  let routeCount = 0;

  for (const base of catalogueRoots) {
    const route =
      "/" +
      path
        .relative(appRoot, base)
        .split(path.sep)
        .join("/");

    if (!fs.existsSync(base)) {
      report(
        route === "/products"
          ? "FAIL"
          : "REVIEW",
        "ROUTE_DIRECTORY",
        `${route} not found`
      );

      continue;
    }

    const pageFiles = sourceFilesUnder(
      base
    ).filter((file) =>
      /[/\\]page\.(?:tsx|jsx|ts|js)$/.test(
        file
      )
    );

    for (const file of pageFiles) {
      const segments = path
        .relative(
          appRoot,
          path.dirname(file)
        )
        .split(path.sep)
        .filter(
          (part) =>
            !/^\(.*\)$/.test(part) &&
            !part.startsWith("@")
        );

      console.log(
        `ROUTE: /${segments.join("/")} -> ${relative(file)}`
      );

      routeCount++;
    }

    if (
      !pageFiles.some(
        (file) =>
          path.dirname(file) === base
      )
    ) {
      report(
        route === "/products"
          ? "FAIL"
          : "REVIEW",
        "ROUTE_PAGE",
        `${route} does not have a root page.tsx/jsx/ts/js`
      );
    }
  }

  console.log(
    "\n=== SOURCE AND PHOTOGRAPHY REVIEW ==="
  );

  const {
    sources,
    initial,
    truncated,
  } = collectSources();

  console.log(
    `CATALOGUE_FILES_FOUND: ${initial}`
  );

  console.log(
    `SOURCE_FILES_INSPECTED: ${sources.size}`
  );

  if (truncated) {
    report(
      "REVIEW",
      "SOURCE_LIMIT",
      `More than ${MAX_FILES} source files; some dependencies not inspected`
    );
  }

  let rawImageTags = 0;
  let approvedImageTags = 0;
  let missingAlt = 0;
  let fillWithoutSizes = 0;
  let dynamicSources = 0;
  let placeholderMarkers = 0;
  let localAssetsFound = 0;
  let localAssetsMissing = 0;
  let remoteReferences = 0;

  const checkedAssets = new Set();

  function checkImageRef(src, location) {
    const info = imagePathInfo(src);

    if (info.type === "other") {
      return;
    }

    if (info.type === "remote") {
      remoteReferences++;

      report(
        "REVIEW",
        "REMOTE_IMAGE",
        `${location} -> ${src.slice(0, 120)} (external image; verify rights, privacy and reliability)`,
        true
      );

      return;
    }

    if (info.type === "invalid") {
      report(
        "FAIL",
        "IMAGE_PATH",
        `${location} -> unsafe or malformed path`,
        true
      );

      return;
    }

    const key = `${location}:${src}`;

    if (checkedAssets.has(key)) {
      return;
    }

    checkedAssets.add(key);

    if (info.type === "found") {
      localAssetsFound++;

      report(
        "FOUND",
        "LOCAL_IMAGE",
        `${location} -> ${src}`,
        true
      );
    } else {
      localAssetsMissing++;

      report(
        "FAIL",
        "MISSING_IMAGE",
        `${location} -> ${src} not found in public/`,
        true
      );
    }
  }

  /* ----------------------------------------
     INSPECT CATALOGUE COMPONENT SOURCES
     ---------------------------------------- */

  for (const [file, source] of sources) {
    const location = relative(file);

    const tagPattern =
      /<(Image|img|ApprovedProductImage)\b[\s\S]*?(?:\/>|>)/g;

    for (const match of source.matchAll(
      tagPattern
    )) {
      const tag = match[0];

      const at =
        `${location}:${lineAt(source, match.index)}`;

      if (
        match[1] ===
        "ApprovedProductImage"
      ) {
        approvedImageTags++;

        if (!/\blabel\s*=/.test(tag)) {
          report(
            "REVIEW",
            "APPROVED_IMAGE_LABEL",
            `${at} has no explicit label prop`,
            true
          );
        }

        continue;
      }

      rawImageTags++;

      if (!/\balt\s*=/.test(tag)) {
        missingAlt++;

        report(
          "FAIL",
          "MISSING_ALT",
          `${at} <${match[1]}> has no alt attribute`,
          true
        );
      }

      if (
        /\bfill(?:\s|\s*=|\b)/.test(
          tag
        ) &&
        !/\bsizes\s*=/.test(tag)
      ) {
        fillWithoutSizes++;

        report(
          "REVIEW",
          "IMAGE_SIZES",
          `${at} uses fill without a sizes prop`,
          true
        );
      }

      const literal = tag.match(
        /\bsrc\s*=\s*(["'])(.*?)\1/s
      );

      if (literal) {
        checkImageRef(
          literal[2],
          at
        );
      } else if (
        /\bsrc\s*=/.test(tag)
      ) {
        dynamicSources++;
      }
    }

    /* --------------------------------------
       STATIC IMAGE REFERENCES IN DATA
       -------------------------------------- */

    const dataPattern =
      /\b(?:src|image|imageSrc|imageUrl|thumbnail|photo|cover)\s*:\s*(["'])(.*?)\1/g;

    for (const match of source.matchAll(
      dataPattern
    )) {
      checkImageRef(
        match[2],
        `${location}:${lineAt(source, match.index)}`
      );
    }

    /* --------------------------------------
       PHOTOGRAPHY PLACEHOLDERS
       -------------------------------------- */

    const lines = source.split(/\r?\n/);

    for (
      let index = 0;
      index < lines.length;
      index++
    ) {
      if (
        /PhotoPlaceholder|Approved photography coming|image placeholder|photo placeholder/i.test(
          lines[index]
        )
      ) {
        placeholderMarkers++;

        report(
          "INFO",
          "PLACEHOLDER",
          `${location}:${index + 1} ${lines[index].trim().slice(0, 100)}`,
          true
        );
      }
    }
  }

  if (
    rawImageTags + approvedImageTags ===
    0
  ) {
    report(
      "REVIEW",
      "IMAGE_IMPLEMENTATION",
      "No literal JSX image components found; inspect runtime catalogue cards"
    );
  }

  if (approvedImageTags === 0) {
    report(
      "INFO",
      "APPROVED_COMPONENT",
      "ApprovedProductImage not detected in inspected catalogue sources; no changes made"
    );
  }

  /* ======================================
     5. PROTECTED SAFETY FLAGS
     ====================================== */

  console.log(
    "\n=== PROTECTED SAFETY FLAGS ==="
  );

  let safety = 0;

  const envPath = path.join(
    root,
    ".env.local"
  );

  const env = safeFile(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";

  for (const name of [
    "QUOTATION_SUBMISSIONS_ENABLED",
    "QUOTATION_E2E_TEST_MODE",
    "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
  ]) {
    const matches = [
      ...env.matchAll(
        new RegExp(
          `^\\s*${name}\\s*=\\s*(.*?)\\s*$`,
          "gm"
        )
      ),
    ];

    const values = matches.map(
      (match) =>
        match[1]
          .trim()
          .replace(
            /^(["'])(.*)\1$/,
            "$2"
          )
          .toLowerCase()
    );

    const disabled =
      values.length === 1 &&
      values[0] === "false";

    if (disabled) safety++;

    report(
      disabled ? "PASS" : "FAIL",
      "SAFETY",
      `${name}: ${
        disabled
          ? "disabled"
          : "not confirmed false exactly once"
      }`
    );
  }

  /* ======================================
     6. FINAL SUMMARY
     ====================================== */

  console.log("\n=== SUMMARY ===");

  console.log(
    `IMAGE_SUMMARY: routes=${routeCount} sources=${sources.size} image_tags=${rawImageTags} approved_components=${approvedImageTags} placeholders=${placeholderMarkers} dynamic_sources=${dynamicSources} local_images=${localAssetsFound} missing_assets=${localAssetsMissing} remote_references=${remoteReferences} missing_alt=${missingAlt} fill_without_sizes=${fillWithoutSizes} safety=${safety}/3`
  );

  console.log(
    `AUDIT_STATUS: ${
      failures === 0
        ? "NO_CONFIRMED_SOURCE_FAILURES"
        : "FAILURES_REQUIRING_REVIEW"
    } (reviews=${reviews}, failures=${failures})`
  );

  console.log(
    "LIMITATION: Source inspection cannot prove rendered image quality, actual dynamic URLs, approvals, or browser accessibility."
  );

  console.log(
    "AUDIT_COMPLETE: No existing files modified; no HTTP requests performed."
  );

  if (failures > 0) {
    process.exitCode = 1;
  }
}
