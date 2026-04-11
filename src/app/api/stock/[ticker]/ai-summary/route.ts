import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchNaverMetrics, fetchCompanyNews, fetchStockSummary } from "@/lib/api/naver";
import { getCorpCode, fetchFinancialStatements } from "@/lib/api/dart";
import type { NewsItem } from "@/types/news";

interface AISummaryResponse {
  analysis: {
    summary: string;
    opinion: string;
    targetPrice: number;
    buyPrice: number;
    targetReasoning: string;
    buyReasoning: string;
    risks: string;
    opportunities: string;
  } | null;
  news: { title: string; url: string }[];
  error?: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { data: AISummaryResponse; timestamp: number }>();

const SYSTEM_PROMPT = `당신은 20년차 한국 주식 시장 수석 애널리스트입니다. 제공된 재무데이터, 현재 주가, 최신 뉴스를 바탕으로 해당 종목에 대한 분석과 함께 목표가/매수가를 제시하세요.

중요: 목표가와 매수가는 반드시 제공된 현재가와 같은 단위(원)로 작성하세요. 현재가가 20,000원이면 목표가도 20,000원대여야 합니다. 절대 현재가와 동떨어진 숫자를 쓰지 마세요.

반드시 JSON으로만 응답하세요:
{
  "summary": "종합 분석 3-5문장. 밸류에이션, 실적 트렌드, 뉴스 영향을 근거와 수치로 분석",
  "opinion": "매수" | "중립" | "매도",
  "targetPrice": 목표주가(숫자, 원 단위, 현재가 기준 ±10~30% 범위에서 합리적으로 산정),
  "buyPrice": 추천매수가(숫자, 원 단위, 현재가 대비 5~15% 할인된 가격),
  "targetReasoning": "목표가 산출 근거 2-3문장. PER/PBR 밴드, 실적 전망, 동종업계 비교 등 구체적 수치 포함",
  "buyReasoning": "매수가 산출 근거 1-2문장. 지지선, 밸류에이션 하단, 기술적 매수 구간 등",
  "risks": "핵심 리스크 2-3가지, 각 1문장",
  "opportunities": "핵심 기회 요인 2-3가지, 각 1문장"
}`;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ analysis: null, news: [], error: "OPENAI_API_KEY 미설정" });
  }

  const now = Date.now();
  const cached = cache.get(ticker);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const [metrics, corpCode, news, summary] = await Promise.all([
    fetchNaverMetrics(ticker).catch(() => null),
    getCorpCode(ticker).catch(() => null),
    fetchCompanyNews(ticker).catch(() => [] as NewsItem[]),
    fetchStockSummary(ticker).catch(() => null),
  ]);

  const lines: string[] = [];

  if (summary) {
    lines.push(`현재가: ${summary.currentPrice.toLocaleString()}원`);
    lines.push(`등락률: ${summary.changePercent >= 0 ? "+" : ""}${summary.changePercent.toFixed(2)}%`);
  }

  if (metrics) {
    if (metrics.per) lines.push(`PER: ${metrics.per.toFixed(1)}배`);
    if (metrics.pbr) lines.push(`PBR: ${metrics.pbr.toFixed(2)}배`);
    if (metrics.roe) lines.push(`ROE: ${metrics.roe.toFixed(1)}%`);
  }

  if (corpCode) {
    try {
      const year = new Date().getFullYear() - 1;
      const statements = await fetchFinancialStatements(corpCode, year);
      const annual = statements.find((s) => s.quarter === "사업보고서");
      if (annual) {
        const fmt = (n: number) => n ? `${(n / 1_000_000_000).toFixed(0)}억원` : "N/A";
        lines.push(`매출액(${year}): ${fmt(annual.revenue)}`);
        lines.push(`영업이익(${year}): ${fmt(annual.operatingProfit)}`);
        lines.push(`순이익(${year}): ${fmt(annual.netProfit)}`);
      }
    } catch { /* ignore */ }
  }

  const newsForAI = news.slice(0, 7).map((n) => `- ${n.title}`);
  const newsForClient = news.slice(0, 10).map((n) => ({ title: n.title, url: n.url }));

  const userMessage = `종목코드: ${ticker}${summary ? ` (${summary.name})` : ""}

${lines.length > 0 ? `[시장/재무데이터]\n${lines.join("\n")}` : "[재무데이터 없음]"}

${newsForAI.length > 0 ? `[최신 뉴스]\n${newsForAI.join("\n")}` : "[뉴스 없음]"}`;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const result: AISummaryResponse = {
      analysis: {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        opinion: parsed.opinion === "매수" || parsed.opinion === "중립" || parsed.opinion === "매도" ? parsed.opinion : "중립",
        targetPrice: typeof parsed.targetPrice === "number" ? parsed.targetPrice : 0,
        buyPrice: typeof parsed.buyPrice === "number" ? parsed.buyPrice : 0,
        targetReasoning: typeof parsed.targetReasoning === "string" ? parsed.targetReasoning : "",
        buyReasoning: typeof parsed.buyReasoning === "string" ? parsed.buyReasoning : "",
        risks: typeof parsed.risks === "string" ? parsed.risks : "",
        opportunities: typeof parsed.opportunities === "string" ? parsed.opportunities : "",
      },
      news: newsForClient,
    };

    cache.set(ticker, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ analysis: null, news: newsForClient, error: "AI 분석 생성 실패" });
  }
}
