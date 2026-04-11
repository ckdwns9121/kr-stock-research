"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Card } from "@/components/ui/Card";
import { formatPrice, formatPercent } from "@/lib/format";
import { getChangeColor, getChangeBgColor } from "@/lib/utils";

interface CurrentPrice {
  price: number;
  name: string;
}

export function PortfolioClient() {
  const { items, loaded, addItem, removeItem, sellItem } = usePortfolio();
  const [prices, setPrices] = useState<Record<string, CurrentPrice>>({});
  const [form, setForm] = useState({ ticker: "", name: "", buyPrice: "", quantity: "" });
  const [sellForm, setSellForm] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ ticker: string; name: string }[]>([]);

  // Fetch current prices for all portfolio items
  const fetchPrices = useCallback(async () => {
    const tickers = Array.from(new Set(items.map((i) => i.ticker)));
    if (tickers.length === 0) return;

    const results = await Promise.allSettled(
      tickers.map(async (t) => {
        const res = await fetch(`/api/stock/${t}/metrics`);
        if (!res.ok) return null;
        return res.json();
      })
    );

    // Also get stock summaries for current price
    const summaryResults = await Promise.allSettled(
      tickers.map(async (t) => {
        const res = await fetch(`/api/search?q=${t}`);
        if (!res.ok) return null;
        return res.json();
      })
    );

    const newPrices: Record<string, CurrentPrice> = {};

    // Fetch actual prices from the chart endpoint (latest close)
    const priceResults = await Promise.allSettled(
      tickers.map(async (t) => {
        const res = await fetch(`/api/stock/${t}/chart?period=7`);
        if (!res.ok) return null;
        const json = await res.json();
        const data = json.data ?? [];
        if (data.length === 0) return null;
        return { ticker: t, price: data[data.length - 1].close };
      })
    );

    priceResults.forEach((r) => {
      if (r.status === "fulfilled" && r.value) {
        const item = items.find((i) => i.ticker === r.value!.ticker);
        newPrices[r.value.ticker] = {
          price: r.value.price,
          name: item?.name ?? r.value.ticker,
        };
      }
    });

    setPrices(newPrices);
  }, [items]);

  useEffect(() => {
    if (loaded && items.length > 0) {
      fetchPrices();
    }
  }, [loaded, items.length, fetchPrices]);

  // Search stocks
  const handleSearch = async (query: string) => {
    setForm((f) => ({ ...f, ticker: query }));
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = await res.json();
        setSearchResults((json.results ?? []).slice(0, 5));
      }
    } catch {
      // ignore
    }
    setSearching(false);
  };

  const selectStock = (ticker: string, name: string) => {
    setForm((f) => ({ ...f, ticker, name }));
    setSearchResults([]);
  };

  const handleAdd = () => {
    const buyPrice = parseInt(form.buyPrice.replace(/,/g, ""), 10);
    const quantity = parseInt(form.quantity, 10);
    if (!form.ticker || !buyPrice || !quantity || quantity <= 0) return;

    addItem({
      ticker: form.ticker,
      name: form.name || form.ticker,
      buyPrice,
      quantity,
    });
    setForm({ ticker: "", name: "", buyPrice: "", quantity: "" });
  };

  const handleSell = (id: string, maxQuantity: number) => {
    const quantity = parseInt(sellForm[id] || "", 10);
    if (!quantity || quantity <= 0) return;
    sellItem(id, Math.min(quantity, maxQuantity));
    setSellForm((prev) => ({ ...prev, [id]: "" }));
  };

  // Calculate totals
  const totalInvested = items.reduce((sum, i) => sum + i.buyPrice * i.quantity, 0);
  const totalCurrent = items.reduce((sum, i) => {
    const cp = prices[i.ticker]?.price ?? i.buyPrice;
    return sum + cp * i.quantity;
  }, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  if (!loaded) return null;

  return (
    <div className="space-y-5">
      {/* Summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <p className="text-xs text-dark-text-muted font-medium mb-1">총 투자금액</p>
            <p className="text-lg font-bold text-dark-text-primary">{formatPrice(totalInvested)}원</p>
          </Card>
          <Card>
            <p className="text-xs text-dark-text-muted font-medium mb-1">총 평가금액</p>
            <p className="text-lg font-bold text-dark-text-primary">{formatPrice(totalCurrent)}원</p>
          </Card>
          <Card>
            <p className="text-xs text-dark-text-muted font-medium mb-1">총 수익률</p>
            <p className={`text-lg font-bold ${getChangeColor(totalPnl)}`}>
              {totalPnl > 0 ? "+" : ""}{formatPrice(totalPnl)}원
              <span className="text-sm ml-1">({formatPercent(totalPnlPercent)})</span>
            </p>
          </Card>
        </div>
      )}

      {/* Add form */}
      <Card>
        <h3 className="text-sm font-semibold text-dark-text-primary mb-3">종목 추가</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="종목명 또는 티커"
              value={form.name || form.ticker}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-dark-border rounded-lg shadow-lg z-20 overflow-hidden">
                {searchResults.map((r) => (
                  <button
                    key={r.ticker}
                    onClick={() => selectStock(r.ticker, r.name)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-dark-elevated transition-colors"
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-dark-text-muted ml-2">{r.ticker}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="text"
            placeholder="매수가 (원)"
            value={form.buyPrice}
            onChange={(e) => setForm((f) => ({ ...f, buyPrice: e.target.value.replace(/[^0-9]/g, "") }))}
            className="w-full sm:w-32 px-3 py-2 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue"
          />
          <input
            type="text"
            placeholder="수량"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value.replace(/[^0-9]/g, "") }))}
            className="w-full sm:w-24 px-3 py-2 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue"
          />
          <button
            onClick={handleAdd}
            disabled={!form.ticker || !form.buyPrice || !form.quantity}
            className="px-4 py-2 bg-toss-blue text-white text-sm font-semibold rounded-lg hover:bg-toss-blue-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            추가
          </button>
        </div>
      </Card>

      {/* Portfolio list */}
      {items.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-dark-text-muted text-sm">
            아직 포트폴리오가 비어있습니다. 종목을 추가해보세요.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-dark-text-secondary">종목</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">매수가</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">현재가</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">수량</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">평가금액</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-dark-text-secondary">수익률</th>
                  <th className="py-3 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const currentPrice = prices[item.ticker]?.price ?? 0;
                  const evalAmount = currentPrice > 0 ? currentPrice * item.quantity : 0;
                  const pnl = currentPrice > 0 ? (currentPrice - item.buyPrice) / item.buyPrice * 100 : 0;
                  const pnlBg = getChangeBgColor(pnl);

                  return (
                    <tr key={item.id} className="border-b border-dark-border last:border-0 hover:bg-dark-elevated transition-colors">
                      <td className="py-3 px-2">
                        <Link href={`/stock/${item.ticker}`} className="hover:text-toss-blue transition-colors">
                          <p className="font-semibold text-dark-text-primary">{item.name}</p>
                          <p className="text-xs text-dark-text-muted">{item.ticker}</p>
                        </Link>
                      </td>
                      <td className="text-right py-3 px-2 text-dark-text-primary">
                        {formatPrice(item.buyPrice)}원
                      </td>
                      <td className="text-right py-3 px-2 font-medium text-dark-text-primary">
                        {currentPrice > 0 ? `${formatPrice(currentPrice)}원` : "-"}
                      </td>
                      <td className="text-right py-3 px-2 text-dark-text-primary">
                        {item.quantity.toLocaleString()}주
                      </td>
                      <td className="text-right py-3 px-2 font-medium text-dark-text-primary">
                        {evalAmount > 0 ? `${formatPrice(evalAmount)}원` : "-"}
                      </td>
                      <td className="text-right py-3 px-2">
                        {currentPrice > 0 ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${pnlBg}`}>
                            {pnl > 0 ? "+" : ""}{pnl.toFixed(2)}%
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="수량"
                            value={sellForm[item.id] ?? ""}
                            onChange={(e) =>
                              setSellForm((prev) => ({
                                ...prev,
                                [item.id]: e.target.value.replace(/[^0-9]/g, ""),
                              }))
                            }
                            className="w-14 px-2 py-1 text-xs border border-dark-border rounded-md text-right"
                          />
                          <button
                            onClick={() => handleSell(item.id, item.quantity)}
                            className="text-xs px-2 py-1 rounded-md bg-toss-blue/10 text-toss-blue hover:bg-toss-blue/20 transition-colors"
                          >
                            매도
                          </button>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-dark-text-muted hover:text-toss-red transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
