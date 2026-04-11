import { NextResponse } from "next/server";
import { fetchUSIndices, fetchMacroIndicators, fetchExtraAssets } from "@/lib/api/yahoo";
import { fetchMarketIndices } from "@/lib/api/naver";

export const dynamic = "force-dynamic";

interface FearGreedData {
  score: number; // 0~100
  label: string;
  factors: {
    name: string;
    score: number; // 0~20
    description: string;
  }[];
  updatedAt: number;
}

const CACHE_TTL = 10 * 60 * 1000; // 10분
let cache: { data: FearGreedData; timestamp: number } | null = null;

// VIX 기반 (20점): 낮을수록 탐욕
function scoreVix(vix: number): { score: number; desc: string } {
  if (vix < 13) return { score: 20, desc: `VIX ${vix.toFixed(1)} — 극단적 낙관` };
  if (vix < 17) return { score: 16, desc: `VIX ${vix.toFixed(1)} — 안정적` };
  if (vix < 22) return { score: 12, desc: `VIX ${vix.toFixed(1)} — 보통` };
  if (vix < 28) return { score: 6, desc: `VIX ${vix.toFixed(1)} — 불안` };
  return { score: 2, desc: `VIX ${vix.toFixed(1)} — 극단적 공포` };
}

// 미국 시장 모멘텀 (20점): S&P500 등락률
function scoreUSMomentum(changePercent: number): { score: number; desc: string } {
  const sign = changePercent >= 0 ? "+" : "";
  if (changePercent > 1.5) return { score: 20, desc: `S&P500 ${sign}${changePercent.toFixed(2)}% — 강한 상승` };
  if (changePercent > 0.5) return { score: 16, desc: `S&P500 ${sign}${changePercent.toFixed(2)}% — 상승` };
  if (changePercent > -0.5) return { score: 12, desc: `S&P500 ${sign}${changePercent.toFixed(2)}% — 보합` };
  if (changePercent > -1.5) return { score: 6, desc: `S&P500 ${sign}${changePercent.toFixed(2)}% — 하락` };
  return { score: 2, desc: `S&P500 ${sign}${changePercent.toFixed(2)}% — 급락` };
}

// 한국 시장 모멘텀 (20점): KOSPI 등락률
function scoreKRMomentum(changePercent: number): { score: number; desc: string } {
  const sign = changePercent >= 0 ? "+" : "";
  if (changePercent > 1.5) return { score: 20, desc: `KOSPI ${sign}${changePercent.toFixed(2)}% — 강한 상승` };
  if (changePercent > 0.5) return { score: 16, desc: `KOSPI ${sign}${changePercent.toFixed(2)}% — 상승` };
  if (changePercent > -0.5) return { score: 12, desc: `KOSPI ${sign}${changePercent.toFixed(2)}% — 보합` };
  if (changePercent > -1.5) return { score: 6, desc: `KOSPI ${sign}${changePercent.toFixed(2)}% — 하락` };
  return { score: 2, desc: `KOSPI ${sign}${changePercent.toFixed(2)}% — 급락` };
}

// 금 가격 변동 (20점): 금 상승 = 안전자산 선호 = 공포
function scoreGold(changePercent: number): { score: number; desc: string } {
  const sign = changePercent >= 0 ? "+" : "";
  if (changePercent < -1) return { score: 20, desc: `금 ${sign}${changePercent.toFixed(2)}% — 위험자산 선호` };
  if (changePercent < 0) return { score: 14, desc: `금 ${sign}${changePercent.toFixed(2)}% — 약간 낙관` };
  if (changePercent < 1) return { score: 8, desc: `금 ${sign}${changePercent.toFixed(2)}% — 약간 불안` };
  return { score: 3, desc: `금 ${sign}${changePercent.toFixed(2)}% — 안전자산 선호 (공포)` };
}

// 비트코인 모멘텀 (20점): 위험자산 바로미터
function scoreBTC(changePercent: number): { score: number; desc: string } {
  const sign = changePercent >= 0 ? "+" : "";
  if (changePercent > 3) return { score: 20, desc: `BTC ${sign}${changePercent.toFixed(2)}% — 강한 위험선호` };
  if (changePercent > 1) return { score: 16, desc: `BTC ${sign}${changePercent.toFixed(2)}% — 위험선호` };
  if (changePercent > -1) return { score: 12, desc: `BTC ${sign}${changePercent.toFixed(2)}% — 보합` };
  if (changePercent > -3) return { score: 6, desc: `BTC ${sign}${changePercent.toFixed(2)}% — 위험회피` };
  return { score: 2, desc: `BTC ${sign}${changePercent.toFixed(2)}% — 강한 위험회피` };
}

function getLabel(score: number): string {
  if (score >= 75) return "극단적 탐욕";
  if (score >= 55) return "탐욕";
  if (score >= 45) return "중립";
  if (score >= 25) return "공포";
  return "극단적 공포";
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const [usIndices, macro, krIndices, extras] = await Promise.all([
    fetchUSIndices().catch(() => []),
    fetchMacroIndicators().catch(() => null),
    fetchMarketIndices().catch(() => []),
    fetchExtraAssets().catch(() => []),
  ]);

  const sp500 = usIndices.find((i) => i.symbol === "^GSPC");
  const kospi = krIndices.find((i) => i.name === "코스피");
  const gold = extras.find((a) => a.name === "금");
  const btc = extras.find((a) => a.name === "비트코인");

  const vixResult = macro ? scoreVix(macro.vix) : { score: 10, desc: "VIX 데이터 없음" };
  const usResult = sp500 ? scoreUSMomentum(sp500.changePercent) : { score: 10, desc: "S&P500 데이터 없음" };
  const krResult = kospi ? scoreKRMomentum(kospi.changePercent) : { score: 10, desc: "KOSPI 데이터 없음" };
  const goldResult = gold ? scoreGold(gold.changePercent) : { score: 10, desc: "금 데이터 없음" };
  const btcResult = btc ? scoreBTC(btc.changePercent) : { score: 10, desc: "BTC 데이터 없음" };

  const totalScore = vixResult.score + usResult.score + krResult.score + goldResult.score + btcResult.score;

  const data: FearGreedData = {
    score: totalScore,
    label: getLabel(totalScore),
    factors: [
      { name: "VIX (공포지수)", score: vixResult.score, description: vixResult.desc },
      { name: "미국 시장", score: usResult.score, description: usResult.desc },
      { name: "한국 시장", score: krResult.score, description: krResult.desc },
      { name: "금 (안전자산)", score: goldResult.score, description: goldResult.desc },
      { name: "비트코인 (위험자산)", score: btcResult.score, description: btcResult.desc },
    ],
    updatedAt: now,
  };

  cache = { data, timestamp: now };
  return NextResponse.json(data);
}
