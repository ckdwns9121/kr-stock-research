"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  IChartApi,
  ISeriesApi,
  AreaSeriesPartialOptions,
} from "lightweight-charts";
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
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const [activePeriod, setActivePeriod] = useState<Period>("1Y");
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchAndRender = useCallback(
    async (period: Period) => {
      if (!chartRef.current || !seriesRef.current) return;
      setLoading(true);

      try {
        const days = PERIOD_DAYS[period];
        const res = await fetch(
          `/api/stock/${ticker}/chart?period=${days}`
        );
        if (!res.ok) throw new Error("chart fetch failed");
        const json = await res.json();
        const points: ChartDataPoint[] = json.data ?? [];

        if (points.length === 0) throw new Error("empty chart data");

        const seriesData = points.map((p) => ({
          time: p.date as import("lightweight-charts").Time,
          value: p.close,
        }));

        seriesRef.current.setData(seriesData);
        chartRef.current.timeScale().fitContent();
      } catch {
        setHasError(true);
      } finally {
        setLoading(false);
      }
    },
    [ticker]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    let chart: IChartApi;

    (async () => {
      const { createChart, ColorType, LineStyle } = await import(
        "lightweight-charts"
      );

      if (!containerRef.current) return;

      chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#8B95A1",
          fontFamily:
            "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "#F2F4F6", style: LineStyle.Solid },
          horzLines: { color: "#F2F4F6", style: LineStyle.Solid },
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
          vertLine: { color: "#3182F6", width: 1, style: LineStyle.Dashed },
          horzLine: { color: "#3182F6", width: 1, style: LineStyle.Dashed },
        },
        handleScroll: false,
        handleScale: false,
        width: containerRef.current.clientWidth,
        height: 256,
      });

      const areaOptions: AreaSeriesPartialOptions = {
        lineColor: "#3182F6",
        topColor: "rgba(49, 130, 246, 0.12)",
        bottomColor: "rgba(49, 130, 246, 0)",
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: "#3182F6",
        crosshairMarkerBackgroundColor: "#ffffff",
        priceLineVisible: false,
        lastValueVisible: true,
      };

      const series = chart.addAreaSeries(areaOptions);
      chartRef.current = chart;
      seriesRef.current = series;

      const ro = new ResizeObserver((entries) => {
        if (!chart || !containerRef.current) return;
        const { width } = entries[0].contentRect;
        chart.applyOptions({ width });
      });
      ro.observe(containerRef.current);

      await fetchAndRender(activePeriod);

      return () => {
        ro.disconnect();
      };
    })();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const handlePeriodChange = async (period: Period) => {
    setActivePeriod(period);
    await fetchAndRender(period);
  };

  if (hasError) return null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-toss-gray-900">주가 차트</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activePeriod === p
                  ? "bg-toss-blue text-white"
                  : "text-toss-gray-500 hover:bg-toss-gray-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden" style={{ height: 256 }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 rounded-xl">
            <Skeleton className="h-full w-full absolute inset-0" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </Card>
  );
}
