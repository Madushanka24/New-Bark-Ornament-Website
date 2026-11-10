
/**
 * Bark Ornament — File 71
 * Read-only staging evidence register and approval-gate audit.
 *
 * Commands:
 *   --self-test
 *   --template
 *   --audit [evidence-json-path]
 *
 * No network, database, subprocess, mutation,
 * quotation submissions or email activity.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/* =====================================================
   1. REQUIRED SAFETY SWITCHES
   ===================================================== */

const FLAGS = Object.freeze([
  "QUOTATION_SUBMISSIONS_ENABLED",
  "QUOTATION_E2E_TEST_MODE",
  "QUOTATION_EMAIL_NOTIFICATIONS_ENABLED",
]);

const ENV_FILES = Object.freeze([
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
]);

/* =====================================================
   2. TWELVE INFRASTRUCTURE EVIDENCE GATES

   These are the required controls defined
   for the future staging environment.

   Their presence in this script does not
   prove that hosting has been configured.
   ===================================================== */

const GATES = Object.freeze([
  [
    "G01",
    "Hosting IAM and administrator MFA",
  ],
  [
    "G02",
    "HTTPS ingress and restricted staging access",
  ],
  [
    "G03",
    "Separation from production hosting accounts",
  ],
  [
    "G04",
    "Staging PostgreSQL isolation and least-privilege role",
  ],
  [
    "G05",
    "Database private network and TLS hostname verification",
  ],
  [
    "G06",
    "Server-only secret manager and rotation controls",
  ],
  [
    "G07",
    "Disabled flags verified in running staging process",
  ],
  [
    "G08",
    "No worker process or worker credentials in staging",
  ],
  [
    "G09",
    "Email provider egress blocked and credentials absent",
  ],
  [
    "G10",
    "Encrypted isolated backup and completed restore drill",
  ],
  [
    "G11",
    "Monitoring, incident response and privacy retention",
  ],
  [
    "G12",
    "Rollback rehearsal and deployment approval governance",
  ],
]);

/* =====================================================
   3. ALLOWED EVIDENCE METADATA

   Credential values, passwords and tokens
   must never appear in this register.

   Only these fields are permitted.
   ===================================================== */

const FIELD_NAMES = new Set([
  "id",
  "state",
  "evidenceRef",
  "owner",
  "reviewer",
  "reviewedOn",
  "reviewResult",
]);

/*
 * Evidence references are controlled IDs,
 * not URLs, paths, passwords or credentials.
 *
 * Example:
 * SEC-G01-20261028
 */

const ID_RE = /^[A-Z][A-Z0-9-]{7,63}$/;

/*
 * Owner and reviewer identifiers only.
 *
 * Do not use personal email addresses.
 */

const ACTOR_RE = /^[A-Za-z][A-Za-z0-9._-]{2,47}$/;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* =====================================================
   4. CREATE AN EMPTY EVIDENCE REGISTER

   This function produces a JavaScript object.
   It does not write a file.
   ===================================================== */

function template() {
  return {
    schemaVersion: 1,

    environment: "staging",

    authorization: "not-authorized",

    controls: GATES.map(
      ([id]) => ({
        id,

        state: "missing",

        evidenceRef: null,

        owner: null,

        reviewer: null,

        reviewedOn: null,

        reviewResult: null,
      })
    ),
  };
}

/* =====================================================
   5. VALIDATE CALENDAR DATES

   Rejects dates such as:
   2026-02-30

   Dates are interpreted in UTC for
   deterministic validation.
   ===================================================== */

function realDate(iso) {
  if (
    typeof iso !== "string" ||
    !DATE_RE.test(iso)
  ) {
    return false;
  }

  const time = Date.parse(
    `${iso}T00:00:00.000Z`
  );

  return (
    Number.isFinite(time) &&
    new Date(time)
      .toISOString()
      .slice(0, 10) === iso
  );
}

/* =====================================================
   6. VALIDATE EVIDENCE RECORDS

   Supported states:

   missing:
     No evidence collected.

   submitted:
     Evidence reference and owner recorded.

   reviewed:
     Reviewer, review date and pass/fail
     result recorded.

   IMPORTANT:
   Even a reviewed PASS is a CLAIM in
   the register, not independent proof.

   It never grants deployment approval.
   ===================================================== */

