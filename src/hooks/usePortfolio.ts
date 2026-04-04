import { useState, useEffect, useCallback } from "react";
import type { PortfolioItem } from "@/types/portfolio";

const STORAGE_KEY = "kr-stock-portfolio";

function loadItems(): PortfolioItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveItems(items: PortfolioItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function usePortfolio() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(loadItems());
    setLoaded(true);
  }, []);

  const addItem = useCallback(
    (item: Omit<PortfolioItem, "id" | "addedAt">) => {
      const newItem: PortfolioItem = {
        ...item,
        id: `${item.ticker}-${Date.now()}`,
        addedAt: new Date().toISOString(),
      };
      setItems((prev) => {
        const next = [...prev, newItem];
        saveItems(next);
        return next;
      });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveItems(next);
      return next;
    });
  }, []);

  const sellItem = useCallback((id: string, sellQuantity: number) => {
    if (sellQuantity <= 0) return;
    setItems((prev) => {
      const next = prev.flatMap((item) => {
        if (item.id !== id) return [item];
        const remaining = item.quantity - sellQuantity;
        if (remaining <= 0) return [];
        return [{ ...item, quantity: remaining }];
      });
      saveItems(next);
      return next;
    });
  }, []);

  return { items, loaded, addItem, removeItem, sellItem };
}
