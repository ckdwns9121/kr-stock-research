import * as cheerio from "cheerio";
import { NAVER_FINANCE_URL } from "@/lib/constants";
import { fetchHTML } from "@/lib/api/client";

export interface NaverSectorSnapshotItem {
  id: string;
  naverNo: string;
  name: string;
  changePercent: number;
}

export interface NaverSectorStockItem {
  ticker: string;
  name: string;
  price?: number;
  changePercent?: number;
}

function parsePercentFromText(text: string): number {
  const normalized = text.replace(/,/g, "");
  const match = normalized.match(/[-+]?\d+(?:\.\d+)?\s*%/);
  if (!match) return 0;
  return Number.parseFloat(match[0].replace("%", "").trim()) || 0;
}

function parseNumber(text: string): number | undefined {
  const n = Number.parseFloat(text.replace(/,/g, "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export async function fetchNaverSectorSnapshot(): Promise<{
  sectors: NaverSectorSnapshotItem[];
  stale: boolean;
  cachedAt?: number;
}> {
  const result = await fetchHTML(`${NAVER_FINANCE_URL}/sise/sise_group.naver?type=upjong`, {
    cacheKey: "naver-upjong-snapshot",
    staleTTL: 300_000,
    timeoutMs: 3000,
  });

  if (!result.data) return { sectors: [], stale: false };

  try {
    const $ = cheerio.load(result.data);
    const items: NaverSectorSnapshotItem[] = [];

    $("table.type_1 tbody tr").each((_, el) => {
      const $row = $(el);
      const $a = $row.find('a[href*="sise_group_detail.naver?type=upjong&no="]').first();
      if ($a.length === 0) return;

      const href = $a.attr("href") ?? "";
      const noMatch = href.match(/no=(\d+)/);
      const naverNo = noMatch?.[1];
      const name = $a.text().trim();
      if (!naverNo || !name) return;

      const changePercent = parsePercentFromText($row.text());

      items.push({
        id: `naver-${naverNo}`,
        naverNo,
        name,
        changePercent,
      });
    });

    return {
      sectors: items,
      stale: result.stale,
      cachedAt: result.cachedAt,
    };
  } catch {
    return { sectors: [], stale: false };
  }
}

export async function fetchNaverSectorDetail(
  naverNo: string
): Promise<{ sectorName: string; stocks: NaverSectorStockItem[] }> {
  const result = await fetchHTML(
    `${NAVER_FINANCE_URL}/sise/sise_group_detail.naver?type=upjong&no=${encodeURIComponent(naverNo)}`,
    {
      cacheKey: `naver-upjong-detail-${naverNo}`,
      staleTTL: 300_000,
      timeoutMs: 3000,
    }
  );

  if (!result.data) {
    return { sectorName: `업종 ${naverNo}`, stocks: [] };
  }

  try {
    const $ = cheerio.load(result.data);
    const sectorName =
      $(".sub_tit2").first().text().trim() ||
      $("h2").first().text().trim() ||
      `업종 ${naverNo}`;

    const stocks: NaverSectorStockItem[] = [];

    $("table.type_5 tbody tr, table.type_2 tbody tr").each((_, el) => {
      const $row = $(el);
      const $a = $row.find('a[href*="/item/main.naver?code="], a.tltle').first();
      if ($a.length === 0) return;

      const href = $a.attr("href") ?? "";
      const tickerMatch = href.match(/code=(\d+)/);
      const ticker = tickerMatch?.[1];
      const name = $a.text().trim();
      if (!ticker || !name) return;

      const tds = $row.find("td");
      const price = parseNumber(tds.eq(1).text());
      const changePercent = parsePercentFromText($row.text());

      stocks.push({
        ticker,
        name,
        price,
        changePercent,
      });
    });

    const unique = Array.from(new Map(stocks.map((s) => [s.ticker, s])).values());

    return { sectorName, stocks: unique };
  } catch {
    return { sectorName: `업종 ${naverNo}`, stocks: [] };
  }
}
