import { MarketOverview } from "@/components/market/MarketOverview";

export function MarketSummary() {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-dark-text-secondary mb-3">시장 현황</h2>
      <MarketOverview />
    </div>
  );
}
