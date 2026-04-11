"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SectorStockResult {
  name: string;
  ticker: string;
  changePercent: number;
}

interface SectorResult {
  id: string;
  name: string;
  emoji: string;
  aiSummary: string | null;
  gainers: SectorStockResult[];
  losers: SectorStockResult[];
  avgChangePercent: number;
}

function ChangeLabel({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={positive ? "text-toss-red" : "text-toss-blue"}>
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-dark-elevated rounded-lg" />
        <div className="h-5 w-24 bg-dark-elevated rounded" />
        <div className="ml-auto h-4 w-12 bg-dark-elevated rounded" />
      </div>
      <div className="h-4 w-3/4 bg-dark-elevated rounded" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-dark-elevated rounded" />
          <div className="h-3 w-full bg-dark-elevated rounded" />
          <div className="h-3 w-full bg-dark-elevated rounded" />
          <div className="h-3 w-full bg-dark-elevated rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 bg-dark-elevated rounded" />
          <div className="h-3 w-full bg-dark-elevated rounded" />
          <div className="h-3 w-full bg-dark-elevated rounded" />
          <div className="h-3 w-full bg-dark-elevated rounded" />
        </div>
      </div>
    </div>
  );
}

function SectorCard({ sector }: { sector: SectorResult }) {
  const positive = sector.avgChangePercent >= 0;

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4 space-y-3 hover:border-dark-elevated transition-colors">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{sector.emoji}</span>
        <span className="font-semibold text-dark-text-primary">{sector.name}</span>
        <span
          className={`ml-auto text-sm font-medium ${positive ? "text-toss-red" : "text-toss-blue"}`}
        >
          {positive ? "+" : ""}
          {sector.avgChangePercent.toFixed(2)}%
        </span>
      </div>

      {/* AI Summary */}
      <p className="text-xs text-dark-text-secondary leading-relaxed min-h-[2rem]">
        {sector.aiSummary ?? "분석 중..."}
      </p>

      {/* Gainers / Losers */}
      <div className="grid grid-cols-2 gap-3">
        {/* Gainers */}
        <div>
          <p className="text-xs text-dark-text-muted font-medium mb-1.5">
            🔺 상승 TOP 3
          </p>
          {sector.gainers.length > 0 ? (
            <ul className="space-y-1">
              {sector.gainers.map((s) => (
                <li key={s.ticker} className="flex items-center justify-between gap-1">
                  <Link
                    href={`/stock/${s.ticker}`}
                    className="text-xs text-dark-text-secondary hover:text-dark-text-primary truncate transition-colors"
                  >
                    {s.name}
                  </Link>
                  <span className="text-xs text-toss-red shrink-0">
                    +{s.changePercent.toFixed(2)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-dark-text-muted">-</p>
          )}
        </div>

        {/* Losers */}
        <div>
          <p className="text-xs text-dark-text-muted font-medium mb-1.5">
            🔻 하락 TOP 3
          </p>
          {sector.losers.length > 0 ? (
            <ul className="space-y-1">
              {sector.losers.map((s) => (
                <li key={s.ticker} className="flex items-center justify-between gap-1">
                  <Link
                    href={`/stock/${s.ticker}`}
                    className="text-xs text-dark-text-secondary hover:text-dark-text-primary truncate transition-colors"
                  >
                    {s.name}
                  </Link>
                  <span className="text-xs text-toss-blue shrink-0">
                    {s.changePercent.toFixed(2)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-dark-text-muted">-</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SectorOverview() {
  const [sectors, setSectors] = useState<SectorResult[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/sectors/ai-summary")
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ sectors: SectorResult[] }>;
      })
      .then((data) => setSectors(data.sectors))
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-dark-text-muted text-sm text-center">
        섹터 AI 분석을 불러오지 못했습니다.
      </div>
    );
  }

  if (!sectors) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-dark-text-primary">섹터 AI 시황</h2>
        <span className="text-xs text-dark-text-muted bg-dark-elevated px-2 py-0.5 rounded-full">
          30분 캐시
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sectors.map((sector) => (
          <SectorCard key={sector.id} sector={sector} />
        ))}
      </div>
    </div>
  );
}
