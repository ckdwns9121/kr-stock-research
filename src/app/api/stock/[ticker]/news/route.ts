import { NextRequest, NextResponse } from "next/server";
import { fetchCompanyNews } from "@/lib/api/naver";
import type { NewsItem } from "@/types/news";

export const revalidate = 120;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const pageParam = request.nextUrl.searchParams.get("page");
  const page = pageParam ? parseInt(pageParam, 10) : 1;

  try {
    const data: NewsItem[] = await fetchCompanyNews(ticker, page);
    const stale = data.length === 0;
    return NextResponse.json({ data, stale });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch company news";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
