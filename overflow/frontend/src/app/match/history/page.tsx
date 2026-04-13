"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Trophy, Clock, Radio, Loader2 } from "lucide-react";
import { StaggerReveal } from "@/components/motion";
import { api } from "@/lib/api";
import type { MatchInfo } from "@/lib/api";
import { PSL_TEAMS } from "@/lib/mockData";
import { cn } from "@/lib/utils";

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

type TabKey = "all" | "completed" | "upcoming" | "live";

interface Tab {
  key: TabKey;
  label: string;
  fetcher: () => Promise<MatchInfo[]>;
}

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

const TABS: Tab[] = [
  { key: "all", label: "All", fetcher: api.matches.getAll },
  { key: "completed", label: "Completed", fetcher: api.matches.getCompleted },
  { key: "upcoming", label: "Upcoming", fetcher: api.matches.getUpcoming },
  { key: "live", label: "Live", fetcher: api.matches.getLive },
];

const STATUS_ORDER: Record<string, number> = {
  live: 0,
  upcoming: 1,
  completed: 2,
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function lookupTeamColor(symbol: string | undefined, name: string): string {
  if (!symbol && !name) return "#58A6FF";
  const team = PSL_TEAMS.find(
    (t) =>
      t.symbol === symbol ||
      t.id === symbol ||
      t.name.toLowerCase() === name.toLowerCase()
  );
  return team?.color ?? "#58A6FF";
}

function sortMatches(matches: MatchInfo[]): MatchInfo[] {
  return [...matches].sort((a, b) => {
    const orderA = STATUS_ORDER[a.status] ?? 3;
    const orderB = STATUS_ORDER[b.status] ?? 3;
    if (orderA !== orderB) return orderA - orderB;

    const dateA = new Date(a.startTime).getTime();
    const dateB = new Date(b.startTime).getTime();

    if (a.status === "upcoming") return dateA - dateB;
    if (a.status === "completed") return dateB - dateA;
    return dateA - dateB;
  });
}

function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PK", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMatchTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

function StatusBadge({ status }: { status: MatchInfo["status"] }) {
  if (status === "live") {
    return (
      <motion.span
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#F85149]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F85149]"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F85149] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F85149]" />
        </span>
        Live
      </motion.span>
    );
  }

  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3FB950]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3FB950]">
        <Trophy className="h-3 w-3" />
        Completed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#58A6FF]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#58A6FF]">
      <Clock className="h-3 w-3" />
      Upcoming
    </span>
  );
}

