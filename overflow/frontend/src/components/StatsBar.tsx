"use client";

/**
 * StatsBar — Global platform stats strip.
 *
 * Usage:
 *   // On landing page (already rendered inline; import this for match page, etc.)
 *   <StatsBar />
 *
 *   // With custom stats override:
 *   <StatsBar totalVolume={3200000} activeTraders={4100} upsetVaultBalance={52000} nextMatchTime={Date.now() + 7200000} />
 */

import { useEffect, useState } from "react";
import { Activity, BarChart2, Shield, Users } from "lucide-react";
import { GLOBAL_STATS } from "@/lib/mockData";
import { formatCurrency, formatNumber, formatCountdown } from "@/lib/utils";

interface StatsBarProps {
  totalVolume?: number;
  activeTraders?: number;
  upsetVaultBalance?: number;
  nextMatchTime?: number;
}

interface StatItemProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  mono?: boolean;
}

function StatItem({ label, value, icon: Icon, color, mono }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `${color}15` }}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-medium text-[#6E7681]">{label}</p>
        <p
          className={`truncate text-sm font-black tracking-tight text-[#E6EDF3] ${mono ? "font-mono" : ""} tabular-nums`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function StatsBar({
  totalVolume = GLOBAL_STATS.totalVolume,
  activeTraders = GLOBAL_STATS.activeTraders,
  upsetVaultBalance = GLOBAL_STATS.upsetVaultBalance,
  nextMatchTime = GLOBAL_STATS.nextMatchTime,
}: StatsBarProps) {
  const [countdown, setCountdown] = useState(nextMatchTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(nextMatchTime - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [nextMatchTime]);

  const stats: StatItemProps[] = [
    {
      label: "Total Volume",
      value: formatCurrency(totalVolume),
      icon: BarChart2,
      color: "#3FB950",
    },
    {
      label: "Active Traders",
      value: formatNumber(activeTraders),
      icon: Users,
      color: "#58A6FF",
    },
    {
      label: "Upset Vault",
      value: formatCurrency(upsetVaultBalance),
      icon: Shield,
      color: "#6A0DAD",
    },
    {
      label: "Next Match",
      value: countdown > 0 ? formatCountdown(countdown) : "LIVE",
      icon: Activity,
      color: "#F85149",
      mono: true,
    },
  ];

  return (
    <div
      className="border-y border-[#21262D] bg-[#0D1117]/80 backdrop-blur-md"
      role="region"
      aria-label="Platform statistics"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 divide-x divide-[#21262D] md:grid-cols-4">
          {stats.map((stat) => (
            <StatItem key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </div>
  );
}
