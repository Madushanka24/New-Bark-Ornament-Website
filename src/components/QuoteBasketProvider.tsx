
"use client";

/* ==========================================
   BARK ORNAMENT - QUOTE BASKET PROVIDER

   File:
   src/components/QuoteBasketProvider.tsx

   Shared React basket state and browser storage.
   Theme: Golden Coastal Luxury

   No prices, checkout or server submission.
   ========================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "@/lib/products";

import {
  QUOTE_BASKET_EVENT,
  QUOTE_STORAGE_KEY,
  addProductToBasket,
  clearBasket,
  createEmptyBasket,
  getBasketItemCount,
  getBasketTotalQuantity,
  loadQuoteBasket,
  removeBasketItem,
  saveQuoteBasket,
  updateBasketNotes,
  updateBasketQuantity,
  type QuoteBasket,
  type QuoteBasketItem,
  type QuoteProductOptions,
} from "@/lib/quote-basket";

/* ==========================================
   CONTEXT TYPE
   ========================================== */

export type QuoteBasketContextValue = {
  basket: QuoteBasket;

  items: QuoteBasketItem[];

  itemCount: number;

  totalQuantity: number;

  isEmpty: boolean;

  isLoaded: boolean;

  addItem: (
    product: Product,
    quantity?: number,
    options?: QuoteProductOptions,
    notes?: string
  ) => void;

  removeItem: (itemId: string) => void;

  changeQuantity: (
    itemId: string,
    quantity: number
  ) => void;

  changeNotes: (
    itemId: string,
    notes: string
  ) => void;

  clearItems: () => void;
};

/* ==========================================
   CREATE REACT CONTEXT
   ========================================== */

const QuoteBasketContext =
  createContext<QuoteBasketContextValue | null>(
    null
  );

/* ==========================================
   PROVIDER COMPONENT
   ========================================== */

export function QuoteBasketProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Use an empty basket for initial server/client
  // rendering so hydration stays consistent.

  const [basket, setBasket] =
    useState<QuoteBasket>(createEmptyBasket);

  const [isLoaded, setIsLoaded] = useState(false);

  // A ref provides immediate access to the latest
  // basket in event handlers and callbacks.

  const basketRef = useRef<QuoteBasket>(
    createEmptyBasket()
  );

  const loadedRef = useRef(false);

  /* ========================================
     INITIALIZE AND SYNCHRONIZE STORAGE
     ======================================== */

  useEffect(() => {
    function syncFromStorage() {
      const savedBasket = loadQuoteBasket();

      basketRef.current = savedBasket;
      setBasket(savedBasket);
    }

    syncFromStorage();

    loadedRef.current = true;
    setIsLoaded(true);

    // This event is emitted by File 11 whenever
    // a basket is saved in the current tab.

    function onBasketUpdated() {
      syncFromStorage();
    }

    // Synchronize updates from other browser tabs.

    function onStorageChange(
      event: StorageEvent
    ) {
      if (
        event.key === QUOTE_STORAGE_KEY ||
        event.key === null
      ) {
        syncFromStorage();
      }
    }

    window.addEventListener(
      QUOTE_BASKET_EVENT,
      onBasketUpdated
    );

    window.addEventListener(
      "storage",
      onStorageChange
    );

    return () => {
      window.removeEventListener(
        QUOTE_BASKET_EVENT,
        onBasketUpdated
      );

      window.removeEventListener(
        "storage",
        onStorageChange
      );
    };
  }, []);

  /* ========================================
     COMMIT A BASKET CHANGE
     ======================================== */

  const commit = useCallback(
    (
      update: (current: QuoteBasket) => QuoteBasket
    ) => {
      // Do not overwrite browser storage before
      // the first basket restoration is finished.

      if (!loadedRef.current) {
        return;
      }

      const updated = update(basketRef.current);

      basketRef.current = updated;
      setBasket(updated);

      // Persistence is handled by the existing
      // File 11 basket utility.

      saveQuoteBasket(updated);
    },
    []
  );

  /* ========================================
     ADD PRODUCT
     ======================================== */

  const addItem = useCallback(
    (
      product: Product,
      quantity = 1,
      options: QuoteProductOptions = {},
      notes = ""
    ) => {
      commit((current) =>
        addProductToBasket(
          current,
          product,
          quantity,
          options,
          notes
        )
      );
    },
    [commit]
  );

  /* ========================================
     REMOVE PRODUCT
     ======================================== */

  const removeItem = useCallback(
    (itemId: string) => {
      commit((current) =>
        removeBasketItem(current, itemId)
      );
    },
    [commit]
  );

  /* ========================================
     CHANGE QUANTITY
     ======================================== */

  const changeQuantity = useCallback(
    (itemId: string, quantity: number) => {
      commit((current) =>
        updateBasketQuantity(
          current,
          itemId,
          quantity
        )
      );
    },
    [commit]
  );

  /* ========================================
     CHANGE NOTES
     ======================================== */

  const changeNotes = useCallback(
    (itemId: string, notes: string) => {
      commit((current) =>
        updateBasketNotes(
          current,
          itemId,
          notes
        )
      );
    },
    [commit]
  );

  /* ========================================
     CLEAR BASKET
     ======================================== */

  const clearItems = useCallback(() => {
    commit(() => clearBasket());
  }, [commit]);

  /* ========================================
     PREPARE SHARED CONTEXT VALUE
     ======================================== */

  const value = useMemo<QuoteBasketContextValue>(
    () => ({
      basket,

      items: basket.items,

      itemCount: getBasketItemCount(basket),

      totalQuantity:
        getBasketTotalQuantity(basket),

      isEmpty: basket.items.length === 0,

      isLoaded,

      addItem,
      removeItem,
      changeQuantity,
      changeNotes,
      clearItems,
    }),
    [
      basket,
      isLoaded,
      addItem,
      removeItem,
      changeQuantity,
      changeNotes,
      clearItems,
    ]
  );

  return (
    <QuoteBasketContext.Provider value={value}>
      {children}
    </QuoteBasketContext.Provider>
  );
}

/* ==========================================
   CUSTOM HOOK

   Usage from another client component:

   const { items, addItem } = useQuoteBasket();
   ========================================== */

export function useQuoteBasket() {
  const context = useContext(QuoteBasketContext);

  if (!context) {
    throw new Error(
      "useQuoteBasket must be used inside " +
        "a QuoteBasketProvider."
    );
  }

  return context;
}
