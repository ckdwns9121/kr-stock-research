import { getCorpCode, fetchFinancialStatements } from "./dart";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "src/data/financial-score-cache.json");
const FILE_TTL = 24 * 60 * 60 * 1000; // 24시간
const BATCH_DELAY = 150; // ms (DART rate limit 고려)

export interface FinancialScore {
  ticker: string;
  revenueGrowth: number | null; // YoY %
  opProfitGrowth: number | null; // YoY %
  opMargin: number | null; // 영업이익률 %
  debtRatio: number | null; // 부채비율 %
  roe: number | null; // %
  fetchedAt: number;
}

interface CacheData {
  entries: Record<string, FinancialScore>;
  timestamp: number;
}

let memoryCache: CacheData | null = null;

async function readFileCache(): Promise<CacheData | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as CacheData;
    if (Date.now() - parsed.timestamp < FILE_TTL) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function writeFileCache(data: CacheData): Promise<void> {
  try {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(data));
  } catch { /* ignore */ }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOneStock(ticker: string): Promise<FinancialScore | null> {
  const corpCode = await getCorpCode(ticker);
  if (!corpCode) return null;

  const thisYear = new Date().getFullYear();

  const [statementsThis, statementsLast] = await Promise.all([
    fetchFinancialStatements(corpCode, thisYear - 1).catch(() => []),
    fetchFinancialStatements(corpCode, thisYear - 2).catch(() => []),
  ]);

  const annualThis = statementsThis.find((s) => s.quarter === "사업보고서");
  const annualLast = statementsLast.find((s) => s.quarter === "사업보고서");

  // 올해 사업보고서 없으면 최신 분기 사용
  const latest = annualThis ?? statementsThis[0] ?? null;
  const previous = annualLast ?? statementsLast[0] ?? null;

  if (!latest) return null;

  let revenueGrowth: number | null = null;
  let opProfitGrowth: number | null = null;

  if (previous && previous.revenue > 0 && latest.revenue > 0) {
    revenueGrowth = ((latest.revenue - previous.revenue) / Math.abs(previous.revenue)) * 100;
  }
  if (previous && previous.operatingProfit !== 0 && latest.operatingProfit !== 0) {
    opProfitGrowth = ((latest.operatingProfit - previous.operatingProfit) / Math.abs(previous.operatingProfit)) * 100;
  }

  const opMargin = latest.revenue > 0
    ? (latest.operatingProfit / latest.revenue) * 100
    : null;

  const debtRatio = latest.totalAssets > 0
    ? (latest.totalLiabilities / latest.totalAssets) * 100
    : null;

  const equity = latest.totalAssets - latest.totalLiabilities;
  const roe = equity > 0
    ? (latest.netProfit / equity) * 100
    : null;

  return {
    ticker,
    revenueGrowth,
    opProfitGrowth,
    opMargin,
    debtRatio,
    roe,
    fetchedAt: Date.now(),
  };
}

// 단일 종목 캐시 조회
export async function getFinancialCache(ticker: string): Promise<FinancialScore | null> {
  if (!memoryCache) {
    const fileCache = await readFileCache();
    if (fileCache) memoryCache = fileCache;
  }
  return memoryCache?.entries[ticker] ?? null;
}

// 상위 종목 배치 enrichment
export async function enrichTopStocks(tickers: string[]): Promise<Record<string, FinancialScore>> {
  if (!process.env.DART_API_KEY) return {};

  // 기존 캐시 로드
  if (!memoryCache) {
    const fileCache = await readFileCache();
    memoryCache = fileCache ?? { entries: {}, timestamp: Date.now() };
  }

  const needFetch: string[] = [];
  for (const ticker of tickers) {
    const cached = memoryCache.entries[ticker];
    // 캐시에 없거나 24시간 지난 경우
    if (!cached || Date.now() - cached.fetchedAt > FILE_TTL) {
      needFetch.push(ticker);
    }
  }

  // 새로 수집 필요한 종목만 배치 처리
  for (const ticker of needFetch) {
    try {
      const score = await fetchOneStock(ticker);
      if (score) {
        memoryCache.entries[ticker] = score;
      }
    } catch { /* 개별 실패 무시 */ }
    await sleep(BATCH_DELAY);
  }

  // 캐시 저장
  if (needFetch.length > 0) {
    memoryCache.timestamp = Date.now();
    writeFileCache(memoryCache).catch(() => {});
  }

  // 요청된 종목의 결과만 반환
  const result: Record<string, FinancialScore> = {};
  for (const ticker of tickers) {
    if (memoryCache.entries[ticker]) {
      result[ticker] = memoryCache.entries[ticker];
    }
  }
  return result;
}
