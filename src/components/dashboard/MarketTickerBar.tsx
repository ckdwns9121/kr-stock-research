"use client";

export interface TickerItem {
  name: string;
  value: number;
  changePercent: number;
}

interface MarketTickerBarProps {
  items: TickerItem[];
}

export function MarketTickerBar({ items }: MarketTickerBarProps) {
  if (items.length === 0) return null;

  return (
    <div
      className="bg-dark-card border-b border-dark-border overflow-x-auto"
      style={{ scrollbarWidth: "none" }}
    >
      <style>{`.ticker-bar::-webkit-scrollbar { display: none; }`}</style>
      <div className="ticker-bar flex items-center gap-0 min-w-max px-4 py-2">
        {items.map((item, i) => (
          <div key={item.name} className="flex items-center">
            {i > 0 && (
              <span className="w-px h-3 bg-dark-border mx-3 shrink-0" />
            )}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs text-dark-text-secondary">{item.name}</span>
              <span className="text-sm font-semibold text-dark-text-primary">
                {item.value.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`text-xs font-medium ${
                  item.changePercent > 0
                    ? "text-toss-red"
                    : item.changePercent < 0
                    ? "text-toss-blue"
                    : "text-dark-text-secondary"
                }`}
              >
                {item.changePercent > 0 ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