function registerIssues(register, today) {
  const problems = [];

  const fail = (code) =>
    problems.push(code);

  if (
    !register ||
    typeof register !== "object" ||
    Array.isArray(register)
  ) {
    return ["REGISTER_INVALID"];
  }

  const topFields = [
    "schemaVersion",
    "environment",
    "authorization",
    "controls",
  ];

  if (
    Object.keys(register).some(
      (key) =>
        !topFields.includes(key)
    )
  ) {
    fail("REGISTER_UNEXPECTED_FIELD");
  }

  if (
    register.schemaVersion !== 1
  ) {
    fail("REGISTER_VERSION");
  }

  if (
    register.environment !== "staging"
  ) {
    fail("REGISTER_ENVIRONMENT");
  }

  if (
    register.authorization !==
      "not-authorized"
  ) {
    fail("REGISTER_AUTHORIZATION");
  }

  if (
    !Array.isArray(register.controls) ||
    register.controls.length !==
      GATES.length
  ) {
    return [
      ...new Set([
        ...problems,
        "REGISTER_CONTROL_COUNT",
      ]),
    ];
  }

  const seen = new Set();

  const required = new Set(
    GATES.map(
      ([id]) => id
    )
  );

  for (
    const item of register.controls
  ) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      fail("CONTROL_INVALID");
      continue;
    }

    const id = item.id;

    if (
      typeof id !== "string" ||
      !required.has(id)
    ) {
      fail("CONTROL_UNKNOWN_ID");
      continue;
    }

    if (seen.has(id)) {
      fail(`${id}_DUPLICATED`);
    }

    seen.add(id);

    if (
      Object.keys(item).some(
        (key) =>
          !FIELD_NAMES.has(key)
      )
    ) {
      fail(`${id}_UNEXPECTED_FIELD`);
    }

    if (
      ![
        "missing",
        "submitted",
        "reviewed",
      ].includes(item.state)
    ) {
      fail(`${id}_STATE`);
      continue;
    }

    /* ---------------------------------
       Missing evidence
       --------------------------------- */

    if (
      item.state === "missing"
    ) {
      const hasData = [
        item.evidenceRef,
        item.owner,
        item.reviewer,
        item.reviewedOn,
        item.reviewResult,
      ].some(
        (value) =>
          value !== null
      );

      if (hasData) {
        fail(
          `${id}_MISSING_HAS_DATA`
        );
      }

      continue;
    }

    /* ---------------------------------
       Evidence reference
       --------------------------------- */

    if (
      typeof item.evidenceRef !==
        "string" ||
      !ID_RE.test(item.evidenceRef)
    ) {
      fail(
        `${id}_EVIDENCE_REFERENCE`
      );
    }

    /* ---------------------------------
       Responsible evidence owner
       --------------------------------- */

    if (
      typeof item.owner !== "string" ||
      !ACTOR_RE.test(item.owner)
    ) {
      fail(`${id}_OWNER`);
    }

    /* ---------------------------------
       Submitted but not reviewed
       --------------------------------- */

    if (
      item.state === "submitted"
    ) {
      if (
        [
          item.reviewer,
          item.reviewedOn,
          item.reviewResult,
        ].some(
          (value) =>
            value !== null
        )
      ) {
        fail(
          `${id}_SUBMITTED_REVIEW_FIELDS`
        );
      }

      continue;
    }

    /* ---------------------------------
       Independent reviewer identity
       --------------------------------- */

    if (
      typeof item.reviewer !==
        "string" ||
      !ACTOR_RE.test(item.reviewer)
    ) {
      fail(`${id}_REVIEWER`);

    } else if (
      item.reviewer === item.owner
    ) {
      fail(
        `${id}_SEPARATION_OF_DUTIES`
      );
    }

    /* ---------------------------------
       Review date and freshness

       A review older than 90 days requires
       fresh verification.

       This is a File 71 review policy,
       not a hosting-provider guarantee.
       --------------------------------- */

    if (
      !realDate(item.reviewedOn) ||
      item.reviewedOn > today
    ) {
      fail(
        `${id}_REVIEW_DATE`
      );

    } else {
      const ageDays = Math.floor(
        (
          Date.parse(
            `${today}T00:00:00Z`
          ) -
          Date.parse(
            `${item.reviewedOn}T00:00:00Z`
          )
        ) /
        86400000
      );

      if (
        ageDays > 90
      ) {
        fail(
          `${id}_STALE_REVIEW`
        );
      }
    }

    /* ---------------------------------
       Review outcome
       --------------------------------- */

    if (
      ![
        "pass",
        "fail",
      ].includes(item.reviewResult)
    ) {
      fail(
        `${id}_REVIEW_RESULT`
      );
    }
  }

  for (const id of required) {
    if (!seen.has(id)) {
      fail(`${id}_MISSING`);
    }
  }

  return [
    ...new Set(problems),
  ];
}