function TeamBadge({
  symbol,
  name,
  color,
}: {
  symbol: string | undefined;
  name: string;
  color: string;
}) {
  const abbreviation =
    symbol?.replace("$", "") ??
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full text-xs font-black text-white shadow-lg"
        style={{ backgroundColor: color, boxShadow: `0 0 16px ${color}30` }}
      >
        {abbreviation}
      </div>
      <span className="max-w-[80px] truncate text-center text-[11px] font-medium text-[#8B949E]">
        {name.split(" ").slice(-1)[0]}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#30363D] bg-[#161B22] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-20 rounded-full bg-[#21262D]" />
        <div className="h-4 w-24 rounded bg-[#21262D]" />
      </div>
      <div className="flex items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-11 w-11 rounded-full bg-[#21262D]" />
          <div className="h-3 w-12 rounded bg-[#21262D]" />
        </div>
        <div className="h-4 w-6 rounded bg-[#21262D]" />
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-11 w-11 rounded-full bg-[#21262D]" />
          <div className="h-3 w-12 rounded bg-[#21262D]" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="mx-auto h-3 w-3/4 rounded bg-[#21262D]" />
        <div className="mx-auto h-3 w-1/2 rounded bg-[#21262D]" />
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: MatchInfo }) {
  const team1Color = match.team1Color ?? lookupTeamColor(match.team1Symbol, match.team1Name);
  const team2Color = match.team2Color ?? lookupTeamColor(match.team2Symbol, match.team2Name);

  const hasScores = match.score1 || match.score2;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="group rounded-xl border border-[#30363D] bg-[#161B22] p-5 transition-colors hover:border-[#484F58]"
    >
      {/* Header: status + date */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status={match.status} />
        {match.startTime && (
          <div className="flex items-center gap-1.5 text-xs text-[#8B949E]">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{formatMatchDate(match.startTime)}</span>
            <span className="text-[#484F58]">|</span>
            <span>{formatMatchTime(match.startTime)}</span>
          </div>
        )}
      </div>

      {/* Team badges + vs */}
      <div className="flex items-center justify-center gap-6">
        <TeamBadge
          symbol={match.team1Symbol}
          name={match.team1Name}
          color={team1Color}
        />

        <span className="text-sm font-bold text-[#484F58]">vs</span>

        <TeamBadge
          symbol={match.team2Symbol}
          name={match.team2Name}
          color={team2Color}
        />
      </div>

      {/* Scores */}
      {hasScores && (
        <div className="mt-3 text-center">
          <p className="text-sm font-semibold text-[#E6EDF3]">
            {match.score1 ?? "---"}
            <span className="mx-2 text-[#484F58]">vs</span>
            {match.score2 ?? "---"}
          </p>
        </div>
      )}

      {/* Match name (cricApiName) */}
      {match.cricApiName && (
        <p className="mt-3 text-center text-xs leading-relaxed text-[#E6EDF3]">
          {match.cricApiName}
        </p>
      )}

      {/* Venue */}
      {match.venue && (
        <div className="mt-2 flex items-center justify-center gap-1 text-[11px] text-[#8B949E]">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{match.venue}</span>
        </div>
      )}
    </motion.div>
  );
}

// -------------------------------------------------------------------------
// Page
// -------------------------------------------------------------------------

export default function MatchHistoryPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async (tab: TabKey) => {
    setLoading(true);
    setError(null);
    try {
      const tabConfig = TABS.find((t) => t.key === tab)!;
      const data = await tabConfig.fetcher();
      setMatches(sortMatches(data));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch matches";
      setError(message);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches(activeTab);
  }, [activeTab, fetchMatches]);

  function handleTabChange(tab: TabKey) {
    if (tab === activeTab) return;
    setActiveTab(tab);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="min-h-screen bg-[#0D1117]"
    >
      {/* Header */}
      <div className="border-b border-[#30363D] bg-[#161B22]">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Radio className="h-5 w-5 text-[#58A6FF]" />
            <h1 className="text-xl font-bold text-[#E6EDF3]">Match History</h1>
          </div>
          <p className="mt-1 text-sm text-[#8B949E]">
            Browse all PSL 2026 matches, scores, and results.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Tab bar */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "rounded-full px-4 py-2.5 text-sm font-semibold transition-all min-h-[44px]",
                activeTab === tab.key
                  ? "bg-[#58A6FF] text-white shadow-lg shadow-[#58A6FF]/20"
                  : "bg-[#161B22] text-[#8B949E] border border-[#30363D] hover:border-[#484F58] hover:text-[#E6EDF3]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-xl border border-[#F85149]/30 bg-[#F85149]/05 p-8 text-center">
            <p className="text-sm font-medium text-[#F85149]">{error}</p>
            <button
              onClick={() => fetchMatches(activeTab)}
              className="mt-3 rounded-lg bg-[#161B22] px-4 py-2 text-xs font-semibold text-[#E6EDF3] border border-[#30363D] hover:border-[#484F58] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && matches.length === 0 && (
          <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#21262D]">
              <Calendar className="h-6 w-6 text-[#484F58]" />
            </div>
            <p className="text-base font-semibold text-[#E6EDF3]">
              No matches found
            </p>
            <p className="mt-1 text-sm text-[#8B949E]">
              There are no {activeTab === "all" ? "" : activeTab} matches to display right now.
            </p>
          </div>
        )}

        {/* Match cards grid */}
        {!loading && !error && matches.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <StaggerReveal className="grid grid-cols-1 gap-4 md:grid-cols-2" staggerDelay={0.06} yOffset={16}>
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </StaggerReveal>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
