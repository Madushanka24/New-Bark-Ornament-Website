
import "server-only";

/*
====================================================
BARK ORNAMENT (PVT) LTD

FILE 43 - EMAIL WORKER DRY-RUN FOUNDATION

src/lib/quotation-email-worker.ts

PURPOSE
-------
- Validate the database result from File 42
- Convert database fields into quotation data
- Select the File 36 email template
- Produce a safe dry-run result
- Reject malformed and synthetic records

DOES NOT
--------
- Connect to PostgreSQL
- Claim, complete or fail worker jobs
- Send email or make HTTP requests
- Read email-provider credentials
- Log customer names, emails or messages

Real worker execution will be added later.
====================================================
*/

import {
  buildQuotationEmailContent,
  type QuotationEmailMessage,
} from "@/lib/quotation-email";

import type {
  DeliveryDestination,
  ValidatedQuotation,
  ValidatedQuoteItem,
} from "@/lib/quotation-validation";

/* ==========================================
   TYPES
   ========================================== */

export type WorkerNotificationType =
  | "internal"
  | "customer";

export type PreparedQuotationEmail = Readonly<{
  jobId: string;
  quotationId: string;
  reference: string;
  notificationType: WorkerNotificationType;
  recipientKind: "sales_team" | "customer";
  customerRecipient: string | null;
  productCount: number;
  message: QuotationEmailMessage;
}>;

export type QuotationEmailDryRunResult = Readonly<{
  mode: "dry_run";
  jobId: string;
  reference: string;
  notificationType: WorkerNotificationType;
  recipientKind: "sales_team" | "customer";
  productCount: number;
  subjectLength: number;
  textLength: number;
  htmlLength: number;
  rendered: true;
  sent: false;
  databaseModified: false;
}>;

/* ==========================================
   LIMITS
   ========================================== */

const MAX_ITEMS = 100;
const MAX_QUANTITY = 1_000_000;

const MAX = {
  name: 120,
  company: 180,
  email: 254,
  phone: 40,
  destination: 160,
  message: 3000,
  productId: 200,
  productSlug: 200,
  productName: 300,
  categorySlug: 200,
  option: 200,
  notes: 2000,
} as const;

const REFERENCE_PATTERN =
  /^BOQ-[0-9]{4}-[A-F0-9]{12}$/;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DESTINATIONS:
  readonly DeliveryDestination[] = [
    "Maldives",
    "Seychelles",
    "Sri Lanka",
    "Other",
  ];

/* ==========================================
   DATA VALIDATION HELPERS
   ========================================== */

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requiredString(
  value: unknown,
  field: string,
  maximum: number
): string {
  if (typeof value !== "string") {
    throw new Error(
      `Invalid email job field: ${field}`
    );
  }

  const text = value.trim();

  if (
    text.length === 0 ||
    text.length > maximum
  ) {
    throw new Error(
      `Invalid email job field: ${field}`
    );
  }

  return text;
}

function optionalString(
  value: unknown,
  field: string,
  maximum: number
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value !== "string" ||
    value.length > maximum
  ) {
    throw new Error(
      `Invalid email job field: ${field}`
    );
  }

  return value.trim();
}

function validEmail(
  value: string
): boolean {
  return (
    value.length <= MAX.email &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    ) &&
    !/[\r\n]/.test(value)
  );
}

function validDate(
  value: string
): boolean {
  if (!value) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  if (
    year < 2000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }

  const lastDay = new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();

  return day <= lastDay;
}

function parseJobId(
  value: unknown
): string {
  /*
   * node-postgres returns BIGINT as a
   * decimal string by default.
   *
   * Do not convert arbitrary BIGINT IDs
   * into JavaScript's imprecise Number.
   */

  if (
    typeof value === "string" &&
    /^[1-9][0-9]{0,18}$/.test(value) &&
    BigInt(value) <= BigInt("9223372036854775807")
  ) {
    return value;
  }

  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  ) {
    return String(value);
  }

  throw new Error(
    "Invalid email job field: job_id"
  );
}

/* ==========================================
   PRODUCT MAPPING
   ========================================== */

function mapProduct(
  input: unknown,
  index: number
): ValidatedQuoteItem {
  const prefix = `product_items.${index}`;

  if (!isRecord(input)) {
    throw new Error(
      `Invalid email job field: ${prefix}`
    );
  }

  const productId = requiredString(
    input.productId,
    `${prefix}.productId`,
    MAX.productId
  );

  const productSlug = requiredString(
    input.productSlug,
    `${prefix}.productSlug`,
    MAX.productSlug
  );

  /*
   * Never allow the isolated E2E
   * fixture into a prepared email.
   */

  if (
    productId ===
      "__test_only_quotation_product__" ||
    productSlug ===
      "__test-only-quotation-product__"
  ) {
    throw new Error(
      "Synthetic products cannot be emailed."
    );
  }

  const productName = requiredString(
    input.productName,
    `${prefix}.productName`,
    MAX.productName
  );

  const categorySlug = requiredString(
    input.categorySlug,
    `${prefix}.categorySlug`,
    MAX.categorySlug
  );

  const quantity = input.quantity;

  if (
    typeof quantity !== "number" ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_QUANTITY
  ) {
    throw new Error(
      `Invalid email job field: ${prefix}.quantity`
    );
  }

  if (!isRecord(input.options)) {
    throw new Error(
      `Invalid email job field: ${prefix}.options`
    );
  }

  const options = input.options;

  return {
    productId,
    productSlug,
    productName,
    categorySlug,
    quantity,

    options: {
      material: optionalString(
        options.material,
        `${prefix}.options.material`,
        MAX.option
      ),
      size: optionalString(
        options.size,
        `${prefix}.options.size`,
        MAX.option
      ),
      finish: optionalString(
        options.finish,
        `${prefix}.options.finish`,
        MAX.option
      ),
      customization: optionalString(
        options.customization,
        `${prefix}.options.customization`,
        MAX.option
      ),
    },

    notes: optionalString(
      input.notes,
      `${prefix}.notes`,
      MAX.notes
    ),
  };
}

