"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowRight,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { LiveScorecard } from "@/components/LiveScorecard";
import { UpsetVaultDisplay } from "@/components/UpsetVaultDisplay";

const TradingChart = dynamic(
  () => import("@/components/TradingChart").then((m) => ({ default: m.TradingChart })),
  {
    ssr: false,
    loading: () => <div className="flex h-[280px] items-center justify-center" role="status"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#21262D] border-t-[#9CA3AF]" /><span className="sr-only">Loading...</span></div>,
  },
);
const BallByBall = dynamic(
  () => import("@/components/BallByBall").then((m) => ({ default: m.BallByBall })),
  { ssr: false },
);
const AIAnalysis = dynamic(
  () => import("@/components/AIAnalysis").then((m) => ({ default: m.AIAnalysis })),
  { ssr: false },
);
const Meteors = dynamic(
  () => import("@/components/ui/meteors").then((m) => ({ default: m.Meteors })),
  { ssr: false },
);
import { GlitchPrice } from "@/components/effects/GlitchPrice";
import { CountUp } from "@/components/motion/CountUp";
import { LIVE_MATCH, BALL_BY_BALL, CANDLESTICK_DATA, PSL_TEAMS, VAULT_DATA, MOCK_FAN_WARS } from "@/lib/mockData";
import { fanWarsApi } from "@/lib/api";
import type { FanWarStatus } from "@/lib/api";
import { api } from "@/lib/api";
import type { MatchInfo } from "@/lib/api";
import type { MatchData, BattingTeamData } from "@/types";
import { cn, formatPrice, formatPercent, formatCurrency } from "@/lib/utils";
import { TeamLogo } from "@/components/TeamLogo";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedGradientBorder } from "@/components/ui/animated-gradient-border";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import Link from "next/link";

const LIVE_POLL_MS = 10_000;   // 10s when live match active
const IDLE_POLL_MS = 300_000;  // 5min when no live match



