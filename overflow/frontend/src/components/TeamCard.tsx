"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { PSLTeam } from "@/types";
import { cn, formatPrice, formatPercent, formatCurrency, hexToRgba } from "@/lib/utils";
import { useRef } from "react";

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
  const width = 120;
  const height = 48;
  const padX = 2;
  const padY = 4;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (width - padX * 2);
    const y = padY + (height - padY * 2) - ((v - min) / range) * (height - padY * 2);
    return { x, y };
  });

  const lineColor = isPositive ? "#3FB950" : "#F85149";

  // Build SVG path string for the line (M then L segments)
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Area fill: close the polygon at the bottom
  const areaPoints = [
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${height}`,
    `${points[0].x},${height}`,
  ].join(" ");

  const gradId = `sparkGrad-${color.replace("#", "")}-${isPositive ? "up" : "dn"}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-28 h-12" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill under the line — fades in after path draws */}
      <motion.polygon
        points={areaPoints}
        fill={`url(#${gradId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.5 }}
      />
      {/* Main line — draws on from left to right */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.0, ease: "easeOut" }}
      />
      {/* Dot on last data point — appears after path finishes drawing */}
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2.5"
        fill={lineColor}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, duration: 0.3, ease: "easeOut" }}
      >
        <animate
          attributeName="r"
          values="2.5;3.5;2.5"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0.6;1"
          dur="2s"
          repeatCount="indefinite"
        />
      </motion.circle>
    </svg>
  );
}

export function TeamCard({ team, index = 0 }: TeamCardProps) {
  const isPositive = team.change24h >= 0;
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div>
      <Link href={`/trade/${team.id.toLowerCase()}`} className="block group">
        <div
          ref={cardRef}
          className="card-border-glow relative overflow-hidden rounded-xl bg-[#161B22] p-4 transition-all duration-200 ease-out hover:translate-y-[-2px]"
          style={{
            border: "1px solid #21262D",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#58A6FF40";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#21262D";
          }}
        >
          {/* Subtle accent */}
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.03] transition-opacity duration-200 group-hover:opacity-[0.06]"
            style={{ background: `radial-gradient(circle at top left, ${team.color}, transparent 70%)` }}
          />

          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Team logo placeholder */}
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white shadow-lg transition-transform duration-200 group-hover:scale-[1.01]"
                style={{
                  backgroundColor: team.color,
                  boxShadow: `0 4px 16px ${hexToRgba(team.color, 0.4)}`,
                }}
              >
                {team.id}
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#8B949E]">{team.symbol}</p>
                <h3 className="text-sm font-bold text-[#E6EDF3] leading-tight truncate max-w-[140px]">
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
              <p
                className="text-2xl font-black tabular-nums tracking-tight text-[#E6EDF3]"
              >
                ${formatPrice(team.price)}
              </p>
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 1 }}
                animate={{ opacity: 1, x: 0, scale: [1, 1.1, 1] }}
                transition={{
                  opacity: { delay: index * 0.07 + 0.3, duration: 0.3 },
                  x: { delay: index * 0.07 + 0.3, duration: 0.3 },
                  scale: { delay: index * 0.07 + 0.5, duration: 0.3, ease: "easeInOut" },
                }}
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
              </motion.div>
            </div>
            <Sparkline
              data={team.sparklineData}
              color={team.color}
              isPositive={isPositive}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 border-t border-[#21262D]/60 pt-3">
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

          {/* Bottom accent line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[1px] transition-opacity duration-200 opacity-30 group-hover:opacity-60"
            style={{
              background: `linear-gradient(90deg, transparent, ${team.color}, transparent)`,
            }}
          />
        </div>
      </Link>
    </div>
  );
}
