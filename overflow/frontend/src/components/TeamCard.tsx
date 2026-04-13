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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link href={`/trade/${team.id.toLowerCase()}`} className="block group">
        <div
          className="relative overflow-hidden rounded-xl border bg-[#161B22] p-5 transition-all duration-300"
          style={{
            borderColor: hexToRgba(team.color, 0.25),
            boxShadow: "0 0 0 0 transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = hexToRgba(team.color, 0.5);
            e.currentTarget.style.boxShadow = `0 0 24px ${hexToRgba(team.color, 0.12)}, 0 0 0 1px ${hexToRgba(team.color, 0.1)}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = hexToRgba(team.color, 0.25);
            e.currentTarget.style.boxShadow = "0 0 0 0 transparent";
          }}
        >
          {/* Accent glow */}
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08]"
            style={{ background: `radial-gradient(circle at top left, ${team.color}, transparent 70%)` }}
          />

          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Team logo placeholder */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white shadow-lg"
                style={{
                  backgroundColor: team.color,
                  boxShadow: `0 4px 12px ${hexToRgba(team.color, 0.3)}`,
                }}
              >
                {team.id}
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">{team.symbol}</p>
                <h3 className="text-sm font-bold text-[#E6EDF3] leading-tight">
                  {team.name}
                </h3>
              </div>
            </div>

            {/* Ranking badge */}
            {team.ranking && (
              <div
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold"
                style={{
                  backgroundColor: hexToRgba(team.color, 0.15),
                  color: team.color,
                }}
              >
                #{team.ranking}
              </div>
            )}
          </div>

          {/* Price & Chart */}
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-2xl font-black tabular-nums tracking-tight text-[#E6EDF3]">
                ${formatPrice(team.price)}
              </p>
              <div
                className={cn(
                  "mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold",
                  isPositive
                    ? "bg-[#3FB950]/10 text-[#3FB950]"
                    : "bg-[#F85149]/10 text-[#F85149]"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
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
          <div className="grid grid-cols-3 gap-2 border-t border-[#30363D]/60 pt-3">
            <div>
              <p className="text-[10px] text-[#8B949E]">Volume</p>
              <p className="text-xs font-bold tabular-nums text-[#E6EDF3]">
                {formatCurrency(team.volume24h)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#8B949E]">Mkt Cap</p>
              <p className="text-xs font-bold tabular-nums text-[#E6EDF3]">
                {formatCurrency(team.marketCap)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#8B949E]">Tax</p>
              <p className="text-xs font-bold tabular-nums text-[#8B949E]">
                {team.sellTax}%
              </p>
            </div>
          </div>

          {/* Bottom color bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[2px] transition-opacity duration-300 opacity-60 group-hover:opacity-100"
            style={{ backgroundColor: team.color }}
          />
        </div>
      </Link>
    </motion.div>
  );
}
