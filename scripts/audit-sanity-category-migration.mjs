
/**
 * BARK ORNAMENT — FILE 150 STEP E7B
 *
 * Read-only Sanity category migration audit.
 *
 * Compares an already-verified category
 * migration preview with PUBLISHED category
 * documents in the configured Sanity dataset.
 *
 * DOES NOT:
 * - Create or modify Sanity documents
 * - Approve or publish categories
 * - Delete existing records
 * - Modify website source files
 * - Inspect unpublished drafts
 *
 * Do not use this audit alone as authorization
 * to import records. Draft conflicts and other
 * write-time conflicts require further checks.
 */

import fs from "node:fs";
import path from "node:path";

const API_VERSION = "2025-02-19";
const EXPECTED_CATEGORIES = 10;
const MAX_REMOTE_CATEGORIES = 500;

const ID_PATTERN =
  /^cat-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const COMPARED_FIELDS = [
  "categoryId",
  "name",
  "description",
  "eyebrow",
  "introduction",
  "examples",
  "considerations",
  "displayOrder",
  "seoDescription",
];

const QUERY = `
  *[
    _type == "catalogCategory" &&
    !(_id in path("drafts.**"))
  ]
  | order(_id asc)[0...501] {
    _id,
    categoryId,
    name,
    "slug": slug.current,
    description,
    eyebrow,
    introduction,
    examples,
    considerations,
    displayOrder,
    seoDescription,
    approved
  }
`;

function fail(message) {
  throw new Error(`E7B: ${message}`);
}

function validSlug(value) {
  return (
    typeof value === "string" &&
    value.length <= 100 &&
    SLUG_PATTERN.test(value)
  );
}

function validId(value) {
  return (
    typeof value === "string" &&
    value.length <= 64 &&
    ID_PATTERN.test(value)
  );
}

function getConfig() {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
      ?.trim();

  const dataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET
      ?.trim();

  if (
    !projectId ||
    !dataset ||
    !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[a-z0-9_-]+$/.test(dataset)
  ) {
    fail("Missing or invalid Sanity configuration");
  }

  return { projectId, dataset };
}

function getPreviewPath() {
  const args = process.argv.slice(2);

  if (
    args.length !== 2 ||
    args[0] !== "--preview" ||
    !args[1]
  ) {
    fail(
      "Usage: node audit-sanity-category-migration.mjs " +
      "--preview <existing-preview.json>"
    );
  }

  return path.resolve(args[1]);
}

function readPreview(file) {
  if (!fs.existsSync(file)) {
    fail("Migration preview file not found");
  }

  let records;

  try {
    records = JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    fail("Migration preview is not valid JSON");
  }

  if (
    !Array.isArray(records) ||
    records.length !== EXPECTED_CATEGORIES
  ) {
    fail("Expected exactly 10 preview categories");
  }

  const ids = new Set();
  const slugs = new Set();
  const documentIds = new Set();

  for (const record of records) {
    if (
      !record ||
      typeof record !== "object" ||
      record._type !== "catalogCategory" ||
      !validId(record.categoryId) ||
      !validSlug(record.slug?.current) ||
      record._id !==
        `catalogCategory.${record.categoryId}` ||
      record.approved !== false ||
      !Number.isInteger(record.displayOrder) ||
      record.displayOrder < 1 ||
      record.displayOrder > 999 ||
      typeof record.name !== "string" ||
      !Array.isArray(record.examples) ||
      !Array.isArray(record.considerations)
    ) {
      fail("Invalid migration preview record");
    }

    if (
      ids.has(record.categoryId) ||
      slugs.has(record.slug.current) ||
      documentIds.has(record._id)
    ) {
      fail("Duplicate category in migration preview");
    }

    ids.add(record.categoryId);
    slugs.add(record.slug.current);
    documentIds.add(record._id);
  }

  return records;
}