/* =====================================================
   7. READ SIMPLE DOTENV ASSIGNMENTS

   Values are inspected in memory only.

   Passwords, tokens and database URLs
   are never included in the report.

   This is not a complete dotenv interpreter.
   ===================================================== */

function parseEnv(contents) {
  const assignments =
    new Map();

  if (
    typeof contents !== "string"
  ) {
    return assignments;
  }

  for (
    const line of contents
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
  ) {
    const match =
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/
        .exec(line);

    if (!match) {
      continue;
    }

    const raw =
      match[2].trim();

    const quoted =
      /^(?:"([^"]*)"|'([^']*)')(?:\s*#.*)?$/
        .exec(raw);

    const value = quoted
      ? (
        quoted[1] ??
        quoted[2]
      )
      : raw
          .replace(/\s+#.*$/, "")
          .trim();

    const list =
      assignments.get(
        match[1]
      ) ?? [];

    list.push(value);

    assignments.set(
      match[1],
      list
    );
  }

  return assignments;
}

/* =====================================================
   8. MODEL NEXT.JS FLAG PRECEDENCE

   Process environment
   .env.<mode>.local
   .env.local, except test
   .env.<mode>
   .env

   Only the protected three switches
   are evaluated.

   No server is started.
   ===================================================== */

function effectiveFlag(
  name,
  mode,
  maps,
  shell
) {
  if (
    Object.hasOwn(
      shell,
      name
    ) &&
    shell[name] !== undefined
  ) {
    return shell[name];
  }

  const order = [
    `.env.${mode}.local`,

    ...(
      mode === "test"
        ? []
        : [".env.local"]
    ),

    `.env.${mode}`,

    ".env",
  ];

  for (
    const file of order
  ) {
    const values =
      maps.get(file)?.get(name)
      ?? [];

    if (values.length) {
      return values.at(-1);
    }
  }

  return undefined;
}

/* =====================================================
   9. TEN LOCAL READINESS CHECKS

   These checks establish local prerequisites.

   They do not verify real staging hosting,
   database TLS or provider-side permissions.
   ===================================================== */

