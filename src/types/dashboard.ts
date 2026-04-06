import type { MarketIndex, TrendingStock } from "@/types/market";
import type { NewsItem } from "@/types/news";

export type DataStatus = "fresh" | "stale" | "unavailable";

export interface DataMeta {
  status: DataStatus;
  source: string;
  ttlLabel: string;
  lastUpdated?: string;
}

export interface MacroMetric {
  key: "us10y" | "wti" | "gold";
  name: string;
  value: number;
  unit: string;
  change: number;
  changePercent: number;
  source: string;
}

export interface SectorPerformance {
  id: string;
  name: string;
  emoji: string;
  avgChangePercent: number;
  advancerRatio: number;
  score: number;
  sampleSize: number;
}

export interface MarketSummary {
  regime: "Risk-on" | "Risk-off" | "중립";
  strongSector?: SectorPerformance;
  weakSector?: SectorPerformance;
  headline: string;
  aiComment?: string;
}

export interface MacroDashboardData {
  summary: MarketSummary;
  summaryMeta: DataMeta;
  indices: {
    items: MarketIndex[];
    meta: DataMeta;
  };
  macro: {
    items: MacroMetric[];
    meta: DataMeta;
  };
  sectors: {
    items: SectorPerformance[];
    meta: DataMeta;
  };
  leaders: {
    gainers: TrendingStock[];
    losers: TrendingStock[];
    meta: DataMeta;
  };
  news: {
    items: NewsItem[];
    meta: DataMeta;
  };
}
