"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SafeConnectButton } from "@/components/WalletProvider";
import {
  ArrowRight,
  BarChart2,
  Shield,
  TrendingUp,
  Zap,
  Activity,
} from "lucide-react";
// Note: Footer is rendered by the root layout — no per-page footer needed.
import { TeamCard } from "@/components/TeamCard";
import { StatsBar } from "@/components/StatsBar";
import { PSL_TEAMS, GLOBAL_STATS } from "@/lib/mockData";
import { api } from "@/lib/api";
import type { PSLTeam } from "@/types";
import type { VaultState } from "@/lib/api";
import Link from "next/link";

function FeaturePill({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#30363D] bg-[#161B22] px-3 py-1.5 text-xs text-[#8B949E]">
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

export default function LandingPage() {
  const [teams, setTeams] = useState<PSLTeam[]>(PSL_TEAMS);
  const [loading, setLoading] = useState(true);
  const [vaultState, setVaultState] = useState<VaultState | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Fetch teams and vault state in parallel; each has an independent fallback
      const [teamsResult, vaultResult] = await Promise.allSettled([
        api.teams.getAll(),
        api.vault.getState(),
      ]);

      if (cancelled) return;

      if (teamsResult.status === "fulfilled" && teamsResult.value && teamsResult.value.length > 0) {
        const mapped: PSLTeam[] = teamsResult.value.map((t) => {
          const mock = PSL_TEAMS.find(
            (m) => m.id === t.symbol?.replace("$", "") || m.symbol === t.symbol
          );
          return {
            id: t.symbol?.replace("$", "") || t.id,
            name: t.name,
            symbol: t.symbol.startsWith("$") ? t.symbol : `$${t.symbol}`,
            color: mock?.color || "#58A6FF",
            secondaryColor: mock?.secondaryColor || "#1C1C1C",
            // Backend may return currentPrice or price — handle both
            price: (t as typeof t & { currentPrice?: number }).currentPrice ?? t.price,
            change24h: (t as typeof t & { priceChange24h?: number }).priceChange24h ?? t.change24h,
            volume24h: t.volume24h,
            marketCap: t.marketCap,
            sellTax: t.sellTax,
            buyTax: t.buyTax,
            contractAddress: t.contractAddress,
            wins: t.wins,
            losses: t.losses,
            nrr: t.nrr,
            performanceScore: t.performanceScore,
            ranking: t.ranking,
            sparklineData: mock?.sparklineData || [],
          };
        });
        setTeams(mapped);
      }
      // API failed for teams — PSL_TEAMS default already set in useState

      if (vaultResult.status === "fulfilled" && vaultResult.value) {
        setVaultState(vaultResult.value);
      }
      // API failed for vault — StatsBar will use GLOBAL_STATS defaults

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#E4002B]/5 blur-3xl" />
          <div className="absolute right-1/4 top-20 h-96 w-96 translate-x-1/2 rounded-full bg-[#00529B]/5 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,#0D1117)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 sm:pt-20">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex justify-center"
          >
            <div className="flex items-center gap-2 rounded-full border border-[#E4002B]/40 bg-[#E4002B]/10 px-4 py-1.5 text-xs font-medium text-[#E4002B]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E4002B] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E4002B]" />
              </span>
              PSL 2026 — Season Live
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight tracking-tight text-[#E6EDF3] sm:text-5xl lg:text-6xl">
              Where Cricket Knowledge
              <br />
              <span className="bg-gradient-to-r from-[#E4002B] via-[#FDB913] to-[#00A651] bg-clip-text text-transparent">
                Becomes Financial Power
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#8B949E] sm:text-lg">
              Trade tokenized PSL team stocks on the WireFluid blockchain. Token
              prices move with team performance. Earn from upsets, predict
              outcomes, and profit from your cricket expertise.
            </p>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <SafeConnectButton label="Connect Wallet to Trade" showBalance={false} />
            <Link
              href="/match"
              className="flex items-center gap-2 rounded-xl border border-[#30363D] px-5 py-3 text-sm font-semibold text-[#E6EDF3] hover:border-[#8B949E] transition-colors"
            >
              <Activity className="h-4 w-4 text-[#3FB950]" />
              Watch Live Match
            </Link>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            <FeaturePill icon={TrendingUp} label="Performance-backed prices" />
            <FeaturePill icon={Shield} label="Upset Vault rewards" />
            <FeaturePill icon={Zap} label="Real-time settlement" />
            <FeaturePill icon={BarChart2} label="Dynamic sell tax" />
          </motion.div>
        </div>
      </section>

      {/* Stats bar — passes real vault balance when API is available */}
      <StatsBar
        upsetVaultBalance={
          vaultState !== null ? vaultState.balance : GLOBAL_STATS.upsetVaultBalance
        }
      />

      {/* Team cards grid */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#E6EDF3]">PSL Team Tokens</h2>
            <p className="text-sm text-[#8B949E]">
              {teams.length} teams, {teams.length} tokens — trade the tournament
            </p>
          </div>
          <Link
            href="/match"
            className="hidden sm:flex items-center gap-1.5 text-sm text-[#58A6FF] hover:text-[#79C0FF] transition-colors"
          >
            View live match
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PSL_TEAMS.length }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl border border-[#30363D] bg-[#161B22]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team, i) => (
              <TeamCard key={team.id} team={team} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-[#30363D] bg-[#161B22]/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-[#E6EDF3]">How CricTrade Works</h2>
            <p className="mt-2 text-sm text-[#8B949E]">
              Cricket knowledge translates directly to trading edge
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Connect Wallet",
                desc: "Connect to WireFluid Testnet with your Web3 wallet to access the platform.",
                color: "#58A6FF",
              },
              {
                step: "02",
                title: "Pick Your Team",
                desc: "Buy tokens for the PSL teams you believe will perform. Prices move with match outcomes.",
                color: "#3FB950",
              },
              {
                step: "03",
                title: "Watch & Trade",
                desc: "Monitor live match data. React to wickets, sixes, and run rates before prices adjust.",
                color: "#FDB913",
              },
              {
                step: "04",
                title: "Earn from Upsets",
                desc: "When underdogs win, the Upset Vault distributes rewards to those who called it.",
                color: "#6A0DAD",
              },
            ].map(({ step, title, desc, color }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-xl border border-[#30363D] bg-[#161B22] p-5"
              >
                <div
                  className="mb-3 text-3xl font-black"
                  style={{ color: `${color}60` }}
                >
                  {step}
                </div>
                <h3
                  className="mb-2 text-sm font-bold"
                  style={{ color }}
                >
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-[#8B949E]">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Upset Vault explainer */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-[#6A0DAD]/30 bg-gradient-to-br from-[#2A0050]/40 to-[#161B22]">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#6A0DAD]/50 bg-[#6A0DAD]/20 px-3 py-1 text-xs font-semibold text-[#6A0DAD]">
                <Shield className="h-3 w-3" />
                Upset Vault
              </div>
              <h2 className="text-2xl font-black text-[#E6EDF3]">
                Profit When Favorites Lose
              </h2>
              <p className="mt-3 text-sm text-[#8B949E] leading-relaxed">
                Every trade contributes 2% of fees to the Upset Vault. When an
                underdog team wins a match, the vault distributes funds to
                holders of the winning team&apos;s tokens — scaled by an Upset
                Multiplier that grows with the odds differential.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { label: "Minor upset (40% win prob)", multiplier: "1.5x" },
                  { label: "Major upset (25% win prob)", multiplier: "2.8x" },
                  { label: "Extreme upset (<15% prob)", multiplier: "4.2x+" },
                ].map(({ label, multiplier }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-[#8B949E]">{label}</span>
                    <span className="rounded-full bg-[#6A0DAD]/20 px-2 py-0.5 text-xs font-bold text-[#6A0DAD]">
                      {multiplier}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/vault"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6A0DAD] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#7B1FA2] transition-colors"
              >
                View Upset Vault
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex items-center justify-center border-l border-[#6A0DAD]/20 p-8">
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-[#8B949E]">
                  Current Vault Balance
                </p>
                <p className="mt-2 text-6xl font-black text-[#E6EDF3]">
                  $42.8K
                </p>
                <p className="mt-1 text-sm text-[#6A0DAD]">
                  Next payout: IU vs LQ tonight
                </p>
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: "Total Paid Out", value: "$249K" },
                    { label: "Upset Events", value: "18" },
                    { label: "Avg Multiplier", value: "2.7x" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-lg font-bold text-[#E6EDF3]">{value}</p>
                      <p className="text-[10px] text-[#8B949E]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
