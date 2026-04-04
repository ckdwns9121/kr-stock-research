export interface MarketIndex {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface TrendingStock {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
}

export interface ExchangeRate {
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface MarketOverview {
  indices: MarketIndex[];
  topGainers: TrendingStock[];
  topLosers: TrendingStock[];
  timestamp: string;
}
