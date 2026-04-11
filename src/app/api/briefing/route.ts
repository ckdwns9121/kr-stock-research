import { NextResponse } from "next/server";
import { fetchMarketIndices, fetchMarketNews } from "@/lib/api/naver";
import { fetchUSIndices, fetchMacroIndicators } from "@/lib/api/yahoo";

interface BriefingData {
  headline: string;
  marketOverview: string;
  keyEvents: string[];
  sectorsToWatch: string[];
  riskFactors: string[];
  actionItems: string[];
}

interface CacheEntry {
  data: BriefingData;
  expiresAt: number;
}

// 30-minute in-memory cache
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

export async function GET(): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ data: null });
  }

  const cached = cache.get("briefing");
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({ data: cached.data });
  }

  try {
    const [krIndices, krNews, usIndices, macro] = await Promise.allSettled([
      fetchMarketIndices(),
      fetchMarketNews(),
      fetchUSIndices(),
      fetchMacroIndicators(),
    ]);

    const krIndicesData = krIndices.status === "fulfilled" ? krIndices.value : [];
    const krNewsData = krNews.status === "fulfilled" ? krNews.value : [];
    const usIndicesData = usIndices.status === "fulfilled" ? usIndices.value : [];
    const macroData = macro.status === "fulfilled" ? macro.value : null;

    const marketContext = {
      koreanMarket: krIndicesData.map((idx) => ({
        name: idx.name,
        value: idx.value,
        changePercent: idx.changePercent,
      })),
      usMarket: usIndicesData.map((idx) => ({
        name: idx.name,
        price: idx.price,
        changePercent: idx.changePercent,
      })),
      macro: macroData
        ? {
            vix: macroData.vix,
            tenYearYield: macroData.tenYearYield,
            dxy: macroData.dxy,
          }
        : null,
      recentNews: krNewsData.slice(0, 10).map((n) => n.title),
    };

    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `당신은 20년차 수석 시장 애널리스트입니다. 제공된 시장 데이터와 뉴스를 바탕으로 오늘의 시장 브리핑을 작성하세요.

반드시 모든 내용을 한국어로 작성하세요. 영어로 작성하지 마세요.

JSON으로만 응답:
{
  "headline": "오늘의 핵심 한 줄 (한국어)",
  "marketOverview": "시장 전체 흐름 2-3문장 (한국어)",
  "keyEvents": ["주목할 이벤트 3-5개 (한국어)"],
  "sectorsToWatch": ["주목 섹터 + 이유 2-3개 (한국어)"],
  "riskFactors": ["리스크 요인 2-3개 (한국어)"],
  "actionItems": ["오늘의 투자 체크리스트 3-5개 (한국어)"]
}`,
        },
        {
          role: "user",
          content: `시장 데이터:\n${JSON.stringify(marketContext, null, 2)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return NextResponse.json({ data: null });

    const briefing = JSON.parse(raw) as BriefingData;

    cache.set("briefing", { data: briefing, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({ data: briefing });
  } catch {
    return NextResponse.json({ data: null });
  }
}
