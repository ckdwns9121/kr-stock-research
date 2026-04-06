"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ChartDataPoint } from "@/types/stock";

interface StockChartProps {
  ticker: string;
}

type Period = "1M" | "3M" | "6M" | "1Y" | "3Y";

const PERIOD_DAYS: Record<Period, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "3Y": 1095,
};

const PERIODS: Period[] = ["1M", "3M", "6M", "1Y", "3Y"];

export function StockChart({ ticker }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<{ chart: ReturnType<typeof import("lightweight-charts").createChart>; series: unknown } | null>(null);

  const [activePeriod, setActivePeriod] = useState<Period>("1Y");
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchData = useCallback(
    async (period: Period) => {
      try {
        const days = PERIOD_DAYS[period];
        const res = await fetch(`/api/stock/${ticker}/chart?period=${days}`);
        if (!res.ok) return null;
        const json = await res.json();
        const points: ChartDataPoint[] = json.data ?? [];
        return points.length > 0 ? points : null;
      } catch {
        return null;
      }
    },
    [ticker]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    (async () => {
      const lc = await import("lightweight-charts");
      if (disposed || !containerRef.current) return;

      const chart = lc.createChart(containerRef.current, {
        autoSize: true,
        layout: {
          background: { type: lc.ColorType.Solid, color: "transparent" },
          textColor: "#8B95A1",
          fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.06)", style: lc.LineStyle.Solid },
          horzLines: { color: "rgba(255,255,255,0.06)", style: lc.LineStyle.Solid },
        },
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        crosshair: {
          vertLine: { color: "#3182F6", width: 1, style: lc.LineStyle.Dashed },
          horzLine: { color: "#3182F6", width: 1, style: lc.LineStyle.Dashed },
        },
        handleScroll: false,
        handleScale: false,
      });

      const series = chart.addAreaSeries({
        lineColor: "#3182F6",
        topColor: "rgba(49, 130, 246, 0.15)",
        bottomColor: "rgba(49, 130, 246, 0)",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: "#3182F6",
        crosshairMarkerBackgroundColor: "#1E1E24",
        priceLineVisible: false,
        lastValueVisible: true,
      });

      chartInstanceRef.current = { chart, series: series as unknown };

      // Fetch initial data
      const points = await fetchData(activePeriod);
      if (disposed) return;

      if (!points) {
        setHasError(true);
        setLoading(false);
        return;
      }

      series.setData(
        points.map((p) => ({
          time: p.date as string,
          value: p.close,
        }))
      );
      chart.timeScale().fitContent();
      setLoading(false);
    })();

    return () => {
      disposed = true;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.chart.remove();
        chartInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const handlePeriodChange = async (period: Period) => {
    setActivePeriod(period);
    setLoading(true);
    setHasError(false);

    const points = await fetchData(period);
    if (!points) {
      setHasError(true);
      setLoading(false);
      return;
    }

    const inst = chartInstanceRef.current;
    if (!inst) return;

    const series = inst.series as import("lightweight-charts").ISeriesApi<"Area">;
    series.setData(
      points.map((p) => ({
        time: p.date as string,
        value: p.close,
      }))
    );
    inst.chart.timeScale().fitContent();
    setLoading(false);
  };

  if (hasError) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-text-primary">주가 차트</h3>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activePeriod === p
                    ? "bg-toss-blue text-white"
                    : "text-dark-text-secondary hover:bg-dark-elevated"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-dark-text-muted text-center py-12">
          차트 데이터를 불러올 수 없습니다
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-text-primary">주가 차트</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activePeriod === p
                  ? "bg-toss-blue text-white"
                  : "text-dark-text-secondary hover:bg-dark-elevated"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height: 280 }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-dark-card/80 rounded-xl">
            <Skeleton className="h-full w-full absolute inset-0" />
          </div>
        )}
        <div ref={containerRef} className="w-full" style={{ height: 280 }} />
      </div>
    </Card>
  );
}
