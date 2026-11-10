/**
 * BARK ORNAMENT — FILE 103
 *
 * Approved Image Readiness Audit
 *
 * Usage:
 * node scripts/approved-image-readiness-audit.mjs --audit
 *
 * READ-ONLY:
 * - No files created, edited or deleted
 * - No HTTP requests
 * - No database connections
 * - No application source execution
 * - No quotations or emails
 *
 * Uses the existing TypeScript compiler to parse
 * registry declarations without executing them.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

if (
  process.argv.length !== 3 ||
  process.argv[2] !== "--audit"
) {
  console.error(
    "Usage: node scripts/approved-image-readiness-audit.mjs --audit"
  );

  process.exit(2);
}

const root = process.cwd();

const registryFile = path.join(
  root,
  "src/lib/approved-homepage-images.ts"
);

const homeFile = path.join(
  root,
  "src/app/page.tsx"
);

const assetsRoot = path.resolve(
  root,
  "public/images/approved"
);

const envFile = path.join(
  root,
  ".env.local"
);

/* ==========================================
   EXPECTED REGISTRY KEYS
   ========================================== */

const categories = [
  "printing-stationery",
  "menus-guest-service",
  "tags-stickers-cards",
  "bags-packaging",
  "wooden-products",
  "cane-natural",
  "ceramic-pottery-laksha",
  "candles-party",
  "gifts-promotional",
  "laundry-operations",
];

const knowledge = [
  "paper-types",
  "understanding-gsm",
  "sea-vs-air",
];

const flags = [
  "QUOTATION_SUBMISSIONS_ENABLED",
  "QUOTATION_E2E_TEST_MODE",
  "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
];

let errors = 0;
let reviews = 0;
let empty = 0;
let ready = 0;

function report(status, label, detail) {
  console.log(
    `${status} ${label}: ${detail}`
  );

  if (status === "FAIL") errors++;
  if (status === "REVIEW") reviews++;
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    report(
      "FAIL",
      "REQUIRED_FILE",
      `${path.relative(root, file)} missing/unreadable`
    );

    return null;
  }
}

/* ==========================================
   TYPESCRIPT SOURCE INSPECTION
   ========================================== */

function keyName(node) {
  if (!node) return null;

  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNumericLiteral(node)
  ) {
    return node.text;
  }

  return null;
}

function field(object, key) {
  if (
    !object ||
    !ts.isObjectLiteralExpression(object)
  ) {
    return null;
  }

  return (
    object.properties.find(
      (property) =>
        ts.isPropertyAssignment(property) &&
        keyName(property.name) === key
    ) ?? null
  );
}

function stringValue(property) {
  const value = property?.initializer;

  if (
    value &&
    (
      ts.isStringLiteral(value) ||
      ts.isNoSubstitutionTemplateLiteral(value)
    )
  ) {
    return value.text;
  }

  return null;
}

function checkKeys(object, expected, name) {
  if (
    !object ||
    !ts.isObjectLiteralExpression(object)
  ) {
    report(
      "FAIL",
      "REGISTRY_SECTION",
      `${name} must be an object literal`
    );

    return;
  }

  const actual = object.properties.map(
    (property) =>
      ts.isPropertyAssignment(property)
        ? keyName(property.name)
        : null
  );

  for (const key of expected) {
    const count = actual.filter(
      (value) => value === key
    ).length;

    if (count !== 1) {
      report(
        "FAIL",
        "REGISTRY_KEY",
        `${name}.${key} occurs ${count} times (expected 1)`
      );
    }
  }

  for (const key of actual) {
    if (!expected.includes(key)) {
      report(
        "FAIL",
        "REGISTRY_EXTRA",
        `${name}.${key ?? "unsupported property"}`
      );
    }
  }
}

/* ==========================================
   IMAGE DIMENSION READERS

   These inspect image headers.
   They do not fully decode image pixels.
   ========================================== */

function pngSize(buffer) {
  const signature = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);

  if (
    buffer.length < 24 ||
    !buffer.subarray(0, 8).equals(signature) ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    kind: "png",
  };
}

