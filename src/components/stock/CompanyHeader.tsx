import type { StockSummary } from "@/types/stock";
import { formatPrice, formatPercent } from "@/lib/format";
import { getChangeColor } from "@/lib/utils";

interface CompanyHeaderProps {
  ticker: string;
  summary: StockSummary | null;
}

export function CompanyHeader({ ticker, summary }: CompanyHeaderProps) {
  if (!summary) {
    return (
      <div className="py-4">
        <h1 className="text-2xl font-bold text-dark-text-primary">{ticker}</h1>
        <p className="text-sm text-dark-text-muted mt-1">
          가격 정보를 불러올 수 없습니다
        </p>
      </div>
    );
  }

  const changeColor = getChangeColor(summary.change);
  const sign = summary.change > 0 ? "+" : "";

  return (
    <div className="py-4">
      <p className="text-sm font-medium text-dark-text-secondary mb-0.5">
        {ticker}
      </p>
      <h1 className="text-2xl font-bold text-dark-text-primary">{summary.name}</h1>
      <div className="flex items-baseline gap-3 mt-2">
        <span className="text-xl sm:text-3xl font-bold text-dark-text-primary">
          {formatPrice(summary.currentPrice)}
          <span className="text-lg font-medium ml-1">원</span>
        </span>
        <span className={`text-base font-semibold ${changeColor}`}>
          {sign}
          {formatPrice(summary.change)}원&nbsp;
          ({formatPercent(summary.changePercent)})
        </span>
      </div>
    </div>
  );
}
