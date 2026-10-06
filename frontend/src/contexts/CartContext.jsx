import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

/**
 * Kafou Shop cart for the website. Persisted to localStorage so it
 * survives a page refresh. There's no payment system yet, so checkout
 * doesn't end in a payment form — it submits a real multi-item order
 * through the existing /kafou-shop/orders endpoint (which already
 * supports an `items` array), and the confirmation step shows the
 * store's own contact info so the customer can follow up directly,
 * in place of a payment step that doesn't exist.
 */
const STORAGE_KEY = "dl_kafou_cart_v1";
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* corrupted/unavailable storage — start with an empty cart rather than crash */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return; // avoid overwriting storage with [] before the initial read finishes
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full/unavailable — cart still works for this session, just won't persist */
    }
  }, [items, loaded]);

  const addItem = useCallback((item, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totalCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, totalCount, subtotal, addItem, removeItem, setQuantity, clear }),
    [items, totalCount, subtotal, addItem, removeItem, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
