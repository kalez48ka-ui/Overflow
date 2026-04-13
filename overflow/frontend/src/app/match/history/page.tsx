"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin } from "lucide-react";
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
  if (!symbol && !name) return "#8B949E";
  const team = PSL_TEAMS.find(
    (t) =>
      t.symbol === symbol ||
      t.id === symbol ||
      t.name.toLowerCase() === name.toLowerCase()
  );
  return team?.color ?? "#8B949E";
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

function formatMatchDateShort(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PK", {
    weekday: "short",
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

function StatusDot({ status }: { status: MatchInfo["status"] }) {
  if (status === "live") {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E4002B] opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E4002B]" />
      </span>
    );
  }
  if (status === "completed") {
    return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#3FB950]" />;
  }
  return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#484F58]" />;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#21262D] bg-[#161B22] px-4 py-3">
      <div className="h-3 w-40 animate-pulse rounded bg-[#21262D]" />
      <div className="ml-auto h-3 w-28 animate-pulse rounded bg-[#21262D]" />
    </div>
  );
}

function MatchRow({ match }: { match: MatchInfo }) {
  const team1Color = match.team1Color ?? lookupTeamColor(match.team1Symbol, match.team1Name);
  const team2Color = match.team2Color ?? lookupTeamColor(match.team2Symbol, match.team2Name);

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[#21262D] bg-[#161B22] px-4 py-3 transition-colors hover:bg-[#21262D]/40 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: status + teams + score */}
      <div className="flex items-center gap-3 min-w-0">
        <StatusDot status={match.status} />
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: team1Color }} />
          <span className="text-sm font-medium text-[#E6EDF3] truncate">{match.team1Name}</span>
          <span className="text-xs text-[#484F58]">vs</span>
          <span className="text-sm font-medium text-[#E6EDF3] truncate">{match.team2Name}</span>
          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: team2Color }} />
        </div>
        {/* Score inline for completed */}
        {(match.score1 || match.score2) && (
          <span className="text-xs tabular-nums text-[#8B949E] shrink-0">
            {match.score1 ?? "---"} vs {match.score2 ?? "---"}
          </span>
        )}
      </div>

      {/* Right: date + venue */}
      <div className="flex items-center gap-3 text-xs text-[#8B949E] shrink-0 pl-7 sm:pl-0">
        {match.startTime && (
          <span className="tabular-nums">
            {formatMatchDateShort(match.startTime)} {formatMatchTime(match.startTime)}
          </span>
        )}
        {match.venue && (
          <>
            <span className="text-[#484F58]">&middot;</span>
            <span className="flex items-center gap-1 max-w-[160px] truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              {match.venue}
            </span>
          </>
        )}
      </div>
    </div>
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0D1117]"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Tab bar — text tabs with underline */}
        <div className="mb-6 flex items-center gap-6 border-b border-[#21262D]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "relative min-h-[44px] pb-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58A6FF]/50",
                activeTab === tab.key
                  ? "text-[#E6EDF3]"
                  : "text-[#8B949E] hover:text-[#C9D1D9]"
              )}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="match-tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E4002B]"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-lg border border-[#F85149]/20 bg-[#161B22] p-8 text-center">
            <p className="text-sm text-[#F85149]">{error}</p>
            <button
              onClick={() => fetchMatches(activeTab)}
              className="mt-3 rounded-lg border border-[#21262D] bg-[#0D1117] px-4 py-2 text-xs font-medium text-[#E6EDF3] hover:border-[#E4002B] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && matches.length === 0 && (
          <div className="rounded-xl border border-[#21262D] bg-[#161B22] py-16 text-center">
            <p className="text-sm text-[#8B949E]">
              No {activeTab === "all" ? "" : activeTab + " "}matches to display.
            </p>
          </div>
        )}

        {/* Match list */}
        {!loading && !error && matches.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-1.5"
            >
              {matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
