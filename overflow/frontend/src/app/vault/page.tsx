"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
} from "lucide-react";
import { VAULT_DATA } from "@/lib/mockData";
import { api } from "@/lib/api";
import type { VaultData, UpsetEvent } from "@/types";
import { formatCurrency, formatTimestamp } from "@/lib/utils";
import Link from "next/link";
import dynamic from "next/dynamic";
import { GlitchPrice } from "@/components/effects/GlitchPrice";

const BackgroundBeams = dynamic(
  () => import("@/components/ui/background-beams").then((m) => ({ default: m.BackgroundBeams })),
  { ssr: false },
);
const Meteors = dynamic(
  () => import("@/components/ui/meteors").then((m) => ({ default: m.Meteors })),
  { ssr: false },
);
import { AnimatedGradientBorder } from "@/components/ui/animated-gradient-border";

function UpsetHistoryRow({
  event,
}: {
  event: UpsetEvent;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-[#21262D] bg-[#161B22] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Main line */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold text-[#E6EDF3] truncate">
          {event.upsetTeam} beat {event.favoriteTeam}
        </span>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs shrink-0">
        <span className="tabular-nums text-[#9CA3AF]">
          Score <span className="font-medium text-[#E6EDF3]">{event.upsetScore}/100</span>
        </span>
        <span className="tabular-nums text-[#9CA3AF]">
          <span className="font-bold text-[#E4002B]">{event.multiplier}x</span>
        </span>
        <span className="tabular-nums font-medium text-[#3FB950]">
          {formatCurrency(event.totalPayout)}
        </span>
        <span className="text-[#768390]">
          {formatTimestamp(event.date)}
        </span>
      </div>
    </div>
  );
}

function MultiplierTable() {
  const rows = [
    { score: "0-25", label: "Minor", multiplier: "1.2x - 1.5x", release: "5%" },
    { score: "25-50", label: "Moderate", multiplier: "1.5x - 2.0x", release: "10%" },
    { score: "50-75", label: "Major", multiplier: "2.0x - 3.0x", release: "20%" },
    { score: "75-100", label: "Extreme", multiplier: "3.0x - 5.0x+", release: "40%" },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-[#21262D]">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#21262D] bg-[#0D1117]/60">
            <th className="px-3 py-2 text-left font-semibold text-[#9CA3AF]">Tier</th>
            <th className="px-3 py-2 text-left font-semibold text-[#9CA3AF]">Score</th>
            <th className="px-3 py-2 text-left font-semibold text-[#9CA3AF]">Multiplier</th>
            <th className="px-3 py-2 text-right font-semibold text-[#9CA3AF]">Release %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#21262D]">
          {rows.map((row) => (
            <tr key={row.score} className="bg-[#161B22] transition-colors hover:bg-white/[0.02]">
              <td className="px-3 py-2 text-[#9CA3AF]">{row.label}</td>
              <td className="px-3 py-2 font-mono tabular-nums text-[#E6EDF3]">{row.score}</td>
              <td className="px-3 py-2 font-bold font-mono tabular-nums text-[#E4002B]">{row.multiplier}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-[#E6EDF3]">{row.release}</td>
            </tr>
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
      const [stateResult, upsetsResult] = await Promise.allSettled([
        api.vault.getState(),
        api.vault.getUpsets(),
      ]);

      if (cancelled) return;

      let newData = { ...VAULT_DATA };
      let updated = false;

      if (stateResult.status === "fulfilled" && stateResult.value) {
        const s = stateResult.value;
        newData = {
          ...newData,
          currentBalance: s.balance,
          totalPayouts: s.totalReleased,
        };
        updated = true;
      }

      if (upsetsResult.status === "fulfilled" && upsetsResult.value && upsetsResult.value.length > 0) {
        const mapped: UpsetEvent[] = upsetsResult.value.map((u, i) => {
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

  const { currentBalance, totalPayouts, upsetEvents, currentMultiplier } =
    vaultData;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0D1117]"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20" role="status">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#21262D] border-t-[#E4002B]" />
            <span className="ml-3 text-sm text-[#9CA3AF]">Loading vault data...</span>
            <span className="sr-only">Loading...</span>
          </div>
        ) : (
          <>
            {/* Hero balance */}
            <div className="relative mb-8 overflow-hidden text-center">
              <BackgroundBeams className="z-0" beamCount={6} color="#E4002B" />
              <Meteors number={10} className="opacity-30" />
              <h1 className="sr-only">Upset Vault</h1>
              <p className="relative z-10 mb-2 text-sm font-medium text-[#9CA3AF]">Upset Vault Balance</p>
              <GlitchPrice value={formatCurrency(currentBalance)} className="relative z-10 text-4xl sm:text-5xl md:text-6xl font-black font-mono tabular-nums text-[#E6EDF3]" autoScrambleInterval={8000} />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#9CA3AF]">
                <span>
                  All-time payouts{" "}
                  <span className="tabular-nums font-semibold text-[#3FB950]">{formatCurrency(totalPayouts)}</span>
                </span>
                <span className="hidden sm:inline text-[#21262D]">|</span>
                <span>
                  {upsetEvents.length} upsets this season
                </span>
                <span className="hidden sm:inline text-[#21262D]">|</span>
                <span>
                  Multiplier{" "}
                  <span className="tabular-nums font-bold text-[#E4002B]">{currentMultiplier.toFixed(1)}x</span>
                </span>
              </div>
            </div>

            {/* How it works — inline compact */}
            <AnimatedGradientBorder
              active={true}
              gradientColors={["#21262D", "#E4002B", "#21262D", "#768390", "#21262D"]}
              duration={6}
              borderWidth={1}
              containerClassName="mb-8 rounded-lg"
            >
              <div className="px-4 py-3 text-xs text-[#9CA3AF] leading-relaxed">
                <span className="font-medium text-[#E6EDF3]">How it works:</span>{" "}
                Every trade contributes 2% of fees to the vault. When an underdog wins, the vault distributes funds to holders of the winning team token. Higher upset scores unlock bigger multipliers.
              </div>
            </AnimatedGradientBorder>

            {/* Two column layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              {/* Left: upset history */}
              <div>
                <h2 className="mb-3 text-sm font-medium text-[#9CA3AF]">
                  Upset History
                </h2>
                <div className="space-y-2">
                  {upsetEvents.length === 0 ? (
                    <div className="rounded-lg border border-[#21262D] bg-[#161B22] py-10 text-center">
                      <p className="text-sm text-[#9CA3AF]">No upsets recorded yet this season.</p>
                      <p className="mt-1 text-xs text-[#768390]">When an underdog wins, payouts will appear here.</p>
                    </div>
                  ) : (
                    upsetEvents.map((event) => (
                      <UpsetHistoryRow key={event.id} event={event} />
                    ))
                  )}
                </div>
              </div>

              {/* Right: multiplier table + CTA */}
              <div className="space-y-5">
                <div>
                  <h2 className="mb-3 text-sm font-medium text-[#9CA3AF]">
                    Multiplier Scale
                  </h2>
                  <MultiplierTable />
                </div>

                {/* CTA */}
                <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
                  <p className="mb-1 text-sm font-semibold text-[#E6EDF3]">
                    Position before the next match
                  </p>
                  <p className="mb-3 text-xs text-[#9CA3AF]">
                    Buy underdog tokens to benefit from upset payouts.
                  </p>
                  <Link
                    href="/trade/lq"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#E4002B] px-4 py-2 text-sm font-bold text-white hover:bg-[#C00025] transition-colors"
                  >
                    Trade $LQ
                    <ArrowRight className="h-3.5 w-3.5" />
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
