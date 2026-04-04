import * as cheerio from "cheerio";
import { NAVER_FINANCE_URL, NAVER_CHART_URL } from "@/lib/constants";
import { fetchHTML, fetchWithTimeout } from "./client";
import type { StockSummary, ChartDataPoint } from "@/types/stock";
import type { NewsItem } from "@/types/news";
import type { MarketIndex, ExchangeRate, TrendingStock } from "@/types/market";
import type { FinancialMetrics } from "@/types/financial";

export interface NaverMetaResult<T> {
  data: T;
  stale: boolean;
  cachedAt?: number;
}

function parseSignedNumber(text: string): number {
  const normalized = text.replace(/,/g, "").trim();
  if (!normalized) return 0;

  const sign = normalized.includes("-") || normalized.includes("하락") ? -1 : 1;
  const numeric = parseFloat(normalized.replace(/[^\d.]/g, ""));
  if (Number.isNaN(numeric)) return 0;

  return sign * numeric;
}

export async function fetchStockSummaryWithMeta(
  ticker: string
): Promise<NaverMetaResult<StockSummary | null>> {
  const url = `${NAVER_FINANCE_URL}/item/main.naver?code=${ticker}`;
  const result = await fetchHTML(url, {
    cacheKey: `naver-summary-${ticker}`,
    staleTTL: 600_000,
    timeoutMs: 3000,
  });

  if (!result.data) {
    return { data: null, stale: false };
  }

  try {
    const $ = cheerio.load(result.data);
    const name = $(".wrap_company h2 a").text().trim() || $("title").text().split(":")[0]?.trim() || ticker;
    const priceText = $("#_nowVal").text().replace(/,/g, "") || $(".no_today .blind").first().text().replace(/,/g, "");
    const currentPrice = parseInt(priceText, 10) || 0;

    const changeText = $("#_change").text().replace(/,/g, "") || "0";
    const change = parseInt(changeText, 10) || 0;

    const changeRateCandidates = [
      $("#_rate").text(),
      $("#_rate .blind").text(),
      $(".no_exday .no_down .blind").last().text(),
      $(".no_exday .no_up .blind").last().text(),
      $(".no_exday .no_down em").last().text(),
      $(".no_exday .no_up em").last().text(),
      $(".rate_info .no_exday em").last().text(),
    ];
    const changeRateText = changeRateCandidates.find((text) => text.trim()) ?? "";
    let changePercent = parseSignedNumber(changeRateText);

    const isDown =
      $(".no_exday .ico.down").length > 0 ||
      $(".no_exday .bu_p.nico").length > 0 ||
      $(".no_exday .no_down").length > 0 ||
      changeRateText.includes("-") ||
      changeRateText.includes("하락");
    if (isDown && changePercent > 0) {
      changePercent = -Math.abs(changePercent);
    }
    if (!isDown && change < 0 && changePercent > 0) {
      changePercent = -Math.abs(changePercent);
    }

    const volumeText = $('th:contains("거래량")').next().text().replace(/,/g, "").trim();
    const volume = parseInt(volumeText, 10) || 0;

    return {
      data: {
      ticker,
      name,
      currentPrice,
      change: isDown ? -Math.abs(change) : change,
      changePercent,
      volume,
      },
      stale: result.stale,
      cachedAt: result.cachedAt,
    };
  } catch {
    return { data: null, stale: false };
  }
}

export async function fetchStockSummary(
  ticker: string
): Promise<StockSummary | null> {
  const result = await fetchStockSummaryWithMeta(ticker);
  return result.data;
}

export async function fetchNaverMetrics(
  ticker: string
): Promise<Partial<FinancialMetrics>> {
  const url = `${NAVER_FINANCE_URL}/item/main.naver?code=${ticker}`;
  const result = await fetchHTML(url, {
    cacheKey: `naver-metrics-${ticker}`,
    staleTTL: 600_000,
    timeoutMs: 3000,
  });

  if (!result.data) return {};

  try {
    const $ = cheerio.load(result.data);
    const metrics: Partial<FinancialMetrics> = {};

    const perText = $('#tab_con1 table em#_per').text().trim() ||
      $('em#_per').text().trim();
    if (perText && perText !== "-") metrics.per = parseFloat(perText);

    const pbrText = $('#tab_con1 table em#_pbr').text().trim() ||
      $('em#_pbr').text().trim();
    if (pbrText && pbrText !== "-") metrics.pbr = parseFloat(pbrText);

    return metrics;
  } catch {
    return {};
  }
}

