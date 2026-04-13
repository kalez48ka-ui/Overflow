"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Trophy,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
} from "lucide-react";
import { CountUp, StaggerReveal } from "@/components/motion";
import { PSL_TEAMS } from "@/lib/mockData";
import { api, type MatchInfo } from "@/lib/api";
import { cn, formatPrice, formatCurrency } from "@/lib/utils";
import type { PSLTeam } from "@/types";

type SortKey =
  | "ranking"
  | "name"
  | "played"
  | "wins"
  | "losses"
  | "nrr"
  | "performanceScore"
  | "price"
  | "change24h"
  | "sellTax";

type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; shortLabel?: string; align?: "left" | "right"; hideMobile?: boolean }[] = [
  { key: "ranking", label: "#Rank", shortLabel: "#" },
  { key: "name", label: "Team", align: "left" },
  { key: "played", label: "P" },
  { key: "wins", label: "W" },
  { key: "losses", label: "L" },
  { key: "nrr", label: "NRR", hideMobile: true },
  { key: "performanceScore", label: "Performance", shortLabel: "Perf", hideMobile: true },
  { key: "price", label: "Token Price", shortLabel: "Price" },
  { key: "change24h", label: "24h Change", shortLabel: "24h" },
  { key: "sellTax", label: "Sell Tax", shortLabel: "Tax" },
];

function formatNRR(nrr: number): string {
  const sign = nrr > 0 ? "+" : "";
  return `${sign}${nrr.toFixed(3)}`;
}

