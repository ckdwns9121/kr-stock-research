import { NextRequest, NextResponse } from "next/server";
import { fetchMarketNews } from "@/lib/api/naver";
import type { NewsItem } from "@/types/news";

export const revalidate = 120;

export async function GET(_request: NextRequest) {
  try {
    const data: NewsItem[] = await fetchMarketNews();
    const stale = data.length === 0;
    return NextResponse.json({ data, stale });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch market news";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
