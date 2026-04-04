import { NextRequest, NextResponse } from "next/server";
import { fetchTopGainers, fetchTopLosers } from "@/lib/api/naver";

export const revalidate = 300;

export async function GET(_request: NextRequest) {
  try {
    const [gainers, losers] = await Promise.all([
      fetchTopGainers(),
      fetchTopLosers(),
    ]);
    return NextResponse.json({
      data: { gainers, losers },
      stale: gainers.length === 0 && losers.length === 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch market movers";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
