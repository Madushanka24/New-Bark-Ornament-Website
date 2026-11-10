
import "server-only";

/* ==========================================
   BARK ORNAMENT (PVT) LTD

   FILE 36 - QUOTATION EMAIL FOUNDATION

   src/lib/quotation-email.ts

   PURPOSE
   - Build an internal sales notification
   - Build a customer acknowledgement
   - Provide plain text and safe HTML
   - Validate reference formats
   - Distinguish synthetic test enquiries
   - Report email integration readiness

   SECURITY
   - Server-only module
   - No email provider credentials
   - No network requests
   - No email dispatch
   - No customer-controlled subjects
   - Escaped HTML content
   - No Turnstile or HMAC data

   IMPORTANT
   This file ONLY creates email content.
   It does not send an email.
   ========================================== */

import type {
  ValidatedQuotation,
  ValidatedQuoteItem,
} from "@/lib/quotation-validation";

/* ==========================================
   EMAIL TYPES
   ========================================== */

export type QuotationEmailMessage = Readonly<{
  subject: string;
  text: string;
  html: string;
}>;

export type QuotationEmailContent = Readonly<{
  reference: string;
  isSyntheticTest: boolean;
  internal: QuotationEmailMessage;
  customer: QuotationEmailMessage;
}>;

export type QuotationEmailReadiness =
  | {
      ready: false;
      reason: "disabled";
    }
  | {
      ready: false;
      reason: "invalid_setting";
    }
  | {
      ready: false;
      reason: "provider_not_connected";
    };

/* ==========================================
   LIMITS

   These limits are defensive bounds.
   Server-side input validation remains
   the primary source of field limits.
   ========================================== */

const MAX_EMAIL_TEXT_LENGTH = 100_000;

const MAX_EMAIL_HTML_LENGTH = 200_000;

const MAX_REFERENCE_LENGTH = 40;

const MAX_ITEMS = 100;

/* ==========================================
   REFERENCE VALIDATION

   Existing API references:
   BOQ-YYYY-12_HEX_CHARACTERS

   Synthetic test references:
   BOQ-TEST-YYYY-12_HEX_CHARACTERS
   ========================================== */

const NORMAL_REFERENCE =
  /^BOQ-[0-9]{4}-[A-F0-9]{12}$/;

const TEST_REFERENCE =
  /^BOQ-TEST-[0-9]{4}-[A-F0-9]{12}$/;

function validateReference(
  reference: string
): {
  normalized: string;
  isSyntheticTest: boolean;
} {
  if (
    typeof reference !== "string" ||
    reference.length > MAX_REFERENCE_LENGTH
  ) {
    throw new Error(
      "Invalid quotation email reference."
    );
  }

  if (NORMAL_REFERENCE.test(reference)) {
    return {
      normalized: reference,
      isSyntheticTest: false,
    };
  }

  if (TEST_REFERENCE.test(reference)) {
    return {
      normalized: reference,
      isSyntheticTest: true,
    };
  }

  throw new Error(
    "Invalid quotation email reference."
  );
}

/* ==========================================
   SAFE TEXT UTILITIES
   ========================================== */

function safeText(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  /*
   * Remove non-printable control characters
   * while preserving ordinary line breaks
   * and tabs used in enquiry notes.
   */

  return value
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      ""
    )
    .trim();
}