function jpegSize(buffer) {
  if (
    buffer.length < 4 ||
    buffer[0] !== 255 ||
    buffer[1] !== 216
  ) {
    return null;
  }

  let position = 2;

  while (
    position < buffer.length - 9
  ) {
    if (buffer[position] !== 255) {
      position++;
      continue;
    }

    while (
      buffer[position] === 255
    ) {
      position++;
    }

    const marker = buffer[position++];

    if (
      marker === 0xd9 ||
      marker === 0xda
    ) {
      break;
    }

    if (
      marker === 0x01 ||
      marker === 0xd8 ||
      (
        marker >= 0xd0 &&
        marker <= 0xd7
      )
    ) {
      continue;
    }

    if (
      position + 2 > buffer.length
    ) {
      break;
    }

    const length =
      buffer.readUInt16BE(position);

    if (
      length < 2 ||
      position + length > buffer.length
    ) {
      break;
    }

    const frameMarkers = [
      0xc0, 0xc1, 0xc2, 0xc3,
      0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb,
      0xcd, 0xce, 0xcf,
    ];

    if (
      frameMarkers.includes(marker)
    ) {
      if (length < 7) break;

      return {
        width: buffer.readUInt16BE(
          position + 5
        ),
        height: buffer.readUInt16BE(
          position + 3
        ),
        kind: "jpeg",
      };
    }

    position += length;
  }

  return null;
}

function webpSize(buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunk = buffer.toString(
    "ascii",
    12,
    16
  );

  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
      kind: "webp",
    };
  }

  if (
    chunk === "VP8L" &&
    buffer[20] === 0x2f
  ) {
    return {
      width:
        1 +
        (
          buffer[21] |
          ((buffer[22] & 0x3f) << 8)
        ),
      height:
        1 +
        (
          (buffer[22] >> 6) |
          (buffer[23] << 2) |
          ((buffer[24] & 0x0f) << 10)
        ),
      kind: "webp",
    };
  }

  if (
    chunk === "VP8 " &&
    buffer[23] === 0x9d &&
    buffer[24] === 0x01 &&
    buffer[25] === 0x2a
  ) {
    return {
      width:
        buffer.readUInt16LE(26) &
        0x3fff,
      height:
        buffer.readUInt16LE(28) &
        0x3fff,
      kind: "webp",
    };
  }

  return null;
}

function avifSize(buffer) {
  if (
    buffer.length < 32 ||
    buffer.toString("ascii", 4, 8) !== "ftyp" ||
    !/avif|avis/.test(
      buffer.toString(
        "ascii",
        8,
        Math.min(buffer.length, 40)
      )
    )
  ) {
    return null;
  }

  let position = 0;

  while (
    (
      position = buffer.indexOf(
        "ispe",
        position
      )
    ) !== -1
  ) {
    if (
      position >= 4 &&
      position + 16 <= buffer.length &&
      buffer.readUInt32BE(
        position - 4
      ) >= 20
    ) {
      return {
        width: buffer.readUInt32BE(
          position + 8
        ),
        height: buffer.readUInt32BE(
          position + 12
        ),
        kind: "avif",
      };
    }

    position += 4;
  }

  return null;
}

function imageInfo(buffer, extension) {
  const kind =
    extension === ".jpg"
      ? ".jpeg"
      : extension;

  if (kind === ".png") {
    return pngSize(buffer);
  }

  if (kind === ".jpeg") {
    return jpegSize(buffer);
  }

  if (kind === ".webp") {
    return webpSize(buffer);
  }

  if (kind === ".avif") {
    return avifSize(buffer);
  }

  return null;
}

/* ==========================================
   APPROVED PHOTO VERIFICATION
   ========================================== */

