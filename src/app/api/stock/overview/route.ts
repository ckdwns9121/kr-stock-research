import { NextRequest, NextResponse } from "next/server";
import { fetchMarketIndices } from "@/lib/api/naver";
import type { MarketIndex } from "@/types/market";

export const revalidate = 300;

export async function GET(_request: NextRequest) {
  try {
    const indices: MarketIndex[] = await fetchMarketIndices();
    const stale = indices.length === 0;
    return NextResponse.json({ data: { indices }, stale });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch market overview";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
