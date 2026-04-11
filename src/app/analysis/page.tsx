"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAnalyses,
  saveAnalysis,
  deleteAnalysis,
  type AnalysisEntry,
  type AIFeedback,
} from "@/lib/analysis-storage";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-green-900/30 text-green-400"
      : score >= 60
      ? "bg-yellow-900/30 text-yellow-400"
      : score >= 40
      ? "bg-orange-900/30 text-orange-400"
      : "bg-red-900/30 text-red-400";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${color}`}>
      {score}점
    </span>
  );
}

function FeedbackCard({ feedback }: { feedback: AIFeedback }) {
  return (
    <div className="space-y-4">
      {/* 평가 결과 */}
      <div className="bg-dark-card rounded-xl border border-dark-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-dark-text-primary">AI 평가</span>
          <ScoreBadge score={feedback.score} />
        </div>

        {feedback.pros.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-green-400 mb-2">✓ 잘 분석한 점</h3>
            <ul className="space-y-1">
              {feedback.pros.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-dark-text-primary">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">●</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {feedback.cons.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-2">✗ 미검토 / 보완 필요</h3>
            <ul className="space-y-1">
              {feedback.cons.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-dark-text-primary">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">●</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {feedback.summary && (
          <div className="pt-3 border-t border-dark-border">
            <h3 className="text-sm font-semibold text-dark-text-secondary mb-1">→ 종합 코멘트</h3>
            <p className="text-sm text-dark-text-primary leading-relaxed">{feedback.summary}</p>
          </div>
        )}
      </div>

      {/* 모범 답안 */}
      {feedback.modelAnswer && (
        <div className="bg-dark-card rounded-xl border border-toss-blue/20 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <h3 className="text-lg font-bold text-dark-text-primary">모범 답안</h3>
            <span className="text-xs bg-toss-blue/15 text-toss-blue px-2 py-0.5 rounded-md font-medium">
              20년차 애널리스트
            </span>
          </div>
          <p className="text-sm text-dark-text-primary leading-relaxed whitespace-pre-line">
            {feedback.modelAnswer}
          </p>
        </div>
      )}

      {/* 학습 가이드 */}
      {feedback.studyGuide && feedback.studyGuide.length > 0 && (
        <div className="bg-dark-card rounded-xl border border-toss-green/20 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <h3 className="text-lg font-bold text-dark-text-primary">학습 가이드</h3>
          </div>
          <p className="text-xs text-dark-text-secondary mb-2">
            이 종목을 더 잘 분석하기 위해 공부하면 좋을 주제들입니다.
          </p>
          <ul className="space-y-2">
            {feedback.studyGuide.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-dark-text-primary">
                <span className="bg-toss-green/15 text-toss-green text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const [ticker, setTicker] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [analysisText, setAnalysisText] = useState("");
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("ticker");
    if (t) setTicker(t.toUpperCase());
  }, []);

  const loadHistory = useCallback(() => {
    setHistory(getAnalyses());
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim() || !analysisText.trim()) return;

    setLoading(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.trim().toUpperCase(),
          myAnalysis: analysisText,
          companyName: companyName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "AI 평가 중 오류가 발생했습니다.");
        return;
      }

      const fb = data as AIFeedback;
      setFeedback(fb);

      const entry: AnalysisEntry = {
        id: crypto.randomUUID(),
        ticker: ticker.trim().toUpperCase(),
        companyName: companyName.trim() || ticker.trim().toUpperCase(),
        date: new Date().toISOString(),
        myAnalysis: analysisText,
        aiScore: fb.score,
        aiFeedback: fb,
      };
      saveAnalysis(entry);
      loadHistory();
    } catch {
      setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(id: string) {
    deleteAnalysis(id);
    loadHistory();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-text-primary">종목 분석 훈련</h1>
        <p className="text-sm text-dark-text-secondary mt-1">
          종목에 대한 분석을 자유롭게 작성하면 AI가 실제 재무데이터와 교차 검증해 피드백과 모범 답안을 제공합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-dark-card rounded-xl border border-dark-border p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-dark-text-primary mb-1">
              종목코드 <span className="text-toss-red">*</span>
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="예: 005930"
              maxLength={6}
              required
              className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg text-sm text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text-primary mb-1">
              종목명 (선택)
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="예: 삼성전자"
              className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg text-sm text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-text-primary mb-1">
            내 분석 <span className="text-toss-red">*</span>
          </label>
          <textarea
            value={analysisText}
            onChange={(e) => setAnalysisText(e.target.value)}
            placeholder={`예시:\n삼성전자는 현재 PER 12배로 역사적 저점 근처에 있고, 반도체 업황이 바닥을 다지는 시점이라 매수 적기라고 생각한다.\nHBM 시장에서 SK하이닉스에 밀리고 있다는 리스크가 있지만, 파운드리 사업과 가전 부문이 하방을 지지한다.`}
            rows={7}
            required
            className="w-full px-3 py-2 bg-dark-elevated border border-dark-border rounded-lg text-sm text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue resize-y"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !ticker.trim() || !analysisText.trim()}
          className="w-full py-2.5 px-4 bg-toss-blue hover:bg-toss-blue-dark disabled:bg-dark-elevated disabled:text-dark-text-muted disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? "AI 평가 중…" : "AI 평가 받기"}
        </button>
      </form>

      {feedback && <FeedbackCard feedback={feedback} />}

      <div className="bg-dark-card rounded-xl border border-dark-border">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-base font-semibold text-dark-text-primary">
            분석 히스토리 ({history.length})
          </span>
          <span className="text-dark-text-muted text-sm">{showHistory ? "▲" : "▼"}</span>
        </button>

        {showHistory && (
          <div className="border-t border-dark-border">
            {history.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-dark-text-muted">
                아직 저장된 분석이 없습니다.
              </p>
            ) : (
              <ul className="divide-y divide-dark-border">
                {history.map((entry) => (
                  <li key={entry.id} className="px-6 py-4 hover:bg-dark-elevated transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-dark-text-primary">
                            {entry.companyName}
                          </span>
                          <span className="text-xs text-dark-text-muted">({entry.ticker})</span>
                          <ScoreBadge score={entry.aiScore} />
                        </div>
                        <p className="text-xs text-dark-text-secondary mb-1.5">
                          {new Date(entry.date).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-sm text-dark-text-secondary line-clamp-2">{entry.myAnalysis}</p>
                        {entry.aiFeedback.summary && (
                          <p className="text-xs text-dark-text-muted mt-1 line-clamp-1">
                            → {entry.aiFeedback.summary}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setTicker(entry.ticker);
                            setCompanyName(entry.companyName);
                            setAnalysisText(entry.myAnalysis);
                            setFeedback(entry.aiFeedback);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="text-xs text-toss-blue hover:text-toss-blue-dark font-medium"
                        >
                          다시 보기
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
