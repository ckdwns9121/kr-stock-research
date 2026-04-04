import { NextRequest, NextResponse } from "next/server";
import { fetchNaverMetrics } from "@/lib/api/naver";
import {
  getCorpCode,
  fetchFinancialStatements,
  calculateMetricsFromStatements,
} from "@/lib/api/dart";
import type { FinancialMetrics } from "@/types/financial";

export const revalidate = 300;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  try {
    const [naverMetrics, corpCode] = await Promise.all([
      fetchNaverMetrics(ticker),
      getCorpCode(ticker),
    ]);

    let dartMetrics: Partial<FinancialMetrics> = {};
    if (corpCode) {
      // Use previous year for annual report (current year likely not filed yet)
      const year = new Date().getFullYear() - 1;
      const statements = await fetchFinancialStatements(corpCode, year);
      dartMetrics = calculateMetricsFromStatements(statements);
    }

    // Tier 1: DART-calculated ROE / EV-EBITDA; Tier 2: Naver PER / PBR
    const data: FinancialMetrics = {
      ...naverMetrics,   // Tier 2 – PER, PBR from Naver
      ...dartMetrics,    // Tier 1 – ROE, evEbitda from DART (overrides if present)
    };

    const stale = Object.keys(data).length === 0;
    return NextResponse.json({ data, stale });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch metrics";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