function localChecks({
  read,
  exists,
  shell = {},
}) {
  const maps = new Map(
    ENV_FILES.map(
      (name) => [
        name,
        parseEnv(
          read(name)
        ),
      ]
    )
  );

  const checks = [];

  const add = (
    id,
    condition,
    label
  ) => {
    checks.push({
      id,

      status:
        condition === null
          ? "NOT_VERIFIED"
          : condition
            ? "PASS"
            : "FAIL",

      label,
    });
  };

  const base =
    maps.get(".env.local");

  /* L01 - Local protected switches */

  add(
    "L01",

    FLAGS.every(
      (flag) =>
        base.get(flag)?.length === 1 &&
        base.get(flag)[0] === "false"
    ),

    "Local safety switches explicitly false exactly once"
  );

  /* L02 - Other dotenv files */

  add(
    "L02",

    ENV_FILES.filter(
      (file) =>
        file !== ".env.local"
    ).every(
      (file) =>
        FLAGS.every(
          (name) => {
            const values =
              maps.get(file).get(name)
              ?? [];

            return (
              values.length <= 1 &&
              values.every(
                (value) =>
                  value === "false"
              )
            );
          }
        )
    ),

    "No unsafe dotenv safety-switch overrides"
  );

  /* L03 - Process-level overrides */

  add(
    "L03",

    FLAGS.every(
      (flag) =>
        shell[flag] === undefined ||
        shell[flag] === "false"
    ),

    "No unsafe process-level safety-switch overrides"
  );

  /* L04 - Local production-mode flags */

  add(
    "L04",

    FLAGS.every(
      (flag) =>
        effectiveFlag(
          flag,
          "production",
          maps,
          shell
        ) === "false"
    ),

    "Effective local production-mode switches disabled"
  );

  /* L05 - File 70 retained */

  add(
    "L05",

    exists(
      "scripts/quotation-staging-infrastructure-evidence.mjs"
    ),

    "File 70 infrastructure audit script retained"
  );

  /* L06 - File 68 retained */

  add(
    "L06",

    exists(
      "scripts/quotation-staging-deployment-manifest.mjs"
    ),

    "File 68 provider-neutral manifest script retained"
  );

  /* L07 - File 62 retained */

  add(
    "L07",

    exists(
      "database/016_create_email_recovery_consistency_audit.sql"
    ),

    "File 62 consistency audit migration source retained"
  );

  /* L08 - Server-side quotation route */

  add(
    "L08",

    exists(
      "src/app/api/quotations/route.ts"
    ) ||
    exists(
      "app/api/quotations/route.ts"
    ),

    "Server-side quotation API route retained"
  );

  /* L09 - Production dotenv TLS */

  add(
    "L09",

    ![
      ".env.production",
      ".env.production.local",
    ].some(
      (file) =>
        (
          maps.get(file).get(
            "DATABASE_SSL_MODE"
          ) ?? []
        ).includes(
          "disable"
        )
    ),

    "No explicit production dotenv TLS disable"
  );

  /* L10 - Nonstandard staging dotenv */

  add(
    "L10",

    ![
      ".env.staging",
      ".env.staging.local",
    ].some(exists)
      ? true
      : null,

    "No nonstandard staging dotenv loading assumed"
  );

  return checks;
}

/* =====================================================
   10. COMBINE EVIDENCE AND LOCAL CHECKS

   IMPORTANT:

   Reviewed PASS is recorded as a CLAIM.

   No row can be independently verified by
   this offline script.

   Staging/production approval stays false.
   ===================================================== */

function inspect(
  project,
  register,
  today
) {
  return {
    issues:
      registerIssues(
        register,
        today
      ),

    local:
      localChecks(project),

    controls:
      GATES.map(
        ([id, label]) => {
          const item =
            register?.controls?.find(
              (x) =>
                x?.id === id
            );

          let status = "MISSING";

          if (
            item?.state === "reviewed"
          ) {
            status =
              item.reviewResult ===
                "pass"
                ? "REVIEW_CLAIM_RECORDED"
                : "REVIEW_FAILED";

          } else if (
            item?.state === "submitted"
          ) {
            status =
              "SUBMITTED_UNVERIFIED";
          }

          return {
            id,
            label,
            status,
          };
        }
      ),

    stagingAuthorized: false,

    productionAuthorized: false,
  };
}

/* =====================================================
   11. FORMAT SAFE REPORT OUTPUT

   Only control IDs, statuses and descriptions
   are printed.

   Evidence references, reviewer identities
   and secret values are not printed.
   ===================================================== */

