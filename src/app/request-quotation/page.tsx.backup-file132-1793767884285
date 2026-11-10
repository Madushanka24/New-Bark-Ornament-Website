"use client";

/* ==========================================
   BARK ORNAMENT (PVT) LTD
   FILE 128 - REQUEST A QUOTATION (EMAIL COMPOSE)
   src/app/request-quotation/page.tsx

   Customer-selected email composition only.
   - Existing quotation basket and customer form
   - Gmail, Outlook Web or default mail application
   - Copy/paste fallback for long requests
   - No website-side API submissions
   - No automatic email or database writes
   - Customer reviews and clicks Send manually

   The existing /api/quotations backend is preserved
   separately and remains disabled.
   ========================================== */

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useQuoteBasket } from "@/components/QuoteBasketProvider";
import {
  MAX_ITEM_QUANTITY,
  type QuoteBasketItem,
} from "@/lib/quote-basket";
import {
  buildQuotationEmailDraft,
  type QuotationEmailDraft,
} from "@/lib/quotation-email-draft";

/**
 * FILE 129 — VERIFIED QUOTATION RECIPIENT
 *
 * Two requirements must be satisfied:
 *
 * 1. Management has explicitly approved
 *    the quotation mailbox.
 *
 * 2. The approved address is configured
 *    through the public environment variable.
 *
 * Keep the approval lock false until
 * explicit authorization is received.
 *
 * Never place passwords, API keys or
 * private credentials in NEXT_PUBLIC variables.
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
   CUSTOMER FORM TYPES
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

type ComposeProvider = "gmail" | "outlook" | "default";

/* ==========================================
   QUANTITY CONTROL
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

  useEffect(() => {
    setDraft(String(item.quantity));
  }, [item.quantity]);

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

    onChange(item.id, value);
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label={`Decrease quantity for ${item.productName}`}
        disabled={item.quantity <= 1}
        onClick={() =>
          onChange(item.id, item.quantity - 1)
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
          onChange(item.id, item.quantity + 1)
        }
        className="flex h-11 w-11 items-center justify-center rounded-md border border-[#D9C8B0] bg-[#FAF7F0] text-xl text-[#30251F] hover:bg-[#E9DDC9] disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

/* ==========================================
   BASKET ITEM CARD

   Centered presentation from File 28.
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

  const [notes, setNotes] = useState(
    item.notes
  );

  useEffect(() => {
    setNotes(item.notes);
  }, [item.notes]);

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
            onClick={() => onRemove(item.id)}
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
          value={notes}
          rows={3}
          maxLength={2000}
          disabled={disabled}
          placeholder="Additional product requirements..."
          onChange={(event) => {
            const nextNotes = event.target.value;
            setNotes(nextNotes);
            onNotesChange(item.id, nextNotes);
          }}
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
   CUSTOMER INPUT FIELD
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
   MAIN QUOTATION PAGE - FILE 128
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
    useState<CustomerForm>({ ...INITIAL_CUSTOMER });
  const [composeMessage, setComposeMessage] = useState("");
  const [manualCopyText, setManualCopyText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const recipient = APPROVED_QUOTATION_RECIPIENT.trim();
  const hasApprovedRecipient =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient);

  function updateCustomer(
    field: keyof CustomerForm,
    value: string | boolean
  ) {
    setCustomer((previous) => ({
      ...previous,
      [field]: value,
    }));
    setComposeMessage("");
    setManualCopyText("");
  }

  function handleClearBasket() {
    if (
      window.confirm(
        "Remove all products from your quotation basket?"
      )
    ) {
      clearItems();
      setComposeMessage("");
      setManualCopyText("");
    }
  }

  /** Read existing customer fields; never submit to a server. */
  function prepareEmailDraft(): QuotationEmailDraft | null {
    const form = formRef.current;

    if (!form) {
      setComposeMessage("The customer form is unavailable.");
      return null;
    }

    if (!form.reportValidity()) {
      setComposeMessage(
        "Please complete the required customer fields."
      );
      return null;
    }

    if (!isLoaded || items.length === 0) {
      setComposeMessage(
        "Please add at least one product to your quotation basket."
      );
      return null;
    }

    const formData = new FormData(form);
    const read = (name: string): string => {
      const value = formData.get(name);
      return typeof value === "string" ? value.trim() : "";
    };

    const destination = read("destination");
    const otherDestination = read("other-destination");
    if (destination === "Other" && !otherDestination) {
      setComposeMessage("Please specify your delivery destination.");
      return null;
    }

    try {
      return buildQuotationEmailDraft(
        {
          fullName: read("customer-name"),
          companyName: read("company-name"),
          email: read("customer-email"),
          phone: read("customer-phone"),
          destination:
            destination === "Other"
              ? `Other — ${otherDestination}`
              : destination,
          requiredDeliveryDate: read("delivery-date"),
          message: read("enquiry-message"),
        },
        items
      );
    } catch (error) {
      setComposeMessage(
        error instanceof Error
          ? error.message
          : "Unable to prepare quotation details."
      );
      return null;
    }
  }

  /** Opens an email composer. The website never sends the email. */
  /* ==========================================
     FILE 130 — RELIABLE EMAIL COMPOSITION

     - Approved recipient required
     - Full quotation details retained
     - Correct mailto line-break encoding
     - Length-aware fallback
     - No automatic email sending
     - No API or database operations
     ========================================== */

  function handleCompose(
    provider: ComposeProvider
  ) {
    if (!hasApprovedRecipient) {
      setComposeMessage(
        "The company quotation email address has not yet been approved."
      );
      return;
    }

    const draft = prepareEmailDraft();

    if (!draft) {
      return;
    }

    /*
     * Preserve complete quotation details.
     * This text is available if the email
     * application cannot open or prefill
     * the message correctly.
     */
    const fullCopyText = [
      `To: ${recipient}`,
      `Subject: ${draft.subject}`,
      "",
      draft.body,
    ].join("\n");

    /*
     * Encode the destination and message.
     */
    const to = encodeURIComponent(
      recipient
    ).replace(/%40/gi, "@");

    const subject = encodeURIComponent(
      draft.subject
    );

    const webBody = encodeURIComponent(
      draft.body
    );

    /*
     * RFC 6068 specifies CRLF for line
     * breaks within mailto: body values.
     */
    const mailtoBody = encodeURIComponent(
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

    /*
     * Always retain a copyable backup.
     *
     * Email applications may ignore fields,
     * show a sign-in screen or block
     * prefilled composition on mobile.
     */
    setManualCopyText(fullCopyText);

    /*
     * URL limits vary across browsers.
     * These conservative thresholds are
     * safeguards, not universal limits.
     */
    const conservativeLimit =
      provider === "default"
        ? 1800
        : 3500;

    if (url.length > conservativeLimit) {
      setComposeMessage(
        "This quotation contains too much information for a reliable prefilled email link. The complete quotation is displayed below. Copy it into your email application, review the recipient and manually send."
      );
      return;
    }

    /*
     * Request an email composition window.
     *
     * Opening an email application does not
     * mean the message was sent, delivered
     * or saved by Bark Ornament.
     */
    try {
      if (provider === "default") {
        window.location.assign(url);
      } else {
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );
      }

      setComposeMessage(
        "We attempted to open your email application. Check the recipient, subject and complete quotation details before manually sending. If the message did not open correctly, use the full quotation text displayed below. No enquiry has been submitted through this website."
      );
    } catch {
      setComposeMessage(
        "Your browser could not open the selected email application. Copy the complete quotation details displayed below and paste them into your preferred email application."
      );
    }
  }

  /** Clipboard fallback, with selectable text when clipboard fails. */
  async function handleCopyQuotation() {
    const draft = prepareEmailDraft();
    if (!draft) return;

    const details =
      (hasApprovedRecipient ? `To: ${recipient}\n` : "") +
      `Subject: ${draft.subject}\n\n${draft.body}`;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable.");
      }
      await navigator.clipboard.writeText(details);
      setManualCopyText("");
      setComposeMessage(
        hasApprovedRecipient
          ? "Quotation details copied. Paste into an email, verify " +
              "the recipient and manually send."
          : "Quotation details copied. Confirm the official company " +
              "quotation email address before sending."
      );
    } catch {
      setManualCopyText(details);
      setComposeMessage(
        "Automatic copying was unavailable. " +
          "Select and copy the complete details below."
      );
    }
  }

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
                    onQuantityChange={
                      changeQuantity
                    }
                    onNotesChange={changeNotes}
                    onRemove={removeItem}
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
            <p className="eyebrow">Customer Information</p>
            <h2 className="font-serif text-3xl text-[#30251F] sm:text-4xl">
              Your Enquiry Details
            </h2>
            <p className="mt-5 text-base leading-8 text-[#74675E]">
              Complete your details and choose how to prepare your
              quotation email. Your selected products and requirements
              will be included automatically. Review and manually send
              the email in your chosen application.
            </p>
          </div>

          <form
            ref={formRef}
            onSubmit={(event) => event.preventDefault()}
            className="rounded-2xl border border-[#E4D7C4] bg-[#FAF7F0] p-5 sm:p-8"
          >
                <div className="grid gap-6 sm:grid-cols-2">
                  <CustomerField
                    id="customer-name"
                    label="Full Name"
                    required
                    maxLength={120}
                    value={customer.fullName}
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
                    value={customer.companyName}
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
                    value={customer.email}
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
                    value={customer.phone}
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
                      value={customer.destination}
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

                  {customer.destination === "Other" && (
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
                    value={customer.message}
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
                      checked={customer.consent}
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

                {/* FILE 128 — EMAIL COMPOSE OPTIONS */}

                <div className="mt-7 rounded-lg border border-[#D9C8B0] bg-white p-5 text-center">
                  <p className="mb-2 font-semibold text-[#30251F]">
                    Prepare Your Quotation Email
                  </p>
                  <p className="text-sm leading-7 text-[#74675E]">
                    Choose an email application to prepare your enquiry.
                    The email is not sent automatically. Check all details
                    and manually press Send in your email app.
                  </p>
                </div>

                {!hasApprovedRecipient && (
                  <p
                    role="note"
                    className="mt-5 rounded-lg border border-[#D9C8B0] bg-[#FFF7E7] p-4 text-center text-sm leading-6 text-[#79511C]"
                  >
                    Email composition is awaiting confirmation of Bark
                    Ornament&apos;s official quotation mailbox. You can
                    still prepare and copy your quotation details.
                  </p>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    disabled={!hasApprovedRecipient || !isLoaded || isEmpty}
                    onClick={() => handleCompose("gmail")}
                    className="min-h-12 rounded-md bg-[#B95016] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#963E10] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Compose in Gmail
                  </button>
                  <button
                    type="button"
                    disabled={!hasApprovedRecipient || !isLoaded || isEmpty}
                    onClick={() => handleCompose("outlook")}
                    className="min-h-12 rounded-md bg-[#30251F] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#4B3930] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Compose in Outlook
                  </button>
                  <button
                    type="button"
                    disabled={!hasApprovedRecipient || !isLoaded || isEmpty}
                    onClick={() => handleCompose("default")}
                    className="min-h-12 rounded-md border border-[#C59A45] bg-white px-4 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#E9DDC9] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Open Default Email App
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!isLoaded || isEmpty}
                  onClick={() => void handleCopyQuotation()}
                  className="mt-4 min-h-12 w-full rounded-md border border-[#C59A45] bg-[#E9DDC9] px-6 py-3 text-sm font-bold text-[#30251F] transition-colors hover:bg-[#DFD0B6] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Copy Quotation Details
                </button>

                {composeMessage && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="mt-5 rounded-lg border border-[#D9C8B0] bg-white p-4 text-center text-sm leading-7 text-[#30251F]"
                  >
                    {composeMessage}
                  </p>
                )}

                {manualCopyText && (
                  <div className="mt-5">
                    <label
                      htmlFor="manual-quotation-copy"
                      className="form-label"
                    >
                      Quotation Details — Select and Copy
                    </label>
                    <textarea
                      id="manual-quotation-copy"
                      readOnly
                      value={manualCopyText}
                      rows={10}
                      onFocus={(event) => event.currentTarget.select()}
                      className="form-textarea"
                    />
                    <p className="mt-2 text-sm leading-6 text-[#74675E]">
                      Copy the complete text into your email, confirm the
                      approved company recipient, review and manually send.
                    </p>
                  </div>
                )}

                <p className="mt-5 text-center text-xs leading-6 text-[#74675E]">
                  Do not enter sensitive personal information. Your email
                  application is responsible for sending this quotation;
                  the website does not save or send it.
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
