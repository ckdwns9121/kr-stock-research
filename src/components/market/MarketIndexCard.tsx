import type { MarketIndex } from "@/types/market";
import { formatPercent } from "@/lib/format";
import { getChangeColor, getChangeBgColor } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

interface MarketIndexCardProps {
  index: MarketIndex;
}

export function MarketIndexCard({ index }: MarketIndexCardProps) {
  const changeColor = getChangeColor(index.change);
  const changeBg = getChangeBgColor(index.change);
  const changeSign = index.change > 0 ? "+" : "";

  return (
    <Card className="flex-1">
      <p className="text-sm font-medium text-toss-gray-500 mb-1">{index.name}</p>
      <p className="text-2xl font-bold text-toss-gray-900 mb-2">
        {index.value.toLocaleString("ko-KR")}
      </p>
      <span
        className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-lg ${changeBg}`}
      >
        <span>
          {changeSign}
          {index.change.toLocaleString("ko-KR")}
        </span>
        <span>({formatPercent(index.changePercent)})</span>
      </span>
    </Card>
  );
}