function format(result) {
  const output = [
    "FILE 71 - STAGING EVIDENCE REGISTER (OFFLINE)",
  ];

  output.push(
    `REGISTER_SCHEMA: ${
      result.issues.length
        ? "FAIL"
        : "PASS"
    }`
  );

  for (
    const code of
    result.issues
  ) {
    output.push(
      `REGISTER_ISSUE: ${code}`
    );
  }

  for (
    const check of
    result.local
  ) {
    output.push(
      `${check.id} [${check.status}] ${check.label}`
    );
  }

  const n =
    (status) =>
      result.local.filter(
        (item) =>
          item.status === status
      ).length;

  output.push(
    `LOCAL_SUMMARY: ${
      n("PASS")
    } PASS, ${
      n("FAIL")
    } FAIL, ${
      n("NOT_VERIFIED")
    } NOT_VERIFIED`
  );

  for (
    const control of
    result.controls
  ) {
    output.push(
      `${control.id} [${control.status}] ${control.label}`
    );
  }

  const reviewed =
    result.controls.filter(
      (item) =>
        item.status ===
          "REVIEW_CLAIM_RECORDED"
    ).length;

  output.push(
    `EVIDENCE_REVIEW_CLAIMS: ${
      reviewed
    }/${GATES.length}`
  );

  output.push(
    "EXTERNAL_INFRASTRUCTURE_INDEPENDENTLY_VERIFIED: NO"
  );

  output.push(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

  output.push(
    "PRODUCTION_ACTIVATION: NOT_AUTHORIZED"
  );

  output.push(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0"
  );

  return output.join("\n");
}

/* =====================================================
   12. FICTIONAL IN-MEMORY PROJECT

   Used by the self-tests only.

   No files written to disk.
   No real credentials or connections.
   ===================================================== */

function fiction() {
  const files = new Map([
    [
      ".env.local",

      FLAGS.map(
        (flag) =>
          `${flag}="false"`
      ).join("\n"),
    ],

    [
      "scripts/quotation-staging-infrastructure-evidence.mjs",
      "fictional",
    ],

    [
      "scripts/quotation-staging-deployment-manifest.mjs",
      "fictional",
    ],

    [
      "database/016_create_email_recovery_consistency_audit.sql",
      "fictional",
    ],

    [
      "src/app/api/quotations/route.ts",
      "fictional",
    ],
  ]);

  return {
    read:
      (name) =>
        files.get(name) ??
        null,

    exists:
      (name) =>
        files.has(name),

    shell: {},

    files,
  };
}

/* =====================================================
   13. THIRTY-FIVE CONTROLLED SELF-TESTS

   All tests use fictional configuration.

   Self-test date is fixed for repeatability.
   ===================================================== */

function selfTest() {
  let passed = 0;

  const test =
    (name, fn) => {
      fn();

      console.log(
        `PASS ${++passed}: ${name}`
      );
    };

  const today =
    "2026-10-28";

  const valid =
    () => template();

  const reviewed =
    () => {
      const register =
        valid();

      const item =
        register.controls[0];

      Object.assign(
        item,
        {
          state: "reviewed",

          evidenceRef:
            "SEC-G01-20261028",

          owner:
            "ops-owner",

          reviewer:
            "sec-reviewer",

          reviewedOn:
            today,

          reviewResult:
            "pass",
        }
      );

      return register;
    };

  const submitted =
    () => {
      const register =
        valid();

      Object.assign(
        register.controls[0],
        {
          state: "submitted",

          evidenceRef:
            "SEC-G01-20261028",

          owner:
            "ops-owner",
        }
      );

      return register;
    };

  const fails =
    (register, code) =>
      assert.ok(
        registerIssues(
          register,
          today
        ).includes(code),
        code
      );

  /* TEST 1 */

  test(
    "Default register is structurally valid",

    () =>
      assert.deepEqual(
        registerIssues(
          valid(),
          today
        ),
        []
      )
  );

  /* TEST 2 */

  test(
    "Fictional local baseline has 10 passes",

    () =>
      assert.equal(
        localChecks(
          fiction()
        ).filter(
          (x) =>
            x.status === "PASS"
        ).length,
        10
      )
  );

  /* TEST 3 */

  test(
    "Default controls are missing, not verified",

    () =>
      assert.ok(
        inspect(
          fiction(),
          valid(),
          today
        ).controls.every(
          (x) =>
            x.status === "MISSING"
        )
      )
  );

  /* TEST 4 */

  test(
    "Submitted claim accepted as documented, not verified",

    () =>
      assert.deepEqual(
        registerIssues(
          submitted(),
          today
        ),
        []
      )
  );

  /* TEST 5 */

  test(
    "Reviewed fictional claim accepted as a record",

    () =>
      assert.deepEqual(
        registerIssues(
          reviewed(),
          today
        ),
        []
      )
  );

  /* TEST 6 */

  test(
    "Review record does not authorize staging",

    () =>
      assert.equal(
        inspect(
          fiction(),
          reviewed(),
          today
        ).stagingAuthorized,
        false
      )
  );

  /* TEST 7 */

  test(
    "Review claim never becomes independently verified",

    () =>
      assert.equal(
        inspect(
          fiction(),
          reviewed(),
          today
        ).controls[0].status,

        "REVIEW_CLAIM_RECORDED"
      )
  );

  /* TEST 8 */

  test(
    "Invalid register object rejected",

    () =>
      fails(
        null,
        "REGISTER_INVALID"
      )
  );

  /* TEST 9 */

  test(
    "Unexpected top-level field rejected",

    () => {
      const r = valid();

      r.secret = "HIDDEN";

      fails(
        r,
        "REGISTER_UNEXPECTED_FIELD"
      );
    }
  );

  /* TEST 10 */

  test(
    "Invalid schema version rejected",

    () => {
      const r = valid();

      r.schemaVersion = 2;

      fails(
        r,
        "REGISTER_VERSION"
      );
    }
  );

  /* TEST 11 */

  test(
    "Production environment rejected",

    () => {
      const r = valid();

      r.environment =
        "production";

      fails(
        r,
        "REGISTER_ENVIRONMENT"
      );
    }
  );

  /* TEST 12 */

  test(
    "Forged authorization rejected",

    () => {
      const r = valid();

      r.authorization =
        "authorized";

      fails(
        r,
        "REGISTER_AUTHORIZATION"
      );
    }
  );

  /* TEST 13 */

  test(
    "Missing control rejected",

    () => {
      const r = valid();

      r.controls.pop();

      fails(
        r,
        "REGISTER_CONTROL_COUNT"
      );
    }
  );

  /* TEST 14 */

  test(
    "Duplicate control rejected",

    () => {
      const r = valid();

      r.controls[1].id =
        "G01";

      fails(
        r,
        "G01_DUPLICATED"
      );
    }
  );

  /* TEST 15 */

  test(
    "Unknown control rejected",

    () => {
      const r = valid();

      r.controls[1].id =
        "G99";

      fails(
        r,
        "CONTROL_UNKNOWN_ID"
      );
    }
  );

  /* TEST 16 */

  test(
    "Unexpected evidence field rejected",

    () => {
      const r = valid();

      r.controls[0].password =
        "HIDDEN";

      fails(
        r,
        "G01_UNEXPECTED_FIELD"
      );
    }
  );

  /* TEST 17 */

  test(
    "Illegal review state rejected",

    () => {
      const r = valid();

      r.controls[0].state =
        "verified";

      fails(
        r,
        "G01_STATE"
      );
    }
  );

  /* TEST 18 */

  test(
    "Missing state with added evidence rejected",

    () => {
      const r = valid();

      r.controls[0].evidenceRef =
        "SEC-G01-20261028";

      fails(
        r,
        "G01_MISSING_HAS_DATA"
      );
    }
  );

  /* TEST 19 */

  test(
    "Evidence reference containing URL rejected",

    () => {
      const r = submitted();

      r.controls[0].evidenceRef =
        "https://secret.example";

      fails(
        r,
        "G01_EVIDENCE_REFERENCE"
      );
    }
  );

  /* TEST 20 */

  test(
    "Missing evidence owner rejected",

    () => {
      const r = submitted();

      r.controls[0].owner =
        null;

      fails(
        r,
        "G01_OWNER"
      );
    }
  );

  /* TEST 21 */

  test(
    "Submitted record with reviewer data rejected",

    () => {
      const r = submitted();

      r.controls[0].reviewer =
        "sec-reviewer";

      fails(
        r,
        "G01_SUBMITTED_REVIEW_FIELDS"
      );
    }
  );

  /* TEST 22 */

  test(
    "Missing independent reviewer rejected",

    () => {
      const r = reviewed();

      r.controls[0].reviewer =
        null;

      fails(
        r,
        "G01_REVIEWER"
      );
    }
  );

  /* TEST 23 */

  test(
    "Same owner and reviewer rejected",

    () => {
      const r = reviewed();

      r.controls[0].reviewer =
        "ops-owner";

      fails(
        r,
        "G01_SEPARATION_OF_DUTIES"
      );
    }
  );

  /* TEST 24 */

  test(
    "Future review date rejected",

    () => {
      const r = reviewed();

      r.controls[0].reviewedOn =
        "2026-10-29";

      fails(
        r,
        "G01_REVIEW_DATE"
      );
    }
  );

  /* TEST 25 */

  test(
    "Invalid calendar date rejected",

    () => {
      const r = reviewed();

      r.controls[0].reviewedOn =
        "2026-02-30";

      fails(
        r,
        "G01_REVIEW_DATE"
      );
    }
  );

  /* TEST 26 */

  test(
    "Stale review rejected",

    () => {
      const r = reviewed();

      r.controls[0].reviewedOn =
        "2025-10-28";

      fails(
        r,
        "G01_STALE_REVIEW"
      );
    }
  );

  /* TEST 27 */

  test(
    "Missing review outcome rejected",

    () => {
      const r = reviewed();

      r.controls[0].reviewResult =
        null;

      fails(
        r,
        "G01_REVIEW_RESULT"
      );
    }
  );

  /* TEST 28 */

  test(
    "Failed review is never counted passed",

    () => {
      const r = reviewed();

      r.controls[0].reviewResult =
        "fail";

      assert.equal(
        inspect(
          fiction(),
          r,
          today
        ).controls[0].status,

        "REVIEW_FAILED"
      );
    }
  );

  /* TEST 29 */

  test(
    "Local enabled safety flag fails",

    () => {
      const p = fiction();

      p.files.set(
        ".env.local",

        FLAGS.map(
          (flag) =>
            `${flag}=true`
        ).join("\n")
      );

      assert.equal(
        localChecks(p)[0].status,
        "FAIL"
      );
    }
  );

  /* TEST 30 */

  test(
    "Local shell override fails",

    () => {
      const p = fiction();

      p.shell = {
        [FLAGS[0]]: "true",
      };

      assert.equal(
        localChecks(p)[2].status,
        "FAIL"
      );
    }
  );

  /* TEST 31 */

  test(
    "Production dotenv override fails",

    () => {
      const p = fiction();

      p.files.set(
        ".env.production.local",
        `${FLAGS[0]}=true`
      );

      assert.equal(
        localChecks(p)[1].status,
        "FAIL"
      );
    }
  );

  /* TEST 32 */

  test(
    "Missing File 70 evidence shows failure",

    () => {
      const p = fiction();

      p.files.delete(
        "scripts/quotation-staging-infrastructure-evidence.mjs"
      );

      assert.equal(
        localChecks(p)[4].status,
        "FAIL"
      );
    }
  );

  /* TEST 33 */

  test(
    "Nonstandard staging env is not certified",

    () => {
      const p = fiction();

      p.files.set(
        ".env.staging",
        "TEST=1"
      );

      assert.equal(
        localChecks(p)[9].status,
        "NOT_VERIFIED"
      );
    }
  );

  /* TEST 34 */

  test(
    "Report never prints evidence reference, actors or secrets",

    () => {
      const r = reviewed();

      r.controls[0].secret =
        "PRIVATE_SENTINEL";

      const report = format(
        inspect(
          fiction(),
          r,
          today
        )
      );

      assert.ok(
        !report.includes(
          "PRIVATE_SENTINEL"
        ) &&
        !report.includes(
          "SEC-G01-20261028"
        ) &&
        !report.includes(
          "sec-reviewer"
        )
      );
    }
  );

  /* TEST 35 */

  test(
    "Full fictional review does not grant activation",

    () => {
      const r = valid();

      for (
        const item of
        r.controls
      ) {
        Object.assign(
          item,
          {
            state: "reviewed",

            evidenceRef:
              `SEC-${item.id}-20261028`,

            owner:
              "ops-owner",

            reviewer:
              "sec-reviewer",

            reviewedOn:
              today,

            reviewResult:
              "pass",
          }
        );
      }

      const result = inspect(
        fiction(),
        r,
        today
      );

      assert.deepEqual(
        result.issues,
        []
      );

      assert.equal(
        result.stagingAuthorized,
        false
      );

      assert.equal(
        result.controls.filter(
          (control) =>
            control.status ===
              "REVIEW_CLAIM_RECORDED"
        ).length,

        12
      );
    }
  );

  console.log(
    `FILE 71 SELF-TEST: ${
      passed
    }/35 PASSED`
  );

  console.log(
    "NETWORK_CALLS: 0; DATABASE_CONNECTIONS: 0; EMAILS_SENT: 0"
  );
}

/* =====================================================
   14. READ LOCAL PROJECT FILES

   Selected files only.

   No writes or network connections.
   ===================================================== */

function readLocal(projectRoot) {
  const read =
    (relative) => {
      try {
        return fs.readFileSync(
          path.join(
            projectRoot,
            relative
          ),
          "utf8"
        );

      } catch (error) {
        if (
          error?.code ===
            "ENOENT"
        ) {
          return null;
        }

        throw error;
      }
    };

  return {
    read,

    exists:
      (relative) =>
        fs.existsSync(
          path.join(
            projectRoot,
            relative
          )
        ),

    shell:
      process.env,
  };
}

/* =====================================================
   15. OPTIONAL FUTURE EVIDENCE INPUT

   Reads an externally supplied JSON file.

   Does not create or modify that file.

   Only a regular, nonsymlink file of at most
   256 KiB is accepted.

   Do not put passwords or tokens inside it.
   ===================================================== */

function readEvidence(input) {
  const stat =
    fs.lstatSync(input);

  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > 256 * 1024
  ) {
    throw new Error(
      "Evidence register must be a regular JSON file not exceeding 256 KiB."
    );
  }

  return JSON.parse(
    fs.readFileSync(
      input,
      "utf8"
    )
  );
}

