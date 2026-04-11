import { NextResponse } from "next/server";
import { getTopMarketData, type MarketStockData } from "@/lib/api/yahoo-batch";

export const dynamic = "force-dynamic";

interface DiscoveryFactors {
  valuation: number;
  growth: number;
  quality: number;
  size: number;
  momentum: number;
}

interface DiscoveryStock {
  ticker: string;
  name: string;
  sector: string;
  sectorEmoji: string;
  price: number;
  changePercent: number;
  marketCap: number | null;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  score: number;
  factors: DiscoveryFactors;
}

function scoreValuation(per: number | null | undefined, pbr: number | null | undefined): number {
  let score = 0;

  if (per == null) {
    score = 5;
  } else if (per < 10) {
    score = 25;
  } else if (per < 15) {
    score = 20;
  } else if (per <= 25) {
    score = 10;
  } else {
    score = 5;
  }

  if (pbr != null && pbr < 1.0) {
    score += 5;
  }

  return Math.min(score, 25);
}

function scoreGrowth(changePercent: number): number {
  // No DART data — use price momentum as rough proxy
  if (changePercent > 5) return 15;
  if (changePercent > 0) return 10;
  return 5;
}

function scoreQuality(roe: number | null | undefined): number {
  if (roe == null) return 5;
  if (roe > 15) return 20;
  if (roe >= 10) return 15;
  if (roe >= 5) return 10;
  return 5;
}

function scoreSize(marketCap: number | null | undefined): number {
  if (marketCap == null) return 8;
  // marketCap from Yahoo is in KRW (won) — convert to 억원
  const eok = marketCap / 1e8;
  if (eok >= 1000 && eok < 5000) return 15;
  if (eok >= 5000 && eok < 10000) return 10;
  if (eok < 1000) return 8;
  // >= 1조 (10000억)
  return 5;
}

function scoreMomentum(
  changePercent: number,
  currentPrice: number,
  high52w: number | null | undefined
): number {
  let score = 0;

  if (changePercent > 3) {
    score = 15;
  } else if (changePercent >= 1) {
    score = 12;
  } else if (changePercent >= 0) {
    score = 8;
  } else {
    score = 5;
  }

  if (high52w != null && high52w > 0 && currentPrice < high52w * 0.7) {
    score += 3;
  }

  return Math.min(score, 15);
}

export async function GET() {
  const marketData = await getTopMarketData(500);

  const stocks: DiscoveryStock[] = marketData
    .filter((stock: MarketStockData) => stock.price > 0)
    .map((stock: MarketStockData) => {
      const factors: DiscoveryFactors = {
        valuation: scoreValuation(stock.per, stock.pbr),
        growth: scoreGrowth(stock.changePercent),
        quality: scoreQuality(null),
        size: scoreSize(stock.marketCap),
        momentum: scoreMomentum(stock.changePercent, stock.price, stock.high52w),
      };

      const score =
        factors.valuation +
        factors.growth +
        factors.quality +
        factors.size +
        factors.momentum;

      return {
        ticker: stock.ticker,
        name: stock.name,
        sector: stock.market,
        sectorEmoji: stock.market === "KOSPI" ? "📈" : "📊",
        price: stock.price,
        changePercent: stock.changePercent,
        marketCap: stock.marketCap,
        per: stock.per,
        pbr: stock.pbr,
        roe: null,
        score,
        factors,
      } satisfies DiscoveryStock;
    })
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ stocks });
}
