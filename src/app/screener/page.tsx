"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface ScreenerStock {
  ticker: string;
  name: string;
  sector: string;
  market: string;
  price: number;
  changePercent: number;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  volume: number;
  marketCap: number | null;
}

type SortKey = "name" | "price" | "changePercent" | "per" | "pbr" | "roe" | "marketCap";
type SortDir = "asc" | "desc";
type ChangeFilter = "all" | "up" | "down";
type MarketFilter = "전체" | "KOSPI" | "KOSDAQ";

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatMetric(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(2);
}

function formatMarketCap(value: number | null): string {
  if (value === null || value === undefined) return "-";
  // value is in raw KRW — divide by 100,000,000 to get 억원
  const uk = Math.round(value / 100000000);
  if (uk >= 10000) {
    return (uk / 10000).toFixed(1) + "조";
  }
  return uk.toLocaleString("ko-KR") + "억";
}

export default function ScreenerPage() {
  const [stocks, setStocks] = useState<ScreenerStock[]>([]);
  const [loading, setLoading] = useState(true);

  // Market filter
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("전체");

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [perMin, setPerMin] = useState(0);
  const [perMax, setPerMax] = useState(50);
  const [pbrMin, setPbrMin] = useState(0);
  const [pbrMax, setPbrMax] = useState(10);
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>("all");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetch("/api/screener")
      .then((r) => r.json())
      .then((data) => {
        setStocks(data.stocks ?? []);
      })
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stocks
      .filter((s) => {
        if (marketFilter !== "전체" && s.market !== marketFilter) return false;
        if (q && !s.name.toLowerCase().includes(q) && !s.ticker.toLowerCase().includes(q))
          return false;
        if (changeFilter === "up" && s.changePercent <= 0) return false;
        if (changeFilter === "down" && s.changePercent >= 0) return false;
        if (s.per !== null && (s.per < perMin || s.per > perMax)) return false;
        if (s.pbr !== null && (s.pbr < pbrMin || s.pbr > pbrMax)) return false;
        return true;
      })
      .sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        if (typeof aVal === "string" && typeof bVal === "string") {
          const cmp = aVal.localeCompare(bVal, "ko");
          return sortDir === "asc" ? cmp : -cmp;
        }

        const cmp = (aVal as number) - (bVal as number);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [stocks, marketFilter, searchQuery, perMin, perMax, pbrMin, pbrMax, changeFilter, sortKey, sortDir]);

  function SortIcon({ colKey }: { colKey: SortKey }) {
    if (sortKey !== colKey) {
      return <span className="ml-1 text-dark-text-muted opacity-40">↕</span>;
    }
    return (
      <span className="ml-1 text-dark-text-secondary">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  function ColHeader({
    colKey,
    label,
    className = "",
  }: {
    colKey: SortKey;
    label: string;
    className?: string;
  }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wide cursor-pointer select-none hover:text-dark-text-secondary transition-colors ${className}`}
        onClick={() => handleSort(colKey)}
      >
        {label}
        <SortIcon colKey={colKey} />
      </th>
    );
  }

  return (
    <main className="min-h-screen bg-dark-bg">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-dark-text-primary">종목 스크리너</h1>
          <p className="mt-1 text-sm text-dark-text-secondary">
            PER, PBR, ROE 등 조건으로 종목을 필터링하세요
          </p>
        </div>

        {/* Filter card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">필터</CardTitle>
          </CardHeader>

          {/* Market filter tabs */}
          <div className="flex gap-2 mb-4">
            {(["전체", "KOSPI", "KOSDAQ"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  marketFilter === m
                    ? "bg-toss-blue text-white"
                    : "bg-dark-elevated text-dark-text-secondary hover:text-dark-text-primary"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="종목명 또는 코드 검색"
              className="w-full max-w-xs bg-dark-elevated border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text-primary placeholder-dark-text-muted focus:outline-none focus:border-dark-text-muted"
            />
          </div>

          <div className="flex flex-wrap gap-6">
            {/* PER range */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dark-text-secondary">PER 범위</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={perMin}
                  min={0}
                  onChange={(e) => setPerMin(Number(e.target.value))}
                  className="w-20 bg-dark-elevated border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text-primary focus:outline-none focus:border-dark-text-muted"
                />
                <span className="text-dark-text-muted text-sm">~</span>
                <input
                  type="number"
                  value={perMax}
                  min={0}
                  onChange={(e) => setPerMax(Number(e.target.value))}
                  className="w-20 bg-dark-elevated border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text-primary focus:outline-none focus:border-dark-text-muted"
                />
              </div>
            </div>

            {/* PBR range */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dark-text-secondary">PBR 범위</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pbrMin}
                  min={0}
                  step={0.1}
                  onChange={(e) => setPbrMin(Number(e.target.value))}
                  className="w-20 bg-dark-elevated border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text-primary focus:outline-none focus:border-dark-text-muted"
                />
                <span className="text-dark-text-muted text-sm">~</span>
                <input
                  type="number"
                  value={pbrMax}
                  min={0}
                  step={0.1}
                  onChange={(e) => setPbrMax(Number(e.target.value))}
                  className="w-20 bg-dark-elevated border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text-primary focus:outline-none focus:border-dark-text-muted"
                />
              </div>
            </div>

            {/* Change direction */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-dark-text-secondary">등락률</label>
              <div className="flex items-center gap-3">
                {(
                  [
                    { value: "all", label: "전체" },
                    { value: "up", label: "상승만" },
                    { value: "down", label: "하락만" },
                  ] as const
                ).map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="changeFilter"
                      value={value}
                      checked={changeFilter === value}
                      onChange={() => setChangeFilter(value)}
                      className="accent-dark-text-secondary"
                    />
                    <span className="text-sm text-dark-text-primary">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Results card */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-dark-text-primary">검색 결과</h2>
            {!loading && (
              <span className="text-xs text-dark-text-muted">
                {filtered.length}개 종목
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-dark-text-muted text-sm">로딩 중...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-dark-text-muted text-sm">조건에 맞는 종목이 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    <ColHeader colKey="name" label="종목명" className="text-left" />
                    <ColHeader colKey="marketCap" label="시총" className="text-right" />
                    <ColHeader colKey="price" label="현재가" className="text-right" />
                    <ColHeader colKey="changePercent" label="등락률" className="text-right" />
                    <ColHeader colKey="per" label="PER" className="text-right" />
                    <ColHeader colKey="pbr" label="PBR" className="text-right" />
                    <ColHeader colKey="roe" label="ROE" className="text-right" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((stock) => {
                    const isUp = stock.changePercent > 0;
                    const isDown = stock.changePercent < 0;
                    const changeClass = isUp
                      ? "text-toss-red"
                      : isDown
                      ? "text-toss-blue"
                      : "text-dark-text-muted";

                    return (
                      <tr
                        key={stock.ticker}
                        className="border-b border-dark-border last:border-0 hover:bg-dark-elevated transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link href={`/stock/${stock.ticker}`} className="group">
                            <span className="font-medium text-dark-text-primary group-hover:text-white transition-colors">
                              {stock.name}
                            </span>
                            <span className="ml-2 text-xs text-dark-text-muted">
                              {stock.ticker}
                            </span>
                            <span className="ml-1.5 text-xs text-dark-text-muted opacity-60">
                              {stock.market}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-dark-text-secondary tabular-nums">
                          {formatMarketCap(stock.marketCap)}
                        </td>
                        <td className="px-4 py-3 text-right text-dark-text-primary tabular-nums">
                          {stock.price > 0 ? formatPrice(stock.price) : "-"}
                        </td>
                        <td className={`px-4 py-3 text-right tabular-nums font-medium ${changeClass}`}>
                          {stock.changePercent !== 0
                            ? formatPercent(stock.changePercent)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-dark-text-secondary tabular-nums">
                          {formatMetric(stock.per)}
                        </td>
                        <td className="px-4 py-3 text-right text-dark-text-secondary tabular-nums">
                          {formatMetric(stock.pbr)}
                        </td>
                        <td className="px-4 py-3 text-right text-dark-text-secondary tabular-nums">
                          {formatMetric(stock.roe)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