export async function fetchChartData(
  ticker: string,
  days: number = 365
): Promise<ChartDataPoint[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

  const url = `${NAVER_CHART_URL}/siseJson.nhn?symbol=${ticker}&requestType=1&startTime=${fmt(startDate)}&endTime=${fmt(endDate)}&timeframe=day`;
  const result = await fetchWithTimeout<string>(url, {
    parseAs: "text",
    cacheKey: `naver-chart-${ticker}-${days}`,
    staleTTL: 600_000,
    timeoutMs: 3000,
  });

  if (!result.data) return [];

  try {
    const lines = result.data
      .trim()
      .split("\n")
      .slice(1, -1)
      .map((line) => line.trim());

    return lines
      .filter((line) => line.includes("["))
      .map((line) => {
        const inner = line.replace(/[\[\]]/g, "").replace(/"/g, "").trim();
        if (inner.endsWith(",")) {
          // Remove trailing comma
        }
        const parts = inner.replace(/,\s*$/, "").split(",").map((s) => s.trim());
        const dateStr = parts[0].replace(/'/g, "");
        return {
          date: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
          open: parseInt(parts[1], 10) || 0,
          high: parseInt(parts[2], 10) || 0,
          low: parseInt(parts[3], 10) || 0,
          close: parseInt(parts[4], 10) || 0,
          volume: parseInt(parts[5], 10) || 0,
        };
      })
      .filter((d) => d.close > 0);
  } catch {
    return [];
  }
}

export async function fetchCompanyNews(
  ticker: string,
  _page: number = 1
): Promise<NewsItem[]> {
  // Use main stock page which embeds recent news (iframe endpoint is unreliable)
  const url = `${NAVER_FINANCE_URL}/item/main.naver?code=${ticker}`;
  const result = await fetchHTML(url, {
    cacheKey: `naver-company-news-${ticker}`,
    staleTTL: 300_000,
    timeoutMs: 3000,
  });

  if (!result.data) return [];

  try {
    // Naver finance returns euc-kr encoded HTML
    const $ = cheerio.load(result.data);
    const items: NewsItem[] = [];

    // News section on the main stock page
    $('a[href*="news_read.naver"]').each((_, el) => {
      const $a = $(el);
      const title = $a.text().trim();
      if (!title || title.length < 5) return;

      const href = $a.attr("href") ?? "";
      // Extract office_id and article_id for clean URL
      const oidMatch = href.match(/office_id=(\d+)/);
      const aidMatch = href.match(/article_id=(\d+)/);

      let newsUrl: string;
      if (oidMatch && aidMatch) {
        newsUrl = `https://n.news.naver.com/mnews/article/${oidMatch[1]}/${aidMatch[1]}`;
      } else {
        newsUrl = href.startsWith("http") ? href : `${NAVER_FINANCE_URL}${href}`;
      }

      // Avoid duplicates
      if (items.some((i) => i.url === newsUrl)) return;

      items.push({
        title,
        url: newsUrl,
        source: "",
        date: new Date().toISOString().slice(0, 10),
      });
    });

    return items.slice(0, 10);
  } catch {
    return [];
  }
}

export async function fetchMarketNewsWithMeta(): Promise<NaverMetaResult<NewsItem[]>> {
  const url = `${NAVER_FINANCE_URL}/news/mainnews.naver`;
  const result = await fetchHTML(url, {
    cacheKey: "naver-market-news",
    staleTTL: 300_000,
    timeoutMs: 3000,
  });

  if (!result.data) return { data: [], stale: false };

  try {
    const $ = cheerio.load(result.data);
    const items: NewsItem[] = [];

    $(".mainNewsList li").each((_, el) => {
      const $el = $(el);
      const $a = $el.find("a");
      const title = $a.text().trim();
      if (!title) return;

      const href = $a.attr("href") ?? "";
      const fullUrl = href.startsWith("http")
        ? href
        : `${NAVER_FINANCE_URL}${href}`;
      const source = $el.find(".press").text().trim();
      const date = $el.find(".wdate").text().trim();

      items.push({ title, url: fullUrl, source, date });
    });

    return {
      data: items.slice(0, 20),
      stale: result.stale,
      cachedAt: result.cachedAt,
    };
  } catch {
    return { data: [], stale: false };
  }
}

export async function fetchMarketNews(): Promise<NewsItem[]> {
  const result = await fetchMarketNewsWithMeta();
  return result.data;
}

export async function fetchMarketIndicesWithMeta(): Promise<NaverMetaResult<MarketIndex[]>> {
  const indices: MarketIndex[] = [];
  let usedStale = false;
  let latestCachedAt: number | undefined;

  for (const code of ["KOSPI", "KOSDAQ"]) {
    const url = `${NAVER_FINANCE_URL}/sise/sise_index.naver?code=${code}`;
    const result = await fetchHTML(url, {
      cacheKey: `naver-index-${code}`,
      staleTTL: 600_000,
      timeoutMs: 3000,
    });

    if (!result.data) continue;
    if (result.stale) {
      usedStale = true;
      latestCachedAt = Math.max(latestCachedAt ?? 0, result.cachedAt ?? 0);
    }

    try {
      const $ = cheerio.load(result.data);
      const valueText = $("#now_value").text().replace(/,/g, "").trim();
      const changeText = $("#change_value_and_rate .tah:first-child")
        .text()
        .replace(/,/g, "")
        .trim();
      const rateText = $("#change_value_and_rate .tah:last-child")
        .text()
        .replace(/%/g, "")
        .trim();

      const value = parseFloat(valueText) || 0;
      const change = parseFloat(changeText) || 0;
      const changePercent = parseFloat(rateText) || 0;

      const isDown = $(".no_down").length > 0;

      indices.push({
        name: code,
        value,
        change: isDown ? -Math.abs(change) : change,
        changePercent: isDown ? -Math.abs(changePercent) : changePercent,
      });
    } catch {
      continue;
    }
  }

  return {
    data: indices,
    stale: usedStale,
    cachedAt: latestCachedAt,
  };
}

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const result = await fetchMarketIndicesWithMeta();
  return result.data;
}

export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  const url = `${NAVER_FINANCE_URL}/marketindex/`;
  const result = await fetchHTML(url, {
    cacheKey: "naver-exchange-rates",
    staleTTL: 600_000,
    timeoutMs: 3000,
  });

  if (!result.data) return [];

  try {
    const $ = cheerio.load(result.data);
    const rates: ExchangeRate[] = [];

    const targets = [
      { selector: "#exchangeList li.on", name: "USD/KRW" },
    ];

    // Parse all exchange rate items from the market index page
    $("#exchangeList li").each((_, el) => {
      const $el = $(el);
      const nameText = $el.find(".h_lst .blind").text().trim() ||
        $el.find(".h_lst").text().trim();
      const valueText = $el.find(".value").text().replace(/,/g, "").trim();
      const changeText = $el.find(".change").text().replace(/,/g, "").trim();
      const changePercentText = $el.find(".blind").last().text().replace(/%/g, "").trim();

      const value = parseFloat(valueText) || 0;
      if (value === 0) return;

      const change = parseFloat(changeText) || 0;
      const changePercent = parseFloat(changePercentText) || 0;
      const isDown = $el.find(".ico.down").length > 0 || $el.hasClass("down");

      let name = "";
      if (nameText.includes("달러") || nameText.includes("USD")) name = "USD/KRW";
      else if (nameText.includes("유로") || nameText.includes("EUR")) name = "EUR/KRW";
      else if (nameText.includes("엔") || nameText.includes("JPY")) name = "JPY/KRW";
      else return;

      rates.push({
        name,
        value,
        change: isDown ? -Math.abs(change) : change,
        changePercent: isDown ? -Math.abs(changePercent) : changePercent,
      });
    });

    return rates;
  } catch {
    return [];
  }
}