function inspectPhoto(name, property) {
  const value = property?.initializer;

  if (!value) return;

  if (
    value.kind ===
    ts.SyntaxKind.NullKeyword
  ) {
    empty++;

    report(
      "EMPTY",
      name,
      "No approved photo configured (placeholder retained)"
    );

    return;
  }

  if (
    !ts.isObjectLiteralExpression(value)
  ) {
    report(
      "FAIL",
      name,
      "Use null or an explicit approved photo object"
    );

    return;
  }

  checkKeys(
    value,
    ["src", "alt", "approved"],
    name
  );

  const src = stringValue(
    field(value, "src")
  );

  const alt = stringValue(
    field(value, "alt")
  );

  const approval =
    field(value, "approved")
      ?.initializer.kind ===
    ts.SyntaxKind.TrueKeyword;

  if (
    !approval ||
    !alt ||
    !alt.trim() ||
    !src
  ) {
    report(
      "FAIL",
      name,
      "Photo must have a literal src, nonempty alt and approved: true"
    );

    return;
  }

  const validPath =
    /^\/images\/approved\/[A-Za-z0-9][A-Za-z0-9/_-]*\.(jpg|jpeg|png|webp|avif)$/i.test(
      src
    );

  const safeSegments = src
    .split("/")
    .slice(1)
    .every(
      (segment) =>
        segment !== "" &&
        segment !== "." &&
        segment !== ".."
    );

  if (
    !validPath ||
    !safeSegments
  ) {
    report(
      "FAIL",
      name,
      "Image src must be a safe local /images/approved/ raster path"
    );

    return;
  }

  const target = path.resolve(
    root,
    "public",
    src.slice(1)
  );

  if (
    !target.startsWith(
      assetsRoot + path.sep
    )
  ) {
    report(
      "FAIL",
      name,
      "File path escapes approved image directory"
    );

    return;
  }

  let stats;

  try {
    stats = fs.statSync(target);

    const realRoot =
      fs.realpathSync(assetsRoot);

    const realTarget =
      fs.realpathSync(target);

    if (
      !realTarget.startsWith(
        realRoot + path.sep
      ) ||
      !stats.isFile()
    ) {
      throw new Error(
        "Not a regular file inside the approved directory"
      );
    }
  } catch {
    report(
      "FAIL",
      name,
      `Missing or unsafe file: ${src}`
    );

    return;
  }

  if (
    stats.size === 0 ||
    stats.size > 25_000_000
  ) {
    report(
      "FAIL",
      name,
      `${src} is empty or exceeds the 25 MB inspection limit`
    );

    return;
  }

  const info = imageInfo(
    fs.readFileSync(target),
    path.extname(target).toLowerCase()
  );

  if (
    !info ||
    !info.width ||
    !info.height ||
    info.width > 40000 ||
    info.height > 40000
  ) {
    report(
      "FAIL",
      name,
      `${src} has unreadable or unsupported image dimensions`
    );

    return;
  }

  ready++;

  report(
    "READY",
    name,
    `${src} | ${info.width}x${info.height} | ${(stats.size / 1024).toFixed(0)} KiB | alt: ${alt}`
  );

  const minWidth =
    name === "hero"
      ? 1200
      : (
        name === "company" ||
        name === "solutions"
      )
        ? 900
        : 650;

  if (
    info.width < minWidth
  ) {
    report(
      "REVIEW",
      name,
      `Width under suggested ${minWidth}px for this slot`
    );
  }

  if (
    stats.size > 1_500_000
  ) {
    report(
      "REVIEW",
      name,
      "File exceeds 1.5 MB; consider optimisation before launch"
    );
  }
}

/* ==========================================
   MAIN AUDIT
   ========================================== */

console.log(
  "FILE_103: APPROVED_IMAGE_READINESS_AUDIT"
);

console.log(
  "MODE: READ_ONLY | NO_HTTP | NO_SOURCE_EXECUTION"
);

console.log(
  `PROJECT_ROOT: ${root}`
);

const registry = read(registryFile);
const homepage = read(homeFile);
const env = read(envFile);

