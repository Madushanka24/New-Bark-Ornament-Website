
/* ==========================================
   BARK ORNAMENT - QUOTATION BASKET

   File: src/lib/quote-basket.ts
   Version: 1

   FILE 150 STEP E8B:
   - Remove runtime product-registry lookup
   - Preserve existing quotation basket API
   - Preserve localStorage basket version
   - Preserve item merging and quantity rules
   - Validate stored product identity fields
   - Support server-supplied CMS product records
   - Treat browser storage as untrusted data

   FILE 177:
   - Preserve whitespace in editable notes
   - Preserve notes when restoring storage
   - Maintain 2,000-character notes limit
   - Preserve basket identity and quantity rules

   Browser-side basket functionality.
   No checkout or public selling prices.

   IMPORTANT:
   Browser basket validation is not proof
   of product publication or availability.
   Server-side quotation validation remains
   authoritative.
   ========================================== */

import type { Product } from "@/lib/products";

/* ==========================================
   TYPES
   ========================================== */

export type QuoteProductOptions = {
  material?: string;
  size?: string;
  finish?: string;
  customization?: string;
};

export type QuoteBasketItem = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  categorySlug: string;
  quantity: number;
  options: QuoteProductOptions;
  notes: string;
};

export type QuoteBasket = {
  version: 1;
  items: QuoteBasketItem[];
};

/* ==========================================
   SETTINGS
   ========================================== */

export const QUOTE_STORAGE_KEY =
  "bark-ornament-quote-basket-v1";

export const QUOTE_BASKET_EVENT =
  "bark-ornament-quote-updated";

export const MAX_QUOTE_ITEMS = 100;
export const MAX_ITEM_QUANTITY = 1_000_000;

const MAX_OPTION_LENGTH = 200;
const MAX_NOTES_LENGTH = 2000;

/*
 * Upper bounds for browser-stored product
 * information. These fields must remain
 * data-only and must never be treated as
 * proof that a product is published.
 */

const MAX_PRODUCT_ID_LENGTH = 200;
const MAX_PRODUCT_SLUG_LENGTH = 160;
const MAX_PRODUCT_NAME_LENGTH = 200;
const MAX_CATEGORY_SLUG_LENGTH = 160;

const PRODUCT_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u001f\u007f]/;

/* ==========================================
   EMPTY BASKET
   ========================================== */

export function createEmptyBasket(): QuoteBasket {
  return {
    version: 1,
    items: [],
  };
}

/* ==========================================
   BASIC HELPERS
   ========================================== */

function cleanText(
  value: unknown,
  maxLength: number
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

/**
 * FILE 177:
 *
 * Preserve whitespace in notes while the
 * customer is editing the textarea.
 *
 * Trimming here would remove spaces after
 * words and interfere with normal typing.
 *
 * Enforce the existing length limit.
 */
function cleanNotes(value: unknown): string {
  return typeof value === "string"
    ? value.slice(0, MAX_NOTES_LENGTH)
    : "";
}

function normalizeQuantity(
  quantity: unknown
): number {
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity)
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.min(
      MAX_ITEM_QUANTITY,
      Math.trunc(quantity)
    )
  );
}

function cleanOptions(
  options: QuoteProductOptions = {}
): QuoteProductOptions {
  return {
    material: cleanText(
      options.material,
      MAX_OPTION_LENGTH
    ),
    size: cleanText(
      options.size,
      MAX_OPTION_LENGTH
    ),
    finish: cleanText(
      options.finish,
      MAX_OPTION_LENGTH
    ),
    customization: cleanText(
      options.customization,
      MAX_OPTION_LENGTH
    ),
  };
}

/* ==========================================
   STORED PRODUCT IDENTITY VALIDATION

   Unlike the previous implementation,
   this does not import the product registry.

   A browser-stored product identity is
   syntactically checked, not authenticated.

   The server must independently resolve
   and authorize product IDs and slugs
   when handling quotations.
   ========================================== */

function readStoredText(
  value: unknown,
  maxLength: number
): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    return null;
  }

  return value;
}

function readStoredSlug(
  value: unknown,
  maxLength: number
): string | null {
  const text = readStoredText(
    value,
    maxLength
  );

  if (
    text === null ||
    !PRODUCT_SLUG_PATTERN.test(text)
  ) {
    return null;
  }

  return text;
}

/* ==========================================
   UNIQUE ITEM IDENTITY

   Products with different selected options
   are treated as separate basket entries.
   ========================================== */

