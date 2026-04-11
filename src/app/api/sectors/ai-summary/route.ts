import { NextResponse } from "next/server";
import OpenAI from "openai";
import { SECTORS } from "@/lib/sectors";
import { fetchStockSummary } from "@/lib/api/naver";

export const dynamic = "force-dynamic";

interface SectorStockResult {
  name: string;
  ticker: string;
  changePercent: number;
}

interface SectorResult {
  id: string;
  name: string;
  emoji: string;
  aiSummary: string | null;
  gainers: SectorStockResult[];
  losers: SectorStockResult[];
  avgChangePercent: number;
}

// Simple in-memory cache: 30 minutes
let cache: { data: SectorResult[]; at: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_TTL) {
    return NextResponse.json({ sectors: cache.data });
  }

  // Fetch first 5 stocks per sector in parallel
  const sectorData = await Promise.allSettled(
    SECTORS.map(async (sector) => {
      const stocks = sector.stocks.slice(0, 5);
      const results = await Promise.allSettled(
        stocks.map((s) => fetchStockSummary(s.ticker))
      );

      const stockResults: SectorStockResult[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          stockResults.push({
            name: stocks[i].name,
            ticker: stocks[i].ticker,
            changePercent: r.value.changePercent,
          });
        }
      });

      const validResults = stockResults.filter((s) => s.changePercent !== 0);
      const avgChangePercent =
        validResults.length > 0
          ? validResults.reduce((sum, s) => sum + s.changePercent, 0) /
            validResults.length
          : 0;

      const sorted = [...stockResults].sort(
        (a, b) => b.changePercent - a.changePercent
      );
      const gainers = sorted.slice(0, 3).filter((s) => s.changePercent > 0);
      const losers = sorted
        .slice(-3)
        .reverse()
        .filter((s) => s.changePercent < 0);

      return {
        sector,
        stockResults,
        gainers,
        losers,
        avgChangePercent: Math.round(avgChangePercent * 100) / 100,
      };
    })
  );

  // Build sector performance summary for GPT
  const sectorPerformances = sectorData
    .map((r, i) => {
      if (r.status !== "fulfilled") return null;
      const { sector, stockResults, avgChangePercent } = r.value;
      const stockLines = stockResults
        .map((s) => `  ${s.name}: ${s.changePercent > 0 ? "+" : ""}${s.changePercent}%`)
        .join("\n");
      return `[${sector.name}] 평균: ${avgChangePercent > 0 ? "+" : ""}${avgChangePercent}%\n${stockLines}`;
    })
    .filter(Boolean)
    .join("\n\n");

  // Get AI summaries if key is available
  let aiSummaries: Record<string, string> = {};
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && sectorPerformances) {
    try {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              '당신은 한국 주식 시장 섹터 분석가입니다. 각 섹터의 등락 데이터를 보고 한줄 시황을 작성하세요.\n반드시 한국어로, JSON으로만 응답:\n{ "summaries": { "반도체": "한줄 시황", "우주·방산": "한줄 시황", ... } }',
          },
          {
            role: "user",
            content: `오늘 섹터별 주가 데이터:\n\n${sectorPerformances}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { summaries?: Record<string, string> };
      aiSummaries = parsed.summaries ?? {};
    } catch {
      // Fall through — aiSummary will be null
    }
  }

  // Assemble final response
  const sectors: SectorResult[] = sectorData.map((r, i) => {
    const sector = SECTORS[i];
    if (r.status !== "fulfilled") {
      return {
        id: sector.id,
        name: sector.name,
        emoji: sector.emoji,
        aiSummary: null,
        gainers: [],
        losers: [],
        avgChangePercent: 0,
      };
    }
    const { gainers, losers, avgChangePercent } = r.value;
    return {
      id: sector.id,
      name: sector.name,
      emoji: sector.emoji,
      aiSummary: aiSummaries[sector.name] ?? null,
      gainers,
      losers,
      avgChangePercent,
    };
  });

  cache = { data: sectors, at: Date.now() };
  return NextResponse.json({ sectors });
}
