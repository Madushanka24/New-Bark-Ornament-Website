/**
 * BARK ORNAMENT — FILE 113
 * Website Image Approval & Public Launch Readiness Audit
 *
 * Run:
 * node scripts/website-launch-readiness-audit.mjs --audit
 *
 * Read-only. Runs only the four existing named audit scripts.
 * Does not run a build, access the network, write files,
 * or change feature flags.
 *
 * A passing technical audit is NOT permission to launch.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

if (
  process.argv.length !== 3 ||
  process.argv[2] !== "--audit"
) {
  console.error(
    "Usage: node scripts/website-launch-readiness-audit.mjs --audit"
  );
  process.exit(2);
}

const root = process.cwd();

let failed = 0;
let passed = 0;
let reviews = 0;

function result(ok, code, message) {
  console.log(
    `${ok ? "PASS" : "FAIL"} ${code}: ${message}`
  );

  if (ok) passed++;
  else failed++;
}

function review(code, message) {
  console.log(`REVIEW ${code}: ${message}`);
  reviews++;
}

function readLocal(relative) {
  try {
    const file = path.join(root, relative);
    const stat = fs.lstatSync(file);

    if (!stat.isFile() || stat.isSymbolicLink()) {
      return null;
    }

    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function fields(line) {
  return Object.fromEntries(
    [...line.matchAll(/([a-zA-Z_]+)=([^\s]+)/g)]
      .map((match) => [match[1], match[2]])
  );
}

function lineOf(output, prefix) {
  return (
    output
      .split(/\r?\n/)
      .find((line) => line.startsWith(prefix)) ?? null
  );
}

console.log(
  "FILE_113: WEBSITE_LAUNCH_READINESS_AUDIT"
);
console.log(
  "MODE: READ_ONLY | EXISTING_AUDITS | NO_NETWORK"
);
console.log(`PROJECT_ROOT: ${root}`);

/* ==========================================
   1. RUN EXISTING AUDITS
   ========================================== */

const existingAudits = [
  {
    id: "A01",
    name: "Homepage image readiness",
    file: "scripts/approved-image-readiness-audit.mjs",
    marker: "REGISTRY_SUMMARY:",
  },
  {
    id: "A02",
    name: "Catalogue image usage",
    file: "scripts/catalogue-image-audit.mjs",
    marker: "AUDIT_STATUS:",
  },
  {
    id: "A03",
    name: "Cross-page image integration",
    file: "scripts/website-photography-integration-audit.mjs",
    marker: "FILE_112_RESULT:",
  },
  {
    id: "A04",
    name: "Quotation safety",
    file: "scripts/quotation-customer-experience-audit.mjs",
    marker: "SAFETY_SUMMARY:",
  },
];

console.log("\n=== EXISTING AUDIT RESULTS ===");

const auditOutputs = {};

for (const audit of existingAudits) {
  if (readLocal(audit.file) === null) {
    result(
      false,
      audit.id,
      `${audit.name}: script missing or unreadable`
    );
    continue;
  }

  const run = spawnSync(
    process.execPath,
    [path.join(root, audit.file), "--audit"],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 90000,
      maxBuffer: 8 * 1024 * 1024,
    }
  );

  const output = run.stdout ?? "";
  const summary = lineOf(output, audit.marker);

  const ok =
    !run.error &&
    run.status === 0 &&
    !!summary &&
    (audit.id !== "A02" ||
      summary.includes("NO_CONFIRMED_SOURCE_FAILURES")) &&
    (audit.id !== "A03" ||
      summary.trim() === "FILE_112_RESULT: PASS") &&
    (audit.id !== "A04" ||
      /^SAFETY_SUMMARY:\s*4\/4\s+PASS\s*$/.test(
        summary
      ));

  result(
    ok,
    audit.id,
    `${audit.name}: ${summary ?? "summary not found"}`
  );

  if (summary) {
    auditOutputs[audit.id] = {
      output,
      summary,
    };
  }

  if (!ok && run.error) {
    review(
      `${audit.id}_ERROR`,
      run.error.message
    );
  }

  if (
    !ok &&
    run.status !== null &&
    run.status !== 0
  ) {
    review(
      `${audit.id}_EXIT`,
      `Audit exited ${run.status}; run this audit independently for details`
    );
  }
}

