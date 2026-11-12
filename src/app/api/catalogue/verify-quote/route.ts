
import "server-only";

import { NextResponse } from "next/server";

import {
  getPublicCatalogueSnapshot,
} from "@/lib/catalogue-cms-bridge";

/**
 * BARK ORNAMENT
 * FILE 176 — PUBLIC CATALOGUE VERIFICATION
 *
 * READ-ONLY QUOTATION PRODUCT VERIFICATION
 *
 * Checks browser basket product identities
 * against the current approved public catalogue.
 *
 * File 176:
 * - Require a valid application/json media type.
 * - Preserve existing product verification.
 * - Preserve CMS publication safeguards.
 * - Preserve request-size protections.
 *
 * Does not:
 * - Submit quotations
 * - Send emails
 * - Write to PostgreSQL
 * - Modify Sanity content
 * - Enable CMS publication
 */

const MAX_ITEMS = 100;
const MAX_BODY_BYTES = 24 * 1024;
const MAX_PRODUCT_ID_LENGTH = 200;
const MAX_PRODUCT_SLUG_LENGTH = 160;

const SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CONTROL_PATTERN =
  /[\u0000-\u001f\u007f]/;

type RequestedProduct = {
  productId: string;
  productSlug: string;
};

class BodyTooLargeError extends Error {}

/**
 * Prevent excessively large request bodies
 * from being loaded into memory.
 */
async function readJsonBody(
  request: Request
): Promise<unknown> {
  if (!request.body) {
    throw new Error("Missing request body");
  }

  const reader = request.body.getReader();

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new BodyTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);

  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder("utf-8", {
    fatal: true,
  }).decode(bytes);

  return JSON.parse(text) as unknown;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseRequestedProducts(
  input: unknown
): RequestedProduct[] | null {
  if (
    !isRecord(input) ||
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > MAX_ITEMS
  ) {
    return null;
  }

  const products: RequestedProduct[] = [];

  for (const value of input.items) {
    if (!isRecord(value)) {
      return null;
    }

    const { productId, productSlug } = value;

    if (
      typeof productId !== "string" ||
      productId.length < 1 ||
      productId.length > MAX_PRODUCT_ID_LENGTH ||
      productId.trim() !== productId ||
      CONTROL_PATTERN.test(productId) ||
      typeof productSlug !== "string" ||
      productSlug.length < 1 ||
      productSlug.length > MAX_PRODUCT_SLUG_LENGTH ||
      !SLUG_PATTERN.test(productSlug)
    ) {
      return null;
    }

    products.push({
      productId,
      productSlug,
    });
  }

  return products;
}

function jsonResponse(
  body: unknown,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

/**
 * POST is used because basket contents
 * are supplied in a bounded JSON body.
 *
 * This endpoint performs verification only.
 */
export async function POST(request: Request) {
  const contentType =
    request.headers.get("content-type") ?? "";

  // File 176: reject invalid JSON media types,
  // while allowing parameters such as charset.
  if (
    !/^application\/json(?:\s*;|$)/i.test(
      contentType
    )
  ) {
    return jsonResponse(
      { error: "Expected JSON request" },
      415
    );
  }

  const contentLength = Number(
    request.headers.get("content-length")
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_BODY_BYTES
  ) {
    return jsonResponse(
      { error: "Request is too large" },
      413
    );
  }

  let payload: unknown;

  try {
    payload = await readJsonBody(request);
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return jsonResponse(
        { error: "Request is too large" },
        413
      );
    }

    return jsonResponse(
      { error: "Invalid JSON request" },
      400
    );
  }

  const selections =
    parseRequestedProducts(payload);

  if (!selections) {
    return jsonResponse(
      { error: "Invalid product selections" },
      400
    );
  }

  try {
    const catalogue =
      await getPublicCatalogueSnapshot();

    const validCategories = new Set(
      catalogue.categories.map(
        (category) => category.slug
      )
    );

    const productsBySlug = new Map(
      catalogue.products.map(
        (product) => [product.slug, product]
      )
    );

    const results = selections.map(
      (selection, index) => {
        const product = productsBySlug.get(
          selection.productSlug
        );

        const eligible =
          product !== undefined &&
          product.id === selection.productId &&
          product.status === "published" &&
          product.isDemo === false &&
          validCategories.has(
            product.categorySlug
          );

        if (!eligible || !product) {
          return {
            index,
            available: false as const,
            product: null,
          };
        }

        return {
          index,
          available: true as const,
          product: {
            productId: product.id,
            productSlug: product.slug,
            productName: product.name,
            categorySlug: product.categorySlug,
          },
        };
      }
    );

    return jsonResponse({
      verified: results.every(
        (result) => result.available
      ),
      results,
    });
  } catch {
    return jsonResponse(
      {
        error:
          "Product verification is temporarily unavailable",
      },
      503
    );
  }
}