async function fetchPublishedCategories(config) {
  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/query/${config.dataset}`
  );

  endpoint.searchParams.set("query", QUERY);
  endpoint.searchParams.set(
    "perspective",
    "published"
  );

  let response;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    fail("Sanity query unavailable or timed out");
  }

  if (!response.ok) {
    fail(
      `Sanity query returned HTTP ${response.status}. ` +
      "No conclusions can be drawn about existing records."
    );
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    fail("Sanity returned invalid JSON");
  }

  if (!Array.isArray(payload?.result)) {
    fail("Sanity returned an unexpected query result");
  }

  if (payload.result.length > MAX_REMOTE_CATEGORIES) {
    fail(
      "Published category count exceeds audit limit. " +
      "A paginated audit is required."
    );
  }

  return payload.result;
}

function normalizedOptional(value) {
  return value === undefined || value === null
    ? null
    : value;
}

function equalField(left, right) {
  return (
    JSON.stringify(normalizedOptional(left)) ===
    JSON.stringify(normalizedOptional(right))
  );
}

function getDifferences(preview, remote) {
  const differences = [];

  if (preview._id !== remote._id) {
    differences.push("_id");
  }

  if (preview.slug.current !== remote.slug) {
    differences.push("slug");
  }

  for (const field of COMPARED_FIELDS) {
    if (!equalField(preview[field], remote[field])) {
      differences.push(field);
    }
  }

  return differences;
}

function detectPublishedDuplicates(records) {
  const ids = new Map();
  const slugs = new Map();
  const documentIds = new Set();

  const issues = [];

  for (const record of records) {
    if (
      !record ||
      typeof record !== "object" ||
      typeof record._id !== "string"
    ) {
      issues.push("Malformed published document");
      continue;
    }

    if (documentIds.has(record._id)) {
      issues.push(`Repeated document: ${record._id}`);
    }

    documentIds.add(record._id);

    if (
      !validId(record.categoryId) ||
      !validSlug(record.slug)
    ) {
      issues.push(
        `Invalid ID or slug: ${record._id}`
      );

      continue;
    }

    for (
      const [map, key, label] of [
        [ids, record.categoryId, "categoryId"],
        [slugs, record.slug, "slug"],
      ]
    ) {
      const previous = map.get(key);

      if (previous && previous !== record._id) {
        issues.push(
          `Duplicate ${label}: ${key}`
        );
      } else {
        map.set(key, record._id);
      }
    }
  }

  return issues;
}

function audit(previewRecords, remoteRecords) {
  const issues =
    detectPublishedDuplicates(remoteRecords);

  const results = [];

  for (const proposed of previewRecords) {
    const matches = remoteRecords.filter(
      (remote) =>
        remote?._id === proposed._id ||
        remote?.categoryId === proposed.categoryId ||
        remote?.slug === proposed.slug.current
    );

    if (matches.length === 0) {
      results.push({
        id: proposed.categoryId,
        slug: proposed.slug.current,
        status: "READY_CREATE",
        note: "No published match",
      });

      continue;
    }

    if (matches.length !== 1) {
      results.push({
        id: proposed.categoryId,
        slug: proposed.slug.current,
        status: "CONFLICT",
        note: "Multiple published matches",
      });

      continue;
    }

    const remote = matches[0];

    const differences =
      getDifferences(proposed, remote);

    if (differences.length > 0) {
      results.push({
        id: proposed.categoryId,
        slug: proposed.slug.current,
        status: "CONFLICT",
        note: `Different: ${differences.join(", ")}`,
      });

      continue;
    }

    results.push({
      id: proposed.categoryId,
      slug: proposed.slug.current,
      status: "EXISTS_MATCH",
      note:
        remote.approved === true
          ? "Already approved; preserve existing state"
          : "Existing published document; preserve state",
    });
  }

  return {
    results,
    issues,
  };
}

async function main() {
  const previewPath = getPreviewPath();
  const preview = readPreview(previewPath);
  const config = getConfig();

  console.log(
    `Sanity dataset: ${config.dataset}`
  );

  console.log(
    "Audit mode: READ ONLY"
  );

  const remote =
    await fetchPublishedCategories(config);

  console.log(
    `Published category documents found: ${remote.length}`
  );

  const { results, issues } =
    audit(preview, remote);

  console.table(results);

  const conflicts = results.filter(
    (item) => item.status === "CONFLICT"
  );

  const createCandidates = results.filter(
    (item) => item.status === "READY_CREATE"
  );

  const existingMatches = results.filter(
    (item) => item.status === "EXISTS_MATCH"
  );

  console.log(
    `READY_CREATE: ${createCandidates.length}`
  );

  console.log(
    `EXISTS_MATCH: ${existingMatches.length}`
  );

  console.log(
    `CONFLICT: ${conflicts.length}`
  );

  if (issues.length > 0) {
    console.error(
      "Published dataset issues:"
    );

    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
  }

  console.log(
    "No Sanity documents were created or modified."
  );

  console.log(
    "Unpublished drafts were NOT inspected."
  );

  if (
    conflicts.length > 0 ||
    issues.length > 0
  ) {
    fail(
      "Published category conflicts require review"
    );
  }

  console.log(
    "FILE 150 E7B: PUBLISHED CATEGORY AUDIT PASSED"
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exitCode = 1;
});