/* ==========================================
   2. HOMEPAGE PHOTOGRAPHY STATUS
   ========================================== */

console.log(
  "\n=== APPROVED PHOTOGRAPHY STATUS ==="
);

const homepageSummary = fields(
  auditOutputs.A01?.summary ?? ""
);

const total = Number(homepageSummary.total);
const empty = Number(homepageSummary.empty);
const ready = Number(homepageSummary.ready);
const errors = Number(homepageSummary.errors);

result(
  Number.isInteger(total) &&
    total === 16 &&
    Number.isInteger(empty) &&
    Number.isInteger(ready) &&
    Number.isInteger(errors) &&
    empty >= 0 &&
    ready >= 0 &&
    errors === 0 &&
    empty + ready <= total,
  "P01",
  "Homepage registry: 16 expected slots and no image errors"
);

/* ==========================================
   3. PRODUCT PHOTO REGISTRY VALIDATION
   ========================================== */

let productPhotos = 0;
let productGalleries = 0;
let productRegistryValid = false;

const registrySource = readLocal(
  "src/lib/approved-product-images.ts"
);

if (registrySource !== null) {
  try {
    const ts = require("typescript");

    const ast = ts.createSourceFile(
      "approved-product-images.ts",
      registrySource,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    if (ast.parseDiagnostics.length) {
      throw new Error("TypeScript parse error");
    }

    let initializer = null;

    for (const statement of ast.statements) {
      if (!ts.isVariableStatement(statement)) {
        continue;
      }

      for (
        const entry of
        statement.declarationList.declarations
      ) {
        if (
          ts.isIdentifier(entry.name) &&
          entry.name.text === "approvedProductImages"
        ) {
          initializer = entry.initializer;
        }
      }
    }

    if (
      !initializer ||
      !ts.isCallExpression(initializer) ||
      initializer.expression.getText(ast) !==
        "Object.freeze" ||
      initializer.arguments.length !== 1
    ) {
      throw new Error(
        "Registry must be Object.freeze({...})"
      );
    }

    const object = initializer.arguments[0];

    if (!ts.isObjectLiteralExpression(object)) {
      throw new Error(
        "Registry must use a static object literal"
      );
    }

    const keys = new Set();

    const gallerySlots = [
      "main",
      "additional",
      "material",
      "finish",
    ];

    for (const prop of object.properties) {
      if (
        !ts.isPropertyAssignment(prop) ||
        !(
          ts.isIdentifier(prop.name) ||
          ts.isStringLiteral(prop.name)
        )
      ) {
        throw new Error(
          "Dynamic gallery entries cannot be statically approved"
        );
      }

      const slug = prop.name.text;

      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        keys.has(slug)
      ) {
        throw new Error(
          "Invalid or duplicate product slug"
        );
      }

      keys.add(slug);
      productGalleries++;

      if (
        !ts.isObjectLiteralExpression(
          prop.initializer
        )
      ) {
        throw new Error(
          `Gallery ${slug} must be an object literal`
        );
      }

      const photos = new Map();

      for (
        const part of
        prop.initializer.properties
      ) {
        if (
          !ts.isPropertyAssignment(part) ||
          !(
            ts.isIdentifier(part.name) ||
            ts.isStringLiteral(part.name)
          )
        ) {
          throw new Error(
            `Non-static gallery field in ${slug}`
          );
        }

        if (photos.has(part.name.text)) {
          throw new Error(
            `Duplicate gallery field in ${slug}`
          );
        }

        photos.set(
          part.name.text,
          part.initializer
        );
      }

      if (
        photos.size !== 4 ||
        gallerySlots.some(
          (key) => !photos.has(key)
        )
      ) {
        throw new Error(
          `Gallery ${slug} must have exactly four image slots`
        );
      }

      for (const [slot, photo] of photos) {
        if (
          photo.kind ===
          ts.SyntaxKind.NullKeyword
        ) {
          continue;
        }

        if (
          !ts.isObjectLiteralExpression(photo)
        ) {
          throw new Error(
            `${slug}.${slot} must be an approved photo object`
          );
        }

        const data = new Map();

        for (
          const property of
          photo.properties
        ) {
          if (
            !ts.isPropertyAssignment(property) ||
            !(
              ts.isIdentifier(property.name) ||
              ts.isStringLiteral(property.name)
            )
          ) {
            throw new Error(
              `${slug}.${slot} has a dynamic field`
            );
          }

          if (
            data.has(property.name.text)
          ) {
            throw new Error(
              `${slug}.${slot} has a duplicate field`
            );
          }

          data.set(
            property.name.text,
            property.initializer
          );
        }

        const src = data.get("src");
        const alt = data.get("alt");
        const approved = data.get("approved");

        if (
          data.size !== 3 ||
          !src ||
          !ts.isStringLiteral(src) ||
          !alt ||
          !ts.isStringLiteral(alt) ||
          !alt.text.trim() ||
          approved?.kind !==
            ts.SyntaxKind.TrueKeyword
        ) {
          throw new Error(
            `${slug}.${slot} requires static src, descriptive alt, approved: true`
          );
        }

        const imagePath = src.text;

        if (
          !/^\/images\/approved\/[a-zA-Z0-9][a-zA-Z0-9._/-]*\.(jpg|jpeg|png|webp|avif)$/i.test(
            imagePath
          ) ||
          imagePath.includes("..") ||
          imagePath.includes("//")
        ) {
          throw new Error(
            `${slug}.${slot} has a non-approved or unsafe image path`
          );
        }

        const full = path.resolve(
          root,
          "public",
          imagePath.slice(1)
        );

        const approvedDir = path.resolve(
          root,
          "public/images/approved"
        );

        if (
          !full.startsWith(
            approvedDir + path.sep
          )
        ) {
          throw new Error(
            `${slug}.${slot} escapes image folder`
          );
        }

        let stat;

        try {
          stat = fs.lstatSync(full);
        } catch {
          throw new Error(
            `${slug}.${slot}: image file does not exist`
          );
        }

        if (
          !stat.isFile() ||
          stat.isSymbolicLink() ||
          stat.size === 0
        ) {
          throw new Error(
            `${slug}.${slot}: invalid or symlinked image file`
          );
        }

        // Check basic file signatures,
        // not only filename extensions.
        const fd = fs.openSync(
          full,
          "r"
        );

        const header = Buffer.alloc(32);
        let bytesRead = 0;

        try {
          bytesRead = fs.readSync(
            fd,
            header,
            0,
            header.length,
            0
          );
        } finally {
          fs.closeSync(fd);
        }

        const ext = path
          .extname(full)
          .slice(1)
          .toLowerCase();

        const signatureOK =
          bytesRead >= 12 &&
          (
            (
              ext === "png" &&
              header.subarray(0, 8).equals(
                Buffer.from([
                  137, 80, 78, 71,
                  13, 10, 26, 10,
                ])
              )
            ) ||
            (
              (ext === "jpg" || ext === "jpeg") &&
              header[0] === 255 &&
              header[1] === 216 &&
              header[2] === 255
            ) ||
            (
              ext === "webp" &&
              header.toString(
                "ascii", 0, 4
              ) === "RIFF" &&
              header.toString(
                "ascii", 8, 12
              ) === "WEBP"
            ) ||
            (
              ext === "avif" &&
              header.toString(
                "ascii", 4, 8
              ) === "ftyp" &&
              /avif|avis/.test(
                header.toString(
                  "ascii", 8, 32
                )
              )
            )
          );

        if (!signatureOK) {
          throw new Error(
            `${slug}.${slot}: image signature does not match extension`
          );
        }

        if (
          stat.size >
          2 * 1024 * 1024
        ) {
          review(
            "PRODUCT_IMAGE_SIZE",
            `${slug}.${slot} exceeds 2 MB; optimize before production`
          );
        }

        productPhotos++;
      }
    }

    productRegistryValid = true;

  } catch (error) {
    review(
      "PRODUCT_REGISTRY_ERROR",
      String(
        error.message ?? error
      )
    );
  }
}

