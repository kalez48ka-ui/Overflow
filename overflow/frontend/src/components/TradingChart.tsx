"use client";

import { useEffect, useRef, useState } from "react";
import type { CandlestickData } from "@/types";

interface TradingChartProps {
  data: CandlestickData[];
  teamColor: string;
  height?: number;
}

export function TradingChart({ data, teamColor, height = 380 }: TradingChartProps) {
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

    const initChart = async () => {
      try {
        const { createChart, ColorType, CandlestickSeries } = await import("lightweight-charts");

        if (!containerRef.current) return;

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
            vertLine: { color: "#30363D" },
            horzLine: { color: "#30363D" },
          },
          rightPriceScale: {
            borderColor: "#30363D",
          },
          timeScale: {
            borderColor: "#30363D",
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
      cleanupRef.current?.();
      cleanupRef.current = undefined;
    };
  }, [mounted, data, height]);

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