function MatchTradingButtons({ team1Id, team2Id }: { team1Id: string; team2Id: string }) {
  const t1 = PSL_TEAMS.find((t) => t.id === team1Id);
  const t2 = PSL_TEAMS.find((t) => t.id === team2Id);

  const teams = [
    { id: t1?.id ?? team1Id, name: t1?.name ?? team1Id, symbol: t1?.symbol ?? `$${team1Id}`, color: t1?.color ?? "#58A6FF", price: t1?.price ?? 0.05, change: t1?.change24h ?? 0 },
    { id: t2?.id ?? team2Id, name: t2?.name ?? team2Id, symbol: t2?.symbol ?? `$${team2Id}`, color: t2?.color ?? "#58A6FF", price: t2?.price ?? 0.05, change: t2?.change24h ?? 0 },
  ];

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
      <div className="grid grid-cols-2 gap-3">
        {teams.map((team) => (
          <div key={team.id}>
            <div className="mb-2 flex items-center gap-2">
              <TeamLogo teamId={team.id} color={team.color} size={24} />
              <div>
                <span className="text-xs font-semibold text-[#E6EDF3]">{team.symbol}</span>
                <GlitchPrice value={`$${formatPrice(team.price)}`} className="ml-1.5 text-[10px] font-mono tabular-nums text-[#9CA3AF]" />
                <span className={cn(
                  "ml-1 text-[10px] font-mono tabular-nums",
                  team.change >= 0 ? "text-[#3FB950]" : "text-[#F85149]"
                )}>
                  {formatPercent(team.change)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Link
                href={`/trade/${team.symbol.replace('$', '').toLowerCase()}`}
                className="rounded bg-[#238636] py-2.5 min-h-[44px] flex items-center justify-center text-center text-xs font-bold text-white hover:bg-[#2EA043] transition-colors"
              >
                Buy
              </Link>
              <Link
                href={`/trade/${team.symbol.replace('$', '').toLowerCase()}`}
                className="rounded bg-[#DA3633] py-2.5 min-h-[44px] flex items-center justify-center text-center text-xs font-bold text-white hover:bg-[#F85149] transition-colors"
              >
                Sell
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpsetScoreTracker({ score, vaultBalance }: { score: number; vaultBalance: number }) {
  const level =
    score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
  const levelColor =
    score >= 75 ? "#F85149" : score >= 50 ? "#FDB913" : score >= 25 ? "#58A6FF" : "#3FB950";

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#9CA3AF]">Upset Score</span>
        <span
          className="text-[10px] font-bold font-mono"
          style={{ color: levelColor }}
        >
          {level}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-4xl font-black font-mono tabular-nums" style={{ color: levelColor }}>
          <NumberTicker value={score} decimals={0} duration={800} showFlash={true} showArrow={false} />
        </span>
        <span className="text-xs text-[#768390]">/ 100</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[#21262D] mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: levelColor,
            width: `${score}%`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-[#768390]">Multiplier </span>
          <span className="font-bold font-mono tabular-nums text-[#E6EDF3]">1.8x</span>
        </div>
        <div>
          <span className="text-[#768390]">Payout </span>
          <span className="font-bold font-mono tabular-nums text-[#E6EDF3]">
            {formatCurrency(vaultBalance * 1.8)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fan War Widget — compact sidebar card for match page
// ---------------------------------------------------------------------------

function FanWarWidget({ team1Id, team2Id }: { team1Id: string; team2Id: string }) {
  const [war, setWar] = useState<FanWarStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const active = await fanWarsApi.getActive();
        if (cancelled) return;
        // Find a fan war matching either team in the current match
        const match = active.find(
          (w) =>
            (w.homeTeamId === team1Id && w.awayTeamId === team2Id) ||
            (w.homeTeamId === team2Id && w.awayTeamId === team1Id),
        );
        if (match) {
          setWar(match);
        }
      } catch (err) {
        console.warn('[Match] fetch error:', err);
        // Fallback to mock data
        const mock = MOCK_FAN_WARS.find(
          (w) =>
            (w.homeTeamId === team1Id && w.awayTeamId === team2Id) ||
            (w.homeTeamId === team2Id && w.awayTeamId === team1Id),
        );
        if (!cancelled && mock) {
          setWar(mock as FanWarStatus);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [team1Id, team2Id]);

  if (!war || war.status === "SETTLED" || war.status === "CANCELLED") return null;

  const total = war.totalHomeLocked + war.totalAwayLocked;
  const homePercent = total > 0 ? ((war.totalHomeLocked / total) * 100).toFixed(0) : "50";

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-[#9CA3AF]">Fan War</span>
          <span className="text-[10px] font-bold font-mono text-[#F85149]">
            ACTIVE
          </span>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <TeamLogo teamId={war.homeTeamId} color={war.homeTeamColor} size={20} />
            <span className="font-mono tabular-nums text-[#E6EDF3]">
              {war.totalHomeLocked.toLocaleString()}
            </span>
          </div>
          <span className="text-[#768390]">vs</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-[#E6EDF3]">
              {war.totalAwayLocked.toLocaleString()}
            </span>
            <TeamLogo teamId={war.awayTeamId} color={war.awayTeamColor} size={20} />
          </div>
        </div>

        <div className="mb-3 flex h-1 overflow-hidden rounded-full bg-[#21262D]">
          <div
            className="h-full rounded-l-full"
            style={{
              width: `${homePercent}%`,
              backgroundColor: war.homeTeamColor,
            }}
          />
          <div
            className="h-full rounded-r-full"
            style={{
              width: `${100 - parseInt(homePercent)}%`,
              backgroundColor: war.awayTeamColor,
            }}
          />
        </div>

        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="text-[#768390]">Boost Pool</span>
          <span className="font-bold font-mono tabular-nums text-[#FDB913]">
            {war.boostPool.toLocaleString()} WIRE
          </span>
        </div>

        <Link
          href="/fan-wars"
          className="flex w-full items-center justify-center gap-1.5 rounded bg-[#E4002B] py-2 text-xs font-bold text-white transition-colors hover:bg-[#C00025]"
        >
          Lock Tokens
          <ArrowRight className="h-3 w-3" />
        </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score parsing — "187/4 (18.3)" → { runs: 187, wickets: 4, overs: "18.3" }
// ---------------------------------------------------------------------------

function parseScoreString(
  score: string | null | undefined,
): { runs: number; wickets: number; overs: string; runRate: number } | null {
  if (!score) return null;
  // Formats: "187/4 (18.3)" or "187-4 (18.3)" or just "187/4"
  const m = score.match(/^(\d+)[\/\-](\d+)\s*(?:\(([0-9.]+)\))?/);
  if (!m) return null;
  const runs = parseInt(m[1]!, 10);
  const wickets = parseInt(m[2]!, 10);
  const overs = m[3] ?? "0.0";
  // Calculate run rate: runs / overs (convert overs to decimal — 18.3 = 18 + 3/6)
  const overParts = overs.split(".");
  const decimalOvers =
    parseInt(overParts[0]!, 10) +
    (overParts[1] ? parseInt(overParts[1], 10) / 6 : 0);
  const runRate = decimalOvers > 0 ? runs / decimalOvers : 0;
  return { runs, wickets, overs, runRate };
}

/** Map an API MatchInfo to the UI MatchData shape, parsing real scores. */
function mapApiMatchToMatchData(m: MatchInfo, base: MatchData): MatchData {
  const team1Mock = PSL_TEAMS.find(
    (t) => t.id === m.team1Id || t.name === m.team1Name
  );
  const team2Mock = PSL_TEAMS.find(
    (t) => t.id === m.team2Id || t.name === m.team2Name
  );

  const score1 = parseScoreString(m.score1);
  const score2 = parseScoreString(m.score2);

  // Determine who is batting — if only score1 exists, team1 batted first.
  // If score2 exists, team2 is currently batting (2nd innings).
  const isSecondInnings = !!score2;

  const team1Data: BattingTeamData = {
    teamId: m.team1Id ?? base.team1.teamId,
    teamName: m.team1Name ?? base.team1.teamName,
    symbol: team1Mock?.symbol ?? base.team1.symbol,
    color: team1Mock?.color ?? base.team1.color,
    runs: score1?.runs ?? base.team1.runs,
    wickets: score1?.wickets ?? base.team1.wickets,
    overs: score1?.overs ?? base.team1.overs,
    runRate: score1?.runRate ?? base.team1.runRate,
    isBatting: !isSecondInnings,
  };

  const team2Data: BattingTeamData = {
    teamId: m.team2Id ?? base.team2.teamId,
    teamName: m.team2Name ?? base.team2.teamName,
    symbol: team2Mock?.symbol ?? base.team2.symbol,
    color: team2Mock?.color ?? base.team2.color,
    runs: score2?.runs ?? base.team2.runs,
    wickets: score2?.wickets ?? base.team2.wickets,
    overs: score2?.overs ?? base.team2.overs,
    runRate: score2?.runRate ?? base.team2.runRate,
    isBatting: isSecondInnings,
  };

  // If 2nd innings, add target and required run rate
  if (isSecondInnings && score1) {
    team2Data.target = score1.runs + 1;
    const overParts = (score2?.overs ?? "0.0").split(".");
    const bowled =
      parseInt(overParts[0]!, 10) +
      (overParts[1] ? parseInt(overParts[1], 10) / 6 : 0);
    const remaining = 20 - bowled;
    const runsNeeded = (score1.runs + 1) - (score2?.runs ?? 0);
    team2Data.requiredRunRate = remaining > 0 ? runsNeeded / remaining : 99.99;
  }

  // Current over = the batting team's overs
  const battingTeam = isSecondInnings ? team2Data : team1Data;
  const currentOver = battingTeam.overs;

  return {
    id: m.id,
    status: m.status,
    matchType: m.cricApiName || base.matchType,
    venue: m.venue || base.venue,
    currentBowler: base.currentBowler,
    currentOver,
    upsetScore: m.upsetScore ?? base.upsetScore,
    vaultBalance: base.vaultBalance,
    team1: team1Data,
    team2: team2Data,
  };
}

export default function MatchPage() {
  const prefersReduced = useReducedMotion();
  const [activeChart, setActiveChart] = useState<string>(LIVE_MATCH.team1.teamId);
  const [matchData, setMatchData] = useState<MatchData>(LIVE_MATCH);
  const [upcomingMatch, setUpcomingMatch] = useState<MatchInfo | null>(null);
  const [lastCompleted, setLastCompleted] = useState<MatchInfo | null>(null);
  const [hasLiveMatch, setHasLiveMatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  // Derive dynamic team IDs from current match data
  const team1Id = matchData.team1.teamId;
  const team2Id = matchData.team2.teamId;
  const team1 = PSL_TEAMS.find((t) => t.id === team1Id);
  const team2 = PSL_TEAMS.find((t) => t.id === team2Id);

  // Fetch live match data from API
  const fetchLiveData = useCallback(async () => {
    try {
      const liveMatches = await api.matches.getLive();
      if (liveMatches && liveMatches.length > 0) {
        setHasLiveMatch(true);
        const live = liveMatches[0];
        setMatchData((prev) => {
          const next = mapApiMatchToMatchData(live, prev);
          // Skip update if scores haven't changed (prevents flicker)
          if (prev.team1.runs === next.team1.runs &&
              prev.team1.wickets === next.team1.wickets &&
              prev.team2.runs === next.team2.runs &&
              prev.team2.wickets === next.team2.wickets &&
              prev.status === next.status) {
            return prev;
          }
          return next;
        });
        // Default chart to team1 of the live match
        const t1 = live.team1Id || LIVE_MATCH.team1.teamId;
        setActiveChart((prev) => {
          // Only reset if the current teams changed
          if (prev !== t1 && prev !== (live.team2Id || LIVE_MATCH.team2.teamId)) {
            return t1;
          }
          return prev;
        });
        return true;
      } else {
        setHasLiveMatch(false);
        try {
          const upcoming = await api.matches.getUpcoming();
          if (upcoming && upcoming.length > 0) {
            setUpcomingMatch(upcoming[0]);
          }
        } catch (err) {
          console.warn('[Match] fetch error:', err);
        }
        try {
          const completed = await api.matches.getCompleted();
          if (completed && completed.length > 0) {
            setLastCompleted(completed[0]);
          }
        } catch (err) {
          console.warn('[Match] fetch error:', err);
        }
        return false;
      }
    } catch (err) {
      console.warn('[Match] fetch error:', err);
      return false;
    }
  }, []);

  // Adaptive poll interval — ref so the visibility handler always uses the latest value
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasLiveMatchRef = useRef(hasLiveMatch);
  hasLiveMatchRef.current = hasLiveMatch;

  // Initial fetch + polling interval + WebSocket + visibility-aware polling
  useEffect(() => {
    let cancelled = false;

    const getPollMs = () => (hasLiveMatchRef.current ? LIVE_POLL_MS : IDLE_POLL_MS);

    const startPolling = () => {
      if (pollIntervalRef.current) return; // already running
      pollIntervalRef.current = setInterval(() => {
        if (!cancelled) fetchLiveData();
      }, getPollMs());
    };

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    // Pause polling when tab is hidden, resume when visible
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Fetch immediately on tab return, then resume interval
        if (!cancelled) fetchLiveData();
        startPolling();
      }
    };

    // 1) Initial fetch
    (async () => {
      await fetchLiveData();
      if (!cancelled) setLoading(false);
    })();

    // 2) Polling is owned by the hasLiveMatch effect — skip here

    // 3) Listen for visibility changes to pause/resume polling
    document.addEventListener("visibilitychange", handleVisibility);

    // 4) Connect WebSocket for real-time score pushes (shared singleton)
    const socket = getSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      // WebSocket connected
    });

    // Backend emits this with CricAPI live score data
    socket.on("match:liveScore", (data: {
      cricApiId: string;
      name: string;
      status: string;
      teams: string[];
      score: Array<{ r: number; w: number; o: number; inning: string }>;
      venue: string;
      matchType: string;
    }) => {
      if (cancelled) return;

      // Parse scores from the raw CricAPI format
      const score1 = data.score[0]
        ? `${data.score[0].r}/${data.score[0].w} (${data.score[0].o})`
        : null;
      const score2 = data.score[1]
        ? `${data.score[1].r}/${data.score[1].w} (${data.score[1].o})`
        : null;

      // Resolve team IDs from team names
      const team1Mock = PSL_TEAMS.find(
        (t) => data.teams[0]?.toLowerCase().includes(t.name.toLowerCase())
      );
      const team2Mock = PSL_TEAMS.find(
        (t) => data.teams[1]?.toLowerCase().includes(t.name.toLowerCase())
      );

      const liveInfo: MatchInfo = {
        id: data.cricApiId,
        team1Id: team1Mock?.id ?? data.teams[0] ?? "",
        team1Name: data.teams[0] ?? "",
        team2Id: team2Mock?.id ?? data.teams[1] ?? "",
        team2Name: data.teams[1] ?? "",
        status: "live",
        venue: data.venue ?? "",
        startTime: "",
        score1: score1 ?? undefined,
        score2: score2 ?? undefined,
      };

      setHasLiveMatch(true);
      setMatchData((prev) => mapApiMatchToMatchData(liveInfo, prev));
    });

    // Backend emits this for mock ball-by-ball updates
    socket.on("match:ball", () => {
      if (!cancelled) fetchLiveData();
    });

    // Backend emits this when match status changes (LIVE → COMPLETED)
    socket.on("match:status", () => {
      if (!cancelled) fetchLiveData();
    });

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
      socket.off("connect");
      socket.off("match:liveScore");
      socket.off("match:ball");
      socket.off("match:status");
      socketRef.current = null;
    };
  }, [fetchLiveData]);

  // When hasLiveMatch changes, restart polling with the appropriate interval
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    const interval = hasLiveMatch ? LIVE_POLL_MS : IDLE_POLL_MS;
    pollIntervalRef.current = setInterval(() => fetchLiveData(), interval);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hasLiveMatch, fetchLiveData]);

  // Build the two-team array for chart switcher and trading buttons
  const matchTeams = [
    { id: team1Id, team: team1 },
    { id: team2Id, team: team2 },
  ];

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="min-h-screen bg-[#0D1117]"
    >
      <h1 className="sr-only">Live Match</h1>
      {/* Match status header */}
      <div className="border-b border-[#21262D] bg-[#161B22]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {hasLiveMatch ? (
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F85149]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F85149] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F85149]" />
                </span>
                LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#9CA3AF]" />
                </span>
                UPCOMING
              </span>
            )}
            <span className="text-sm font-semibold text-[#E6EDF3]">
              {hasLiveMatch ? matchData.matchType : upcomingMatch ? "Next Match" : "PSL 2026"}
            </span>
            <span className="hidden sm:block text-xs text-[#9CA3AF]">
              {hasLiveMatch ? matchData.venue : upcomingMatch?.venue ?? "Pakistan Super League"}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex items-center justify-center" role="status">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#21262D] border-t-[#9CA3AF]" />
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      ) : !hasLiveMatch ? (
        /* No live match — show upcoming match info and trading UI */
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Last completed match result */}
          {lastCompleted && (() => {
            const t1 = PSL_TEAMS.find((t) => t.id === lastCompleted.team1Id);
            const t2 = PSL_TEAMS.find((t) => t.id === lastCompleted.team2Id);
            const t1Color = lastCompleted.team1Color ?? t1?.color ?? "#58A6FF";
            const t2Color = lastCompleted.team2Color ?? t2?.color ?? "#58A6FF";
            const isTeam1Winner = lastCompleted.winnerId === lastCompleted.team1Id;
            const isTeam2Winner = lastCompleted.winnerId === lastCompleted.team2Id;
            const endDate = lastCompleted.endTime
              ? new Date(lastCompleted.endTime)
              : new Date(lastCompleted.startTime);

            return (
              <div className="mb-4 rounded-xl border border-[#21262D] bg-[#161B22] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#768390]">
                    Last Result
                  </span>
                  {lastCompleted.cricApiName && (
                    <span className="text-[10px] text-[#768390] truncate max-w-[200px]">
                      {lastCompleted.cricApiName}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Team 1 */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <TeamLogo teamId={lastCompleted.team1Id} color={t1Color} size={32} />
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-bold truncate",
                        isTeam1Winner ? "text-[#3FB950]" : "text-[#E6EDF3]"
                      )}>
                        {lastCompleted.team1Name}
                      </p>
                      {lastCompleted.score1 && (
                        <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-[#E6EDF3] truncate">
                          {lastCompleted.score1}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* VS divider */}
                  <span className="flex-shrink-0 text-xs font-bold text-[#768390]">vs</span>

                  {/* Team 2 */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-row-reverse text-right">
                    <TeamLogo teamId={lastCompleted.team2Id} color={t2Color} size={32} />
                    <div className="min-w-0">
                      <p className={cn(
                        "text-sm font-bold truncate",
                        isTeam2Winner ? "text-[#3FB950]" : "text-[#E6EDF3]"
                      )}>
                        {lastCompleted.team2Name}
                      </p>
                      {lastCompleted.score2 && (
                        <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-[#E6EDF3] truncate">
                          {lastCompleted.score2}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Venue + Date */}
                <div className="mt-3 flex items-center justify-between text-xs text-[#9CA3AF]">
                  {lastCompleted.venue && (
                    <span className="truncate max-w-[60%]">{lastCompleted.venue}</span>
                  )}
                  <span className="flex-shrink-0">
                    {endDate.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="mb-6 rounded-xl border border-[#21262D] bg-[#161B22] p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#768390]">
              No live match
            </p>
            {upcomingMatch ? (
              <>
                <h2 className="text-base sm:text-lg font-bold text-[#E6EDF3] break-words">
                  Next match: {upcomingMatch.team1Name} vs {upcomingMatch.team2Name}
                </h2>
                <p className="mt-1 text-sm text-[#9CA3AF]">
                  {upcomingMatch.venue
                    ? `${upcomingMatch.venue} — `
                    : ""}
                  {new Date(upcomingMatch.startTime).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </>
            ) : (
              <h2 className="text-lg font-bold text-[#E6EDF3]">
                Check back soon for the next PSL match
              </h2>
            )}
          </div>

          {/* Trading UI — scorecard hidden when no live data */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {lastCompleted && (
                <div className="rounded-lg border border-[#21262D] bg-[#161B22] px-4 py-2 text-xs text-[#768390]">
                  Scorecard shows the last completed match above. Live scorecard will appear when a match is in progress.
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="ml-auto flex items-center gap-1">
                    {matchTeams.map(({ id, team: t }) => (
                      <button
                        key={id}
                        onClick={() => setActiveChart(id)}
                        className={cn(
                          "rounded px-2.5 py-1.5 min-h-[44px] sm:min-h-0 text-xs font-semibold transition-all",
                          activeChart === id
                            ? "text-white"
                            : "bg-transparent text-[#9CA3AF] hover:text-[#E6EDF3]"
                        )}
                        style={activeChart === id ? { backgroundColor: t?.color ?? "#58A6FF" } : {}}
                      >
                        {t?.symbol ?? `$${id}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <TradingChart
                    data={CANDLESTICK_DATA[activeChart] ?? []}
                    teamColor={PSL_TEAMS.find((t) => t.id === activeChart)?.color ?? "#58A6FF"}
                    height={280}
                  />
                </div>
              </div>
              <BallByBall events={BALL_BY_BALL} simulateLive={!hasLiveMatch} />
            </div>
            <div className="space-y-4">
              <UpsetScoreTracker score={matchData.upsetScore} vaultBalance={matchData.vaultBalance} />
              <MatchTradingButtons team1Id={team1Id} team2Id={team2Id} />
              <FanWarWidget team1Id={team1Id} team2Id={team2Id} />
              <UpsetVaultDisplay
                balance={VAULT_DATA.currentBalance}
                multiplier={VAULT_DATA.currentMultiplier}
                nextMatchTime={VAULT_DATA.nextMatchCountdown}
              />
              <AIAnalysis
                teamA={matchData.team1.teamId}
                teamB={matchData.team2.teamId}
                matchContext={matchData.matchType}
                defaultOpen={false}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left column */}
            <div className="space-y-6">
              <AnimatedGradientBorder
                active={hasLiveMatch}
                gradientColors={["#21262D", "#E4002B", "#21262D", "#F85149", "#21262D"]}
                duration={3}
                borderWidth={1}
                containerClassName="rounded-xl"
              >
                <div className="relative overflow-hidden">
                  <Meteors number={6} className="opacity-30" />
                  <LiveScorecard match={matchData} />
                </div>
              </AnimatedGradientBorder>

              {/* Price chart with team switcher */}
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="ml-auto flex items-center gap-1">
                    {matchTeams.map(({ id, team: t }) => (
                      <button
                        key={id}
                        onClick={() => setActiveChart(id)}
                        className={cn(
                          "rounded px-2.5 py-1.5 min-h-[44px] sm:min-h-0 text-xs font-semibold transition-all",
                          activeChart === id
                            ? "text-white"
                            : "bg-transparent text-[#9CA3AF] hover:text-[#E6EDF3]"
                        )}
                        style={
                          activeChart === id
                            ? { backgroundColor: t?.color ?? "#58A6FF" }
                            : {}
                        }
                      >
                        {t?.symbol ?? `$${id}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <TradingChart
                    data={CANDLESTICK_DATA[activeChart] ?? []}
                    teamColor={PSL_TEAMS.find((t) => t.id === activeChart)?.color ?? "#58A6FF"}
                    height={280}
                  />
                </div>
              </div>

              {/* Ball by ball */}
              <BallByBall events={BALL_BY_BALL} simulateLive={!hasLiveMatch} />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <UpsetScoreTracker score={matchData.upsetScore} vaultBalance={matchData.vaultBalance} />
              <MatchTradingButtons team1Id={team1Id} team2Id={team2Id} />
              <FanWarWidget team1Id={team1Id} team2Id={team2Id} />
              <UpsetVaultDisplay
                balance={VAULT_DATA.currentBalance}
                multiplier={VAULT_DATA.currentMultiplier}
                nextMatchTime={VAULT_DATA.nextMatchCountdown}
              />
              <AIAnalysis
                teamA={matchData.team1.teamId}
                teamB={matchData.team2.teamId}
                matchContext={matchData.matchType}
                defaultOpen={false}
              />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