result(
  productRegistryValid,
  "P02",
  `Product image registry: galleries=${productGalleries}, assigned_photos=${productPhotos}`
);

const photoStatus =
  ready + productPhotos === 0
    ? "PLACEHOLDERS_ONLY"
    : "APPROVAL_REQUIRED";

console.log(
  `PHOTOGRAPHY_STATUS: ${photoStatus}`
);

console.log(
  `PHOTO_COUNTS: homepage_ready=${Number.isFinite(ready) ? ready : "unknown"} product_assigned=${productPhotos}`
);

/* ==========================================
   4. ESSENTIAL WEBSITE ROUTES
   ========================================== */

console.log(
  "\n=== CUSTOMER-FACING ROUTE SOURCES ==="
);

const routes = [
  "src/app/page.tsx",
  "src/app/products/page.tsx",
  "src/app/products/[slug]/page.tsx",
  "src/app/categories/page.tsx",
  "src/app/categories/[slug]/page.tsx",
  "src/app/request-quotation/page.tsx",
  "src/app/about/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/privacy-policy/page.tsx",
  "src/app/cookie-information/page.tsx",
  "src/app/terms/page.tsx",
];

const missing = routes.filter(
  (file) => readLocal(file) === null
);

result(
  missing.length === 0,
  "R01",
  `Core route source files: ${routes.length - missing.length}/${routes.length} present`
);

