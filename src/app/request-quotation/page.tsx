
"use client";

/**
 * BARK ORNAMENT (PVT) LTD
 * FILE 153 — STEP F3
 *
 * REQUEST A QUOTATION
 * src/app/request-quotation/page.tsx
 *
 * Original multi-product quotation workflow.
 *
 * FILE 153 INTEGRATION:
 * - Verify saved products against the public catalogue.
 * - Support eligible local and Sanity CMS products.
 * - Use trusted product names and categories.
 * - Block unavailable products.
 * - Reverify before preview, copy and compose.
 * - Invalidate prepared content when inputs change.
 *
 * No quotation API submission.
 * No automatic email sending.
 * No database writes.
 * Customer manually sends the prepared email.
 */

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  useQuoteBasket,
} from "@/components/QuoteBasketProvider";

import {
  MAX_ITEM_QUANTITY,
  type QuoteBasketItem,
} from "@/lib/quote-basket";

import {
  buildQuotationEmailDraft,
  type QuotationEmailDraft,
  type QuotationDraftCustomer,
} from "@/lib/quotation-email-draft";

/* ==========================================
   1. APPROVED QUOTATION RECIPIENT
   ========================================== */

/**
 * Management approval remains disabled.
 *
 * Do not activate until the official
 * quotation mailbox is explicitly approved.
 */

const QUOTATION_RECIPIENT_APPROVED = false;

const APPROVED_QUOTATION_RECIPIENT =
  QUOTATION_RECIPIENT_APPROVED
    ? (
        process.env
          .NEXT_PUBLIC_BARK_QUOTATION_RECIPIENT ?? ""
      ).trim()
    : "";

/* ==========================================
   2. CUSTOMER FORM
   ========================================== */

type CustomerForm = {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  destination: string;
  otherDestination: string;
  requiredDeliveryDate: string;
  message: string;
  consent: boolean;
};

const INITIAL_CUSTOMER: CustomerForm = {
  fullName: "",
  companyName: "",
  email: "",
  phone: "",
  destination: "",
  otherDestination: "",
  requiredDeliveryDate: "",
  message: "",
  consent: false,
};

type ComposeProvider =
  | "gmail"
  | "outlook"
  | "default";

/* ==========================================
   3. PRODUCT VERIFICATION
   ========================================== */

/**
 * Browser basket data is untrusted.
 *
 * The server verifies the product identity
 * against the approved public catalogue.
 *
 * This request sends product IDs/slugs only.
 * No customer information is transmitted.
 */

type VerificationResult =
  | {
      kind: "ready";
      items: QuoteBasketItem[];
    }
  | {
      kind: "unavailable";
      names: string[];
    }
  | {
      kind: "error";
      message: string;
    };

type VerificationIssue = {
  basketSnapshot: string;
  message: string;
  names: string[];
};

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

const SAFE_SLUG_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function verifyBasketProducts(
  selections: readonly QuoteBasketItem[]
): Promise<VerificationResult> {
  if (
    selections.length === 0 ||
    selections.length > 100
  ) {
    return {
      kind: "error",
      message:
        "Please review the number of products in your quotation basket.",
    };
  }

  try {
    const response = await fetch(
      "/api/catalogue/verify-quote",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          items: selections.map((item) => ({
            productId: item.productId,
            productSlug: item.productSlug,
          })),
        }),
      }
    );

    if (!response.ok) {
      return {
        kind: "error",
        message:
          "We could not verify your selected products. Please try again.",
      };
    }

    const data: unknown =
      await response.json();

    if (
      !isRecord(data) ||
      typeof data.verified !== "boolean" ||
      !Array.isArray(data.results) ||
      data.results.length !== selections.length
    ) {
      return {
        kind: "error",
        message:
          "The product verification response was invalid. Please try again.",
      };
    }

    const trustedItems: QuoteBasketItem[] = [];
    const unavailableNames: string[] = [];

    for (
      let index = 0;
      index < selections.length;
      index++
    ) {
      const savedItem = selections[index];
      const result: unknown =
        data.results[index];

      if (
        !isRecord(result) ||
        result.index !== index ||
        typeof result.available !== "boolean"
      ) {
        return {
          kind: "error",
          message:
            "Product verification could not be completed safely.",
        };
      }

      if (result.available === false) {
        if (result.product !== null) {
          return {
            kind: "error",
            message:
              "Product verification returned inconsistent information.",
          };
        }

        unavailableNames.push(
          savedItem.productName
        );

        continue;
      }

      const product = result.product;

      if (
        !isRecord(product) ||
        product.productId !==
          savedItem.productId ||
        product.productSlug !==
          savedItem.productSlug ||
        typeof product.productName !==
          "string" ||
        product.productName.trim().length === 0 ||
        product.productName.length > 200 ||
        typeof product.categorySlug !==
          "string" ||
        !SAFE_SLUG_PATTERN.test(
          product.categorySlug
        )
      ) {
        return {
          kind: "error",
          message:
            "The verified product information did not match your selection.",
        };
      }

      trustedItems.push({
        ...savedItem,

        // Use server-authoritative catalogue data.
        productId: product.productId,
        productSlug: product.productSlug,
        productName: product.productName,
        categorySlug: product.categorySlug,

        // Preserve customer requirements.
        quantity: savedItem.quantity,
        options: { ...savedItem.options },
        notes: savedItem.notes,
      });
    }

    if (unavailableNames.length > 0) {
      return {
        kind: "unavailable",
        names: unavailableNames,
      };
    }

    if (
      data.verified !== true ||
      trustedItems.length !== selections.length
    ) {
      return {
        kind: "error",
        message:
          "Not all selected products could be verified.",
      };
    }

    return {
      kind: "ready",
      items: trustedItems,
    };
  } catch {
    return {
      kind: "error",
      message:
        "The product verification service is unavailable. Check your connection and try again.",
    };
  }
}

