
/**
 * BARK ORNAMENT — FILE 150 STEP E7D
 *
 * Read-only, create-only category import planner.
 *
 * Produces a local JSON plan for missing categories.
 *
 * DOES NOT:
 * - Call Sanity's mutation API
 * - Create or replace documents
 * - Approve or publish categories
 * - Modify existing CMS records
 * - Modify website source files
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const API_VERSION = "2025-02-19";
const EXPECTED_COUNT = 10;
const MAX_REMOTE = 500;

const EXPECTED_SLUGS = [
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

const CONTENT_FIELDS = [
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

const QUERY = `{
  "total": count(*[
    _type == "catalogCategory"
  ]),
  "documents": *[
    _type == "catalogCategory"
  ] | order(_id asc)[0...501] {
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
}`;

function fail(message) {
  throw new Error(`FILE 150 E7D: ${message}`);
}

function isRecord(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function config() {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
      ?.trim();

  const dataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET
      ?.trim();

  const token =
    process.env.SANITY_AUDIT_READ_TOKEN
      ?.trim();

  if (
    !projectId ||
    !dataset ||
    !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[a-z0-9_-]+$/.test(dataset)
  ) {
    fail("Invalid Sanity project configuration");
  }

  if (!token) {
    fail("Read-only audit token is required");
  }

  return { projectId, dataset, token };
}

function options() {
  const args = process.argv.slice(2);

  if (
    args.length !== 4 ||
    args[0] !== "--preview" ||
    args[2] !== "--output" ||
    !args[1] ||
    !args[3]
  ) {
    fail(
      "Usage: node prepare-sanity-category-import.mjs " +
      "--preview <preview.json> --output <plan.json>"
    );
  }

  return {
    previewPath: path.resolve(args[1]),
    outputPath: path.resolve(args[3]),
  };
}

function loadPreview(filename) {
  let records;

  try {
    records = JSON.parse(
      fs.readFileSync(filename, "utf8")
    );
  } catch {
    fail("Cannot read valid migration preview");
  }

  if (
    !Array.isArray(records) ||
    records.length !== EXPECTED_COUNT
  ) {
    fail("Expected exactly ten preview categories");
  }

  const ids = new Set();
  const slugs = new Set();

  for (let index = 0; index < records.length; index++) {
    const record = records[index];

    const expectedId =
      `cat-${String(index + 1).padStart(3, "0")}`;

    if (
      !isRecord(record) ||
      record._type !== "catalogCategory" ||
      record.categoryId !== expectedId ||
      record._id !==
        `catalogCategory.${expectedId}` ||
      record.slug?._type !== "slug" ||
      record.slug?.current !==
        EXPECTED_SLUGS[index] ||
      record.displayOrder !== index + 1 ||
      record.approved !== false ||
      !Array.isArray(record.examples) ||
      !Array.isArray(record.considerations) ||
      typeof record.name !== "string" ||
      typeof record.description !== "string"
    ) {
      fail(
        `Invalid preview category at position ${index + 1}`
      );
    }

    if (
      ids.has(record.categoryId) ||
      slugs.has(record.slug.current)
    ) {
      fail("Duplicate category in preview");
    }

    ids.add(record.categoryId);
    slugs.add(record.slug.current);
  }

  return records;
}

async function getRemoteCategories(settings) {
  const endpoint = new URL(
    `https://${settings.projectId}.api.sanity.io/v${API_VERSION}/data/query/${settings.dataset}`
  );

  endpoint.searchParams.set(
    "query",
    QUERY
  );

  endpoint.searchParams.set(
    "perspective",
    "raw"
  );

  let response;

  try {
    response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${settings.token}`,
      },
    });
  } catch {
    fail("Sanity read request failed");
  }

  if (!response.ok) {
    fail(
      `Sanity returned HTTP ${response.status}`
    );
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    fail("Sanity returned invalid JSON");
  }

  const result = payload?.result;

  if (
    !isRecord(result) ||
    !Number.isSafeInteger(result.total) ||
    !Array.isArray(result.documents) ||
    result.total < 0 ||
    result.total > MAX_REMOTE ||
    result.documents.length !== result.total
  ) {
    fail(
      "Remote category inventory is incomplete"
    );
  }

  return result.documents;
}

function normalize(value) {
  return value === undefined
    ? null
    : value;
}

function matchesExisting(proposed, remote) {
  if (
    remote._id !== proposed._id ||
    remote.slug !== proposed.slug.current
  ) {
    return false;
  }

  return CONTENT_FIELDS.every(
    (field) =>
      JSON.stringify(normalize(proposed[field])) ===
      JSON.stringify(normalize(remote[field]))
  );
}

function isRelated(proposed, remote) {
  const id = proposed._id;

  return (
    remote._id === id ||
    remote._id === `drafts.${id}` ||
    remote._id.endsWith(`.${id}`) ||
    remote.categoryId === proposed.categoryId ||
    remote.slug === proposed.slug.current
  );
}

function buildPlan(preview, remote) {
  const candidates = [];
  const existing = [];
  const conflicts = [];
  const table = [];

  const seenIds = new Set();
  const seenSlugs = new Set();

  for (const record of remote) {
    if (
      !isRecord(record) ||
      typeof record._id !== "string"
    ) {
      fail("Malformed remote category document");
    }

    if (
      typeof record.categoryId !== "string" ||
      typeof record.slug !== "string" ||
      seenIds.has(record._id)
    ) {
      fail("Incomplete or repeated remote identity");
    }

    seenIds.add(record._id);

    // Multiple published documents with the
    // same slug or category ID are rejected
    // by the per-category matching check.
    seenSlugs.add(record.slug);
  }

  for (const proposed of preview) {
    const matches = remote.filter(
      (record) => isRelated(proposed, record)
    );

    let status;

    if (matches.length === 0) {
      candidates.push(proposed);
      status = "CANDIDATE_CREATE";
    } else if (
      matches.length === 1 &&
      matchesExisting(proposed, matches[0])
    ) {
      existing.push(proposed.categoryId);
      status = "EXISTS_MATCH";
    } else {
      conflicts.push(proposed.categoryId);
      status = "BLOCK_CONFLICT";
    }

    table.push({
      categoryId: proposed.categoryId,
      slug: proposed.slug.current,
      status,
    });
  }

  return {
    table,
    candidates,
    existing,
    conflicts,
  };
}

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

async function main() {
  const args = options();
  const settings = config();

  const preview = loadPreview(args.previewPath);
  const remote =
    await getRemoteCategories(settings);

  const result = buildPlan(preview, remote);

  console.table(result.table);

  console.log(
    `CANDIDATE_CREATE: ${result.candidates.length}`
  );

  console.log(
    `EXISTS_MATCH: ${result.existing.length}`
  );

  console.log(
    `BLOCKED: ${result.conflicts.length}`
  );

  if (result.conflicts.length > 0) {
    fail(
      "Conflicting categories found. " +
      "No import plan will be written."
    );
  }

  const plan = {
    planVersion: 1,
    mode: "CREATE_ONLY_NOT_EXECUTED",
    projectId: settings.projectId,
    dataset: settings.dataset,
    preparedAt: new Date().toISOString(),
    sourceHash: sha256(
      JSON.stringify(preview)
    ),
    remoteDocumentCountAtPreparation:
      remote.length,
    existingIds: result.existing,
    candidates: result.candidates,
  };

  fs.mkdirSync(
    path.dirname(args.outputPath),
    { recursive: true }
  );

  fs.writeFileSync(
    args.outputPath,
    JSON.stringify(plan, null, 2) + "\n",
    {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    }
  );

  console.log(
    `Import plan saved: ${args.outputPath}`
  );

  console.log(
    "No Sanity mutations were performed."
  );

  console.log(
    "All new candidates retain approved=false."
  );

  console.log(
    "FILE 150 E7D: PLAN PREPARED"
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
