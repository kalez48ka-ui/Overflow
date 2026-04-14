"use client";

import { useEffect, useRef, useState } from "react";
import type { CandlestickData } from "@/types";

interface TradingChartProps {
  data: CandlestickData[];
  teamColor: string;
  height?: number;
  /** Explicit floor price. If omitted, calculated as 50% of the first candle's open. */
  floorPrice?: number;
}

export function TradingChart({ data, teamColor, height = 380, floorPrice }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const seriesRef = useRef<unknown>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || !data.length) return;

    // Clean up previous chart instance before creating a new one
    cleanupRef.current?.();
    cleanupRef.current = undefined;

    let destroyed = false;

    const initChart = async () => {
      try {
        const { createChart, ColorType, CandlestickSeries } = await import("lightweight-charts");

        if (destroyed || !containerRef.current) return;

        const chart = createChart(containerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: "#161B22" },
            textColor: "#8B949E",
          },
          grid: {
            vertLines: { color: "#21262D" },
            horzLines: { color: "#21262D" },
          },
          crosshair: {
            vertLine: { color: "#21262D" },
            horzLine: { color: "#21262D" },
          },
          rightPriceScale: {
            borderColor: "#21262D",
          },
          timeScale: {
            borderColor: "#21262D",
            timeVisible: true,
            secondsVisible: false,
          },
          width: containerRef.current.clientWidth,
          height,
        });

        chartRef.current = chart;

        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#3FB950",
          downColor: "#F85149",
          borderVisible: false,
          wickUpColor: "#3FB950",
          wickDownColor: "#F85149",
        });

        seriesRef.current = candleSeries;

        const formattedData = data.map((d) => ({
          time: d.time as import("lightweight-charts").Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }));

        candleSeries.setData(formattedData);

        // Floor price indicator — dashed horizontal line
        const computedFloor =
          floorPrice != null && floorPrice > 0
            ? floorPrice
            : data.length > 0
              ? data[0].open * 0.5
              : undefined;

        if (computedFloor != null) {
          candleSeries.createPriceLine({
            price: computedFloor,
            color: "#FDB913",
            lineWidth: 1,
            lineStyle: 1, // Dashed
            axisLabelVisible: true,
            title: "Floor",
          });
        }

        chart.timeScale().fitContent();

        const handleResize = () => {
          if (containerRef.current) {
            chart.applyOptions({ width: containerRef.current.clientWidth });
          }
        };

        window.addEventListener("resize", handleResize);

        cleanupRef.current = () => {
          window.removeEventListener("resize", handleResize);
          chart.remove();
        };
      } catch (err) {
        console.error("Chart init error:", err);
      }
    };

    initChart();

    return () => {
      destroyed = true;
      cleanupRef.current?.();
      cleanupRef.current = undefined;
    };
  }, [mounted, data, height, teamColor, floorPrice]);

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center rounded-lg bg-[#161B22] text-[#8B949E] text-sm"
      >
        Loading chart...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-lg overflow-hidden"
    />
  );
}
