export interface USIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface MacroIndicators {
  vix: number;
  tenYearYield: number;
  dxy: number;
}

export interface SectorData {
  symbol: string;
  name: string;
  changePercent: number;
}

export interface AIMarketAnalysis {
  marketSummary: string;
  riskSentiment: "risk-on" | "risk-off" | "neutral";
  strongSectors: { name: string; reason: string }[];
  weakSectors: { name: string; reason: string }[];
}

export interface GlobalMarketData {
  indices: USIndex[];
  macro: MacroIndicators;
  sectors: SectorData[];
  aiAnalysis: AIMarketAnalysis | null;
  cachedAt: number;
}
