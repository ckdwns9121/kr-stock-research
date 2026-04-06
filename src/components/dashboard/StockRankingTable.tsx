"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { getChangeBgColor } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { TrendingStock } from "@/types/market";

interface StockRankingTableProps {
  gainers: TrendingStock[];
  losers: TrendingStock[];
}

export function StockRankingTable({ gainers, losers }: StockRankingTableProps) {
  const [activeTab, setActiveTab] = useState<"gainers" | "losers">("gainers");

  const stocks = activeTab === "gainers" ? gainers : losers;

  return (
    <Card>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("gainers")}
          className={`rounded-lg px-4 py-2 text-sm transition-colors ${
            activeTab === "gainers"
              ? "bg-dark-elevated text-dark-text-primary font-semibold"
              : "text-dark-text-muted hover:text-dark-text-secondary"
          }`}
        >
          🔺 상승
        </button>
        <button
          onClick={() => setActiveTab("losers")}
          className={`rounded-lg px-4 py-2 text-sm transition-colors ${
            activeTab === "losers"
              ? "bg-dark-elevated text-dark-text-primary font-semibold"
              : "text-dark-text-muted hover:text-dark-text-secondary"
          }`}
        >
          🔻 하락
        </button>
      </div>

      <div className="space-y-1">
        {stocks.map((stock, i) => {
          const bgColor = getChangeBgColor(stock.changePercent);
          return (
            <Link
              key={stock.ticker}
              href={`/stock/${stock.ticker}`}
              className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-dark-elevated transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-bold text-dark-text-muted w-5 text-right shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-dark-text-primary truncate">
                    {stock.name}
                  </p>
                  <p className="text-xs text-dark-text-muted">{stock.ticker}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-sm font-medium text-dark-text-primary">
                  {formatPrice(stock.price)}원
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${bgColor}`}>
                  {stock.changePercent > 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </Link>
          );
        })}
        {stocks.length === 0 && (
          <p className="text-sm text-dark-text-muted text-center py-4">데이터 없음</p>
        )}
      </div>
    </Card>
  );
}
