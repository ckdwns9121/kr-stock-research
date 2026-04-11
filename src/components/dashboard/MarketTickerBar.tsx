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

  // 마퀴 효과를 위해 아이템을 2번 반복
  const doubled = [...items, ...items];

  return (
    <div className="bg-dark-card border-b border-dark-border overflow-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 30s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="marquee-track flex items-center gap-0 min-w-max py-2">
        {doubled.map((item, i) => (
          <div key={`${item.name}-${i}`} className="flex items-center">
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