if (
  registry &&
  homepage
) {
  const sourceFile = ts.createSourceFile(
    registryFile,
    registry,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  for (
    const diagnostic of
    sourceFile.parseDiagnostics
  ) {
    report(
      "FAIL",
      "TYPESCRIPT_SYNTAX",
      ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        " "
      )
    );
  }

  let declaration;

  for (
    const statement of
    sourceFile.statements
  ) {
    if (
      !ts.isVariableStatement(statement)
    ) {
      continue;
    }

    declaration =
      statement.declarationList.declarations.find(
        (item) =>
          ts.isIdentifier(item.name) &&
          item.name.text ===
            "approvedHomepageImages"
      ) ?? declaration;
  }

  const object =
    declaration?.initializer;

  if (
    !object ||
    !ts.isObjectLiteralExpression(object)
  ) {
    report(
      "FAIL",
      "REGISTRY",
      "approvedHomepageImages must initialise an object literal"
    );
  } else {
    checkKeys(
      object,
      [
        "hero",
        "company",
        "solutions",
        "categories",
        "knowledge",
      ],
      "root"
    );

    const categoryObject =
      field(
        object,
        "categories"
      )?.initializer;

    const knowledgeObject =
      field(
        object,
        "knowledge"
      )?.initializer;

    checkKeys(
      categoryObject,
      categories,
      "categories"
    );

    checkKeys(
      knowledgeObject,
      knowledge,
      "knowledge"
    );

    for (
      const key of [
        "hero",
        "company",
        "solutions",
      ]
    ) {
      inspectPhoto(
        key,
        field(object, key)
      );
    }

    for (
      const key of categories
    ) {
      inspectPhoto(
        `categories.${key}`,
        field(
          categoryObject,
          key
        )
      );
    }

    for (
      const key of knowledge
    ) {
      inspectPhoto(
        `knowledge.${key}`,
        field(
          knowledgeObject,
          key
        )
      );
    }
  }

  /* ----------------------------------------
     VERIFY HOMEPAGE REGISTRY CONNECTIONS
     ---------------------------------------- */

  const references = [
    [
      "hero",
      "approvedHomepageImages.hero",
    ],
    [
      "company",
      "approvedHomepageImages.company",
    ],
    [
      "solutions",
      "approvedHomepageImages.solutions",
    ],
    [
      "categories",
      "approvedHomepageImages.categories[",
    ],
    [
      "knowledge",
      "approvedHomepageImages.knowledge[",
    ],
  ];

  for (
    const [key, token] of references
  ) {
    report(
      homepage.includes(token)
        ? "PASS"
        : "FAIL",
      "HOMEPAGE_CONNECTION",
      `${key}: ${token}`
    );
  }

  for (
    const key of categories
  ) {
    if (
      !homepage.includes(
        `slug: "${key}"`
      )
    ) {
      report(
        "FAIL",
        "HOMEPAGE_CATEGORY",
        key
      );
    }
  }

  for (
    const key of knowledge
  ) {
    if (
      !homepage.includes(
        `imageKey: "${key}"`
      )
    ) {
      report(
        "FAIL",
        "HOMEPAGE_KNOWLEDGE",
        key
      );
    }
  }
}

/* ==========================================
   PROTECTED SAFETY FLAGS

   Read only the three known flags.
   Do not print other environment values.
   ========================================== */

if (
  env !== null
) {
  for (
    const flag of flags
  ) {
    const values = [
      ...env.matchAll(
        new RegExp(
          `^\\s*${flag}\\s*=\\s*(.*?)\\s*$`,
          "gm"
        )
      ),
    ].map(
      (match) =>
        match[1]
          .trim()
          .replace(
            /^(["'])(.*)\1$/,
            "$2"
          )
          .toLowerCase()
    );

    report(
      (
        values.length === 1 &&
        values[0] === "false"
      )
        ? "PASS"
        : "FAIL",
      "SAFETY",
      `${flag} must be false exactly once`
    );
  }
}

/* ==========================================
   FINAL SUMMARY
   ========================================== */

console.log(
  `REGISTRY_SUMMARY: total=16 empty=${empty} ready=${ready} errors=${errors} reviews=${reviews}`
);

console.log(
  "AUDIT_COMPLETE: No files changed; no network requests performed."
);

if (
  errors > 0 ||
  reviews > 0 ||
  empty + ready !== 16
) {
  process.exitCode = 1;
}
