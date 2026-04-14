"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
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
import { MouseTrackCard } from "@/components/motion/MouseTrackCard";
import { CountUp } from "@/components/motion/CountUp";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { LayoutGrid } from "@/components/motion/LayoutGrid";
import { PSL_TEAMS, GLOBAL_STATS } from "@/lib/mockData";
import { api } from "@/lib/api";
import { mapApiTeamToFrontend } from "@/lib/teamMapper";
import type { PSLTeam } from "@/types";
import type { VaultState } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";
import dynamic from "next/dynamic";

const Spotlight = dynamic(
  () => import("@/components/ui/spotlight").then((m) => ({ default: m.Spotlight })),
  { ssr: false },
);
const BackgroundBeams = dynamic(
  () => import("@/components/ui/background-beams").then((m) => ({ default: m.BackgroundBeams })),
  { ssr: false },
);
const TextGenerateEffect = dynamic(
  () => import("@/components/ui/text-generate-effect").then((m) => ({ default: m.TextGenerateEffect })),
  { ssr: false },
);
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { RevealText } from "@/components/effects/RevealText";
import { GlitchPrice } from "@/components/effects/GlitchPrice";

const Meteors = dynamic(
  () => import("@/components/ui/meteors").then((m) => ({ default: m.Meteors })),
  { ssr: false },
);
const FlipWords = dynamic(
  () => import("@/components/ui/flip-words").then((m) => ({ default: m.FlipWords })),
  { ssr: false },
);
const LampContainer = dynamic(
  () => import("@/components/ui/lamp-effect").then((m) => ({ default: m.LampContainer })),
  { ssr: false },
);
const Sparkles = dynamic(
  () => import("@/components/ui/sparkles").then((m) => ({ default: m.Sparkles })),
  { ssr: false },
);

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
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [hasLiveMatch, setHasLiveMatch] = useState(false);
  const [liveMatchLabel, setLiveMatchLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "price" | "change24h" | "volume" | "marketCap">("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // React Query for teams — cached between navigations (staleTime: 60s from provider)
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: ({ signal }) => api.teams.getAll(signal),
    staleTime: 60_000,
  });

  const teams: PSLTeam[] = useMemo(() => {
    if (teamsData && teamsData.length > 0) {
      return teamsData.map((t) => mapApiTeamToFrontend(t));
    }
    return PSL_TEAMS;
  }, [teamsData]);

  const prefersReduced = useReducedMotion();

  // Reduced-motion-safe animation helpers
  const instantTransition = { duration: 0 };
  const noMotionInitial = { opacity: 1, y: 0, x: 0, scale: 1 };

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

  // Fetch vault state and live matches (teams handled by useQuery above)
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const [vaultResult, liveResult] = await Promise.allSettled([
        api.vault.getState(controller.signal),
        api.matches.getLive(controller.signal),
      ]);

      if (cancelled) return;

      if (vaultResult.status === "fulfilled" && vaultResult.value) {
        setVaultState(vaultResult.value);
      }

      if (liveResult.status === "fulfilled" && liveResult.value && liveResult.value.length > 0) {
        setHasLiveMatch(true);
        const m = liveResult.value[0];
        setLiveMatchLabel(`${m.team1Name} vs ${m.team2Name}`);
      }
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

        <BackgroundBeams className="z-0" beamCount={8} />
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <motion.div
          className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pt-24"
          style={prefersReduced ? undefined : { y: heroParallaxY }}
        >
          {/* Badge */}
          <motion.div
            initial={prefersReduced ? noMotionInitial : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? instantTransition : undefined}
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
            initial={prefersReduced ? noMotionInitial : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? instantTransition : { delay: 0.1 }}
            className="text-center"
          >
            <h1 className="mx-auto max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-[#E6EDF3] sm:text-5xl lg:text-7xl text-center min-h-[5.5rem] sm:min-h-[7rem] lg:min-h-[10rem]">
              <span className="inline-block relative">From <FlipWords words={["Betting", "Guessing", "Losing", "Gambling"]} duration={2500} className="text-[#E4002B]" /></span>
              <br />
              <span className="text-[#E6EDF3]">to Building Wealth.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-[#9CA3AF] sm:text-lg">
              <TextGenerateEffect
                text="Own PSL team tokens. Prices move with every ball. No gambling — real assets, real exits, real rewards."
                staggerDelay={0.04}
              />
            </p>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={prefersReduced ? noMotionInitial : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? instantTransition : { delay: 0.2 }}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <div className="rounded-xl border border-[#E4002B]/40 bg-[#E4002B]/10 px-5 py-3 text-sm font-bold text-[#E6EDF3] transition-all duration-200 ease-out hover:bg-[#E4002B]/20 hover:border-[#E4002B]/60">
              <SafeConnectButton label="Start Trading" showBalance={false} />
            </div>
            <Link href="/match">
              <ShimmerButton
                className="bg-[#161B22] hover:bg-[#21262D] border border-[#21262D] hover:border-[#3FB950]/50"
                shimmerColor="rgba(63, 185, 80, 0.1)"
              >
                <Activity className="h-4 w-4 text-[#3FB950]" />
                Watch Live Match
              </ShimmerButton>
            </Link>
          </motion.div>

          {/* Live FOMO ticker */}
          <motion.div
            initial={prefersReduced ? noMotionInitial : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={prefersReduced ? instantTransition : { delay: 0.3 }}
            className="mt-8 flex justify-center"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-[#21262D]/60 bg-[#161B22]/60 px-4 sm:px-5 py-2 text-[11px] sm:text-xs backdrop-blur-md max-w-[95vw]">
              {hasLiveMatch && liveMatchLabel && (
                <>
                  <span className="flex items-center gap-1.5 text-[#F85149] font-bold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F85149] opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#F85149]" />
                    </span>
                    LIVE
                  </span>
                  <span className="text-[#9CA3AF]">{liveMatchLabel}</span>
                  <span className="text-[#768390]">|</span>
                </>
              )}
              <span className="text-[#E6EDF3] font-semibold">
                <GlitchPrice
                  value={formatCurrency(vaultBalance)}
                  className="font-semibold text-[#E6EDF3]"
                  autoScrambleInterval={12000}
                />
                {" "}in Upset Vault
              </span>
              <span className="text-[#768390]">|</span>
              <span className="text-[#9CA3AF]">
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
            initial={prefersReduced ? noMotionInitial : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReduced ? instantTransition : { delay: 0.4 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-2"
          >
            <FeaturePill icon={Trophy} label="8 Teams" />
            <FeaturePill icon={Activity} label="Live Prices" />
            <FeaturePill icon={Zap} label="AI Signals" />
            <FeaturePill icon={Flame} label="Upset Vault" />
          </motion.div>

          {/* Hero Stats */}
          <motion.div
            initial={prefersReduced ? noMotionInitial : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReduced ? instantTransition : { delay: 0.35 }}
            className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto"
          >
            {[
              { label: "Team Tokens", value: "8", suffix: "" },
              { label: "On-Chain Txs", value: "867", suffix: "+" },
              { label: "Vault Balance", value: formatCurrency(vaultBalance), suffix: "" },
              { label: "Contracts", value: "6", suffix: "" },
            ].map(({ label, value, suffix }) => (
              <div key={label} className="text-center">
                <p className="text-2xl sm:text-3xl font-black tabular-nums text-[#E6EDF3]">
                  {value}{suffix}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mt-1">{label}</p>
              </div>
            ))}
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
            <p className="text-sm text-[#9CA3AF]">
              {teams.length} teams, {teams.length} tokens — trade the tournament
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/leaderboard"
              className="flex items-center gap-1.5 text-sm text-[#9CA3AF] hover:text-[#E6EDF3] transition-colors"
            >
              <Trophy className="h-3.5 w-3.5" />
              Leaderboard
            </Link>
          </div>
        </div>

        {/* Search & sort controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams..."
              aria-label="Search teams"
              maxLength={100}
              className="w-full rounded-lg border border-[#21262D] bg-[#0D1117] py-2 pl-9 pr-3 text-sm text-[#E6EDF3] placeholder-[#9CA3AF] outline-none transition-all duration-200 ease-out focus:border-[#58A6FF] focus:ring-1 focus:ring-[#58A6FF]/30 sm:w-56"
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
                  aria-pressed={isActive}
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
                      : "border-[#21262D] text-[#9CA3AF] hover:border-[#58A6FF]/50"
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

        {teamsLoading ? (
          <div className="min-h-[400px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PSL_TEAMS.length }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl border border-[#21262D] bg-[#161B22]"
              />
            ))}
          </div>
        ) : displayTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#21262D] bg-[#161B22] py-16 text-center">
            <p className="text-sm text-[#9CA3AF]">
              No teams match &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <LayoutGrid className="min-h-[400px] grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayTeams.map((team) => (
              <MouseTrackCard key={team.id}>
                <TeamCard team={team} />
              </MouseTrackCard>
            ))}
          </LayoutGrid>
        )}
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden">
        <div className="gradient-divider" />
        <LampContainer className="pt-12">
          <motion.h2
            initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={prefersReduced ? instantTransition : { delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="text-2xl font-black text-[#E6EDF3] sm:text-3xl text-center"
          >
            How It Works
          </motion.h2>
          <p className="mt-3 text-sm text-[#9CA3AF] text-center">
            From wallet to payout in under a minute
          </p>
        </LampContainer>

        <div className="mx-auto max-w-7xl px-4 -mt-8 sm:-mt-16 pb-24 sm:px-6">
          {/* Steps — vertical timeline on mobile, horizontal on desktop */}
          <div className="relative">
            {/* Horizontal connector — desktop */}
            <div className="pointer-events-none absolute top-[52px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] hidden lg:block">
              <motion.div
                className="h-px w-full bg-[#21262D]"
                initial={prefersReduced ? { scaleX: 1 } : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={prefersReduced ? instantTransition : { duration: 1, delay: 0.4, ease: "easeOut" }}
                style={{ transformOrigin: "left" }}
              />
            </div>

            {/* Vertical connector — mobile */}
            <div className="pointer-events-none absolute top-[52px] bottom-[52px] left-6 w-px lg:hidden">
              <motion.div
                className="h-full w-full bg-[#21262D]"
                initial={prefersReduced ? { scaleY: 1 } : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={prefersReduced ? instantTransition : { duration: 1, delay: 0.3, ease: "easeOut" }}
                style={{ transformOrigin: "top" }}
              />
            </div>

            <div className="grid grid-cols-1 gap-0 lg:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Connect",
                  desc: "Link your Web3 wallet to WireFluid. No signup, no KYC.",
                  icon: Zap,
                },
                {
                  step: "02",
                  title: "Pick a Side",
                  desc: "Buy team tokens. Prices track real match performance via bonding curves.",
                  icon: Trophy,
                },
                {
                  step: "03",
                  title: "Trade Live",
                  desc: "React to wickets, sixes, collapses in real time. AI signals guide your moves.",
                  icon: Activity,
                },
                {
                  step: "04",
                  title: "Collect",
                  desc: "Earn from the Upset Vault, Predict & Earn, and season rewards.",
                  icon: Flame,
                },
              ].map(({ step, title, desc, icon: StepIcon }, idx) => (
                <motion.div
                  key={title}
                  initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={prefersReduced ? instantTransition : { duration: 0.5, delay: idx * 0.15 }}
                  className="group relative flex items-start gap-5 py-4 lg:flex-col lg:items-center lg:text-center lg:px-4 lg:py-0"
                >
                  {/* Step dot + number */}
                  <div className="relative z-10 flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#21262D] bg-[#0D1117] transition-all group-hover:border-[#E6EDF3]/20 group-hover:shadow-[0_0_24px_rgba(228,0,43,0.12)]">
                      <StepIcon className="h-5 w-5 text-[#E6EDF3] transition-transform group-hover:scale-110" />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#768390]">
                      {step}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="pt-1 lg:pt-0 lg:mt-2">
                    <h3 className="text-sm font-bold text-[#E6EDF3] mb-1">
                      {title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#9CA3AF] max-w-[220px] lg:mx-auto">
                      {desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="gradient-divider" />

      {/* Upset Vault explainer */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 sm:px-6">
        <div className="relative overflow-hidden rounded-xl border border-[#21262D] bg-[#161B22]">
          <Meteors number={8} className="opacity-40" />

          {/* Vault balance — the hero of this section */}
          <div className="px-6 pt-10 pb-6 sm:px-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E4002B]/40 bg-[#E4002B]/10 px-3 py-1 text-xs font-semibold text-[#E4002B]">
              <Flame className="h-3 w-3" />
              Upset Vault
            </div>
            <div className="vault-glow mt-2">
              <Sparkles count={20} color="#FDB913" minSize={1} maxSize={2.5} className="inline-block">
                <GlitchPrice
                  value={formatCurrency(vaultBalance)}
                  className="vault-glow text-5xl font-black sm:text-6xl md:text-7xl tabular-nums tracking-tight text-[#E6EDF3]"
                  autoScrambleInterval={8000}
                />
              </Sparkles>
            </div>
            <p className="mt-3 text-sm text-[#9CA3AF]">
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
                      <span className="text-xs text-[#9CA3AF]">{label}</span>
                      <span className="text-xs font-black text-[#E4002B]">
                        {multiplier}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-[#21262D] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#E4002B]"
                        initial={prefersReduced ? { width } : { width: 0 }}
                        whileInView={{ width }}
                        viewport={{ once: true }}
                        transition={prefersReduced ? instantTransition : { duration: 0.8, ease: "easeOut" }}
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
                  { label: "All-time Paid Out", raw: 249, prefix: "$", suffix: "K" },
                  { label: "All-time Upsets", raw: 18, prefix: "", suffix: "" },
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
                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{label}</p>
                  </div>
                ))}
              </StaggerReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Why Overflow */}
      <section className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 sm:px-6">
        <div className="gradient-divider mb-12" />
        <motion.div
          className="mb-12 text-center"
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={prefersReduced ? instantTransition : { duration: 0.6 }}
        >
          <h2 className="text-2xl font-black text-[#E6EDF3] sm:text-3xl">
            Why <span className="text-[#E4002B]">Overflow</span>?
          </h2>
          <p className="mt-3 text-sm text-[#9CA3AF] max-w-md mx-auto">
            Not a prediction app. Not a fantasy league. A real DeFi protocol powered by cricket.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {([
            {
              icon: Activity,
              title: "Real-Time Pricing",
              desc: "Token prices shift with every wicket, six, and collapse. Bonding curves, not bookmakers.",
              accent: "#3FB950",
            },
            {
              icon: Zap,
              title: "AI Match Signals",
              desc: "RAG-powered cricket analytics. Momentum detection, upset probability, and trade signals.",
              accent: "#58A6FF",
            },
            {
              icon: Flame,
              title: "Upset Vault",
              desc: "2% of every trade fee goes to the vault. When underdogs win, holders split the pot up to 5x.",
              accent: "#E4002B",
            },
            {
              icon: Trophy,
              title: "Season Rewards",
              desc: "Hold top-performing team tokens. Season-end ranking distributes the reward pool: 30% to #1.",
              accent: "#FDB913",
            },
            {
              title: "Fan Wars",
              desc: "Lock tokens before matches. Winning team's lockers get boosted returns from the losing side.",
              accent: "#6A0DAD",
              iconText: "⚔️",
            },
            {
              title: "Predict & Earn",
              desc: "Answer match questions live. Score accuracy points. Top predictors split the prize pool 10/30/60.",
              accent: "#58A6FF",
              iconText: "🎯",
            },
          ] as { icon?: React.ElementType; title: string; desc: string; accent: string; iconText?: string }[]).map(({ icon: FeatureIcon, title, desc, accent, iconText }, idx) => (
            <motion.div
              key={title}
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={prefersReduced ? instantTransition : { duration: 0.4, delay: idx * 0.08 }}
              className="group relative rounded-xl border border-[#21262D] bg-[#161B22] p-6 transition-all duration-300 hover:border-[#21262D]/80 hover:bg-[#161B22]/80"
              style={{
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0 40px ${accent}10, 0 0 80px ${accent}05`;
                (e.currentTarget as HTMLElement).style.borderColor = `${accent}30`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLElement).style.borderColor = '#21262D';
              }}
            >
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                style={{ backgroundColor: `${accent}15`, color: accent }}
              >
                {FeatureIcon ? <FeatureIcon className="h-5 w-5" /> : <span>{iconText}</span>}
              </div>
              <h3 className="text-sm font-bold text-[#E6EDF3] mb-1.5">{title}</h3>
              <p className="text-xs leading-relaxed text-[#9CA3AF]">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Built on WireFluid */}
      <section className="border-t border-b border-[#21262D] bg-[#161B22]/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <motion.div
            className="text-center mb-10"
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={prefersReduced ? instantTransition : { duration: 0.6 }}
          >
            <h2 className="text-xl font-black text-[#E6EDF3]">
              Built Different
            </h2>
            <p className="mt-2 text-xs text-[#9CA3AF]">
              Fully on-chain. Fully transparent. Fully yours.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { label: "Blockchain", value: "WireFluid", sub: "Chain ID 92533" },
              { label: "Smart Contracts", value: "6 Deployed", sub: "Solidity 0.8.24" },
              { label: "Oracle", value: "CricAPI", sub: "Live PSL Data" },
              { label: "AI Engine", value: "LangChain", sub: "RAG Pipeline" },
            ].map(({ label, value, sub }, idx) => (
              <motion.div
                key={label}
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={prefersReduced ? instantTransition : { duration: 0.4, delay: idx * 0.1 }}
                className="text-center"
              >
                <p className="text-xs uppercase tracking-wider text-[#9CA3AF] mb-1">{label}</p>
                <p className="text-lg font-black text-[#E6EDF3]">{value}</p>
                <p className="text-[10px] text-[#6E7681] mt-0.5">{sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-[#21262D] bg-[#161B22] px-6 py-16 sm:px-12 sm:py-20 text-center">
            <BackgroundBeams className="z-0 opacity-40" beamCount={6} />
            <div className="relative z-10">
              <motion.div
                initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={prefersReduced ? instantTransition : { duration: 0.6 }}
              >
                <h2 className="text-3xl font-black text-[#E6EDF3] sm:text-4xl lg:text-5xl">
                  Cricket Knowledge is
                  <br />
                  <span className="text-[#E4002B]">Financial Power.</span>
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-sm text-[#9CA3AF]">
                  8 PSL teams. 44 matches. One season to prove your edge.
                  Connect your wallet and start building.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <div className="rounded-xl border border-[#E4002B]/40 bg-[#E4002B]/10 px-6 py-3 text-sm font-bold text-[#E6EDF3] transition-all duration-200 ease-out hover:bg-[#E4002B]/20 hover:border-[#E4002B]/60">
                    <SafeConnectButton label="Connect Wallet" showBalance={false} />
                  </div>
                  <Link
                    href="/how-it-works"
                    className="flex items-center gap-2 rounded-xl border border-[#21262D] bg-[#0D1117] px-6 py-3 text-sm font-medium text-[#9CA3AF] hover:text-[#E6EDF3] hover:border-[#9CA3AF]/30 transition-all duration-200"
                  >
                    Learn More
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
