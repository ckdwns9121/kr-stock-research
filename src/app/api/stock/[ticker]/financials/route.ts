import { NextRequest, NextResponse } from "next/server";
import { getCorpCode, fetchFinancialStatements } from "@/lib/api/dart";
import type { FinancialStatement } from "@/types/financial";

export const revalidate = 3600;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const yearParam = request.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear() - 1;

  try {
    const corpCode = await getCorpCode(ticker);
    if (!corpCode) {
      return NextResponse.json(
        { success: false, error: `No corp code found for ticker: ${ticker}` },
        { status: 404 }
      );
    }

    const data: FinancialStatement[] = await fetchFinancialStatements(corpCode, year);
    const stale = data.length === 0;
    return NextResponse.json({ data, stale });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch financial statements";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
