import { NextRequest, NextResponse } from "next/server";
import { findPeersByIndustry } from "@/lib/api/dart-industry";
import { fetchStockSummary, fetchNaverMetrics } from "@/lib/api/naver";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  const peerInfos = await findPeersByIndustry(ticker);
  if (peerInfos.length === 0) {
    return NextResponse.json({ sectorName: null, peers: [] });
  }

  const sectorName = peerInfos[0].sectorName;
  const limited = peerInfos.slice(0, 8);

  const results = await Promise.allSettled(
    limited.map(async (peer) => {
      const [summary, metrics] = await Promise.allSettled([
        fetchStockSummary(peer.ticker),
        fetchNaverMetrics(peer.ticker),
      ]);
      const s = summary.status === "fulfilled" ? summary.value : null;
      const m = metrics.status === "fulfilled" ? metrics.value : null;
      if (!s) return null;
      return {
        ticker: peer.ticker,
        name: peer.name,
        price: s.currentPrice,
        changePercent: s.changePercent,
        per: m?.per ?? null,
        pbr: m?.pbr ?? null,
      };
    })
  );

  // 현재 종목도 포함
  const [curSummary, curMetrics] = await Promise.allSettled([
    fetchStockSummary(ticker),
    fetchNaverMetrics(ticker),
  ]);
  const cs = curSummary.status === "fulfilled" ? curSummary.value : null;
  const cm = curMetrics.status === "fulfilled" ? curMetrics.value : null;

  const peers = results
    .flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));

  if (cs) {
    peers.unshift({
      ticker,
      name: cs.name,
      price: cs.currentPrice,
      changePercent: cs.changePercent,
      per: cm?.per ?? null,
      pbr: cm?.pbr ?? null,
    });
  }

  return NextResponse.json({ sectorName, peers });
}
