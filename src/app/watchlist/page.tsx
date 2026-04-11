"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { getWatchlist, removeFromWatchlist, type WatchlistItem } from "@/lib/watchlist-storage";

interface StockPrice {
  ticker: string;
  price: number;
  changePercent: number;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [prices, setPrices] = useState<Map<string, StockPrice>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState("전체");

  const loadWatchlist = useCallback(() => {
    setItems(getWatchlist());
  }, []);

  useEffect(() => {
    loadWatchlist();
    setLoading(false);
  }, [loadWatchlist]);

  // 가격 로드
  useEffect(() => {
    if (items.length === 0) return;

    Promise.allSettled(
      items.map(async (item) => {
        const res = await fetch(`/api/stock/${item.ticker}/metrics`);
        const data = await res.json();
        return { ticker: item.ticker, data };
      })
    ).then((results) => {
      const map = new Map<string, StockPrice>();
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value.data) {
          // metrics doesn't have price, try summary via different approach
          map.set(r.value.ticker, {
            ticker: r.value.ticker,
            price: 0,
            changePercent: 0,
          });
        }
      });
      setPrices(map);
    });
  }, [items]);

  function handleRemove(ticker: string) {
    removeFromWatchlist(ticker);
    loadWatchlist();
  }

  const sectors = ["전체", ...Array.from(new Set(items.map((i) => i.sector)))];
  const filtered = sectorFilter === "전체" ? items : items.filter((i) => i.sector === sectorFilter);

  // 섹터별 그룹핑
  const grouped = new Map<string, WatchlistItem[]>();
  for (const item of filtered) {
    const list = grouped.get(item.sector) ?? [];
    list.push(item);
    grouped.set(item.sector, list);
  }

  if (loading) return null;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-dark-text-primary">관심종목</h1>
        <p className="text-sm text-dark-text-secondary mt-1">
          관심종목을 섹터별로 자동 분류하여 관리합니다 · {items.length}종목
        </p>
      </section>

      {items.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm text-dark-text-secondary mb-1">관심종목이 없습니다</p>
            <p className="text-xs text-dark-text-muted">종목 상세 페이지에서 ♡ 버튼을 눌러 추가하세요</p>
          </div>
        </Card>
      ) : (
        <>
          {/* 섹터 필터 */}
          <div className="flex flex-wrap gap-2">
            {sectors.map((s) => (
              <button
                key={s}
                onClick={() => setSectorFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  sectorFilter === s
                    ? "bg-toss-blue text-white"
                    : "bg-dark-elevated text-dark-text-secondary hover:text-dark-text-primary"
                }`}
              >
                {s} {s === "전체" ? `(${items.length})` : `(${items.filter((i) => i.sector === s).length})`}
              </button>
            ))}
          </div>

          {/* 섹터별 그룹 */}
          {Array.from(grouped.entries()).map(([sector, stocks]) => (
            <div key={sector}>
              <h2 className="text-sm font-semibold text-dark-text-secondary mb-2">{sector} ({stocks.length})</h2>
              <Card className="border border-dark-border">
                <div className="divide-y divide-dark-border">
                  {stocks.map((item) => (
                    <div key={item.ticker} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <Link
                        href={`/stock/${item.ticker}`}
                        className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-dark-text-primary truncate">{item.name}</p>
                          <p className="text-xs text-dark-text-muted">{item.ticker}</p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-dark-text-muted">
                          {new Date(item.addedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 추가
                        </span>
                        <button
                          onClick={() => handleRemove(item.ticker)}
                          className="text-xs text-dark-text-muted hover:text-toss-red transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
