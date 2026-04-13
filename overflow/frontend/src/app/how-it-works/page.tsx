"use client";

import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { ArrowRight, Shield, TrendingUp, Zap, Trophy, Clock, Layers } from "lucide-react";
import Link from "next/link";
import { RevealText } from "@/components/effects";
import { CountUp, StaggerReveal } from "@/components/motion";

/* ------------------------------------------------------------------ */
/*  Shared animation presets                                           */
/* ------------------------------------------------------------------ */

const sectionReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10%" as const },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

function AnimatedDivider() {
  return (
    <div className="py-2">
      <motion.div
        className="mx-auto h-px max-w-lg bg-gradient-to-r from-transparent via-[#21262D] to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated table row wrapper                                         */
/* ------------------------------------------------------------------ */

function AnimatedRow({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  return (
    <motion.tr
      className={className}
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Section nav anchor — subtle floating label                         */
/* ------------------------------------------------------------------ */

function SectionLabel({ icon: Icon, label }: { icon: typeof Shield; label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[#21262D] bg-[#161B22]">
        <Icon className="h-3.5 w-3.5 text-[#E4002B]" />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#484F58]">
        {label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bonding Curve SVG (enhanced with staggered path draw + labels)     */
/* ------------------------------------------------------------------ */

function BondingCurveSVG() {
  const points = 50;
  const maxSupply = 10;
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  function curvePoints(exponent: number): string {
    const pts: string[] = [];
    for (let i = 0; i <= points; i++) {
      const supply = (i / points) * maxSupply;
      const price = Math.pow(supply, exponent);
      const x = 40 + (supply / maxSupply) * 260;
      const y = 180 - (price / Math.pow(maxSupply, 1.5)) * 160;
      pts.push(`${x},${y}`);
    }
    return pts.join(" ");
  }

  return (
    <svg
      ref={ref}
      viewBox="0 0 340 220"
      className="w-full"
      role="img"
      aria-label="Bonding curve visualization showing buy price rising steeper than sell price"
    >
      {/* Subtle background gradient */}
      <defs>
        <linearGradient id="gridFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#21262D" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#21262D" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={`grid-${i}`}
          x1={40}
          y1={20 + i * 40}
          x2={300}
          y2={20 + i * 40}
          stroke="#21262D"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      ))}

      {/* Axes */}
      <line x1={40} y1={180} x2={300} y2={180} stroke="#30363D" strokeWidth={1} />
      <line x1={40} y1={20} x2={40} y2={180} stroke="#30363D" strokeWidth={1} />

      {/* Axis labels — fade in after curves */}
      <motion.text
        x={170}
        y={210}
        textAnchor="middle"
        className="fill-[#484F58] text-[10px]"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, delay: 1.6 }}
      >
        Supply
      </motion.text>
      <motion.text
        x={12}
        y={100}
        textAnchor="middle"
        className="fill-[#484F58] text-[10px]"
        transform="rotate(-90, 12, 100)"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, delay: 1.6 }}
      >
        Price
      </motion.text>

      {/* Spread area — fades in after both curves drawn */}
      <motion.polygon
        points={`${curvePoints(1.5).split(" ").join(" ")},${curvePoints(1.2).split(" ").reverse().join(" ")}`}
        fill="#E4002B"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 0.05 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 1.5 }}
      />

      {/* Buy curve (steeper) — draws first */}
      <motion.polyline
        points={curvePoints(1.5)}
        fill="none"
        stroke="#E4002B"
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* Sell curve (flatter) — draws 0.3s after buy */}
      <motion.polyline
        points={curvePoints(1.2)}
        fill="none"
        stroke="#3FB950"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="6 3"
        initial={{ pathLength: 0 }}
        animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
      />

      {/* Spread annotation — arrow between curves at midpoint */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, delay: 1.8 }}
      >
        <line x1={190} y1={92} x2={190} y2={112} stroke="#484F58" strokeWidth={0.75} strokeDasharray="2 2" />
        <text x={198} y={105} className="fill-[#8B949E] text-[8px]">spread</text>
      </motion.g>

      {/* Legend — fades in after curves finish */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, delay: 1.6 }}
      >
        <line x1={200} y1={30} x2={220} y2={30} stroke="#E4002B" strokeWidth={2} />
        <text x={225} y={34} className="fill-[#C9D1D9] text-[10px]">
          Buy (supply^1.5)
        </text>

        <line x1={200} y1={48} x2={220} y2={48} stroke="#3FB950" strokeWidth={2} strokeDasharray="6 3" />
        <text x={225} y={52} className="fill-[#C9D1D9] text-[10px]">
          Sell (supply^1.2)
        </text>
      </motion.g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Fee Distribution Data                                              */