/* ==========================================
   DATABASE RESULT MAPPING
   ========================================== */

function mapQuotation(
  record: Record<string, unknown>
): ValidatedQuotation {
  const name = requiredString(
    record.customer_name,
    "customer_name",
    MAX.name
  );

  const companyName = requiredString(
    record.company_name,
    "company_name",
    MAX.company
  );

  const email = requiredString(
    record.customer_email,
    "customer_email",
    MAX.email
  ).toLowerCase();

  if (
    !validEmail(email) ||
    email === "fixture@example.invalid"
  ) {
    throw new Error(
      "Invalid email job field: customer_email"
    );
  }

  const destinationText = requiredString(
    record.delivery_destination,
    "delivery_destination",
    50
  );

  if (
    !DESTINATIONS.some(
      (destination) =>
        destination === destinationText
    )
  ) {
    throw new Error(
      "Invalid email job field: delivery_destination"
    );
  }

  const destination =
    destinationText as DeliveryDestination;

  const otherDestination = optionalString(
    record.other_destination,
    "other_destination",
    MAX.destination
  );

  if (
    destination === "Other" &&
    otherDestination.length === 0
  ) {
    throw new Error(
      "Other destination is required."
    );
  }

  const requiredDeliveryDate = optionalString(
    record.required_delivery_date,
    "required_delivery_date",
    10
  );

  if (!validDate(requiredDeliveryDate)) {
    throw new Error(
      "Invalid email job field: required_delivery_date"
    );
  }

  if (
    !Array.isArray(record.product_items) ||
    record.product_items.length < 1 ||
    record.product_items.length > MAX_ITEMS
  ) {
    throw new Error(
      "Invalid email job field: product_items"
    );
  }

  const items = record.product_items.map(
    (item, index) => mapProduct(item, index)
  );

  return {
    customer: {
      fullName: name,
      companyName,
      email,

      phone: optionalString(
        record.customer_phone,
        "customer_phone",
        MAX.phone
      ),

      destination,

      otherDestination:
        destination === "Other"
          ? otherDestination
          : "",

      requiredDeliveryDate,

      message: optionalString(
        record.customer_message,
        "customer_message",
        MAX.message
      ),

      /*
       * File 42 returns rows only for
       * consented commercial quotations.
       *
       * No external JSON request should
       * call this mapper directly.
       */

      consent: true,
    },

    items,
  };
}

/* ==========================================
   PREPARE ONE NOTIFICATION

   Input must be a row returned by the
   authorized File 42 database function.

   This prepares content but never sends it.
   ========================================== */

export function prepareQuotationEmailJob(
  input: unknown
): PreparedQuotationEmail {
  if (!isRecord(input)) {
    throw new Error(
      "Invalid email worker job data."
    );
  }

  const jobId = parseJobId(
    input.job_id
  );

  const quotationId = requiredString(
    input.quotation_id,
    "quotation_id",
    36
  );

  if (!UUID_PATTERN.test(quotationId)) {
    throw new Error(
      "Invalid email job field: quotation_id"
    );
  }

  const reference = requiredString(
    input.quotation_reference,
    "quotation_reference",
    40
  );

  if (!REFERENCE_PATTERN.test(reference)) {
    throw new Error(
      "Synthetic or malformed quotation " +
      "reference is not allowed."
    );
  }

  const notificationType =
    input.notification_type;

  if (
    notificationType !== "internal" &&
    notificationType !== "customer"
  ) {
    throw new Error(
      "Invalid email job field: notification_type"
    );
  }

  const quotation = mapQuotation(input);

  const content =
    buildQuotationEmailContent(
      reference,
      quotation
    );

  if (content.isSyntheticTest) {
    throw new Error(
      "Synthetic quotation email blocked."
    );
  }

  const message =
    notificationType === "internal"
      ? content.internal
      : content.customer;

  const recipientKind =
    notificationType === "internal"
      ? "sales_team" as const
      : "customer" as const;

  return {
    jobId,
    quotationId,
    reference,
    notificationType,
    recipientKind,

    /*
     * The internal sales recipient has not
     * been configured yet.
     *
     * Customer email is available only
     * for a future authorized transport.
     */

    customerRecipient:
      notificationType === "customer"
        ? quotation.customer.email
        : null,

    productCount: quotation.items.length,
    message,
  };
}

/* ==========================================
   SAFE DRY-RUN

   No database access.
   No network access.
   No email sending.
   No job-status mutation.

   Does not return the email body or
   customer address in the dry-run summary.
   ========================================== */

export function dryRunQuotationEmailJob(
  input: unknown
): QuotationEmailDryRunResult {
  const prepared =
    prepareQuotationEmailJob(input);

  return {
    mode: "dry_run",
    jobId: prepared.jobId,
    reference: prepared.reference,
    notificationType:
      prepared.notificationType,
    recipientKind: prepared.recipientKind,
    productCount: prepared.productCount,
    subjectLength:
      prepared.message.subject.length,
    textLength:
      prepared.message.text.length,
    htmlLength:
      prepared.message.html.length,
    rendered: true,
    sent: false,
    databaseModified: false,
  };
}

/* ==========================================
   END FILE 43
   ========================================== */
