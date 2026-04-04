import { MarketOverview } from "@/components/market/MarketOverview";

export function MarketSummary() {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-medium text-toss-gray-500 mb-3">시장 현황</h2>
      <MarketOverview />
    </div>
  );
}
