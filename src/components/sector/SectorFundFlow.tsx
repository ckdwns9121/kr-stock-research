"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface SectorFlowItem {
  name: string;
  emoji: string;
  avgChangePercent: number;
}

interface SectorFundFlowProps {
  sectors: SectorFlowItem[];
}

export function SectorFundFlow({ sectors }: SectorFundFlowProps) {
  if (!sectors.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>섹터 자금 흐름</CardTitle>
        </CardHeader>
        <p className="text-sm text-dark-text-muted text-center py-6">데이터 없음</p>
      </Card>
    );
  }

  const outflow = sectors
    .filter((s) => s.avgChangePercent < 0)
    .sort((a, b) => a.avgChangePercent - b.avgChangePercent);

  const inflow = sectors
    .filter((s) => s.avgChangePercent >= 0)
    .sort((a, b) => b.avgChangePercent - a.avgChangePercent);

  const maxAbs = Math.max(...sectors.map((s) => Math.abs(s.avgChangePercent)), 0.01);

  return (
    <Card>
      <CardHeader>
        <CardTitle>섹터 자금 흐름</CardTitle>
        <p className="text-xs text-dark-text-muted mt-0.5">오늘 섹터별 평균 등락률 기준</p>
      </CardHeader>

      {/* Flow direction indicator */}
      <div className="flex items-center justify-center gap-3 mb-5 text-xs font-medium">
        <span className="text-toss-red">← 유출</span>
        <div className="h-px flex-1 bg-dark-border" />
        <span className="text-xs text-dark-text-muted px-2">자금 이동</span>
        <div className="h-px flex-1 bg-dark-border" />
        <span className="text-toss-green">유입 →</span>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Outflow (negative) */}
        <div>
          <p className="text-xs font-semibold text-toss-red mb-3">🔴 자금 유출 (약세)</p>
          {outflow.length === 0 ? (
            <p className="text-xs text-dark-text-muted">해당 없음</p>
          ) : (
            <div className="space-y-2">
              {outflow.map((sector) => {
                const widthPct = (Math.abs(sector.avgChangePercent) / maxAbs) * 100;
                return (
                  <div key={sector.name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-dark-text-secondary truncate">
                        {sector.emoji} {sector.name}
                      </span>
                      <span className="text-xs font-medium text-toss-red ml-2 shrink-0">
                        {sector.avgChangePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-2 bg-dark-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-toss-red rounded-full opacity-70"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Inflow (positive) */}
        <div>
          <p className="text-xs font-semibold text-toss-green mb-3">🟢 자금 유입 (강세)</p>
          {inflow.length === 0 ? (
            <p className="text-xs text-dark-text-muted">해당 없음</p>
          ) : (
            <div className="space-y-2">
              {inflow.map((sector) => {
                const widthPct = (Math.abs(sector.avgChangePercent) / maxAbs) * 100;
                return (
                  <div key={sector.name}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-dark-text-secondary truncate">
                        {sector.emoji} {sector.name}
                      </span>
                      <span className="text-xs font-medium text-toss-blue ml-2 shrink-0">
                        +{sector.avgChangePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-2 bg-dark-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-toss-blue rounded-full opacity-70"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
