"use client";

import { useState, useEffect, useRef } from "react";

interface AnalysisData {
  companyOverview: string;
  mainProducts: string;
  businessModel: string;
  financialAnalysis: string;
  summary: string;
  opinion: string;
  targetPrice: number;
  buyPrice: number;
  targetReasoning: string;
  buyReasoning: string;
  risks: string;
  opportunities: string;
}

interface CompanyInfo {
  industry: string;
  ceo: string;
  established: string;
  homepage: string;
}

interface NewsLink {
  title: string;
  url: string;
}

interface AIAnalysisChatProps {
  ticker: string;
  companyName: string;
}

export function AIAnalysisChat({ ticker, companyName }: AIAnalysisChatProps) {
  const [open, setOpen] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [news, setNews] = useState<NewsLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || fetched) return;
    setLoading(true);

    fetch(`/api/stock/${ticker}/ai-summary`)
      .then((res) => res.json())
      .then((data) => {
        setAnalysis(data.analysis ?? null);
        setCompanyInfo(data.companyInfo ?? null);
        setNews(data.news ?? []);
        setFetched(true);
      })
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false));
  }, [open, fetched, ticker]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [analysis, loading]);

  const opinionColor =
    analysis?.opinion === "매수"
      ? "text-toss-red"
      : analysis?.opinion === "매도"
      ? "text-toss-blue"
      : "text-dark-text-secondary";

  const opinionBg =
    analysis?.opinion === "매수"
      ? "bg-toss-red/15"
      : analysis?.opinion === "매도"
      ? "bg-toss-blue/15"
      : "bg-dark-elevated";

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 bg-toss-blue hover:bg-toss-blue-dark text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[80vh] sm:max-h-[75vh] bg-dark-card border border-dark-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-dark-border flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-toss-blue/15 rounded-full flex items-center justify-center">
              <span className="text-sm">🤖</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-dark-text-primary">AI 기업 분석</p>
              <p className="text-xs text-dark-text-muted">{companyName} ({ticker})</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            <ChatBubble>
              {companyName} 종합 기업 분석 리포트입니다.
            </ChatBubble>

            {loading && (
              <ChatBubble>
                <span className="flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-dark-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-dark-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-dark-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  <span className="text-dark-text-muted text-xs">DART + 뉴스 데이터 분석 중...</span>
                </span>
              </ChatBubble>
            )}

            {!loading && analysis && (
              <>
                {/* 기업 개요 */}
                {companyInfo && (
                  <ChatBubble>
                    <p className="text-xs font-semibold text-toss-blue mb-1.5">🏢 기업 정보</p>
                    <div className="space-y-1 text-xs">
                      {companyInfo.industry && <p><span className="text-dark-text-muted">업종:</span> <span className="text-dark-text-primary">{companyInfo.industry}</span></p>}
                      {companyInfo.ceo && <p><span className="text-dark-text-muted">대표:</span> <span className="text-dark-text-primary">{companyInfo.ceo}</span></p>}
                      {companyInfo.established && <p><span className="text-dark-text-muted">설립:</span> <span className="text-dark-text-primary">{companyInfo.established}</span></p>}
                      {companyInfo.homepage && <p><span className="text-dark-text-muted">홈페이지:</span> <a href={`https://${companyInfo.homepage}`} target="_blank" rel="noopener noreferrer" className="text-toss-blue hover:underline">{companyInfo.homepage}</a></p>}
                    </div>
                  </ChatBubble>
                )}

                {/* 뭐하는 회사? */}
                {analysis.companyOverview && (
                  <ChatBubble>
                    <p className="text-xs font-semibold text-toss-green mb-1.5">🔍 이 회사는 뭐하는 곳?</p>
                    {analysis.companyOverview}
                  </ChatBubble>
                )}

                {/* 주요 제품/상품 */}
                {analysis.mainProducts && (
                  <ChatBubble>
                    <p className="text-xs font-semibold text-purple-400 mb-1.5">📦 주요 제품/상품</p>
                    {analysis.mainProducts}
                  </ChatBubble>
                )}

                {/* 어떻게 돈 버나? */}
                {analysis.businessModel && (
                  <ChatBubble>
                    <p className="text-xs font-semibold text-yellow-400 mb-1.5">💰 어떻게 돈을 버나?</p>
                    {analysis.businessModel}
                  </ChatBubble>
                )}

                {/* 재무 분석 */}
                {analysis.financialAnalysis && (
                  <ChatBubble>
                    <p className="text-xs font-semibold text-toss-blue mb-1.5">📊 재무 상태는?</p>
                    {analysis.financialAnalysis}
                  </ChatBubble>
                )}

                {/* 투자 의견 + 가격 */}
                <ChatBubble>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${opinionColor}`}>
                        투자의견: {analysis.opinion}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${opinionBg} ${opinionColor}`}>
                        {analysis.opinion}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-dark-bg rounded-lg p-3">
                        <p className="text-xs text-dark-text-muted mb-1">🎯 목표가</p>
                        <p className="text-lg font-bold text-toss-red">
                          {analysis.targetPrice > 0 ? `${analysis.targetPrice.toLocaleString()}원` : "-"}
                        </p>
                      </div>
                      <div className="bg-dark-bg rounded-lg p-3">
                        <p className="text-xs text-dark-text-muted mb-1">💰 추천매수가</p>
                        <p className="text-lg font-bold text-toss-blue">
                          {analysis.buyPrice > 0 ? `${analysis.buyPrice.toLocaleString()}원` : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                </ChatBubble>

                {/* 종합 분석 */}
                <ChatBubble>
                  <p className="text-xs font-semibold text-dark-text-primary mb-1.5">📝 종합 판단</p>
                  {analysis.summary}
                </ChatBubble>

                {/* 목표가/매수가 근거 */}
                {analysis.targetReasoning && (
                  <ChatBubble>
                    <p className="text-xs font-semibold text-toss-red mb-1.5">🎯 목표가 근거</p>
                    {analysis.targetReasoning}
                  </ChatBubble>
                )}
                {analysis.buyReasoning && (
                  <ChatBubble>
                    <p className="text-xs font-semibold text-toss-blue mb-1.5">💰 매수가 근거</p>
                    {analysis.buyReasoning}
                  </ChatBubble>
                )}

                {/* 기회/리스크 */}
                {(analysis.opportunities || analysis.risks) && (
                  <ChatBubble>
                    {analysis.opportunities && (
                      <div className="mb-2">
                        <p className="text-xs font-semibold text-toss-green mb-1">✅ 기회 요인</p>
                        <p className="text-dark-text-secondary">{analysis.opportunities}</p>
                      </div>
                    )}
                    {analysis.risks && (
                      <div>
                        <p className="text-xs font-semibold text-toss-red mb-1">⚠️ 리스크</p>
                        <p className="text-dark-text-secondary">{analysis.risks}</p>
                      </div>
                    )}
                  </ChatBubble>
                )}

                {/* 관련 뉴스 */}
                {news.length > 0 && (
                  <ChatBubble>
                    <p className="text-xs font-semibold text-dark-text-primary mb-2">📰 관련 뉴스</p>
                    <div className="space-y-1.5">
                      {news.map((item, i) => (
                        <a
                          key={i}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-toss-blue hover:text-toss-blue-dark hover:underline leading-relaxed"
                        >
                          • {item.title}
                        </a>
                      ))}
                    </div>
                  </ChatBubble>
                )}

                <ChatBubble>
                  <span className="text-xs text-dark-text-muted">
                    ⚠️ AI 분석은 참고용이며 투자 판단의 책임은 본인에게 있습니다. DART + 네이버 금융 데이터 기반.
                  </span>
                </ChatBubble>
              </>
            )}

            {!loading && fetched && !analysis && (
              <ChatBubble>
                분석을 생성할 수 없습니다. OPENAI_API_KEY를 확인해주세요.
              </ChatBubble>
            )}
          </div>

          <div className="px-4 py-3 border-t border-dark-border flex-shrink-0">
            <p className="text-[11px] text-dark-text-muted text-center">
              GPT-4o · 30분 캐시 · DART 기업개황 + 재무제표 + 뉴스
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function ChatBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 bg-toss-blue/15 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs">🤖</span>
      </div>
      <div className="bg-dark-elevated rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[88%]">
        <div className="text-sm text-dark-text-primary leading-relaxed whitespace-pre-line">
          {children}
        </div>
      </div>
    </div>
  );
}