function escapeHtml(
  value: unknown
): string {
  return safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function displayText(
  value: unknown
): string {
  const text = safeText(value);

  return text.length > 0
    ? text
    : "Not specified";
}

function displayHtml(
  value: unknown
): string {
  return escapeHtml(
    displayText(value)
  );
}

function assertContentLength(
  message: QuotationEmailMessage
): void {
  if (
    message.text.length >
      MAX_EMAIL_TEXT_LENGTH ||
    message.html.length >
      MAX_EMAIL_HTML_LENGTH
  ) {
    throw new Error(
      "Quotation email content exceeds " +
      "the permitted size."
    );
  }
}

/* ==========================================
   HTML STRUCTURE HELPERS

   Dynamic values must be escaped before
   insertion into these HTML functions.
   ========================================== */

function htmlRow(
  label: string,
  escapedValue: string
): string {
  return `
    <tr>
      <th
        scope="row"
        style="
          padding:10px;
          text-align:left;
          vertical-align:top;
          border-bottom:1px solid #E9DDC9;
          color:#30251F;
          width:35%;
        "
      >${escapeHtml(label)}</th>
      <td
        style="
          padding:10px;
          vertical-align:top;
          border-bottom:1px solid #E9DDC9;
          color:#30251F;
          overflow-wrap:anywhere;
          white-space:pre-wrap;
        "
      >${escapedValue}</td>
    </tr>
  `;
}

function htmlPage(
  heading: string,
  body: string,
  isSyntheticTest: boolean
): string {
  const testNotice = isSyntheticTest
    ? `
      <p style="
        padding:12px;
        background:#FFF0E2;
        border:1px solid #B95016;
        font-weight:bold;
        color:#963E10;
      ">
        SYNTHETIC TEST ONLY
        &mdash; NOT A CUSTOMER ENQUIRY
      </p>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport"
        content="width=device-width, initial-scale=1">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="
  margin:0;
  padding:24px;
  background:#FAF7F0;
  color:#30251F;
  font-family:Arial,Helvetica,sans-serif;
  line-height:1.6;
">
  <div style="
    max-width:680px;
    margin:0 auto;
    background:#FFFFFF;
    border:1px solid #E9DDC9;
    border-radius:8px;
    overflow:hidden;
  ">
    <div style="
      background:#30251F;
      padding:24px;
      color:#FAF7F0;
    ">
      <p style="
        margin:0 0 8px;
        color:#E3B65D;
        font-size:13px;
        letter-spacing:1px;
      ">BARK ORNAMENT (PVT) LTD</p>
      <h1 style="
        margin:0;
        color:#FAF7F0;
        font-size:25px;
        font-weight:normal;
      ">${escapeHtml(heading)}</h1>
    </div>

    <div style="padding:24px;">
      ${testNotice}
      ${body}
    </div>

    <div style="
      background:#FAF7F0;
      border-top:1px solid #E9DDC9;
      padding:18px 24px;
      color:#74675E;
      font-size:12px;
    ">
      Bark Ornament (Pvt) Ltd<br>
      Hospitality Products &amp; Solutions
    </div>
  </div>
</body>
</html>`;
}

/* ==========================================
   PRODUCT FORMATTERS
   ========================================== */

function itemOptions(
  item: ValidatedQuoteItem
): Array<readonly [string, string]> {
  const options = [
    [
      "Material",
      safeText(item.options.material),
    ],
    [
      "Size",
      safeText(item.options.size),
    ],
    [
      "Finish",
      safeText(item.options.finish),
    ],
    [
      "Customization",
      safeText(item.options.customization),
    ],
  ] as const;

  return options.filter(
    ([, value]) => value.length > 0
  );
}

function itemPlainText(
  item: ValidatedQuoteItem,
  index: number
): string {
  const parts = [
    `${index + 1}. ${safeText(item.productName)}`,
    `   Product ID: ${safeText(item.productId)}`,
    `   Category: ${safeText(item.categorySlug)}`,
    `   Quantity: ${item.quantity}`,
  ];

  for (
    const [label, value] of
    itemOptions(item)
  ) {
    parts.push(
      `   ${label}: ${value}`
    );
  }

  if (safeText(item.notes)) {
    parts.push(
      `   Notes: ${safeText(item.notes)}`
    );
  }

  return parts.join("\n");
}

function itemHtml(
  item: ValidatedQuoteItem,
  index: number
): string {
  const optionRows = itemOptions(item)
    .map(
      ([label, value]) =>
        htmlRow(label, escapeHtml(value))
    )
    .join("");

  const notesRow = safeText(item.notes)
    ? htmlRow(
        "Product notes",
        escapeHtml(item.notes)
      )
    : "";

  return `
    <div style="
      margin:20px 0;
      border:1px solid #E9DDC9;
      border-radius:6px;
      overflow:hidden;
    ">
      <div style="
        padding:12px 16px;
        background:#FAF7F0;
        color:#30251F;
        font-weight:bold;
      ">
        ${index + 1}.
        ${escapeHtml(item.productName)}
      </div>

      <table
        role="presentation"
        style="
          width:100%;
          border-collapse:collapse;
          font-size:14px;
        "
      >
        ${htmlRow(
          "Product ID",
          escapeHtml(item.productId)
        )}
        ${htmlRow(
          "Category",
          escapeHtml(item.categorySlug)
        )}
        ${htmlRow(
          "Quantity",
          String(item.quantity)
        )}
        ${optionRows}
        ${notesRow}
      </table>
    </div>
  `;
}

/* ==========================================
   BASIC QUOTATION SANITY CHECK

   This module is intended to receive
   already-validated server-side data.

   These checks prevent accidental use
   with structurally incorrect objects.
   ========================================== */

function assertQuotation(
  quotation: ValidatedQuotation
): void {
  if (
    !quotation ||
    !quotation.customer ||
    !Array.isArray(quotation.items) ||
    quotation.items.length < 1 ||
    quotation.items.length > MAX_ITEMS ||
    quotation.customer.consent !== true
  ) {
    throw new Error(
      "Invalid quotation email data."
    );
  }

  if (
    quotation.items.some(
      (item) =>
        !item ||
        !Number.isSafeInteger(
          item.quantity
        ) ||
        item.quantity < 1
    )
  ) {
    throw new Error(
      "Invalid quotation item data."
    );
  }
}

/* ==========================================
   INTERNAL SALES NOTIFICATION
   ========================================== */

function buildInternalNotification(
  reference: string,
  quotation: ValidatedQuotation,
  isSyntheticTest: boolean
): QuotationEmailMessage {
  const customer = quotation.customer;

  const destination =
    customer.destination === "Other"
      ? `Other: ${
          displayText(
            customer.otherDestination
          )
        }`
      : customer.destination;

  const lines = [
    "BARK ORNAMENT - NEW QUOTATION ENQUIRY",
    "",
    isSyntheticTest
      ? "SYNTHETIC TEST - DO NOT PROCESS"
      : "",
    `Reference: ${reference}`,
    "",
    "CUSTOMER INFORMATION",
    `Full name: ${displayText(customer.fullName)}`,
    `Company: ${displayText(customer.companyName)}`,
    `Email: ${displayText(customer.email)}`,
    `Phone: ${displayText(customer.phone)}`,
    `Destination: ${destination}`,
    `Required delivery date: ${
      displayText(
        customer.requiredDeliveryDate
      )
    }`,
    "",
    "ADDITIONAL ENQUIRY DETAILS",
    displayText(customer.message),
    "",
    "REQUESTED PRODUCTS",
    ...quotation.items.map(
      (item, index) =>
        itemPlainText(item, index)
    ),
    "",
    "This is a quotation enquiry, " +
      "not a confirmed commercial order.",
  ].filter(
    (line) => line !== ""
  );

  const customerRows = [
    htmlRow(
      "Reference",
      escapeHtml(reference)
    ),
    htmlRow(
      "Full name",
      displayHtml(customer.fullName)
    ),
    htmlRow(
      "Company",
      displayHtml(customer.companyName)
    ),
    htmlRow(
      "Email",
      displayHtml(customer.email)
    ),
    htmlRow(
      "Phone",
      displayHtml(customer.phone)
    ),
    htmlRow(
      "Destination",
      escapeHtml(destination)
    ),
    htmlRow(
      "Required delivery date",
      displayHtml(
        customer.requiredDeliveryDate
      )
    ),
  ].join("");

  const content = `
    <p>
      A quotation enquiry has been recorded.
      Review the details below before
      preparing a commercial quotation.
    </p>

    <h2 style="color:#B95016;">
      Customer Information
    </h2>

    <table
      role="presentation"
      style="
        width:100%;
        border-collapse:collapse;
        font-size:14px;
      "
    >
      ${customerRows}
    </table>

    <h2 style="color:#B95016;">
      Additional Enquiry Details
    </h2>

    <p style="
      white-space:pre-wrap;
      overflow-wrap:anywhere;
    ">${displayHtml(customer.message)}</p>

    <h2 style="color:#B95016;">
      Requested Products
    </h2>

    ${quotation.items
      .map(itemHtml)
      .join("")}

    <p style="font-size:13px;color:#74675E;">
      This message is an enquiry notification,
      not confirmation of pricing, production
      or delivery.
    </p>
  `;

  const message: QuotationEmailMessage = {
    subject: isSyntheticTest
      ? `[TEST] Quotation Enquiry ${reference}`
      : `New Quotation Enquiry ${reference}`,
    text: lines.join("\n"),
    html: htmlPage(
      "New Quotation Enquiry",
      content,
      isSyntheticTest
    ),
  };

  assertContentLength(message);

  return message;
}

/* ==========================================
   CUSTOMER ACKNOWLEDGEMENT
   ========================================== */

function buildCustomerAcknowledgement(
  reference: string,
  quotation: ValidatedQuotation,
  isSyntheticTest: boolean
): QuotationEmailMessage {
  const name = displayText(
    quotation.customer.fullName
  );

  const productText = quotation.items.map(
    (item, index) =>
      `${index + 1}. ` +
      `${safeText(item.productName)} ` +
      `(Qty: ${item.quantity})`
  );

  const text = [
    `Dear ${name},`,
    "",
    "Thank you for contacting Bark Ornament.",
    "",
    "We have recorded your quotation enquiry.",
    `Your enquiry reference is: ${reference}`,
    "",
    "REQUESTED PRODUCTS",
    ...productText,
    "",
    "Our team will review your requirements.",
    "This acknowledgement does not confirm",
    "pricing, availability, production,",
    "delivery dates or order acceptance.",
    "",
    "Kind regards,",
    "Bark Ornament (Pvt) Ltd",
  ].join("\n");

  const productHtml = quotation.items
    .map(
      (item) => `
        <li style="margin-bottom:8px;">
          ${escapeHtml(item.productName)}
          &mdash; Quantity:
          ${item.quantity}
        </li>
      `
    )
    .join("");

  const content = `
    <p>Dear ${escapeHtml(name)},</p>

    <p>
      Thank you for contacting Bark Ornament.
      We have recorded your quotation enquiry.
    </p>

    <p style="
      background:#FAF7F0;
      border-left:4px solid #C59A45;
      padding:14px;
    ">
      <strong>Enquiry Reference</strong><br>
      <span style="
        color:#B95016;
        font-size:19px;
        font-weight:bold;
      ">${escapeHtml(reference)}</span>
    </p>

    <h2 style="color:#B95016;">
      Requested Products
    </h2>

    <ol>
      ${productHtml}
    </ol>

    <p>
      Our team will review your requirements.
    </p>

    <p style="
      font-size:13px;
      color:#74675E;
    ">
      This acknowledgement does not confirm
      pricing, availability, production,
      delivery dates or order acceptance.
    </p>

    <p>
      Kind regards,<br>
      <strong>Bark Ornament (Pvt) Ltd</strong>
    </p>
  `;

  const message: QuotationEmailMessage = {
    subject: isSyntheticTest
      ? `[TEST] Enquiry Received ${reference}`
      : `Quotation Enquiry Received ${reference}`,
    text,
    html: htmlPage(
      "Quotation Enquiry Received",
      content,
      isSyntheticTest
    ),
  };

  assertContentLength(message);

  return message;
}

/* ==========================================
   PUBLIC EMAIL CONTENT BUILDER

   Call only on the server, after a
   quotation has been validated.

   Never treat generated email content
   as proof that an email was delivered.
   ========================================== */

export function buildQuotationEmailContent(
  reference: string,
  quotation: ValidatedQuotation
): QuotationEmailContent {
  const validated =
    validateReference(reference);

  assertQuotation(quotation);

  const internal =
    buildInternalNotification(
      validated.normalized,
      quotation,
      validated.isSyntheticTest
    );

  const customer =
    buildCustomerAcknowledgement(
      validated.normalized,
      quotation,
      validated.isSyntheticTest
    );

  return {
    reference: validated.normalized,
    isSyntheticTest:
      validated.isSyntheticTest,
    internal,
    customer,
  };
}

/* ==========================================
   DELIVERY READINESS

   No email provider is integrated yet.

   Even if an email enable flag is
   accidentally set to true, this
   function DOES NOT send emails or
   report that delivery is ready.

   The provider integration must be
   explicitly implemented in a later file.
   ========================================== */

export function getQuotationEmailReadiness():
  QuotationEmailReadiness {
  const enabled =
    process.env
      .QUOTATION_EMAIL_NOTIFICATIONS_ENABLED;

  if (
    enabled === undefined ||
    enabled === "false"
  ) {
    return {
      ready: false,
      reason: "disabled",
    };
  }

  if (enabled !== "true") {
    return {
      ready: false,
      reason: "invalid_setting",
    };
  }

  return {
    ready: false,
    reason: "provider_not_connected",
  };
}

/* ==========================================
   END FILE 36

   No network access.
   No email delivery.
   No changes to the quotation API.
   ========================================== */
