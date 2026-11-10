
/**
 * BARK ORNAMENT — FILE 150 STEP E7C
 *
 * Authenticated, read-only category audit.
 *
 * Checks published documents, drafts
 * and release versions before migration.
 *
 * No create, patch, delete or publish calls.
 * No category records are changed.
 */

import fs from "node:fs";
import path from "node:path";

const API_VERSION = "2025-02-19";

const CATEGORY_COUNT = 10;
const MAX_DOCUMENTS = 500;

const QUERY = `{
  "total": count(*[
    _type == "catalogCategory"
  ]),
  "documents": *[
    _type == "catalogCategory"
  ] | order(_id asc)[0...501] {
    _id,
    _type,
    categoryId,
    "slug": slug.current,
    approved,
    _updatedAt
  }
}`;

function fail(message) {
  throw new Error(`FILE 150 E7C: ${message}`);
}

function getConfig() {
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
    fail(
      "SANITY_AUDIT_READ_TOKEN is missing. " +
      "Use a read-only token."
    );
  }

  return { projectId, dataset, token };
}

function readPreview() {
  const args = process.argv.slice(2);

  if (
    args.length !== 2 ||
    args[0] !== "--preview"
  ) {
    fail(
      "Usage: node audit-sanity-category-drafts.mjs " +
      "--preview <preview.json>"
    );
  }

  const filename = path.resolve(args[1]);

  if (!fs.existsSync(filename)) {
    fail("Migration preview does not exist");
  }

  let records;

  try {
    records = JSON.parse(
      fs.readFileSync(filename, "utf8")
    );
  } catch {
    fail("Invalid migration preview JSON");
  }

  if (
    !Array.isArray(records) ||
    records.length !== CATEGORY_COUNT
  ) {
    fail("Expected exactly 10 categories");
  }

  const ids = new Set();
  const slugs = new Set();

  for (const record of records) {
    const id = record?.categoryId;
    const slug = record?.slug?.current;

    if (
      record?._type !== "catalogCategory" ||
      record?._id !== `catalogCategory.${id}` ||
      record?.approved !== false ||
      typeof id !== "string" ||
      !/^cat-[a-z0-9-]+$/.test(id) ||
      typeof slug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
      fail("Invalid category migration preview");
    }

    if (ids.has(id) || slugs.has(slug)) {
      fail("Duplicate identity in migration preview");
    }

    ids.add(id);
    slugs.add(slug);
  }

  return records;
}

async function querySanity(config) {
  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/query/${config.dataset}`
  );

  endpoint.searchParams.set("query", QUERY);
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
        Authorization: `Bearer ${config.token}`,
      },
    });
  } catch {
    fail("Authenticated Sanity query failed");
  }

  if (!response.ok) {
    fail(
      `Sanity HTTP ${response.status}. ` +
      "Check the read token and dataset permissions."
    );
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    fail("Invalid Sanity API response");
  }

  const result = payload?.result;

  if (
    !result ||
    typeof result !== "object" ||
    !Number.isSafeInteger(result.total) ||
    !Array.isArray(result.documents)
  ) {
    fail("Unexpected Sanity response structure");
  }

  if (
    result.total > MAX_DOCUMENTS ||
    result.documents.length !== result.total
  ) {
    fail(
      "Category query incomplete or exceeds limit. " +
      "Do not import any records."
    );
  }

  return result.documents;
}

function classifyDocumentId(id) {
  if (id.startsWith("drafts.")) {
    return "DRAFT";
  }

  if (id.startsWith("versions.")) {
    return "RELEASE_VERSION";
  }

  if (id.startsWith("catalogCategory.")) {
    return "PUBLISHED";
  }

  return "OTHER";
}

function audit(preview, remote) {
  const results = [];

  for (const proposed of preview) {
    const matches = remote.filter((record) => {
      if (
        !record ||
        typeof record !== "object" ||
        typeof record._id !== "string"
      ) {
        return true;
      }

      const id = proposed._id;

      return (
        record._id === id ||
        record._id === `drafts.${id}` ||
        record._id.endsWith(`.${id}`) ||
        record.categoryId === proposed.categoryId ||
        record.slug === proposed.slug.current
      );
    });

    const versions = matches.filter(
      (record) =>
        typeof record?._id === "string" &&
        classifyDocumentId(record._id) ===
          "RELEASE_VERSION"
    );

    const drafts = matches.filter(
      (record) =>
        typeof record?._id === "string" &&
        classifyDocumentId(record._id) ===
          "DRAFT"
    );

    const unexpected = matches.filter(
      (record) =>
        typeof record?._id !== "string" ||
        classifyDocumentId(record._id) ===
          "OTHER"
    );

    const published = matches.filter(
      (record) =>
        record?._id === proposed._id
    );

    let status;

    if (unexpected.length > 0) {
      status = "BLOCK_UNEXPECTED_RECORD";
    } else if (versions.length > 0) {
      status = "BLOCK_RELEASE_VERSION";
    } else if (drafts.length > 0) {
      status = "BLOCK_DRAFT";
    } else if (
      published.length > 1 ||
      (
        matches.length > 0 &&
        published.length !== matches.length
      )
    ) {
      status = "BLOCK_IDENTITY_CONFLICT";
    } else if (
      published.length === 1 &&
      (
        published[0].categoryId !==
          proposed.categoryId ||
        published[0].slug !==
          proposed.slug.current
      )
    ) {
      status = "BLOCK_IDENTITY_CONFLICT";
    } else if (published.length === 1) {
      status = "EXISTS_PUBLISHED";
    } else {
      status = "CANDIDATE_CREATE";
    }

    results.push({
      categoryId: proposed.categoryId,
      slug: proposed.slug.current,
      status,
      matches: matches.length,
    });
  }

  return results;
}

async function main() {
  const preview = readPreview();
  const config = getConfig();

  const remote = await querySanity(config);

  console.log(
    `Sanity dataset: ${config.dataset}`
  );

  console.log("Mode: AUTHENTICATED READ ONLY");
  console.log(
    `Category documents found: ${remote.length}`
  );

  const results = audit(preview, remote);

  console.table(results);

  const blocked = results.filter(
    (record) =>
      record.status.startsWith("BLOCK_")
  );

  const candidates = results.filter(
    (record) =>
      record.status === "CANDIDATE_CREATE"
  );

  const existing = results.filter(
    (record) =>
      record.status === "EXISTS_PUBLISHED"
  );

  console.log(
    `CANDIDATE_CREATE: ${candidates.length}`
  );

  console.log(
    `EXISTS_PUBLISHED: ${existing.length}`
  );

  console.log(
    `BLOCKED: ${blocked.length}`
  );

  console.log(
    "No Sanity documents created or modified."
  );

  if (blocked.length > 0) {
    fail(
      "Draft, version or identity conflicts found. " +
      "Review before migration."
    );
  }

  console.log(
    "FILE 150 E7C: READ-ONLY AUDIT PASSED"
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
