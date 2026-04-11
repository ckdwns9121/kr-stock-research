import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchStockSummary, fetchNaverMetrics, fetchCompanyNews } from "@/lib/api/naver";

interface TenbaggerAnalysis {
  tenbaggerScore: number;
  growthStory: string;
  catalysts: string[];
  risks: string[];
  similarCases: string;
  verdict: "매수적극추천" | "매수" | "관망" | "매도";
  timeHorizon: string;
}

interface CacheEntry {
  data: TenbaggerAnalysis;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes per ticker

const SYSTEM_PROMPT = `당신은 20년차 한국 주식 시장 수석 애널리스트입니다. 제공된 데이터를 바탕으로 이 종목의 텐배거(10배 성장) 가능성을 분석하세요.

반드시 JSON으로만 응답:
{
  "tenbaggerScore": 0-100,
  "growthStory": "왜 이 종목이 10배 갈 수 있는지 성장 스토리 3-5문장",
  "catalysts": ["성장 촉매 3-5개"],
  "risks": ["핵심 리스크 3-5개"],
  "similarCases": "과거 유사한 성장을 보인 종목 사례 1-2개 언급",
  "verdict": "매수적극추천" | "매수" | "관망" | "매도",
  "timeHorizon": "예상 투자 기간 (예: 2-3년)"
}`;

export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ analysis: null });
  }

  const { ticker } = params;

  const cached = cache.get(ticker);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({ analysis: cached.data });
  }

  const [summaryResult, metricsResult, newsResult] = await Promise.allSettled([
    fetchStockSummary(ticker),
    fetchNaverMetrics(ticker),
    fetchCompanyNews(ticker),
  ]);

  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const metrics = metricsResult.status === "fulfilled" ? metricsResult.value : null;
  const news = newsResult.status === "fulfilled" ? newsResult.value : [];

  const lines: string[] = [];
  lines.push(`종목코드: ${ticker}`);
  if (summary?.name) lines.push(`종목명: ${summary.name}`);
  if (summary?.currentPrice) lines.push(`현재가: ${summary.currentPrice.toLocaleString()}원`);
  if (summary?.changePercent != null) lines.push(`등락률: ${summary.changePercent > 0 ? "+" : ""}${summary.changePercent.toFixed(2)}%`);
  if (summary?.marketCap) lines.push(`시가총액: ${summary.marketCap.toLocaleString()}억원`);
  if (summary?.high52w) lines.push(`52주 최고: ${summary.high52w.toLocaleString()}원`);
  if (summary?.low52w) lines.push(`52주 최저: ${summary.low52w.toLocaleString()}원`);
  if (metrics?.per != null) lines.push(`PER: ${metrics.per.toFixed(1)}배`);
  if (metrics?.pbr != null) lines.push(`PBR: ${metrics.pbr.toFixed(2)}배`);
  if (metrics?.roe != null) lines.push(`ROE: ${metrics.roe.toFixed(1)}%`);

  const newsLines = news.slice(0, 5).map((n) => `- ${n.title}`);
  if (newsLines.length > 0) {
    lines.push("\n[최신 뉴스]");
    lines.push(...newsLines);
  }

  const userMessage = lines.join("\n");

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<TenbaggerAnalysis>;

    const VALID_VERDICTS = ["매수적극추천", "매수", "관망", "매도"] as const;
    const verdict = VALID_VERDICTS.includes(parsed.verdict as (typeof VALID_VERDICTS)[number])
      ? (parsed.verdict as TenbaggerAnalysis["verdict"])
      : "관망";

    const analysis: TenbaggerAnalysis = {
      tenbaggerScore:
        typeof parsed.tenbaggerScore === "number"
          ? Math.min(100, Math.max(0, parsed.tenbaggerScore))
          : 50,
      growthStory: typeof parsed.growthStory === "string" ? parsed.growthStory : "",
      catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      similarCases: typeof parsed.similarCases === "string" ? parsed.similarCases : "",
      verdict,
      timeHorizon: typeof parsed.timeHorizon === "string" ? parsed.timeHorizon : "",
    };

    cache.set(ticker, { data: analysis, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 분석 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
