import YahooFinance from "yahoo-finance2";
import type { USIndex, MacroIndicators, SectorData } from "@/types/global-market";

const yf = new YahooFinance();

const INDICES = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "^DJI", name: "Dow Jones" },
];

const MACRO_SYMBOLS = [
  { symbol: "^VIX", key: "vix" as const },
  { symbol: "^TNX", key: "tenYearYield" as const },
  { symbol: "DX-Y.NYB", key: "dxy" as const },
];

const SECTOR_ETFS = [
  { symbol: "XLK", name: "기술" },
  { symbol: "XLE", name: "에너지" },
  { symbol: "XLF", name: "금융" },
  { symbol: "XLV", name: "헬스케어" },
  { symbol: "XLY", name: "임의소비재" },
  { symbol: "XLP", name: "필수소비재" },
  { symbol: "XLI", name: "산업재" },
  { symbol: "XLB", name: "소재" },
  { symbol: "XLU", name: "유틸리티" },
  { symbol: "XLRE", name: "부동산" },
];

async function getQuote(symbol: string) {
  try {
    const q = await yf.quote(symbol);
    if (q.regularMarketPrice == null || q.regularMarketChange == null || q.regularMarketChangePercent == null) {
      return null;
    }
    return {
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
    };
  } catch {
    return null;
  }
}

export async function fetchUSIndices(): Promise<USIndex[]> {
  const results = await Promise.allSettled(
    INDICES.map(async ({ symbol, name }) => {
      const quote = await getQuote(symbol);
      if (!quote) return null;
      return { symbol, name, ...quote } satisfies USIndex;
    })
  );

  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((v): v is USIndex => v !== null);
}

export async function fetchMacroIndicators(): Promise<MacroIndicators | null> {
  const results = await Promise.allSettled(
    MACRO_SYMBOLS.map(async ({ symbol, key }) => ({ key, quote: await getQuote(symbol) }))
  );

  const values: Partial<MacroIndicators> = {};
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.quote) {
      values[result.value.key] = result.value.quote.price;
    }
  }

  if (values.vix == null || values.tenYearYield == null || values.dxy == null) {
    return null;
  }

  return {
    vix: values.vix,
    tenYearYield: values.tenYearYield,
    dxy: values.dxy,
  };
}

export async function fetchUSSectors(): Promise<SectorData[]> {
  const results = await Promise.allSettled(
    SECTOR_ETFS.map(async ({ symbol, name }) => {
      const quote = await getQuote(symbol);
      if (!quote) return null;
      return { symbol, name, changePercent: quote.changePercent } satisfies SectorData;
    })
  );

  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((v): v is SectorData => v !== null);
}
