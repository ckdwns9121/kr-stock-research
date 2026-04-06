import * as cheerio from "cheerio";
import OpenAI from "openai";
import { NAVER_FINANCE_URL } from "@/lib/constants";
import { fetchHTML, fetchWithTimeout } from "@/lib/api/client";
import { fetchNaverSectorSnapshot } from "@/lib/api/naver-sectors";
import {
  fetchMarketIndicesWithMeta,
  fetchTopGainersWithMeta,
  fetchTopLosersWithMeta,
  fetchMarketNewsWithMeta,
  fetchStockSummaryWithMeta,
} from "@/lib/api/naver";
import { SECTORS } from "@/lib/sectors";
import type { MacroDashboardData, DataMeta, DataStatus, MacroMetric, SectorPerformance } from "@/types/dashboard";
import type { MarketIndex } from "@/types/market";

const TTL = {
  summary: "3~5분",
  indices: "1~3분",
  sectors: "1~3분",
  macro: "5~15분",
  news: "10~30분",
} as const;

function nowIso() {
  return new Date().toISOString();
}

function toIso(ts?: number) {
  return ts ? new Date(ts).toISOString() : undefined;
}

function makeMeta(
  status: DataStatus,
  source: string,
  ttlLabel: string,
  lastUpdated?: string
): DataMeta {
  return { status, source, ttlLabel, lastUpdated };
}

function computeRegimeScore({
  indices,
  strongSector,
  weakSector,
  us10y,
}: {
  indices: MarketIndex[];
  strongSector?: SectorPerformance;
  weakSector?: SectorPerformance;
  us10y?: MacroMetric;
}) {
  let score = 0;

  for (const idx of indices) {
    if (idx.changePercent > 0) score += 1;
    if (idx.changePercent < 0) score -= 1;
  }

  if (strongSector && strongSector.avgChangePercent > 0) score += 1;
  if (weakSector && weakSector.avgChangePercent < 0) score -= 1;

  if (us10y) {
    // 금리 상승은 일반적으로 위험자산 선호에 부정적
    if (us10y.changePercent > 0) score -= 1;
    if (us10y.changePercent < 0) score += 1;
  }

  return score;
}

function buildHeadline({
  regime,
  strongSector,
  weakSector,
}: {
  regime: "Risk-on" | "Risk-off" | "중립";
  strongSector?: SectorPerformance;
  weakSector?: SectorPerformance;
}) {
  if (!strongSector || !weakSector) {
    return "핵심 데이터가 일부 비어 있어 요약 신뢰도가 낮습니다.";
  }
  if (regime === "Risk-on") {
    return `${strongSector.emoji} ${strongSector.name} 강세, ${weakSector.emoji} ${weakSector.name} 약세입니다.`;
  }
  if (regime === "Risk-off") {
    return `방어 흐름입니다. ${weakSector.emoji} ${weakSector.name} 약세가 두드러집니다.`;
  }
  return `혼조 흐름입니다. ${strongSector.emoji} ${strongSector.name} 대비 ${weakSector.emoji} ${weakSector.name}가 약합니다.`;
}

