"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Zap,
  Trophy,
  Clock,
  Layers,
  Lock,
  Flame,
  CircleDollarSign,
  Calendar,
  Rocket,
  Swords,
  Crown,
  Ban,
  Activity,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { RevealText } from "@/components/effects/RevealText";
import { CountUp } from "@/components/motion/CountUp";
import { StaggerReveal } from "@/components/motion/StaggerReveal";

const BackgroundBeams = dynamic(
  () => import("@/components/ui/background-beams").then((m) => ({ default: m.BackgroundBeams })),
  { ssr: false },
);
const TextGenerateEffect = dynamic(
  () => import("@/components/ui/text-generate-effect").then((m) => ({ default: m.TextGenerateEffect })),
  { ssr: false },
);
const Spotlight = dynamic(
  () => import("@/components/ui/spotlight").then((m) => ({ default: m.Spotlight })),
  { ssr: false },
);
const CardSpotlight = dynamic(
  () => import("@/components/ui/card-spotlight").then((m) => ({ default: m.CardSpotlight })),
  { ssr: false },
);
const AnimatedGradientBorder = dynamic(
  () => import("@/components/ui/animated-gradient-border").then((m) => ({ default: m.AnimatedGradientBorder })),
  { ssr: false },
);

/* ------------------------------------------------------------------ */
/*  Shared animation presets                                           */
/* ------------------------------------------------------------------ */

const sectionReveal = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10%" as const },
  transition: { duration: 0.6, ease: "easeOut" as const },
};

/* ------------------------------------------------------------------ */
/*  Animated section divider                                           */
/* ------------------------------------------------------------------ */

function AnimatedDivider() {
  return (
    <div className="py-4">
      <motion.div
        className="mx-auto h-px max-w-2xl bg-gradient-to-r from-transparent via-[#21262D] to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  icon: Icon,
  tag,
  title,
  description,
}: {
  icon: typeof Shield;
  tag: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#21262D] bg-[#161B22]">
          <Icon className="h-4 w-4 text-[#E4002B]" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E4002B]">
          {tag}
        </span>
      </div>
      <h2 className="text-2xl font-black tracking-tight text-[#E6EDF3] sm:text-3xl">
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8B949E]">
        {description}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bonding Curve SVG with animated path draw                          */
/* ------------------------------------------------------------------ */

function BondingCurveSVG() {
  const points = 60;
  const maxSupply = 10;
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  function curvePoints(exponent: number): string {
    const pts: string[] = [];
    for (let i = 0; i <= points; i++) {
      const supply = (i / points) * maxSupply;
      const price = Math.pow(supply, exponent);
      const x = 50 + (supply / maxSupply) * 300;
      const y = 210 - (price / Math.pow(maxSupply, 1.5)) * 180;
      pts.push(`${x},${y}`);
    }
    return pts.join(" ");
  }

  // Build area fill between curves
  const buyPts = curvePoints(1.5);
  const sellPts = curvePoints(1.2);
  const fillPoints = `${buyPts.split(" ").join(" ")},${sellPts.split(" ").reverse().join(" ")}`;

  return (
    <svg
      ref={ref}
      viewBox="0 0 400 260"
      className="w-full"
      role="img"
      aria-label="Bonding curve visualization showing buy price rising steeper than sell price"
    >
      <defs>
        <linearGradient id="buyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E4002B" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#E4002B" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="sellGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3FB950" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#3FB950" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="spreadGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E4002B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3FB950" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={`grid-h-${i}`}
          x1={50}
          y1={30 + i * 36}
          x2={350}
          y2={30 + i * 36}
          stroke="#21262D"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={`grid-v-${i}`}
          x1={50 + i * 60}
          y1={30}
          x2={50 + i * 60}
          y2={210}
          stroke="#21262D"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      ))}

      {/* Axes */}
      <line x1={50} y1={210} x2={350} y2={210} stroke="#30363D" strokeWidth={1.5} />
      <line x1={50} y1={30} x2={50} y2={210} stroke="#30363D" strokeWidth={1.5} />

      {/* Spread area fill */}
      <motion.polygon
        points={fillPoints}
        fill="url(#spreadGrad)"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 1.5 }}
      />

      {/* Buy curve (steeper) */}
      <motion.polyline
        points={buyPts}
        fill="none"
        stroke="url(#buyGrad)"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />

      {/* Sell curve (flatter) */}
      <motion.polyline
        points={sellPts}
        fill="none"
        stroke="url(#sellGrad)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="8 4"
        initial={{ pathLength: 0 }}
        animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
      />

      {/* Spread annotation */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 2 }}
      >
        <line x1={230} y1={102} x2={230} y2={126} stroke="#484F58" strokeWidth={1} strokeDasharray="2 2" />
        <text x={238} y={118} className="fill-[#8B949E] text-[9px] font-medium">spread</text>
      </motion.g>

      {/* Axis labels */}
      <motion.text
        x={200}
        y={245}
        textAnchor="middle"
        className="fill-[#8B949E] text-[11px] font-medium"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, delay: 1.8 }}
      >
        Token Supply
      </motion.text>
      <motion.text
        x={14}
        y={120}
        textAnchor="middle"
        className="fill-[#8B949E] text-[11px] font-medium"
        transform="rotate(-90, 14, 120)"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, delay: 1.8 }}
      >
        Price (WIRE)
      </motion.text>

      {/* Legend */}
      <motion.g
        initial={{ opacity: 0, y: 8 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.4, delay: 1.8 }}
      >
        <rect x={240} y={36} width={110} height={42} rx={6} fill="#0D1117" stroke="#21262D" strokeWidth={0.5} />
        <line x1={252} y1={52} x2={272} y2={52} stroke="#E4002B" strokeWidth={2.5} />
        <text x={278} y={55} className="fill-[#C9D1D9] text-[10px]">Buy (supply^1.5)</text>
        <line x1={252} y1={68} x2={272} y2={68} stroke="#3FB950" strokeWidth={2.5} strokeDasharray="8 4" />
        <text x={278} y={71} className="fill-[#C9D1D9] text-[10px]">Sell (supply^1.2)</text>
      </motion.g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Donut Chart for Fee Distribution                                   */