async function fetchMarketMovers(
  type: "rise" | "fall"
): Promise<NaverMetaResult<TrendingStock[]>> {
  const url = `${NAVER_FINANCE_URL}/sise/sise_${type === "rise" ? "rise" : "fall"}.naver`;
  const result = await fetchHTML(url, {
    cacheKey: `naver-movers-${type}`,
    staleTTL: 300_000,
    timeoutMs: 3000,
  });

  if (!result.data) return { data: [], stale: false };

  try {
    const $ = cheerio.load(result.data);
    const stocks: TrendingStock[] = [];

    $("table.type_2 tbody tr").each((_, el) => {
      if (stocks.length >= 5) return false;

      const $el = $(el);
      const $a = $el.find("a.tltle");
      const name = $a.text().trim();
      if (!name) return;

      const href = $a.attr("href") ?? "";
      const tickerMatch = href.match(/code=(\d+)/);
      const ticker = tickerMatch ? tickerMatch[1] : "";
      if (!ticker) return;

      const priceText = $el.find("td:nth-child(3)").text().replace(/,/g, "").trim();
      const price = parseInt(priceText, 10) || 0;

      const percentText = $el.find("td:nth-child(5)").text().replace(/%/g, "").replace(/[+\s]/g, "").trim();
      let changePercent = parseFloat(percentText) || 0;
      if (type === "fall") changePercent = -Math.abs(changePercent);

      stocks.push({ ticker, name, price, changePercent });
    });

    return {
      data: stocks,
      stale: result.stale,
      cachedAt: result.cachedAt,
    };
  } catch {
    return { data: [], stale: false };
  }
}

export async function fetchTopGainers(): Promise<TrendingStock[]> {
  const result = await fetchMarketMovers("rise");
  return result.data;
}

export async function fetchTopLosers(): Promise<TrendingStock[]> {
  const result = await fetchMarketMovers("fall");
  return result.data;
}

export async function fetchTopGainersWithMeta(): Promise<NaverMetaResult<TrendingStock[]>> {
  return fetchMarketMovers("rise");
}

export async function fetchTopLosersWithMeta(): Promise<NaverMetaResult<TrendingStock[]>> {
  return fetchMarketMovers("fall");
}
