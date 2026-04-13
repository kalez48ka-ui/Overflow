"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Trophy,
  TrendingUp,
  Zap,
  ArrowRight,
  ChevronRight,
  Info,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { UpsetVaultDisplay } from "@/components/UpsetVaultDisplay";
import { CountUp, StaggerReveal, MouseTrackCard } from "@/components/motion";
import { VAULT_DATA } from "@/lib/mockData";
import { api } from "@/lib/api";
import type { VaultData, UpsetEvent } from "@/types";
import { formatCurrency, formatTimestamp } from "@/lib/utils";
import Link from "next/link";

function HowItWorksStep({
  number,
  title,
  description,
  color,
}: {
  number: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="relative flex gap-4">
      {/* Step number */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
        style={{ backgroundColor: color }}
      >
        {number}
      </div>
      <div className="pb-6">
        <h4 className="text-sm font-bold text-[#E6EDF3]">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-[#8B949E]">{description}</p>
      </div>
    </div>
  );
}

function UpsetHistoryCard({
  event,
  index,
}: {
  event: UpsetEvent;
  index: number;
}) {
  const handleShareUpset = () => {
    const text = [
      `Upset Alert on Overflow!`,
      `${event.upsetTeam} beat ${event.favoriteTeam} with a ${event.upsetScore}/100 upset score!`,
      `${event.multiplier}x multiplier - ${formatCurrency(event.totalPayout)} paid out from the vault.`,
      `Trade PSL team tokens: overflow.app`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy");
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative rounded-xl border border-[#30363D] bg-[#161B22] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#FDB913]" />
          <span className="text-sm font-bold text-[#E6EDF3]">{event.match}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareUpset}
            title="Share upset event"
            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#30363D] text-[#8B949E] hover:border-[#6A0DAD] hover:text-[#6A0DAD] transition-colors"
          >
            <Share2 className="h-3 w-3" />
          </button>
          <span
            className="rounded-full bg-[#6A0DAD]/20 px-2 py-0.5 text-xs font-black text-[#6A0DAD]"
          >
            {event.multiplier}x
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <div className="rounded-lg bg-[#0D1117] py-2 px-1">
          <p className="text-[10px] text-[#8B949E]">Vault Snap.</p>
          <p className="text-xs font-bold text-[#E6EDF3]">
            {formatCurrency(event.vaultSnapshot)}
          </p>
        </div>
        <div className="rounded-lg bg-[#0D1117] py-2 px-1">
          <p className="text-[10px] text-[#8B949E]">Total Payout</p>
          <p className="text-xs font-bold text-[#3FB950]">
            {formatCurrency(event.totalPayout)}
          </p>
        </div>
        <div className="rounded-lg bg-[#0D1117] py-2 px-1">
          <p className="text-[10px] text-[#8B949E]">Upset Score</p>
          <p className="text-xs font-bold text-[#FDB913]">{event.upsetScore}/100</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#8B949E] min-w-0">
          <span className="shrink-0">Fav:</span>
          <span className="font-semibold text-[#F85149] truncate">{event.favoriteTeam}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="shrink-0">Win:</span>
          <span className="font-semibold text-[#3FB950] truncate">{event.upsetTeam}</span>
        </div>
        <span className="text-[10px] text-[#8B949E] shrink-0">
          {formatTimestamp(event.date)}
        </span>
      </div>
    </motion.div>
  );
}

function MultiplierTable() {
  const rows = [
    {
      upsetScore: "0-25",
      description: "Minor upset",
      multiplier: "1.2x – 1.5x",
      example: "60% favorite loses",
    },
    {
      upsetScore: "25-50",
      description: "Moderate upset",
      multiplier: "1.5x – 2.0x",
      example: "70% favorite loses",
    },
    {
      upsetScore: "50-75",
      description: "Major upset",
      multiplier: "2.0x – 3.0x",
      example: "80% favorite loses",
    },
    {
      upsetScore: "75-100",
      description: "Extreme upset",
      multiplier: "3.0x – 5.0x+",
      example: "90%+ favorite loses",
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-[#30363D]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#30363D] bg-[#21262D]">
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">
              Upset Score
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">
              Multiplier
            </th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold text-[#8B949E] sm:table-cell">
              Example
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#30363D] bg-[#161B22]">
          {rows.map((row, rowIdx) => (
            <motion.tr
              key={row.upsetScore}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: rowIdx * 0.08, duration: 0.3 }}
              className="hover:bg-[#21262D] transition-colors"
            >
              <td className="px-4 py-3 text-xs font-mono text-[#58A6FF]">
                {row.upsetScore}
              </td>
              <td className="px-4 py-3 text-xs text-[#8B949E]">
                {row.description}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-[#21262D] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[#6A0DAD]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(rowIdx + 1) * 25}%` }}
                      transition={{ duration: 0.6, delay: rowIdx * 0.1, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#6A0DAD]">{row.multiplier}</span>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-xs text-[#8B949E] sm:table-cell">
                {row.example}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VaultPage() {
  const [vaultData, setVaultData] = useState<VaultData>(VAULT_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Fetch vault state and upsets in parallel
      const [stateResult, upsetsResult] = await Promise.allSettled([
        api.vault.getState(),
        api.vault.getUpsets(),
      ]);

      if (cancelled) return;

      let newData = { ...VAULT_DATA };
      let updated = false;

      // Update vault state if API succeeded
      if (stateResult.status === "fulfilled" && stateResult.value) {
        const s = stateResult.value;
        newData = {
          ...newData,
          currentBalance: s.balance,
          totalPayouts: s.totalReleased,
        };
        updated = true;
      }

      // Update upsets if API succeeded
      if (upsetsResult.status === "fulfilled" && upsetsResult.value && upsetsResult.value.length > 0) {
        const mapped: UpsetEvent[] = upsetsResult.value.map((u, i) => {
          // Derive multiplier from upset score tier:
          // 0-3 = 1x, 4-6 = 3x, 7-9 = 5x, 10+ = 10x
          let tierMultiplier = 1;
          if (u.upsetScore >= 10) tierMultiplier = 10;
          else if (u.upsetScore >= 7) tierMultiplier = 5;
          else if (u.upsetScore >= 4) tierMultiplier = 3;

          return {
            id: `u-api-${i}`,
            match: `${u.winnerTeam} vs ${u.loserTeam}`,
            date: new Date(u.timestamp).getTime(),
            favoriteTeam: u.loserTeam,
            upsetTeam: u.winnerTeam,
            multiplier: tierMultiplier,
            vaultSnapshot: u.releasedAmount,
            totalPayout: u.releasedAmount,
            upsetScore: u.upsetScore,
          };
        });
        newData = { ...newData, upsetEvents: mapped };
        updated = true;
      }

      if (updated) {
        setVaultData(newData);
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  const { currentBalance, totalPayouts, upsetEvents, nextMatchCountdown, currentMultiplier } =
    vaultData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="min-h-screen bg-[#0D1117]"
    >
      {/* Header */}
      <div className="border-b border-[#6A0DAD]/30 bg-gradient-to-r from-[#2A0050]/50 to-[#161B22]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6A0DAD]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#E6EDF3]">Upset Vault</h1>
              <p className="text-sm text-[#8B949E]">
                Community funds distributed when underdogs win
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#30363D] border-t-[#6A0DAD]" />
            <span className="ml-3 text-sm text-[#8B949E]">Loading vault data...</span>
          </div>
        ) : (
          <>
            {/* Top stats */}
            <StaggerReveal className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" staggerDelay={0.1} yOffset={20}>
              {/* Balance card */}
              <div
                className="rounded-xl border border-[#30363D] bg-[#161B22] p-4"
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-[#E4002B]" />
                  <span className="text-xs text-[#8B949E]">Current Balance</span>
                </div>
                <p className="text-2xl font-black tabular-nums text-[#E6EDF3]">
                  <CountUp value={currentBalance} prefix="$" decimals={2} duration={1.5} />
                </p>
              </div>

              <div
                className="rounded-xl border bg-[#161B22] p-4"
                style={{ borderColor: "#3FB95030" }}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: "#3FB950" }} />
                  <span className="text-xs text-[#8B949E]">All-Time Payouts</span>
                </div>
                <p className="text-xl font-black tabular-nums" style={{ color: "#3FB950" }}>
                  <CountUp value={totalPayouts} prefix="$" decimals={2} duration={1.5} />
                </p>
              </div>

              <div
                className="rounded-xl border bg-[#161B22] p-4"
                style={{ borderColor: "#FDB91330" }}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" style={{ color: "#FDB913" }} />
                  <span className="text-xs text-[#8B949E]">Total Upsets</span>
                </div>
                <p className="text-xl font-black tabular-nums" style={{ color: "#FDB913" }}>
                  <CountUp value={upsetEvents.length} duration={1} />
                </p>
              </div>

              <div
                className="rounded-xl border bg-[#161B22] p-4"
                style={{ borderColor: "#F8514930" }}
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" style={{ color: "#F85149" }} />
                  <span className="text-xs text-[#8B949E]">Current Multiplier</span>
                </div>
                <p className="text-xl font-black tabular-nums" style={{ color: "#F85149" }}>
                  <CountUp value={currentMultiplier} suffix="x" decimals={1} duration={1} />
                </p>
              </div>
            </StaggerReveal>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
              {/* Left: history + table */}
              <div className="space-y-6">
                {/* Past upsets */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#E6EDF3]">
                      Upset History
                    </h2>
                    <span className="text-xs text-[#8B949E]">
                      {upsetEvents.length} events this season
                    </span>
                  </div>
                  <StaggerReveal className="space-y-3" staggerDelay={0.1} yOffset={24}>
                    {upsetEvents.map((event, i) => (
                      <UpsetHistoryCard key={event.id} event={event} index={i} />
                    ))}
                  </StaggerReveal>
                </div>

                {/* Multiplier table */}
                <div>
                  <h2 className="mb-4 text-lg font-bold text-[#E6EDF3]">
                    Multiplier Scale
                  </h2>
                  <MultiplierTable />
                </div>
              </div>

              {/* Right: vault display + how it works */}
              <div className="space-y-5">
                <UpsetVaultDisplay
                  balance={currentBalance}
                  multiplier={currentMultiplier}
                  nextMatchTime={nextMatchCountdown}
                />

                {/* How it works */}
                <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4 text-[#58A6FF]" />
                    <h3 className="text-sm font-bold text-[#E6EDF3]">How It Works</h3>
                  </div>
                  <StaggerReveal className="space-y-0" staggerDelay={0.12} yOffset={20}>
                    <HowItWorksStep
                      number="1"
                      title="Trading fees fund the vault"
                      description="Every token trade contributes 2% of the fee to the Upset Vault. The vault grows continuously throughout the season."
                      color="#58A6FF"
                    />
                    <HowItWorksStep
                      number="2"
                      title="AI calculates upset probability"
                      description="Before each match, the AI engine analyzes team form, head-to-head records, venue conditions, and market sentiment to set odds."
                      color="#6A0DAD"
                    />
                    <HowItWorksStep
                      number="3"
                      title="Upset Score determined live"
                      description="During the match, the Upset Score rises or falls in real-time based on ball-by-ball outcomes versus pre-match probabilities."
                      color="#FDB913"
                    />
                    <HowItWorksStep
                      number="4"
                      title="Vault distributes on upset win"
                      description="When the underdog wins, the vault pays out to all holders of the winning team's token. Payout = vault balance × upset multiplier × your share."
                      color="#3FB950"
                    />
                  </StaggerReveal>
                </div>

                {/* CTA */}
                <div className="rounded-xl border border-[#6A0DAD]/30 bg-[#6A0DAD]/10 p-4">
                  <p className="mb-2 text-sm font-semibold text-[#E6EDF3]">
                    Position yourself before the next match
                  </p>
                  <p className="mb-3 text-xs text-[#8B949E]">
                    The current favorite is Islamabad United. Buy $LQ tokens now to
                    benefit from an upset payout if Lahore Qalandars win tonight.
                  </p>
                  <Link
                    href="/trade/lq"
                    className="flex items-center gap-2 rounded-lg bg-[#6A0DAD] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#7B1FA2] transition-colors"
                  >
                    Trade $LQ
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
