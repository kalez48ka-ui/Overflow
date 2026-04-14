"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { SafeConnectButton } from "@/components/WalletProvider";
import {
  ArrowRight,
  Zap,
  Activity,
  Trophy,
  Flame,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
// Note: Footer is rendered by the layout — no per-page footer needed.
import { TeamCard } from "@/components/TeamCard";
import { StatsBar } from "@/components/StatsBar";
import {
  MouseTrackCard,
  CountUp,
  StaggerReveal,
  LayoutGrid,
} from "@/components/motion";
import { PSL_TEAMS, GLOBAL_STATS } from "@/lib/mockData";
import { api } from "@/lib/api";
import type { PSLTeam } from "@/types";
import type { VaultState } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";
import { Spotlight } from "@/components/ui/spotlight";
import { RevealText } from "@/components/effects";

function FeaturePill({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#21262D]/60 bg-[#161B22]/80 px-4 py-1.5 text-xs font-medium text-[#C9D1D9] backdrop-blur-sm transition-all duration-200 ease-out hover:border-[#58A6FF]/40 hover:bg-[#161B22]">
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

  const prefersReduced = useReducedMotion();

  // Hero parallax — headline moves slower than background on scroll
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, -60]);

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
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      // Fetch teams and vault state in parallel; each has an independent fallback
      const [teamsResult, vaultResult] = await Promise.allSettled([
        api.teams.getAll(controller.signal),
        api.vault.getState(controller.signal),
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

    return () => { cancelled = true; controller.abort(); };
  }, []);

  // Vault balance for display
  const vaultBalance = vaultState?.balance ?? GLOBAL_STATS.upsetVaultBalance;

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden">
        {/* Animated cycling gradient background */}
        <div className="pointer-events-none absolute inset-0 hero-gradient-bg" />

        {/* Subtle background */}
        <div className="pointer-events-none absolute inset-0">
          {/* Grid overlay */}
          <div className="absolute inset-0 hero-grid" />

          {/* Bottom fade to base */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,#0D1117)]" />
        </div>

        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <motion.div
          className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24"
          style={prefersReduced ? undefined : { y: heroParallaxY }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex justify-center"
          >
            <div className="flex items-center gap-2 rounded-full border border-[#E4002B]/40 bg-[#E4002B]/10 px-4 py-1.5 text-xs font-medium text-[#E4002B] backdrop-blur-sm">
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
            <RevealText
              lines={["From Betting", "to Building Wealth."]}
              className="mx-auto max-w-4xl text-3xl font-black leading-[1.05] tracking-tight text-[#E6EDF3] sm:text-5xl lg:text-7xl"
            />
            <p className="mx-auto mt-5 max-w-xl text-base text-[#8B949E] sm:text-lg">
              Own PSL team tokens. Prices move with every ball.
              No gambling — real assets, real exits, real rewards.
            </p>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <div className="rounded-xl border border-[#E4002B]/40 bg-[#E4002B]/10 px-5 py-3 text-sm font-bold text-[#E6EDF3] transition-all duration-200 ease-out hover:bg-[#E4002B]/20 hover:border-[#E4002B]/60">
              <SafeConnectButton label="Start Trading" showBalance={false} />
            </div>
            <Link
              href="/match"
              className="hover-lift flex items-center gap-2 rounded-xl border border-[#21262D] px-5 py-3 text-sm font-semibold text-[#E6EDF3] hover:border-[#3FB950]/50 hover:bg-[#3FB950]/5 transition-all duration-200 ease-out"
            >
              <Activity className="h-4 w-4 text-[#3FB950]" />
              Watch Live Match
            </Link>
          </motion.div>

          {/* Live FOMO ticker */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex justify-center"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-[#21262D]/60 bg-[#161B22]/60 px-5 py-2 text-xs backdrop-blur-md">
              <span className="flex items-center gap-1.5 text-[#F85149] font-bold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F85149] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F85149]" />
                </span>
                LIVE
              </span>
              <span className="text-[#8B949E]">PZ vs MS</span>
              <span className="text-[#484F58]">|</span>
              <span className="text-[#E6EDF3] font-semibold">
                <CountUp
                  value={vaultBalance}
                  formatter={(n) => formatCurrency(n)}
                  duration={2}
                />
                {" "}in Upset Vault
              </span>
              <span className="text-[#484F58]">|</span>
              <span className="text-[#8B949E]">
                <span className="text-[#3FB950] font-semibold tabular-nums">
                  <CountUp
                    value={GLOBAL_STATS.activeTraders}
                    formatter={(n) => formatNumber(Math.round(n))}
                    duration={2}
                  />
                </span>{" "}traders active
              </span>
            </div>
          </motion.div>

          {/* Trust signal pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            <FeaturePill icon={Trophy} label="8 Teams" />
            <FeaturePill icon={Activity} label="Live Prices" />
            <FeaturePill icon={Zap} label="AI Signals" />
            <FeaturePill icon={Flame} label="Upset Vault" />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats bar — passes real vault balance when API is available */}
      <StatsBar
        upsetVaultBalance={
          vaultState !== null ? vaultState.balance : GLOBAL_STATS.upsetVaultBalance
        }
      />

      {/* Team cards grid */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#E6EDF3]">PSL Team Tokens</h2>
            <p className="text-sm text-[#8B949E]">
              {teams.length} teams, {teams.length} tokens — trade the tournament
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/leaderboard"
              className="flex items-center gap-1.5 text-sm text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            >
              <Trophy className="h-3.5 w-3.5" />
              Leaderboard
            </Link>
          </div>
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
              className="w-full rounded-lg border border-[#21262D] bg-[#0D1117] py-2 pl-9 pr-3 text-sm text-[#E6EDF3] placeholder-[#8B949E] outline-none transition-all duration-200 ease-out focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF]/30 sm:w-56"
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
                  className={`flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition-colors min-h-[44px] sm:min-h-0 sm:py-1.5 ${
                    isActive
                      ? "border-[#58A6FF] bg-[#161B22] text-[#E6EDF3]"
                      : "border-[#21262D] text-[#8B949E] hover:border-[#58A6FF]/50"
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PSL_TEAMS.length }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl border border-[#21262D] bg-[#161B22]"
              />
            ))}
          </div>
        ) : displayTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#21262D] bg-[#161B22] py-16 text-center">
            <p className="text-sm text-[#8B949E]">
              No teams match &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <LayoutGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayTeams.map((team) => (
              <MouseTrackCard key={team.id}>
                <TeamCard team={team} />
              </MouseTrackCard>
            ))}
          </LayoutGrid>
        )}
      </section>

      {/* How it works */}
      <section className="relative bg-[#161B22]/30">
        <div className="border-t border-[#21262D]" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-xl font-bold text-[#E6EDF3]">
              How It Works
            </h2>
            <p className="mt-2 text-sm text-[#8B949E]">
              Wallet to payout in four steps
            </p>
          </div>

          <StaggerReveal
            className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:gap-0"
            staggerDelay={0.1}
            yOffset={24}
          >
            {[
              {
                title: "Connect",
                desc: "Link your Web3 wallet. Takes 10 seconds.",
                icon: Zap,
              },
              {
                title: "Pick a Side",
                desc: "Buy team tokens. Prices track real match outcomes.",
                icon: Trophy,
              },
              {
                title: "Trade Live",
                desc: "React to wickets, sixes, collapses in real time.",
                icon: Activity,
              },
              {
                title: "Collect",
                desc: "Upset Vault pays out when underdogs win.",
                icon: Flame,
              },
            ].map(({ title, desc, icon: StepIcon }, idx) => (
              <div key={title} className="flex flex-1 items-start gap-0 sm:flex-col sm:items-center">
                <div className="flex flex-1 flex-col items-center text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[#21262D] bg-[#161B22]">
                    <StepIcon className="h-4 w-4 text-[#8B949E]" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-[#E6EDF3]">
                    {title}
                  </h3>
                  <p className="max-w-[180px] text-xs leading-relaxed text-[#8B949E]">{desc}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden sm:flex items-center justify-center px-4 pt-4">
                    <ArrowRight className="h-4 w-4 text-[#484F58]" />
                  </div>
                )}
              </div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* Upset Vault explainer */}
      <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-[#21262D] bg-[#161B22]">

          {/* Vault balance — the hero of this section */}
          <div className="px-6 pt-10 pb-6 sm:px-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E4002B]/40 bg-[#E4002B]/10 px-3 py-1 text-xs font-semibold text-[#E4002B]">
              <Flame className="h-3 w-3" />
              Upset Vault
            </div>
            <p className="vault-glow mt-2 text-5xl font-black text-[#E6EDF3] sm:text-6xl md:text-7xl tabular-nums tracking-tight">
              <CountUp
                value={vaultBalance}
                formatter={(n) => formatCurrency(n)}
                duration={2}
              />
            </p>
            <p className="mt-3 text-sm text-[#8B949E]">
              2% of every trade fee. Underdogs win, you split the pot.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-[#21262D]">
            {/* Multiplier tiers */}
            <div className="p-6 sm:p-8">
              <h3 className="mb-4 text-sm font-semibold text-[#E6EDF3]">Payout Multipliers</h3>
              <StaggerReveal
                className="space-y-2.5"
                staggerDelay={0.12}
                yOffset={16}
              >
                {[
                  { label: "Minor upset (40% win prob)", multiplier: "1.5x", width: "40%" },
                  { label: "Major upset (25% win prob)", multiplier: "2.8x", width: "65%" },
                  { label: "Extreme upset (<15% prob)", multiplier: "4.2x+", width: "90%" },
                ].map(({ label, multiplier, width }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#8B949E]">{label}</span>
                      <span className="text-xs font-black text-[#E4002B]">
                        {multiplier}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-[#21262D] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#E4002B]"
                        initial={{ width: 0 }}
                        whileInView={{ width }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </StaggerReveal>
              <Link
                href="/vault"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#21262D] bg-[#21262D] px-5 py-2.5 text-sm font-bold text-[#E6EDF3] hover:border-[#E4002B]/40 hover:bg-[#E4002B]/10 transition-all duration-200 ease-out hover-lift"
              >
                View Upset Vault
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center border-t border-[#21262D] p-6 sm:p-8 md:border-l md:border-t-0">
              <StaggerReveal
                className="grid grid-cols-3 gap-5 text-center w-full"
                staggerDelay={0.1}
                yOffset={20}
              >
                {[
                  { label: "Paid Out", raw: 249, prefix: "$", suffix: "K" },
                  { label: "Upsets", raw: 18, prefix: "", suffix: "" },
                  { label: "Avg Mult.", raw: 2.7, prefix: "", suffix: "x" },
                ].map(({ label, raw, prefix, suffix }) => (
                  <div key={label} className="rounded-lg bg-[#0D1117]/60 px-3 py-3 border border-[#21262D]">
                    <p className="text-lg font-black tabular-nums text-[#E6EDF3]">
                      <CountUp
                        value={raw}
                        prefix={prefix}
                        suffix={suffix}
                        decimals={raw % 1 !== 0 ? 1 : 0}
                        duration={1.8}
                      />
                    </p>
                    <p className="text-[10px] text-[#8B949E] mt-0.5">{label}</p>
                  </div>
                ))}
              </StaggerReveal>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
