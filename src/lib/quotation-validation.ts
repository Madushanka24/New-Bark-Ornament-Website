
import "server-only";

/* ==========================================
   BARK ORNAMENT (PVT) LTD

   FILE 32
   SERVER-SIDE QUOTATION VALIDATION

   src/lib/quotation-validation.ts

   Preserves File 16 validation and adds
   an isolated development-only fixture
   defined in File 31.

   Does NOT:
   - Save database records
   - Enable submissions
   - Publish products
   - Authorize public test requests
   ========================================== */

import {
  getProductBySlug,
  type Product,
} from "@/lib/products";

import {
  MAX_ITEM_QUANTITY,
  MAX_QUOTE_ITEMS,
  type QuoteProductOptions,
} from "@/lib/quote-basket";

import {
  getQuotationTestFixture,
  matchesQuotationTestFixture,
} from "@/lib/quotation-test-fixture";

/* ==========================================
   PUBLIC VALIDATION TYPES

   Keep these exports compatible with
   the existing quotation API.
   ========================================== */

export type DeliveryDestination =
  | "Maldives"
  | "Seychelles"
  | "Sri Lanka"
  | "Other";

export type QuotationCustomer = {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  destination: DeliveryDestination;
  otherDestination: string;
  requiredDeliveryDate: string;
  message: string;
  consent: true;
};

export type ValidatedQuoteItem = {
  productId: string;
  productSlug: string;
  productName: string;
  categorySlug: string;
  quantity: number;
  options: QuoteProductOptions;
  notes: string;
};

export type ValidatedQuotation = {
  customer: QuotationCustomer;
  items: ValidatedQuoteItem[];
};

export type ValidationIssue = {
  field: string;
  message: string;
};

export type QuotationValidationResult =
  | {
      success: true;
      data: ValidatedQuotation;
      errors: [];
    }
  | {
      success: false;
      errors: ValidationIssue[];
      data?: never;
    };

/* ==========================================
   ORIGINAL FIELD LIMITS
   ========================================== */

const LIMITS = {
  fullName: 120,
  companyName: 180,
  email: 254,
  phone: 40,
  otherDestination: 160,
  message: 3000,
  option: 200,
  notes: 2000,
} as const;

const destinations: DeliveryDestination[] = [
  "Maldives",
  "Seychelles",
  "Sri Lanka",
  "Other",
];

/* ==========================================
   INTERNAL HELPERS
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

function textValue(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value.trim()
    : null;
}

function checkText(
  value: unknown,
  field: string,
  label: string,
  maxLength: number,
  errors: ValidationIssue[],
  required = false
): string {
  const text = textValue(value);

  if (text === null) {
    if (required || value != null) {
      errors.push({
        field,
        message: `${label} must be text.`,
      });
    }

    return "";
  }

  if (required && text.length === 0) {
    errors.push({
      field,
      message: `${label} is required.`,
    });
  }

  if (text.length > maxLength) {
    errors.push({
      field,
      message:
        `${label} must not exceed ` +
        `${maxLength} characters.`,
    });
  }

  return text;
}

function validEmail(
  email: string
): boolean {
  return (
    email.length <= LIMITS.email &&
    email.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  );
}

function validDate(
  date: string
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));

  if (
    year < 2000 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }

  const daysInMonth = new Date(
    Date.UTC(year, month, 0)
  ).getUTCDate();

  return day <= daysInMonth;
}

/* ==========================================
   CUSTOMER VALIDATION

   Same limits and business rules as
   the previously working validator.
   ========================================== */

function validateCustomer(
  raw: unknown,
  errors: ValidationIssue[]
): QuotationCustomer | null {
  if (!isRecord(raw)) {
    errors.push({
      field: "customer",
      message:
        "Customer information is required.",
    });

    return null;
  }

  const fullName = checkText(
    raw.fullName,
    "customer.fullName",
    "Full name",
    LIMITS.fullName,
    errors,
    true
  );

  const companyName = checkText(
    raw.companyName,
    "customer.companyName",
    "Hotel or company name",
    LIMITS.companyName,
    errors,
    true
  );

  const email = checkText(
    raw.email,
    "customer.email",
    "Email address",
    LIMITS.email,
    errors,
    true
  ).toLowerCase();

  if (email && !validEmail(email)) {
    errors.push({
      field: "customer.email",
      message: "Enter a valid email address.",
    });
  }

  const phone = checkText(
    raw.phone,
    "customer.phone",
    "Phone number",
    LIMITS.phone,
    errors
  );

  if (
    phone &&
    !/^\+?[0-9\s().-]{6,40}$/.test(phone)
  ) {
    errors.push({
      field: "customer.phone",
      message: "Enter a valid contact number.",
    });
  }

  const destinationValue = textValue(
    raw.destination
  );

  const destination = destinations.find(
    (item) => item === destinationValue
  );

  if (!destination) {
    errors.push({
      field: "customer.destination",
      message:
        "Select a valid delivery destination.",
    });
  }

  const otherDestination = checkText(
    raw.otherDestination,
    "customer.otherDestination",
    "Other destination",
    LIMITS.otherDestination,
    errors,
    destination === "Other"
  );

  const requiredDeliveryDate = checkText(
    raw.requiredDeliveryDate,
    "customer.requiredDeliveryDate",
    "Required delivery date",
    10,
    errors
  );

  if (
    requiredDeliveryDate &&
    !validDate(requiredDeliveryDate)
  ) {
    errors.push({
      field: "customer.requiredDeliveryDate",
      message: "Enter a valid delivery date.",
    });
  }

  const message = checkText(
    raw.message,
    "customer.message",
    "Additional enquiry details",
    LIMITS.message,
    errors
  );

  if (raw.consent !== true) {
    errors.push({
      field: "customer.consent",
      message:
        "Consent to process this enquiry " +
        "is required.",
    });
  }

  if (
    !destination ||
    raw.consent !== true
  ) {
    return null;
  }

  return {
    fullName,
    companyName,
    email,
    phone,
    destination,
    otherDestination:
      destination === "Other"
        ? otherDestination
        : "",
    requiredDeliveryDate,
    message,
    consent: true,
  };
}

