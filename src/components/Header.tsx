
"use client";

/* ==========================================
   BARK ORNAMENT - WEBSITE HEADER
   File: src/components/Header.tsx

   Theme: Golden Coastal Luxury

   Features:
   - Desktop navigation
   - Responsive mobile menu
   - Active navigation indicator
   - Live quotation basket counter
   - Accessible keyboard interactions
   ========================================== */

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  useQuoteBasket,
} from "@/components/QuoteBasketProvider";

/* ==========================================
   NAVIGATION ITEMS
   ========================================== */

const navigation = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Products", href: "/products" },
  {
    label: "Solutions",
    href: "/hospitality-solutions",
  },
  { label: "Markets", href: "/markets" },
  { label: "Gallery", href: "/gallery" },
  { label: "Insights", href: "/insights" },
  { label: "Contact", href: "/contact" },
];

/* ==========================================
   BASKET ICON
   ========================================== */

function BasketIcon() {
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 11 3-7" />
      <path d="m19 11-3-7" />
      <path d="M3 11h18l-2 10H5L3 11Z" />
      <path d="M9 15v3" />
      <path d="M15 15v3" />
    </svg>
  );
}

/* ==========================================
   QUOTATION BASKET LINK
   ========================================== */

function QuoteBasketLink({
  itemCount,
  isLoaded,
}: {
  itemCount: number;
  isLoaded: boolean;
}) {
  const count = isLoaded ? itemCount : 0;

  return (
    <Link
      href="/request-quotation"
      aria-label={`Quotation basket: ${count} product selections`}
      title="View quotation basket"
      className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#D9C8B0] bg-white text-[#30251F] transition-colors duration-200 hover:border-[#C59A45] hover:bg-[#E9DDC9]"
    >
      <BasketIcon />

      {isLoaded && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-2 -top-2 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#B95016] px-1 text-[11px] font-bold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

/* ==========================================
   MAIN HEADER COMPONENT
   ========================================== */

export default function Header() {
  const pathname = usePathname();

  const {
    itemCount,
    totalQuantity,
    isLoaded,
  } = useQuoteBasket();

  const [menuOpen, setMenuOpen] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  /* ========================================
     IDENTIFY ACTIVE NAVIGATION
     ======================================== */

  function isActive(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href ||
          pathname.startsWith(href + "/");
  }

  /* ========================================
     CLOSE MOBILE MENU
     ======================================== */

  function closeMenu() {
    setMenuOpen(false);
  }

  /* ========================================
     FOCUS FIRST LINK WHEN MENU OPENS
     ======================================== */

  useEffect(() => {
    if (menuOpen) {
      firstLinkRef.current?.focus();
    }
  }, [menuOpen]);

  /* ========================================
     CLOSE MENU ON OUTSIDE POINTER CLICK
     AND WHEN RESIZING TO DESKTOP
     ======================================== */

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        !mobileNavRef.current?.contains(target) &&
        !menuButtonRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    }

    const desktopQuery = window.matchMedia(
      "(min-width: 1280px)"
    );

    function onDesktopChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      onPointerDown
    );

    desktopQuery.addEventListener(
      "change",
      onDesktopChange
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        onPointerDown
      );

      desktopQuery.removeEventListener(
        "change",
        onDesktopChange
      );
    };
  }, [menuOpen]);

  /* ========================================
     KEYBOARD SUPPORT
     ======================================== */

  function handleKeyDown(
    event: KeyboardEvent<HTMLElement>
  ) {
    if (event.key === "Escape" && menuOpen) {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  }

  return (
    <header
      onKeyDown={handleKeyDown}
      className="sticky top-0 z-50 w-full border-b border-[#E9DDC9] bg-[#FAF7F0]/95 shadow-[0_4px_20px_rgba(48,37,31,0.06)] backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-[88px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 2xl:px-12">

        {/* COMPANY BRAND */}

        <Link
          href="/"
          onClick={closeMenu}
          aria-label="Bark Ornament - Home"
          className="flex min-w-0 shrink-0 flex-col justify-center"
        >
          <span className="font-serif text-[20px] font-semibold leading-tight tracking-[0.01em] text-[#30251F] sm:text-[25px]">
            BARK{" "}
            <span className="text-[#B95016]">
              ORNAMENT
            </span>
          </span>

          <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-[#806C59] sm:text-[10px]">
            Hospitality Products
          </span>
        </Link>

        {/* DESKTOP NAVIGATION */}

        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-3 xl:flex 2xl:gap-5"
        >
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  active ? "page" : undefined
                }
                className={`relative whitespace-nowrap py-3 text-[13px] font-semibold transition-colors duration-200 2xl:text-[14px] ${
                  active
                    ? "text-[#B95016]"
                    : "text-[#30251F] hover:text-[#B95016]"
                }`}
              >
                {item.label}

                <span
                  aria-hidden="true"
                  className={`absolute bottom-1 left-0 h-[2px] bg-[#C59A45] transition-all duration-200 ${
                    active ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* RIGHT SIDE ACTIONS */}

        <div className="flex shrink-0 items-center gap-3">

          {/* LIVE BASKET COUNTER */}

          <QuoteBasketLink
            itemCount={itemCount}
            isLoaded={isLoaded}
          />

          {/* DESKTOP REQUEST QUOTE BUTTON */}

          <Link
            href="/request-quotation"
            className="hidden min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-[#B95016] px-4 py-3 text-[13px] font-semibold text-white transition-colors duration-200 hover:bg-[#963E10] 2xl:inline-flex 2xl:text-[14px]"
          >
            Request Quote
            <span aria-hidden="true">↗</span>
          </Link>

          {/* MOBILE MENU BUTTON */}

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() =>
              setMenuOpen((previous) => !previous)
            }
            aria-label={
              menuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="flex h-12 w-12 items-center justify-center rounded-md border border-[#D9C8B0] bg-white text-[#30251F] transition-colors hover:bg-[#E9DDC9] xl:hidden"
          >
            {menuOpen ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="M6 6 18 18" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE / TABLET NAVIGATION */}

      <nav
        ref={mobileNavRef}
        id="mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!menuOpen}
        className={`absolute left-0 right-0 top-full max-h-[calc(100dvh-88px)] overflow-y-auto border-t border-[#E9DDC9] bg-[#FAF7F0] shadow-xl xl:hidden ${
          menuOpen ? "block" : "hidden"
        }`}
      >
        <div className="mx-auto flex max-w-[1500px] flex-col gap-1 px-5 py-5 md:px-8">
          {navigation.map((item, index) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                ref={
                  index === 0
                    ? firstLinkRef
                    : undefined
                }
                href={item.href}
                onClick={closeMenu}
                aria-current={
                  active ? "page" : undefined
                }
                className={`rounded-md px-4 py-3 text-[15px] font-semibold transition-colors ${
                  active
                    ? "bg-[#E9DDC9] text-[#963E10]"
                    : "text-[#30251F] hover:bg-[#E9DDC9]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {/* MOBILE BASKET SUMMARY */}

          <div className="mt-4 rounded-lg border border-[#D9C8B0] bg-white p-4 text-center">
            <p className="mb-2 text-sm font-bold text-[#30251F]">
              Your Quotation Basket
            </p>

            <p
              aria-live="polite"
              className="mb-3 text-sm text-[#74675E]"
            >
              {isLoaded
                ? `${itemCount} product selections · ${totalQuantity} units`
                : "Loading basket..."}
            </p>

            <Link
              href="/request-quotation"
              onClick={closeMenu}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#B95016] px-5 py-3 text-sm font-bold text-white hover:bg-[#963E10]"
            >
              View Quote Basket →
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
