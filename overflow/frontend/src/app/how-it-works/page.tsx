"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Shield,
  Zap,
  Trophy,
  PieChart,
  Clock,
  Flame,
  ArrowRight,
  Lock,
  Layers,
  Target,
  CircuitBoard,
  Award,
  Calendar,
  Rocket,
  Flag,
  Medal,
  Star,
  Activity,
} from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Shared animation variants                                          */
/* ------------------------------------------------------------------ */

const sectionVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/* ------------------------------------------------------------------ */
/*  Reusable section wrapper                                           */
/* ------------------------------------------------------------------ */

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`mx-auto max-w-5xl px-4 py-16 sm:px-6 ${className}`}
    >
      {children}
    </motion.section>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  color = "#58A6FF",
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="mb-10">
      <div
        className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
        style={{
          borderColor: `${color}50`,
          backgroundColor: `${color}15`,
          color,
        }}
      >
        <Icon className="h-3 w-3" />
        {title}
      </div>
      {subtitle && (
        <p className="max-w-2xl text-sm leading-relaxed text-[#8B949E]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bonding Curve SVG                                                  */
/* ------------------------------------------------------------------ */

function BondingCurveSVG() {
  const points = 50;
  const maxSupply = 10;

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
      viewBox="0 0 340 220"
      className="w-full max-w-md"
      role="img"
      aria-label="Bonding curve visualization showing buy price rising steeper than sell price"
    >
      {/* Grid lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={`grid-${i}`}
          x1={40}
          y1={20 + i * 40}
          x2={300}
          y2={20 + i * 40}
          stroke="#30363D"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      ))}

      {/* Axes */}
      <line x1={40} y1={180} x2={300} y2={180} stroke="#30363D" strokeWidth={1} />
      <line x1={40} y1={20} x2={40} y2={180} stroke="#30363D" strokeWidth={1} />

      {/* Labels */}
      <text x={170} y={210} textAnchor="middle" className="fill-[#8B949E] text-[10px]">
        Supply
      </text>
      <text x={12} y={100} textAnchor="middle" className="fill-[#8B949E] text-[10px]" transform="rotate(-90, 12, 100)">
        Price
      </text>

      {/* Spread area between curves */}
      <polygon
        points={`${curvePoints(1.5).split(" ").join(" ")},${curvePoints(1.2).split(" ").reverse().join(" ")}`}
        fill="#E4002B"
        opacity={0.06}
      />

      {/* Buy curve (steeper) */}
      <motion.polyline
        points={curvePoints(1.5)}
        fill="none"
        stroke="#E4002B"
        strokeWidth={2.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* Sell curve (flatter) */}
      <motion.polyline
        points={curvePoints(1.2)}
        fill="none"
        stroke="#3FB950"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="6 3"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
      />

      {/* Legend */}
      <line x1={200} y1={30} x2={220} y2={30} stroke="#E4002B" strokeWidth={2.5} />
      <text x={225} y={34} className="fill-[#E6EDF3] text-[10px]">
        Buy (supply^1.5)
      </text>

      <line x1={200} y1={48} x2={220} y2={48} stroke="#3FB950" strokeWidth={2.5} strokeDasharray="6 3" />
      <text x={225} y={52} className="fill-[#E6EDF3] text-[10px]">
        Sell (supply^1.2)
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Fee Distribution Bar                                               */
/* ------------------------------------------------------------------ */

const feeSlices = [
  { label: "Platform Treasury", pct: 30, color: "#58A6FF" },
  { label: "Performance Rewards", pct: 25, color: "#3FB950" },
  { label: "Floor Price Backing", pct: 20, color: "#FDB913" },
  { label: "Upset Vault", pct: 15, color: "#A855F7" },
  { label: "Season Grand Prize", pct: 10, color: "#E4002B" },
];

function FeeDistributionBar() {
  return (
    <div>
      {/* Stacked bar */}
      <div className="flex h-8 overflow-hidden rounded-lg border border-[#30363D]">
        {feeSlices.map((slice, i) => (
          <motion.div
            key={slice.label}
            className="flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: slice.color, width: `${slice.pct}%` }}
            initial={{ width: 0 }}
            whileInView={{ width: `${slice.pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
          >
            {slice.pct >= 15 && `${slice.pct}%`}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {feeSlices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-xs text-[#8B949E]">
              {slice.label}{" "}
              <span className="font-semibold text-[#E6EDF3]">{slice.pct}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% -20%, #58A6FF12 0%, transparent 50%)",
            }}
          />
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

        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-20 text-center sm:px-6 sm:pt-28">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black leading-tight tracking-tight text-[#E6EDF3] sm:text-5xl lg:text-6xl"
          >
            How Overflow Works
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto mt-4 max-w-xl text-base text-[#8B949E] sm:text-lg"
          >
            From token purchase to upset payout &mdash; everything you need to know
          </motion.p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  BONDING CURVE                                                */}
      {/* ============================================================ */}
      <Section id="bonding-curve">
        <SectionTitle
          icon={TrendingUp}
          title="Asymmetric Bonding Curve"
          subtitle="The buy and sell prices follow different mathematical curves, creating a deliberate spread that discourages flipping and rewards conviction."
          color="#E4002B"
        />

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-6">
            <BondingCurveSVG />
          </div>

          <div className="flex flex-col justify-center space-y-5">
            <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
              <h3 className="text-sm font-bold text-[#E6EDF3]">Buy Price Formula</h3>
              <code className="mt-1.5 block text-xs text-[#E4002B]">
                price = 0.001 WIRE * supply ^ 1.5
              </code>
              <p className="mt-2 text-xs text-[#8B949E]">
                Rises steeply as more tokens are purchased. Early buyers get the best price.
              </p>
            </div>

            <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
              <h3 className="text-sm font-bold text-[#E6EDF3]">Sell Price Formula</h3>
              <code className="mt-1.5 block text-xs text-[#3FB950]">
                price = 0.001 WIRE * supply ^ 1.2
              </code>
              <p className="mt-2 text-xs text-[#8B949E]">
                Rises more gently. The gap between buy and sell is the spread.
              </p>
            </div>

            <div className="rounded-lg border border-[#FDB913]/30 bg-[#FDB913]/5 p-4">
              <p className="text-xs font-semibold text-[#FDB913]">
                Quick flips lose money. Holding rewards patience.
              </p>
              <p className="mt-1 text-xs text-[#8B949E]">
                Base price: 0.001 WIRE &middot; 2% buy fee on every purchase
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  DYNAMIC SELL TAX                                             */}
      {/* ============================================================ */}
      <Section id="sell-tax" className="border-t border-[#30363D]">
        <SectionTitle
          icon={Target}
          title="Performance-Linked Sell Tax"
          subtitle="Sell tax is tied to team ranking. Winning teams are cheap to exit. Losing teams cost more to abandon — rewarding those who hold through adversity."
          color="#3FB950"
        />

        <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363D] bg-[#0D1117]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">Ranking</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">Sell Tax</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {[
                { rank: 1, tax: "2.0%", meaning: "Best team, cheapest exit", color: "#3FB950" },
                { rank: 2, tax: "4.6%", meaning: "Strong contender", color: "#58A6FF" },
                { rank: 3, tax: "7.2%", meaning: "Mid table", color: "#58A6FF" },
                { rank: 4, tax: "9.8%", meaning: "Below average", color: "#FDB913" },
                { rank: 5, tax: "12.4%", meaning: "Struggling team", color: "#FDB913" },
                { rank: 6, tax: "15.0%", meaning: "Bottom, most expensive exit", color: "#E4002B" },
              ].map(({ rank, tax, meaning, color }) => (
                <tr key={rank} className="border-b border-[#30363D]/50 last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${color}20`, color }}>
                      {rank}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color }}>
                    {tax}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#8B949E]">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-[#30363D] bg-[#161B22] p-4">
          <p className="text-xs text-[#8B949E]">
            <span className="font-semibold text-[#E6EDF3]">Formula: </span>
            <code className="text-[#58A6FF]">sellTaxBps = 200 + (rank - 1) * 260</code>
            <span className="ml-2">&mdash; basis points, where 200 bps = 2%</span>
          </p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  FEE DISTRIBUTION                                             */}
      {/* ============================================================ */}
      <Section id="fees" className="border-t border-[#30363D]">
        <SectionTitle
          icon={PieChart}
          title="Where Your Fees Go"
          subtitle="Every fee collected is split into five distinct pools, each serving a different purpose in the Overflow ecosystem."
          color="#FDB913"
        />

        <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-6">
          <FeeDistributionBar />
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-6 grid gap-3 sm:grid-cols-5"
        >
          {feeSlices.map((slice) => (
            <motion.div
              key={slice.label}
              variants={cardVariants}
              className="rounded-lg border border-[#30363D] bg-[#161B22] p-3 text-center"
            >
              <p className="text-xl font-black" style={{ color: slice.color }}>
                {slice.pct}%
              </p>
              <p className="mt-1 text-[10px] font-medium text-[#8B949E] leading-tight">
                {slice.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/*  UPSET VAULT                                                  */}
      {/* ============================================================ */}
      <Section id="upset-vault" className="border-t border-[#30363D]">
        <SectionTitle
          icon={Flame}
          title="The Upset Vault"
          subtitle="When an underdog beats a favorite, the Upset Vault opens. The bigger the upset, the bigger the payout. Upset Score is calculated from the difference in sell taxes between the winner and loser."
          color="#A855F7"
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              tier: "Normal",
              range: "0 - 3",
              multiplier: "1x",
              release: "0%",
              color: "#8B949E",
              desc: "Expected result. No vault release.",
            },
            {
              tier: "Big Upset",
              range: "4 - 6",
              multiplier: "3x",
              release: "15%",
              color: "#3FB950",
              desc: "Meaningful surprise. 15% of the vault pays out.",
            },
            {
              tier: "Huge Upset",
              range: "7 - 9",
              multiplier: "5x",
              release: "30%",
              color: "#FDB913",
              desc: "Major shock. 30% of the vault is released.",
            },
            {
              tier: "GIANT KILLER",
              range: "10 - 13",
              multiplier: "10x",
              release: "60%",
              color: "#E4002B",
              desc: "The unthinkable. 60% of the vault pays out at 10x.",
            },
          ].map(({ tier, range, multiplier, release, color, desc }) => (
            <motion.div
              key={tier}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-xl border border-[#30363D] bg-[#161B22] p-5 transition-colors hover:border-opacity-70"
            >
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: color }}
              />
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color }}>
                {tier}
              </p>
              <p className="mt-3 text-3xl font-black text-[#E6EDF3]">{multiplier}</p>
              <p className="text-xs text-[#8B949E]">payout multiplier</p>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8B949E]">Upset Score</span>
                  <span className="font-mono font-semibold text-[#E6EDF3]">{range}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8B949E]">Vault Release</span>
                  <span className="font-bold" style={{ color }}>{release}</span>
                </div>
              </div>

              <p className="mt-4 text-[10px] leading-relaxed text-[#8B949E]">{desc}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-4 rounded-lg border border-[#30363D] bg-[#161B22] p-4">
          <p className="text-xs text-[#8B949E]">
            <span className="font-semibold text-[#E6EDF3]">Upset Score Formula: </span>
            <code className="text-[#A855F7]">upsetScore = winner&apos;s sell tax - loser&apos;s sell tax</code>
            <span className="ml-2">&mdash; in percentage points. A rank-6 team beating rank-1 = 15% - 2% = 13 (GIANT KILLER).</span>
          </p>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  ANTI-WHALE PROTECTION                                        */}
      {/* ============================================================ */}
      <Section id="protection" className="border-t border-[#30363D]">
        <SectionTitle
          icon={Shield}
          title="6 Layers of Protection"
          subtitle="Multiple safeguards prevent market manipulation and protect holders from whales and panic-sellers."
          color="#58A6FF"
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[
            {
              icon: TrendingUp,
              title: "Asymmetric Curve",
              desc: "Buy price rises faster than sell price, making instant arbitrage unprofitable.",
              color: "#E4002B",
            },
            {
              icon: Clock,
              title: "Progressive Tax",
              desc: "Hold time reduces tax: 12% at 0h, 8% at 6h, 5% at 12h, 3% at 24h+.",
              color: "#FDB913",
            },
            {
              icon: Lock,
              title: "Max 1% Sell",
              desc: "No single sell can exceed 1% of total supply, preventing flash crashes.",
              color: "#A855F7",
            },
            {
              icon: Layers,
              title: "Floor Price",
              desc: "20% of fees back a floor price. Tokens always retain baseline value.",
              color: "#3FB950",
            },
            {
              icon: Shield,
              title: "Protection Pool",
              desc: "Dedicated pool absorbs sell pressure during high-volatility events.",
              color: "#58A6FF",
            },
            {
              icon: CircuitBoard,
              title: "Circuit Breaker",
              desc: "Trading pauses automatically if price moves more than 40% in 5 minutes.",
              color: "#E4002B",
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <motion.div
              key={title}
              variants={cardVariants}
              className="rounded-xl border border-[#30363D] bg-[#161B22] p-5"
            >
              <div
                className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <h3 className="text-sm font-bold text-[#E6EDF3]">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#8B949E]">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </Section>

      {/* ============================================================ */}
      {/*  PERFORMANCE REWARDS                                          */}
      {/* ============================================================ */}
      <Section id="rewards" className="border-t border-[#30363D]">
        <SectionTitle
          icon={Award}
          title="Earn by Holding Winners"
          subtitle="After each match, 25% of collected fees are distributed to token holders based on their team's league ranking. Top-ranked holders earn the most."
          color="#3FB950"
        />

        <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363D] bg-[#0D1117]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">Position</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">Reward Share</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">Visual</th>
              </tr>
            </thead>
            <tbody>
              {[
                { pos: "1st", share: 35, color: "#3FB950", icon: Trophy },
                { pos: "2nd", share: 25, color: "#58A6FF", icon: Medal },
                { pos: "3rd", share: 20, color: "#FDB913", icon: Star },
                { pos: "4th", share: 12, color: "#8B949E", icon: Award },
                { pos: "5th", share: 5, color: "#8B949E", icon: Award },
                { pos: "6th", share: 3, color: "#8B949E", icon: Award },
              ].map(({ pos, share, color, icon: RowIcon }) => (
                <tr key={pos} className="border-b border-[#30363D]/50 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RowIcon className="h-3.5 w-3.5" style={{ color }} />
                      <span className="text-sm font-bold text-[#E6EDF3]">{pos}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-bold" style={{ color }}>
                    {share}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-full max-w-[200px] rounded-full bg-[#21262D] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(share / 35) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  SEASON LIFECYCLE                                              */}
      {/* ============================================================ */}
      <Section id="season" className="border-t border-[#30363D]">
        <SectionTitle
          icon={Calendar}
          title="Season Timeline"
          subtitle="Each PSL season follows a fixed lifecycle, from token launch to final settlement."
          color="#FDB913"
        />

        {/* Timeline steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-[#30363D] sm:left-1/2 sm:-translate-x-px" />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-6"
          >
            {[
              {
                step: "01",
                title: "Token Launch",
                desc: "All 6 team tokens are deployed. Initial price set at 0.001 WIRE via bonding curve.",
                icon: Rocket,
                color: "#3FB950",
              },
              {
                step: "02",
                title: "Bonding Curve Active",
                desc: "Trading opens. Prices move with demand. Buy fees start filling the ecosystem pools.",
                icon: TrendingUp,
                color: "#58A6FF",
              },
              {
                step: "03",
                title: "League Stage",
                desc: "30 matches over 3 weeks. Sell taxes adjust dynamically after every match based on rankings.",
                icon: Activity,
                color: "#FDB913",
              },
              {
                step: "04",
                title: "Playoffs",
                desc: "Top 4 teams qualify. Trading volume spikes. Upset Vault payouts intensify.",
                icon: Zap,
                color: "#A855F7",
              },
              {
                step: "05",
                title: "Final",
                desc: "Winner-takes-all match. Maximum volatility. Giant Killer potential at its peak.",
                icon: Flag,
                color: "#E4002B",
              },
              {
                step: "06",
                title: "Season Settlement",
                desc: "Grand Prize distributes. All tokens can be redeemed at final floor price. Season closes.",
                icon: Trophy,
                color: "#3FB950",
              },
            ].map(({ step, title, desc, icon: StepIcon, color }, i) => (
              <motion.div
                key={step}
                variants={cardVariants}
                className={`relative flex gap-5 sm:gap-0 ${
                  i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                }`}
              >
                {/* Dot on timeline */}
                <div className="absolute left-6 top-5 z-10 flex h-3 w-3 -translate-x-1/2 items-center justify-center sm:left-1/2">
                  <span
                    className="h-3 w-3 rounded-full border-2 border-[#0D1117]"
                    style={{ backgroundColor: color }}
                  />
                </div>

                {/* Spacer for timeline alignment on mobile */}
                <div className="w-12 shrink-0 sm:hidden" />

                {/* Content card */}
                <div className={`flex-1 sm:w-[calc(50%-2rem)] ${i % 2 === 0 ? "sm:pr-10" : "sm:pl-10"}`}>
                  <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <StepIcon className="h-4 w-4" style={{ color }} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                          Step {step}
                        </p>
                        <h3 className="text-sm font-bold text-[#E6EDF3]">{title}</h3>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-[#8B949E]">{desc}</p>
                  </div>
                </div>

                {/* Other half spacer */}
                <div className="hidden sm:block sm:w-[calc(50%-2rem)]" />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Grand Prize */}
        <div className="mt-12 rounded-xl border border-[#FDB913]/30 bg-[#FDB913]/5 p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#FDB913]">
            <Trophy className="h-4 w-4" />
            Season Grand Prize Distribution
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { place: "Champion", share: "50%", color: "#3FB950" },
              { place: "Runner-up", share: "25%", color: "#58A6FF" },
              { place: "3rd / 4th", share: "15%", color: "#FDB913" },
              { place: "5th / 6th", share: "10%", color: "#8B949E" },
            ].map(({ place, share, color }) => (
              <div key={place} className="rounded-lg border border-[#30363D] bg-[#161B22] p-4 text-center">
                <p className="text-2xl font-black" style={{ color }}>{share}</p>
                <p className="mt-1 text-xs text-[#8B949E]">{place}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  CTA                                                          */}
      {/* ============================================================ */}
      <section className="border-t border-[#30363D] bg-[#161B22]/30">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-black text-[#E6EDF3] sm:text-3xl">
              Ready to Trade?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#8B949E]">
              Pick a team, ride the bonding curve, and earn from upsets. The PSL 2026 season is live.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E4002B] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#E4002B]/20 transition-colors hover:bg-[#B8002A]"
              >
                View Markets
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/vault"
                className="inline-flex items-center gap-2 rounded-xl border border-[#30363D] px-6 py-3 text-sm font-semibold text-[#E6EDF3] transition-colors hover:border-[#8B949E]"
              >
                <Flame className="h-4 w-4 text-[#A855F7]" />
                Explore Upset Vault
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
