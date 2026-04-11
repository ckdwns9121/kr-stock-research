import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchUSIndices, fetchMacroIndicators, fetchExtraAssets } from "@/lib/api/yahoo";
import { fetchMarketIndices, fetchMarketNews } from "@/lib/api/naver";
import { getTopMarketData } from "@/lib/api/yahoo-batch";

export const dynamic = "force-dynamic";

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

interface AIPortfolioResponse {
  portfolio: {
    style: string;
    marketView: string;
    stocks: PortfolioStock[];
    totalStocks: number;
    riskLevel: string;
    expectedReturn: string;
    rebalanceNote: string;
  } | null;
  error?: string;
}

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { data: AIPortfolioResponse; timestamp: number }>();

const STYLE_LABELS: Record<InvestStyle, string> = {
  aggressive: "공격형 (고위험·고수익)",
  balanced: "중립형 (균형)",
  defensive: "방어형 (안정·배당)",
};

function buildSystemPrompt(style: InvestStyle): string {
  const styleDesc = style === "aggressive"
    ? "성장주·소형주 중심, 높은 변동성 감수, 수익률 극대화"
    : style === "defensive"
    ? "대형 우량주·배당주 중심, 안정성 최우선, 자본 보전"
    : "성장주와 안정주 균형 배분, 적정 위험 감수";

  return `당신은 20년차 한국 주식 포트폴리오 매니저입니다. 현재 시장 데이터를 분석하여 ${STYLE_LABELS[style]} 투자자에게 최적의 포트폴리오를 구성하세요.

투자 성향: ${styleDesc}

반드시 한국어로, JSON으로만 응답하세요:
{
  "marketView": "현재 시장 상황 분석 3-4문장. 글로벌 매크로, 한국 시장, 주요 리스크/기회",
  "stocks": [
    {
      "name": "종목명",
      "ticker": "6자리 종목코드",
      "weight": 비중(숫자, 전체 합 100),
      "sector": "업종명",
      "buyReason": "매수 이유 2-3문장. 구체적 수치와 근거 포함",
      "sellStrategy": "매도 전략 1-2문장. 목표가 또는 조건 명시",
      "stopLoss": "손절 전략 1-2문장. 손절가 또는 조건 명시",
      "targetReturn": "예상 수익률 범위 (예: +15~25%)"
    }
  ],
  "riskLevel": "${style === "aggressive" ? "높음" : style === "defensive" ? "낮음" : "중간"}",
  "expectedReturn": "포트폴리오 전체 예상 연간 수익률 범위",
  "rebalanceNote": "리밸런싱 주기와 조건 1-2문장"
}

규칙:
- 종목 수: ${style === "aggressive" ? "8-12개" : style === "defensive" ? "5-8개" : "6-10개"}
- 반드시 실존하는 한국 상장 종목만 추천 (종목코드 6자리 필수)
- 코스피(KOSPI)와 코스닥(KOSDAQ) 종목을 반드시 혼합 포함. 코스닥 비중 최소 ${style === "aggressive" ? "40%" : style === "defensive" ? "20%" : "30%"}
- ${style === "aggressive" ? "시총 1조 미만 중소형 성장주를 최소 50% 포함. 대형주(시총 10조+) 위주 금지" : style === "defensive" ? "대형 우량주 위주이되 코스닥 배당주도 포함" : "대형주와 중소형주 균형 배분"}
- 비중 합계 = 100
- 현재 시장 상황과 매크로 환경을 반드시 반영
- 각 종목의 손절가는 구체적 퍼센트로 명시 (예: 매수가 대비 -8%)`;
}

export async function GET(request: NextRequest) {
  const style = (request.nextUrl.searchParams.get("style") ?? "balanced") as InvestStyle;
  if (!["aggressive", "balanced", "defensive"].includes(style)) {
    return NextResponse.json({ portfolio: null, error: "잘못된 투자 성향" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ portfolio: null, error: "OPENAI_API_KEY 미설정" });
  }

  const now = Date.now();
  const cacheKey = style;
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  // 시장 데이터 수집
  const [usIndices, macro, krIndices, news, extras, topStocks] = await Promise.all([
    fetchUSIndices().catch(() => []),
    fetchMacroIndicators().catch(() => null),
    fetchMarketIndices().catch(() => []),
    fetchMarketNews().catch(() => []),
    fetchExtraAssets().catch(() => []),
    getTopMarketData(50).catch(() => []),
  ]);

  const marketContext = {
    usIndices: usIndices.map((i) => `${i.name}: ${i.price.toFixed(0)} (${i.changePercent >= 0 ? "+" : ""}${i.changePercent.toFixed(2)}%)`),
    krIndices: krIndices.map((i) => `${i.name}: ${i.value.toLocaleString()} (${i.changePercent >= 0 ? "+" : ""}${i.changePercent.toFixed(2)}%)`),
    macro: macro ? `VIX: ${macro.vix.toFixed(1)}, 10Y: ${macro.tenYearYield.toFixed(2)}%, DXY: ${macro.dxy.toFixed(1)}` : "데이터 없음",
    extras: extras.map((a) => `${a.name}: $${a.price.toFixed(2)} (${a.changePercent >= 0 ? "+" : ""}${a.changePercent.toFixed(2)}%)`),
    recentNews: news.slice(0, 7).map((n) => n.title),
    topStocksByMarketCap: topStocks.slice(0, 30).map((s) => `${s.name}(${s.ticker}): ${s.price.toLocaleString()}원 ${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}% PER:${s.per?.toFixed(1) ?? "-"}`),
  };

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt(style) },
        { role: "user", content: `현재 시장 데이터:\n${JSON.stringify(marketContext, null, 2)}` },
      ],
      temperature: 0.4,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const stocks: PortfolioStock[] = Array.isArray(parsed.stocks)
      ? parsed.stocks.map((s: Record<string, unknown>) => ({
          name: String(s.name ?? ""),
          ticker: String(s.ticker ?? ""),
          weight: Number(s.weight ?? 0),
          sector: String(s.sector ?? ""),
          buyReason: String(s.buyReason ?? ""),
          sellStrategy: String(s.sellStrategy ?? ""),
          stopLoss: String(s.stopLoss ?? ""),
          targetReturn: String(s.targetReturn ?? ""),
        }))
      : [];

    const result: AIPortfolioResponse = {
      portfolio: {
        style: STYLE_LABELS[style],
        marketView: typeof parsed.marketView === "string" ? parsed.marketView : "",
        stocks,
        totalStocks: stocks.length,
        riskLevel: typeof parsed.riskLevel === "string" ? parsed.riskLevel : "",
        expectedReturn: typeof parsed.expectedReturn === "string" ? parsed.expectedReturn : "",
        rebalanceNote: typeof parsed.rebalanceNote === "string" ? parsed.rebalanceNote : "",
      },
    };

    cache.set(cacheKey, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ portfolio: null, error: "AI 포트폴리오 생성 실패" });
  }
}
