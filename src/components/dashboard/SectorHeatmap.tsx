"use client";

import { useMemo, useState } from "react";
import type { SectorPerformance } from "@/types/dashboard";

interface SectorHeatmapProps {
  sectors: SectorPerformance[];
}

interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
  sector: SectorPerformance;
}

// Squarify 알고리즘
function squarify(
  items: { weight: number; sector: SectorPerformance }[],
  x: number,
  y: number,
  w: number,
  h: number
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, w, h, sector: items[0].sector }];
  }

  const total = items.reduce((sum, i) => sum + i.weight, 0);
  if (total === 0) {
    return items.map((item, i) => ({
      x: x + (w / items.length) * i,
      y,
      w: w / items.length,
      h,
      sector: item.sector,
    }));
  }

  // 가로/세로 중 긴 쪽을 기준으로 분할
  const isWide = w >= h;

  let accumulated = 0;
  let bestIdx = 0;
  let bestAspect = Infinity;

  for (let i = 0; i < items.length - 1; i++) {
    accumulated += items[i].weight;
    const ratio = accumulated / total;

    // 분할 후 첫 그룹의 면적에서 aspect ratio 계산
    let aspect: number;
    if (isWide) {
      const splitW = w * ratio;
      const avgH = h / (i + 1);
      aspect = Math.max(splitW / avgH, avgH / splitW);
    } else {
      const splitH = h * ratio;
      const avgW = w / (i + 1);
      aspect = Math.max(splitH / avgW, avgW / splitH);
    }

    if (aspect < bestAspect) {
      bestAspect = aspect;
      bestIdx = i;
    }
  }

  const leftItems = items.slice(0, bestIdx + 1);
  const rightItems = items.slice(bestIdx + 1);
  const leftWeight = leftItems.reduce((s, i) => s + i.weight, 0);
  const splitRatio = leftWeight / total;

  let leftRects: TreemapRect[];
  let rightRects: TreemapRect[];

  if (isWide) {
    const splitX = w * splitRatio;
    leftRects = layoutStrip(leftItems, leftWeight, x, y, splitX, h, false);
    rightRects = squarify(rightItems, x + splitX, y, w - splitX, h);
  } else {
    const splitY = h * splitRatio;
    leftRects = layoutStrip(leftItems, leftWeight, x, y, w, splitY, true);
    rightRects = squarify(rightItems, x, y + splitY, w, h - splitY);
  }

  return [...leftRects, ...rightRects];
}

function layoutStrip(
  items: { weight: number; sector: SectorPerformance }[],
  total: number,
  x: number,
  y: number,
  w: number,
  h: number,
  horizontal: boolean
): TreemapRect[] {
  const rects: TreemapRect[] = [];
  let offset = 0;

  for (const item of items) {
    const ratio = item.weight / (total || 1);
    if (horizontal) {
      const itemW = w * ratio;
      rects.push({ x: x + offset, y, w: itemW, h, sector: item.sector });
      offset += itemW;
    } else {
      const itemH = h * ratio;
      rects.push({ x, y: y + offset, w, h: itemH, sector: item.sector });
      offset += itemH;
    }
  }

  return rects;
}

function getColor(pct: number): string {
  if (pct > 3) return "#c62828";
  if (pct > 2) return "#d32f2f";
  if (pct > 1) return "#e53935";
  if (pct > 0.3) return "#ef5350";
  if (pct > 0) return "#b71c1c99";
  if (pct === 0) return "#333340";
  if (pct > -0.3) return "#1565c099";
  if (pct > -1) return "#1976d2";
  if (pct > -2) return "#1e88e5";
  if (pct > -3) return "#2196f3";
  return "#1565c0";
}

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

const SVG_WIDTH = 800;
const SVG_HEIGHT = 400;
const GAP = 2;

export function SectorHeatmap({ sectors }: SectorHeatmapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const rects = useMemo(() => {
    if (sectors.length === 0) return [];

    // 가중치: score 절대값 + 최소값 보정 (0이면 안 보이므로)
    const items = [...sectors]
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .map((sector) => ({
        weight: Math.max(Math.abs(sector.score), 0.5),
        sector,
      }));

    return squarify(items, 0, 0, SVG_WIDTH, SVG_HEIGHT);
  }, [sectors]);

  if (sectors.length === 0) {
    return (
      <p className="text-sm text-dark-text-muted text-center py-6">
        섹터 데이터를 불러올 수 없습니다
      </p>
    );
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full h-auto rounded-xl overflow-hidden"
        style={{ minHeight: 200 }}
      >
        {rects.map((rect) => {
          const { x, y, w, h, sector } = rect;
          const color = getColor(sector.avgChangePercent);
          const isHovered = hovered === sector.id;
          const innerX = x + GAP / 2;
          const innerY = y + GAP / 2;
          const innerW = Math.max(w - GAP, 0);
          const innerH = Math.max(h - GAP, 0);

          // 텍스트 크기를 블록 크기에 비례
          const area = innerW * innerH;
          const nameSize = area > 30000 ? 16 : area > 15000 ? 13 : area > 5000 ? 10 : 8;
          const pctSize = area > 30000 ? 14 : area > 15000 ? 11 : area > 5000 ? 9 : 7;
          const showEmoji = area > 8000;
          const showPct = innerW > 30 && innerH > 20;
          const showName = innerW > 25 && innerH > 15;

          return (
            <g
              key={sector.id}
              onMouseEnter={() => setHovered(sector.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-default"
            >
              <rect
                x={innerX}
                y={innerY}
                width={innerW}
                height={innerH}
                rx={4}
                fill={color}
                opacity={isHovered ? 0.85 : 1}
              />
              {showName && (
                <text
                  x={innerX + innerW / 2}
                  y={innerY + innerH / 2 - (showPct ? pctSize * 0.4 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={nameSize}
                  fontWeight="700"
                  fontFamily="Pretendard, sans-serif"
                >
                  {showEmoji ? `${sector.emoji} ` : ""}{sector.name}
                </text>
              )}
              {showPct && (
                <text
                  x={innerX + innerW / 2}
                  y={innerY + innerH / 2 + nameSize * 0.7}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(255,255,255,0.85)"
                  fontSize={pctSize}
                  fontWeight="600"
                  fontFamily="Pretendard, sans-serif"
                >
                  {formatPct(sector.avgChangePercent)}
                </text>
              )}
              {/* 호버 툴팁 */}
              {isHovered && (
                <title>
                  {sector.emoji} {sector.name}: {formatPct(sector.avgChangePercent)} (상승 {(sector.advancerRatio * 100).toFixed(0)}%)
                </title>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
