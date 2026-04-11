"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

type InvestStyle = "aggressive" | "balanced" | "defensive";

interface PortfolioStock {
  name: string;
  ticker: string;
  weight: number;
  sector: string;
  buyReason: string;
  sellStrategy: string;
  stopLoss: string;
  targetReturn: string;
}

interface PortfolioData {
  style: string;
  marketView: string;
  stocks: PortfolioStock[];
  totalStocks: number;
  riskLevel: string;
  expectedReturn: string;
  rebalanceNote: string;
}

const STYLES: { key: InvestStyle; label: string; emoji: string; desc: string }[] = [
  { key: "aggressive", label: "공격형", emoji: "🔥", desc: "성장주·소형주 중심, 높은 수익 추구" },
  { key: "balanced", label: "중립형", emoji: "⚖️", desc: "성장과 안정의 균형" },
  { key: "defensive", label: "방어형", emoji: "🛡️", desc: "우량주·배당주 중심, 자본 보전" },
];

const WEIGHT_COLORS = [
  "bg-toss-blue", "bg-toss-red", "bg-toss-green", "bg-purple-500",
  "bg-yellow-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500",
  "bg-lime-500", "bg-indigo-500", "bg-rose-500", "bg-emerald-500",
];

export default function PortfolioPage() {
  const [style, setStyle] = useState<InvestStyle>("balanced");
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  async function generate() {
    setLoading(true);
    setPortfolio(null);
    setExpandedIdx(null);
    try {
      const res = await fetch(`/api/portfolio/ai?style=${style}`);
      const data = await res.json();
      setPortfolio(data.portfolio ?? null);
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-dark-text-primary">AI 포트폴리오</h1>
        <p className="text-sm text-dark-text-secondary mt-1">
          현재 시장을 분석하여 투자 성향에 맞는 최적 포트폴리오를 AI가 자동 구성합니다
        </p>
      </section>

      {/* 투자 성향 선택 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STYLES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStyle(s.key)}
            className={`p-4 rounded-xl border text-left transition-all ${
              style === s.key
                ? "border-toss-blue bg-toss-blue/10"
                : "border-dark-border bg-dark-card hover:border-dark-text-muted"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{s.emoji}</span>
              <span className={`text-sm font-bold ${style === s.key ? "text-toss-blue" : "text-dark-text-primary"}`}>
                {s.label}
              </span>
            </div>
            <p className="text-xs text-dark-text-muted">{s.desc}</p>
          </button>
        ))}
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={generate}
        disabled={loading}
        className="w-full py-3 bg-toss-blue hover:bg-toss-blue-dark disabled:bg-dark-elevated disabled:text-dark-text-muted text-white font-semibold rounded-xl transition-colors"
      >
        {loading ? "시장 분석 중... (30초 소요)" : "AI 포트폴리오 생성"}
      </button>

      {loading && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-sm text-dark-text-secondary">글로벌 시장 + 한국 시장 + 뉴스 분석 → 포트폴리오 구성 중</p>
          </div>
        </Card>
      )}

      {portfolio && (
        <>
          {/* 시장 분석 */}
          <Card className="border border-toss-blue/20">
            <CardHeader>
              <CardTitle className="text-base">📊 현재 시장 분석</CardTitle>
            </CardHeader>
            <p className="text-sm text-dark-text-primary leading-relaxed">{portfolio.marketView}</p>
            <div className="flex gap-4 mt-3 text-xs text-dark-text-muted">
              <span>투자 성향: <span className="text-dark-text-primary font-semibold">{portfolio.style}</span></span>
              <span>위험도: <span className="text-dark-text-primary font-semibold">{portfolio.riskLevel}</span></span>
              <span>예상 수익: <span className="text-toss-red font-semibold">{portfolio.expectedReturn}</span></span>
            </div>
          </Card>

          {/* 비중 차트 (가로 바) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">📈 포트폴리오 구성 ({portfolio.totalStocks}종목)</CardTitle>
            </CardHeader>
            <div className="flex w-full h-8 rounded-lg overflow-hidden mb-3">
              {portfolio.stocks.map((stock, i) => (
                <div
                  key={stock.ticker}
                  className={`${WEIGHT_COLORS[i % WEIGHT_COLORS.length]} flex items-center justify-center text-[10px] text-white font-bold overflow-hidden`}
                  style={{ width: `${stock.weight}%` }}
                  title={`${stock.name} ${stock.weight}%`}
                >
                  {stock.weight >= 8 ? `${stock.name} ${stock.weight}%` : stock.weight >= 5 ? `${stock.weight}%` : ""}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {portfolio.stocks.map((stock, i) => (
                <span key={stock.ticker} className="flex items-center gap-1 text-xs text-dark-text-secondary">
                  <span className={`w-2 h-2 rounded-full ${WEIGHT_COLORS[i % WEIGHT_COLORS.length]}`} />
                  {stock.name} {stock.weight}%
                </span>
              ))}
            </div>
          </Card>

          {/* 종목별 상세 */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-dark-text-primary">종목별 전략</h2>
            {portfolio.stocks.map((stock, i) => {
              const isExpanded = expandedIdx === i;
              return (
                <Card key={stock.ticker} className="border border-dark-border">
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${WEIGHT_COLORS[i % WEIGHT_COLORS.length]}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/stock/${stock.ticker}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-semibold text-dark-text-primary hover:text-toss-blue"
                          >
                            {stock.name}
                          </Link>
                          <span className="text-xs text-dark-text-muted">{stock.ticker}</span>
                          <span className="text-xs bg-dark-elevated text-dark-text-secondary px-2 py-0.5 rounded">{stock.sector}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-toss-blue">{stock.weight}%</span>
                      <span className="text-xs text-toss-red font-semibold">{stock.targetReturn}</span>
                      <span className="text-dark-text-muted text-sm">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t border-dark-border pt-4">
                      <div>
                        <p className="text-xs font-semibold text-toss-green mb-1">✅ 매수 이유</p>
                        <p className="text-sm text-dark-text-primary leading-relaxed">{stock.buyReason}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-toss-blue mb-1">🎯 매도 전략</p>
                        <p className="text-sm text-dark-text-primary leading-relaxed">{stock.sellStrategy}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-toss-red mb-1">🛑 손절 전략</p>
                        <p className="text-sm text-dark-text-primary leading-relaxed">{stock.stopLoss}</p>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* 리밸런싱 노트 */}
          <Card className="border border-dark-border">
            <p className="text-xs text-dark-text-muted mb-1">🔄 리밸런싱 가이드</p>
            <p className="text-sm text-dark-text-primary">{portfolio.rebalanceNote}</p>
          </Card>

          <p className="text-[11px] text-dark-text-muted text-center">
            ⚠️ AI 포트폴리오는 참고용이며 투자 판단의 책임은 본인에게 있습니다. 30분 캐시 · GPT-4o 기반
          </p>
        </>
      )}
    </div>
  );
}
