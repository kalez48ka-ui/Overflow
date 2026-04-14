"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { CountUp } from "@/components/motion";
import { PSL_TEAMS } from "@/lib/mockData";
import { api, type MatchInfo } from "@/lib/api";
import { cn, formatPrice } from "@/lib/utils";
import { TeamLogo } from "@/components/TeamLogo";
import type { PSLTeam } from "@/types";
import { CardSpotlight } from "@/components/ui/card-spotlight";

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

const RANK_COLORS: Record<number, string> = {
  1: "#FDB913", // gold
  2: "#C9D1D9", // silver
  3: "#CD7F32", // bronze
};

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
  const totalScheduledMatches = 44;
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
    const s = [...upcomingMatches].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    return s.slice(0, 5);
  }, [upcomingMatches]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0D1117]"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-black text-[#E6EDF3] mb-4">Points Table</h1>

        {/* Season banner — compact single line */}
        <CardSpotlight className="mb-6 rounded-lg border border-[#21262D] bg-[#161B22]" color="228, 0, 43" opacity={0.05} radius={300}>
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-[#E6EDF3]">PSL 2026</span>
            <span className="text-[#484F58]">&middot;</span>
            <span className="text-[#8B949E]">{seasonStage}</span>
            <span className="text-[#484F58]">&middot;</span>
            <span className="tabular-nums text-[#8B949E]">
              {matchesLoading ? "..." : `${completedMatches}/${Math.max(allMatches.length, totalScheduledMatches)} matches`}
            </span>
            {liveMatches > 0 && (
              <span className="inline-flex items-center gap-1 text-xs">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E4002B]" />
                <span className="font-medium text-[#E4002B]">{liveMatches} live</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:w-48">
            <div className="flex-1 h-1 rounded-full bg-[#21262D] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#E6EDF3]/40"
                style={{ width: `${seasonProgress}%`, transition: "width 0.6s ease-out" }}
              />
            </div>
            <span className="text-xs tabular-nums text-[#8B949E]">{seasonProgress}%</span>
          </div>
        </div>
        </CardSpotlight>

        {/* Table container */}
        <p className="mb-2 text-[10px] text-[#8B949E] sm:hidden">Swipe to see all columns</p>
        <div className="overflow-x-auto rounded-xl border border-[#21262D] bg-[#161B22]">
          <table className="w-full min-w-[560px] text-sm" aria-label="PSL 2026 Points Table">
            <thead>
              <tr className="border-b border-[#21262D]">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "group cursor-pointer select-none px-3 sm:px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#8B949E] transition-colors hover:text-[#E6EDF3] sticky top-0 bg-[#161B22] z-10",
                      col.align === "left" ? "text-left" : "text-right",
                      col.key === "name" && "text-left",
                      col.key === "ranking" && "text-center w-16",
                      col.hideMobile && "hidden md:table-cell",
                    )}
                    onClick={() => handleSort(col.key)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort(col.key); } }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span className="hidden sm:inline">{col.label}</span>
                      <span className="sm:hidden">{col.shortLabel || col.label}</span>
                      {sortKey === col.key ? (
                        sortDir === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-[#E4002B]" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-[#E4002B]" />
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
                    <tr key={i} className="border-b border-[#21262D]/50">
                      {COLUMNS.map((col) => (
                        <td key={col.key} className={cn("px-4 py-3.5", col.hideMobile && "hidden md:table-cell")}>
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

        {/* Upcoming Fixtures — compact list */}
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-[#8B949E]">
            Upcoming Fixtures
          </h2>

          {matchesLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-[#21262D] bg-[#161B22] px-4 py-3">
                  <div className="h-3 w-40 animate-pulse rounded bg-[#21262D]" />
                  <div className="ml-auto h-3 w-28 animate-pulse rounded bg-[#21262D]" />
                </div>
              ))}
            </div>
          ) : displayUpcoming.length === 0 ? (
            <p className="text-sm text-[#484F58]">No upcoming fixtures scheduled.</p>
          ) : (
            <div className="space-y-1">
              {displayUpcoming.map((match) => (
                <UpcomingFixtureRow key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function UpcomingFixtureRow({ match }: { match: MatchInfo }) {
  const matchDate = new Date(match.startTime);
  const isToday = matchDate.toDateString() === new Date().toDateString();
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

  const t1Mock = PSL_TEAMS.find(
    (t) => t.id === match.team1Id || t.id === match.team1Symbol?.replace("$", ""),
  );
  const t2Mock = PSL_TEAMS.find(
    (t) => t.id === match.team2Id || t.id === match.team2Symbol?.replace("$", ""),
  );
  const t1Color = match.team1Color || t1Mock?.color || "#8B949E";
  const t2Color = match.team2Color || t2Mock?.color || "#8B949E";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#21262D] bg-[#161B22] px-4 py-2.5 text-sm transition-colors hover:bg-[#21262D]/40">
      {/* Teams */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t1Color }} />
        <span className="font-medium text-[#E6EDF3] truncate">{match.team1Name}</span>
        <span className="text-xs text-[#484F58]">vs</span>
        <span className="font-medium text-[#E6EDF3] truncate">{match.team2Name}</span>
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t2Color }} />
      </div>

      {/* Date + venue */}
      <div className="flex items-center gap-3 text-xs text-[#8B949E] shrink-0">
        <span>
          <span className={cn("font-medium", isToday && "text-[#E4002B]")}>{dateLabel}</span>
          {" "}{timeLabel}
        </span>
        {match.venue && (
          <>
            <span className="text-[#484F58]">&middot;</span>
            <span className="max-w-[140px] truncate hidden sm:inline">{match.venue}</span>
          </>
        )}
      </div>
    </div>
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
  const rankColor = RANK_COLORS[team.ranking];

  return (
    <tr
      className={cn(
        "group border-b border-[#21262D]/50 transition-colors hover:bg-[#21262D]/40",
        idx % 2 === 1 && "bg-white/[0.01]",
      )}
    >
      {/* Rank */}
      <td className="px-4 py-3 text-center">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold font-mono tabular-nums",
            rankColor ? "font-black" : "text-[#8B949E]",
          )}
          style={rankColor ? { color: rankColor } : undefined}
        >
          {team.ranking}
        </span>
      </td>

      {/* Team */}
      <td className="px-3 sm:px-4 py-3">
        <Link
          href={`/trade/${team.id.toLowerCase()}`}
          className="flex items-center gap-2 sm:gap-3 group/link"
        >
          <TeamLogo teamId={team.id} color={team.color} size={28} />
          <div className="whitespace-nowrap">
            <span className="font-semibold text-[#E6EDF3] text-sm transition-colors group-hover/link:text-[#E4002B]">
              {team.name}
            </span>
            <span className="ml-2 text-xs text-[#484F58]">{team.symbol}</span>
          </div>
        </Link>
      </td>

      {/* P */}
      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#E6EDF3]">
        {played}
      </td>

      {/* W */}
      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#3FB950] font-medium">
        {team.wins}
      </td>

      {/* L */}
      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#F85149] font-medium">
        {team.losses}
      </td>

      {/* NRR */}
      <td
        className={cn(
          "hidden md:table-cell px-4 py-3 text-right font-mono tabular-nums font-medium",
          team.nrr >= 0 ? "text-[#3FB950]" : "text-[#F85149]",
        )}
      >
        {team.nrr > 0 ? "+" : ""}{team.nrr.toFixed(3)}
      </td>

      {/* Performance Score */}
      <td className="hidden md:table-cell px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1 rounded-full bg-[#21262D] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: team.color,
                width: perfWidth,
                transition: "width 0.4s ease-out",
              }}
            />
          </div>
          <span className="font-mono tabular-nums text-[#E6EDF3] font-medium text-xs w-7 text-right">
            {team.performanceScore}
          </span>
        </div>
      </td>

      {/* Token Price */}
      <td className="px-4 py-3 text-right">
        <Link
          href={`/trade/${team.id.toLowerCase()}`}
          className="font-mono tabular-nums font-semibold text-[#E6EDF3] hover:text-[#E4002B] transition-colors"
        >
          ${formatPrice(team.price)}
        </Link>
      </td>

      {/* 24h Change */}
      <td
        className={cn(
          "px-4 py-3 text-right font-mono tabular-nums font-semibold",
          isPositive ? "text-[#3FB950]" : "text-[#F85149]",
        )}
      >
        {isPositive ? "+" : ""}
        {team.change24h.toFixed(1)}%
      </td>

      {/* Sell Tax */}
      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#8B949E]">
        {team.sellTax}%
      </td>
    </tr>
  );
}