function parseNumeric(text: string): number {
  const normalized = text.replace(/,/g, "").replace(/[^\d.+-]/g, "").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

async function fetchYahooQuote(symbol: string): Promise<{
  value: number;
  change: number;
  changePercent: number;
  stale: boolean;
  cachedAt?: number;
} | null> {
  const result = await fetchWithTimeout<{
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number; chartPreviousClose?: number };
      }>;
    };
  }>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2d&interval=1d`, {
    parseAs: "json",
    timeoutMs: 3000,
    cacheKey: `yahoo-${symbol}`,
    staleTTL: 900_000,
  });

  const meta = result.data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice || !meta.chartPreviousClose) return null;
  const value = meta.regularMarketPrice;
  const change = value - meta.chartPreviousClose;
  const changePercent = (change / meta.chartPreviousClose) * 100;
  return { value, change, changePercent, stale: result.stale, cachedAt: result.cachedAt };
}

async function fetchMacroMetrics(): Promise<{
  items: MacroMetric[];
  usedFallback: boolean;
  stale: boolean;
  cachedAt?: number;
}> {
  const marketIndexResult = await fetchHTML(`${NAVER_FINANCE_URL}/marketindex/`, {
    cacheKey: "naver-marketindex-macro-home",
    staleTTL: 900_000,
    timeoutMs: 3000,
  });

  const naverItems = new Map<MacroMetric["key"], MacroMetric>();
  if (marketIndexResult.data) {
    try {
      const $ = cheerio.load(marketIndexResult.data);
      const lis = $("li");
      lis.each((_, el) => {
        const nameRaw =
          $(el).find(".h_lst .blind").first().text().trim() ||
          $(el).find(".h_lst").first().text().trim() ||
          $(el).find("a").first().text().trim();
        const valueRaw =
          $(el).find(".value").first().text().trim() ||
          $(el).find(".no_today .value").first().text().trim();
        if (!nameRaw || !valueRaw) return;

        const key: MacroMetric["key"] | null = /미국.*10년|10Y|10년물/i.test(nameRaw)
          ? "us10y"
          : /(WTI|원유|서부텍사스)/i.test(nameRaw)
            ? "wti"
            : /(국제\s*금|금\(현물\)|Gold)/i.test(nameRaw)
              ? "gold"
              : null;
        if (!key) return;

        const value = parseNumeric(valueRaw);
        if (!Number.isFinite(value)) return;

        const rateRaw =
          $(el).find(".change .blind").last().text().trim() ||
          $(el).find(".change").first().text().trim();
        const changeRaw = $(el).find(".change .value").first().text().trim();
        const parsedRate = parseNumeric(rateRaw);
        const parsedChange = parseNumeric(changeRaw);
        const isDown = $(el).find(".down").length > 0 || $(el).hasClass("down");

        const changePercent = Number.isFinite(parsedRate)
          ? (isDown ? -Math.abs(parsedRate) : parsedRate)
          : 0;
        const change = Number.isFinite(parsedChange)
          ? (isDown ? -Math.abs(parsedChange) : parsedChange)
          : 0;

        naverItems.set(key, {
          key,
          name: key === "us10y" ? "미국 10년물" : key === "wti" ? "WTI" : "금",
          value,
          unit: key === "us10y" ? "%" : "$",
          change,
          changePercent,
          source: "Naver",
        });
      });
    } catch {
      // ignore parse failure
    }
  }

  let usedFallback = false;
  let stale = marketIndexResult.stale;
  let latestCachedAt = marketIndexResult.cachedAt ?? 0;

  const needed: Array<{ key: MacroMetric["key"]; symbol: string; name: string; unit: string }> = [
    { key: "us10y", symbol: "^TNX", name: "미국 10년물", unit: "%" },
    { key: "wti", symbol: "CL=F", name: "WTI", unit: "$" },
    { key: "gold", symbol: "GC=F", name: "금", unit: "$" },
  ];

  for (const item of needed) {
    if (naverItems.has(item.key)) continue;
    usedFallback = true;
    const fb = await fetchYahooQuote(item.symbol);
    if (!fb) continue;
    stale = stale || fb.stale;
    latestCachedAt = Math.max(latestCachedAt, fb.cachedAt ?? 0);
    naverItems.set(item.key, {
      key: item.key,
      name: item.name,
      value: fb.value,
      unit: item.unit,
      change: fb.change,
      changePercent: fb.changePercent,
      source: "Yahoo",
    });
  }

  return {
    items: needed
      .map((item) => naverItems.get(item.key))
      .filter((v): v is MacroMetric => Boolean(v)),
    usedFallback,
    stale,
    cachedAt: latestCachedAt > 0 ? latestCachedAt : undefined,
  };
}

async function fetchNasdaqIndex(): Promise<{ index: MarketIndex | null; stale: boolean; cachedAt?: number }> {
  const metric = await fetchYahooQuote("^IXIC");
  if (!metric) return { index: null, stale: false };
  return {
    index: {
      name: "NASDAQ",
      value: metric.value,
      change: metric.change,
      changePercent: metric.changePercent,
    },
    stale: metric.stale,
    cachedAt: metric.cachedAt,
  };
}

async function fetchSectorPerformance(): Promise<{ items: SectorPerformance[]; stale: boolean; cachedAt?: number }> {
  const naverSectorSnapshot = await fetchNaverSectorSnapshot();
  if (naverSectorSnapshot.sectors.length > 0) {
    const dynamicItems: SectorPerformance[] = naverSectorSnapshot.sectors.map((item) => ({
      id: item.id,
      name: item.name,
      emoji: "📊",
      avgChangePercent: item.changePercent,
      advancerRatio: item.changePercent > 0 ? 1 : item.changePercent < 0 ? 0 : 0.5,
      score: item.changePercent,
      sampleSize: 0,
    }));

    return {
      items: dynamicItems.sort((a, b) => b.score - a.score),
      stale: naverSectorSnapshot.stale,
      cachedAt: naverSectorSnapshot.cachedAt,
    };
  }

  let usedStale = false;
  let latestCachedAt = 0;
  const perSector = await Promise.all(
    SECTORS.map(async (sector) => {
      const summaries = await Promise.all(
        sector.stocks.map((stock) => fetchStockSummaryWithMeta(stock.ticker))
      );
      summaries.forEach((s) => {
        if (s.stale) {
          usedStale = true;
          latestCachedAt = Math.max(latestCachedAt, s.cachedAt ?? 0);
        }
      });
      const valid = summaries.map((s) => s.data).filter((s): s is NonNullable<typeof s> => Boolean(s));
      if (valid.length === 0) {
        return {
          id: sector.id,
          name: sector.name,
          emoji: sector.emoji,
          avgChangePercent: 0,
          advancerRatio: 0,
          score: 0,
          sampleSize: 0,
        };
      }

      const avgChangePercent =
        valid.reduce((acc, cur) => acc + cur.changePercent, 0) / valid.length;
      const advancerRatio =
        valid.filter((cur) => cur.changePercent > 0).length / valid.length;
      const score = avgChangePercent * 0.7 + advancerRatio * 100 * 0.3;

      return {
        id: sector.id,
        name: sector.name,
        emoji: sector.emoji,
        avgChangePercent,
        advancerRatio,
        score,
        sampleSize: valid.length,
      };
    })
  );

  return {
    items: perSector.sort((a, b) => b.score - a.score),
    stale: usedStale,
    cachedAt: latestCachedAt > 0 ? latestCachedAt : undefined,
  };
}

const KR_AI_CACHE_TTL = 30 * 60 * 1000;
let krAiCache: { comment: string; timestamp: number } | null = null;

async function generateKRMarketAI({
  indices,
  sectors,
  macro,
  regime,
}: {
  indices: MarketIndex[];
  sectors: SectorPerformance[];
  macro: MacroMetric[];
  regime: "Risk-on" | "Risk-off" | "중립";
}): Promise<string | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return undefined;

  const now = Date.now();
  if (krAiCache && now - krAiCache.timestamp < KR_AI_CACHE_TTL) {
    return krAiCache.comment;
  }

  try {
    const strong = sectors[0];
    const weak = sectors[sectors.length - 1];
    const userContent = `[한국 지수]