/* ==========================================
   4. QUANTITY CONTROL
   ========================================== */

function QuantityControl({
  item,
  onChange,
}: {
  item: QuoteBasketItem;
  onChange: (
    id: string,
    quantity: number
  ) => void;
}) {
  const [draft, setDraft] = useState(
    String(item.quantity)
  );

  function applyQuantity() {
    const value = Number(draft);

    if (
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > MAX_ITEM_QUANTITY
    ) {
      setDraft(String(item.quantity));
      return;
    }

    setDraft(String(value));
    onChange(item.id, value);
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label={`Decrease quantity for ${item.productName}`}
        disabled={item.quantity <= 1}
        onClick={() =>
          onChange(
            item.id,
            item.quantity - 1
          )
        }
        className="flex h-11 w-11 items-center justify-center rounded-md border border-[#D9C8B0] bg-[#FAF7F0] text-xl text-[#30251F] hover:bg-[#E9DDC9] disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>

      <input
        type="number"
        min={1}
        max={MAX_ITEM_QUANTITY}
        step={1}
        value={draft}
        aria-label={`Quantity for ${item.productName}`}
        onChange={(event) =>
          setDraft(event.target.value)
        }
        onBlur={applyQuantity}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        className="h-11 w-24 rounded-md border border-[#D9C8B0] bg-white px-2 text-center text-sm font-bold text-[#30251F]"
      />

      <button
        type="button"
        aria-label={`Increase quantity for ${item.productName}`}
        disabled={
          item.quantity >= MAX_ITEM_QUANTITY
        }
        onClick={() =>
          onChange(
            item.id,
            item.quantity + 1
          )
        }
        className="flex h-11 w-11 items-center justify-center rounded-md border border-[#D9C8B0] bg-[#FAF7F0] text-xl text-[#30251F] hover:bg-[#E9DDC9] disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

/* ==========================================
   5. BASKET ITEM CARD
   ========================================== */

function BasketItemCard({
  item,
  onQuantityChange,
  onNotesChange,
  onRemove,
  disabled = false,
}: {
  item: QuoteBasketItem;
  onQuantityChange: (
    id: string,
    quantity: number
  ) => void;
  onNotesChange: (
    id: string,
    notes: string
  ) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  const notesId = useId();

  const options = [
    ["Material", item.options.material],
    ["Size", item.options.size],
    ["Finish", item.options.finish],
    [
      "Customization",
      item.options.customization,
    ],
  ].filter((entry) => entry[1]);

  return (
    <article className="rounded-xl border border-[#E4D7C4] bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex w-full justify-end">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onRemove(item.id)
            }
            className="min-h-11 rounded-md border border-[#D9C8B0] px-4 py-2 text-sm font-semibold text-[#963E10] hover:bg-[#FAF7F0] disabled:opacity-50"
          >
            Remove Product
          </button>
        </div>

        <div className="mx-auto flex w-full min-w-0 flex-col items-center text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#B95016]">
            {item.categorySlug.replaceAll(
              "-",
              " "
            )}
          </p>

          <h3 className="font-serif text-2xl text-[#30251F]">
            {item.productName}
          </h3>

          <Link
            href={`/products/${item.productSlug}`}
            className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#B95016] hover:underline"
          >
            View Product Details →
          </Link>
        </div>
      </div>

      {options.length > 0 && (
        <dl className="mt-5 grid gap-3 rounded-lg bg-[#FAF7F0] p-4 text-sm sm:grid-cols-2">
          {options.map(([label, value]) => (
            <div
              key={label}
              className="min-w-0 text-center"
            >
              <dt className="font-semibold text-[#30251F]">
                {label}
              </dt>

              <dd className="mt-1 break-words text-[#74675E]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-sm font-bold text-[#30251F]">
          Requested Quantity
        </p>

        <fieldset disabled={disabled}>
          <QuantityControl
            key={item.quantity}
            item={item}
            onChange={onQuantityChange}
          />
        </fieldset>
      </div>

      <div className="mt-6">
        <label
          htmlFor={notesId}
          className="mb-2 block text-center text-sm font-semibold text-[#30251F]"
        >
          Product Requirements / Notes
        </label>

        <textarea
          id={notesId}
          value={item.notes}
          rows={3}
          maxLength={2000}
          disabled={disabled}
          placeholder="Additional product requirements..."
          onChange={(event) =>
            onNotesChange(
              item.id,
              event.target.value
            )
          }
          className="form-textarea"
        />

        <p className="mt-2 text-center text-xs text-[#74675E]">
          Notes are saved as you type.
        </p>
      </div>
    </article>
  );
}

/* ==========================================
   6. CUSTOMER INPUT FIELD
   ========================================== */

function CustomerField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  autoComplete,
  maxLength,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <div className="text-left">
      <label
        htmlFor={id}
        className="form-label"
      >
        {label}

        {required && (
          <span className="ml-1 text-[#B95016]">
            *
          </span>
        )}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        required={required}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="form-input"
      />
    </div>
  );
}

/* ==========================================
   7. MAIN REQUEST QUOTATION PAGE
   ========================================== */

export default function RequestQuotationPage() {
  const {
    items,
    itemCount,
    totalQuantity,
    isEmpty,
    isLoaded,
    changeQuantity,
    changeNotes,
    removeItem,
    clearItems,
  } = useQuoteBasket();

  const [customer, setCustomer] =
    useState<CustomerForm>({
      ...INITIAL_CUSTOMER,
    });

  const [composeMessage, setComposeMessage] =
    useState("");

  const [
    manualCopyText,
    setManualCopyText,
  ] = useState("");

  const [reviewDraft, setReviewDraft] =
    useState<{
      draft: QuotationEmailDraft;
      basketSnapshot: string;
      formRevision: number;
    } | null>(null);

  const [
    formRevision,
    setFormRevision,
  ] = useState(0);

  const [
    preparedVersion,
    setPreparedVersion,
  ] = useState<{
    formRevision: number;
    basketSnapshot: string;
  } | null>(null);

  const [
    isVerifying,
    setIsVerifying,
  ] = useState(false);

  const [
    verificationIssue,
    setVerificationIssue,
  ] = useState<VerificationIssue | null>(
    null
  );

  const formRef =
    useRef<HTMLFormElement>(null);

  const previewHeadingRef =
    useRef<HTMLHeadingElement>(null);

  const copyAttemptRef = useRef(0);

  const verificationAttemptRef = useRef(0);

  const formRevisionRef = useRef(0);

  /* ========================================
     8. SNAPSHOT CONSISTENCY
     ======================================== */

  const currentBasketSnapshot =
    JSON.stringify(items);

  const basketSnapshotRef = useRef(
    currentBasketSnapshot
  );

  basketSnapshotRef.current =
    currentBasketSnapshot;

  const preparedStateIsCurrent =
    preparedVersion !== null &&
    preparedVersion.formRevision ===
      formRevision &&
    preparedVersion.basketSnapshot ===
      currentBasketSnapshot;

  const currentComposeMessage =
    preparedStateIsCurrent
      ? composeMessage
      : "";

  const currentManualCopyText =
    preparedStateIsCurrent
      ? manualCopyText
      : "";

  const currentReviewDraft =
    reviewDraft !== null &&
    preparedStateIsCurrent &&
    isLoaded &&
    !isEmpty &&
    reviewDraft.formRevision ===
      formRevision &&
    reviewDraft.basketSnapshot ===
      currentBasketSnapshot
      ? reviewDraft.draft
      : null;

  const currentVerificationIssue =
    verificationIssue?.basketSnapshot ===
    currentBasketSnapshot
      ? verificationIssue
      : null;

  const recipient =
    APPROVED_QUOTATION_RECIPIENT.trim();

  const hasApprovedRecipient =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      recipient
    );

  /* ========================================
     9. PREVIEW FOCUS
     ======================================== */

  useEffect(() => {
    if (currentReviewDraft) {
      previewHeadingRef.current?.focus();
    }
  }, [currentReviewDraft]);

  /* ========================================
     10. INVALIDATE OLD PREPARATIONS
     ======================================== */

  function invalidatePreparedContent() {
    verificationAttemptRef.current += 1;
    copyAttemptRef.current += 1;

    formRevisionRef.current += 1;

    setFormRevision(
      formRevisionRef.current
    );

    setPreparedVersion(null);
    setReviewDraft(null);
    setManualCopyText("");
    setComposeMessage("");
    setVerificationIssue(null);
    setIsVerifying(false);
  }

  function updateCustomer(
    field: keyof CustomerForm,
    value: string | boolean
  ) {
    invalidatePreparedContent();

    setCustomer((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleClearBasket() {
    if (
      window.confirm(
        "Remove all products from your quotation basket?"
      )
    ) {
      invalidatePreparedContent();
      clearItems();
    }
  }

  /* ========================================
     11. VERIFY AND PREPARE EMAIL
     ======================================== */

  async function prepareVerifiedEmailDraft():
    Promise<QuotationEmailDraft | null> {
    const initialRevision =
      formRevisionRef.current;

    const initialBasketSnapshot =
      currentBasketSnapshot;

    setPreparedVersion({
      formRevision: initialRevision,
      basketSnapshot: initialBasketSnapshot,
    });

    setReviewDraft(null);
    setManualCopyText("");
    setVerificationIssue(null);
    setComposeMessage("");

    const form = formRef.current;

    if (!form) {
      setComposeMessage(
        "The customer form is unavailable."
      );
      return null;
    }

    if (!form.reportValidity()) {
      setComposeMessage(
        "Please complete the required customer fields."
      );
      return null;
    }

    if (
      !isLoaded ||
      items.length === 0
    ) {
      setComposeMessage(
        "Please add at least one product to your quotation basket."
      );
      return null;
    }

    /* Read customer details locally. */

    const formData = new FormData(form);

    const read = (
      name: string
    ): string => {
      const value = formData.get(name);

      return typeof value === "string"
        ? value.trim()
        : "";
    };

    const destination =
      read("destination");

    const otherDestination =
      read("other-destination");

    if (
      destination === "Other" &&
      !otherDestination
    ) {
      setComposeMessage(
        "Please specify your delivery destination."
      );
      return null;
    }

    const phone =
      read("customer-phone");

    if (
      phone &&
      !/^\+?[0-9\s().-]{6,40}$/.test(
        phone
      )
    ) {
      setComposeMessage(
        "Enter a valid Phone / WhatsApp number (6–40 characters)."
      );

      form
        .querySelector<HTMLInputElement>(
          "#customer-phone"
        )
        ?.focus();

      return null;
    }

    const customerDetails:
      QuotationDraftCustomer = {
      fullName:
        read("customer-name"),

      companyName:
        read("company-name"),

      email:
        read("customer-email"),

      phone:
        read("customer-phone"),

      destination:
        destination === "Other"
          ? `Other — ${otherDestination}`
          : destination,

      requiredDeliveryDate:
        read("delivery-date"),

      message:
        read("enquiry-message"),
    };

    /* Verify the basket before generating
       any customer-visible email draft. */

    const attempt =
      ++verificationAttemptRef.current;

    setIsVerifying(true);

    setComposeMessage(
      "Verifying your selected products against our current catalogue..."
    );

    try {
      const verification =
        await verifyBasketProducts(items);

      /* Discard results from an older
         request or modified form/basket. */

      if (
        attempt !==
          verificationAttemptRef.current ||
        initialRevision !==
          formRevisionRef.current ||
        initialBasketSnapshot !==
          basketSnapshotRef.current
      ) {
        return null;
      }

      if (
        verification.kind ===
        "unavailable"
      ) {
        setVerificationIssue({
          basketSnapshot:
            initialBasketSnapshot,

          message:
            "One or more selected products are no longer eligible for quotation. Please review the products listed below and remove unavailable selections before trying again.",

          names:
            verification.names,
        });

        setComposeMessage(
          "Quotation preparation was blocked because some products could not be verified."
        );

        return null;
      }

      if (
        verification.kind === "error"
      ) {
        setVerificationIssue({
          basketSnapshot:
            initialBasketSnapshot,

          message:
            verification.message,

          names: [],
        });

        setComposeMessage(
          verification.message
        );

        return null;
      }

      /* Use only verified catalogue identity
         when constructing the email. */

      try {
        return buildQuotationEmailDraft(
          customerDetails,
          verification.items
        );
      } catch (error) {
        setComposeMessage(
          error instanceof Error
            ? error.message
            : "Unable to prepare quotation details."
        );

        return null;
      }
    } finally {
      if (
        attempt ===
        verificationAttemptRef.current
      ) {
        setIsVerifying(false);
      }
    }
  }

  /* ========================================
     12. PREVIEW QUOTATION
     ======================================== */

  async function handlePreviewQuotation() {
    copyAttemptRef.current += 1;

    const draft =
      await prepareVerifiedEmailDraft();

    if (!draft) {
      return;
    }

    setReviewDraft({
      draft,

      basketSnapshot:
        currentBasketSnapshot,

      formRevision:
        formRevisionRef.current,
    });

    setComposeMessage(
      "Quotation preview prepared. Review the details before copying or opening an email app."
    );
  }

  /* ========================================
     13. MANUAL EMAIL COMPOSITION
     ======================================== */

  async function handleCompose(
    provider: ComposeProvider
  ) {
    copyAttemptRef.current += 1;

    if (!hasApprovedRecipient) {
      setPreparedVersion({
        formRevision:
          formRevisionRef.current,

        basketSnapshot:
          currentBasketSnapshot,
      });

      setComposeMessage(
        "The company quotation email address has not yet been approved."
      );

      return;
    }

    /*
     * A new browser tab must be opened
     * synchronously from the customer click
     * to avoid popup blockers.
     *
     * It is navigated only after the
     * catalogue verification succeeds.
     */

    let composeWindow: Window | null =
      null;

    const formIsValid =
      formRef.current?.reportValidity() ??
      false;

    if (
      formIsValid &&
      isLoaded &&
      !isEmpty &&
      provider !== "default"
    ) {
      composeWindow = window.open(
        "about:blank",
        "_blank"
      );

      if (composeWindow) {
        composeWindow.opener = null;

        try {
          composeWindow.document.title =
            "Preparing quotation email";

          composeWindow.document.body.textContent =
            "Verifying selected products. The email composer will open after verification.";
        } catch {
          // The fallback remains available.
        }
      }
    }

    const draft =
      await prepareVerifiedEmailDraft();

    if (!draft) {
      composeWindow?.close();
      return;
    }

    const fullCopyText = [
      `To: ${recipient}`,
      `Subject: ${draft.subject}`,
      "",
      draft.body,
    ].join("\n");

    const to =
      encodeURIComponent(
        recipient
      ).replace(/%40/gi, "@");

    const subject =
      encodeURIComponent(
        draft.subject
      );

    const webBody =
      encodeURIComponent(
        draft.body
      );

    const mailtoBody =
      encodeURIComponent(
        draft.body.replace(
          /\r\n|\r|\n/g,
          "\r\n"
        )
      );

    let url: string;

    if (provider === "gmail") {
      url =
        "https://mail.google.com/mail/?" +
        `to=${to}&su=${subject}&body=${webBody}&tf=cm`;
    } else if (provider === "outlook") {
      url =
        "https://outlook.office.com/mail/deeplink/compose?" +
        `to=${to}&subject=${subject}&body=${webBody}`;
    } else {
      url =
        `mailto:${to}?subject=${subject}&body=${mailtoBody}`;
    }

    /* Keep complete details available
       even when an email app cannot open. */

    setManualCopyText(
      fullCopyText
    );

    const conservativeLimit =
      provider === "default"
        ? 1800
        : 3500;

    if (
      url.length >
      conservativeLimit
    ) {
      composeWindow?.close();

      setComposeMessage(
        "This quotation contains too much information for a reliable prefilled email link. The complete quotation is displayed below. Copy it into your email application, review the recipient and manually send."
      );

      return;
    }

    try {
      if (
        provider === "default"
      ) {
        window.location.assign(
          url
        );
      } else if (
        composeWindow &&
        !composeWindow.closed
      ) {
        composeWindow.location.replace(
          url
        );
      } else {
        setComposeMessage(
          "Your browser could not open a new email window. Copy the complete quotation details below and paste them into your email application."
        );

        return;
      }

      setComposeMessage(
        "We attempted to open your email application. Check the recipient, subject and complete quotation details before manually sending. If the message did not open correctly, use the full quotation text displayed below. No enquiry has been submitted through this website."
      );
    } catch {
      composeWindow?.close();

      setComposeMessage(
        "Your browser could not open the selected email application. Copy the complete quotation details displayed below and paste them into your preferred email application."
      );
    }
  }

  /* ========================================
     14. COPY QUOTATION
     ======================================== */

  async function handleCopyQuotation() {
    const copyAttempt =
      ++copyAttemptRef.current;

    const draft =
      await prepareVerifiedEmailDraft();

    if (
      !draft ||
      copyAttempt !==
        copyAttemptRef.current
    ) {
      return;
    }

    const details =
      (
        hasApprovedRecipient
          ? `To: ${recipient}\n`
          : ""
      ) +
      `Subject: ${draft.subject}\n\n${draft.body}`;

    try {
      if (
        !navigator.clipboard?.writeText
      ) {
        throw new Error(
          "Clipboard API is unavailable."
        );
      }

      await navigator.clipboard.writeText(
        details
      );

      if (
        copyAttempt !==
        copyAttemptRef.current
      ) {
        return;
      }

      setManualCopyText("");

      setComposeMessage(
        hasApprovedRecipient
          ? "Quotation details copied. Paste into an email, verify the recipient and manually send."
          : "Quotation details copied. Confirm the official company quotation email address before sending."
      );
    } catch {
      if (
        copyAttempt !==
        copyAttemptRef.current
      ) {
        return;
      }

      setManualCopyText(
        details
      );

      setComposeMessage(
        "Automatic copying was unavailable. Select and copy the complete details below."
      );
    }
  }

  /* ========================================
     15. PAGE CONTENT
     ======================================== */

  return (
    <>
      {/* PAGE HERO */}

      <section className="bg-[#30251F] px-5 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#E3B65D]">
            Bark Ornament Product Enquiry
          </p>

          <h1 className="font-serif text-4xl text-[#FAF7F0] sm:text-5xl">
            Request a Quotation
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#E9DDC9]">
            Review your selected products
            and prepare your customized
            hospitality enquiry.
          </p>

          <nav
            aria-label="Breadcrumb"
            className="mt-8 flex justify-center gap-2 text-sm text-[#E9DDC9]"
          >
            <Link
              href="/"
              className="hover:underline"
            >
              Home
            </Link>

            <span aria-hidden="true">
              /
            </span>

            <span aria-current="page">
              Request a Quotation
            </span>
          </nav>
        </div>
      </section>

      {/* BASKET REVIEW */}

      <section className="section bg-[#FAF7F0]">
        <div className="container max-w-[1100px]">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="eyebrow">
              Quotation Basket
            </p>

            <h2 className="font-serif text-3xl text-[#30251F] sm:text-4xl">
              Your Selected Products
            </h2>

            <p className="mt-5 text-[#74675E]">
              Review quantities, update
              requirements or remove items.
            </p>
          </div>

          {!isLoaded ? (
            <p
              role="status"
              className="py-12 text-center text-[#74675E]"
            >
              Loading your quotation basket...
            </p>
          ) : isEmpty ? (
            <div className="mx-auto max-w-xl rounded-xl border border-[#E4D7C4] bg-white p-10 text-center">
              <h3 className="font-serif text-2xl text-[#30251F]">
                Your Quote Basket Is Empty
              </h3>

              <p className="mt-4 text-sm leading-7 text-[#74675E]">
                Explore our hospitality products
                and add items to your basket.
              </p>

              <Link
                href="/products"
                className="btn btn-primary mt-7"
              >
                Explore Products →
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {items.map((item) => (
                  <BasketItemCard
                    key={item.id}
                    item={item}
                    onQuantityChange={(
                      id,
                      quantity
                    ) => {
                      invalidatePreparedContent();

                      changeQuantity(
                        id,
                        quantity
                      );
                    }}
                    onNotesChange={(
                      id,
                      notes
                    ) => {
                      invalidatePreparedContent();

                      changeNotes(
                        id,
                        notes
                      );
                    }}
                    onRemove={(id) => {
                      invalidatePreparedContent();

                      removeItem(id);
                    }}
                  />
                ))}
              </div>

              <div className="mt-8 rounded-xl border border-[#E4D7C4] bg-[#E9DDC9] p-6 text-center sm:p-8">
                <h3 className="font-serif text-2xl text-[#30251F]">
                  Quotation Summary
                </h3>

                <div className="mt-5 flex flex-wrap justify-center gap-8">
                  <div>
                    <p className="text-3xl font-bold text-[#30251F]">
                      {itemCount}
                    </p>

                    <p className="text-sm text-[#74675E]">
                      Product Selections
                    </p>
                  </div>

                  <div>
                    <p className="text-3xl font-bold text-[#30251F]">
                      {totalQuantity}
                    </p>

                    <p className="text-sm text-[#74675E]">
                      Requested Units
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/products"
                    className="btn btn-secondary"
                  >
                    Add More Products
                  </Link>

                  <button
                    type="button"
                    onClick={handleClearBasket}
                    className="btn border border-[#B95016] bg-white text-[#963E10] hover:bg-[#FAF7F0] disabled:opacity-50"
                  >
                    Clear Basket
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CUSTOMER FORM */}

      <section className="section bg-white">
        <div className="container max-w-[950px]">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="eyebrow">
              Customer Information
            </p>

            <h2 className="font-serif text-3xl text-[#30251F] sm:text-4xl">
              Your Enquiry Details
            </h2>

            <p className="mt-5 text-base leading-8 text-[#74675E]">
              Complete your details and choose
              how to prepare your quotation
              email. Your selected products
              and requirements will be included
              automatically after catalogue
              verification. Review and manually
              send the email in your chosen
              application.
            </p>
          </div>

          <form
            ref={formRef}
            onSubmit={(event) =>
              event.preventDefault()
            }
            className="rounded-2xl border border-[#E4D7C4] bg-[#FAF7F0] p-5 sm:p-8"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <CustomerField
                id="customer-name"
                label="Full Name"
                required
                maxLength={120}
                value={
                  customer.fullName
                }
                onChange={(value) =>
                  updateCustomer(
                    "fullName",
                    value
                  )
                }
                autoComplete="name"
                placeholder="Your full name"
              />

              <CustomerField
                id="company-name"
                label="Hotel / Company Name"
                required
                maxLength={180}
                value={
                  customer.companyName
                }
                onChange={(value) =>
                  updateCustomer(
                    "companyName",
                    value
                  )
                }
                autoComplete="organization"
                placeholder="Hotel or company name"
              />

              <CustomerField
                id="customer-email"
                label="Email Address"
                type="email"
                required
                maxLength={254}
                value={
                  customer.email
                }
                onChange={(value) =>
                  updateCustomer(
                    "email",
                    value
                  )
                }
                autoComplete="email"
                placeholder="name@company.com"
              />

              <CustomerField
                id="customer-phone"
                label="Phone / WhatsApp Number"
                type="tel"
                maxLength={40}
                value={
                  customer.phone
                }
                onChange={(value) =>
                  updateCustomer(
                    "phone",
                    value
                  )
                }
                autoComplete="tel"
                placeholder="Include country code"
              />

              <div className="text-left">
                <label
                  htmlFor="destination"
                  className="form-label"
                >
                  Delivery Destination *
                </label>

                <select
                  id="destination"
                  name="destination"
                  required
                  value={
                    customer.destination
                  }
                  onChange={(event) =>
                    updateCustomer(
                      "destination",
                      event.target.value
                    )
                  }
                  className="form-select"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select destination
                  </option>

                  <option value="Maldives">
                    Maldives
                  </option>

                  <option value="Seychelles">
                    Seychelles
                  </option>

                  <option value="Sri Lanka">
                    Sri Lanka
                  </option>

                  <option value="Other">
                    Other / To Be Discussed
                  </option>
                </select>
              </div>

              <CustomerField
                id="delivery-date"
                label="Required Delivery Date"
                type="date"
                value={
                  customer.requiredDeliveryDate
                }
                onChange={(value) =>
                  updateCustomer(
                    "requiredDeliveryDate",
                    value
                  )
                }
              />

              {customer.destination ===
                "Other" && (
                <div className="sm:col-span-2">
                  <CustomerField
                    id="other-destination"
                    label="Specify Delivery Destination"
                    required
                    maxLength={160}
                    value={
                      customer.otherDestination
                    }
                    onChange={(value) =>
                      updateCustomer(
                        "otherDestination",
                        value
                      )
                    }
                    placeholder="Enter country or destination"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 text-left">
              <label
                htmlFor="enquiry-message"
                className="form-label"
              >
                Additional Enquiry Details
              </label>

              <textarea
                id="enquiry-message"
                name="enquiry-message"
                rows={5}
                maxLength={3000}
                value={
                  customer.message
                }
                onChange={(event) =>
                  updateCustomer(
                    "message",
                    event.target.value
                  )
                }
                placeholder="Project requirements, delivery instructions or other details..."
                className="form-textarea"
              />
            </div>

            {/* CONSENT */}

            <div className="mt-7 rounded-lg border border-[#E4D7C4] bg-white p-5">
              <label className="flex items-start gap-3 text-left text-sm leading-7 text-[#30251F]">
                <input
                  type="checkbox"
                  required
                  checked={
                    customer.consent
                  }
                  onChange={(event) =>
                    updateCustomer(
                      "consent",
                      event.target.checked
                    )
                  }
                  className="mt-1 h-5 w-5 shrink-0 accent-[#B95016]"
                />

                <span>
                  I agree that Bark Ornament
                  may process the details
                  provided to respond to
                  this quotation enquiry.

                  <span className="ml-1 text-[#B95016]">
                    *
                  </span>
                </span>
              </label>
            </div>

            {/* FINAL EMAIL REVIEW */}

            <section
              aria-labelledby="quotation-review-heading"
              className="mt-8 rounded-xl border border-[#D9C8B0] bg-white p-5 sm:p-7"
            >
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B95016]">
                  Final Review
                </p>

                <h3
                  id="quotation-review-heading"
                  className="mt-3 font-serif text-2xl text-[#30251F]"
                >
                  Review Your Quotation Email
                </h3>

                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#74675E]">
                  Check products, quantities,
                  delivery details and
                  requirements before sending.
                </p>
              </div>

              <button
                type="button"
                disabled={
                  !isLoaded ||
                  isEmpty ||
                  isVerifying
                }
                onClick={() =>
                  void handlePreviewQuotation()
                }
                className="mt-6 min-h-12 w-full rounded-md bg-[#30251F] px-6 py-3 text-sm font-bold text-white hover:bg-[#4B3930] disabled:opacity-45"
              >
                {isVerifying
                  ? "Verifying Products..."
                  : "Preview Quotation Email"}
              </button>

              {/* PRODUCT VERIFICATION ISSUES */}

              {currentVerificationIssue && (
                <div
                  role="alert"
                  className="mt-6 rounded-lg border border-[#C59A45] bg-[#FFF7E7] p-5 text-left text-sm leading-7 text-[#79511C]"
                >
                  <p className="font-semibold">
                    Product Verification Required
                  </p>

                  <p className="mt-2">
                    {
                      currentVerificationIssue.message
                    }
                  </p>

                  {currentVerificationIssue.names
                    .length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5">
                      {currentVerificationIssue.names.map(
                        (name, index) => (
                          <li key={index}>
                            {name}
                          </li>
                        )
                      )}
                    </ul>
                  )}

                  <p className="mt-3">
                    Your selected products
                    have not been automatically
                    removed from the basket.
                  </p>
                </div>
              )}

              {/* VERIFIED EMAIL PREVIEW */}

              {currentReviewDraft && (
                <div
                  role="region"
                  aria-labelledby="quotation-preview-title"
                  className="mt-7 rounded-lg border border-[#E4D7C4] bg-[#FAF7F0] p-4 sm:p-6"
                >
                  <h4
                    ref={
                      previewHeadingRef
                    }
                    tabIndex={-1}
                    id="quotation-preview-title"
                    className="scroll-mt-28 font-serif text-xl text-[#30251F]"
                  >
                    Your Email Preview
                  </h4>

                  <p className="mt-3 text-sm text-[#74675E]">
                    Preview only. No email
                    has been sent or saved.
                  </p>

                  <dl className="mt-5 space-y-3 text-sm">
                    <div>
                      <dt className="font-bold text-[#30251F]">
                        To
                      </dt>

                      <dd className="mt-1 break-words text-[#74675E]">
                        {hasApprovedRecipient
                          ? recipient
                          : "Awaiting verified company quotation email"}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-bold text-[#30251F]">
                        Subject
                      </dt>

                      <dd className="mt-1 break-words text-[#74675E]">
                        {
                          currentReviewDraft.subject
                        }
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <label
                      htmlFor="quotation-email-preview-body"
                      className="form-label"
                    >
                      Email Body
                    </label>

                    <textarea
                      id="quotation-email-preview-body"
                      readOnly
                      rows={16}
                      value={
                        currentReviewDraft.body
                      }
                      onFocus={(event) =>
                        event.currentTarget.select()
                      }
                      className="form-textarea mt-2"
                    />
                  </div>

                  <p className="mt-4 text-xs leading-6 text-[#74675E]">
                    Product details have been
                    checked against the public
                    catalogue. Review before
                    copying or opening an
                    email application. If you
                    change the form or basket,
                    generate a fresh preview.
                  </p>
                </div>
              )}
            </section>

            {/* EMAIL COMPOSE OPTIONS */}

            <div className="mt-7 rounded-lg border border-[#D9C8B0] bg-white p-5 text-center">
              <p className="mb-2 font-semibold text-[#30251F]">
                Prepare Your Quotation Email
              </p>

              <p className="text-sm leading-7 text-[#74675E]">
                Choose an email application
                to prepare your enquiry.
                The selected products will
                be verified again before
                email preparation. The email
                is not sent automatically.
                Check all details and manually
                press Send in your email app.
              </p>
            </div>

            {!hasApprovedRecipient && (
              <p
                role="note"
                className="mt-5 rounded-lg border border-[#D9C8B0] bg-[#FFF7E7] p-4 text-center text-sm leading-6 text-[#79511C]"
              >
                Email composition is awaiting
                confirmation of Bark
                Ornament&apos;s official
                quotation mailbox. You can
                still prepare and copy your
                quotation details.
              </p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                disabled={
                  !hasApprovedRecipient ||
                  !isLoaded ||
                  isEmpty ||
                  isVerifying
                }
                onClick={() =>
                  void handleCompose("gmail")
                }
                className="min-h-12 rounded-md bg-[#B95016] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#963E10] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Compose in Gmail
              </button>

              <button
                type="button"
                disabled={
                  !hasApprovedRecipient ||
                  !isLoaded ||
                  isEmpty ||
                  isVerifying
                }
                onClick={() =>
                  void handleCompose("outlook")
                }
                className="min-h-12 rounded-md bg-[#30251F] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#4B3930] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Compose in Outlook
              </button>

              <button
                type="button"
                disabled={
                  !hasApprovedRecipient ||
                  !isLoaded ||
                  isEmpty ||
                  isVerifying
                }
                onClick={() =>
                  void handleCompose("default")
                }
                className="min-h-12 rounded-md border border-[#C59A45] bg-white px-4 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#E9DDC9] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Open Default Email App
              </button>
            </div>

            <button
              type="button"
              disabled={
                !isLoaded ||
                isEmpty ||
                isVerifying
              }
              onClick={() =>
                void handleCopyQuotation()
              }
              className="mt-4 min-h-12 w-full rounded-md border border-[#C59A45] bg-[#E9DDC9] px-6 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#DFD0B6] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isVerifying
                ? "Verifying Products..."
                : "Copy Quotation Details"}
            </button>

            {/* STATUS MESSAGES */}

            {currentComposeMessage && (
              <p
                role="status"
                aria-live="polite"
                className="mt-5 rounded-lg border border-[#D9C8B0] bg-white p-4 text-center text-sm leading-7 text-[#30251F]"
              >
                {currentComposeMessage}
              </p>
            )}

            {/* MANUAL COPY FALLBACK */}

            {currentManualCopyText && (
              <div className="mt-5">
                <label
                  htmlFor="manual-quotation-copy"
                  className="form-label"
                >
                  Quotation Details — Select
                  and Copy
                </label>

                <textarea
                  id="manual-quotation-copy"
                  readOnly
                  value={
                    currentManualCopyText
                  }
                  rows={10}
                  onFocus={(event) =>
                    event.currentTarget.select()
                  }
                  className="form-textarea"
                />

                <p className="mt-2 text-sm leading-6 text-[#74675E]">
                  Copy the complete text into
                  your email, confirm the
                  approved company recipient,
                  review and manually send.
                </p>
              </div>
            )}

            <p className="mt-5 text-center text-xs leading-6 text-[#74675E]">
              Do not enter sensitive personal
              information. Your email
              application is responsible for
              sending this quotation; the
              website does not save or send it.
            </p>
          </form>
        </div>
      </section>

      {/* BOTTOM CTA */}

      <section className="bg-[#30251F] px-5 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-3xl text-[#FAF7F0]">
            Explore More Hospitality Products
          </h2>

          <p className="mx-auto mt-5 text-base leading-8 text-[#E9DDC9]">
            Continue browsing our
            hospitality product collections.
          </p>

          <Link
            href="/products"
            className="btn btn-primary mt-7"
          >
            Browse Product Catalogue →
          </Link>
        </div>
      </section>
    </>
  );
}
