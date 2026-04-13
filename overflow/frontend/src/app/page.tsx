"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { SafeConnectButton } from "@/components/WalletProvider";
import {
  ArrowRight,
  BarChart2,
  Shield,
  TrendingUp,
  Zap,
  Activity,
  Trophy,
  Flame,
  Search,
  ChevronUp,
  ChevronDown,
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
    <div className="flex items-center gap-2 rounded-full border border-[#30363D]/60 bg-[#161B22]/80 px-4 py-1.5 text-xs font-medium text-[#C9D1D9] backdrop-blur-sm">
      <Icon className="h-3.5 w-3.5 text-[#58A6FF]" />
      {label}
    </div>
  );
}

export default function LandingPage() {
  const [teams, setTeams] = useState<PSLTeam[]>(PSL_TEAMS);
  const [loading, setLoading] = useState(true);
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "price" | "change24h" | "volume" | "marketCap">("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const displayTeams = useMemo(() => {
    let filtered = teams;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = teams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortBy) {
        case "rank":
          aVal = a.ranking ?? 999;
          bVal = b.ranking ?? 999;
          break;
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        case "change24h":
          aVal = a.change24h;
          bVal = b.change24h;
          break;
        case "volume":
          aVal = a.volume24h;
          bVal = b.volume24h;
          break;
        case "marketCap":
          aVal = a.marketCap;
          bVal = b.marketCap;
          break;
        default:
          return 0;
      }

      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [teams, searchQuery, sortBy, sortDir]);

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
        {/* Animated gradient background */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% -20%, #E4002B15 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 50%, #6A0DAD10 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 20% 60%, #00529B10 0%, transparent 50%)",
            }}
          />
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(#E6EDF3 1px, transparent 1px), linear-gradient(90deg, #E6EDF3 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,#0D1117)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex justify-center"
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
            <h1 className="mx-auto max-w-3xl text-3xl font-black leading-[1.1] tracking-tight text-[#E6EDF3] sm:text-5xl lg:text-7xl">
              Every Ball Moves{" "}
              <span className="bg-gradient-to-r from-[#E4002B] via-[#FDB913] to-[#00A651] bg-clip-text text-transparent">
                Markets.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base text-[#8B949E] sm:text-lg">
              Trade PSL team tokens. Prices shift with live match performance.
            </p>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <SafeConnectButton label="Start Trading" showBalance={false} />
            <Link
              href="/match"
              className="flex items-center gap-2 rounded-xl border border-[#30363D] px-5 py-3 text-sm font-semibold text-[#E6EDF3] hover:border-[#8B949E] transition-colors"
            >
              <Activity className="h-4 w-4 text-[#3FB950]" />
              Watch Live Match
            </Link>
          </motion.div>

          {/* Trust signal pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            <FeaturePill icon={Trophy} label="6 Teams" />
            <FeaturePill icon={Activity} label="Live Prices" />
            <FeaturePill icon={Zap} label="AI Signals" />
            <FeaturePill icon={Flame} label="Upset Vault" />
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

        {/* Search & sort controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8B949E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams..."
              className="w-full rounded-lg border border-[#30363D] bg-[#0D1117] py-2 pl-9 pr-3 text-sm text-[#E6EDF3] placeholder-[#8B949E] outline-none transition-colors focus:border-[#58A6FF] sm:w-56"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { key: "rank", label: "Rank" },
                { key: "price", label: "Price" },
                { key: "change24h", label: "24h Change" },
                { key: "volume", label: "Volume" },
                { key: "marketCap", label: "Market Cap" },
              ] as const
            ).map(({ key, label }) => {
              const isActive = sortBy === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (isActive) {
                      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                    } else {
                      setSortBy(key);
                      setSortDir("asc");
                    }
                  }}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-[#58A6FF] bg-[#161B22] text-[#E6EDF3]"
                      : "border-[#30363D] text-[#8B949E] hover:border-[#58A6FF]/50"
                  }`}
                >
                  {label}
                  {isActive &&
                    (sortDir === "asc" ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    ))}
                </button>
              );
            })}
          </div>
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
        ) : displayTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#30363D] bg-[#161B22] py-16 text-center">
            <Search className="mb-3 h-8 w-8 text-[#30363D]" />
            <p className="text-sm text-[#8B949E]">
              No teams match &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayTeams.map((team, i) => (
              <TeamCard key={team.id} team={team} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-[#30363D] bg-[#161B22]/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black text-[#E6EDF3]">
              Four Steps. Zero Complexity.
            </h2>
            <p className="mt-2 text-sm text-[#8B949E]">
              From wallet connect to payout in minutes
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Connect",
                desc: "Link your Web3 wallet to WireFluid Testnet. Takes 10 seconds.",
                color: "#58A6FF",
              },
              {
                step: "02",
                title: "Pick a Side",
                desc: "Buy tokens for teams you back. Prices are driven by real match outcomes.",
                color: "#3FB950",
              },
              {
                step: "03",
                title: "Trade Live",
                desc: "React to wickets, sixes, and collapses. The pitch is your trading floor.",
                color: "#FDB913",
              },
              {
                step: "04",
                title: "Collect",
                desc: "Underdogs win? The Upset Vault rewards you for calling it right.",
                color: "#6A0DAD",
              },
            ].map(({ step, title, desc, color }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group relative rounded-xl border border-[#30363D] bg-[#161B22] p-5 transition-colors hover:border-opacity-60"
                style={{ ["--step-color" as string]: color }}
              >
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-4 right-4 h-px opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ backgroundColor: color }}
                />
                <div
                  className="mb-3 text-3xl font-black"
                  style={{ color: `${color}50` }}
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

          <div className="mt-8 text-center">
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#58A6FF] hover:text-[#79C0FF] transition-colors"
            >
              Learn the full mechanics
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Upset Vault explainer */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-[#6A0DAD]/30 bg-gradient-to-br from-[#2A0050]/40 via-[#161B22] to-[#161B22]">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-[#6A0DAD]/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#6A0DAD]/5 blur-3xl" />

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="p-6 sm:p-10">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#6A0DAD]/50 bg-[#6A0DAD]/20 px-3 py-1 text-xs font-semibold text-[#A855F7]">
                <Flame className="h-3 w-3" />
                Upset Vault
              </div>
              <h2 className="text-2xl font-black text-[#E6EDF3] leading-tight sm:text-3xl">
                Favorites Lose.{" "}
                <span className="text-[#A855F7]">You Win.</span>
              </h2>
              <p className="mt-3 text-sm text-[#8B949E] leading-relaxed">
                2% of every trade fee flows into the Vault. When an underdog
                pulls off the upset, holders of the winning team&apos;s tokens
                split the pot — with a multiplier that scales with how unlikely
                the win was.
              </p>
              <div className="mt-6 space-y-2.5">
                {[
                  { label: "Minor upset (40% win prob)", multiplier: "1.5x", width: "40%" },
                  { label: "Major upset (25% win prob)", multiplier: "2.8x", width: "65%" },
                  { label: "Extreme upset (<15% prob)", multiplier: "4.2x+", width: "90%" },
                ].map(({ label, multiplier, width }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#8B949E]">{label}</span>
                      <span className="text-xs font-black text-[#A855F7]">
                        {multiplier}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-[#21262D] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#6A0DAD] to-[#A855F7]"
                        initial={{ width: 0 }}
                        whileInView={{ width }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/vault"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#6A0DAD] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#7B1FA2] transition-colors shadow-lg shadow-[#6A0DAD]/20"
              >
                View Upset Vault
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex items-center justify-center border-t border-[#6A0DAD]/20 p-6 sm:p-10 md:border-l md:border-t-0">
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8B949E]">
                  Current Vault Balance
                </p>
                <p className="mt-3 text-4xl font-black text-[#E6EDF3] sm:text-5xl md:text-6xl tabular-nums tracking-tight">
                  $42.8K
                </p>
                <p className="mt-2 text-sm font-medium text-[#A855F7]">
                  Next payout: IU vs LQ tonight
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: "Paid Out", value: "$249K" },
                    { label: "Upsets", value: "18" },
                    { label: "Avg Mult.", value: "2.7x" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-[#0D1117]/60 px-3 py-3 border border-[#30363D]/50">
                      <p className="text-lg font-black tabular-nums text-[#E6EDF3]">{value}</p>
                      <p className="text-[10px] text-[#8B949E] mt-0.5">{label}</p>
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
