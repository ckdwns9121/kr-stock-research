"use client";

import { useEffect, useState } from "react";

interface TenbaggerAnalysis {
  tenbaggerScore: number;
  growthStory: string;
  catalysts: string[];
  risks: string[];
  similarCases: string;
  verdict: "매수적극추천" | "매수" | "관망" | "매도";
  timeHorizon: string;
}

interface TenbaggerDetailProps {
  ticker: string;
  name: string;
  score: number;
  onClose: () => void;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-toss-green";
  if (score >= 50) return "text-toss-blue";
  if (score >= 30) return "text-yellow-400";
  return "text-toss-red";
}

function verdictStyle(verdict: string): { bg: string; text: string } {
  switch (verdict) {
    case "매수적극추천":
      return { bg: "bg-toss-green/20", text: "text-toss-green" };
    case "매수":
      return { bg: "bg-toss-blue/20", text: "text-toss-blue" };
    case "관망":
      return { bg: "bg-yellow-500/20", text: "text-yellow-400" };
    case "매도":
      return { bg: "bg-toss-red/20", text: "text-toss-red" };
    default:
      return { bg: "bg-dark-elevated", text: "text-dark-text-secondary" };
  }
}

export default function TenbaggerDetail({
  ticker,
  name,
  score,
  onClose,
}: TenbaggerDetailProps) {
  const [analysis, setAnalysis] = useState<TenbaggerAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/discovery/${ticker}`);
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (!cancelled) {
          if (json.analysis) {
            setAnalysis(json.analysis as TenbaggerAnalysis);
          } else {
            setError(true);
          }
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const vStyle = analysis ? verdictStyle(analysis.verdict) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex flex-col w-[480px] h-full bg-dark-card border-l border-dark-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-elevated flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-xs text-dark-text-muted font-medium">{ticker}</p>
              <h2 className="text-dark-text-primary font-bold text-lg leading-tight truncate">
                {name}
              </h2>
            </div>
            <span
              className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                score >= 70
                  ? "bg-toss-green/20 text-toss-green"
                  : score >= 50
                  ? "bg-toss-blue/20 text-toss-blue"
                  : "bg-dark-elevated text-dark-text-secondary"
              }`}
            >
              {score}점
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-dark-elevated text-dark-text-secondary hover:text-dark-text-primary transition-colors"
            aria-label="닫기"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-toss-blue/30 border-t-toss-blue animate-spin" />
              <p className="text-dark-text-secondary text-sm text-center leading-relaxed">
                AI가 텐배거 가능성을
                <br />
                분석하고 있습니다...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-3xl">😔</p>
              <p className="text-dark-text-secondary text-sm text-center">
                분석을 생성할 수 없습니다
              </p>
              <p className="text-dark-text-muted text-xs text-center">
                OPENAI_API_KEY가 설정되어 있는지 확인하세요
              </p>
            </div>
          )}

          {!loading && !error && analysis && (
            <>
              {/* Tenbagger Score */}
              <div className="bg-dark-elevated rounded-2xl p-5">
                <p className="text-dark-text-muted text-xs font-medium mb-2">🎯 텐배거 스코어</p>
                <div className="flex items-end gap-2">
                  <span className={`text-5xl font-black ${scoreColor(analysis.tenbaggerScore)}`}>
                    {analysis.tenbaggerScore}
                  </span>
                  <span className="text-dark-text-muted text-lg mb-1">/100</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-dark-card overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      analysis.tenbaggerScore >= 75
                        ? "bg-toss-green"
                        : analysis.tenbaggerScore >= 50
                        ? "bg-toss-blue"
                        : analysis.tenbaggerScore >= 30
                        ? "bg-yellow-400"
                        : "bg-toss-red"
                    }`}
                    style={{ width: `${analysis.tenbaggerScore}%` }}
                  />
                </div>
              </div>

              {/* Growth Story */}
              <div className="bg-dark-elevated rounded-2xl p-5">
                <p className="text-dark-text-muted text-xs font-medium mb-3">📈 성장 스토리</p>
                <p className="text-dark-text-primary text-sm leading-relaxed">
                  {analysis.growthStory}
                </p>
              </div>

              {/* Catalysts */}
              <div className="bg-dark-elevated rounded-2xl p-5">
                <p className="text-dark-text-muted text-xs font-medium mb-3">⚡ 성장 촉매</p>
                <ol className="space-y-2">
                  {analysis.catalysts.map((catalyst, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-toss-blue/20 text-toss-blue text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-dark-text-primary leading-relaxed">{catalyst}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Risks */}
              <div className="bg-dark-elevated rounded-2xl p-5">
                <p className="text-dark-text-muted text-xs font-medium mb-3">⚠️ 핵심 리스크</p>
                <ul className="space-y-2">
                  {analysis.risks.map((risk, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-toss-red" />
                      <span className="text-dark-text-primary leading-relaxed">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Similar Cases */}
              {analysis.similarCases && (
                <div className="bg-dark-elevated rounded-2xl p-5">
                  <p className="text-dark-text-muted text-xs font-medium mb-3">📊 유사 사례</p>
                  <p className="text-dark-text-primary text-sm leading-relaxed">
                    {analysis.similarCases}
                  </p>
                </div>
              )}

              {/* Verdict */}
              <div className="bg-dark-elevated rounded-2xl p-5">
                <p className="text-dark-text-muted text-xs font-medium mb-3">🏷️ 투자의견</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {vStyle && (
                    <span
                      className={`text-sm font-bold px-4 py-1.5 rounded-full ${vStyle.bg} ${vStyle.text}`}
                    >
                      {analysis.verdict}
                    </span>
                  )}
                  {analysis.timeHorizon && (
                    <span className="text-dark-text-secondary text-sm">
                      ⏱ {analysis.timeHorizon}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-dark-border bg-dark-elevated">
          <p className="text-dark-text-muted text-xs text-center">
            AI 분석은 참고용이며 투자 권유가 아닙니다
          </p>
        </div>
      </div>
    </div>
  );
}
