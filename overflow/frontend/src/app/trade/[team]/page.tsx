"use client";

import { use, useState, useEffect, useMemo } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Info,
} from "lucide-react";
import { BuySellPanel } from "@/components/BuySellPanel";

const TradingChart = dynamic(
  () => import("@/components/TradingChart").then((m) => ({ default: m.TradingChart })),
  {
    ssr: false,
    loading: () => <div className="flex h-[380px] items-center justify-center" role="status"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#21262D] border-t-[#9CA3AF]" /><span className="sr-only">Loading...</span></div>,
  },
);
const AIAnalysis = dynamic(
  () => import("@/components/AIAnalysis").then((m) => ({ default: m.AIAnalysis })),
  { ssr: false },
);
import { CountUp } from "@/components/motion/CountUp";
import {
  PSL_TEAMS,
  CANDLESTICK_DATA,
  RECENT_TRADES,
  ORDER_BOOKS,
} from "@/lib/mockData";
import { api } from "@/lib/api";
import { mapApiTeamToFrontend } from "@/lib/teamMapper";
import type { PSLTeam, CandlestickData, TradeOrder } from "@/types";
import {
  cn,
  formatPrice,
  formatPercent,
  formatNumber,
  formatTimeAgo,
} from "@/lib/utils";
import { TeamLogo } from "@/components/TeamLogo";
import { NumberTicker } from "@/components/ui/number-ticker";
import { GlitchPrice } from "@/components/effects/GlitchPrice";
import { StaggerReveal } from "@/components/motion/StaggerReveal";

const Spotlight = dynamic(
  () => import("@/components/ui/spotlight").then((m) => ({ default: m.Spotlight })),
  { ssr: false },
);

interface PageProps {
  params: Promise<{ team: string }>;
}

function OrderBookTable({
  title,
  entries,
  side,
}: {
  title: string;
  entries: { price: number; amount: number; total: number }[];
  side: "bid" | "ask";
}) {
  return (
    <div>
      <h4 className="mb-1.5 text-[10px] text-[#768390] uppercase tracking-wider">
        {title}
      </h4>
      <StaggerReveal staggerDelay={0.04} yOffset={8} duration={0.3}>
        {entries.slice(0, 6).map((entry, i) => (
          <div
            key={`${entry.price}-${entry.amount}-${i}`}
            className="relative flex items-center justify-between py-[2px] text-xs"
          >
            <div
              className="absolute right-0 h-full"
              style={{
                width: `${Math.min((entry.total / 500) * 100, 100)}%`,
                backgroundColor:
                  side === "bid" ? "rgba(63,185,80,0.06)" : "rgba(248,81,73,0.06)",
              }}
            />
            <span
              className={cn(
                "relative z-10 font-mono tabular-nums font-medium",
                side === "bid" ? "text-[#3FB950]" : "text-[#F85149]"
              )}
            >
              <span className="text-[10px] mr-0.5" aria-hidden="true">{side === "bid" ? "\u2191" : "\u2193"}</span>
              ${formatPrice(entry.price)}
            </span>
            <span className="relative z-10 font-mono tabular-nums text-[#9CA3AF]">
              {formatNumber(entry.amount)}
            </span>
          </div>
        ))}
      </StaggerReveal>
    </div>
  );
}

/** Color for a sell tax value on the 2%-15% spectrum. */
function sellTaxColor(tax: number): string {
  const t = Math.min(Math.max((tax - 2) / 13, 0), 1);
  if (t <= 0.46) {
    const p = t / 0.46;
    const r = Math.round(63 + p * (253 - 63));
    const g = Math.round(185 + p * (185 - 185));
    const b = Math.round(80 - p * 61);
    return `rgb(${r},${g},${b})`;
  }
  const p = (t - 0.46) / 0.54;
  const r = Math.round(253 - p * 5);
  const g = Math.round(185 - p * 104);
  const b = Math.round(19 + p * 54);
  return `rgb(${r},${g},${b})`;
}

