"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Trophy,
  Medal,
  ArrowLeft,
  Copy,
  Check,
  TrendingUp,
  BarChart2,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { CountUp } from "@/components/motion";
import { api } from "@/lib/api";
import type { LeaderboardEntry } from "@/lib/api";
import { cn, formatCurrency, shortenAddress } from "@/lib/utils";
import { PSL_TEAMS } from "@/lib/mockData";

const SORT_TABS = [
  { key: "pnl", label: "Top P&L", icon: TrendingUp },
  { key: "volume", label: "Most Volume", icon: BarChart2 },
  { key: "trades", label: "Most Active", icon: Activity },
] as const;

type SortKey = (typeof SORT_TABS)[number]["key"];

function teamColor(symbol: string): string {
  const cleaned = symbol.replace("$", "");
  const team = PSL_TEAMS.find((t) => t.id === cleaned || t.symbol === symbol);
  return team?.color || "#58A6FF";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FDB913]/20"
      >
        <Trophy className="h-4 w-4 text-[#FDB913]" />
      </motion.div>
    );
  }
  if (rank === 2) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.4 }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C9D1D9]/15"
      >
        <Medal className="h-4 w-4 text-[#C9D1D9]" />
      </motion.div>
    );
  }
  if (rank === 3) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.5 }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[#CD7F32]/20"
      >
        <Medal className="h-4 w-4 text-[#CD7F32]" />
      </motion.div>
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center">
      <span className="text-xs font-bold tabular-nums text-[#8B949E]">
        {rank}
      </span>
    </div>
  );
}

function WalletCell({ wallet }: { wallet: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may not be available
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-[#E6EDF3]">
        {shortenAddress(wallet)}
      </span>
      <button
        onClick={handleCopy}
        className="rounded p-0.5 text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
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
    <tr className="border-b border-[#30363D]/50">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-16 animate-pulse rounded bg-[#21262D]" />
        </td>
      ))}
    </tr>
  );
}

export default function LeaderboardPage() {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="min-h-screen bg-[#0D1117]"
    >
      {/* Header */}
      <div className="border-b border-[#30363D] bg-[#161B22]">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-[#8B949E] hover:text-[#E6EDF3] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Markets</span>
            </Link>
            <div className="h-4 w-px bg-[#30363D]" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDB913]/10">
                <Trophy className="h-4 w-4 text-[#FDB913]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#E6EDF3]">
                  Leaderboard
                </h1>
                <p className="text-xs text-[#8B949E]">
                  Top traders by performance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Sort tabs */}
        <div className="mb-6 flex items-center gap-2">
          {SORT_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                sortKey === key
                  ? "border border-[#58A6FF]/40 bg-[#58A6FF]/20 text-[#58A6FF]"
                  : "border border-transparent text-[#8B949E] hover:text-[#C9D1D9]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        <AnimatePresence mode="wait">
        <motion.div
          key={sortKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden rounded-xl border border-[#30363D] bg-[#161B22]"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#30363D] bg-[#0D1117]/60">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">
                    Wallet
                  </th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8B949E] text-right">
                    Total P&L
                  </th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8B949E] text-right">
                    Trades
                  </th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8B949E] text-right">
                    Volume
                  </th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8B949E] text-center">
                    Favorite
                  </th>
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8B949E] text-right">
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
                        <AlertTriangle className="h-8 w-8 text-[#F85149]" />
                        <p className="text-sm text-[#E6EDF3]">
                          Something went wrong
                        </p>
                        <p className="text-xs text-[#8B949E] max-w-xs">
                          {error}
                        </p>
                        <button
                          onClick={() => fetchLeaderboard(sortKey)}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-[#30363D] bg-[#21262D] px-4 py-2 text-xs font-medium text-[#E6EDF3] transition-colors hover:border-[#58A6FF] hover:text-[#58A6FF]"
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
                      <div className="flex flex-col items-center gap-2">
                        <Trophy className="h-8 w-8 text-[#30363D]" />
                        <p className="text-sm text-[#8B949E]">
                          No trading activity yet
                        </p>
                        <p className="text-xs text-[#30363D]">
                          Be the first to trade and claim the top spot
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry, idx) => (
                    <motion.tr
                      key={entry.wallet}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={cn(
                        "border-b border-[#30363D]/50 transition-colors hover:bg-[#21262D]/50",
                        entry.rank <= 3 && "bg-[#161B22]"
                      )}
                    >
                      <td className="px-4 py-3">
                        <RankBadge rank={entry.rank} />
                      </td>
                      <td className="px-4 py-3">
                        <WalletCell wallet={entry.wallet} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-xs font-bold tabular-nums",
                            entry.totalPnl >= 0
                              ? "text-[#3FB950]"
                              : "text-[#F85149]"
                          )}
                        >
                          <CountUp
                            value={Math.abs(entry.totalPnl)}
                            prefix={entry.totalPnl >= 0 ? "+$" : "-$"}
                            decimals={2}
                            duration={1}
                          />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs tabular-nums text-[#E6EDF3]">
                          {entry.tradeCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs tabular-nums text-[#E6EDF3]">
                          {formatCurrency(entry.totalVolume)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
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
                          <span className="text-xs text-[#30363D]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-xs font-medium tabular-nums",
                            entry.winRate >= 50
                              ? "text-[#3FB950]"
                              : entry.winRate > 0
                                ? "text-[#FDB913]"
                                : "text-[#8B949E]"
                          )}
                        >
                          {entry.winRate.toFixed(1)}%
                        </span>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
