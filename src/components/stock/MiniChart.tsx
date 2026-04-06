"use client";

import { useEffect, useRef, useState } from "react";
import type { IChartApi } from "lightweight-charts";

interface MiniChartProps {
  ticker: string;
}

export function MiniChart({ ticker }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let chart: IChartApi | null = null;

    (async () => {
      const { createChart, ColorType } = await import("lightweight-charts");
      if (!containerRef.current) return;

      chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "transparent",
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: false },
        },
        rightPriceScale: { visible: false },
        timeScale: { visible: false },
        crosshair: {
          vertLine: { visible: false },
          horzLine: { visible: false },
        },
        handleScroll: false,
        handleScale: false,
        width: containerRef.current.clientWidth,
        height: 60,
      });

      try {
        const res = await fetch(`/api/stock/${ticker}/chart?period=90`);
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        const points = json.data ?? [];
        if (points.length === 0) throw new Error("no data");

        const first = points[0].close;
        const last = points[points.length - 1].close;
        const isUp = last >= first;

        const series = chart.addAreaSeries({
          lineColor: isUp ? "#F04452" : "#3182F6",
          topColor: isUp ? "rgba(240, 68, 82, 0.12)" : "rgba(49, 130, 246, 0.12)",
          bottomColor: isUp ? "rgba(240, 68, 82, 0)" : "rgba(49, 130, 246, 0)",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });

        series.setData(
          points.map((p: { date: string; close: number }) => ({
            time: p.date as import("lightweight-charts").Time,
            value: p.close,
          }))
        );
        chart.timeScale().fitContent();
      } catch {
        setHasError(true);
      }
    })();

    return () => {
      if (chart) {
        chart.remove();
        chart = null;
      }
    };
  }, [ticker]);

  if (hasError) {
    return <div className="w-full h-[60px] bg-dark-elevated rounded-lg" />;
  }

  return <div ref={containerRef} className="w-full overflow-hidden" style={{ height: 60 }} />;
}
