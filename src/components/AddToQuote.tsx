
"use client";

/* ==========================================
   BARK ORNAMENT - ADD TO QUOTE

   File: src/components/AddToQuote.tsx
   Theme: Golden Coastal Luxury

   Connects individual products to the
   shared quotation basket provider.
   ========================================== */

import {
  useState,
  type FormEvent,
} from "react";

import type { Product } from "@/lib/products";

import {
  MAX_ITEM_QUANTITY,
  MAX_QUOTE_ITEMS,
  type QuoteProductOptions,
} from "@/lib/quote-basket";

import {
  useQuoteBasket,
} from "@/components/QuoteBasketProvider";

/* ==========================================
   COMPONENT PROPS
   ========================================== */

type AddToQuoteProps = {
  product: Product;
};

/* ==========================================
   REUSABLE FIELD
   ========================================== */

function RequestField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-semibold text-[#30251F]"
      >
        {label}
      </label>

      <input
        id={id}
        type="text"
        value={value}
        maxLength={200}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="form-input"
      />
    </div>
  );
}

/* ==========================================
   MAIN ADD TO QUOTE COMPONENT
   ========================================== */

export default function AddToQuote({
  product,
}: AddToQuoteProps) {
  const {
    addItem,
    items,
    itemCount,
    isLoaded,
  } = useQuoteBasket();

  /* Product requirements */

  const [quantity, setQuantity] = useState(1);
  const [material, setMaterial] = useState("");
  const [size, setSize] = useState("");
  const [finish, setFinish] = useState("");
  const [customization, setCustomization] =
    useState("");
  const [notes, setNotes] = useState("");

  /* Submission feedback */

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function resetFeedback() {
    setMessage("");
    setError("");
  }

  /* ========================================
     QUANTITY CONTROLS
     ======================================== */

  function changeQuantity(value: number) {
    resetFeedback();

    if (!Number.isFinite(value)) {
      return;
    }

    setQuantity(
      Math.max(
        1,
        Math.min(
          MAX_ITEM_QUANTITY,
          Math.trunc(value)
        )
      )
    );
  }

  /* ========================================
     FORM SUBMISSION
     ======================================== */

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    resetFeedback();

    if (!isLoaded) {
      setError(
        "The quotation basket is still loading."
      );
      return;
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ITEM_QUANTITY
    ) {
      setError("Please enter a valid quantity.");
      return;
    }

    const options: QuoteProductOptions = {
      material: material.trim(),
      size: size.trim(),
      finish: finish.trim(),
      customization: customization.trim(),
    };

    /* Match the unique-item rules from
       File 11. Same product and options
       increase the existing quantity. */

    const signature = JSON.stringify([
      product.id,
      options.material,
      options.size,
      options.finish,
      options.customization,
    ]);

    const existing = items.some(
      (item) => item.id === signature
    );

    if (
      !existing &&
      itemCount >= MAX_QUOTE_ITEMS
    ) {
      setError(
        "The quotation basket has reached its item limit."
      );
      return;
    }

    addItem(
      product,
      quantity,
      options,
      notes.trim()
    );

    setMessage(
      `${product.name} added to your quotation basket.`
    );
  }

  /* ========================================
     RENDER
     ======================================== */

  return (
    <section
      aria-labelledby="add-to-quote-title"
      className="mx-auto w-full max-w-2xl rounded-2xl border border-[#E4D7C4] bg-white p-5 text-center shadow-[0_10px_35px_rgba(48,37,31,0.06)] sm:p-8"
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#B95016]">
        Product Enquiry
      </p>

      <h3
        id="add-to-quote-title"
        className="font-serif text-2xl text-[#30251F] sm:text-3xl"
      >
        Add to Quotation
      </h3>

      <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#74675E]">
        Enter your requested quantity and product
        preferences. Our team will confirm actual
        specifications and availability when your
        enquiry is reviewed.
      </p>

      <p className="mt-4 font-semibold text-[#30251F]">
        {product.name}
      </p>

      {product.isDemo && (
        <p className="mt-3 rounded-lg bg-[#FAF7F0] px-4 py-3 text-xs leading-6 text-[#87512C]">
          Development product only. This listing
          does not confirm actual inventory or
          manufacturing options.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6"
      >
        {/* QUANTITY */}

        <div>
          <label
            htmlFor="quote-quantity"
            className="mb-3 block text-sm font-semibold text-[#30251F]"
          >
            Requested Quantity
            <span className="ml-1 text-[#B95016]">
              *
            </span>
          </label>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={!isLoaded || quantity <= 1}
              onClick={() =>
                changeQuantity(quantity - 1)
              }
              className="flex h-12 w-12 items-center justify-center rounded-md border border-[#D9C8B0] bg-[#FAF7F0] text-xl text-[#30251F] transition-colors hover:bg-[#E9DDC9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>

            <input
              id="quote-quantity"
              type="number"
              min={1}
              max={MAX_ITEM_QUANTITY}
              step={1}
              required
              disabled={!isLoaded}
              value={quantity}
              onChange={(event) => {
                resetFeedback();

                const value = event.target.value;

                if (value === "") {
                  setQuantity(0);
                  return;
                }

                const parsed = Number(value);

                if (Number.isFinite(parsed)) {
                  setQuantity(parsed);
                }
              }}
              className="h-12 w-28 rounded-md border border-[#D9C8B0] bg-white px-3 text-center text-base font-bold text-[#30251F] focus:border-[#B95016] focus:outline-none focus:ring-2 focus:ring-[#B95016]/20"
            />

            <button
              type="button"
              aria-label="Increase quantity"
              disabled={
                !isLoaded ||
                quantity >= MAX_ITEM_QUANTITY
              }
              onClick={() =>
                changeQuantity(quantity + 1)
              }
              className="flex h-12 w-12 items-center justify-center rounded-md border border-[#D9C8B0] bg-[#FAF7F0] text-xl text-[#30251F] transition-colors hover:bg-[#E9DDC9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {/* REQUESTED PRODUCT OPTIONS */}

        <div className="grid gap-5 text-left sm:grid-cols-2">
          <RequestField
            id="quote-material"
            label="Preferred Material"
            value={material}
            onChange={(value) => {
              setMaterial(value);
              resetFeedback();
            }}
            placeholder="e.g. Eco Leather"
          />

          <RequestField
            id="quote-size"
            label="Preferred Size"
            value={size}
            onChange={(value) => {
              setSize(value);
              resetFeedback();
            }}
            placeholder="e.g. A4"
          />

          <RequestField
            id="quote-finish"
            label="Preferred Finish"
            value={finish}
            onChange={(value) => {
              setFinish(value);
              resetFeedback();
            }}
            placeholder="e.g. Matte finish"
          />

          <RequestField
            id="quote-customization"
            label="Customization / Branding"
            value={customization}
            onChange={(value) => {
              setCustomization(value);
              resetFeedback();
            }}
            placeholder="e.g. Hotel logo"
          />
        </div>

        {/* ADDITIONAL NOTES */}

        <div className="text-left">
          <label
            htmlFor="quote-notes"
            className="mb-2 block text-sm font-semibold text-[#30251F]"
          >
            Additional Requirements
          </label>

          <textarea
            id="quote-notes"
            rows={4}
            maxLength={2000}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              resetFeedback();
            }}
            placeholder="Describe your colors, branding, preferred delivery requirements or other product details..."
            className="form-textarea"
          />
        </div>

        {/* SUBMISSION FEEDBACK */}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="rounded-lg border border-[#C59A45] bg-[#FAF7F0] px-4 py-3 text-sm font-medium text-[#30251F]"
          >
            ✓ {message}
          </p>
        )}

        {/* ADD TO BASKET */}

        <button
          type="submit"
          disabled={
            !isLoaded ||
            quantity < 1 ||
            quantity > MAX_ITEM_QUANTITY ||
            !Number.isSafeInteger(quantity)
          }
          className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md bg-[#B95016] px-7 py-4 text-sm font-bold text-white transition-colors duration-200 hover:bg-[#963E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B95016] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">＋</span>
          {isLoaded
            ? "Add to Quote Basket"
            : "Loading Basket..."}
        </button>

        <p className="mb-0 text-xs leading-6 text-[#74675E]">
          This action adds your selection to
          the website's temporary quotation basket.
          It does not send an enquiry to Bark Ornament.
        </p>
      </form>
    </section>
  );
}
