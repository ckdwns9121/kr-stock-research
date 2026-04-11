import { NextRequest, NextResponse } from "next/server";
import { getTopMarketData } from "@/lib/api/yahoo-batch";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface CorpEntry {
  ticker: string;
  corpCode: string;
  market?: string;
}

interface ScreenerStock {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  volume: number;
  market: "KOSPI" | "KOSDAQ";
  marketCap: number | null;
}

async function searchAndFetch(query: string): Promise<ScreenerStock[]> {
  const corpCodes = await import("@/data/corp-codes.json");
  const entries = Object.entries(corpCodes.default as Record<string, CorpEntry>);
  const lowerQuery = query.toLowerCase();

  const matched = entries
    .filter(([name, entry]) =>
      name.toLowerCase().includes(lowerQuery) || entry.ticker.includes(query)
    )
    .slice(0, 30);

  const results: ScreenerStock[] = [];

  for (const [name, entry] of matched) {
    const market = (entry.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI") as "KOSPI" | "KOSDAQ";
    const symbol = market === "KOSDAQ" ? `${entry.ticker}.KQ` : `${entry.ticker}.KS`;

    try {
      const quote = await yf.quote(symbol);
      const price = quote.regularMarketPrice;
      if (price == null || price <= 0) continue;

      results.push({
        ticker: entry.ticker,
        name,
        sector: market,
        price,
        changePercent: quote.regularMarketChangePercent ?? 0,
        per: quote.trailingPE ?? null,
        pbr: quote.priceToBook ?? null,
        roe: null,
        volume: quote.regularMarketVolume ?? 0,
        market,
        marketCap: quote.marketCap ?? null,
      });
    } catch {
      // 개별 종목 실패 무시
    }
  }

  return results.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  // 검색어가 있으면 corp-codes에서 검색 → yahoo 실시간 조회
  if (query && query.length >= 1) {
    const stocks = await searchAndFetch(query);
    return NextResponse.json({ stocks });
  }

  // 검색어 없으면 기존 상위 500개 반환
  const data = await getTopMarketData(500);

  const stocks: ScreenerStock[] = data
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    .map((item) => ({
      ticker: item.ticker,
      name: item.name,
      sector: item.market,
      price: item.price,
      changePercent: item.changePercent,
      per: item.per,
      pbr: item.pbr,
      roe: null,
      volume: item.volume,
      market: item.market,
      marketCap: item.marketCap,
    }));

  return NextResponse.json({ stocks });
}