${indices.map((i) => `${i.name}: ${i.value.toLocaleString()} (${i.changePercent >= 0 ? "+" : ""}${i.changePercent.toFixed(2)}%)`).join("\n")}

[거시 지표]
${macro.map((m) => `${m.name}: ${m.value}${m.unit} (${m.changePercent >= 0 ? "+" : ""}${m.changePercent.toFixed(2)}%)`).join("\n")}

[섹터 강약]
강세: ${strong ? `${strong.emoji} ${strong.name} (${strong.avgChangePercent.toFixed(2)}%)` : "없음"}
약세: ${weak ? `${weak.emoji} ${weak.name} (${weak.avgChangePercent.toFixed(2)}%)` : "없음"}

[시장 체온]
${regime}`;

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            '당신은 한국 주식 시장 분석가입니다. 제공된 데이터를 바탕으로 오늘의 한국 시장을 간결하게 분석하세요. 반드시 JSON으로만 응답: {"comment": "2-3문장 분석"}',
        },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { comment?: string };
    const comment = typeof parsed.comment === "string" ? parsed.comment : undefined;
    if (comment) {
      krAiCache = { comment, timestamp: now };
    }
    return comment;
  } catch {
    return undefined;
  }
}

export async function fetchMacroDashboardData(): Promise<MacroDashboardData> {
  const fetchedAt = nowIso();

  const [indicesBase, nasdaq, macro, sectors, gainers, losers, news] = await Promise.all([
    fetchMarketIndicesWithMeta(),
    fetchNasdaqIndex(),
    fetchMacroMetrics(),
    fetchSectorPerformance(),
    fetchTopGainersWithMeta(),
    fetchTopLosersWithMeta(),
    fetchMarketNewsWithMeta(),
  ]);

  const indices = nasdaq.index ? [...indicesBase.data, nasdaq.index] : indicesBase.data;
  const strongSector = sectors.items[0];
  const weakSector = sectors.items[sectors.items.length - 1];
  const us10y = macro.items.find((m) => m.key === "us10y");
  const regimeScore = computeRegimeScore({ indices, strongSector, weakSector, us10y });
  const regime: "Risk-on" | "Risk-off" | "중립" =
    regimeScore >= 2 ? "Risk-on" : regimeScore <= -1 ? "Risk-off" : "중립";

  const aiComment = await generateKRMarketAI({ indices, sectors: sectors.items, macro: macro.items, regime });

  const evidenceStatuses: DataStatus[] = [];
  evidenceStatuses.push(indices.length > 0 ? (indicesBase.stale || nasdaq.stale ? "stale" : "fresh") : "unavailable");
  evidenceStatuses.push(macro.items.length > 0 ? (macro.stale ? "stale" : "fresh") : "unavailable");
  evidenceStatuses.push(sectors.items.some((s) => s.sampleSize > 0) ? (sectors.stale ? "stale" : "fresh") : "unavailable");
  const summaryStatus: DataStatus =
    evidenceStatuses.includes("unavailable")
      ? "unavailable"
      : evidenceStatuses.includes("stale")
        ? "stale"
        : "fresh";

  const summaryLastUpdated = toIso(
    Math.max(
      indicesBase.cachedAt ?? 0,
      nasdaq.cachedAt ?? 0,
      macro.cachedAt ?? 0,
      sectors.cachedAt ?? 0
    )
  ) ?? fetchedAt;
  const summaryMeta = makeMeta(summaryStatus, "Naver 우선", TTL.summary, summaryLastUpdated);

  return {
    summary: {
      regime,
      strongSector,
      weakSector,
      headline: buildHeadline({ regime, strongSector, weakSector }),
      aiComment,
    },
    summaryMeta,
    indices: {
      items: indices,
      meta: makeMeta(
        indices.length > 0 ? (indicesBase.stale || nasdaq.stale ? "stale" : "fresh") : "unavailable",
        nasdaq.index ? "Naver + Yahoo" : "Naver",
        TTL.indices,
        indices.length > 0 ? (toIso(Math.max(indicesBase.cachedAt ?? 0, nasdaq.cachedAt ?? 0)) ?? fetchedAt) : undefined
      ),
    },
    macro: {
      items: macro.items,
      meta: makeMeta(
        macro.items.length > 0 ? (macro.stale ? "stale" : "fresh") : "unavailable",
        macro.usedFallback ? "Naver 우선 + Yahoo 보완" : "Naver",
        TTL.macro,
        macro.items.length > 0 ? (toIso(macro.cachedAt) ?? fetchedAt) : undefined
      ),
    },
    sectors: {
      items: sectors.items,
      meta: makeMeta(
        sectors.items.some((s) => s.sampleSize > 0) ? (sectors.stale ? "stale" : "fresh") : "unavailable",
        "Naver",
        TTL.sectors,
        sectors.items.some((s) => s.sampleSize > 0) ? (toIso(sectors.cachedAt) ?? fetchedAt) : undefined
      ),
    },
    leaders: {
      gainers: gainers.data,
      losers: losers.data,
      meta: makeMeta(
        gainers.data.length > 0 || losers.data.length > 0
          ? (gainers.stale || losers.stale ? "stale" : "fresh")
          : "unavailable",
        "Naver",
        TTL.indices,
        gainers.data.length > 0 || losers.data.length > 0
          ? (toIso(Math.max(gainers.cachedAt ?? 0, losers.cachedAt ?? 0)) ?? fetchedAt)
          : undefined
      ),
    },
    news: {
      items: news.data.slice(0, 7),
      meta: makeMeta(
        news.data.length > 0 ? (news.stale ? "stale" : "fresh") : "unavailable",
        "Naver",
        TTL.news,
        news.data.length > 0 ? (toIso(news.cachedAt) ?? fetchedAt) : undefined
      ),
    },
  };
}