function SellTaxExplainer({ team }: { team: PSLTeam }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const taxPercent = team.sellTax;
  const taxColor = sellTaxColor(taxPercent);

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9CA3AF]">Sell Tax</span>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              className="text-[#768390] hover:text-[#9CA3AF] transition-colors"
              aria-label="Sell tax info"
            >
              <Info className="h-3 w-3" />
            </button>
            {showTooltip && (
              <div className="absolute left-0 top-6 z-50 w-48 rounded-lg border border-[#21262D] bg-[#161B22] p-2.5 shadow-xl">
                <p className="text-[10px] leading-relaxed text-[#9CA3AF]">
                  Rank 1 = 2%, Rank 8 = 15%. Better form = lower exit cost.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-lg font-black font-mono tabular-nums"
            style={{ color: taxColor }}
          >
            {taxPercent}%
          </span>
          <span className="text-[10px] text-[#768390]">#{team.ranking} of 8</span>
        </div>
      </div>
    </div>
  );
}

export default function TradePage({ params }: PageProps) {
  const { team: teamSlug } = use(params);
  const teamId = teamSlug.toUpperCase();

  // Start with mock data as default
  const mockTeam = PSL_TEAMS.find((t) => t.id === teamId);
  const [team, setTeam] = useState<PSLTeam | null>(mockTeam || null);
  const [chartData, setChartData] = useState<CandlestickData[]>(CANDLESTICK_DATA[teamId] || []);
  const [recentTrades, setRecentTrades] = useState<TradeOrder[]>(RECENT_TRADES[teamId] || []);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("24h");
  const [chartLoading, setChartLoading] = useState(false);

  // Fetch team data on mount (team info only — price history handled by the timeframe effect)
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const t = await api.teams.getBySymbol(teamId, controller.signal);
        if (cancelled || !t) return;
        setTeam(mapApiTeamToFrontend(t));
      } catch {
        // Team fetch failed — mock data already set in useState
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [teamId]);

  // Fetch chart data whenever teamId or timeframe changes
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setChartLoading(true);

    (async () => {
      try {
        const priceData = await api.teams.getPriceHistory(teamId, timeframe, controller.signal);
        if (cancelled) return;

        if (priceData && priceData.length > 0) {
          const mapped = priceData.map((p) => ({
            time: typeof p.time === "number"
              ? p.time
              : Math.floor(new Date((p as typeof p & { timestamp?: string }).timestamp ?? 0).getTime() / 1000),
            open: p.open,
            high: p.high,
            low: p.low,
            close: p.close,
            volume: p.volume,
          }));
          setChartData(mapped);
        } else {
          // Fall back to mock data when API returns empty
          setChartData(CANDLESTICK_DATA[teamId] || []);
        }
      } catch {
        if (!cancelled) {
          setChartData(CANDLESTICK_DATA[teamId] || []);
        }
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [teamId, timeframe]);

  if (!team) notFound();

  const prefersReduced = useReducedMotion();
  const orderBook = ORDER_BOOKS[teamId];
  const isPositive = team.change24h >= 0;

  // Compute real 24h high/low from chart data instead of fake multipliers
  const { high24h, low24h } = useMemo(() => {
    if (chartData.length === 0) return { high24h: null, low24h: null };
    return {
      high24h: Math.max(...chartData.map((c) => c.high)),
      low24h: Math.min(...chartData.map((c) => c.low)),
    };
  }, [chartData]);

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="min-h-screen bg-[#0D1117]"
    >
      {/* Header */}
      <div className="border-b border-[#21262D] bg-[#161B22]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <Link
                  href="/"
                  className="flex items-center gap-1 shrink-0 p-2 text-xs text-[#9CA3AF] hover:text-[#E6EDF3] transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
                <TeamLogo teamId={team.id} color={team.color} size={28} />
                <h1 className="text-sm font-medium text-[#9CA3AF]">{team.name}</h1>
                <span className="text-xs text-[#768390]">{team.symbol}</span>
              </div>
              <div className="flex items-baseline gap-3 pl-10 sm:pl-[52px]">
                <GlitchPrice value={`$${formatPrice(team.price)}`} className="text-3xl sm:text-4xl md:text-5xl font-black tabular-nums text-[#E6EDF3]" />
                <span
                  className={cn(
                    "text-base sm:text-lg font-semibold tabular-nums",
                    isPositive ? "text-[#3FB950]" : "text-[#F85149]"
                  )}
                >
                  {isPositive ? "+" : ""}{formatPercent(team.change24h)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="border-b border-[#21262D]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Mobile: 2-column grid */}
          <div className="grid grid-cols-2 gap-2 py-2.5 text-xs font-mono sm:hidden">
            {[
              { label: "High", value: high24h !== null ? <CountUp value={high24h} prefix="$" decimals={4} duration={1} /> : <span className="text-[#768390]">--</span>, color: "#3FB950" },
              { label: "Low", value: low24h !== null ? <CountUp value={low24h} prefix="$" decimals={4} duration={1} /> : <span className="text-[#768390]">--</span>, color: "#F85149" },
              { label: "Volume", value: <CountUp value={team.volume24h} prefix="$" decimals={0} duration={1.2} />, color: "#E6EDF3" },
              { label: "Mkt Cap", value: <CountUp value={team.marketCap} prefix="$" decimals={0} duration={1.2} />, color: "#E6EDF3" },
              { label: "Buy Tax", value: <CountUp value={team.buyTax} suffix="%" decimals={1} duration={0.8} />, color: "#3FB950" },
              { label: "Sell Tax", value: <CountUp value={team.sellTax} suffix="%" decimals={1} duration={0.8} />, color: "#F85149" },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-2 py-1 rounded-md bg-[#161B22]">
                <span className="text-[#768390]">{label} </span>
                <span className="font-semibold tabular-nums" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
          {/* Desktop: horizontal flex with dividers */}
          <div className="hidden sm:flex items-center divide-x divide-[#21262D] py-2.5 text-xs font-mono">
            {[
              { label: "High", value: high24h !== null ? <CountUp value={high24h} prefix="$" decimals={4} duration={1} /> : <span className="text-[#768390]">--</span>, color: "#3FB950" },
              { label: "Low", value: low24h !== null ? <CountUp value={low24h} prefix="$" decimals={4} duration={1} /> : <span className="text-[#768390]">--</span>, color: "#F85149" },
              { label: "Volume", value: <CountUp value={team.volume24h} prefix="$" decimals={0} duration={1.2} />, color: "#E6EDF3" },
              { label: "Mkt Cap", value: <CountUp value={team.marketCap} prefix="$" decimals={0} duration={1.2} />, color: "#E6EDF3" },
              { label: "Buy Tax", value: <CountUp value={team.buyTax} suffix="%" decimals={1} duration={0.8} />, color: "#3FB950" },
              { label: "Sell Tax", value: <CountUp value={team.sellTax} suffix="%" decimals={1} duration={0.8} />, color: "#F85149" },
            ].map(({ label, value, color }) => (
              <div key={label} className="shrink-0 px-4 first:pl-0">
                <span className="text-[#768390]">{label} </span>
                <span className="font-semibold tabular-nums" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative overflow-hidden mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Spotlight className="-top-40 left-0 md:left-40 md:-top-20" fill="white" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left column: chart + order book */}
          <div className="space-y-6">
            {/* Chart */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#768390]">
                    {team.symbol} / WIRE
                  </span>
                  <span className="text-[10px] text-[#768390]">
                    {timeframe === "1h" ? "1m" : timeframe === "24h" ? "5m" : "1h"}
                  </span>
                </div>
                <div className="flex items-center gap-1" role="radiogroup" aria-label="Chart timeframe">
                  {(["1h", "24h", "7d"] as const).map((tf) => (
                    <button
                      key={tf}
                      aria-pressed={timeframe === tf}
                      onClick={() => setTimeframe(tf)}
                      className={cn(
                        "rounded px-2.5 py-1 min-h-[44px] sm:min-h-0 text-xs font-medium transition-colors",
                        timeframe === tf
                          ? "bg-[#21262D] text-[#E6EDF3]"
                          : "text-[#768390] hover:text-[#9CA3AF]"
                      )}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                {loading ? (
                  <div className="flex h-[380px] items-center justify-center" role="status">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#21262D] border-t-[#9CA3AF]" />
                    <span className="sr-only">Loading...</span>
                  </div>
                ) : (
                  <>
                    {chartLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0D1117]/60" role="status">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#21262D] border-t-[#9CA3AF]" />
                        <span className="sr-only">Loading...</span>
                      </div>
                    )}
                    <TradingChart data={chartData} teamColor={team.color} height={380} teamSymbol={team.symbol} />
                  </>
                )}
              </div>
            </div>

            {/* Order book + Recent trades */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Order book */}
              <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
                <div className="mb-2 flex items-center">
                  <span className="text-xs font-semibold text-[#E6EDF3]">Order Book</span>
                  <span className="ml-2 text-[10px] text-[#768390] border border-[#21262D] rounded px-1">Demo</span>
                </div>
                <div className="space-y-3">
                  <OrderBookTable title="Asks" entries={orderBook.asks} side="ask" />
                  <div className="py-1.5 text-center border-y border-[#21262D]">
                    <span className="text-sm font-bold font-mono tabular-nums text-[#E6EDF3]">
                      ${formatPrice(team.price)}
                    </span>
                    <span className="ml-2 text-[10px] text-[#768390]">spread</span>
                  </div>
                  <OrderBookTable title="Bids" entries={orderBook.bids} side="bid" />
                </div>
              </div>

              {/* Recent trades */}
              <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
                <div className="mb-2 flex items-center">
                  <span className="text-xs font-semibold text-[#E6EDF3]">Recent Trades</span>
                  <span className="ml-2 text-[10px] text-[#768390] border border-[#21262D] rounded px-1">Demo</span>
                </div>
                <div className="space-y-0">
                  <div className="mb-2 grid grid-cols-3 text-[10px] text-[#768390] uppercase tracking-wider">
                    <span>Price</span>
                    <span className="text-center">Amt</span>
                    <span className="text-right">Time</span>
                  </div>
                  {recentTrades.slice(0, 12).map((trade, tradeIdx) => (
                    <div
                      key={trade.id}
                      className="grid grid-cols-3 items-center py-[3px] text-xs"
                    >
                      <span
                        className={cn(
                          "font-mono tabular-nums font-medium",
                          trade.side === "buy"
                            ? "text-[#3FB950]"
                            : "text-[#F85149]"
                        )}
                      >
                        <span className="text-[10px] mr-0.5 font-sans" aria-hidden="true">{trade.side === "buy" ? "B" : "S"}</span>
                        ${formatPrice(trade.price)}
                      </span>
                      <span className="text-center font-mono tabular-nums text-[#9CA3AF]">
                        {formatNumber(trade.amount)}
                      </span>
                      <span className="text-right text-[#768390]">
                        {formatTimeAgo(trade.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column: buy/sell + team stats */}
          <div className="space-y-6">
            {/* Buy/sell panel */}
            <BuySellPanel team={team} />

            {/* Team stats */}
            <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
              {/* Win/loss bar */}
              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-[#3FB950]">{team.wins}W</span>
                  <span className="text-[#768390]">
                    {team.wins + team.losses} played
                  </span>
                  <span className="text-[#F85149]">{team.losses}L</span>
                </div>
                {(() => {
                  const totalPlayed = team.wins + team.losses;
                  const winPct = totalPlayed > 0 ? (team.wins / totalPlayed) * 100 : 50;
                  const lossPct = totalPlayed > 0 ? (team.losses / totalPlayed) * 100 : 50;
                  return (
                    <div className="flex h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-[#3FB950] transition-all"
                        style={{ width: `${winPct}%` }}
                      />
                      <div
                        className="bg-[#F85149]"
                        style={{ width: `${lossPct}%` }}
                      />
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-0 divide-y divide-[#21262D]">
                {[
                  { label: "Ranking", value: `#${team.ranking}` },
                  {
                    label: "NRR",
                    value: team.nrr > 0 ? `+${team.nrr.toFixed(3)}` : team.nrr.toFixed(3),
                    color: team.nrr >= 0 ? "#3FB950" : "#F85149",
                  },
                  { label: "Performance", value: `${team.performanceScore}/100` },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-2.5 first:pt-0"
                  >
                    <span className="text-xs text-[#9CA3AF]">{label}</span>
                    <span
                      className="text-xs font-bold font-mono tabular-nums"
                      style={{ color: color || "#E6EDF3" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Analysis */}
            <AIAnalysis
              teamA={team.id}
              teamB={team.id === "IU" ? "LQ" : "IU"}
              matchContext="T20 — PSL 2026"
            />

            {/* Sell tax — simplified */}
            <SellTaxExplainer team={team} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
