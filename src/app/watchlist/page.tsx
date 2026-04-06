import Link from "next/link";
import type { Metadata } from "next";
import { SECTORS } from "@/lib/sectors";
import { fetchStockSummary } from "@/lib/api/naver";
import { formatPrice, formatPercent } from "@/lib/format";
import { getChangeColor } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "관심 섹터 - 주식리서치",
  description: "반도체, 우주·방산, 바이오 섹터 주요 종목을 한눈에 확인하세요.",
};

export const revalidate = 300;

async function fetchSectorPrices(tickers: string[]) {
  const results = await Promise.allSettled(
    tickers.map((t) => fetchStockSummary(t))
  );
  const map = new Map<string, { price: number; change: number; changePercent: number }>();
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value) {
      map.set(tickers[i], {
        price: r.value.currentPrice,
        change: r.value.change,
        changePercent: r.value.changePercent,
      });
    }
  });
  return map;
}

export default async function WatchlistPage() {
  const allTickers = SECTORS.flatMap((s) => s.stocks.map((st) => st.ticker));
  const priceMap = await fetchSectorPrices(allTickers);

  return (
    <div className="space-y-8">
      <section className="pt-4">
        <h1 className="text-2xl font-bold text-dark-text-primary">관심 섹터</h1>
        <p className="text-sm text-dark-text-secondary mt-1">
          반도체 · 우주/방산 · 바이오 주요 종목
        </p>
      </section>

      {SECTORS.map((sector) => (
        <section key={sector.id}>
          <h2 className="text-lg font-semibold text-dark-text-primary mb-3">
            {sector.emoji} {sector.name}
          </h2>
          <Card>
            <div className="divide-y divide-dark-border">
              {sector.stocks.map((stock) => {
                const data = priceMap.get(stock.ticker);
                const changeColor = data ? getChangeColor(data.change) : "";
                const sign = data && data.change > 0 ? "+" : "";

                return (
                  <Link
                    key={stock.ticker}
                    href={`/stock/${stock.ticker}`}
                    className="flex items-center justify-between py-3 px-1 -mx-1 rounded-xl hover:bg-dark-elevated transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark-text-primary truncate">
                        {stock.name}
                      </p>
                      <p className="text-xs text-dark-text-muted mt-0.5">
                        {stock.ticker} · {stock.description}
                      </p>
                    </div>
                    {data ? (
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-sm font-semibold text-dark-text-primary">
                          {formatPrice(data.price)}원
                        </p>
                        <p className={`text-xs font-medium ${changeColor}`}>
                          {sign}{formatPrice(data.change)}원 ({formatPercent(data.changePercent)})
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-dark-text-muted ml-4">-</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </Card>
        </section>
      ))}
    </div>
  );
}
