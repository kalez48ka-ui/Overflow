"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Shield,
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
  Zap,
  Flag,
  Activity,
} from "lucide-react";
import Link from "next/link";

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
          stroke="#21262D"
          strokeWidth={0.5}
          strokeDasharray="4 4"
        />
      ))}

      {/* Axes */}
      <line x1={40} y1={180} x2={300} y2={180} stroke="#21262D" strokeWidth={1} />
      <line x1={40} y1={20} x2={40} y2={180} stroke="#21262D" strokeWidth={1} />

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
/*  Fee Distribution Data                                              */
/* ------------------------------------------------------------------ */

const feeSlices = [
  { label: "Platform Treasury", pct: 30, color: "#58A6FF" },
  { label: "Performance Rewards", pct: 25, color: "#3FB950" },
  { label: "Floor Price Backing", pct: 20, color: "#FDB913" },
  { label: "Upset Vault", pct: 15, color: "#A855F7" },
  { label: "Season Grand Prize", pct: 10, color: "#E4002B" },
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
      <div className="border-b border-[#21262D]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="text-3xl font-black text-[#E6EDF3] sm:text-4xl">
            How Overflow Works
          </h1>
          <p className="mt-2 text-sm text-[#8B949E]">
            From token purchase to upset payout &mdash; everything you need to know.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* ============================================================ */}
        {/*  BONDING CURVE                                                */}
        {/* ============================================================ */}
        <section className="py-10" id="bonding-curve">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">
            Asymmetric Bonding Curve
          </h2>
          <p className="mt-1 text-sm text-[#8B949E]">
            Buy and sell prices follow different curves. The spread discourages flipping and rewards conviction.
          </p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-5">
              <BondingCurveSVG />
            </div>

            <div className="flex flex-col justify-center space-y-4">
              <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-4">
                <h3 className="text-sm font-semibold text-[#E6EDF3]">Buy Price</h3>
                <code className="mt-1 block text-xs text-[#E4002B]">
                  price = 0.001 WIRE * supply ^ 1.5
                </code>
                <p className="mt-1.5 text-xs text-[#8B949E]">
                  Rises steeply as more tokens are purchased. Early buyers get the best price.
                </p>
              </div>

              <div className="rounded-lg border border-[#21262D] bg-[#161B22] p-4">
                <h3 className="text-sm font-semibold text-[#E6EDF3]">Sell Price</h3>
                <code className="mt-1 block text-xs text-[#3FB950]">
                  price = 0.001 WIRE * supply ^ 1.2
                </code>
                <p className="mt-1.5 text-xs text-[#8B949E]">
                  Rises more gently. The gap between buy and sell is the spread.
                </p>
              </div>

              <p className="text-xs text-[#8B949E]">
                <span className="font-semibold text-[#FDB913]">Quick flips lose money.</span>{" "}
                Base price: 0.001 WIRE. 2% buy fee on every purchase.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-[#21262D]" />

        {/* ============================================================ */}
        {/*  DYNAMIC SELL TAX                                             */}
        {/* ============================================================ */}
        <section className="py-10" id="sell-tax">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">
            Performance-Linked Sell Tax
          </h2>
          <p className="mt-1 text-sm text-[#8B949E]">
            Sell tax is tied to team ranking. Winning teams are cheap to exit. Losing teams cost more to abandon.
          </p>

          <div className="mt-6 overflow-hidden rounded-lg border border-[#21262D]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#21262D] bg-[#161B22]">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#8B949E]">Ranking</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#8B949E]">Sell Tax</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#8B949E]">Meaning</th>
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
                  <tr
                    key={rank}
                    className="border-b border-[#21262D]/50 last:border-b-0"
                  >
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-bold text-[#E6EDF3]">#{rank}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-sm font-bold" style={{ color }}>
                      {tax}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#8B949E]">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-[#8B949E]">
            <span className="font-semibold text-[#E6EDF3]">Formula:</span>{" "}
            <code className="text-[#58A6FF]">sellTaxBps = 200 + (rank - 1) * 260</code>
            {" "}&mdash; basis points, where 200 bps = 2%.
          </p>
        </section>

        <div className="border-t border-[#21262D]" />

        {/* ============================================================ */}
        {/*  FEE DISTRIBUTION                                             */}
        {/* ============================================================ */}
        <section className="py-10" id="fees">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">
            Where Your Fees Go
          </h2>
          <p className="mt-1 text-sm text-[#8B949E]">
            Every fee collected splits into five pools.
          </p>

          {/* Simple horizontal bar */}
          <div className="mt-6 flex h-3 overflow-hidden rounded-full border border-[#21262D]">
            {feeSlices.map((slice) => (
              <div
                key={slice.label}
                style={{ backgroundColor: slice.color, width: `${slice.pct}%` }}
              />
            ))}
          </div>

          {/* Legend as simple table */}
          <div className="mt-4 overflow-hidden rounded-lg border border-[#21262D]">
            <table className="w-full text-sm">
              <tbody>
                {feeSlices.map((slice) => (
                  <tr key={slice.label} className="border-b border-[#21262D]/50 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span className="text-xs text-[#E6EDF3]">{slice.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-bold" style={{ color: slice.color }}>
                      {slice.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="border-t border-[#21262D]" />

        {/* ============================================================ */}
        {/*  UPSET VAULT                                                  */}
        {/* ============================================================ */}
        <section className="py-10" id="upset-vault">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">
            The Upset Vault
          </h2>
          <p className="mt-1 text-sm text-[#8B949E]">
            When an underdog beats a favorite, the vault opens. Bigger upset = bigger payout.
          </p>

          <div className="mt-6 overflow-hidden rounded-lg border border-[#21262D]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#21262D] bg-[#161B22]">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#8B949E]">Tier</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#8B949E]">Upset Score</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#8B949E]">Multiplier</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#8B949E]">Vault Release</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tier: "Normal", range: "0 - 3", multiplier: "1x", release: "0%", color: "#8B949E" },
                  { tier: "Big Upset", range: "4 - 6", multiplier: "3x", release: "15%", color: "#3FB950" },
                  { tier: "Huge Upset", range: "7 - 9", multiplier: "5x", release: "30%", color: "#FDB913" },
                  { tier: "GIANT KILLER", range: "10 - 13", multiplier: "10x", release: "60%", color: "#E4002B" },
                ].map(({ tier, range, multiplier, release, color }) => (
                  <tr key={tier} className="border-b border-[#21262D]/50 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-bold" style={{ color }}>{tier}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#E6EDF3]">{range}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-[#E6EDF3]">{multiplier}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold" style={{ color }}>{release}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-[#8B949E]">
            <span className="font-semibold text-[#E6EDF3]">Upset Score:</span>{" "}
            <code className="text-[#A855F7]">winner&apos;s sell tax - loser&apos;s sell tax</code>
            {" "}&mdash; in percentage points. Rank-6 beating rank-1 = 15% - 2% = 13 (GIANT KILLER).
          </p>
        </section>

        <div className="border-t border-[#21262D]" />

        {/* ============================================================ */}
        {/*  ANTI-WHALE PROTECTION                                        */}
        {/* ============================================================ */}
        <section className="py-10" id="protection">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">
            Anti-Whale Protection
          </h2>
          <p className="mt-1 text-sm text-[#8B949E]">
            Multiple safeguards prevent manipulation and protect holders.
          </p>

          <ul className="mt-4 space-y-3 text-sm text-[#8B949E]">
            <li>
              <span className="font-semibold text-[#E6EDF3]">Asymmetric Curve</span>{" "}
              &mdash; Buy price rises faster than sell price, making instant arbitrage unprofitable.
            </li>
            <li>
              <span className="font-semibold text-[#E6EDF3]">Progressive Tax</span>{" "}
              &mdash; Hold time reduces tax: 12% at 0h, 8% at 6h, 5% at 12h, 3% at 24h+.
            </li>
            <li>
              <span className="font-semibold text-[#E6EDF3]">Max 1% Sell</span>{" "}
              &mdash; No single sell can exceed 1% of total supply, preventing flash crashes.
            </li>
            <li>
              <span className="font-semibold text-[#E6EDF3]">Floor Price</span>{" "}
              &mdash; 20% of fees back a floor price. Tokens always retain baseline value.
            </li>
            <li>
              <span className="font-semibold text-[#E6EDF3]">Protection Pool</span>{" "}
              &mdash; Dedicated pool absorbs sell pressure during high-volatility events.
            </li>
            <li>
              <span className="font-semibold text-[#E6EDF3]">Circuit Breaker</span>{" "}
              &mdash; Trading pauses automatically if price moves more than 40% in 5 minutes.
            </li>
          </ul>
        </section>

        <div className="border-t border-[#21262D]" />

        {/* ============================================================ */}
        {/*  PERFORMANCE REWARDS                                          */}
        {/* ============================================================ */}
        <section className="py-10" id="rewards">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">
            Performance Rewards
          </h2>
          <p className="mt-1 text-sm text-[#8B949E]">
            After each match, 25% of collected fees distribute to holders based on team ranking.
          </p>

          <div className="mt-6 overflow-hidden rounded-lg border border-[#21262D]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#21262D] bg-[#161B22]">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#8B949E]">Position</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#8B949E]">Reward Share</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { pos: "1st", share: "35%", color: "#3FB950" },
                  { pos: "2nd", share: "25%", color: "#58A6FF" },
                  { pos: "3rd", share: "20%", color: "#FDB913" },
                  { pos: "4th", share: "12%", color: "#8B949E" },
                  { pos: "5th", share: "5%", color: "#8B949E" },
                  { pos: "6th", share: "3%", color: "#8B949E" },
                ].map(({ pos, share, color }) => (
                  <tr key={pos} className="border-b border-[#21262D]/50 last:border-b-0">
                    <td className="px-4 py-2.5 text-sm font-bold text-[#E6EDF3]">{pos}</td>
                    <td className="px-4 py-2.5 font-mono text-sm font-bold" style={{ color }}>{share}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="border-t border-[#21262D]" />

        {/* ============================================================ */}
        {/*  SEASON LIFECYCLE                                              */}
        {/* ============================================================ */}
        <section className="py-10" id="season">
          <h2 className="text-lg font-semibold text-[#E6EDF3]">
            Season Timeline
          </h2>
          <p className="mt-1 text-sm text-[#8B949E]">
            Each PSL season follows a fixed lifecycle from token launch to final settlement.
          </p>

          {/* Simple vertical timeline */}
          <div className="relative mt-6 ml-3">
            {/* Connecting line */}
            <div className="absolute left-0 top-1 bottom-1 w-px bg-[#21262D]" />

            <div className="space-y-5">
              {[
                { step: "01", title: "Token Launch", desc: "All 6 team tokens deployed. Initial price: 0.001 WIRE.", color: "#3FB950" },
                { step: "02", title: "Bonding Curve Active", desc: "Trading opens. Prices move with demand. Buy fees fill ecosystem pools.", color: "#58A6FF" },
                { step: "03", title: "League Stage", desc: "30 matches over 3 weeks. Sell taxes adjust after every match based on rankings.", color: "#FDB913" },
                { step: "04", title: "Playoffs", desc: "Top 4 teams qualify. Trading volume spikes. Upset Vault payouts intensify.", color: "#A855F7" },
                { step: "05", title: "Final", desc: "Winner-takes-all match. Maximum volatility. Giant Killer potential at its peak.", color: "#E4002B" },
                { step: "06", title: "Settlement", desc: "Grand Prize distributes. All tokens redeemable at final floor price.", color: "#3FB950" },
              ].map(({ step, title, desc, color }) => (
                <div key={step} className="relative flex items-start gap-4 pl-5">
                  {/* Dot */}
                  <span
                    className="absolute left-0 top-1.5 h-2 w-2 -translate-x-[3px] rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#E6EDF3]">{title}</p>
                    <p className="mt-0.5 text-xs text-[#8B949E]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Prize */}
          <div className="mt-8 rounded-lg border border-[#21262D] bg-[#161B22] p-4">
            <h3 className="text-sm font-semibold text-[#FDB913]">
              Season Grand Prize Distribution
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { place: "Champion", share: "50%", color: "#3FB950" },
                { place: "Runner-up", share: "25%", color: "#58A6FF" },
                { place: "3rd / 4th", share: "15%", color: "#FDB913" },
                { place: "5th / 6th", share: "10%", color: "#8B949E" },
              ].map(({ place, share, color }) => (
                <div key={place} className="text-center">
                  <p className="text-xl font-black" style={{ color }}>{share}</p>
                  <p className="mt-0.5 text-xs text-[#8B949E]">{place}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="border-t border-[#21262D]" />

        {/* ============================================================ */}
        {/*  CTA                                                          */}
        {/* ============================================================ */}
        <section className="py-10 text-center">
          <h2 className="text-xl font-black text-[#E6EDF3]">
            Ready to Trade?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#8B949E]">
            Pick a team, ride the bonding curve, and earn from upsets.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#E4002B] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B8002A]"
            >
              View Markets
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 rounded-lg border border-[#21262D] px-5 py-2.5 text-sm font-semibold text-[#E6EDF3] transition-colors hover:border-[#8B949E]"
            >
              Explore Upset Vault
            </Link>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
