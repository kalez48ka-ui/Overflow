"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useAccount } from "wagmi";
import { api } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/api";
import { cn, formatCurrency, shortenAddress } from "@/lib/utils";
import { PSL_TEAMS } from "@/lib/mockData";
import { CountUp } from "@/components/motion/CountUp";

const Spotlight = dynamic(
  () => import("@/components/ui/spotlight").then((m) => ({ default: m.Spotlight })),
  { ssr: false },
);

const SORT_TABS = [
  { key: "pnl", label: "P&L" },
  { key: "volume", label: "Volume" },
  { key: "trades", label: "Most Active" },
] as const;

type SortKey = (typeof SORT_TABS)[number]["key"];

function teamColor(symbol: string): string {
  const cleaned = symbol.replace("$", "");
  const team = PSL_TEAMS.find((t) => t.id === cleaned || t.symbol === symbol);
  return team?.color || "#58A6FF";
}

const RANK_DOT_COLORS: Record<number, string> = {
  1: "#FDB913",
  2: "#C9D1D9",
  3: "#CD7F32",
};

function WalletCell({ wallet }: { wallet: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs tabular-nums text-[#E6EDF3]">
        {shortenAddress(wallet)}
      </span>
      <button
        onClick={handleCopy}
        className="rounded p-2 text-[#768390] hover:text-[#E6EDF3] transition-colors"
        aria-label="Copy wallet address"
      >
        {copied ? (
          <Check className="h-3 w-3 text-[#3FB950]" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#21262D]/50">
      <td className="px-4 py-3"><div className="h-4 w-8 animate-pulse rounded bg-[#21262D]" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[#21262D]" /></td>
      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[#21262D]" /></td>
      <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[#21262D]" /></td>
      <td className="hidden sm:table-cell px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[#21262D]" /></td>
      <td className="hidden sm:table-cell px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[#21262D]" /></td>
      <td className="hidden md:table-cell px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[#21262D]" /></td>
    </tr>
  );
}

export default function LeaderboardPage() {
  const { address } = useAccount();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("pnl");

  const fetchLeaderboard = (sort: SortKey) => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await api.leaderboard.get(sort, 50);
        if (!cancelled) setEntries(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setEntries([]);
          const msg = err instanceof Error ? err.message : "Failed to load leaderboard";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    return fetchLeaderboard(sortKey);
  }, [sortKey]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0D1117] relative overflow-hidden"
    >
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-black text-[#E6EDF3] mb-4">Leaderboard</h1>

        {/* Sort tabs — text with underline */}
        <div className="mb-6 flex items-center gap-6 border-b border-[#21262D]" role="tablist" aria-label="Leaderboard sorting">
          {SORT_TABS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              id={`leaderboard-tab-${key}`}
              aria-selected={sortKey === key}
              aria-controls="leaderboard-tabpanel"
              onClick={() => setSortKey(key)}
              className={cn(
                "relative min-h-[44px] pb-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58A6FF]/50",
                sortKey === key
                  ? "text-[#E6EDF3]"
                  : "text-[#9CA3AF] hover:text-[#C9D1D9]"
              )}
            >
              {label}
              {sortKey === key && (
                <motion.div
                  layoutId="leaderboard-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E4002B]"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <AnimatePresence mode="wait">
        <motion.div
          key={sortKey}
          role="tabpanel"
          id="leaderboard-tabpanel"
          aria-labelledby={`leaderboard-tab-${sortKey}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
        <p className="mb-2 text-[10px] text-[#9CA3AF] sm:hidden">Swipe to see all columns</p>
        <div className="rounded-lg border border-[#21262D] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left" aria-label="Trading leaderboard">
              <thead>
                <tr className="border-b border-[#21262D]">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] w-16">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                    Wallet
                  </th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] text-right">
                    Total P&L
                  </th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] text-right">
                    Trades
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] text-right">
                    Volume
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] text-center">
                    Favorite
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] text-right">
                    Win Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-[#F85149]" />
                        <p className="text-sm text-[#E6EDF3]">
                          Something went wrong
                        </p>
                        <p className="text-xs text-[#9CA3AF] max-w-xs">
                          {error}
                        </p>
                        <button
                          onClick={() => fetchLeaderboard(sortKey)}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-[#21262D] bg-[#0D1117] px-4 py-2 text-xs font-medium text-[#E6EDF3] transition-colors hover:border-[#E4002B] hover:text-[#E4002B]"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <p className="text-sm text-[#9CA3AF]">
                        No trading activity yet.
                      </p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry, idx) => {
                    const dotColor = RANK_DOT_COLORS[entry.rank];
                    const isCurrentUser = address ? entry.wallet.toLowerCase() === address.toLowerCase() : false;
                    return (
                      <motion.tr
                        key={entry.wallet}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.04 }}
                        className={cn(
                          "border-b border-[#21262D]/50 transition-colors hover:bg-[#21262D]/40",
                          idx % 2 === 1 && "bg-white/[0.01]",
                          entry.rank <= 3 && "bg-white/[0.02]",
                          entry.rank <= 3 && "ring-1 ring-inset",
                          entry.rank === 1 && "ring-[#FDB913]/30",
                          entry.rank === 2 && "ring-[#C9D1D9]/20",
                          entry.rank === 3 && "ring-[#CD7F32]/20",
                          isCurrentUser && "ring-1 ring-[#58A6FF] bg-[#58A6FF]/5"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {dotColor ? (
                              <span
                                className="inline-block h-2 w-2 rounded-full"
                                style={{ backgroundColor: dotColor }}
                              />
                            ) : null}
                            <span className="text-xs font-bold tabular-nums text-[#9CA3AF]">
                              {entry.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <WalletCell wallet={entry.wallet} />
                            {isCurrentUser && (
                              <span className="rounded-full bg-[#58A6FF]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#58A6FF]">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={cn(
                              "text-xs font-bold font-mono tabular-nums",
                              entry.totalPnl >= 0
                                ? "text-[#3FB950]"
                                : "text-[#F85149]"
                            )}
                          >
                            <CountUp value={Math.abs(entry.totalPnl)} prefix={entry.totalPnl >= 0 ? "+$" : "-$"} decimals={2} duration={1.2} />
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs tabular-nums text-[#E6EDF3]">
                            {entry.tradeCount}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-right">
                          <span className="text-xs tabular-nums text-[#E6EDF3]">
                            {formatCurrency(entry.totalVolume)}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-center">
                          {entry.favoriteTeam ? (
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                color: teamColor(entry.favoriteTeam),
                                backgroundColor: `${teamColor(entry.favoriteTeam)}15`,
                                borderWidth: 1,
                                borderColor: `${teamColor(entry.favoriteTeam)}30`,
                              }}
                            >
                              {entry.favoriteTeam}
                            </span>
                          ) : (
                            <span className="text-xs text-[#768390]">&mdash;</span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-right">
                          <span
                            className={cn(
                              "text-xs font-medium tabular-nums",
                              entry.winRate >= 50
                                ? "text-[#3FB950]"
                                : entry.winRate > 0
                                  ? "text-[#FDB913]"
                                  : "text-[#9CA3AF]"
                            )}
                          >
                            {entry.winRate.toFixed(1)}%
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
