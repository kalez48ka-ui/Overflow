"use client";

/**
 * StatsBar — Global platform stats strip with animated counting and live indicators.
 * Uses the CountUp motion component for smooth viewport-triggered number animations.
 */

import { useEffect, useState } from "react";
import { Activity, BarChart2, Shield, Users } from "lucide-react";
import { GLOBAL_STATS } from "@/lib/mockData";
import { formatCurrency, formatNumber, formatCountdown } from "@/lib/utils";
import { CountUp } from "@/components/motion";
import { TextScramble } from "@/components/effects";

interface StatsBarProps {
  totalVolume?: number;
  activeTraders?: number;
  upsetVaultBalance?: number;
  nextMatchTime?: number;
}

interface StatItemProps {
  label: string;
  icon: React.ElementType;
  color: string;
  mono?: boolean;
  isVault?: boolean;
  isLive?: boolean;
  children: React.ReactNode;
}

function StatItem({ label, icon: Icon, color, mono, isVault, isLive, children }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-6 stat-animate">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-300"
        style={{ backgroundColor: `${color}15` }}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-medium text-[#6E7681]">
          {label}
          {isLive && (
            <span
              className="live-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          )}
        </p>
        <p
          className={`truncate text-sm font-black tracking-tight text-[#E6EDF3] ${mono ? "font-mono" : ""} ${isVault ? "vault-glow" : ""} tabular-nums`}
        >
          {children}
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

  const isLive = countdown <= 0;

  // Custom formatters for CountUp that match the existing formatCurrency/formatNumber output
  const volumeFormatter = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  const tradersFormatter = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return Math.round(n).toLocaleString();
  };

  const vaultFormatter = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(2)}`;
  };

  return (
    <div
      className="relative border-y border-[#21262D] bg-[#0D1117]/80 backdrop-blur-md"
      role="region"
      aria-label="Platform statistics"
    >
      {/* Subtle top gradient accent */}
      <div className="gradient-divider absolute top-0 left-0 right-0" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 divide-x divide-[#21262D] md:grid-cols-4">
          <StatItem label="Total Volume" icon={BarChart2} color="#3FB950">
            <CountUp
              value={totalVolume}
              formatter={volumeFormatter}
              duration={1.5}
            />
          </StatItem>

          <StatItem label="Active Traders" icon={Users} color="#58A6FF">
            <CountUp
              value={activeTraders}
              formatter={tradersFormatter}
              duration={1.5}
            />
          </StatItem>

          <StatItem label="Upset Vault" icon={Shield} color="#6A0DAD" isVault>
            <TextScramble
              text={vaultFormatter(upsetVaultBalance)}
              speed={45}
              scrambleSpeed={25}
              resolvedColor="#A855F7"
              className="vault-glow"
            />
          </StatItem>

          <StatItem
            label="Next Match"
            icon={Activity}
            color="#F85149"
            mono
            isLive={isLive}
          >
            {isLive ? "LIVE" : formatCountdown(countdown)}
          </StatItem>
        </div>
      </div>

      {/* Subtle bottom gradient accent */}
      <div className="gradient-divider absolute bottom-0 left-0 right-0" />
    </div>
  );
}