for (const file of missing) {
  review(
    "MISSING_ROUTE",
    file
  );
}

/* ==========================================
   5. SEO IMPLEMENTATION CHECKS
   ========================================== */

const sitemap =
  readLocal("src/app/sitemap.ts") !== null ||
  readLocal(
    "src/app/sitemap.xml/route.ts"
  ) !== null ||
  readLocal("public/sitemap.xml") !== null;

const robots =
  readLocal("src/app/robots.ts") !== null ||
  readLocal("public/robots.txt") !== null;

if (!sitemap) {
  review(
    "SEO_SITEMAP",
    "Sitemap implementation not located at conventional paths"
  );
}

if (!robots) {
  review(
    "SEO_ROBOTS",
    "Robots implementation not located at conventional paths"
  );
}

/* ==========================================
   6. PROTECTED ENVIRONMENT SETTINGS
   ========================================== */

console.log(
  "\n=== PROTECTED ENVIRONMENT SETTINGS ==="
);

const envSource = readLocal(".env.local");

for (const [index, key] of [
  "QUOTATION_SUBMISSIONS_ENABLED",
  "QUOTATION_E2E_TEST_MODE",
  "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
].entries()) {

  const matches =
    envSource === null
      ? []
      : [
          ...envSource.matchAll(
            new RegExp(
              `^\\s*${key}\\s*=\\s*(.*?)\\s*$`,
              "gm"
            )
          ),
        ];

  const values = matches.map(
    (match) =>
      match[1]
        .trim()
        .replace(
          /^(?:"([^"]*)"|'([^']*)')$/,
          "$1$2"
        )
        .toLowerCase()
  );

  result(
    values.length === 1 &&
      values[0] === "false",
    `S0${index + 1}`,
    `${key} remains explicitly disabled`
  );
}

/* ==========================================
   7. MANUAL PUBLICATION APPROVALS
   ========================================== */

console.log(
  "\n=== MANUAL PUBLICATION GATES ==="
);

const gates = [
  "Verify all public copy, category descriptions, product claims and demo labels",

  "Approve photograph ownership, correct product match, alt text and appearance",

  "Review mobile, keyboard, screen reader, reduced-motion and Core Web Vitals",

  "Verify privacy/cookie/legal content and business contact information",

  "Complete production hosting, email, domain, SEO and security review",

  "Decide whether public quotation submission is required; keep disabled until separately authorized and tested",
];

for (let i = 0; i < gates.length; i++) {
  console.log(
    `MANUAL_GATE_${String(i + 1).padStart(2, "0")}: PENDING — ${gates[i]}`
  );
}

console.log(
  `MANUAL_GATE_SUMMARY: pending=${gates.length} automatically_approved=0`
);

console.log(
  "PUBLIC_LAUNCH_STATUS: NOT_CERTIFIED"
);

console.log(
  "NOTE: Passing this audit does not authorize publishing unapproved photography or enabling live submissions."
);

/* ==========================================
   8. FINAL REPORT
   ========================================== */

console.log(
  `AUDIT_SUMMARY: passed=${passed} failed=${failed} reviews=${reviews}`
);

console.log(
  `FILE_113_RESULT: ${failed === 0 ? "PASS" : "FAIL"}`
);

console.log(
  "AUDIT_COMPLETE: No website files modified, no HTTP requests made."
);

if (failed > 0) {
  process.exitCode = 1;
}
