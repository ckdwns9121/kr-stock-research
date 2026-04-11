import { NextResponse } from "next/server";
import { getTopMarketData, type MarketStockData } from "@/lib/api/yahoo-batch";
import { enrichTopStocks, type FinancialScore } from "@/lib/api/dart-financial-cache";

export const dynamic = "force-dynamic";

interface DiscoveryFactors {
  valuation: number;
  growth: number;
  quality: number;
  size: number;
  momentum: number;
}

interface FactorDetails {
  per: number | null;
  pbr: number | null;
  peg: number | null;
  revenueGrowth: number | null;
  opProfitGrowth: number | null;
  opMargin: number | null;
  debtRatio: number | null;
  roe: number | null;
  marketCapEok: number | null;
  dip52w: number | null;
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
  factorDetails: FactorDetails;
}

// --- 스코어링 함수 ---

function scoreValuation(
  per: number | null | undefined,
  pbr: number | null | undefined,
  earningsGrowth: number | null
): { score: number; peg: number | null } {
  let score = 0;
  let peg: number | null = null;

  // PER 기반 (0~15점)
  if (per == null || per <= 0) {
    score = 3;
  } else if (per < 8) {
    score = 15;
  } else if (per < 12) {
    score = 12;
  } else if (per < 20) {
    score = 8;
  } else {
    score = 3;
  }

  // PBR 보너스 (0~5점)
  if (pbr != null && pbr > 0 && pbr < 1.0) {
    score += 5;
  } else if (pbr != null && pbr >= 1.0 && pbr < 2.0) {
    score += 2;
  }

  // PEG 보너스 (0~5점): PER ÷ 이익성장률
  if (per != null && per > 0 && earningsGrowth != null && earningsGrowth > 0) {
    peg = per / earningsGrowth;
    if (peg < 0.5) score += 5;
    else if (peg < 1.0) score += 3;
    else if (peg < 1.5) score += 1;
  }

  return { score: Math.min(score, 25), peg };
}

function scoreGrowth(
  changePercent: number,
  revenueGrowth: number | null,
  opProfitGrowth: number | null
): number {
  // DART 데이터가 있으면 실제 성장률 사용
  if (revenueGrowth != null) {
    let score = 0;

    // 매출 성장률 (0~15점)
    if (revenueGrowth > 30) score = 15;
    else if (revenueGrowth > 20) score = 12;
    else if (revenueGrowth > 10) score = 9;
    else if (revenueGrowth > 0) score = 6;
    else score = 2;

    // 영업 레버리지 보너스 (0~10점): 영업이익 성장 > 매출 성장
    if (opProfitGrowth != null && revenueGrowth > 0) {
      if (opProfitGrowth > revenueGrowth * 2) score += 10; // 영업이익이 매출의 2배 이상 성장
      else if (opProfitGrowth > revenueGrowth * 1.5) score += 7;
      else if (opProfitGrowth > revenueGrowth) score += 4;
    }

    return Math.min(score, 25);
  }

  // DART 데이터 없으면 등락률 기반 fallback
  if (changePercent > 5) return 12;
  if (changePercent > 0) return 8;
  return 4;
}

function scoreQuality(
  opMargin: number | null,
  debtRatio: number | null,
  roe: number | null,
  pbr: number | null
): number {
  // DART 데이터가 있으면 실제 재무 건전성 평가
  if (opMargin != null || debtRatio != null || roe != null) {
    let score = 0;

    // 영업이익률 (0~8점)
    if (opMargin != null) {
      if (opMargin > 15) score += 8;
      else if (opMargin > 10) score += 6;
      else if (opMargin > 5) score += 4;
      else if (opMargin > 0) score += 2;
    }

    // 부채비율 (0~6점): 낮을수록 좋음
    if (debtRatio != null) {
      if (debtRatio < 30) score += 6;
      else if (debtRatio < 50) score += 4;
      else if (debtRatio < 70) score += 2;
    } else {
      score += 3; // 데이터 없으면 중간값
    }

    // ROE (0~6점)
    if (roe != null) {
      if (roe > 20) score += 6;
      else if (roe > 15) score += 5;
      else if (roe > 10) score += 4;
      else if (roe > 5) score += 2;
    } else {
      score += 2;
    }

    return Math.min(score, 20);
  }

  // DART 데이터 없으면 PBR 기반 fallback
  if (pbr != null && pbr > 0) {
    if (pbr < 1) return 12;
    if (pbr < 2) return 8;
    return 5;
  }
  return 5;
}

