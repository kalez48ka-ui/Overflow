"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { useAccount } from "wagmi";
import { PositionCard } from "@/components/PositionCard";
import { RewardsPanel } from "@/components/RewardsPanel";
import { SafeConnectButton } from "@/components/WalletProvider";
import { CountUp } from "@/components/motion/CountUp";
import {
  USER_POSITIONS,
  USER_REWARDS,
  USER_TRANSACTIONS,
  PSL_TEAMS,
} from "@/lib/mockData";
import { api } from "@/lib/api";
import type { Position, Transaction } from "@/types";
import type { TradeRecord } from "@/lib/api";
import {
  cn,
  formatCurrency,
  formatPercent,
  formatPrice,
  formatTimeAgo,
  shortenAddress,
} from "@/lib/utils";
import Link from "next/link";
import dynamic from "next/dynamic";
import { NumberTicker } from "@/components/ui/number-ticker";
import { GlitchPrice } from "@/components/effects/GlitchPrice";
import { StaggerReveal } from "@/components/motion/StaggerReveal";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const CardSpotlight = dynamic(
  () => import("@/components/ui/card-spotlight").then((m) => ({ default: m.CardSpotlight })),
  { ssr: false },
);

const Spotlight = dynamic(
  () => import("@/components/ui/spotlight").then((m) => ({ default: m.Spotlight })),
  { ssr: false },
);

/** Map an API TradeRecord to the local Transaction shape used by the UI. */
function tradeRecordToTransaction(tr: TradeRecord): Transaction {
  return {
    id: tr.id,
    type: tr.side as Transaction["type"],
    teamSymbol: tr.teamSymbol.startsWith("$") ? tr.teamSymbol : `$${tr.teamSymbol}`,
    amount: tr.amount,
    price: tr.price,
    total: tr.total,
    timestamp: new Date(tr.timestamp).getTime(),
    txHash: tr.txHash,
    status: "confirmed",
  };
}

const TYPE_ICON_MAP = {
  buy: <ArrowUpRight className="h-4 w-4 text-[#3FB950]" />,
  sell: <ArrowDownRight className="h-4 w-4 text-[#F85149]" />,
  claim: <Star className="h-4 w-4 text-[#FDB913]" />,
};

const TYPE_COLOR_MAP: Record<string, string> = {
  buy: "text-[#3FB950]",
  sell: "text-[#F85149]",
  claim: "text-[#FDB913]",
};

