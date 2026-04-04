import type { Stock } from "@/types/stock";

interface CorpEntry {
  ticker: string;
  corpCode: string;
  market?: string;
}

let stockListCache: Stock[] | null = null;

export async function fetchStockList(): Promise<Stock[]> {
  if (stockListCache && stockListCache.length > 0) return stockListCache;

  try {
    const corpCodes = await import("@/data/corp-codes.json");
    const entries = Object.entries(corpCodes.default as Record<string, CorpEntry>);
    stockListCache = entries.map(([name, entry]) => ({
      ticker: entry.ticker,
      name,
      market: (entry.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI") as "KOSPI" | "KOSDAQ",
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
