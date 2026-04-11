"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface Factor {
  name: string;
  score: number;
  description: string;
}

interface FearGreedData {
  score: number;
  label: string;
  factors: Factor[];
  updatedAt: number;
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#e53935";
  if (score >= 55) return "#ef5350";
  if (score >= 45) return "#fdd835";
  if (score >= 25) return "#42a5f5";
  return "#1e88e5";
}

function getScoreTextColor(score: number): string {
  if (score >= 75) return "text-[#e53935]";
  if (score >= 55) return "text-toss-red";
  if (score >= 45) return "text-yellow-400";
  if (score >= 25) return "text-toss-blue";
  return "text-[#1e88e5]";
}

function getBarColor(score: number): string {
  if (score >= 16) return "bg-toss-red";
  if (score >= 12) return "bg-toss-red/60";
  if (score >= 8) return "bg-yellow-500";
  if (score >= 5) return "bg-toss-blue/60";
  return "bg-toss-blue";
}

// 반원형 게이지 SVG
function GaugeArc({ score }: { score: number }) {
  const radius = 80;
  const cx = 100;
  const cy = 95;
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalAngle = startAngle - endAngle;
  const needleAngle = startAngle - (score / 100) * totalAngle;

  // 배경 호
  const bgStartX = cx + radius * Math.cos(startAngle);
  const bgStartY = cy - radius * Math.sin(startAngle);
  const bgEndX = cx + radius * Math.cos(endAngle);
  const bgEndY = cy - radius * Math.sin(endAngle);

  // 값 호
  const valEndX = cx + radius * Math.cos(needleAngle);
  const valEndY = cy - radius * Math.sin(needleAngle);
  const largeArc = score > 50 ? 1 : 0;

  // 바늘
  const needleLen = radius - 10;
  const needleTipX = cx + needleLen * Math.cos(needleAngle);
  const needleTipY = cy - needleLen * Math.sin(needleAngle);

  const color = getScoreColor(score);

  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[280px] mx-auto">
      {/* 배경 호 */}
      <path
        d={`M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 1 1 ${bgEndX} ${bgEndY}`}
        fill="none"
        stroke="#26262C"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* 그라데이션 배경 (공포→탐욕) */}
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e88e5" />
          <stop offset="30%" stopColor="#42a5f5" />
          <stop offset="50%" stopColor="#fdd835" />
          <stop offset="70%" stopColor="#ef5350" />
          <stop offset="100%" stopColor="#e53935" />
        </linearGradient>
      </defs>
      <path
        d={`M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 1 1 ${bgEndX} ${bgEndY}`}
        fill="none"
        stroke="url(#gaugeGrad)"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* 값 호 */}
      {score > 0 && (
        <path
          d={`M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 ${largeArc} 1 ${valEndX} ${valEndY}`}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
        />
      )}
      {/* 바늘 */}
      <line
        x1={cx}
        y1={cy}
        x2={needleTipX}
        y2={needleTipY}
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="4" fill="white" />
      {/* 라벨 */}
      <text x="20" y="108" fill="#8B8B95" fontSize="8" fontFamily="Pretendard, sans-serif">공포</text>
      <text x="165" y="108" fill="#8B8B95" fontSize="8" fontFamily="Pretendard, sans-serif">탐욕</text>
    </svg>
  );
}

export function FearGreedGauge() {
  const [data, setData] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fear-greed")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">공포 & 탐욕 지수</CardTitle>
        </CardHeader>
        <div className="flex justify-center py-8">
          <div className="w-2 h-2 bg-dark-text-muted rounded-full animate-bounce" />
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const textColor = getScoreTextColor(data.score);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">공포 & 탐욕 지수</CardTitle>
      </CardHeader>

      <div className="flex flex-col items-center">
        <GaugeArc score={data.score} />
        <div className="text-center -mt-2">
          <p className={`text-3xl font-bold ${textColor}`}>{data.score}</p>
          <p className={`text-sm font-semibold ${textColor}`}>{data.label}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {data.factors.map((factor) => (
          <div key={factor.name} className="flex items-center gap-3">
            <div className="w-24 text-xs text-dark-text-secondary truncate">{factor.name}</div>
            <div className="flex-1 h-2 bg-dark-elevated rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getBarColor(factor.score)}`}
                style={{ width: `${(factor.score / 20) * 100}%` }}
              />
            </div>
            <div className="w-8 text-xs text-dark-text-muted text-right">{factor.score}</div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-dark-text-muted text-center mt-3">
        5개 지표 종합 · VIX + 미국/한국 시장 + 금 + 비트코인
      </p>
    </Card>
  );
}