const STATUS_BADGE_MAP: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  confirmed: {
    label: "Confirmed",
    cls: "bg-[#3FB950]/15 text-[#3FB950]",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  pending: {
    label: "Pending",
    cls: "bg-[#FDB913]/15 text-[#FDB913]",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  failed: {
    label: "Failed",
    cls: "bg-[#F85149]/15 text-[#F85149]",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function TransactionRow({
  tx,
  index,
}: {
  tx: Transaction;
  index: number;
}) {
  const badge = STATUS_BADGE_MAP[tx.status] ?? STATUS_BADGE_MAP.confirmed;
  const team = PSL_TEAMS.find((t) => t.symbol === tx.teamSymbol);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index < 20 ? index * 0.04 : 0 }}
      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
    >
      {/* Type icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#21262D]">
        {TYPE_ICON_MAP[tx.type]}
      </div>

      {/* Team + timestamp */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold uppercase", TYPE_COLOR_MAP[tx.type])}>
            {tx.type}
          </span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              backgroundColor: team ? `${team.color}20` : "#21262D",
              color: team?.color ?? "#9CA3AF",
            }}
          >
            {tx.teamSymbol}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#9CA3AF]">
          <span>{formatTimeAgo(tx.timestamp)}</span>
          <span className="text-[#8B949E]">|</span>
          <a
            href={`https://wirefluidscan.com/tx/${tx.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 hover:text-[#58A6FF] transition-colors"
          >
            {shortenAddress(tx.txHash)}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      {/* Amount + price */}
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold font-mono tabular-nums text-[#E6EDF3]">
          {formatCurrency(tx.total)}
        </p>
        <p className="text-[10px] font-mono tabular-nums text-[#8B949E]">
          {tx.amount.toLocaleString()} @ ${formatPrice(tx.price)}
        </p>
      </div>

      {/* Status badge */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          badge.cls,
        )}
      >
        {badge.icon}
        <span className="hidden sm:inline">{badge.label}</span>
      </div>
    </motion.div>
  );
}

export default function PortfolioPage() {
  const prefersReduced = useReducedMotion();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");
  const [positions, setPositions] = useState<Position[]>(USER_POSITIONS);
  const [transactions, setTransactions] = useState<Transaction[]>(USER_TRANSACTIONS);
  const [txLoading, setTxLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      // No wallet connected — use mock data
      setPositions(USER_POSITIONS);
      setTransactions(USER_TRANSACTIONS);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await api.portfolio.get(address, controller.signal);
        if (!cancelled && data && data.positions) {
          if (data.positions.length > 0) {
            // Map API PortfolioPosition to local Position type
            const mapped: Position[] = data.positions.map((p) => {
              const mock = PSL_TEAMS.find(
                (t) => t.symbol === p.teamSymbol || t.symbol === `$${p.teamSymbol}`
              );
              return {
                teamId: p.teamSymbol.replace("$", ""),
                teamName: p.teamName,
                symbol: p.teamSymbol.startsWith("$") ? p.teamSymbol : `$${p.teamSymbol}`,
                color: mock?.color || "#E4002B",
                amount: p.amount,
                avgBuyPrice: p.avgBuyPrice,
                currentPrice: p.currentPrice,
                pnlPercent: p.pnlPercent,
                unrealizedPnl: p.pnl,
                value: p.value,
              };
            });
            setPositions(mapped);
          } else {
            // API returned empty — wallet has no positions
            setPositions([]);
          }
        }
      } catch {
        // API failed — keep mock data
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [address, isConnected]);

  // Fetch trade history when wallet is connected and history tab is active
  useEffect(() => {
    if (!isConnected || !address) {
      setTransactions(USER_TRANSACTIONS);
      return;
    }
    if (activeTab !== "history") return;

    const controller = new AbortController();
    let cancelled = false;
    setTxLoading(true);

    (async () => {
      try {
        const records = await api.trades.getByWallet(address, controller.signal);
        if (!cancelled && records && records.length > 0) {
          setTransactions(records.map(tradeRecordToTransaction));
        } else if (!cancelled) {
          // API returned empty — fall back to mock
          setTransactions(USER_TRANSACTIONS);
        }
      } catch {
        // API failed — keep mock data
        if (!cancelled) setTransactions(USER_TRANSACTIONS);
      } finally {
        if (!cancelled) setTxLoading(false);
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, [address, isConnected, activeTab]);

  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const costBasis = totalValue - totalPnl;
  const totalPnlPercent = costBasis > 0 ? (totalPnl / costBasis) * 100 : 0;
  const totalClaimable = USER_REWARDS.filter((r) => r.claimable).reduce(
    (sum, r) => sum + r.amount,
    0
  );

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="relative min-h-screen overflow-hidden bg-[#0D1117]"
    >
      <h1 className="sr-only">Portfolio</h1>
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Wallet className="h-12 w-12 text-[#8B949E] mb-4" />
          <h2 className="text-lg font-bold text-[#E6EDF3] mb-2">Connect Your Wallet</h2>
          <p className="text-sm text-[#9CA3AF] mb-6 text-center max-w-md">
            Connect your wallet to view your portfolio, positions, and trading history.
          </p>
          <SafeConnectButton />
        </div>
      ) : (
        <>
      {/* Header — portfolio value is the hero */}
      <div className="border-b border-[#21262D] bg-[#161B22]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <p className="text-[10px] text-[#8B949E] uppercase tracking-wider mb-1">Total Value</p>
          <div className="min-h-[80px] flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
            <p className="text-3xl sm:text-4xl md:text-5xl font-black font-mono tabular-nums text-[#E6EDF3]">
              $<NumberTicker value={totalValue} decimals={2} duration={800} showArrow={false} />
            </p>
            <span
              className={cn(
                totalPnl >= 0 ? "text-[#3FB950]" : "text-[#F85149]"
              )}
            >
              <GlitchPrice
                value={`${totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl)} (${formatPercent(totalPnlPercent)})`}
                className="text-sm font-bold tabular-nums"
              />
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#21262D] border-t-[#9CA3AF]" />
            <span className="ml-3 text-sm text-[#9CA3AF]">Loading portfolio...</span>
            <span className="sr-only">Loading...</span>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div className="mb-6 border-b border-[#21262D]">
              <div className="flex items-center divide-x divide-[#21262D] overflow-x-auto py-2.5 text-xs font-mono scrollbar-none">
                <div className="shrink-0 pr-5">
                  <span className="text-[#8B949E]">P&L </span>
                  <span className="font-semibold tabular-nums" style={{ color: totalPnl >= 0 ? "#3FB950" : "#F85149" }}>
                    {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
                  </span>
                </div>
                <div className="shrink-0 px-5">
                  <span className="text-[#8B949E]">Rewards </span>
                  <span className="font-semibold tabular-nums text-[#FDB913]">{totalClaimable.toFixed(2)} WIRE</span>
                </div>
                <div className="shrink-0 px-5">
                  <span className="text-[#8B949E]">Positions </span>
                  <span className="font-semibold tabular-nums text-[#E6EDF3]">{positions.length}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
              {/* Main content */}
              <div className="space-y-4">
                {/* Tab switcher */}
                <div className="flex border-b border-[#21262D]" role="tablist" aria-label="Portfolio sections">
                  {(["positions", "history"] as const).map((tab) => (
                    <button
                      key={tab}
                      role="tab"
                      id={`portfolio-tab-${tab}`}
                      aria-selected={activeTab === tab}
                      aria-controls={`portfolio-tabpanel-${tab}`}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "relative min-h-[44px] pb-3 pr-6 text-sm font-semibold capitalize transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58A6FF]/50",
                        activeTab === tab
                          ? "text-[#E6EDF3]"
                          : "text-[#9CA3AF] hover:text-[#E6EDF3]"
                      )}
                    >
                      {tab}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="portfolio-tab"
                          className="absolute bottom-0 left-0 right-6 h-0.5 bg-[#58A6FF]"
                        />
                      )}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                {activeTab === "positions" && (
                  <motion.div
                    key="positions"
                    role="tabpanel"
                    id="portfolio-tabpanel-positions"
                    aria-labelledby="portfolio-tab-positions"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <StaggerReveal staggerDelay={0.08} yOffset={16}>
                    {positions.map((position, i) => (
                      <CardSpotlight
                        key={position.teamId}
                        className="rounded-xl"
                        color={position.color.replace("#", "").match(/../g)?.map(h => parseInt(h, 16)).join(", ") || "255, 255, 255"}
                        opacity={0.06}
                      >
                        <PositionCard
                          position={position}
                          index={i}
                          onTrade={(teamId) => {
                            router.push(`/trade/${teamId.toLowerCase()}`);
                          }}
                        />
                      </CardSpotlight>
                    ))}
                    </StaggerReveal>
                    {positions.length === 0 && (
                      <div className="rounded-xl border border-[#21262D] bg-[#161B22] py-16 text-center">
                        <p className="text-sm text-[#9CA3AF]">No open positions</p>
                        <Link
                          href="/"
                          className="mt-4 inline-block rounded-lg bg-[#21262D] px-4 py-2 text-sm font-medium text-[#E6EDF3] hover:bg-[#21262D]/80 transition-colors"
                        >
                          Browse Teams
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "history" && (
                  <motion.div
                    key="history"
                    role="tabpanel"
                    id="portfolio-tabpanel-history"
                    aria-labelledby="portfolio-tab-history"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                  <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
                    {txLoading ? (
                      <div className="flex items-center justify-center py-8" role="status">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#21262D] border-t-[#9CA3AF]" />
                        <span className="ml-3 text-sm text-[#9CA3AF]">Loading history...</span>
                        <span className="sr-only">Loading...</span>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="py-16 text-center">
                        <p className="text-sm text-[#9CA3AF]">
                          No transactions yet. Start trading to see your history.
                        </p>
                        <Link
                          href="/"
                          className="mt-4 inline-block rounded-lg bg-[#21262D] px-4 py-2 text-sm font-medium text-[#E6EDF3] hover:bg-[#21262D]/80 transition-colors"
                        >
                          Browse Teams
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#21262D]">
                        {transactions.map((tx, i) => (
                          <TransactionRow key={tx.id} tx={tx} index={i} />
                        ))}
                      </div>
                    )}
                  </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Allocation list — replaces decorative pie chart */}
                <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
                  <div className="space-y-0 divide-y divide-[#21262D]">
                    {positions.map((pos) => {
                      const pct = totalValue > 0 ? (pos.value / totalValue) * 100 : 0;
                      return (
                        <div
                          key={pos.teamId}
                          className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: pos.color }}
                            />
                            <span className="text-xs text-[#9CA3AF]">{pos.symbol}</span>
                            <span className="text-[10px] font-mono tabular-nums text-[#8B949E]">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold font-mono tabular-nums text-[#E6EDF3]">
                              {formatCurrency(pos.value)}
                            </span>
                            <span
                              className={cn(
                                "ml-2 text-xs font-mono tabular-nums",
                                pos.pnlPercent >= 0 ? "text-[#3FB950]" : "text-[#F85149]"
                              )}
                            >
                              {formatPercent(pos.pnlPercent)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rewards */}
                <RewardsPanel rewards={USER_REWARDS} />
              </div>
            </div>
          </>
        )}
      </div>
        </>
      )}
    </motion.div>
  );
}
