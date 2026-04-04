import { NextRequest, NextResponse } from "next/server";
import { fetchExchangeRates } from "@/lib/api/naver";

export const revalidate = 300;

export async function GET(_request: NextRequest) {
  try {
    const data = await fetchExchangeRates();
    return NextResponse.json({ data, stale: data.length === 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch exchange rates";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
