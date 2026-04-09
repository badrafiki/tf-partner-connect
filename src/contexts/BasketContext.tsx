import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface BasketItem {
  product_id: string;
  sku: string;
  name: string;
  category: string | null;
  list_price_usd: number;
  quantity: number;
}

interface BasketContextType {
  items: BasketItem[];
  addItem: (item: Omit<BasketItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearBasket: () => void;
  itemCount: number;
}

const STORAGE_KEY = "tf-usa-basket";

const BasketContext = createContext<BasketContextType | undefined>(undefined);

function loadBasket(): BasketItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function BasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>(loadBasket);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<BasketItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === item.product_id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === item.product_id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearBasket = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <BasketContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearBasket, itemCount }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used within BasketProvider");
  return ctx;
}
