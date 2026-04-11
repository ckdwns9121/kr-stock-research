"use client";

import type { SectorPerformance } from "@/types/dashboard";

interface SectorHeatmapProps {
  sectors: SectorPerformance[];
}

function getSectorColors(avgChangePercent: number): string {
  if (avgChangePercent > 2) {
    return "bg-toss-red/30 border-toss-red/50 text-toss-red";
  }
  if (avgChangePercent > 0.5) {
    return "bg-toss-red/15 border-toss-red/30 text-toss-red";
  }
  if (avgChangePercent > -0.5) {
    return "bg-dark-elevated border-dark-border text-dark-text-secondary";
  }
  if (avgChangePercent > -2) {
    return "bg-toss-blue/15 border-toss-blue/30 text-toss-blue";
  }
  return "bg-toss-blue/30 border-toss-blue/50 text-toss-blue";
}

function formatChangePercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function SectorHeatmap({ sectors }: SectorHeatmapProps) {
  if (sectors.length === 0) {
    return (
      <p className="text-sm text-dark-text-muted text-center py-6">
        섹터 데이터를 불러올 수 없습니다
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {sectors.map((sector) => {
        const colorClass = getSectorColors(sector.avgChangePercent);
        return (
          <div
            key={sector.id}
            className={`rounded-xl border p-3 flex flex-col gap-1 ${colorClass}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-lg leading-none">{sector.emoji}</span>
              <span className="text-xs font-semibold text-dark-text-primary truncate">
                {sector.name}
              </span>
            </div>
            <p className="text-base font-bold leading-none">
              {formatChangePercent(sector.avgChangePercent)}
            </p>
            <p className="text-[10px] text-dark-text-muted">
              상승 {(sector.advancerRatio * 100).toFixed(0)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}
