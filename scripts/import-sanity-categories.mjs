
/**
 * BARK ORNAMENT — FILE 150 STEP E7E
 *
 * Guarded create-only Sanity category import.
 *
 * Default: dry run. No writes.
 *
 * Execution requires:
 * - --apply
 * - --confirm-project <projectId>
 * - A separate write token
 * - Fresh complete raw-perspective audit
 * - Unchanged migration preview and plan
 *
 * Only "create" mutations are permitted.
 * Existing documents are never modified.
 */

import fs from "node:fs";
import crypto from "node:crypto";

const API_VERSION = "2025-02-19";
const EXPECTED_COUNT = 10;

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

const FIELDS = [
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

function fail(message) {
  throw new Error(`E7E: ${message}`);
}

function record(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function args() {
  const input = process.argv.slice(2);

  const allowed = new Set([
    "--preview",
    "--plan",
    "--apply",
    "--confirm-project",
  ]);

  const options = {};

  for (let i = 0; i < input.length; i++) {
    const flag = input[i];

    if (!allowed.has(flag) || flag in options) {
      fail(`Invalid or repeated argument: ${flag}`);
    }

    if (flag === "--apply") {
      options.apply = true;
      continue;
    }

    if (!input[i + 1] || input[i + 1].startsWith("--")) {
      fail(`Missing argument for ${flag}`);
    }

    options[flag] = input[++i];
  }

  if (!options["--preview"] || !options["--plan"]) {
    fail("Both --preview and --plan are required");
  }

  if (
    !options.apply &&
    options["--confirm-project"]
  ) {
    fail("--confirm-project is only valid with --apply");
  }

  return options;
}

function readJson(filename) {
  try {
    return JSON.parse(
      fs.readFileSync(filename, "utf8")
    );
  } catch {
    fail(`Cannot read valid JSON: ${filename}`);
  }
}

function configuration(options) {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();

  const dataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();

  const readToken =
    process.env.SANITY_AUDIT_READ_TOKEN?.trim();

  const writeToken =
    process.env.SANITY_CATEGORY_IMPORT_TOKEN?.trim();

  if (
    !projectId ||
    !dataset ||
    !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[a-z0-9_-]+$/.test(dataset)
  ) {
    fail("Invalid Sanity project or dataset");
  }

  if (!readToken) {
    fail("Read-only audit token required");
  }

  if (options.apply) {
    if (!writeToken) {
      fail("Separate write token required");
    }

    if (readToken === writeToken) {
      fail("Audit and write tokens must differ");
    }

    if (options["--confirm-project"] !== projectId) {
      fail("Project confirmation does not match");
    }
  }

  return {
    projectId,
    dataset,
    readToken,
    writeToken,
  };
}

function verifyPreview(preview) {
  if (
    !Array.isArray(preview) ||
    preview.length !== EXPECTED_COUNT
  ) {
    fail("Exactly ten categories are required");
  }

  preview.forEach((item, index) => {
    const id =
      `cat-${String(index + 1).padStart(3, "0")}`;

    if (
      !record(item) ||
      item._id !== `catalogCategory.${id}` ||
      item._type !== "catalogCategory" ||
      item.categoryId !== id ||
      item.slug?._type !== "slug" ||
      item.slug.current !== EXPECTED_SLUGS[index] ||
      item.displayOrder !== index + 1 ||
      item.approved !== false ||
      typeof item.name !== "string" ||
      typeof item.description !== "string" ||
      !Array.isArray(item.examples) ||
      !Array.isArray(item.considerations) ||
      Object.keys(item).some(
        (key) =>
          ![
            "_id",
            "_type",
            "slug",
            "approved",
            ...FIELDS,
          ].includes(key)
      )
    ) {
      fail(`Invalid category preview: ${id}`);
    }
  });
}

function verifyPlan(plan, preview, config) {
  if (
    !record(plan) ||
    plan.planVersion !== 1 ||
    plan.mode !== "CREATE_ONLY_NOT_EXECUTED" ||
    plan.projectId !== config.projectId ||
    plan.dataset !== config.dataset ||
    plan.sourceHash !== hash(preview) ||
    !Array.isArray(plan.candidates) ||
    !Array.isArray(plan.existingIds)
  ) {
    fail("Import plan is invalid or stale");
  }

  const previewById = new Map(
    preview.map((item) => [item._id, item])
  );

  const planned = new Set();

  for (const candidate of plan.candidates) {
    const original = previewById.get(
      candidate?._id
    );

    if (
      !original ||
      hash(candidate) !== hash(original) ||
      planned.has(candidate._id)
    ) {
      fail("Invalid or duplicated plan candidate");
    }

    planned.add(candidate._id);
  }

  for (const categoryId of plan.existingIds) {
    const id = `catalogCategory.${categoryId}`;

    if (
      !previewById.has(id) ||
      planned.has(id)
    ) {
      fail("Invalid existing category in plan");
    }

    planned.add(id);
  }

  if (planned.size !== EXPECTED_COUNT) {
    fail("Plan does not cover all categories");
  }
}

async function remoteCategories(config) {
  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/query/${config.dataset}`
  );

  const query = `{
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

  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("perspective", "raw");

  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.readToken}`,
    },
  });

  if (!response.ok) {
    fail(`Sanity audit HTTP ${response.status}`);
  }

  const data = (await response.json()).result;

  if (
    !record(data) ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    data.total > 500 ||
    !Array.isArray(data.documents) ||
    data.documents.length !== data.total
  ) {
    fail("Remote category inventory incomplete");
  }

  return data.documents;
}

function matches(existing, proposed) {
  if (
    existing._id !== proposed._id ||
    existing.slug !== proposed.slug.current
  ) {
    return false;
  }

  return FIELDS.every(
    (field) =>
      JSON.stringify(existing[field] ?? null) ===
      JSON.stringify(proposed[field] ?? null)
  );
}

function verifyRemote(preview, plan, remote) {
  const candidates = [];
  const existing = [];
  const usedRemoteIds = new Set();

  for (const document of remote) {
    if (
      !record(document) ||
      typeof document._id !== "string" ||
      usedRemoteIds.has(document._id)
    ) {
      fail("Malformed or duplicated remote document");
    }

    usedRemoteIds.add(document._id);
  }

  for (const proposed of preview) {
    const matchesIdentity = remote.filter(
      (item) =>
        item._id === proposed._id ||
        item._id === `drafts.${proposed._id}` ||
        item._id.endsWith(`.${proposed._id}`) ||
        item.categoryId === proposed.categoryId ||
        item.slug === proposed.slug.current
    );

    if (matchesIdentity.length === 0) {
      candidates.push(proposed);
      continue;
    }

    if (
      matchesIdentity.length === 1 &&
      matches(matchesIdentity[0], proposed)
    ) {
      existing.push(proposed.categoryId);
      continue;
    }

    fail(
      `Category conflict: ${proposed.categoryId}. ` +
      "No import permitted."
    );
  }

  const expectedCandidateIds = plan.candidates
    .map((item) => item._id)
    .sort();

  const currentCandidateIds = candidates
    .map((item) => item._id)
    .sort();

  if (
    JSON.stringify(expectedCandidateIds) !==
      JSON.stringify(currentCandidateIds) ||
    JSON.stringify([...plan.existingIds].sort()) !==
      JSON.stringify(existing.sort())
  ) {
    fail(
      "Sanity dataset changed after plan preparation. " +
      "Regenerate the plan before proceeding."
    );
  }

  return candidates;
}

async function executeCreateOnly(config, candidates) {
  if (candidates.length === 0) {
    console.log("Nothing to create.");
    return;
  }

  const endpoint = new URL(
    `https://${config.projectId}.api.sanity.io/v${API_VERSION}/data/mutate/${config.dataset}`
  );

  endpoint.searchParams.set(
    "returnIds",
    "true"
  );

  const mutations = candidates.map(
    (item) => ({
      create: item,
    })
  );

  const response = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.writeToken}`,
    },
    body: JSON.stringify({
      mutations,
    }),
  });

  if (!response.ok) {
    fail(
      `Create-only transaction rejected: ` +
      `HTTP ${response.status}. ` +
      "Inspect the dataset before retrying."
    );
  }

  const result = await response.json();

  console.log(
    "Sanity transaction accepted."
  );

  console.log(
    `Created records requested: ${candidates.length}`
  );

  console.log(
    `Transaction ID: ${result.transactionId ?? "Unavailable"}`
  );
}

async function main() {
  const options = args();

  const preview = readJson(
    options["--preview"]
  );

  const plan = readJson(
    options["--plan"]
  );

  const config = configuration(options);

  verifyPreview(preview);
  verifyPlan(plan, preview, config);

  const remote = await remoteCategories(config);

  const candidates = verifyRemote(
    preview,
    plan,
    remote
  );

  console.log(
    `Project: ${config.projectId}`
  );

  console.log(
    `Dataset: ${config.dataset}`
  );

  console.log(
    `Missing categories: ${candidates.length}`
  );

  console.table(
    candidates.map((item) => ({
      id: item.categoryId,
      slug: item.slug.current,
      approved: item.approved,
    }))
  );

  if (!options.apply) {
    console.log(
      "DRY RUN PASSED — NO SANITY MUTATIONS."
    );
    return;
  }

  console.log(
    "Executing atomic create-only transaction."
  );

  await executeCreateOnly(
    config,
    candidates
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