/* ==========================================
   PRODUCT OPTIONS

   Preserve the original validation
   of all four optional properties.
   ========================================== */

function validateOptions(
  raw: unknown,
  prefix: string,
  errors: ValidationIssue[]
): QuoteProductOptions {
  if (
    raw != null &&
    !isRecord(raw)
  ) {
    errors.push({
      field: `${prefix}.options`,
      message: "Product options are invalid.",
    });
  }

  const options = isRecord(raw)
    ? raw
    : {};

  return {
    material: checkText(
      options.material,
      `${prefix}.options.material`,
      "Material",
      LIMITS.option,
      errors
    ),
    size: checkText(
      options.size,
      `${prefix}.options.size`,
      "Size",
      LIMITS.option,
      errors
    ),
    finish: checkText(
      options.finish,
      `${prefix}.options.finish`,
      "Finish",
      LIMITS.option,
      errors
    ),
    customization: checkText(
      options.customization,
      `${prefix}.options.customization`,
      "Customization",
      LIMITS.option,
      errors
    ),
  };
}

/* ==========================================
   NORMAL PRODUCT PUBLICATION CHECK

   Unchanged:
   demo/draft products cannot be
   submitted as live inventory.
   ========================================== */

function isSubmittableProduct(
  product: Product
): boolean {
  return (
    product.status === "published" &&
    product.isDemo === false
  );
}

/* ==========================================
   TEST FIXTURE IDENTIFIER DETECTION

   Detect either reserved identifier
   even when the other is incorrect.

   This prevents a malformed fixture
   from falling into normal catalogue
   handling.
   ========================================== */

function usesReservedTestIdentifier(
  productId: unknown,
  productSlug: unknown
): boolean {
  return (
    productId ===
      "__test_only_quotation_product__" ||
    productSlug ===
      "__test-only-quotation-product__"
  );
}

/* ==========================================
   EXACT TEST FIXTURE VALIDATION

   The fixture must:
   - Exist under File 31 guards
   - Match both ID and slug
   - Match its fixed quantity
   - Match all four options
   - Match its fixed notes

   No browser-supplied name or category
   is trusted for the stored record.
   ========================================== */

function validateTestFixtureItem(
  rawItem: Record<string, unknown>,
  prefix: string,
  errors: ValidationIssue[]
): ValidatedQuoteItem | null {
  const fixture = getQuotationTestFixture();

  if (
    !fixture ||
    !matchesQuotationTestFixture(
      rawItem.productId,
      rawItem.productSlug
    )
  ) {
    errors.push({
      field: `${prefix}.productId`,
      message:
        "Test product is not authorized.",
    });

    return null;
  }

  const quantity = rawItem.quantity;

  if (
    typeof quantity !== "number" ||
    !Number.isSafeInteger(quantity) ||
    quantity !== fixture.quantity ||
    quantity < 1 ||
    quantity > MAX_ITEM_QUANTITY
  ) {
    errors.push({
      field: `${prefix}.quantity`,
      message:
        "Test product quantity does not " +
        "match the approved fixture.",
    });

    return null;
  }

  const options = validateOptions(
    rawItem.options,
    prefix,
    errors
  );

  const notes = checkText(
    rawItem.notes,
    `${prefix}.notes`,
    "Product notes",
    LIMITS.notes,
    errors
  );

  const exactOptions =
    options.material ===
      fixture.options.material &&
    options.size ===
      fixture.options.size &&
    options.finish ===
      fixture.options.finish &&
    options.customization ===
      fixture.options.customization;

  if (
    !exactOptions ||
    notes !== fixture.notes
  ) {
    errors.push({
      field: prefix,
      message:
        "Test product requirements do " +
        "not match the approved fixture.",
    });

    return null;
  }

  return {
    productId: fixture.productId,
    productSlug: fixture.productSlug,
    productName: fixture.productName,
    categorySlug: fixture.categorySlug,
    quantity: fixture.quantity,
    options: {
      ...fixture.options,
    },
    notes: fixture.notes,
  };
}

