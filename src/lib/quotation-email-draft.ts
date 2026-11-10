
/**
 * BARK ORNAMENT — FILE 127
 * Quotation Email Draft Builder
 *
 * File: src/lib/quotation-email-draft.ts
 *
 * Initial launch: Option A (manual email compose).
 *
 * This module:
 * - Formats selected products and customer details.
 * - Preserves product customization requirements.
 * - Produces a plain-text subject and body.
 *
 * This module NEVER:
 * - Sends an email.
 * - Opens an email application.
 * - Calls the quotation API.
 * - Connects to PostgreSQL.
 * - Saves customer information.
 *
 * The company recipient will be configured
 * separately after explicit verification.
 */

import type {
  QuoteBasketItem,
} from "@/lib/quote-basket";

/* ==========================================
   CUSTOMER INFORMATION
   ========================================== */

export type QuotationDraftCustomer = {
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  destination: string;
  otherDestination?: string;
  requiredDeliveryDate?: string;
  message?: string;
};

/**
 * Use the actual existing basket item shape.
 * No duplicate product data model is introduced.
 */

export type QuotationDraftItem = Pick<
  QuoteBasketItem,
  | "productName"
  | "productSlug"
  | "categorySlug"
  | "quantity"
  | "options"
  | "notes"
>;

export type QuotationEmailDraft = {
  subject: string;
  body: string;
  utf8Bytes: number;
};

/* ==========================================
   TEXT NORMALIZATION
   ========================================== */

/**
 * Single-line fields cannot insert additional
 * unexpected email sections.
 */

function singleLine(
  value: string | null | undefined
): string {
  return (value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Preserve deliberate paragraphs in product
 * notes and additional enquiry information.
 */

function multiLine(
  value: string | null | undefined
): string {
  return (value ?? "")
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    )
    .replace(/\r\n?/g, "\n")
    .trim();
}

function optionalLine(
  label: string,
  value: string | null | undefined
): string | null {
  const text = singleLine(value);

  return text.length > 0
    ? `${label}: ${text}`
    : null;
}

/* ==========================================
   DELIVERY DESTINATION
   ========================================== */

function formatDestination(
  customer: QuotationDraftCustomer
): string {
  const destination =
    singleLine(customer.destination);

  if (!destination) {
    throw new Error(
      "Please select a delivery destination."
    );
  }

  if (destination === "Other") {
    const other =
      singleLine(customer.otherDestination);

    return other
      ? `Other — ${other}`
      : "Other — destination to be discussed";
  }

  return destination;
}

/* ==========================================
   PRODUCT DETAILS
   ========================================== */

function formatItem(
  item: QuotationDraftItem,
  index: number
): string[] {
  const name = singleLine(item.productName);

  if (!name) {
    throw new Error(
      `Product ${index + 1} has no name.`
    );
  }

  if (
    !Number.isSafeInteger(item.quantity) ||
    item.quantity < 1
  ) {
    throw new Error(
      `Product ${index + 1} has an invalid quantity.`
    );
  }

  const lines: string[] = [
    `${index + 1}. ${name}`,
    `Quantity: ${item.quantity}`,
  ];

  const category =
    singleLine(item.categorySlug);

  if (category) {
    lines.push(
      `Category: ${category.replaceAll("-", " ")}`
    );
  }

  const slug =
    singleLine(item.productSlug);

  if (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    lines.push(
      `Product page: https://www.barkornament.com/products/${slug}`
    );
  }

  const options = [
    ["Material", item.options.material],
    ["Size", item.options.size],
    ["Finish", item.options.finish],
    ["Customization", item.options.customization],
  ] as const;

  for (const [label, value] of options) {
    const line = optionalLine(label, value);

    if (line) {
      lines.push(line);
    }
  }

  const notes = multiLine(item.notes);

  if (notes) {
    lines.push(
      "Additional product requirements:",
      notes
    );
  }

  return lines;
}

/* ==========================================
   QUOTATION EMAIL DRAFT
   ========================================== */

export function buildQuotationEmailDraft(
  customer: QuotationDraftCustomer,
  items: readonly QuotationDraftItem[]
): QuotationEmailDraft {
  if (items.length === 0) {
    throw new Error(
      "Please add at least one product to your quotation basket."
    );
  }

  const fullName =
    singleLine(customer.fullName);

  const companyName =
    singleLine(customer.companyName);

  const email =
    singleLine(customer.email);

  if (!fullName || !companyName) {
    throw new Error(
      "Please enter your full name and company name."
    );
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error(
      "Please enter a valid email address."
    );
  }

  const destination =
    formatDestination(customer);

  const subject =
    `Request for Quotation | ${companyName}`;

  const lines: string[] = [
    "Dear Bark Ornament Team,",
    "",
    "Please provide a quotation for the following customized hospitality products.",
    "",
    "CUSTOMER DETAILS",
    "----------------",
    `Full Name: ${fullName}`,
    `Hotel / Company: ${companyName}`,
    `Email: ${email}`,
  ];

  const phone = optionalLine(
    "Phone / WhatsApp",
    customer.phone
  );

  if (phone) {
    lines.push(phone);
  }

  lines.push(
    `Delivery Destination: ${destination}`
  );

  const deliveryDate = optionalLine(
    "Required Delivery Date",
    customer.requiredDeliveryDate
  );

  if (deliveryDate) {
    lines.push(deliveryDate);
  }

  lines.push(
    "",
    "REQUESTED PRODUCTS",
    "------------------"
  );

  items.forEach((item, index) => {
    lines.push(
      "",
      ...formatItem(item, index)
    );
  });

  const message =
    multiLine(customer.message);

  if (message) {
    lines.push(
      "",
      "ADDITIONAL ENQUIRY DETAILS",
      "--------------------------",
      message
    );
  }

  lines.push(
    "",
    "Please advise on pricing, production lead time, delivery options and any information required for your quotation.",
    "",
    "Thank you.",
    fullName,
    companyName
  );

  const body = lines.join("\n");

  return {
    subject,
    body,
    utf8Bytes: new TextEncoder().encode(body).length,
  };
}