export default function StandingsPage() {
  const [teams, setTeams] = useState<PSLTeam[]>(PSL_TEAMS);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("ranking");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [allMatches, setAllMatches] = useState<MatchInfo[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchInfo[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api.teams
      .getAll()
      .then((data) => {
        if (cancelled || !data || data.length === 0) return;

        const mapped: PSLTeam[] = data.map((t) => {
          const mock = PSL_TEAMS.find(
            (m) => m.id === t.symbol?.replace("$", "") || m.symbol === t.symbol,
          );
          return {
            id: t.symbol?.replace("$", "") || t.id,
            name: t.name,
            symbol: t.symbol.startsWith("$") ? t.symbol : `$${t.symbol}`,
            color: mock?.color || "#58A6FF",
            secondaryColor: mock?.secondaryColor || "#1C1C1C",
            price:
              (t as typeof t & { currentPrice?: number }).currentPrice ?? t.price,
            change24h:
              (t as typeof t & { priceChange24h?: number }).priceChange24h ??
              t.change24h,
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
          };
        });

        setTeams(mapped);
      })
      .catch(() => {
        // fallback already set via useState default
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch all matches (for season progress) and upcoming matches
  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([api.matches.getAll(), api.matches.getUpcoming()])
      .then(([allResult, upcomingResult]) => {
        if (cancelled) return;

        if (allResult.status === "fulfilled" && allResult.value) {
          setAllMatches(allResult.value);
        }

        if (upcomingResult.status === "fulfilled" && upcomingResult.value) {
          setUpcomingMatches(upcomingResult.value);
        }
      })
      .finally(() => {
        if (!cancelled) setMatchesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir(key === "name" ? "asc" : "desc");
      }
    },
    [sortKey],
  );

  const sorted = useMemo(() => {
    const copy = [...teams];
    copy.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortKey === "played") {
        aVal = a.wins + a.losses;
        bVal = b.wins + b.losses;
      } else if (sortKey === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const diff = (aVal as number) - (bVal as number);
      return sortDir === "asc" ? diff : -diff;
    });
    return copy;
  }, [teams, sortKey, sortDir]);

  const maxPerf = useMemo(
    () => Math.max(...teams.map((t) => t.performanceScore), 1),
    [teams],
  );

  // Season progress calculations
  const totalScheduledMatches = 44; // PSL 2026 group stage: 44 matches
  const completedMatches = useMemo(
    () => allMatches.filter((m) => m.status === "completed").length,
    [allMatches],
  );
  const liveMatches = useMemo(
    () => allMatches.filter((m) => m.status === "live").length,
    [allMatches],
  );
  const seasonProgress = useMemo(() => {
    if (allMatches.length === 0) return 0;
    const total = Math.max(allMatches.length, totalScheduledMatches);
    return Math.round((completedMatches / total) * 100);
  }, [allMatches, completedMatches]);

  const seasonStage = useMemo(() => {
    if (completedMatches >= 40) return "Knockout Stage";
    if (completedMatches >= 30) return "Group Stage (Final Round)";
    return "Group Stage";
  }, [completedMatches]);

  // Sort upcoming by startTime, take first 5
  const displayUpcoming = useMemo(() => {
    const sorted = [...upcomingMatches].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    return sorted.slice(0, 5);
  }, [upcomingMatches]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="min-h-screen bg-[#0D1117]"
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDB913]/10 border border-[#FDB913]/20">
              <Trophy className="h-5 w-5 text-[#FDB913]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#E6EDF3]">
                PSL 2026 Standings
              </h1>
              <p className="text-sm text-[#8B949E]">
                Points table with live token prices
              </p>
            </div>
          </div>
        </div>

        {/* Season Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 rounded-xl border border-[#30363D] bg-[#161B22] p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#58A6FF]/10 border border-[#58A6FF]/20">
                <Calendar className="h-4 w-4 text-[#58A6FF]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#E6EDF3]">
                  PSL 2026 — {seasonStage}
                </p>
                <p className="text-xs text-[#8B949E]">
                  {matchesLoading ? (
                    "Loading season data..."
                  ) : (
                    <>
                      {completedMatches} of {Math.max(allMatches.length, totalScheduledMatches)} matches completed
                      {liveMatches > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3FB950]" />
                          <span className="text-[#3FB950] font-medium">
                            {liveMatches} live
                          </span>
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3 sm:w-64">
              <div className="flex-1 h-2.5 rounded-full bg-[#21262D] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#58A6FF] to-[#3FB950]"
                  initial={{ width: 0 }}
                  animate={{ width: `${seasonProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums text-[#E6EDF3] w-10 text-right">
                {seasonProgress}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Table container */}
        <p className="mb-2 text-[10px] text-[#8B949E] sm:hidden">Swipe to see all columns</p>
        <div className="overflow-x-auto rounded-xl border border-[#30363D] bg-[#161B22]">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#30363D]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "group cursor-pointer select-none px-3 sm:px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#8B949E] transition-colors hover:text-[#E6EDF3]",
                      col.align === "left" ? "text-left" : "text-right",
                      col.key === "name" && "text-left",
                      col.key === "ranking" && "text-center w-16",
                      col.hideMobile && "hidden md:table-cell",
                    )}
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span className="hidden sm:inline">{col.label}</span>
                      <span className="sm:hidden">{col.shortLabel || col.label}</span>
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-[#58A6FF]" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-[#58A6FF]" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#30363D]/50">
                      {COLUMNS.map((col) => (
                        <td key={col.key} className={cn("px-4 py-4", col.hideMobile && "hidden md:table-cell")}>
                          <div className="h-4 w-16 animate-pulse rounded bg-[#21262D]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : sorted.map((team, idx) => (
                    <TeamRow
                      key={team.id}
                      team={team}
                      idx={idx}
                      maxPerf={maxPerf}
                    />
                  ))}
            </tbody>
          </table>
        </div>

        {/* Upcoming Fixtures Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="mt-8"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#8B949E]" />
              <h2 className="text-lg font-bold text-[#E6EDF3]">
                Upcoming Fixtures
              </h2>
            </div>
            {upcomingMatches.length > 5 && (
              <Link
                href="/match/history"
                className="flex items-center gap-1 text-xs font-medium text-[#58A6FF] hover:text-[#79C0FF] transition-colors"
              >
                View all
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {matchesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-[#30363D] bg-[#161B22] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-[#21262D]" />
                    <div className="h-4 w-8 animate-pulse rounded bg-[#21262D]" />
                    <div className="h-8 w-8 animate-pulse rounded-full bg-[#21262D]" />
                  </div>
                  <div className="h-4 w-32 animate-pulse rounded bg-[#21262D]" />
                </div>
              ))}
            </div>
          ) : displayUpcoming.length === 0 ? (
            <div className="rounded-xl border border-[#30363D] bg-[#161B22] px-6 py-10 text-center">
              <Calendar className="mx-auto mb-3 h-8 w-8 text-[#30363D]" />
              <p className="text-sm text-[#8B949E]">
                No upcoming fixtures scheduled
              </p>
            </div>
          ) : (
            <StaggerReveal className="space-y-2" staggerDelay={0.06} yOffset={20}>
              {displayUpcoming.map((match, i) => (
                <UpcomingFixtureCard key={match.id} match={match} index={i} />
              ))}
            </StaggerReveal>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function UpcomingFixtureCard({
  match,
  index,
}: {
  match: MatchInfo;
  index: number;
}) {
  const matchDate = new Date(match.startTime);
  const isToday =
    matchDate.toDateString() === new Date().toDateString();
  const isTomorrow = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return matchDate.toDateString() === tomorrow.toDateString();
  })();

  const dateLabel = isToday
    ? "Today"
    : isTomorrow
      ? "Tomorrow"
      : matchDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

  const timeLabel = matchDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Resolve team colors from mock data when API doesn't provide them
  const t1Mock = PSL_TEAMS.find(
    (t) =>
      t.id === match.team1Id ||
      t.id === match.team1Symbol?.replace("$", ""),
  );
  const t2Mock = PSL_TEAMS.find(
    (t) =>
      t.id === match.team2Id ||
      t.id === match.team2Symbol?.replace("$", ""),
  );
  const t1Color = match.team1Color || t1Mock?.color || "#58A6FF";
  const t2Color = match.team2Color || t2Mock?.color || "#58A6FF";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="flex flex-col gap-3 rounded-xl border border-[#30363D] bg-[#161B22] p-4 transition-colors hover:bg-[#21262D]/60 sm:flex-row sm:items-center sm:justify-between"
    >
      {/* Teams */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md"
            style={{ backgroundColor: t1Color }}
          >
            {match.team1Symbol?.replace("$", "") || match.team1Id}
          </div>
          <span className="text-sm font-semibold text-[#E6EDF3] max-w-[100px] truncate">
            {match.team1Name}
          </span>
        </div>

        <span className="mx-1 text-xs font-bold text-[#8B949E]">vs</span>

        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md"
            style={{ backgroundColor: t2Color }}
          >
            {match.team2Symbol?.replace("$", "") || match.team2Id}
          </div>
          <span className="text-sm font-semibold text-[#E6EDF3] max-w-[100px] truncate">
            {match.team2Name}
          </span>
        </div>
      </div>

      {/* Date / venue */}
      <div className="flex items-center gap-4 text-xs text-[#8B949E]">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0" />
          <span>
            <span
              className={cn(
                "font-medium",
                isToday ? "text-[#3FB950]" : "text-[#E6EDF3]",
              )}
            >
              {dateLabel}
            </span>
            {" "}
            {timeLabel}
          </span>
        </div>
        {match.venue && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="max-w-[180px] truncate">{match.venue}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TeamRow({
  team,
  idx,
  maxPerf,
}: {
  team: PSLTeam;
  idx: number;
  maxPerf: number;
}) {
  const played = team.wins + team.losses;
  const perfWidth = `${Math.round((team.performanceScore / maxPerf) * 100)}%`;
  const isPositive = team.change24h >= 0;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03, duration: 0.25 }}
      className="group border-b border-[#30363D]/50 transition-colors hover:bg-[#21262D]/60"
      style={{
        boxShadow: "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.boxShadow =
          `inset 0 0 40px ${team.color}08, 0 0 20px ${team.color}06`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.boxShadow = "none";
      }}
    >
      {/* Rank */}
      <td className="px-4 py-3.5 text-center">
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
            team.ranking <= 3
              ? "bg-[#FDB913]/15 text-[#FDB913]"
              : "bg-[#21262D] text-[#8B949E]",
          )}
        >
          {team.ranking}
        </span>
      </td>

      {/* Team */}
      <td className="px-3 sm:px-4 py-3.5">
        <Link
          href={`/trade/${team.id.toLowerCase()}`}
          className="flex items-center gap-2 sm:gap-3 group/link"
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md"
            style={{ backgroundColor: team.color }}
          >
            {team.id}
          </div>
          <div className="whitespace-nowrap">
            <span className="font-semibold text-[#E6EDF3] transition-colors group-hover/link:text-[#58A6FF]">
              {team.name}
            </span>
            <span className="ml-2 text-xs text-[#8B949E]">{team.symbol}</span>
          </div>
        </Link>
      </td>

      {/* P */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[#E6EDF3]">
        <CountUp value={played} duration={0.8} />
      </td>

      {/* W */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[#3FB950] font-medium">
        <CountUp value={team.wins} duration={0.8} />
      </td>

      {/* L */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[#F85149] font-medium">
        <CountUp value={team.losses} duration={0.8} />
      </td>

      {/* NRR */}
      <td
        className={cn(
          "hidden md:table-cell px-4 py-3.5 text-right tabular-nums font-medium",
          team.nrr >= 0 ? "text-[#3FB950]" : "text-[#F85149]",
        )}
      >
        <CountUp value={team.nrr} decimals={3} prefix={team.nrr > 0 ? "+" : ""} duration={1} />
      </td>

      {/* Performance Score */}
      <td className="hidden md:table-cell px-4 py-3.5">
        <div className="flex items-center justify-end gap-2">
          <div className="hidden sm:block w-20 h-1.5 rounded-full bg-[#21262D] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: team.color }}
              initial={{ width: 0 }}
              animate={{ width: perfWidth }}
              transition={{ duration: 0.6, delay: idx * 0.04 }}
            />
          </div>
          <span className="tabular-nums text-[#E6EDF3] font-semibold text-xs w-8 text-right">
            {team.performanceScore}
          </span>
        </div>
      </td>

      {/* Token Price */}
      <td className="px-4 py-3.5 text-right">
        <Link
          href={`/trade/${team.id.toLowerCase()}`}
          className="tabular-nums font-semibold text-[#E6EDF3] hover:text-[#58A6FF] transition-colors"
        >
          ${formatPrice(team.price)}
        </Link>
      </td>

      {/* 24h Change */}
      <td
        className={cn(
          "px-4 py-3.5 text-right tabular-nums font-semibold",
          isPositive ? "text-[#3FB950]" : "text-[#F85149]",
        )}
      >
        {isPositive ? "+" : ""}
        {team.change24h.toFixed(1)}%
      </td>

      {/* Sell Tax */}
      <td className="px-4 py-3.5 text-right tabular-nums text-[#8B949E]">
        {team.sellTax}%
      </td>
    </motion.tr>
  );
}
