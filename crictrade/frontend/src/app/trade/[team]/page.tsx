"use client";

import { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Trophy,
  Activity,
  BarChart2,
} from "lucide-react";
import { TradingChart } from "@/components/TradingChart";
import { BuySellPanel } from "@/components/BuySellPanel";
import { AIAnalysis } from "@/components/AIAnalysis";
import {
  PSL_TEAMS,
  CANDLESTICK_DATA,
  RECENT_TRADES,
  ORDER_BOOKS,
} from "@/lib/mockData";
import { api } from "@/lib/api";
import type { PSLTeam, CandlestickData, TradeOrder } from "@/types";
import {
  cn,
  formatPrice,
  formatPercent,
  formatCurrency,
  formatNumber,
  formatTimeAgo,
} from "@/lib/utils";

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
      <h4 className="mb-2 text-xs font-semibold text-[#8B949E] uppercase tracking-wider">
        {title}
      </h4>
      <div className="space-y-0.5">
        {entries.slice(0, 6).map((entry, i) => (
          <div key={i} className="relative flex items-center justify-between text-xs">
            <div
              className="absolute right-0 h-full rounded"
              style={{
                width: `${Math.min((entry.total / 500) * 100, 100)}%`,
                backgroundColor:
                  side === "bid" ? "rgba(63,185,80,0.08)" : "rgba(248,81,73,0.08)",
              }}
            />
            <span
              className={cn(
                "relative z-10 font-mono font-medium",
                side === "bid" ? "text-[#3FB950]" : "text-[#F85149]"
              )}
            >
              ${formatPrice(entry.price)}
            </span>
            <span className="relative z-10 text-[#8B949E]">
              {formatNumber(entry.amount)}
            </span>
          </div>
        ))}
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Fetch team data and price history in parallel
      const [teamResult, priceResult] = await Promise.allSettled([
        api.teams.getBySymbol(teamId),
        api.teams.getPriceHistory(teamId),
      ]);

      if (cancelled) return;

      // Update team data if API succeeded
      if (teamResult.status === "fulfilled" && teamResult.value) {
        const t = teamResult.value;
        // Backend may return `currentPrice` and `priceChange24h` — handle both field shapes
        const apiPrice = (t as typeof t & { currentPrice?: number }).currentPrice ?? t.price;
        const apiChange = (t as typeof t & { priceChange24h?: number }).priceChange24h ?? t.change24h;
        const mock = PSL_TEAMS.find(
          (m) => m.id === t.symbol?.replace("$", "") || m.symbol === t.symbol
        );
        setTeam({
          id: t.symbol?.replace("$", "") || t.id,
          name: t.name,
          symbol: t.symbol.startsWith("$") ? t.symbol : `$${t.symbol}`,
          color: mock?.color || "#58A6FF",
          secondaryColor: mock?.secondaryColor || "#1C1C1C",
          price: apiPrice,
          change24h: apiChange,
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
        });
      }

      // Update price history if API succeeded
      // Backend returns { open, high, low, close, volume, timestamp } — map to CandlestickData shape
      if (priceResult.status === "fulfilled" && priceResult.value && priceResult.value.length > 0) {
        const mapped = priceResult.value.map((p) => ({
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
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [teamId]);

  if (!team) notFound();

  const orderBook = ORDER_BOOKS[teamId];
  const isPositive = team.change24h >= 0;

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Header */}
      <div className="border-b border-[#30363D] bg-[#161B22]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Markets
              </Link>
              <div className="h-4 w-px bg-[#30363D]" />
              <div className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: team.color }}
                >
                  {team.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#E6EDF3]">{team.symbol}</span>
                    <span className="text-xs text-[#8B949E]">{team.name}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price display */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xl font-bold tabular-nums text-[#E6EDF3]">
                  ${formatPrice(team.price)}
                </p>
                <div
                  className={cn(
                    "flex items-center justify-end gap-1 text-sm font-medium",
                    isPositive ? "text-[#3FB950]" : "text-[#F85149]"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {formatPercent(team.change24h)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 24h stats bar */}
      <div className="border-b border-[#30363D] bg-[#0D1117]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-6 overflow-x-auto py-2 text-xs">
            {[
              { label: "24h High", value: `$${formatPrice(team.price * 1.08)}`, color: "#3FB950" },
              { label: "24h Low", value: `$${formatPrice(team.price * 0.91)}`, color: "#F85149" },
              { label: "24h Volume", value: formatCurrency(team.volume24h) },
              { label: "Market Cap", value: formatCurrency(team.marketCap) },
              { label: "Buy Tax", value: `${team.buyTax}%`, color: "#3FB950" },
              { label: "Sell Tax", value: `${team.sellTax}%`, color: "#F85149" },
            ].map(({ label, value, color }) => (
              <div key={label} className="shrink-0">
                <span className="text-[#8B949E]">{label}: </span>
                <span
                  className="font-semibold"
                  style={{ color: color || "#E6EDF3" }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          {/* Left column: chart + order book */}
          <div className="space-y-4">
            {/* Chart */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-[#30363D] px-4 py-3">
                <BarChart2 className="h-4 w-4 text-[#8B949E]" />
                <span className="text-sm font-medium text-[#E6EDF3]">
                  {team.symbol} / WIRE
                </span>
                <span className="text-xs text-[#8B949E]">5m candles</span>
              </div>
              <div className="p-2">
                {loading ? (
                  <div className="flex h-[360px] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#30363D] border-t-[#58A6FF]" />
                  </div>
                ) : (
                  <TradingChart data={chartData} teamColor={team.color} height={360} />
                )}
              </div>
            </motion.div>

            {/* Order book + Recent trades */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Order book */}
              <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#E6EDF3]">Order Book</h3>
                <div className="space-y-4">
                  <OrderBookTable title="Asks (Sell)" entries={orderBook.asks} side="ask" />
                  <div className="rounded-lg bg-[#0D1117] px-3 py-2 text-center">
                    <span className="text-sm font-bold tabular-nums text-[#E6EDF3]">
                      ${formatPrice(team.price)}
                    </span>
                    <span className="ml-2 text-xs text-[#8B949E]">Spread</span>
                  </div>
                  <OrderBookTable title="Bids (Buy)" entries={orderBook.bids} side="bid" />
                </div>
              </div>

              {/* Recent trades */}
              <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
                <h3 className="mb-3 text-sm font-semibold text-[#E6EDF3]">Recent Trades</h3>
                <div className="space-y-1">
                  <div className="mb-2 grid grid-cols-3 text-[10px] text-[#8B949E] uppercase tracking-wider">
                    <span>Price</span>
                    <span className="text-center">Amount</span>
                    <span className="text-right">Time</span>
                  </div>
                  {recentTrades.slice(0, 12).map((trade) => (
                    <div
                      key={trade.id}
                      className="grid grid-cols-3 items-center text-xs"
                    >
                      <span
                        className={cn(
                          "font-mono font-medium",
                          trade.side === "buy"
                            ? "text-[#3FB950]"
                            : "text-[#F85149]"
                        )}
                      >
                        ${formatPrice(trade.price)}
                      </span>
                      <span className="text-center text-[#8B949E]">
                        {formatNumber(trade.amount)}
                      </span>
                      <span className="text-right text-[#8B949E]">
                        {formatTimeAgo(trade.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column: buy/sell + team stats */}
          <div className="space-y-4">
            {/* Buy/sell panel */}
            <BuySellPanel team={team} />

            {/* Team stats */}
            <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4" style={{ color: team.color }} />
                <h3 className="text-sm font-semibold text-[#E6EDF3]">Team Stats</h3>
              </div>

              {/* Win/loss bar */}
              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-[#3FB950]">{team.wins}W</span>
                  <span className="text-[#8B949E]">
                    {team.wins + team.losses} played
                  </span>
                  <span className="text-[#F85149]">{team.losses}L</span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-[#3FB950] transition-all"
                    style={{
                      width: `${(team.wins / (team.wins + team.losses)) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-[#F85149]"
                    style={{
                      width: `${(team.losses / (team.wins + team.losses)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {[
                  {
                    label: "Tournament Ranking",
                    value: `#${team.ranking}`,
                    icon: Trophy,
                  },
                  {
                    label: "Net Run Rate",
                    value: team.nrr > 0 ? `+${team.nrr.toFixed(3)}` : team.nrr.toFixed(3),
                    color: team.nrr >= 0 ? "#3FB950" : "#F85149",
                    icon: Activity,
                  },
                  {
                    label: "Performance Score",
                    value: `${team.performanceScore}/100`,
                    icon: BarChart2,
                  },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-lg bg-[#0D1117] px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-[#8B949E]" />
                      <span className="text-xs text-[#8B949E]">{label}</span>
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: color || "#E6EDF3" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Performance score bar */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-[#8B949E]">Performance Score</span>
                  <span className="font-bold text-[#E6EDF3]">
                    {team.performanceScore}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#21262D]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: team.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${team.performanceScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <AIAnalysis
              teamA={team.id}
              teamB={team.id === "IU" ? "LQ" : "IU"}
              matchContext="T20 — PSL 2026"
            />

            {/* Sell tax explainer */}
            <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#E6EDF3]">
                Dynamic Sell Tax
              </h3>
              <p className="text-xs text-[#8B949E] leading-relaxed">
                Sell tax is inversely proportional to team performance. When{" "}
                {team.name} performs well, the sell tax decreases — rewarding
                holders who believe in the team. Poor performance increases the
                tax to stabilize the token.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { perf: "High (80+)", tax: "2-4%", color: "#3FB950" },
                  { perf: "Medium (50-80)", tax: "4-6%", color: "#FDB913" },
                  { perf: "Low (<50)", tax: "7-10%", color: "#F85149" },
                ].map(({ perf, tax, color }) => (
                  <div
                    key={perf}
                    className="rounded-lg border border-[#30363D] bg-[#0D1117] p-2"
                  >
                    <p className="text-[9px] text-[#8B949E]">{perf}</p>
                    <p className="text-xs font-bold" style={{ color }}>
                      {tax}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