function itemSignature(
  productId: string,
  options: QuoteProductOptions
): string {
  const normalized = cleanOptions(options);

  return JSON.stringify([
    productId,
    normalized.material ?? "",
    normalized.size ?? "",
    normalized.finish ?? "",
    normalized.customization ?? "",
  ]);
}

function createItemId(
  productId: string,
  options: QuoteProductOptions
): string {
  return itemSignature(
    productId,
    options
  );
}

/* ==========================================
   ADD PRODUCT TO BASKET

   The caller passes a Product object
   already obtained from the catalogue.

   The basket stores product identity and
   chosen options without importing the
   catalogue data module at runtime.
   ========================================== */

export function addProductToBasket(
  basket: QuoteBasket,
  product: Product,
  quantity = 1,
  options: QuoteProductOptions = {},
  notes = ""
): QuoteBasket {
  const normalizedOptions = cleanOptions(options);
  const normalizedNotes = cleanNotes(notes);
  const normalizedQuantity =
    normalizeQuantity(quantity);

  const id = createItemId(
    product.id,
    normalizedOptions
  );

  const existingItem = basket.items.find(
    (item) => item.id === id
  );

  // Same product and same options:
  // increase its requested quantity.
  if (existingItem) {
    return {
      version: 1,
      items: basket.items.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.min(
                MAX_ITEM_QUANTITY,
                item.quantity + normalizedQuantity
              ),
              notes:
                normalizedNotes.trim().length > 0
                  ? normalizedNotes
                  : item.notes,
            }
          : item
      ),
    };
  }

  if (basket.items.length >= MAX_QUOTE_ITEMS) {
    return basket;
  }

  const newItem: QuoteBasketItem = {
    id,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    categorySlug: product.categorySlug,
    quantity: normalizedQuantity,
    options: normalizedOptions,
    notes: normalizedNotes,
  };

  return {
    version: 1,
    items: [
      ...basket.items,
      newItem,
    ],
  };
}

/* ==========================================
   UPDATE ITEM QUANTITY
   ========================================== */

export function updateBasketQuantity(
  basket: QuoteBasket,
  itemId: string,
  quantity: number
): QuoteBasket {
  // Quantity zero removes the item.
  if (
    Number.isFinite(quantity) &&
    Math.trunc(quantity) <= 0
  ) {
    return removeBasketItem(
      basket,
      itemId
    );
  }

  return {
    version: 1,
    items: basket.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            quantity: normalizeQuantity(
              quantity
            ),
          }
        : item
    ),
  };
}

/* ==========================================
   UPDATE ITEM NOTES
   ========================================== */

export function updateBasketNotes(
  basket: QuoteBasket,
  itemId: string,
  notes: string
): QuoteBasket {
  return {
    version: 1,
    items: basket.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            notes: cleanNotes(notes),
          }
        : item
    ),
  };
}

/* ==========================================
   REMOVE PRODUCT
   ========================================== */

export function removeBasketItem(
  basket: QuoteBasket,
  itemId: string
): QuoteBasket {
  return {
    version: 1,
    items: basket.items.filter(
      (item) => item.id !== itemId
    ),
  };
}

/* ==========================================
   CLEAR BASKET
   ========================================== */

export function clearBasket(): QuoteBasket {
  return createEmptyBasket();
}

/* ==========================================
   BASKET SUMMARY
   ========================================== */

export function getBasketItemCount(
  basket: QuoteBasket
): number {
  return basket.items.length;
}

export function getBasketTotalQuantity(
  basket: QuoteBasket
): number {
  return basket.items.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );
}

export function isBasketEmpty(
  basket: QuoteBasket
): boolean {
  return basket.items.length === 0;
}

/* ==========================================
   VALIDATE BROWSER-STORED ITEMS

   FILE 150 E8B:
   - No runtime product registry import
   - Validate required identity fields
   - Reject malformed product identifiers
   - Recalculate item signature
   - Normalize options, notes and quantity
   - Preserve legitimate saved item data

   IMPORTANT:
   LocalStorage is controlled by the user.

   Stored identity and productName values
   are untrusted display data. They are
   not proof of product publication.

   The quotation backend must perform
   its own authoritative validation.
   ========================================== */

