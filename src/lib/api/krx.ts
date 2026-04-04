import { fetchWithTimeout } from "./client";
import type { Stock } from "@/types/stock";

let stockListCache: Stock[] | null = null;

export async function fetchStockList(): Promise<Stock[]> {
  if (stockListCache && stockListCache.length > 0) return stockListCache;

  try {
    const corpCodes = await import("@/data/corp-codes.json");
    const entries = Object.entries(corpCodes.default as Record<string, { ticker: string; corpCode: string }>);
    stockListCache = entries.map(([name, entry]) => ({
      ticker: entry.ticker,
      name,
      market: "KOSPI" as const,
    }));
    return stockListCache;
  } catch {
    return [];
  }
}

export async function searchStocks(query: string): Promise<Stock[]> {
  const stocks = await fetchStockList();
  const lowerQuery = query.toLowerCase();

  return stocks
    .filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.ticker.includes(query)
    )
    .slice(0, 20);
}
