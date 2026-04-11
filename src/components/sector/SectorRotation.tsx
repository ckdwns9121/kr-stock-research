"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

const PHASES = [
  { id: "recovery", label: "회복기", en: "Recovery" },
  { id: "expansion", label: "확장기", en: "Expansion" },
  { id: "slowdown", label: "둔화기", en: "Slowdown" },
  { id: "recession", label: "침체기", en: "Recession" },
] as const;

type PhaseId = (typeof PHASES)[number]["id"];

// Current phase — can be driven by props/API later
const CURRENT_PHASE_ID: PhaseId = "slowdown";

const PHASE_SECTORS: {
  phase: string;
  phaseId: PhaseId;
  sectors: string;
  reason: string;
}[] = [
  { phase: "회복기", phaseId: "recovery", sectors: "금융, 소비재", reason: "금리 하락, 소비 회복" },
  { phase: "확장기", phaseId: "expansion", sectors: "기술, 산업재", reason: "실적 성장 가속" },
  { phase: "둔화기", phaseId: "slowdown", sectors: "에너지, 소재", reason: "인플레이션 헤지" },
  { phase: "침체기", phaseId: "recession", sectors: "헬스케어, 유틸리티", reason: "방어적 수요" },
];

const CORRELATIONS = [
  { pair: "반도체 ↔ 전자장비", type: "positive" as const, label: "높은 양의 상관관계" },
  { pair: "금융 ↔ 기술", type: "neutral" as const, label: "낮은 상관관계 (분산투자 효과)" },
  { pair: "에너지 ↔ 유틸리티", type: "negative" as const, label: "역의 상관관계" },
  { pair: "바이오 ↔ 소비재", type: "positive" as const, label: "중간 양의 상관관계" },
  { pair: "조선·기계 ↔ 2차전지", type: "positive" as const, label: "높은 양의 상관관계" },
  { pair: "통신·미디어 ↔ 반도체", type: "negative" as const, label: "약한 역의 상관관계" },
];

const correlationColor: Record<"positive" | "neutral" | "negative", string> = {
  positive: "text-toss-blue",
  neutral: "text-dark-text-muted",
  negative: "text-toss-red",
};

const correlationDot: Record<"positive" | "neutral" | "negative", string> = {
  positive: "bg-toss-blue",
  neutral: "bg-dark-text-muted",
  negative: "bg-toss-red",
};

export function SectorRotation() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>섹터 로테이션 & 상관관계</CardTitle>
        <p className="text-xs text-dark-text-muted mt-0.5">경기 사이클에 따른 섹터 전략</p>
      </CardHeader>

      {/* Economic Cycle Bar */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-dark-text-secondary mb-3">📊 경기 사이클 다이어그램</p>
        <div className="grid grid-cols-4 gap-1 rounded-xl overflow-hidden">
          {PHASES.map((phase) => {
            const isCurrent = phase.id === CURRENT_PHASE_ID;
            return (
              <div
                key={phase.id}
                className={`relative py-3 px-2 text-center transition-colors ${
                  isCurrent
                    ? "bg-toss-blue text-white"
                    : "bg-dark-elevated text-dark-text-muted"
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                )}
                <p className={`text-xs font-semibold ${isCurrent ? "text-white" : "text-dark-text-secondary"}`}>
                  {phase.label}
                </p>
                <p className={`text-[10px] mt-0.5 ${isCurrent ? "text-blue-100" : "text-dark-text-muted"}`}>
                  {phase.en}
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center mt-2 gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-toss-blue" />
          <p className="text-xs text-dark-text-muted">
            현재 국면: <span className="text-toss-blue font-medium">둔화기</span>
          </p>
        </div>
      </div>

      {/* Phase Sector Table */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-dark-text-secondary mb-3">🔄 국면별 추천 섹터</p>
        <div className="rounded-xl overflow-hidden border border-dark-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-dark-elevated">
                <th className="text-left py-2 px-3 text-dark-text-muted font-medium">국면</th>
                <th className="text-left py-2 px-3 text-dark-text-muted font-medium">추천 섹터</th>
                <th className="text-left py-2 px-3 text-dark-text-muted font-medium hidden sm:table-cell">이유</th>
              </tr>
            </thead>
            <tbody>
              {PHASE_SECTORS.map((row, i) => {
                const isCurrent = row.phaseId === CURRENT_PHASE_ID;
                return (
                  <tr
                    key={row.phase}
                    className={`border-t border-dark-border ${
                      isCurrent ? "bg-toss-blue/10" : i % 2 === 0 ? "bg-dark-card" : "bg-dark-elevated/50"
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className={`font-semibold ${isCurrent ? "text-toss-blue" : "text-dark-text-primary"}`}>
                        {isCurrent && "▶ "}{row.phase}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 font-medium ${isCurrent ? "text-toss-blue" : "text-dark-text-secondary"}`}>
                      {row.sectors}
                    </td>
                    <td className="py-2.5 px-3 text-dark-text-muted hidden sm:table-cell">
                      {row.reason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Correlations */}
      <div>
        <p className="text-xs font-semibold text-dark-text-secondary mb-3">🔗 섹터 상관관계 힌트</p>
        <div className="space-y-2">
          {CORRELATIONS.map((c) => (
            <div key={c.pair} className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${correlationDot[c.type]}`} />
              <div>
                <span className={`text-xs font-medium ${correlationColor[c.type]}`}>{c.pair}</span>
                <span className="text-xs text-dark-text-muted ml-2">{c.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