function restoreItem(
  value: unknown
): QuoteBasketItem | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const record =
    value as Record<string, unknown>;

  const productId = readStoredText(
    record.productId,
    MAX_PRODUCT_ID_LENGTH
  );

  const productSlug = readStoredSlug(
    record.productSlug,
    MAX_PRODUCT_SLUG_LENGTH
  );

  const productName = readStoredText(
    record.productName,
    MAX_PRODUCT_NAME_LENGTH
  );

  const categorySlug = readStoredSlug(
    record.categorySlug,
    MAX_CATEGORY_SLUG_LENGTH
  );

  if (
    productId === null ||
    productSlug === null ||
    productName === null ||
    categorySlug === null
  ) {
    return null;
  }

  const rawOptions =
    typeof record.options === "object" &&
    record.options !== null &&
    !Array.isArray(record.options)
      ? (record.options as QuoteProductOptions)
      : {};

  const options = cleanOptions(
    rawOptions
  );

  /*
   * Never trust the stored item ID.
   *
   * Reconstruct it using the same identity
   * algorithm used by addProductToBasket.
   *
   * This also preserves the existing
   * duplicate-item merging behavior.
   */

  return {
    id: createItemId(
      productId,
      options
    ),
    productId,
    productSlug,
    productName,
    categorySlug,
    quantity: normalizeQuantity(
      record.quantity
    ),
    options,
    notes: cleanNotes(record.notes),
  };
}

/* ==========================================
   READ BASKET FROM LOCAL STORAGE
   ========================================== */

export function loadQuoteBasket(): QuoteBasket {
  if (typeof window === "undefined") {
    return createEmptyBasket();
  }

  try {
    const stored = window.localStorage.getItem(
      QUOTE_STORAGE_KEY
    );

    if (!stored) {
      return createEmptyBasket();
    }

    const parsed: unknown =
      JSON.parse(stored);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      !("items" in parsed)
    ) {
      return createEmptyBasket();
    }

    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.items)
    ) {
      return createEmptyBasket();
    }

    const restoredItems: QuoteBasketItem[] = [];
    const seen = new Set<string>();

    for (const rawItem of parsed.items.slice(
      0,
      MAX_QUOTE_ITEMS
    )) {
      const item = restoreItem(
        rawItem
      );

      if (!item) {
        continue;
      }

      if (seen.has(item.id)) {
        const existing = restoredItems.find(
          (entry) => entry.id === item.id
        );

        if (existing) {
          existing.quantity = Math.min(
            MAX_ITEM_QUANTITY,
            existing.quantity + item.quantity
          );
        }

        continue;
      }

      seen.add(item.id);
      restoredItems.push(item);
    }

    return {
      version: 1,
      items: restoredItems,
    };
  } catch {
    // Invalid JSON or unavailable browser
    // storage should not crash the website.
    return createEmptyBasket();
  }
}

/* ==========================================
   SAVE BASKET TO LOCAL STORAGE
   ========================================== */

export function saveQuoteBasket(
  basket: QuoteBasket
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(
      QUOTE_STORAGE_KEY,
      JSON.stringify(basket)
    );

    window.dispatchEvent(
      new Event(QUOTE_BASKET_EVENT)
    );

    return true;
  } catch {
    // Storage may be disabled or full.
    return false;
  }
}

/* ==========================================
   CONVENIENCE OPERATIONS

   These functions load the current basket,
   update it, and save the result.
   ========================================== */

export function addProductToSavedBasket(
  product: Product,
  quantity = 1,
  options: QuoteProductOptions = {},
  notes = ""
): QuoteBasket {
  const current = loadQuoteBasket();

  const updated = addProductToBasket(
    current,
    product,
    quantity,
    options,
    notes
  );

  saveQuoteBasket(updated);
  return updated;
}

export function removeFromSavedBasket(
  itemId: string
): QuoteBasket {
  const updated = removeBasketItem(
    loadQuoteBasket(),
    itemId
  );

  saveQuoteBasket(updated);
  return updated;
}

export function updateSavedBasketQuantity(
  itemId: string,
  quantity: number
): QuoteBasket {
  const updated = updateBasketQuantity(
    loadQuoteBasket(),
    itemId,
    quantity
  );

  saveQuoteBasket(updated);
  return updated;
}

export function updateSavedBasketNotes(
  itemId: string,
  notes: string
): QuoteBasket {
  const updated = updateBasketNotes(
    loadQuoteBasket(),
    itemId,
    notes
  );

  saveQuoteBasket(updated);
  return updated;
}

export function clearSavedBasket(): QuoteBasket {
  const empty = createEmptyBasket();

  saveQuoteBasket(empty);
  return empty;
}
