import { NextResponse } from "next/server";
import { getTopMarketData } from "@/lib/api/yahoo-batch";

export const dynamic = "force-dynamic";

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

export async function GET() {
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