function scoreSize(marketCap: number | null | undefined): number {
  if (marketCap == null) return 8;
  const eok = marketCap / 1e8;
  if (eok >= 1000 && eok < 5000) return 15;
  if (eok >= 500 && eok < 1000) return 13;
  if (eok >= 5000 && eok < 10000) return 10;
  if (eok < 500) return 7;
  return 5;
}

function scoreMomentum(
  changePercent: number,
  currentPrice: number,
  high52w: number | null | undefined
): { score: number; dip52w: number | null } {
  let score = 0;
  let dip52w: number | null = null;

  if (changePercent > 3) score = 12;
  else if (changePercent >= 1) score = 10;
  else if (changePercent >= 0) score = 7;
  else score = 4;

  // 52주 고점 대비 눌림목 보너스
  if (high52w != null && high52w > 0 && currentPrice > 0) {
    dip52w = ((high52w - currentPrice) / high52w) * 100;
    if (dip52w > 30) score += 3; // 30%+ 하락 = 기회
  }

  return { score: Math.min(score, 15), dip52w };
}

export async function GET() {
  const marketData = await getTopMarketData(500);

  // 1단계: Yahoo 데이터로 프리스코어링
  const preScored = marketData
    .filter((stock: MarketStockData) => stock.price > 0)
    .map((stock: MarketStockData) => {
      const valResult = scoreValuation(stock.per, stock.pbr, null);
      const growthScore = scoreGrowth(stock.changePercent, null, null);
      const qualityScore = scoreQuality(null, null, null, stock.pbr);
      const sizeScore = scoreSize(stock.marketCap);
      const momResult = scoreMomentum(stock.changePercent, stock.price, stock.high52w);
      const preScore = valResult.score + growthScore + qualityScore + sizeScore + momResult.score;
      return { stock, preScore };
    })
    .sort((a, b) => b.preScore - a.preScore);

  // 2단계: 상위 50개만 DART enrichment
  const top50Tickers = preScored.slice(0, 50).map((s) => s.stock.ticker);
  const dartData = await enrichTopStocks(top50Tickers);

  // 3단계: 최종 스코어링
  const stocks: DiscoveryStock[] = preScored.map(({ stock }) => {
    const dart: FinancialScore | null = dartData[stock.ticker] ?? null;

    const valResult = scoreValuation(stock.per, stock.pbr, dart?.opProfitGrowth ?? null);
    const growthScore = scoreGrowth(stock.changePercent, dart?.revenueGrowth ?? null, dart?.opProfitGrowth ?? null);
    const qualityScore = scoreQuality(dart?.opMargin ?? null, dart?.debtRatio ?? null, dart?.roe ?? null, stock.pbr);
    const sizeScore = scoreSize(stock.marketCap);
    const momResult = scoreMomentum(stock.changePercent, stock.price, stock.high52w);

    const factors: DiscoveryFactors = {
      valuation: valResult.score,
      growth: growthScore,
      quality: qualityScore,
      size: sizeScore,
      momentum: momResult.score,
    };

    const score = factors.valuation + factors.growth + factors.quality + factors.size + factors.momentum;

    const factorDetails: FactorDetails = {
      per: stock.per,
      pbr: stock.pbr,
      peg: valResult.peg,
      revenueGrowth: dart?.revenueGrowth ?? null,
      opProfitGrowth: dart?.opProfitGrowth ?? null,
      opMargin: dart?.opMargin ?? null,
      debtRatio: dart?.debtRatio ?? null,
      roe: dart?.roe ?? null,
      marketCapEok: stock.marketCap ? stock.marketCap / 1e8 : null,
      dip52w: momResult.dip52w,
    };

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
      roe: dart?.roe ?? null,
      score,
      factors,
      factorDetails,
    };
  }).sort((a, b) => b.score - a.score);

  return NextResponse.json({ stocks });
}
