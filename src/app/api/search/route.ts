import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/api/krx";
import type { Stock } from "@/types/stock";

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const results: Stock[] = await searchStocks(q);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
