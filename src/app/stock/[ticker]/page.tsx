import { Suspense } from "react";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { CompanyHeader } from "@/components/stock/CompanyHeader";
import { MetricsCard } from "@/components/stock/MetricsCard";
import { FinancialTable } from "@/components/stock/FinancialTable";
import { NewsList } from "@/components/stock/NewsList";
import { CardSkeleton, ChartSkeleton, NewsListSkeleton } from "@/components/ui/Skeleton";
import { fetchStockSummary } from "@/lib/api/naver";
import type { StockSummary } from "@/types/stock";
import type { FinancialMetrics, FinancialStatement } from "@/types/financial";
import type { NewsItem } from "@/types/news";

const StockChart = dynamic(
  () =>
    import("@/components/stock/StockChart").then((m) => ({ default: m.StockChart })),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

interface PageProps {
  params: Promise<{ ticker: string }>;
}

// ---------------------------------------------------------------------------
// Server-side data helpers — call internal API routes so caching applies
// ---------------------------------------------------------------------------
async function getBaseUrl(): Promise<string> {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

async function fetchMetrics(
  ticker: string,
  baseUrl: string
): Promise<{ data: FinancialMetrics | null; stale: boolean; cachedAt?: number }> {
  try {
    const res = await fetch(`${baseUrl}/api/stock/${ticker}/metrics`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { data: null, stale: false };
    const json = await res.json();
    return { data: json.data ?? null, stale: json.stale ?? false, cachedAt: json.cachedAt };
  } catch {
    return { data: null, stale: false };
  }
}

async function fetchFinancials(
  ticker: string,
  baseUrl: string
): Promise<{ data: FinancialStatement[]; stale: boolean }> {
  try {
    const res = await fetch(`${baseUrl}/api/stock/${ticker}/financials`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { data: [], stale: false };
    const json = await res.json();
    return { data: json.data ?? [], stale: json.stale ?? false };
  } catch {
    return { data: [], stale: false };
  }
}

async function fetchNews(
  ticker: string,
  baseUrl: string
): Promise<{ data: NewsItem[]; stale: boolean; cachedAt?: number }> {
  try {
    const res = await fetch(`${baseUrl}/api/stock/${ticker}/news`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return { data: [], stale: false };
    const json = await res.json();
    return { data: json.data ?? [], stale: json.stale ?? false, cachedAt: json.cachedAt };
  } catch {
    return { data: [], stale: false };
  }
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { ticker } = await params;
  const summary = await fetchStockSummary(ticker);
  const name = summary?.name ?? ticker;

  return {
    title: `${name} (${ticker}) - 주식리서치`,
    description: `${name} 주가, 재무제표, 뉴스를 한눈에 확인하세요.`,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function StockPage({ params }: PageProps) {
  const { ticker } = await params;
  const baseUrl = await getBaseUrl();

  // Fetch all data in parallel; use allSettled so one failure doesn't block others
  const [summaryResult, metricsResult, financialsResult, newsResult] =
    await Promise.allSettled([
      fetchStockSummary(ticker),
      fetchMetrics(ticker, baseUrl),
      fetchFinancials(ticker, baseUrl),
      fetchNews(ticker, baseUrl),
    ]);

  const summary: StockSummary | null =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;

  const metricsPayload =
    metricsResult.status === "fulfilled"
      ? metricsResult.value
      : { data: null, stale: false, cachedAt: undefined };

  const financialsPayload =
    financialsResult.status === "fulfilled"
      ? financialsResult.value
      : { data: [], stale: false };

  const newsPayload =
    newsResult.status === "fulfilled"
      ? newsResult.value
      : { data: [], stale: false, cachedAt: undefined };

  return (
    <div className="space-y-6">
      {/* Company Header */}
      <CompanyHeader ticker={ticker} summary={summary} />

      {/* Chart + Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <StockChart ticker={ticker} />
          </Suspense>
        </div>

        <div>
          <Suspense fallback={<CardSkeleton />}>
            <MetricsCard
              metrics={metricsPayload.data}
              stale={metricsPayload.stale}
              cachedAt={metricsPayload.cachedAt}
            />
          </Suspense>
        </div>
      </div>

      {/* Financial statements */}
      <Suspense fallback={<CardSkeleton />}>
        <FinancialTable statements={financialsPayload.data} />
      </Suspense>

      {/* News */}
      <Suspense fallback={<NewsListSkeleton />}>
        <NewsList
          news={newsPayload.data}
          stale={newsPayload.stale}
          cachedAt={newsPayload.cachedAt}
        />
      </Suspense>
    </div>
  );
}
