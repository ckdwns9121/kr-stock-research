"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import TenbaggerDetail from "@/components/discovery/TenbaggerDetail";

interface DiscoveryStock {
  ticker: string;
  name: string;
  sector: string;
  sectorEmoji: string;
  price: number;
  changePercent: number;
  marketCap: number | null;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  score: number;
  factors: {
    valuation: number;
    growth: number;
    quality: number;
    size: number;
    momentum: number;
  };
}

function formatPrice(price: number): string {
  return price.toLocaleString("ko-KR") + "원";
}

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  let barColor = "bg-toss-blue";
  if (score >= 70) barColor = "bg-toss-red";
  else if (score >= 50) barColor = "bg-yellow-400";

  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums text-dark-text-primary font-semibold w-8 text-right">
        {score}
      </span>
      <div className="flex-1 h-1.5 bg-dark-elevated rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const FACTOR_LABELS: { key: keyof DiscoveryStock["factors"]; label: string }[] = [
  { key: "valuation", label: "밸류" },
  { key: "growth", label: "성장" },
  { key: "quality", label: "체질" },
  { key: "size", label: "규모" },
  { key: "momentum", label: "모멘텀" },
];

function FactorMiniBars({ factors }: { factors: DiscoveryStock["factors"] }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[80px]">
      {FACTOR_LABELS.map(({ key, label }) => {
        const val = factors[key];
        const pct = Math.min(100, Math.max(0, val));
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-[10px] text-dark-text-muted w-10 shrink-0">{label}</span>
            <div className="flex-1 h-1 bg-dark-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-dark-text-muted opacity-70"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DiscoveryPage() {
  const [stocks, setStocks] = useState<DiscoveryStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState("전체");
  const [minScore, setMinScore] = useState(50);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/discovery")
      .then((r) => r.json())
      .then((data) => {
        setStocks(data.stocks ?? []);
      })
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
  }, []);

  const sectors = useMemo(() => {
    const s = Array.from(new Set(stocks.map((st) => st.sector))).sort((a, b) =>
      a.localeCompare(b, "ko")
    );
    return ["전체", ...s];
  }, [stocks]);

  const filtered = useMemo(() => {
    return stocks
      .filter((s) => {
        if (sectorFilter !== "전체" && s.sector !== sectorFilter) return false;
        if (s.score < minScore) return false;
        return true;
      })
      .sort((a, b) => b.score - a.score);
  }, [stocks, sectorFilter, minScore]);

  const avgScore = useMemo(() => {
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, s) => acc + s.score, 0);
    return Math.round(sum / filtered.length);
  }, [filtered]);

  const topStock = filtered[0] ?? null;

  return (
    <main className="min-h-screen bg-dark-bg">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-dark-text-primary">
            🚀 텐배거 발굴기
          </h1>
          <p className="mt-1 text-sm text-dark-text-secondary">
            저평가 + 고성장 잠재력을 가진 종목을 멀티팩터 스코어링으로 발굴합니다
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <p className="text-xs text-dark-text-muted mb-1">발굴 종목 수</p>
            <p className="text-2xl font-bold text-dark-text-primary">
              {loading ? "—" : filtered.length}
              <span className="text-sm font-normal text-dark-text-muted ml-1">종목</span>
            </p>
          </Card>
          <Card>
            <p className="text-xs text-dark-text-muted mb-1">평균 스코어</p>
            <p className="text-2xl font-bold text-dark-text-primary">
              {loading ? "—" : avgScore}
              <span className="text-sm font-normal text-dark-text-muted ml-1">/ 100</span>
            </p>
          </Card>
          <Card>
            <p className="text-xs text-dark-text-muted mb-1">최고 스코어 종목</p>
            {loading ? (
              <p className="text-2xl font-bold text-dark-text-primary">—</p>
            ) : topStock ? (
              <div className="flex items-baseline gap-2">
                <p className="text-lg font-bold text-dark-text-primary truncate">
                  {topStock.name}
                </p>
                <span className="text-sm font-semibold text-toss-red shrink-0">
                  {topStock.score}점
                </span>
              </div>
            ) : (
              <p className="text-dark-text-muted text-sm">없음</p>
            )}
          </Card>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-dark-text-secondary whitespace-nowrap">
              섹터
            </label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text-primary focus:outline-none focus:border-dark-text-muted"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-dark-text-secondary whitespace-nowrap">
              최소 스코어
            </label>
            <input
              type="number"
              value={minScore}
              min={0}
              max={100}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-20 bg-dark-elevated border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text-primary focus:outline-none focus:border-dark-text-muted"
            />
          </div>
          {!loading && (
            <span className="text-xs text-dark-text-muted ml-auto">
              {filtered.length}개 종목
            </span>
          )}
        </div>

        {/* Main table */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-border">
            <CardTitle className="text-base">발굴 종목 목록</CardTitle>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-dark-text-muted text-sm animate-pulse">
                발굴 중...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-dark-text-muted text-sm">
                조건에 맞는 종목이 없습니다
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="px-4 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wide text-center w-12">
                      순위
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wide text-left">
                      종목명
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wide text-right">
                      현재가
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wide text-right">
                      등락률
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wide text-left min-w-[140px]">
                      스코어
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wide text-left min-w-[100px]">
                      팩터
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wide text-center">
                      AI 분석
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((stock, idx) => {
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
                        {/* 순위 */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              idx === 0
                                ? "text-yellow-400"
                                : idx === 1
                                ? "text-gray-400"
                                : idx === 2
                                ? "text-amber-600"
                                : "text-dark-text-muted"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>

                        {/* 종목명 + 섹터 badge */}
                        <td className="px-4 py-3">
                          <Link href={`/stock/${stock.ticker}`} className="group flex items-center gap-2">
                            <div>
                              <span className="font-medium text-dark-text-primary group-hover:text-white transition-colors">
                                {stock.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs">{stock.sectorEmoji}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-dark-elevated text-dark-text-muted border border-dark-border">
                                  {stock.sector}
                                </span>
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* 현재가 */}
                        <td className="px-4 py-3 text-right text-dark-text-primary tabular-nums">
                          {stock.price > 0 ? formatPrice(stock.price) : "—"}
                        </td>

                        {/* 등락률 */}
                        <td className={`px-4 py-3 text-right tabular-nums font-medium ${changeClass}`}>
                          {stock.changePercent !== 0
                            ? formatPercent(stock.changePercent)
                            : "—"}
                        </td>

                        {/* 스코어 */}
                        <td className="px-4 py-3">
                          <ScoreBar score={stock.score} />
                        </td>

                        {/* 팩터 미니바 */}
                        <td className="px-4 py-3">
                          <FactorMiniBars factors={stock.factors} />
                        </td>

                        {/* AI 분석 버튼 */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedTicker(stock.ticker)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-dark-elevated border border-dark-border text-dark-text-secondary hover:border-dark-text-muted hover:text-dark-text-primary transition-colors"
                          >
                            🔍 분석
                          </button>
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

      {selectedTicker && (
        <TenbaggerDetail
          ticker={selectedTicker}
          name={filtered.find((s) => s.ticker === selectedTicker)?.name ?? selectedTicker}
          score={filtered.find((s) => s.ticker === selectedTicker)?.score ?? 0}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </main>
  );
}
