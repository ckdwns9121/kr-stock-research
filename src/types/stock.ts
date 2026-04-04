export interface Stock {
  ticker: string;
  name: string;
  market: "KOSPI" | "KOSDAQ";
  sector?: string;
}

export interface StockSummary {
  ticker: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high52w?: number;
  low52w?: number;
}

export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