/* ==========================================
   QUOTATION ITEM VALIDATION
   ========================================== */

function validateItems(
  raw: unknown,
  errors: ValidationIssue[]
): ValidatedQuoteItem[] {
  if (!Array.isArray(raw)) {
    errors.push({
      field: "items",
      message:
        "A quotation basket is required.",
    });

    return [];
  }

  if (
    raw.length === 0 ||
    raw.length > MAX_QUOTE_ITEMS
  ) {
    errors.push({
      field: "items",
      message:
        `Select between 1 and ` +
        `${MAX_QUOTE_ITEMS} product entries.`,
    });

    return [];
  }

  const validated: ValidatedQuoteItem[] =
    [];

  const seen = new Set<string>();

  let containsTestFixture = false;
  let containsRegularProduct = false;

  raw.forEach((
    rawItem: unknown,
    index: number
  ) => {
    const prefix = `items.${index}`;

    if (!isRecord(rawItem)) {
      errors.push({
        field: prefix,
        message: "Invalid product entry.",
      });

      return;
    }

    const slug = textValue(
      rawItem.productSlug
    );

    if (!slug) {
      errors.push({
        field: `${prefix}.productSlug`,
        message:
          "Product identifier is required.",
      });

      return;
    }

    let validatedItem:
      ValidatedQuoteItem | null = null;

    if (
      usesReservedTestIdentifier(
        rawItem.productId,
        slug
      )
    ) {
      containsTestFixture = true;

      validatedItem =
        validateTestFixtureItem(
          rawItem,
          prefix,
          errors
        );
    } else {
      containsRegularProduct = true;

      /* Normal catalogue checks remain
         exactly the same in intent:
         the product must exist, have
         a matching ID, be published,
         and not be a demo. */

      const product = getProductBySlug(
        slug,
        true
      );

      if (
        !product ||
        rawItem.productId !== product.id
      ) {
        errors.push({
          field: `${prefix}.productId`,
          message:
            "Product not found in catalogue.",
        });

        return;
      }

      if (!isSubmittableProduct(product)) {
        errors.push({
          field: `${prefix}.productId`,
          message:
            "This product is not available " +
            "for live quotation submission.",
        });

        return;
      }

      const quantity = rawItem.quantity;

      if (
        typeof quantity !== "number" ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > MAX_ITEM_QUANTITY
      ) {
        errors.push({
          field: `${prefix}.quantity`,
          message:
            "Enter a valid product quantity.",
        });

        return;
      }

      const options = validateOptions(
        rawItem.options,
        prefix,
        errors
      );

      const notes = checkText(
        rawItem.notes,
        `${prefix}.notes`,
        "Product notes",
        LIMITS.notes,
        errors
      );

      /* Use catalogue-sourced fields,
         never browser-supplied names. */

      validatedItem = {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        categorySlug: product.categorySlug,
        quantity,
        options,
        notes,
      };
    }

    if (!validatedItem) {
      return;
    }

    const signature = JSON.stringify([
      validatedItem.productId,
      validatedItem.options.material ?? "",
      validatedItem.options.size ?? "",
      validatedItem.options.finish ?? "",
      validatedItem.options.customization ?? "",
    ]);

    if (seen.has(signature)) {
      errors.push({
        field: prefix,
        message:
          "Duplicate product selections " +
          "must be combined before submission.",
      });

      return;
    }

    seen.add(signature);
    validated.push(validatedItem);
  });

  /* A synthetic fixture must always
     appear by itself, never alongside
     a normal catalogue product. */

  if (
    containsTestFixture &&
    (containsRegularProduct || raw.length !== 1)
  ) {
    errors.push({
      field: "items",
      message:
        "Test quotations cannot contain " +
        "other product selections.",
    });
  }

  return validated;
}

/* ==========================================
   MAIN VALIDATION FUNCTION

   Preserves API contract from File 16.

   This does not authorize writing test
   records or activate any API test mode.
   ========================================== */

export function validateQuotationRequest(
  input: unknown
): QuotationValidationResult {
  const errors: ValidationIssue[] = [];

  if (!isRecord(input)) {
    return {
      success: false,
      errors: [
        {
          field: "request",
          message:
            "Invalid quotation request.",
        },
      ],
    };
  }

  const customer = validateCustomer(
    input.customer,
    errors
  );

  const items = validateItems(
    input.items,
    errors
  );

  if (
    !customer ||
    errors.length > 0
  ) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      customer,
      items,
    },
    errors: [],
  };
}
