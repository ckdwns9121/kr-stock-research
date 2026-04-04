export const DART_BASE_URL = "https://opendart.fss.or.kr/api";
export const NAVER_FINANCE_URL = "https://finance.naver.com";
export const NAVER_CHART_URL = "https://fchart.stock.naver.com";

export const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export const CACHE_TTL = {
  FINANCIAL: 3600,
  PRICE: 300,
  CHART: 300,
  NEWS: 120,
  STOCK_LIST: 86400,
  MARKET: 300,
} as const;

export const CHART_PERIODS = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "3Y", days: 1095 },
] as const;
