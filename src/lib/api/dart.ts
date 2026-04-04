import { DART_BASE_URL } from "@/lib/constants";
import { fetchWithTimeout } from "./client";
import type { DartResponse, DartFinancialAccount, DartCompanyInfo } from "./types";
import type { FinancialStatement, FinancialMetrics } from "@/types/financial";

const DART_API_KEY = process.env.DART_API_KEY ?? "";

interface CorpEntry {
  ticker: string;
  corpCode: string;
}

let corpCodeMap: Record<string, CorpEntry> | null = null;

async function loadCorpCodes(): Promise<Record<string, CorpEntry>> {
  if (corpCodeMap) return corpCodeMap;
  try {
    const data = await import("@/data/corp-codes.json");
    const raw = (data.default ?? data) as Record<string, CorpEntry>;
    corpCodeMap = raw;
    return corpCodeMap;
  } catch {
    corpCodeMap = {};
    return corpCodeMap;
  }
}

export async function getCorpCode(ticker: string): Promise<string | null> {
  const codes = await loadCorpCodes();
  // Search by ticker
  const entry = Object.values(codes).find((e) => e.ticker === ticker);
  if (entry) return entry.corpCode;
  // Search by name
  if (codes[ticker]) return codes[ticker].corpCode;
  return null;
}

export async function searchCorpCodes(
  query: string
): Promise<{ name: string; ticker: string; corpCode: string }[]> {
  const codes = await loadCorpCodes();
  const lowerQuery = query.toLowerCase();
  return Object.entries(codes)
    .filter(
      ([name, entry]) =>
        name.toLowerCase().includes(lowerQuery) ||
        entry.ticker.includes(query)
    )
    .slice(0, 20)
    .map(([name, entry]) => ({ name, ticker: entry.ticker, corpCode: entry.corpCode }));
}

export async function fetchCompanyInfo(
  corpCode: string
): Promise<DartCompanyInfo | null> {
  const url = `${DART_BASE_URL}/company.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}`;
  const result = await fetchWithTimeout<DartCompanyInfo>(url, {
    cacheKey: `dart-company-${corpCode}`,
    staleTTL: 86_400_000,
    timeoutMs: 5000,
  });
  return result.data;
}

export async function fetchFinancialStatements(
  corpCode: string,
  year: number
): Promise<FinancialStatement[]> {
  const reprtCodes = ["11011", "11014", "11012", "11013"];
  const reprtLabels = ["사업보고서", "3분기", "반기", "1분기"];

  // Fetch all quarters in parallel for speed
  const fetches = reprtCodes.map((code, i) => {
    const url = `${DART_BASE_URL}/fnlttSinglAcnt.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}&bsns_year=${year}&reprt_code=${code}`;
    return fetchWithTimeout<DartResponse<DartFinancialAccount>>(url, {
      cacheKey: `dart-fin-${corpCode}-${year}-${code}`,
      staleTTL: 3_600_000,
      timeoutMs: 5000,
    }).then((result) => {
      if (result.data?.status === "000" && result.data.list) {
        const accounts = result.data.list;
        const get = (name: string) => {
          const item = accounts.find(
            (a) => a.account_nm === name && a.fs_div === "CFS"
          );
          if (!item) return 0;
          return parseInt(item.thstrm_amount?.replace(/,/g, "") ?? "0", 10) || 0;
        };
        return {
          year,
          quarter: reprtLabels[i],
          revenue: get("매출액") || get("수익(매출액)"),
          operatingProfit: get("영업이익"),
          netProfit: get("당기순이익") || get("당기순이익(손실)"),
          totalAssets: get("자산총계"),
          totalLiabilities: get("부채총계"),
          totalEquity: get("자본총계"),
        } as FinancialStatement;
      }
      return null;
    });
  });

  const results = await Promise.all(fetches);
  return results.filter((r): r is FinancialStatement => r !== null);
}

export function calculateMetricsFromStatements(
  statements: FinancialStatement[]
): Partial<FinancialMetrics> {
  // Use the annual report (사업보고서) which is the first item
  const latest = statements[0];
  if (!latest) return {};

  const metrics: Partial<FinancialMetrics> = {};

  // ROE = Net Profit / Total Equity * 100
  if (latest.totalEquity > 0 && latest.netProfit !== 0) {
    metrics.roe = (latest.netProfit / latest.totalEquity) * 100;
  }

  return metrics;
}
