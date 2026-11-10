/**
 * BARK ORNAMENT — FILE 97
 *
 * Homepage Quality & Design Audit
 *
 * Usage:
 * node scripts/homepage-quality-audit.mjs --audit
 *
 * Read-only source inspection:
 * - Homepage and directly imported local components
 * - Global CSS and shared layout
 * - Hero heading and animation markers
 * - Image references and placeholders
 * - Responsive and accessibility indicators
 * - Quotation and email safety flags
 *
 * No network requests.
 * No database access.
 * No files created, edited or deleted.
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

if (args.length !== 1 || args[0] !== "--audit") {
  console.error(
    "Usage: node scripts/homepage-quality-audit.mjs --audit"
  );

  process.exitCode = 2;
} else {
  runAudit();
}

function runAudit() {
  const root = process.cwd();
  const srcRoot = path.resolve(root, "src");

  const homepage = path.join(
    srcRoot,
    "app",
    "page.tsx"
  );

  const globalCss = path.join(
    srcRoot,
    "app",
    "globals.css"
  );

  const layout = path.join(
    srcRoot,
    "app",
    "layout.tsx"
  );

  const header = path.join(
    srcRoot,
    "components",
    "Header.tsx"
  );

  const footer = path.join(
    srcRoot,
    "components",
    "Footer.tsx"
  );

  const envFile = path.join(root, ".env.local");
  const publicRoot = path.resolve(root, "public");

  const maxImportedFiles = 35;

  function label(file) {
    return path
      .relative(root, file)
      .split(path.sep)
      .join("/");
  }

  function read(file) {
    return fs.existsSync(file) &&
      fs.statSync(file).isFile()
      ? fs.readFileSync(file, "utf8")
      : null;
  }

  function output(status, subject, description) {
    console.log(
      `${status} ${subject}: ${description}`
    );
  }

  function lineNumber(source, index) {
    return (
      source.slice(0, index).split("\n").length
    );
  }

  function shorten(value, length = 160) {
    const flat = value
      .replace(/\s+/g, " ")
      .trim();

    return flat.length > length
      ? flat.slice(0, length) + "..."
      : flat;
  }

  function resolveImport(fromFile, target) {
    let base;

    if (target.startsWith("@/")) {
      base = path.resolve(
        srcRoot,
        target.slice(2)
      );
    } else if (target.startsWith(".")) {
      base = path.resolve(
        path.dirname(fromFile),
        target
      );
    } else {
      return null;
    }

    const relative = path.relative(
      srcRoot,
      base
    );

    if (
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      return null;
    }

    // Inspect UI components, not database/API libraries.
    const isComponent =
      relative.startsWith(
        "components" + path.sep
      );

    const isAppComponent =
      relative.startsWith("app" + path.sep);

    if (!isComponent && !isAppComponent) {
      return null;
    }

    const possibleFiles = [
      base,
      base + ".tsx",
      base + ".jsx",
      base + ".ts",
      base + ".js",
      path.join(base, "index.tsx"),
      path.join(base, "index.jsx"),
    ];

    return (
      possibleFiles.find(
        (file) =>
          fs.existsSync(file) &&
          fs.statSync(file).isFile() &&
          /\.(tsx|jsx|ts|js)$/.test(file)
      ) ?? null
    );
  }

  function collectHomepageSources() {
    const visited = new Map();
    const pending = [homepage];

    while (
      pending.length > 0 &&
      visited.size < maxImportedFiles
    ) {
      const file = pending.shift();

      if (visited.has(file)) {
        continue;
      }

      const source = read(file);

      if (source === null) {
        continue;
      }

      visited.set(file, source);

      const imports =
        /\bfrom\s+["']([^"']+)["']/g;

      for (const match of source.matchAll(imports)) {
        const resolved = resolveImport(
          file,
          match[1]
        );

        if (
          resolved &&
          !visited.has(resolved) &&
          !pending.includes(resolved)
        ) {
          pending.push(resolved);
        }
      }
    }

    return {
      visited,
      capped: pending.length > 0,
    };
  }

  console.log(
    "FILE_97: HOMEPAGE_QUALITY_AUDIT"
  );

  console.log("PROJECT_ROOT: " + root);
  console.log("MODE: STATIC_READ_ONLY");

  // ======================================
  // 1. CORE FILE AVAILABILITY
  // ======================================

  console.log("\n=== CORE WEBSITE FILES ===");

  const required = [
    homepage,
    globalCss,
    layout,
    header,
    footer,
  ];

  let missingCoreFiles = 0;

  for (const file of required) {
    const present = read(file) !== null;

    output(
      present ? "PASS" : "REVIEW",
      "CORE_FILE",
      label(file)
    );

    if (!present) {
      missingCoreFiles++;
    }
  }

  const homeSource = read(homepage);

  if (homeSource === null) {
    output(
      "FAIL",
      "HOMEPAGE",
      "src/app/page.tsx is required"
    );

    process.exitCode = 1;
    return;
  }

  // ======================================
  // 2. INSPECT HOMEPAGE COMPONENT TREE
  // ======================================

  console.log(
    "\n=== HOMEPAGE COMPONENT SOURCES ==="
  );

  const {
    visited,
    capped,
  } = collectHomepageSources();

  for (const file of visited.keys()) {
    console.log("SOURCE: " + label(file));
  }

  console.log(
    "COMPONENT_SOURCES: " + visited.size
  );

  if (capped) {
    output(
      "REVIEW",
      "COMPONENT_LIMIT",
      `Inspected the first ${maxImportedFiles} local source files`
    );
  }

  // ======================================
  // 3. HERO HEADINGS
  // ======================================

  console.log("\n=== HERO HEADING REVIEW ===");

  let h1Count = 0;

  for (const [file, source] of visited) {
    const lines = source.split(/\r?\n/);

    for (const match of source.matchAll(
      /<h1\b/g
    )) {
      h1Count++;

      const line = lineNumber(
        source,
        match.index
      );

      output(
        "FOUND",
        "H1",
        `${label(file)}:${line}`
      );

      const excerpt = lines
        .slice(
          Math.max(0, line - 1),
          Math.min(lines.length, line + 9)
        )
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" ");

      console.log(
        "H1_SOURCE: " + shorten(excerpt, 360)
      );
    }
  }

  if (h1Count === 1) {
    output(
      "PASS",
      "H1_STRUCTURE",
      "One literal h1 found in inspected homepage components"
    );
  } else {
    output(
      "REVIEW",
      "H1_STRUCTURE",
      `${h1Count} literal h1 elements detected; inspect rendered page`
    );
  }

  output(
    "MANUAL",
    "HERO_VISIBILITY",
    "Verify the full heading remains visible after load, refresh and reduced-motion testing"
  );

  // ======================================
  // 4. ANIMATION AND VISIBILITY MARKERS
  // ======================================

  console.log(
    "\n=== HOMEPAGE ANIMATION REVIEW ==="
  );

  const visibilityPattern =
    /\b(?:opacity-0|invisible|animate-[\w-]+|translate-[xy]-\d+|scale-0)\b/;

  let visibilityMarkers = 0;

  for (const [file, source] of visited) {
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!visibilityPattern.test(line)) {
        return;
      }

      visibilityMarkers++;

      if (visibilityMarkers <= 18) {
        output(
          "REVIEW",
          "ANIMATION_MARKER",
          `${label(file)}:${index + 1} ${shorten(line)}`
        );
      }
    });
  }

  console.log(
    "ANIMATION_MARKERS_FOUND: " +
      visibilityMarkers
  );

  if (visibilityMarkers === 0) {
    output(
      "INFO",
      "ANIMATIONS",
      "No selected visibility markers found; animation may be implemented through CSS or other components"
    );
  }

  // ======================================
  // 5. IMAGE AND PLACEHOLDER REVIEW
  // ======================================

  console.log(
    "\n=== IMAGES AND PLACEHOLDERS ==="
  );

  const placeholderPattern =
    /placeholder|photography coming|photos? coming|image coming|coming soon|image pending/i;

  let placeholderCount = 0;
  let imageCount = 0;
  let missingAlt = 0;
  let missingImages = 0;
  let dynamicImages = 0;

  for (const [file, source] of visited) {
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!placeholderPattern.test(line)) {
        return;
      }

      placeholderCount++;

      if (placeholderCount <= 20) {
        output(
          "REVIEW",
          "PLACEHOLDER",
          `${label(file)}:${index + 1} ${shorten(line)}`
        );
      }
    });

    const imagePattern =
      /<(?:Image|img)\b[\s\S]*?(?:\/>|>)/g;

    for (const match of source.matchAll(
      imagePattern
    )) {
      imageCount++;

      const tag = match[0];

      const line = lineNumber(
        source,
        match.index
      );

      if (!/\balt\s*=/.test(tag)) {
        missingAlt++;

        output(
          "REVIEW",
          "IMAGE_ALT",
          `${label(file)}:${line} missing alt attribute in detected image markup`
        );
      }

      const srcMatch = tag.match(
        /\bsrc\s*=\s*(?:\{\s*)?(["'`])([^"'`]+)\1/
      );

      if (!srcMatch) {
        dynamicImages++;
        continue;
      }

      const src = srcMatch[2];

      if (
        !src.startsWith("/") ||
        src.startsWith("//") ||
        src.includes("${") ||
        src.startsWith("/_next/")
      ) {
        continue;
      }

      const assetPath = src
        .split(/[?#]/)[0]
        .replace(/^\/+/, "");

      const asset = path.resolve(
        publicRoot,
        assetPath
      );

      if (
        asset.startsWith(
          publicRoot + path.sep
        ) &&
        !fs.existsSync(asset)
      ) {
        missingImages++;

        output(
          "REVIEW",
          "IMAGE_FILE",
          `${label(file)}:${line} ${src} not found under public/`
        );
      }
    }
  }

  console.log(
    `IMAGE_SUMMARY: elements=${imageCount} missing_alt=${missingAlt} missing_local_files=${missingImages} dynamic_sources=${dynamicImages} placeholder_markers=${placeholderCount}`
  );

  // ======================================
  // 6. RESPONSIVE AND THEME REVIEW
  // ======================================

  console.log(
    "\n=== RESPONSIVE AND DESIGN REVIEW ==="
  );

  const combinedHomepage = [
    ...visited.values(),
  ].join("\n");

  const breakpoints = [
    "sm:",
    "md:",
    "lg:",
    "xl:",
    "2xl:",
  ];

  for (const breakpoint of breakpoints) {
    output(
      combinedHomepage.includes(breakpoint)
        ? "FOUND"
        : "INFO",
      "BREAKPOINT",
      breakpoint
    );
  }

  const themeColours = [
    "#FAF7F0",
    "#30251F",
    "#C59A45",
    "#E3B65D",
    "#B95016",
  ];

  const designSources =
    combinedHomepage +
    "\n" +
    (read(globalCss) ?? "");

  for (const colour of themeColours) {
    output(
      designSources.toLowerCase().includes(
        colour.toLowerCase()
      )
        ? "FOUND"
        : "REVIEW",
      "THEME_COLOUR",
      colour
    );
  }

  if (
    /\b(?:whitespace-nowrap|overflow-x-hidden|min-w-\[)/.test(
      combinedHomepage
    )
  ) {
    output(
      "REVIEW",
      "LAYOUT_MARKERS",
      "Check nowrap, minimum-width and overflow utilities at narrow viewport widths"
    );
  }

  // ======================================
  // 7. GLOBAL ACCESSIBILITY CSS
  // ======================================

  console.log(
    "\n=== ACCESSIBILITY CSS REVIEW ==="
  );

  const css = read(globalCss) ?? "";

  const hasFocus =
    /:focus-visible\b/.test(css);

  const hasReducedMotion =
    /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/.test(
      css
    );

  output(
    hasFocus ? "FOUND" : "REVIEW",
    "GLOBAL_FOCUS",
    hasFocus
      ? "Global focus-visible selector detected"
      : "No global focus-visible selector detected"
  );

  output(
    hasReducedMotion ? "FOUND" : "REVIEW",
    "REDUCED_MOTION",
    hasReducedMotion
      ? "Reduced-motion media query detected"
      : "Reduced-motion media query not detected"
  );

  if (hasReducedMotion) {
    const index = css.search(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/
    );

    const excerpt = css.slice(
      index,
      index + 1600
    );

    output(
      /animation(?:-duration)?\s*:/.test(
        excerpt
      )
        ? "FOUND"
        : "REVIEW",
      "REDUCED_ANIMATION",
      "Inspect animation handling in the reduced-motion rule"
    );

    output(
      /transition(?:-duration)?\s*:/.test(
        excerpt
      )
        ? "FOUND"
        : "REVIEW",
      "REDUCED_TRANSITIONS",
      "Inspect transition handling in the reduced-motion rule"
    );
  }

  // ======================================
  // 8. METADATA REVIEW
  // ======================================

  console.log(
    "\n=== HOMEPAGE METADATA REVIEW ==="
  );

  const layoutSource = read(layout) ?? "";

  const metadataDefined =
    /\bexport\s+const\s+metadata\b|\bgenerateMetadata\b/.test(
      homeSource + "\n" + layoutSource
    );

  output(
    metadataDefined ? "FOUND" : "REVIEW",
    "METADATA",
    metadataDefined
      ? "Metadata declaration or generator detected"
      : "Metadata declaration not found in inspected page or layout"
  );

  // ======================================
  // 9. QUOTATION AND EMAIL SAFETY
  // ======================================

  console.log(
    "\n=== QUOTATION SAFETY ==="
  );

  const envText = read(envFile) ?? "";

  const flags = [
    "QUOTATION_SUBMISSIONS_ENABLED",
    "QUOTATION_E2E_TEST_MODE",
    "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
  ];

  let safeFlags = 0;

  for (const flag of flags) {
    const matcher = new RegExp(
      `^\\s*${flag}\\s*=\\s*(.*?)\\s*$`,
      "gm"
    );

    const values = [
      ...envText.matchAll(matcher),
    ].map((match) =>
      match[1]
        .trim()
        .replace(/^["']|["']$/g, "")
        .toLowerCase()
    );

    const safe =
      values.length === 1 &&
      values[0] === "false";

    if (safe) {
      safeFlags++;
    }

    output(
      safe ? "PASS" : "FAIL",
      "SAFETY " + flag,
      safe
        ? "disabled"
        : "not confirmed disabled exactly once"
    );
  }

  // ======================================
  // 10. SUMMARY
  // ======================================

  console.log("\n=== AUDIT SUMMARY ===");

  console.log(
    `QUALITY_SUMMARY: h1=${h1Count} placeholders=${placeholderCount} missing_image_files=${missingImages} missing_alt=${missingAlt} visibility_markers=${visibilityMarkers} safety=${safeFlags}/3`
  );

  console.log(
    "NEXT_REVIEW: Check the full hero heading, real image placeholders, desktop/mobile layout, focus visibility and reduced motion in the browser."
  );

  console.log(
    "AUDIT_COMPLETE: Read-only homepage inspection finished; no files modified."
  );

  if (
    missingCoreFiles > 0 ||
    safeFlags !== 3
  ) {
    process.exitCode = 1;
  }
}