/* =====================================================
   16. COMMAND-LINE ENTRYPOINT

   --self-test
     Fictional tests only.

   --template
     Print blank JSON register.

   --audit
     Run local checks using blank register.

   --audit <path>
     Validate an existing evidence JSON file.

   No command deploys or authorizes services.
   ===================================================== */

const args =
  process.argv.slice(2);

if (
  args.length === 1 &&
  args[0] === "--self-test"
) {
  selfTest();

} else if (
  args.length === 1 &&
  args[0] === "--template"
) {
  console.log(
    JSON.stringify(
      template(),
      null,
      2
    )
  );

  console.log(
    "STAGING_ACTIVATION: NOT_AUTHORIZED"
  );

} else if (
  (
    args.length === 1 ||
    args.length === 2
  ) &&
  args[0] === "--audit"
) {
  try {
    const register =
      args[1]
        ? readEvidence(args[1])
        : template();

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const report = inspect(
      readLocal(
        process.cwd()
      ),

      register,

      today
    );

    console.log(
      format(report)
    );

    if (
      report.issues.length ||

      report.local.some(
        (item) =>
          item.status === "FAIL"
      )
    ) {
      process.exitCode = 1;
    }

  } catch (error) {
    console.error(
      `AUDIT_ERROR: ${
        error?.code ??
        "INVALID_EVIDENCE_INPUT"
      }`
    );

    process.exitCode = 1;
  }

} else {
  console.error(
    "Usage: node scripts/quotation-staging-evidence-register.mjs --self-test|--template|--audit [evidence-register.json]"
  );

  process.exitCode = 2;
}

/*
=======================================================
END FILE 71

NO STAGING DEPLOYMENT.
NO PRODUCTION ACTIVATION.
NO DATABASE MODIFICATIONS.
NO REAL QUOTATION SUBMISSIONS.
NO ACTUAL EMAIL DELIVERY.
=======================================================
*/
