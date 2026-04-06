"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Sector } from "@/lib/sectors";
import type { StockSummary } from "@/types/stock";
import type { FinancialMetrics } from "@/types/financial";
import { formatPrice, formatPercent, formatRatio } from "@/lib/format";
import { getChangeColor } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

const MiniChart = dynamic(
  () => import("@/components/stock/MiniChart").then((m) => ({ default: m.MiniChart })),
  { ssr: false, loading: () => <div className="w-full h-[60px] bg-dark-elevated rounded-lg animate-pulse" /> }
);

type ViewMode = "chart" | "compare";

interface SectorGridProps {
  sectors: Sector[];
  priceData: Record<string, StockSummary>;
  metricsData?: Record<string, Partial<FinancialMetrics>>;
}

export function SectorGrid({ sectors, priceData, metricsData = {} }: SectorGridProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const activeSector = sectors[activeIdx];

  return (
    <div>
      <div className="space-y-3 mb-5">
        <div className="flex overflow-x-auto gap-2 pb-2" style={{ scrollbarWidth: "none" }}>
          {sectors.map((sector, i) => (
            <button
              key={sector.id}
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                i === activeIdx
                  ? "bg-toss-blue text-white"
                  : "bg-dark-elevated text-dark-text-secondary hover:text-dark-text-primary"
              }`}
            >
              {sector.emoji} {sector.name}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <div className="flex gap-1 bg-dark-elevated rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("chart")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "chart"
                  ? "bg-dark-card text-dark-text-primary shadow-sm"
                  : "text-dark-text-secondary"
              }`}
            >
              차트
            </button>
            <button
              onClick={() => setViewMode("compare")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "compare"
                  ? "bg-dark-card text-dark-text-primary shadow-sm"
                  : "text-dark-text-secondary"
              }`}
            >
              비교
            </button>
          </div>
        </div>
      </div>

      {viewMode === "chart" ? (
        <ChartView activeSector={activeSector} priceData={priceData} />
      ) : (
        <CompareView activeSector={activeSector} priceData={priceData} metricsData={metricsData} />
      )}
    </div>
  );
}

function ChartView({
  activeSector,
  priceData,
}: {
  activeSector: Sector;
  priceData: Record<string, StockSummary>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {activeSector.stocks.map((stock) => {
        const summary = priceData[stock.ticker];
        const changeColor = summary ? getChangeColor(summary.change) : "";
        const sign = summary && summary.change > 0 ? "+" : "";

        return (
          <Link key={stock.ticker} href={`/stock/${stock.ticker}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-dark-text-primary truncate">
                    {stock.name}
                  </p>
                  <p className="text-xs text-dark-text-muted">
                    {stock.ticker} · {stock.description}
                  </p>
                </div>
                {summary && (
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold text-dark-text-primary">
                      {formatPrice(summary.currentPrice)}
                      <span className="text-xs font-medium ml-0.5">원</span>
                    </p>
                    <p className={`text-xs font-medium ${changeColor}`}>
                      {sign}{formatPrice(summary.change)}원 ({formatPercent(summary.changePercent)})
                    </p>
                  </div>
                )}
              </div>
              <MiniChart ticker={stock.ticker} />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function CompareView({
  activeSector,
  priceData,
  metricsData,
}: {
  activeSector: Sector;
  priceData: Record<string, StockSummary>;
  metricsData: Record<string, Partial<FinancialMetrics>>;
}) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left py-3 px-2 text-xs font-semibold text-dark-text-secondary">종목</th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">현재가</th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">등락률</th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">PER</th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">PBR</th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">ROE</th>
            </tr>
          </thead>
          <tbody>
            {activeSector.stocks.map((stock) => {
              const summary = priceData[stock.ticker];
              const metrics = metricsData[stock.ticker];
              const changeColor = summary ? getChangeColor(summary.change) : "";

              return (
                <tr key={stock.ticker} className="border-b border-dark-border last:border-0 hover:bg-dark-elevated transition-colors">
                  <td className="py-3 px-2">
                    <Link href={`/stock/${stock.ticker}`} className="hover:text-toss-blue transition-colors">
                      <p className="font-semibold text-dark-text-primary">{stock.name}</p>
                      <p className="text-xs text-dark-text-muted">{stock.ticker}</p>
                    </Link>
                  </td>
                  <td className="text-right py-3 px-2 font-medium text-dark-text-primary">
                    {summary ? `${formatPrice(summary.currentPrice)}원` : "-"}
                  </td>
                  <td className={`text-right py-3 px-2 font-medium ${changeColor}`}>
                    {summary ? formatPercent(summary.changePercent) : "-"}
                  </td>
                  <td className="text-right py-3 px-2 text-dark-text-primary">
                    {metrics?.per ? `${formatRatio(metrics.per)}배` : "-"}
                  </td>
                  <td className="text-right py-3 px-2 text-dark-text-primary">
                    {metrics?.pbr ? `${formatRatio(metrics.pbr)}배` : "-"}
                  </td>
                  <td className="text-right py-3 px-2 text-dark-text-primary">
                    {metrics?.roe ? `${formatRatio(metrics.roe)}%` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
