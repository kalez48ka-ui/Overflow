"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { PSLTeam } from "@/types";
import { cn, formatPrice, formatPercent, formatCurrency, hexToRgba } from "@/lib/utils";

interface TeamCardProps {
  team: PSLTeam;
  index?: number;
}

function Sparkline({
  data,
  color,
  isPositive,
}: {
  data: number[];
  color: string;
  isPositive: boolean;
}) {
  if (!data.length) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 32;
  const padX = 2;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (width - padX * 2);
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const lineColor = isPositive ? "#3FB950" : "#F85149";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-20 h-8">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TeamCard({ team, index = 0 }: TeamCardProps) {
  const isPositive = team.change24h >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <Link href={`/trade/${team.id.toLowerCase()}`} className="block">
        <div
          className="relative overflow-hidden rounded-xl border border-[#30363D] bg-[#161B22] p-5 transition-all hover:border-opacity-60"
          style={{ borderColor: hexToRgba(team.color, 0.35) }}
        >
          {/* Accent glow */}
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-5"
            style={{ background: `radial-gradient(circle at top left, ${team.color}, transparent 70%)` }}
          />

          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Team logo placeholder */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: team.color }}
              >
                {team.id}
              </div>
              <div>
                <p className="text-xs text-[#8B949E]">{team.symbol}</p>
                <h3 className="text-sm font-semibold text-[#E6EDF3] leading-tight">
                  {team.name}
                </h3>
              </div>
            </div>

            {/* Sell tax badge */}
            <span className="rounded-full bg-[#0D1117] px-2 py-0.5 text-[10px] font-medium text-[#8B949E] border border-[#30363D]">
              {team.sellTax}% tax
            </span>
          </div>

          {/* Price & Chart */}
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xl font-bold tabular-nums text-[#E6EDF3]">
                ${formatPrice(team.price)}
              </p>
              <div
                className={cn(
                  "mt-0.5 flex items-center gap-1 text-sm font-medium",
                  isPositive ? "text-[#3FB950]" : "text-[#F85149]"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {formatPercent(team.change24h)}
              </div>
            </div>
            <Sparkline
              data={team.sparklineData}
              color={team.color}
              isPositive={isPositive}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2 border-t border-[#30363D] pt-3">
            <div>
              <p className="text-[10px] text-[#8B949E]">24h Volume</p>
              <p className="text-xs font-semibold text-[#E6EDF3]">
                {formatCurrency(team.volume24h)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#8B949E]">Market Cap</p>
              <p className="text-xs font-semibold text-[#E6EDF3]">
                {formatCurrency(team.marketCap)}
              </p>
            </div>
          </div>

          {/* Bottom color bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: team.color }}
          />
        </div>
      </Link>
    </motion.div>
  );
}
