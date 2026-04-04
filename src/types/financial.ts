export interface FinancialMetrics {
  per?: number;
  pbr?: number;
  roe?: number;
  evEbitda?: number;
  eps?: number;
  bps?: number;
}

export interface FinancialStatement {
  year: number;
  quarter?: string;
  revenue: number;
  operatingProfit: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface FinancialSummary {
  corpCode: string;
  corpName: string;
  metrics: FinancialMetrics;
  statements: FinancialStatement[];
}
