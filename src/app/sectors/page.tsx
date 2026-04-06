import type { Metadata } from "next";
import { SECTORS } from "@/lib/sectors";
import { fetchStockSummary, fetchNaverMetrics } from "@/lib/api/naver";
import { SectorGrid } from "@/components/sector/SectorGrid";
import type { StockSummary } from "@/types/stock";
import type { FinancialMetrics } from "@/types/financial";

export const metadata: Metadata = {
  title: "섹터 차트 - 주식리서치",
  description: "반도체, 우주·방산, 바이오 섹터 주요 종목 차트를 한눈에 확인하세요.",
};

export const revalidate = 300;

export default async function SectorsPage() {
  const allTickers = SECTORS.flatMap((s) => s.stocks.map((st) => st.ticker));

  const [priceResults, metricsResults] = await Promise.all([
    Promise.allSettled(allTickers.map((t) => fetchStockSummary(t))),
    Promise.allSettled(allTickers.map((t) => fetchNaverMetrics(t))),
  ]);

  const priceData: Record<string, StockSummary> = {};
  priceResults.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      priceData[allTickers[i]] = r.value;
    }
  });

  const metricsData: Record<string, Partial<FinancialMetrics>> = {};
  metricsResults.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      metricsData[allTickers[i]] = r.value;
    }
  });

  return (
    <div className="space-y-6">
      <section className="pt-4">
        <h1 className="text-2xl font-bold text-dark-text-primary">섹터 차트</h1>
        <p className="text-sm text-dark-text-secondary mt-1">
          섹터별 주요 종목의 차트와 지표를 확인하세요
        </p>
      </section>

      <SectorGrid sectors={SECTORS} priceData={priceData} metricsData={metricsData} />
    </div>
  );
}
