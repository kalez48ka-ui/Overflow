"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { LiveScorecard } from "@/components/LiveScorecard";
import { BallByBall } from "@/components/BallByBall";
import { TradingChart } from "@/components/TradingChart";
import { UpsetVaultDisplay } from "@/components/UpsetVaultDisplay";
import { AIAnalysis } from "@/components/AIAnalysis";
import { CountUp } from "@/components/motion";
import { LIVE_MATCH, BALL_BY_BALL, CANDLESTICK_DATA, PSL_TEAMS, VAULT_DATA, MOCK_FAN_WARS } from "@/lib/mockData";
import { fanWarsApi } from "@/lib/api";
import type { FanWarStatus } from "@/lib/api";
import { api } from "@/lib/api";
import type { MatchInfo } from "@/lib/api";
import type { MatchData, BattingTeamData } from "@/types";
import { cn, formatPrice, formatPercent, formatCurrency } from "@/lib/utils";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const POLL_INTERVAL_MS = 10_000; // 10s — matches backend fast polling for live matches



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
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: team.color }}
              >
                {team.id}
              </div>
              <div>
                <span className="text-xs font-semibold text-[#E6EDF3]">{team.symbol}</span>
                <span className="ml-1.5 text-[10px] font-mono tabular-nums text-[#8B949E]">${formatPrice(team.price)}</span>
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
                className="rounded bg-[#238636] py-2 text-center text-xs font-bold text-white hover:bg-[#2EA043] transition-colors"
              >
                Buy
              </Link>
              <Link
                href={`/trade/${team.symbol.replace('$', '').toLowerCase()}`}
                className="rounded bg-[#DA3633] py-2 text-center text-xs font-bold text-white hover:bg-[#F85149] transition-colors"
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
        <span className="text-xs text-[#8B949E]">Upset Score</span>
        <span
          className="text-[10px] font-bold font-mono"
          style={{ color: levelColor }}
        >
          {level}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-4xl font-black font-mono tabular-nums" style={{ color: levelColor }}>
          <CountUp value={score} duration={1.5} />
        </span>
        <span className="text-xs text-[#484F58]">/ 100</span>
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
          <span className="text-[#484F58]">Multiplier </span>
          <span className="font-bold font-mono tabular-nums text-[#E6EDF3]">1.8x</span>
        </div>
        <div>
          <span className="text-[#484F58]">Payout </span>
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
      } catch {
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
          <span className="text-xs text-[#8B949E]">Fan War</span>
          <span className="text-[10px] font-bold font-mono text-[#F85149]">
            ACTIVE
          </span>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
              style={{ backgroundColor: war.homeTeamColor }}
            >
              {war.homeTeamId}
            </div>
            <span className="font-mono tabular-nums text-[#E6EDF3]">
              {war.totalHomeLocked.toLocaleString()}
            </span>
          </div>
          <span className="text-[#484F58]">vs</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-[#E6EDF3]">
              {war.totalAwayLocked.toLocaleString()}
            </span>
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold text-white"
              style={{ backgroundColor: war.awayTeamColor }}
            >
              {war.awayTeamId}
            </div>
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
          <span className="text-[#484F58]">Boost Pool</span>
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
  const [activeChart, setActiveChart] = useState<string>(LIVE_MATCH.team1.teamId);
  const [matchData, setMatchData] = useState<MatchData>(LIVE_MATCH);
  const [upcomingMatch, setUpcomingMatch] = useState<MatchInfo | null>(null);
  const [hasLiveMatch, setHasLiveMatch] = useState(true);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

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
        setMatchData((prev) => mapApiMatchToMatchData(live, prev));
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
        } catch {
          // Upcoming fetch failed — non-critical
        }
        return false;
      }
    } catch {
      // API down — keep existing state
      return false;
    }
  }, []);

  // Initial fetch + polling interval + WebSocket
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    // 1) Initial fetch
    (async () => {
      await fetchLiveData();
      if (!cancelled) setLoading(false);
    })();

    // 2) Poll every 30s as fallback (in case WebSocket drops)
    pollTimer = setInterval(() => {
      if (!cancelled) fetchLiveData();
    }, POLL_INTERVAL_MS);

    // 3) Connect WebSocket for real-time score pushes
    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Match] WebSocket connected");
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
      if (pollTimer) clearInterval(pollTimer);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [fetchLiveData]);

  // Build the two-team array for chart switcher and trading buttons
  const matchTeams = [
    { id: team1Id, team: team1 },
    { id: team2Id, team: team2 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="min-h-screen bg-[#0D1117]"
    >
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
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#8B949E]">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8B949E]" />
                </span>
                UPCOMING
              </span>
            )}
            <span className="text-sm font-semibold text-[#E6EDF3]">
              {matchData.matchType}
            </span>
            <span className="hidden sm:block text-xs text-[#8B949E]">
              {matchData.venue}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#21262D] border-t-[#8B949E]" />
          </div>
        </div>
      ) : !hasLiveMatch ? (
        /* No live match — show upcoming match info and trading UI */
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-6 rounded-xl border border-[#21262D] bg-[#161B22] p-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#484F58]">
              No live match
            </p>
            {upcomingMatch ? (
              <>
                <h2 className="text-lg font-bold text-[#E6EDF3]">
                  Next match: {upcomingMatch.team1Name} vs {upcomingMatch.team2Name}
                </h2>
                <p className="mt-1 text-sm text-[#8B949E]">
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

          {/* Still render the full trading UI with mock data so users can explore */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              <LiveScorecard match={matchData} />
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="ml-auto flex items-center gap-1">
                    {matchTeams.map(({ id, team: t }) => (
                      <button
                        key={id}
                        onClick={() => setActiveChart(id)}
                        className={cn(
                          "rounded px-2.5 py-1 text-xs font-semibold transition-all",
                          activeChart === id
                            ? "text-white"
                            : "bg-transparent text-[#8B949E] hover:text-[#E6EDF3]"
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
                    data={CANDLESTICK_DATA[activeChart] ?? CANDLESTICK_DATA["IU"]}
                    teamColor={PSL_TEAMS.find((t) => t.id === activeChart)?.color ?? "#58A6FF"}
                    height={280}
                  />
                </div>
              </div>
              <BallByBall events={BALL_BY_BALL} />
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
              <LiveScorecard match={matchData} />

              {/* Price chart with team switcher */}
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="ml-auto flex items-center gap-1">
                    {matchTeams.map(({ id, team: t }) => (
                      <button
                        key={id}
                        onClick={() => setActiveChart(id)}
                        className={cn(
                          "rounded px-2.5 py-1 text-xs font-semibold transition-all",
                          activeChart === id
                            ? "text-white"
                            : "bg-transparent text-[#8B949E] hover:text-[#E6EDF3]"
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
                    data={CANDLESTICK_DATA[activeChart] ?? CANDLESTICK_DATA["IU"]}
                    teamColor={PSL_TEAMS.find((t) => t.id === activeChart)?.color ?? "#58A6FF"}
                    height={280}
                  />
                </div>
              </div>

              {/* Ball by ball */}
              <BallByBall events={BALL_BY_BALL} />
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
