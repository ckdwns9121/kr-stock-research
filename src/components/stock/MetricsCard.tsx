"use client";

import { useState } from "react";
import type { FinancialMetrics } from "@/types/financial";
import { formatRatio } from "@/lib/format";
import { timeAgo } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorCard } from "@/components/ui/ErrorCard";

interface MetricsCardProps {
  metrics: FinancialMetrics | null;
  stale?: boolean;
  cachedAt?: number;
}

const METRIC_EXPLANATIONS: Record<string, { desc: string; guide: string }> = {
  PER: {
    desc: "주가수익비율(Price to Earnings Ratio). 주가를 주당순이익(EPS)으로 나눈 값.",
    guide: "낮을수록 이익 대비 저평가. 업종 평균과 비교해야 의미 있음. 일반적으로 10~15배가 적정, 20배 이상이면 고평가 구간.",
  },
  PBR: {
    desc: "주가순자산비율(Price to Book Ratio). 주가를 주당순자산(BPS)으로 나눈 값.",
    guide: "1배 미만이면 장부가치보다 저평가. 1~2배가 보통, 3배 이상이면 프리미엄이 붙은 상태.",
  },
  ROE: {
    desc: "자기자본이익률(Return on Equity). 자기자본 대비 순이익 비율.",
    guide: "높을수록 자본을 효율적으로 활용. 10% 이상이면 양호, 15% 이상이면 우수. 워렌 버핏의 기준은 15% 이상.",
  },
  "EV/EBITDA": {
    desc: "기업가치를 세전영업이익으로 나눈 값. 기업의 실질 수익력 대비 가치를 평가.",
    guide: "낮을수록 저평가. 일반적으로 6~8배가 적정, 10배 이상이면 고평가 구간.",
  },
};

function MetricItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const explanation = METRIC_EXPLANATIONS[label];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="text-xs text-dark-text-muted font-medium">{label}</span>
        {explanation && (
          <button
            onClick={() => setShowHelp(!showHelp)}
            className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
              showHelp
                ? "bg-toss-blue text-white"
                : "bg-dark-elevated text-dark-text-muted hover:bg-dark-elevated"
            }`}
            aria-label={`${label} 설명`}
          >
            ?
          </button>
        )}
      </div>
      <span className="text-base font-bold text-dark-text-primary">{value}</span>
      {showHelp && explanation && (
        <div className="mt-1 p-2.5 bg-dark-elevated rounded-lg">
          <p className="text-xs text-dark-text-primary leading-relaxed">
            {explanation.desc}
          </p>
          <p className="text-xs text-toss-blue mt-1.5 leading-relaxed">
            {explanation.guide}
          </p>
        </div>
      )}
    </div>
  );
}

export function MetricsCard({ metrics, stale, cachedAt }: MetricsCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>밸류에이션</CardTitle>
          {stale && cachedAt && (
            <Badge variant="stale">{timeAgo(cachedAt)} 데이터</Badge>
          )}
        </div>
      </CardHeader>

      {!metrics ? (
        <ErrorCard variant="subtle" />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <MetricItem label="PER" value={`${formatRatio(metrics.per)}배`} />
          <MetricItem label="PBR" value={`${formatRatio(metrics.pbr)}배`} />
          <MetricItem label="ROE" value={`${formatRatio(metrics.roe)}%`} />
          <MetricItem
            label="EV/EBITDA"
            value={`${formatRatio(metrics.evEbitda)}배`}
          />
        </div>
      )}
    </Card>
  );
}
