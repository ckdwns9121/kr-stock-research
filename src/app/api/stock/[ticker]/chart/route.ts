import { NextRequest, NextResponse } from "next/server";
import { fetchChartData } from "@/lib/api/naver";
import type { ChartDataPoint } from "@/types/stock";

export const revalidate = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const periodParam = request.nextUrl.searchParams.get("period");
  const days = periodParam ? parseInt(periodParam, 10) : 365;

  try {
    const data: ChartDataPoint[] = await fetchChartData(ticker, days);
    const stale = data.length === 0;
    return NextResponse.json({ data, stale });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch chart data";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
