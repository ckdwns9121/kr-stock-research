"use client";

interface ConsensusBarProps {
  currentPrice: number;
  targetPrice: number;
  companyName: string;
}

export function ConsensusBar({ currentPrice, targetPrice, companyName }: ConsensusBarProps) {
  const diff = targetPrice - currentPrice;
  const gapPercent = ((diff / currentPrice) * 100);
  const isUpside = diff >= 0;

  // Bar: show current price position within a range
  // Range: min=currentPrice*0.85, max=targetPrice*1.05 (or vice versa)
  const low = Math.min(currentPrice, targetPrice) * 0.95;
  const high = Math.max(currentPrice, targetPrice) * 1.05;
  const range = high - low;

  const currentPos = range > 0 ? ((currentPrice - low) / range) * 100 : 50;
  const targetPos = range > 0 ? ((targetPrice - low) / range) * 100 : 50;

  function formatPrice(p: number): string {
    return p.toLocaleString("ko-KR");
  }

  return (
    <div className="bg-dark-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-dark-text-primary">컨센서스 목표가</h3>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            isUpside
              ? "bg-toss-red/10 text-toss-red"
              : "bg-toss-blue/10 text-toss-blue"
          }`}
        >
          {isUpside ? "+" : ""}
          {gapPercent.toFixed(1)}%
        </span>
      </div>

      {/* Bar track */}
      <div className="relative h-2 bg-dark-elevated rounded-full mb-4">
        {/* Fill between current and target */}
        <div
          className={`absolute top-0 h-2 rounded-full ${
            isUpside ? "bg-toss-red/30" : "bg-toss-blue/30"
          }`}
          style={{
            left: `${Math.min(currentPos, targetPos)}%`,
            width: `${Math.abs(targetPos - currentPos)}%`,
          }}
        />
        {/* Current price dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-dark-text-secondary border-2 border-dark-card z-10"
          style={{ left: `calc(${currentPos}% - 6px)` }}
        />
        {/* Target price dot */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-dark-card z-10 ${
            isUpside ? "bg-toss-red" : "bg-toss-blue"
          }`}
          style={{ left: `calc(${targetPos}% - 6px)` }}
        />
      </div>

      {/* Labels */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-dark-text-muted mb-0.5">현재가</p>
          <p className="text-sm font-semibold text-dark-text-primary tabular-nums">
            {formatPrice(currentPrice)}원
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-dark-text-muted mb-0.5">목표가</p>
          <p
            className={`text-sm font-semibold tabular-nums ${
              isUpside ? "text-toss-red" : "text-toss-blue"
            }`}
          >
            {formatPrice(targetPrice)}원
          </p>
        </div>
      </div>

      <p className="text-xs text-dark-text-muted mt-2 text-center">
        괴리율{" "}
        <span
          className={`font-medium ${isUpside ? "text-toss-red" : "text-toss-blue"}`}
        >
          {isUpside ? "+" : ""}
          {gapPercent.toFixed(2)}%
        </span>
      </p>
    </div>
  );
}
