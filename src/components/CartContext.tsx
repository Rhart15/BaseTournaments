"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type CartItem = {
  // A stable key for removal -- tournamentId+divisionId+teamName, since a
  // coach could register more than one team for the same tournament.
  key: string;
  tournamentId: string;
  divisionId: string;
  tournamentName: string;
  divisionLabel: string;
  teamName: string;
  entryFeeCents: number;
  salesTaxOverridePercent: number | null;
  disableProcessingFee: boolean;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "base-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Reads localStorage once on mount. This has to run in an effect (not a
  // lazy useState initializer) so server-rendered HTML always starts from
  // an empty cart and matches the client's first render -- avoiding a
  // hydration mismatch -- then fills in from storage right after mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above the effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Corrupt or inaccessible storage -- just start with an empty cart.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return; // don't overwrite storage with [] before the initial load runs
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  function addItem(item: CartItem) {
    setItems((prev) =>
      prev.some((i) => i.key === item.key) ? prev : [...prev, item]
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function clear() {
    setItems([]);
  }

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
