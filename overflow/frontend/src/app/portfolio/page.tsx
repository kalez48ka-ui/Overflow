"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  ExternalLink,
} from "lucide-react";
import { useAccount } from "wagmi";
import { PositionCard } from "@/components/PositionCard";
import { RewardsPanel } from "@/components/RewardsPanel";
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
  formatTimestamp,
  formatTimeAgo,
  shortenAddress,
} from "@/lib/utils";
import Link from "next/link";

const CHART_COLORS = ["#E4002B", "#00529B", "#FDB913", "#00A651", "#00A6DC", "#6A0DAD"];

function PortfolioPieChart({ positions }: { positions: Position[] }) {
  const data = positions.map((p) => ({
    name: p.symbol,
    value: p.value,
    color: p.color,
  }));

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: { name: string; value: number; payload: { color: string } }[];
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="rounded-lg border border-[#30363D] bg-[#161B22] px-3 py-2">
          <p className="text-xs font-bold" style={{ color: item.payload.color }}>
            {item.name}
          </p>
          <p className="text-sm font-bold text-[#E6EDF3]">
            {formatCurrency(item.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => (
            <span className="text-xs text-[#8B949E]">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

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
      transition={{ delay: index * 0.04 }}
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
              backgroundColor: team ? `${team.color}20` : "#30363D",
              color: team?.color ?? "#8B949E",
            }}
          >
            {tx.teamSymbol}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#8B949E]">
          <span>{formatTimeAgo(tx.timestamp)}</span>
          <span className="text-[#30363D]">|</span>
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
        <p className="text-xs font-semibold text-[#E6EDF3]">
          {formatCurrency(tx.total)}
        </p>
        <p className="text-[10px] text-[#8B949E]">
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

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const data = await api.portfolio.get(address);
        if (!cancelled && data && data.positions && data.positions.length > 0) {
          // Map API PortfolioPosition to local Position type
          const mapped: Position[] = data.positions.map((p) => {
            const mock = PSL_TEAMS.find(
              (t) => t.symbol === p.teamSymbol || t.symbol === `$${p.teamSymbol}`
            );
            return {
              teamId: p.teamSymbol.replace("$", ""),
              teamName: p.teamName,
              symbol: p.teamSymbol.startsWith("$") ? p.teamSymbol : `$${p.teamSymbol}`,
              color: mock?.color || CHART_COLORS[0],
              amount: p.amount,
              avgBuyPrice: p.avgBuyPrice,
              currentPrice: p.currentPrice,
              pnlPercent: p.pnlPercent,
              unrealizedPnl: p.pnl,
              value: p.value,
            };
          });
          setPositions(mapped);
        }
      } catch {
        // API failed — keep mock data
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [address, isConnected]);

  // Fetch trade history when wallet is connected and history tab is active
  useEffect(() => {
    if (!isConnected || !address) {
      setTransactions(USER_TRANSACTIONS);
      return;
    }
    if (activeTab !== "history") return;

    let cancelled = false;
    setTxLoading(true);

    (async () => {
      try {
        const records = await api.trades.getByWallet(address);
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

    return () => { cancelled = true; };
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
    <div className="min-h-screen bg-[#0D1117]">
      {/* Header */}
      <div className="border-b border-[#30363D] bg-[#161B22]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-[#58A6FF]" />
            <h1 className="text-xl font-bold text-[#E6EDF3]">Portfolio</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#30363D] border-t-[#58A6FF]" />
            <span className="ml-3 text-sm text-[#8B949E]">Loading portfolio...</span>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: "Total Value",
                  value: formatCurrency(totalValue),
                  icon: Briefcase,
                  color: "#58A6FF",
                },
                {
                  label: "Unrealized P&L",
                  value: `${totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl)}`,
                  sub: formatPercent(totalPnlPercent),
                  icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
                  color: totalPnl >= 0 ? "#3FB950" : "#F85149",
                },
                {
                  label: "Claimable Rewards",
                  value: `${totalClaimable.toFixed(2)} WIRE`,
                  icon: CheckCircle,
                  color: "#FDB913",
                },
                {
                  label: "Open Positions",
                  value: positions.length.toString(),
                  icon: Briefcase,
                  color: "#8B949E",
                },
              ].map(({ label, value, sub, icon: Icon, color }) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[#30363D] bg-[#161B22] p-4"
                >
                  <div className="mb-2 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                    <span className="text-xs text-[#8B949E]">{label}</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color }}>
                    {value}
                  </p>
                  {sub && <p className="text-xs text-[#8B949E]">{sub}</p>}
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
              {/* Main content */}
              <div className="space-y-4">
                {/* Tab switcher */}
                <div className="flex border-b border-[#30363D]">
                  {(["positions", "history"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "relative pb-3 pr-6 text-sm font-semibold capitalize transition-colors",
                        activeTab === tab
                          ? "text-[#E6EDF3]"
                          : "text-[#8B949E] hover:text-[#E6EDF3]"
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

                {activeTab === "positions" && (
                  <div className="space-y-3">
                    {positions.map((position, i) => (
                      <PositionCard
                        key={position.teamId}
                        position={position}
                        index={i}
                        onTrade={(teamId) => {
                          router.push(`/trade/${teamId.toLowerCase()}`);
                        }}
                      />
                    ))}
                    {positions.length === 0 && (
                      <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-12 text-center">
                        <Briefcase className="mx-auto h-10 w-10 text-[#30363D]" />
                        <p className="mt-3 text-sm text-[#8B949E]">No open positions</p>
                        <Link
                          href="/"
                          className="mt-4 inline-block rounded-lg bg-[#21262D] px-4 py-2 text-sm font-medium text-[#E6EDF3] hover:bg-[#30363D] transition-colors"
                        >
                          Browse Teams
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
                    {txLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#30363D] border-t-[#58A6FF]" />
                        <span className="ml-3 text-sm text-[#8B949E]">Loading history...</span>
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="py-12 text-center">
                        <Clock className="mx-auto h-10 w-10 text-[#30363D]" />
                        <p className="mt-3 text-sm text-[#8B949E]">
                          No transactions yet. Start trading to see your history.
                        </p>
                        <Link
                          href="/"
                          className="mt-4 inline-block rounded-lg bg-[#21262D] px-4 py-2 text-sm font-medium text-[#E6EDF3] hover:bg-[#30363D] transition-colors"
                        >
                          Browse Teams
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#30363D]">
                        {transactions.map((tx, i) => (
                          <TransactionRow key={tx.id} tx={tx} index={i} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-4">
                {/* Pie chart */}
                <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
                  <h3 className="mb-3 text-sm font-semibold text-[#E6EDF3]">
                    Allocation
                  </h3>
                  <PortfolioPieChart positions={positions} />
                </div>

                {/* Rewards */}
                <RewardsPanel rewards={USER_REWARDS} />

                {/* Position summary */}
                <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
                  <h3 className="mb-3 text-sm font-semibold text-[#E6EDF3]">
                    Position Summary
                  </h3>
                  <div className="space-y-2">
                    {positions.map((pos) => (
                      <div
                        key={pos.teamId}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: pos.color }}
                          />
                          <span className="text-xs text-[#8B949E]">{pos.symbol}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-[#E6EDF3]">
                            {formatCurrency(pos.value)}
                          </span>
                          <span
                            className={cn(
                              "ml-2 text-xs",
                              pos.pnlPercent >= 0 ? "text-[#3FB950]" : "text-[#F85149]"
                            )}
                          >
                            {formatPercent(pos.pnlPercent)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
