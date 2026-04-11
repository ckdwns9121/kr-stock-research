import YahooFinance from "yahoo-finance2";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface MarketStockData {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  price: number;
  changePercent: number;
  marketCap: number | null;
  per: number | null;
  pbr: number | null;
  volume: number;
  high52w: number | null;
  low52w: number | null;
}

interface CorpEntry {
  ticker: string;
  corpCode: string;
  market?: string;
}

const CACHE_FILE = path.join(process.cwd(), "src/data/market-cache.json");
const MEMORY_TTL = 60 * 60 * 1000; // 1시간
const FILE_TTL = 24 * 60 * 60 * 1000; // 24시간
const BATCH_SIZE = 30;
const BATCH_DELAY = 500; // ms

let memoryCache: { data: MarketStockData[]; timestamp: number } | null = null;
let fetchInProgress = false;

function toYahooSymbol(ticker: string, market: string): string {
  return market === "KOSDAQ" ? `${ticker}.KQ` : `${ticker}.KS`;
}

async function loadCorpCodes(): Promise<Array<{ name: string; ticker: string; market: "KOSPI" | "KOSDAQ" }>> {
  const corpCodes = await import("@/data/corp-codes.json");
  const entries = Object.entries(corpCodes.default as Record<string, CorpEntry>);
  return entries.map(([name, entry]) => ({
    name,
    ticker: entry.ticker,
    market: (entry.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI") as "KOSPI" | "KOSDAQ",
  }));
}

async function readFileCache(): Promise<{ data: MarketStockData[]; timestamp: number } | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as { data: MarketStockData[]; timestamp: number };
    if (Date.now() - parsed.timestamp < FILE_TTL) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeFileCache(data: MarketStockData[]): Promise<void> {
  try {
    const dir = path.dirname(CACHE_FILE);
    await mkdir(dir, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // 파일 쓰기 실패 무시
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBatch(
  stocks: Array<{ name: string; ticker: string; market: "KOSPI" | "KOSDAQ" }>
): Promise<MarketStockData[]> {
  const results: MarketStockData[] = [];

  for (const stock of stocks) {
    const symbol = toYahooSymbol(stock.ticker, stock.market);
    try {
      const quote = await yf.quote(symbol);
      const price = quote.regularMarketPrice;
      if (price == null || price <= 0) continue;

      results.push({
        ticker: stock.ticker,
        name: stock.name,
        market: stock.market,
        price,
        changePercent: quote.regularMarketChangePercent ?? 0,
        marketCap: quote.marketCap ?? null,
        per: quote.trailingPE ?? null,
        pbr: quote.priceToBook ?? null,
        volume: quote.regularMarketVolume ?? 0,
        high52w: quote.fiftyTwoWeekHigh ?? null,
        low52w: quote.fiftyTwoWeekLow ?? null,
      });
    } catch {
      // 개별 종목 실패 무시
    }
  }

  return results;
}

async function collectAll(): Promise<MarketStockData[]> {
  const allStocks = await loadCorpCodes();
  const results: MarketStockData[] = [];

  for (let i = 0; i < allStocks.length; i += BATCH_SIZE) {
    const batch = allStocks.slice(i, i + BATCH_SIZE);
    const batchResults = await fetchBatch(batch);
    results.push(...batchResults);

    if (i + BATCH_SIZE < allStocks.length) {
      await sleep(BATCH_DELAY);
    }
  }

  return results.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
}

export async function getMarketData(): Promise<MarketStockData[]> {
  // 1. 메모리 캐시
  if (memoryCache && Date.now() - memoryCache.timestamp < MEMORY_TTL) {
    return memoryCache.data;
  }

  // 2. 파일 캐시
  const fileCache = await readFileCache();
  if (fileCache) {
    memoryCache = fileCache;
    return fileCache.data;
  }

  // 3. 수집 중이면 빈 배열 반환 (중복 수집 방지)
  if (fetchInProgress) {
    return memoryCache?.data ?? [];
  }

  // 4. 신규 수집
  fetchInProgress = true;
  try {
    const data = await collectAll();
    memoryCache = { data, timestamp: Date.now() };
    await writeFileCache(data);
    return data;
  } finally {
    fetchInProgress = false;
  }
}

// 상위 N개만 빠르게 가져오기 (시총 기준 주요 종목)
export async function getTopMarketData(limit: number = 200): Promise<MarketStockData[]> {
  // 캐시 있으면 바로 반환
  if (memoryCache && Date.now() - memoryCache.timestamp < MEMORY_TTL) {
    return memoryCache.data.slice(0, limit);
  }

  const fileCache = await readFileCache();
  if (fileCache) {
    memoryCache = fileCache;
    return fileCache.data.slice(0, limit);
  }

  // 캐시 없으면 주요 종목만 빠르게 수집
  const allStocks = await loadCorpCodes();
  // 시총 큰 종목이 앞에 오도록 corp-codes 기준 상위 종목 우선
  const subset = allStocks.slice(0, Math.min(limit * 2, allStocks.length));

  const results: MarketStockData[] = [];
  for (let i = 0; i < subset.length; i += BATCH_SIZE) {
    const batch = subset.slice(i, i + BATCH_SIZE);
    const batchResults = await fetchBatch(batch);
    results.push(...batchResults);
    if (i + BATCH_SIZE < subset.length) {
      await sleep(BATCH_DELAY);
    }
  }

  const sorted = results.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));

  // 백그라운드에서 전체 수집 시작 (다음 요청부터 전체 데이터 사용)
  if (!fetchInProgress) {
    fetchInProgress = true;
    collectAll()
      .then((data) => {
        memoryCache = { data, timestamp: Date.now() };
        return writeFileCache(data);
      })
      .catch(() => {})
      .finally(() => { fetchInProgress = false; });
  }

  return sorted.slice(0, limit);
}