/* ------------------------------------------------------------------ */

const feeSlices = [
  { label: "Platform Treasury", pct: 30, color: "#58A6FF", desc: "Operations and development" },
  { label: "Performance Rewards", pct: 25, color: "#3FB950", desc: "Distributed after each match" },
  { label: "Floor Price Backing", pct: 20, color: "#FDB913", desc: "Guarantees baseline token value" },
  { label: "Upset Vault", pct: 15, color: "#A855F7", desc: "Underdog payout pool" },
  { label: "Season Grand Prize", pct: 10, color: "#E4002B", desc: "End-of-season champion prize" },
];

/* ------------------------------------------------------------------ */
/*  Upset Vault Tiers                                                  */
/* ------------------------------------------------------------------ */

const upsetTiers = [
  { tier: "Normal", range: "0 - 3", multiplier: 1, release: 0, color: "#484F58", bg: "#161B22" },
  { tier: "Big Upset", range: "4 - 6", multiplier: 3, release: 15, color: "#3FB950", bg: "#0D1F14" },
  { tier: "Huge Upset", range: "7 - 9", multiplier: 5, release: 30, color: "#FDB913", bg: "#1A1608" },
  { tier: "GIANT KILLER", range: "10 - 13", multiplier: 10, release: 60, color: "#E4002B", bg: "#1A0A0E" },
];

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function HowItWorksPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0D1117]"
    >
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[#21262D]">
        {/* Subtle grid pattern behind hero */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#E6EDF3 1px, transparent 1px), linear-gradient(90deg, #E6EDF3 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <RevealText
            lines={["How Overflow Works"]}
            className="text-3xl font-black tracking-tight text-[#E6EDF3] sm:text-5xl"
          />
          <motion.p
            className="mt-4 max-w-lg text-base leading-relaxed text-[#8B949E]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            From token purchase to upset payout. The mechanics behind every trade,
            every fee, and every underdog victory.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
          >
            {[
              { label: "Bonding Curve", href: "#bonding-curve" },
              { label: "Sell Tax", href: "#sell-tax" },
              { label: "Fees", href: "#fees" },
              { label: "Upset Vault", href: "#upset-vault" },
              { label: "Rewards", href: "#rewards" },
              { label: "Season", href: "#season" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-md border border-[#21262D] bg-[#161B22] px-3 py-1.5 text-xs font-medium text-[#8B949E] transition-colors hover:border-[#30363D] hover:text-[#C9D1D9]"
              >
                {item.label}
              </a>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* ============================================================ */}
        {/*  BONDING CURVE                                                */}
        {/* ============================================================ */}
        <motion.section className="py-14" id="bonding-curve" {...sectionReveal}>
          <SectionLabel icon={TrendingUp} label="Pricing Model" />
          <h2 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">
            Asymmetric Bonding Curve
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#8B949E]">
            Buy and sell prices follow different curves. The spread between them
            discourages flipping and rewards conviction holders.
          </p>

          <div className="mt-8 grid gap-8 md:grid-cols-[1.1fr_1fr]">
            <div className="rounded-xl border border-[#21262D] bg-[#0D1117] p-5">
              <BondingCurveSVG />
            </div>

            <StaggerReveal className="flex flex-col justify-center gap-4" staggerDelay={0.1} yOffset={16}>
              <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-4 transition-colors hover:border-[#30363D]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E4002B]" />
                  <h3 className="text-sm font-semibold text-[#E6EDF3]">Buy Price</h3>
                </div>
                <code className="mt-2 block text-xs text-[#E4002B]/80">
                  price = 0.001 WIRE * supply ^ 1.5
                </code>
                <p className="mt-2 text-xs leading-relaxed text-[#8B949E]">
                  Rises steeply as more tokens are purchased. Early buyers get the best price.
                </p>
              </div>

              <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-4 transition-colors hover:border-[#30363D]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3FB950]" />
                  <h3 className="text-sm font-semibold text-[#E6EDF3]">Sell Price</h3>
                </div>
                <code className="mt-2 block text-xs text-[#3FB950]/80">
                  price = 0.001 WIRE * supply ^ 1.2
                </code>
                <p className="mt-2 text-xs leading-relaxed text-[#8B949E]">
                  Rises more gently. The gap between buy and sell is the spread.
                </p>
              </div>

              <div className="rounded-lg border border-dashed border-[#21262D] px-4 py-3">
                <p className="text-xs text-[#8B949E]">
                  <span className="font-semibold text-[#FDB913]">Quick flips lose money.</span>{" "}
                  Base price: 0.001 WIRE. 2% buy fee on every purchase.
                </p>
              </div>
            </StaggerReveal>
          </div>
        </motion.section>

        <AnimatedDivider />

        {/* ============================================================ */}
        {/*  DYNAMIC SELL TAX                                             */}
        {/* ============================================================ */}
        <motion.section className="py-14" id="sell-tax" {...sectionReveal}>
          <SectionLabel icon={Layers} label="Dynamic Fees" />
          <h2 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">
            Performance-Linked Sell Tax
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#8B949E]">
            Sell tax is tied to team ranking. Winning teams are cheap to exit.
            Losing teams cost more to abandon.
          </p>

          <div className="mt-8 overflow-hidden rounded-xl border border-[#21262D]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#21262D] bg-[#161B22]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#484F58]">Ranking</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#484F58]">Sell Tax</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#484F58]">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { rank: 1, tax: 2.0, meaning: "Best team, cheapest exit", color: "#3FB950" },
                  { rank: 2, tax: 4.6, meaning: "Strong contender", color: "#58A6FF" },
                  { rank: 3, tax: 7.2, meaning: "Mid table", color: "#58A6FF" },
                  { rank: 4, tax: 9.8, meaning: "Below average", color: "#FDB913" },
                  { rank: 5, tax: 12.4, meaning: "Struggling team", color: "#FDB913" },
                  { rank: 6, tax: 15.0, meaning: "Bottom, most expensive exit", color: "#E4002B" },
                ].map(({ rank, tax, meaning, color }, idx) => (
                  <AnimatedRow
                    key={rank}
                    index={idx}
                    className="border-b border-[#21262D]/40 last:border-b-0 transition-colors hover:bg-[#161B22]/50"
                  >
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold text-[#E6EDF3]">#{rank}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-sm font-bold" style={{ color }}>
                      <CountUp value={tax} decimals={1} suffix="%" />
                    </td>
                    <td className="px-5 py-3 text-xs text-[#8B949E]">{meaning}</td>
                  </AnimatedRow>
                ))}
              </tbody>
            </table>
          </div>

          <motion.div
            className="mt-4 rounded-lg border border-dashed border-[#21262D] px-4 py-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <p className="text-xs text-[#8B949E]">
              <span className="font-semibold text-[#C9D1D9]">Formula</span>{" "}
              <code className="rounded bg-[#161B22] px-1.5 py-0.5 text-[#58A6FF]">
                sellTaxBps = 200 + (rank - 1) * 260
              </code>
              {" "}&mdash; basis points, where 200 bps = 2%.
            </p>
          </motion.div>
        </motion.section>

        <AnimatedDivider />

        {/* ============================================================ */}
        {/*  FEE DISTRIBUTION                                             */}
        {/* ============================================================ */}
        <motion.section className="py-14" id="fees" {...sectionReveal}>
          <SectionLabel icon={Zap} label="Fee Allocation" />
          <h2 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">
            Where Your Fees Go
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#8B949E]">
            Every fee collected splits into five pools. Nothing is burned &mdash;
            everything recirculates back to the ecosystem.
          </p>

          {/* Animated horizontal bar — segments grow left to right */}
          <div className="mt-8 flex h-2.5 overflow-hidden rounded-full bg-[#161B22]">
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
                transition={{ duration: 0.4, delay: idx * 0.1, ease: "easeOut" }}
              />
            ))}
          </div>

          {/* Fee cards instead of plain table */}
          <StaggerReveal className="mt-5 grid gap-2" staggerDelay={0.06} yOffset={10}>
            {feeSlices.map((slice) => (
              <div
                key={slice.label}
                className="flex items-center justify-between rounded-lg border border-[#21262D] bg-[#0D1117] px-4 py-3 transition-colors hover:border-[#30363D]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div>
                    <span className="text-sm font-medium text-[#C9D1D9]">{slice.label}</span>
                    <p className="text-[11px] text-[#484F58]">{slice.desc}</p>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: slice.color }}>
                  <CountUp value={slice.pct} suffix="%" />
                </span>
              </div>
            ))}
          </StaggerReveal>
        </motion.section>

        <AnimatedDivider />

        {/* ============================================================ */}
        {/*  UPSET VAULT                                                  */}
        {/* ============================================================ */}
        <motion.section className="py-14" id="upset-vault" {...sectionReveal}>
          <SectionLabel icon={Trophy} label="Payout Engine" />
          <h2 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">
            The Upset Vault
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#8B949E]">
            When an underdog beats a favorite, the vault opens. Bigger upset
            means bigger payout for holders who believed early.
          </p>

          {/* Tier cards — progressive reveal */}
          <StaggerReveal className="mt-8 grid gap-3 sm:grid-cols-2" staggerDelay={0.12} yOffset={20}>
            {upsetTiers.map(({ tier, range, multiplier, release, color, bg }) => (
              <div
                key={tier}
                className="group relative overflow-hidden rounded-xl border border-[#21262D] p-5 transition-colors hover:border-[#30363D]"
                style={{ backgroundColor: bg }}
              >
                {/* Subtle accent line at top */}
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ backgroundColor: color, opacity: 0.3 }}
                />
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold" style={{ color }}>{tier}</span>
                  <span className="rounded-md border border-[#21262D] px-2 py-0.5 font-mono text-[10px] text-[#484F58]">
                    score {range}
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#484F58]">Multiplier</p>
                    <p className="mt-1 text-3xl font-black tracking-tight text-[#E6EDF3]">
                      <CountUp value={multiplier} suffix="x" />
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#484F58]">Vault Release</p>
                    <p className="mt-1 text-3xl font-black tracking-tight" style={{ color }}>
                      <CountUp value={release} suffix="%" />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </StaggerReveal>

          <motion.div
            className="mt-4 rounded-lg border border-dashed border-[#21262D] px-4 py-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <p className="text-xs text-[#8B949E]">
              <span className="font-semibold text-[#C9D1D9]">Upset Score</span>{" "}
              <code className="rounded bg-[#161B22] px-1.5 py-0.5 text-[#A855F7]">
                winner&apos;s sell tax - loser&apos;s sell tax
              </code>
              {" "}&mdash; in percentage points. Rank-6 beating rank-1 = 15% - 2% = 13 (GIANT KILLER).
            </p>
          </motion.div>
        </motion.section>

        <AnimatedDivider />

        {/* ============================================================ */}
        {/*  ANTI-WHALE PROTECTION                                        */}
        {/* ============================================================ */}
        <motion.section className="py-14" id="protection" {...sectionReveal}>
          <SectionLabel icon={Shield} label="Security" />
          <h2 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">
            Anti-Whale Protection
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#8B949E]">
            Multiple layers of safeguards prevent manipulation and protect
            smaller holders from being squeezed out.
          </p>

          <StaggerReveal className="mt-8 grid gap-2" staggerDelay={0.08} yOffset={12}>
            {[
              { title: "Asymmetric Curve", desc: "Buy price rises faster than sell price, making instant arbitrage unprofitable." },
              { title: "Progressive Tax", desc: "Hold time reduces tax: 12% at 0h, 8% at 6h, 5% at 12h, 3% at 24h+." },
              { title: "Max 1% Sell", desc: "No single sell can exceed 1% of total supply, preventing flash crashes." },
              { title: "Floor Price", desc: "20% of fees back a floor price. Tokens always retain baseline value." },
              { title: "Protection Pool", desc: "Dedicated pool absorbs sell pressure during high-volatility events." },
              { title: "Circuit Breaker", desc: "Trading pauses automatically if price moves more than 40% in 5 minutes." },
            ].map(({ title, desc }) => (
              <div
                key={title}
                className="flex gap-3 rounded-lg border border-[#21262D] bg-[#0D1117] px-4 py-3 transition-colors hover:border-[#30363D]"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E4002B]" />
                <p className="text-sm text-[#8B949E]">
                  <span className="font-semibold text-[#C9D1D9]">{title}</span>{" "}
                  &mdash; {desc}
                </p>
              </div>
            ))}
          </StaggerReveal>
        </motion.section>

        <AnimatedDivider />

        {/* ============================================================ */}
        {/*  PERFORMANCE REWARDS                                          */}
        {/* ============================================================ */}
        <motion.section className="py-14" id="rewards" {...sectionReveal}>
          <SectionLabel icon={Zap} label="Incentives" />
          <h2 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">
            Performance Rewards
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#8B949E]">
            After each match, 25% of collected fees distribute to holders
            proportional to their team&apos;s final ranking.
          </p>

          <div className="mt-8 overflow-hidden rounded-xl border border-[#21262D]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#21262D] bg-[#161B22]">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#484F58]">Position</th>
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#484F58]">Reward Share</th>
                  <th className="hidden px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#484F58] sm:table-cell">Payout Rank</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { pos: "1st", share: 35, color: "#3FB950", bar: 100 },
                  { pos: "2nd", share: 25, color: "#58A6FF", bar: 71 },
                  { pos: "3rd", share: 20, color: "#FDB913", bar: 57 },
                  { pos: "4th", share: 12, color: "#8B949E", bar: 34 },
                  { pos: "5th", share: 5, color: "#484F58", bar: 14 },
                  { pos: "6th", share: 3, color: "#484F58", bar: 9 },
                ].map(({ pos, share, color, bar }, idx) => (
                  <AnimatedRow
                    key={pos}
                    index={idx}
                    className="border-b border-[#21262D]/40 last:border-b-0 transition-colors hover:bg-[#161B22]/50"
                  >
                    <td className="px-5 py-3 text-sm font-bold text-[#E6EDF3]">{pos}</td>
                    <td className="px-5 py-3 font-mono text-sm font-bold" style={{ color }}>
                      <CountUp value={share} suffix="%" />
                    </td>
                    <td className="hidden px-5 py-3 sm:table-cell">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#21262D]">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: color, width: `${bar}%` }}
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: 0.3 + idx * 0.06, ease: "easeOut" }}
                        />
                      </div>
                    </td>
                  </AnimatedRow>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <AnimatedDivider />

        {/* ============================================================ */}
        {/*  SEASON LIFECYCLE                                              */}
        {/* ============================================================ */}
        <motion.section className="py-14" id="season" {...sectionReveal}>
          <SectionLabel icon={Clock} label="Lifecycle" />
          <h2 className="text-2xl font-bold tracking-tight text-[#E6EDF3]">
            Season Timeline
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#8B949E]">
            Each PSL season follows a fixed lifecycle from token launch to
            final settlement. Six stages, three weeks.
          </p>

          {/* Animated vertical timeline */}
          <div className="relative mt-10 ml-4">
            {/* Connecting line — draws as you scroll */}
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-px bg-[#21262D]"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ transformOrigin: "top" }}
            />

            <div className="space-y-6">
              {[
                { step: "01", title: "Token Launch", desc: "All 6 team tokens deployed. Initial price: 0.001 WIRE.", color: "#3FB950" },
                { step: "02", title: "Bonding Curve Active", desc: "Trading opens. Prices move with demand. Buy fees fill ecosystem pools.", color: "#58A6FF" },
                { step: "03", title: "League Stage", desc: "30 matches over 3 weeks. Sell taxes adjust after every match based on rankings.", color: "#FDB913" },
                { step: "04", title: "Playoffs", desc: "Top 4 teams qualify. Trading volume spikes. Upset Vault payouts intensify.", color: "#A855F7" },
                { step: "05", title: "Final", desc: "Winner-takes-all match. Maximum volatility. Giant Killer potential at its peak.", color: "#E4002B" },
                { step: "06", title: "Settlement", desc: "Grand Prize distributes. All tokens redeemable at final floor price.", color: "#3FB950" },
              ].map(({ step, title, desc, color }, idx) => (
                <motion.div
                  key={step}
                  className="relative flex items-start gap-5 pl-6"
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08, duration: 0.4, ease: "easeOut" }}
                >
                  {/* Dot on timeline */}
                  <span
                    className="absolute left-0 top-1 h-2.5 w-2.5 -translate-x-[4.5px] rounded-full border-2 border-[#0D1117]"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[10px] text-[#484F58]">{step}</span>
                      <p className="text-sm font-semibold text-[#E6EDF3]">{title}</p>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#8B949E]">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Grand Prize */}
          <motion.div
            className="mt-10 overflow-hidden rounded-xl border border-[#21262D] bg-[#161B22]"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="border-b border-[#21262D] px-5 py-3">
              <h3 className="text-sm font-semibold text-[#FDB913]">
                Season Grand Prize Distribution
              </h3>
            </div>
            <StaggerReveal className="grid grid-cols-2 gap-px bg-[#21262D] sm:grid-cols-4" staggerDelay={0.1} yOffset={14}>
              {[
                { place: "Champion", share: 50, color: "#3FB950" },
                { place: "Runner-up", share: 25, color: "#58A6FF" },
                { place: "3rd / 4th", share: 15, color: "#FDB913" },
                { place: "5th / 6th", share: 10, color: "#8B949E" },
              ].map(({ place, share, color }) => (
                <div key={place} className="bg-[#161B22] px-4 py-5 text-center">
                  <p className="text-2xl font-black tracking-tight" style={{ color }}>
                    <CountUp value={share} suffix="%" />
                  </p>
                  <p className="mt-1 text-[11px] text-[#484F58]">{place}</p>
                </div>
              ))}
            </StaggerReveal>
          </motion.div>
        </motion.section>

        <AnimatedDivider />

        {/* ============================================================ */}
        {/*  CTA                                                          */}
        {/* ============================================================ */}
        <motion.section className="py-16 text-center" {...sectionReveal}>
          <h2 className="text-2xl font-black tracking-tight text-[#E6EDF3]">
            Ready to Trade?
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#8B949E]">
            Pick a team, ride the bonding curve, and earn from upsets.
          </p>
          <motion.div
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#E4002B] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#C00025] hover:shadow-[0_0_20px_rgba(228,0,43,0.15)]"
            >
              View Markets
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 rounded-lg border border-[#21262D] bg-[#161B22] px-6 py-2.5 text-sm font-semibold text-[#C9D1D9] transition-colors hover:border-[#30363D] hover:text-white"
            >
              Explore Upset Vault
            </Link>
          </motion.div>

          {/* Bottom spacing before footer */}
          <div className="mt-12" />
        </motion.section>
      </div>
    </motion.div>
  );
}
