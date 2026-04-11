import { NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchUSIndices, fetchMacroIndicators, fetchUSSectors, fetchExtraAssets } from "@/lib/api/yahoo";
import type { GlobalMarketData, AIMarketAnalysis } from "@/types/global-market";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cache: { data: GlobalMarketData; timestamp: number } | null = null;

const AI_SYSTEM_PROMPT = `당신은 글로벌 금융 시장 분석가입니다. 제공된 미국 시장 데이터를 바탕으로 오늘의 시장 상황을 분석하세요.

반드시 JSON으로만 응답:
{
  "marketSummary": "종합 시황 1-3문장",
  "riskSentiment": "risk-on" | "risk-off" | "neutral",
  "strongSectors": [{"name": "섹터명", "reason": "강세 이유 1-2문장"}],
  "weakSectors": [{"name": "섹터명", "reason": "약세 이유 1-2문장"}]
}`;

async function generateAIAnalysis(data: {
  indices: GlobalMarketData["indices"];
  macro: GlobalMarketData["macro"] | null;
  sectors: GlobalMarketData["sectors"];
}): Promise<AIMarketAnalysis | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const sorted = [...data.sectors].sort((a, b) => b.changePercent - a.changePercent);
    const strong = sorted.slice(0, 3);
    const weak = sorted.slice(-3).reverse();

    const userContent = `[미국 지수]
${data.indices.map((i) => `${i.name}: ${i.price.toFixed(2)} (${i.changePercent >= 0 ? "+" : ""}${i.changePercent.toFixed(2)}%)`).join("\n")}

[매크로 지표]
${data.macro ? `VIX: ${data.macro.vix.toFixed(2)}\n10년 금리: ${data.macro.tenYearYield.toFixed(2)}%\nDXY: ${data.macro.dxy.toFixed(2)}` : "데이터 없음"}

[섹터 ETF 등락률 (상위 강세)]
${strong.map((s) => `${s.name}(${s.symbol}): ${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`).join("\n")}

[섹터 ETF 등락률 (하위 약세)]
${weak.map((s) => `${s.name}(${s.symbol}): ${s.changePercent >= 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`).join("\n")}`;

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<AIMarketAnalysis>;

    return {
      marketSummary: typeof parsed.marketSummary === "string" ? parsed.marketSummary : "",
      riskSentiment:
        parsed.riskSentiment === "risk-on" ||
        parsed.riskSentiment === "risk-off" ||
        parsed.riskSentiment === "neutral"
          ? parsed.riskSentiment
          : "neutral",
      strongSectors: Array.isArray(parsed.strongSectors) ? parsed.strongSectors : [],
      weakSectors: Array.isArray(parsed.weakSectors) ? parsed.weakSectors : [],
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data);
  }

  const [indices, macro, sectors, extraAssets] = await Promise.all([
    fetchUSIndices(),
    fetchMacroIndicators(),
    fetchUSSectors(),
    fetchExtraAssets().catch(() => []),
  ]);

  const aiAnalysis = await generateAIAnalysis({ indices, macro, sectors });

  const data: GlobalMarketData = {
    indices,
    macro: macro ?? { vix: 0, tenYearYield: 0, dxy: 0 },
    sectors,
    extraAssets,
    aiAnalysis,
    cachedAt: now,
  };

  cache = { data, timestamp: now };

  return NextResponse.json(data);
}
