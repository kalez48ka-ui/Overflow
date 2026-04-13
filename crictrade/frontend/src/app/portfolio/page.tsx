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
import type { Position } from "@/types";
import {
  cn,
  formatCurrency,
  formatPercent,
  formatPrice,
  formatTimestamp,
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

function TransactionRow({
  tx,
}: {
  tx: (typeof USER_TRANSACTIONS)[number];
}) {
  const statusIcon = {
    confirmed: <CheckCircle className="h-3.5 w-3.5 text-[#3FB950]" />,
    pending: <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FDB913]" />,
    failed: <XCircle className="h-3.5 w-3.5 text-[#F85149]" />,
  }[tx.status];

  const typeColor = {
    buy: "text-[#3FB950]",
    sell: "text-[#F85149]",
    claim: "text-[#FDB913]",
  }[tx.type];

  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        {statusIcon}
        <div>
          <p className="text-xs font-semibold text-[#E6EDF3]">
            <span className={cn("capitalize font-bold", typeColor)}>{tx.type}</span>
            {" "}{tx.teamSymbol}
          </p>
          <p className="text-[10px] text-[#8B949E]">
            {formatTimestamp(tx.timestamp)} · {tx.txHash}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold text-[#E6EDF3]">
          {formatCurrency(tx.total)}
        </p>
        <p className="text-[10px] text-[#8B949E]">
          {tx.amount.toLocaleString()} @ ${formatPrice(tx.price)}
        </p>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");
  const [positions, setPositions] = useState<Position[]>(USER_POSITIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) {
      // No wallet connected — use mock data
      setPositions(USER_POSITIONS);
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
                    <div className="divide-y divide-[#30363D]">
                      {USER_TRANSACTIONS.map((tx) => (
                        <TransactionRow key={tx.id} tx={tx} />
                      ))}
                    </div>
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
