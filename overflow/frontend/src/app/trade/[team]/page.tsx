"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ExternalLink,
  Info,
  TrendingUp,
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
} from "@/lib/mockData";
import { api, type TradeRecord } from "@/lib/api";
import { mapApiTeamToFrontend } from "@/lib/teamMapper";
import type { PSLTeam, CandlestickData } from "@/types";
import {
  cn,
  formatPrice,
  formatPercent,
  formatNumber,
} from "@/lib/utils";
import { TeamLogo } from "@/components/TeamLogo";
import { GlitchPrice } from "@/components/effects/GlitchPrice";

const Spotlight = dynamic(
  () => import("@/components/ui/spotlight").then((m) => ({ default: m.Spotlight })),
  { ssr: false },
);

interface PageProps {
  params: Promise<{ team: string }>;
}

/** Format a trade timestamp (ISO string) to a short relative or absolute time. */
function formatTradeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Truncate a tx hash: 0x1234...abcd */
function truncateHash(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/** Bonding Curve info card showing buy/sell prices, spread, and supply. */
function BondingCurveCard({ team }: { team: PSLTeam }) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Derive buy and sell prices from the team's price and tax rates
  const buyPrice = team.price * (1 + team.buyTax / 100);
  const sellPrice = team.price * (1 - team.sellTax / 100);
  const spread = buyPrice > 0 ? ((buyPrice - sellPrice) / buyPrice) * 100 : 0;
  const totalSupply = team.marketCap > 0 && team.price > 0 ? team.marketCap / team.price : 0;

  // Price indicator: position of current price within 0..buyPrice range
  const indicatorPct = buyPrice > 0
    ? Math.min(Math.max((team.price / buyPrice) * 100, 5), 95)
    : 50;

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-[#9CA3AF]" />
        <span className="text-xs font-semibold text-[#E6EDF3]">Bonding Curve</span>
        <div className="relative">
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            className="text-[#768390] hover:text-[#9CA3AF] transition-colors"
            aria-label="Bonding curve info"
          >
            <Info className="h-3 w-3" />
          </button>
          {showTooltip && (
            <div className="absolute left-0 top-6 z-50 w-56 rounded-lg border border-[#21262D] bg-[#161B22] p-2.5 shadow-xl">
              <p className="text-[10px] leading-relaxed text-[#9CA3AF]">
                Prices are determined by the bonding curve. Buy pressure increases price, sell pressure decreases it. There are no limit orders.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Buy / Sell prices */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg bg-[#0D1117] px-3 py-2">
          <span className="text-[10px] text-[#768390] uppercase tracking-wider">Buy Price</span>
          <p className="text-sm font-bold font-mono tabular-nums text-[#3FB950]">
            ${formatPrice(buyPrice)}
          </p>
        </div>
        <div className="rounded-lg bg-[#0D1117] px-3 py-2">
          <span className="text-[10px] text-[#768390] uppercase tracking-wider">Sell Price</span>
          <p className="text-sm font-bold font-mono tabular-nums text-[#F85149]">
            ${formatPrice(sellPrice)}
          </p>
        </div>
      </div>

      {/* Spread + Supply */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div>
          <span className="text-[#768390]">Spread </span>
          <span className="font-mono tabular-nums text-[#E6EDF3] font-medium">
            {spread.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-[#768390]">Supply </span>
          <span className="font-mono tabular-nums text-[#E6EDF3] font-medium">
            {formatNumber(totalSupply)}
          </span>
        </div>
      </div>

      {/* Visual price indicator bar */}
      <div className="relative h-2 rounded-full bg-[#0D1117] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${indicatorPct}%`,
            background: "linear-gradient(90deg, #F85149 0%, #3FB950 100%)",
            opacity: 0.6,
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#E6EDF3] border-2 border-[#161B22] shadow"
          style={{ left: `${indicatorPct}%`, transform: `translate(-50%, -50%)` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-[#768390]">
        <span>Sell</span>
        <span>Buy</span>
      </div>
    </div>
  );
}

/** Real recent trades fetched from the API. */
function RecentTradesFeed({ teamSymbol }: { teamSymbol: string }) {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTrades = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await api.trades.getRecentByTeam(teamSymbol, 20, signal);
      setTrades(data);
      setError(false);
    } catch (err) {
      if (signal?.aborted) return;
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [teamSymbol]);

  // Initial fetch + 15s polling
  useEffect(() => {
    const controller = new AbortController();
    fetchTrades(controller.signal);

    const interval = setInterval(() => {
      fetchTrades();
    }, 15_000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchTrades]);

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-[#E6EDF3]">Recent Trades</span>
        <span className="text-[10px] text-[#768390]">auto-refresh</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8" role="status">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#21262D] border-t-[#9CA3AF]" />
          <span className="sr-only">Loading trades...</span>
        </div>
      ) : error ? (
        <p className="py-6 text-center text-xs text-[#768390]">
          Failed to load trades
        </p>
      ) : trades.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#768390]">
          No trades yet &mdash; be the first!
        </p>
      ) : (
        <div>
          {/* Column headers */}
          <div className="mb-1.5 grid grid-cols-[auto_1fr_1fr_1fr] gap-2 text-[10px] text-[#768390] uppercase tracking-wider">
            <span>Side</span>
            <span>Price</span>
            <span className="text-center">Amount</span>
            <span className="text-right">Time</span>
          </div>
          <div className="space-y-0">
            {trades.slice(0, 15).map((trade) => {
              const isBuy = trade.side === "buy";
              return (
                <div
                  key={trade.id}
                  className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center py-[3px] text-xs group"
                >
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase w-6",
                      isBuy ? "text-[#3FB950]" : "text-[#F85149]"
                    )}
                  >
                    {isBuy ? "BUY" : "SELL"}
                  </span>
                  <span
                    className={cn(
                      "font-mono tabular-nums font-medium",
                      isBuy ? "text-[#3FB950]" : "text-[#F85149]"
                    )}
                  >
                    ${formatPrice(trade.price)}
                  </span>
                  <span className="text-center font-mono tabular-nums text-[#9CA3AF]">
                    {formatNumber(trade.amount)}
                  </span>
                  <span className="text-right text-[#768390] flex items-center justify-end gap-1">
                    <span>{formatTradeTime(trade.timestamp)}</span>
                    {trade.txHash && (
                      <a
                        href={`https://wirefluidscan.com/tx/${trade.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden group-hover:inline-flex text-[#768390] hover:text-[#E6EDF3] transition-colors"
                        aria-label={`View transaction ${truncateHash(trade.txHash)}`}
                        title={trade.txHash}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
          {/* Left column: chart + bonding curve + trades */}
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

            {/* Bonding curve + Recent trades */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <BondingCurveCard team={team} />
              <RecentTradesFeed teamSymbol={team.symbol} />
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