/* ------------------------------------------------------------------ */

const feeSlices = [
  { label: "Platform Treasury", pct: 30, color: "#58A6FF", icon: CircleDollarSign, desc: "Operations and development" },
  { label: "Performance Rewards", pct: 25, color: "#3FB950", icon: Trophy, desc: "Distributed after each match" },
  { label: "Floor Price Backing", pct: 20, color: "#FDB913", icon: Shield, desc: "Guarantees baseline token value" },
  { label: "Upset Vault", pct: 15, color: "#A855F7", icon: Flame, desc: "Underdog payout pool" },
  { label: "Season Grand Prize", pct: 10, color: "#E4002B", icon: Crown, desc: "End-of-season champion prize" },
];

function DonutChart() {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const radius = 80;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke offsets for each slice
  let cumulativePercent = 0;
  const sliceData = feeSlices.map((slice, idx) => {
    const dashLength = (slice.pct / 100) * circumference;
    const dashGap = circumference - dashLength;
    const offset = -(cumulativePercent / 100) * circumference;
    cumulativePercent += slice.pct;
    return { ...slice, dashLength, dashGap, offset, idx };
  });

  return (
    <div className="relative flex items-center justify-center">
      <svg
        ref={ref}
        viewBox="0 0 200 200"
        className="h-52 w-52 -rotate-90 sm:h-64 sm:w-64"
      >
        {/* Background ring */}
        <circle cx={100} cy={100} r={radius} fill="none" stroke="#161B22" strokeWidth={strokeWidth} />

        {/* Animated slices */}
        {sliceData.map((slice) => (
          <motion.circle
            key={slice.label}
            cx={100}
            cy={100}
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth={hoveredIdx === slice.idx ? strokeWidth + 6 : strokeWidth}
            strokeDasharray={`${slice.dashLength} ${slice.dashGap}`}
            strokeDashoffset={slice.offset}
            strokeLinecap="butt"
            className="cursor-pointer transition-all duration-200"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: hoveredIdx !== null && hoveredIdx !== slice.idx ? 0.4 : 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, delay: slice.idx * 0.12 }}
            onMouseEnter={() => setHoveredIdx(slice.idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {hoveredIdx !== null ? (
          <motion.div
            key={hoveredIdx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-2xl font-black tabular-nums font-mono" style={{ color: feeSlices[hoveredIdx].color }}>
              {feeSlices[hoveredIdx].pct}%
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#C9D1D9]">
              {feeSlices[hoveredIdx].label}
            </p>
          </motion.div>
        ) : (
          <div>
            <p className="text-xl font-black text-[#E6EDF3]">100%</p>
            <p className="mt-0.5 text-[10px] text-[#8B949E]">Fee Split</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Upset Vault Tiers                                                  */
/* ------------------------------------------------------------------ */

const upsetTiers = [
  { tier: "Normal", range: "0 - 3", multiplier: 1, release: 0, color: "#484F58", bg: "#161B22", barWidth: 10 },
  { tier: "Big Upset", range: "4 - 6", multiplier: 3, release: 15, color: "#3FB950", bg: "#0D1F14", barWidth: 40 },
  { tier: "Huge Upset", range: "7 - 9", multiplier: 5, release: 30, color: "#FDB913", bg: "#1A1608", barWidth: 65 },
  { tier: "GIANT KILLER", range: "10 - 13", multiplier: 10, release: 60, color: "#E4002B", bg: "#1A0A0E", barWidth: 100 },
];

/* ------------------------------------------------------------------ */
/*  Sell Tax Tier Card                                                 */
/* ------------------------------------------------------------------ */

function TaxTierCard({
  rank,
  tax,
  meaning,
  color,
  index,
}: {
  rank: number;
  tax: number;
  meaning: string;
  color: string;
  index: number;
}) {
  const barWidth = (tax / 15) * 100;

  return (
    <motion.div
      className="group relative overflow-hidden rounded-lg border border-[#21262D] bg-[#0D1117] p-4 transition-colors hover:border-[#30363D]"
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
    >
      {/* Color accent line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 pl-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#21262D] bg-[#161B22] font-mono text-xs font-black text-[#E6EDF3] tabular-nums">
            {rank}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#C9D1D9]">{meaning}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-lg font-black tabular-nums" style={{ color }}>
            <CountUp value={tax} decimals={1} suffix="%" />
          </span>
        </div>
      </div>

      {/* Tax bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#161B22] pl-2">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${barWidth}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 + index * 0.06, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rewards Podium                                                     */
/* ------------------------------------------------------------------ */

const rewardPositions = [
  { pos: "1st", share: 35, color: "#FDB913", height: 100, medal: "gold" },
  { pos: "2nd", share: 25, color: "#8B949E", height: 72, medal: "silver" },
  { pos: "3rd", share: 20, color: "#CD7F32", height: 57, medal: "bronze" },
  { pos: "4th", share: 12, color: "#58A6FF", height: 34, medal: null },
  { pos: "5th", share: 5, color: "#484F58", height: 14, medal: null },
  { pos: "6th", share: 3, color: "#484F58", height: 9, medal: null },
  { pos: "7th", share: 0, color: "#30363D", height: 2, medal: null },
  { pos: "8th", share: 0, color: "#30363D", height: 2, medal: null },
];

/* Podium display order: 2nd, 1st, 3rd (classic podium layout) */
const podiumOrder = [1, 0, 2]; // indices into rewardPositions

/* ------------------------------------------------------------------ */
/*  Season Timeline Step                                               */
/* ------------------------------------------------------------------ */

const seasonSteps = [
  { step: "01", title: "Token Launch", desc: "All 8 team tokens deployed on WireFluid. Initial price: 0.001 WIRE per token.", icon: Rocket, color: "#3FB950" },
  { step: "02", title: "Bonding Curve Active", desc: "Trading opens. Buy and sell prices move with demand. Fees fill ecosystem pools.", icon: Activity, color: "#58A6FF" },
  { step: "03", title: "League Stage", desc: "30 matches over 3 weeks. Sell taxes adjust after every match based on team rankings.", icon: Calendar, color: "#FDB913" },
  { step: "04", title: "Playoffs", desc: "Top 4 teams qualify. Trading volume spikes. Upset Vault payouts intensify.", icon: Swords, color: "#A855F7" },
  { step: "05", title: "Grand Final", desc: "Winner-takes-all match. Maximum volatility. Giant Killer potential at its peak.", icon: Crown, color: "#E4002B" },
  { step: "06", title: "Settlement", desc: "Grand Prize distributes to holders. All tokens redeemable at final floor price.", icon: Trophy, color: "#3FB950" },
];

/* ------------------------------------------------------------------ */
/*  Anti-Whale Timeline Decay Visualization                            */
/* ------------------------------------------------------------------ */

const decaySteps = [
  { time: "0 min", tax: 12, label: "Immediate sell" },
  { time: "5 min", tax: 8, label: "Quick exit" },
  { time: "30 min", tax: 5, label: "Short hold" },
  { time: "2 hr", tax: 3, label: "Standard hold" },
  { time: "24 hr+", tax: 2, label: "Diamond hands" },
];

/* ------------------------------------------------------------------ */
/*  Quick Nav Pill                                                     */
/* ------------------------------------------------------------------ */

function NavPill({ label, href, index }: { label: string; href: string; index: number }) {
  return (
    <motion.a
      href={href}
      className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-[#21262D] bg-[#161B22]/80 px-4 py-2 text-xs font-semibold text-[#8B949E] backdrop-blur-sm transition-all duration-300 hover:border-[#E4002B]/40 hover:text-[#E6EDF3] hover:bg-[#E4002B]/5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.8 + index * 0.05 }}
    >
      {/* Shimmer sweep on hover */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] transition-transform duration-500 ease-out group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <span className="relative z-10">{label}</span>
    </motion.a>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function HowItWorksPage() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroParallaxY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0D1117]"
    >
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section ref={heroRef} className="relative overflow-hidden border-b border-[#21262D]">
        {/* Animated cycling gradient background */}
        <div className="pointer-events-none absolute inset-0 hero-gradient-bg" />

        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(#E6EDF3 1px, transparent 1px), linear-gradient(90deg, #E6EDF3 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_40%,#0D1117)]" />
        </div>

        <BackgroundBeams className="z-[1]" beamCount={8} />
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        <motion.div
          className="relative z-10 mx-auto max-w-4xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28"
          style={{ y: heroParallaxY }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E4002B]/30 bg-[#E4002B]/8 px-4 py-1.5 text-xs font-semibold text-[#E4002B] backdrop-blur-sm"
          >
            <Zap className="h-3 w-3" />
            Platform Mechanics
          </motion.div>

          {/* Heading */}
          <RevealText
            lines={["How Overflow Works"]}
            className="text-4xl font-black tracking-tight text-[#E6EDF3] sm:text-5xl lg:text-6xl"
          />

          {/* Subtitle */}
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#8B949E] sm:text-lg">
            <TextGenerateEffect
              text="Trade PSL team tokens backed by real match performance. From bonding curves to upset payouts, every mechanic explained."
              staggerDelay={0.03}
            />
          </p>

          {/* Quick-nav pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
            {[
              { label: "Bonding Curve", href: "#bonding-curve" },
              { label: "Sell Tax", href: "#sell-tax" },
              { label: "Fees & Revenue", href: "#fees" },
              { label: "Upset Vault", href: "#upset-vault" },
              { label: "Anti-Whale", href: "#protection" },
              { label: "Rewards", href: "#rewards" },
              { label: "Season Lifecycle", href: "#season" },
            ].map((item, idx) => (
              <NavPill key={item.label} label={item.label} href={item.href} index={idx} />
            ))}
          </div>

          {/* Scroll indicator */}
          <motion.div
            className="mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <motion.div
              className="mx-auto h-8 w-5 rounded-full border border-[#30363D]"
              initial={{}}
            >
              <motion.div
                className="mx-auto mt-1.5 h-2 w-1 rounded-full bg-[#8B949E]"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  CONTENT                                                     */}
      {/* ============================================================ */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* ---------------------------------------------------------- */}
        {/*  1. BONDING CURVE                                           */}
        {/* ---------------------------------------------------------- */}
        <motion.section className="py-20 scroll-mt-16" id="bonding-curve" {...sectionReveal}>
          <SectionHeader
            icon={TrendingUp}
            tag="Pricing Model"
            title="Asymmetric Bonding Curve"
            description="Buy and sell prices follow different exponential curves. The spread between them discourages flipping and rewards conviction holders who believe in their team."
          />

          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            {/* Chart */}
            <CardSpotlight
              className="rounded-xl border border-[#21262D] bg-[#0D1117]"
              color="228, 0, 43"
              opacity={0.06}
              radius={300}
            >
              <div className="p-6">
                <BondingCurveSVG />
              </div>
            </CardSpotlight>

            {/* Stat cards */}
            <StaggerReveal className="flex flex-col justify-center gap-4" staggerDelay={0.12} yOffset={20}>
              <CardSpotlight
                className="rounded-xl border border-[#21262D] bg-[#161B22]"
                color="228, 0, 43"
                opacity={0.06}
              >
                <div className="p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-[#E4002B]" />
                    <h3 className="text-sm font-bold text-[#E6EDF3]">Buy Price</h3>
                  </div>
                  <code className="mt-3 block rounded-lg border border-[#21262D] bg-[#0D1117] px-3 py-2 font-mono text-sm text-[#E4002B]">
                    price = 0.001 WIRE * supply ^ 1.5
                  </code>
                  <p className="mt-3 text-xs leading-relaxed text-[#8B949E]">
                    Rises steeply as more tokens are purchased. Early buyers get the best price. Higher exponent means accelerating cost.
                  </p>
                </div>
              </CardSpotlight>

              <CardSpotlight
                className="rounded-xl border border-[#21262D] bg-[#161B22]"
                color="63, 185, 80"
                opacity={0.06}
              >
                <div className="p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-[#3FB950]" />
                    <h3 className="text-sm font-bold text-[#E6EDF3]">Sell Price</h3>
                  </div>
                  <code className="mt-3 block rounded-lg border border-[#21262D] bg-[#0D1117] px-3 py-2 font-mono text-sm text-[#3FB950]">
                    price = 0.001 WIRE * supply ^ 1.2
                  </code>
                  <p className="mt-3 text-xs leading-relaxed text-[#8B949E]">
                    Rises more gently. The gap between buy and sell curves creates the spread, which funds the ecosystem.
                  </p>
                </div>
              </CardSpotlight>

              <div className="rounded-xl border border-dashed border-[#FDB913]/30 bg-[#FDB913]/5 px-5 py-3.5">
                <p className="text-xs text-[#8B949E]">
                  <span className="font-bold text-[#FDB913]">Quick flips lose money.</span>{" "}
                  Base price starts at 0.001 WIRE. A 2% buy fee applies to every purchase.
                </p>
              </div>
            </StaggerReveal>
          </div>
        </motion.section>

        <AnimatedDivider />

        {/* ---------------------------------------------------------- */}
        {/*  2. SELL TAX TIERS                                          */}
        {/* ---------------------------------------------------------- */}
        <motion.section className="py-20 scroll-mt-16" id="sell-tax" {...sectionReveal}>
          <SectionHeader
            icon={Layers}
            tag="Dynamic Fees"
            title="Performance-Linked Sell Tax"
            description="Sell tax is tied to team ranking. Winning teams are cheap to exit. Losing teams cost more to abandon, discouraging fair-weather fans."
          />

          <div className="grid gap-3">
            {[
              { rank: 1, tax: 2.0, meaning: "Best team, cheapest exit", color: "#3FB950" },
              { rank: 2, tax: 4.6, meaning: "Strong contender", color: "#3FB950" },
              { rank: 3, tax: 7.2, meaning: "Mid table", color: "#58A6FF" },
              { rank: 4, tax: 9.8, meaning: "Below average", color: "#58A6FF" },
              { rank: 5, tax: 12.4, meaning: "Struggling team", color: "#FDB913" },
              { rank: 6, tax: 15.0, meaning: "Bottom tier (max)", color: "#E4002B" },
              { rank: 7, tax: 15.0, meaning: "Capped at 15%", color: "#E4002B" },
              { rank: 8, tax: 15.0, meaning: "Capped at 15%", color: "#E4002B" },
            ].map(({ rank, tax, meaning, color }, idx) => (
              <TaxTierCard
                key={rank}
                rank={rank}
                tax={tax}
                meaning={meaning}
                color={color}
                index={idx}
              />
            ))}
          </div>

          <motion.div
            className="mt-6 rounded-xl border border-[#21262D] bg-[#161B22] px-5 py-4"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <p className="text-xs text-[#8B949E]">
              <span className="font-bold text-[#C9D1D9]">Formula</span>{" "}
              <code className="rounded-md bg-[#0D1117] px-2 py-1 text-[#58A6FF] font-mono">
                sellTaxBps = 200 + (rank - 1) * 260
              </code>
              {" "}&mdash; basis points, where 200 bps = 2%. Capped at 1500 bps (15%).
            </p>
          </motion.div>
        </motion.section>

        <AnimatedDivider />

        {/* ---------------------------------------------------------- */}
        {/*  3. FEES & REVENUE                                          */}
        {/* ---------------------------------------------------------- */}
        <motion.section className="py-20 scroll-mt-16" id="fees" {...sectionReveal}>
          <SectionHeader
            icon={Zap}
            tag="Fee Allocation"
            title="Where Your Fees Go"
            description="Every fee collected splits into five pools. Nothing is burned — everything recirculates back to the ecosystem to fund rewards, protect floors, and grow the vault."
          />

          <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
            {/* Donut chart */}
            <div className="flex items-center justify-center lg:justify-start">
              <DonutChart />
            </div>

            {/* Fee cards */}
            <StaggerReveal className="flex flex-col justify-center gap-3" staggerDelay={0.08} yOffset={14}>
              {feeSlices.map((slice) => {
                const SliceIcon = slice.icon;
                return (
                  <CardSpotlight
                    key={slice.label}
                    className="rounded-xl border border-[#21262D] bg-[#0D1117]"
                    color={slice.color.replace("#", "").match(/.{2}/g)?.map(h => parseInt(h, 16)).join(", ") || "255,255,255"}
                    opacity={0.05}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3.5">
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${slice.color}15`, border: `1px solid ${slice.color}30` }}
                        >
                          <SliceIcon className="h-4 w-4" style={{ color: slice.color }} />
                        </span>
                        <div>
                          <span className="text-sm font-semibold text-[#C9D1D9]">{slice.label}</span>
                          <p className="text-[11px] text-[#8B949E]">{slice.desc}</p>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-xl font-black" style={{ color: slice.color }}>
                        <CountUp value={slice.pct} suffix="%" />
                      </span>
                    </div>
                  </CardSpotlight>
                );
              })}
            </StaggerReveal>
          </div>

          {/* Animated horizontal summary bar */}
          <div className="mt-8 overflow-hidden rounded-full bg-[#161B22]">
            <div className="flex h-3">
              {feeSlices.map((slice, idx) => (
                <motion.div
                  key={slice.label}
                  style={{
                    backgroundColor: slice.color,
                    width: `${slice.pct}%`,
                    transformOrigin: "left",
                  }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                />
              ))}
            </div>
          </div>
        </motion.section>

        <AnimatedDivider />

        {/* ---------------------------------------------------------- */}
        {/*  4. UPSET VAULT                                             */}
        {/* ---------------------------------------------------------- */}
        <motion.section className="py-20 scroll-mt-16" id="upset-vault" {...sectionReveal}>
          <SectionHeader
            icon={Flame}
            tag="Payout Engine"
            title="The Upset Vault"
            description="When an underdog beats a favorite, the vault opens. Bigger upset means bigger payout for holders who believed early."
          />

          {/* Vault hero card */}
          <AnimatedGradientBorder
            gradientColors={["#E4002B", "#FDB913", "#E4002B", "#A855F7", "#E4002B"]}
            borderWidth={2}
            duration={6}
            containerClassName="mb-8"
          >
            <div className="p-6 sm:p-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#E4002B]/30 bg-[#E4002B]/8 px-3 py-1 text-xs font-bold text-[#E4002B]">
                <Flame className="h-3 w-3" />
                Live Vault Balance
              </div>
              <p className="text-4xl font-black text-[#E6EDF3] tabular-nums font-mono sm:text-5xl tracking-tight">
                1,000 WIRE
              </p>
              <p className="mt-2 text-sm text-[#8B949E]">
                15% of all fees flow into the Upset Vault continuously
              </p>
            </div>
          </AnimatedGradientBorder>

          {/* Upset tier cards */}
          <StaggerReveal className="grid gap-4 sm:grid-cols-2" staggerDelay={0.12} yOffset={24}>
            {upsetTiers.map(({ tier, range, multiplier, release, color, bg, barWidth }) => (
              <CardSpotlight
                key={tier}
                className="rounded-xl border border-[#21262D]"
                color={color.replace("#", "").match(/.{2}/g)?.map(h => parseInt(h, 16)).join(", ") || "255,255,255"}
                opacity={0.06}
              >
                <div className="relative overflow-hidden p-5" style={{ backgroundColor: bg }}>
                  {/* Top accent */}
                  <div
                    className="absolute inset-x-0 top-0 h-[2px]"
                    style={{ backgroundColor: color, opacity: 0.5 }}
                  />

                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-black" style={{ color }}>{tier}</span>
                    <span className="rounded-md border border-[#21262D] px-2 py-0.5 font-mono tabular-nums text-[10px] text-[#8B949E]">
                      score {range}
                    </span>
                  </div>

                  {/* Animated bar */}
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#21262D]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${barWidth}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[#8B949E]">Multiplier</p>
                      <p className="mt-1 text-3xl font-black tabular-nums font-mono tracking-tight text-[#E6EDF3]">
                        <CountUp value={multiplier} suffix="x" />
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[#8B949E]">Vault Release</p>
                      <p className="mt-1 text-3xl font-black tabular-nums font-mono tracking-tight" style={{ color }}>
                        <CountUp value={release} suffix="%" />
                      </p>
                    </div>
                  </div>
                </div>
              </CardSpotlight>
            ))}
          </StaggerReveal>

          {/* Scenario calculator */}
          <motion.div
            className="mt-8 overflow-hidden rounded-xl border border-[#21262D] bg-[#161B22]"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="border-b border-[#21262D] px-5 py-3">
              <h3 className="text-sm font-bold text-[#FDB913]">Example Scenario</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-[#8B949E]">
                If the vault holds <span className="font-bold text-[#E6EDF3] font-mono tabular-nums">1,000 WIRE</span> and a <span className="font-bold text-[#3FB950]">Big Upset</span> happens:
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-[#0D1117] border border-[#21262D] p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-[#8B949E]">Vault</p>
                  <p className="mt-1 text-lg font-black text-[#E6EDF3] font-mono tabular-nums">
                    <CountUp value={1000} prefix="" suffix="" />
                  </p>
                  <p className="text-[10px] text-[#8B949E]">WIRE</p>
                </div>
                <div className="rounded-lg bg-[#0D1117] border border-[#21262D] p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-[#8B949E]">Release</p>
                  <p className="mt-1 text-lg font-black text-[#3FB950] font-mono tabular-nums">
                    <CountUp value={15} suffix="%" />
                  </p>
                  <p className="text-[10px] text-[#8B949E]">Big Upset</p>
                </div>
                <div className="rounded-lg bg-[#0D1117] border border-[#3FB950]/30 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-[#8B949E]">Payout</p>
                  <p className="mt-1 text-lg font-black text-[#3FB950] font-mono tabular-nums">
                    <CountUp value={150} prefix="" suffix="" />
                  </p>
                  <p className="text-[10px] text-[#8B949E]">WIRE released</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="mt-4 rounded-xl border border-dashed border-[#A855F7]/30 bg-[#A855F7]/5 px-5 py-3.5"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <p className="text-xs text-[#8B949E]">
              <span className="font-bold text-[#A855F7]">Upset Score</span>{" "}
              <code className="rounded-md bg-[#161B22] px-2 py-1 text-[#A855F7] font-mono">
                winner&apos;s sell tax - loser&apos;s sell tax
              </code>
              {" "}&mdash; in percentage points. Rank-6 beating Rank-1 = 15% - 2% = 13 (GIANT KILLER).
            </p>
          </motion.div>
        </motion.section>

        <AnimatedDivider />

        {/* ---------------------------------------------------------- */}
        {/*  5. ANTI-WHALE PROTECTION                                   */}
        {/* ---------------------------------------------------------- */}
        <motion.section className="py-20 scroll-mt-16" id="protection" {...sectionReveal}>
          <SectionHeader
            icon={Shield}
            tag="Security"
            title="Anti-Whale Protection"
            description="Multiple layers of safeguards prevent manipulation and protect smaller holders from being squeezed out by large traders."
          />

          {/* Progressive Tax Decay Timeline */}
          <div className="mb-10">
            <h3 className="mb-5 text-sm font-bold text-[#C9D1D9]">Progressive Sell Tax Decay</h3>
            <div className="grid gap-3">
              {decaySteps.map(({ time, tax, label }, idx) => {
                const barPct = (tax / 12) * 100;
                const color = tax >= 10 ? "#E4002B" : tax >= 6 ? "#FDB913" : "#3FB950";

                return (
                  <motion.div
                    key={time}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08, duration: 0.4 }}
                  >
                    <div className="w-16 text-right">
                      <span className="font-mono text-xs font-bold tabular-nums text-[#C9D1D9]">{time}</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded-md bg-[#161B22]">
                        <motion.div
                          className="flex h-full items-center rounded-md px-3"
                          style={{ backgroundColor: `${color}20`, borderLeft: `3px solid ${color}` }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${barPct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.2 + idx * 0.08, ease: "easeOut" }}
                        >
                          <span className="font-mono text-xs font-black tabular-nums" style={{ color }}>
                            {tax}%
                          </span>
                        </motion.div>
                      </div>
                    </div>
                    <span className="hidden text-[11px] text-[#8B949E] sm:block w-24">{label}</span>
                  </motion.div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[#8B949E]">
              <Timer className="h-3 w-3 text-[#3FB950]" />
              <span>Hold longer, pay less. Diamond hands are rewarded.</span>
            </div>
          </div>

          {/* Protection features grid */}
          <StaggerReveal className="grid gap-3 sm:grid-cols-2" staggerDelay={0.08} yOffset={14}>
            {[
              { title: "Asymmetric Curve", desc: "Buy price rises faster than sell, making instant arbitrage unprofitable.", icon: TrendingUp, color: "#E4002B" },
              { title: "Max 1% Sell", desc: "No single sell can exceed 1% of total supply, preventing flash crashes.", icon: Ban, color: "#FDB913" },
              { title: "Floor Price", desc: "20% of fees back a floor price. Tokens always retain baseline value.", icon: Shield, color: "#3FB950" },
              { title: "Circuit Breaker", desc: "Trading pauses automatically if price moves more than 40% in 5 minutes.", icon: Lock, color: "#58A6FF" },
            ].map(({ title, desc, icon: FeatureIcon, color }) => (
              <CardSpotlight
                key={title}
                className="rounded-xl border border-[#21262D] bg-[#0D1117]"
                color={color.replace("#", "").match(/.{2}/g)?.map(h => parseInt(h, 16)).join(", ") || "255,255,255"}
                opacity={0.05}
              >
                <div className="flex gap-4 p-4">
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}12`, border: `1px solid ${color}25` }}
                  >
                    <FeatureIcon className="h-4 w-4" style={{ color }} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#C9D1D9]">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#8B949E]">{desc}</p>
                  </div>
                </div>
              </CardSpotlight>
            ))}
          </StaggerReveal>
        </motion.section>

        <AnimatedDivider />

        {/* ---------------------------------------------------------- */}
        {/*  6. PERFORMANCE REWARDS                                     */}
        {/* ---------------------------------------------------------- */}
        <motion.section className="py-20 scroll-mt-16" id="rewards" {...sectionReveal}>
          <SectionHeader
            icon={Trophy}
            tag="Incentives"
            title="Performance Rewards"
            description="After each match, 25% of collected fees distribute to holders proportional to their team's final ranking. Top performers earn the biggest share."
          />

          {/* Podium — top 3 */}
          <div className="mb-10">
            <h3 className="mb-6 text-center text-sm font-bold text-[#C9D1D9]">Top 3 — Podium</h3>
            <div className="mx-auto flex max-w-md items-end justify-center gap-3">
              {podiumOrder.map((posIdx, visualIdx) => {
                const pos = rewardPositions[posIdx];
                const podiumHeight = [120, 160, 90][visualIdx]; // 2nd, 1st, 3rd heights
                const medalColors: Record<string, { bg: string; border: string }> = {
                  gold: { bg: "#FDB913", border: "#FDB913" },
                  silver: { bg: "#8B949E", border: "#8B949E" },
                  bronze: { bg: "#CD7F32", border: "#CD7F32" },
                };
                const medal = pos.medal ? medalColors[pos.medal] : null;

                return (
                  <motion.div
                    key={pos.pos}
                    className="flex flex-1 flex-col items-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: visualIdx * 0.15, duration: 0.5 }}
                  >
                    {/* Medal indicator */}
                    {medal && (
                      <div
                        className="mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black"
                        style={{ backgroundColor: `${medal.bg}20`, border: `2px solid ${medal.border}`, color: medal.bg }}
                      >
                        {posIdx + 1}
                      </div>
                    )}

                    {/* Percentage */}
                    <p className="mb-2 font-mono text-xl font-black tabular-nums" style={{ color: pos.color }}>
                      <CountUp value={pos.share} suffix="%" />
                    </p>

                    {/* Bar */}
                    <motion.div
                      className="w-full overflow-hidden rounded-t-lg"
                      style={{ backgroundColor: `${pos.color}15`, borderTop: `3px solid ${pos.color}` }}
                      initial={{ height: 0 }}
                      whileInView={{ height: podiumHeight }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.3 + visualIdx * 0.15, ease: "easeOut" }}
                    >
                      <div className="flex h-full items-end justify-center pb-3">
                        <span className="text-xs font-bold text-[#C9D1D9]">{pos.pos}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Full rankings — horizontal bars */}
          <div className="rounded-xl border border-[#21262D] overflow-hidden">
            <div className="border-b border-[#21262D] bg-[#161B22] px-5 py-3">
              <h3 className="text-sm font-bold text-[#C9D1D9]">Full Distribution — All 8 Positions</h3>
            </div>
            <div className="divide-y divide-[#21262D]/40">
              {rewardPositions.map(({ pos, share, color, height }, idx) => (
                <motion.div
                  key={pos}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[#161B22]/50"
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                >
                  <span className="w-10 text-sm font-bold text-[#E6EDF3]">{pos}</span>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-[#21262D]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 + idx * 0.06, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right font-mono tabular-nums text-sm font-black" style={{ color }}>
                    <CountUp value={share} suffix="%" />
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <AnimatedDivider />

        {/* ---------------------------------------------------------- */}
        {/*  7. SEASON LIFECYCLE                                        */}
        {/* ---------------------------------------------------------- */}
        <motion.section className="py-20 scroll-mt-16" id="season" {...sectionReveal}>
          <SectionHeader
            icon={Clock}
            tag="Lifecycle"
            title="Season Timeline"
            description="Each PSL season follows a fixed lifecycle from token launch to final settlement. Six stages, three weeks of action."
          />

          {/* Timeline */}
          <div className="relative ml-4 sm:ml-6">
            {/* Connecting line */}
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[#3FB950] via-[#FDB913] to-[#E4002B]"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
            />

            <div className="space-y-8">
              {seasonSteps.map(({ step, title, desc, icon: StepIcon, color }, idx) => {
                // Highlight current phase (League Stage during PSL season)
                const isCurrent = step === "03";

                return (
                  <motion.div
                    key={step}
                    className="relative flex items-start gap-5 pl-8"
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.45, ease: "easeOut" }}
                  >
                    {/* Dot on timeline */}
                    <motion.span
                      className="absolute left-0 top-2 h-3 w-3 -translate-x-[5.5px] rounded-full border-2 border-[#0D1117]"
                      style={{ backgroundColor: color }}
                      animate={isCurrent ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
                      transition={isCurrent ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                    />

                    {isCurrent ? (
                      <AnimatedGradientBorder
                        gradientColors={[color, "#FDB913", color, "#3FB950", color]}
                        borderWidth={1}
                        duration={4}
                        containerClassName="flex-1"
                      >
                        <div className="p-4 sm:p-5">
                          <div className="flex items-center gap-3 mb-2">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                            >
                              <StepIcon className="h-4 w-4" style={{ color }} />
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono tabular-nums text-[10px] text-[#8B949E]">{step}</span>
                              <p className="text-sm font-bold text-[#E6EDF3]">{title}</p>
                            </div>
                            <span className="ml-auto rounded-full border border-[#3FB950]/30 bg-[#3FB950]/10 px-2 py-0.5 text-[10px] font-bold text-[#3FB950]">
                              CURRENT
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed text-[#8B949E]">{desc}</p>
                        </div>
                      </AnimatedGradientBorder>
                    ) : (
                      <div className="flex-1 rounded-xl border border-[#21262D] bg-[#0D1117] p-4 sm:p-5 transition-colors hover:border-[#30363D]">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${color}12`, border: `1px solid ${color}20` }}
                          >
                            <StepIcon className="h-4 w-4" style={{ color }} />
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono tabular-nums text-[10px] text-[#8B949E]">{step}</span>
                            <p className="text-sm font-bold text-[#E6EDF3]">{title}</p>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed text-[#8B949E]">{desc}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Grand Prize Distribution */}
          <motion.div
            className="mt-12 overflow-hidden rounded-xl border border-[#21262D] bg-[#161B22]"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="border-b border-[#21262D] px-5 py-3">
              <h3 className="text-sm font-bold text-[#FDB913]">
                Season Grand Prize Distribution
              </h3>
            </div>
            <StaggerReveal className="grid grid-cols-2 gap-px bg-[#21262D] sm:grid-cols-4" staggerDelay={0.1} yOffset={14}>
              {[
                { place: "Champion", share: 50, color: "#FDB913" },
                { place: "Runner-up", share: 25, color: "#8B949E" },
                { place: "3rd / 4th", share: 15, color: "#CD7F32" },
                { place: "5th - 8th", share: 10, color: "#484F58" },
              ].map(({ place, share, color }) => (
                <div key={place} className="bg-[#161B22] px-4 py-6 text-center">
                  <p className="text-3xl font-black tabular-nums font-mono tracking-tight" style={{ color }}>
                    <CountUp value={share} suffix="%" />
                  </p>
                  <p className="mt-1.5 text-[11px] text-[#8B949E]">{place}</p>
                </div>
              ))}
            </StaggerReveal>
          </motion.div>
        </motion.section>

        <AnimatedDivider />

        {/* ---------------------------------------------------------- */}
        {/*  CTA                                                        */}
        {/* ---------------------------------------------------------- */}
        <motion.section className="py-20 text-center" {...sectionReveal}>
          <motion.div
            className="mx-auto max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-black tracking-tight text-[#E6EDF3] sm:text-4xl">
              Ready to Trade?
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[#8B949E]">
              Pick a team, ride the bonding curve, and earn from upsets. The vault is waiting.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E4002B] px-7 py-3 text-sm font-bold text-white transition-all hover:bg-[#C00025] hover:shadow-[0_0_30px_rgba(228,0,43,0.2)]"
              >
                View Markets
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/vault"
                className="inline-flex items-center gap-2 rounded-xl border border-[#21262D] bg-[#161B22] px-7 py-3 text-sm font-bold text-[#C9D1D9] transition-all hover:border-[#30363D] hover:text-white"
              >
                <Flame className="h-4 w-4 text-[#E4002B]" />
                Explore Upset Vault
              </Link>
            </div>
          </motion.div>

          {/* Bottom spacing before footer */}
          <div className="mt-16" />
        </motion.section>
      </div>
    </motion.div>
  );
}
