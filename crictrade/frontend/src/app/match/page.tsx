"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  Shield,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { LiveScorecard } from "@/components/LiveScorecard";
import { BallByBall } from "@/components/BallByBall";
import { TradingChart } from "@/components/TradingChart";
import { UpsetVaultDisplay } from "@/components/UpsetVaultDisplay";
import { AIAnalysis } from "@/components/AIAnalysis";
import { LIVE_MATCH, BALL_BY_BALL, CANDLESTICK_DATA, PSL_TEAMS, VAULT_DATA } from "@/lib/mockData";
import { api } from "@/lib/api";
import type { MatchInfo } from "@/lib/api";
import type { MatchData, BattingTeamData } from "@/types";
import { cn, formatPrice, formatPercent, formatCurrency } from "@/lib/utils";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const POLL_INTERVAL_MS = 30_000; // 30s — same as backend polling

function AiAnalysisPanel() {
  const signals = [
    {
      type: "UPSET_RISK",
      confidence: 68,
      desc: "IU's batting surge in overs 15-18 indicates high upset probability",
      color: "#F85149",
      icon: AlertTriangle,
    },
    {
      type: "BUY_SIGNAL",
      confidence: 74,
      desc: "$IU token underpriced relative to current match situation",
      color: "#3FB950",
      icon: TrendingUp,
    },
    {
      type: "VAULT_TRIGGER",
      confidence: 61,
      desc: "If IU wins, Upset Vault triggers at 1.8x multiplier",
      color: "#6A0DAD",
      icon: Shield,
    },
  ];

  return (
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#30363D] px-4 py-3">
        <Brain className="h-4 w-4 text-[#58A6FF]" />
        <h3 className="text-sm font-semibold text-[#E6EDF3]">AI Analysis</h3>
        <span className="ml-auto rounded-full bg-[#58A6FF]/10 border border-[#58A6FF]/30 px-2 py-0.5 text-[10px] font-medium text-[#58A6FF]">
          Live Engine
        </span>
      </div>
      <div className="p-4 space-y-3">
        {signals.map((signal) => (
          <motion.div
            key={signal.type}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-lg border p-3"
            style={{
              borderColor: `${signal.color}30`,
              backgroundColor: `${signal.color}08`,
            }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <signal.icon className="h-3.5 w-3.5" style={{ color: signal.color }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: signal.color }}
                >
                  {signal.type}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#21262D]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${signal.confidence}%`,
                      backgroundColor: signal.color,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#8B949E]">
                  {signal.confidence}%
                </span>
              </div>
            </div>
            <p className="text-xs text-[#8B949E]">{signal.desc}</p>
          </motion.div>
        ))}

        <div className="rounded-lg bg-[#0D1117] px-3 py-2">
          <p className="text-[10px] text-[#8B949E]">
            AI engine powered by LightGBM + GNN models trained on PSL historical data.
            Signals update every 6 balls.
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchTradingButtons() {
  const teams = [
    { id: "IU", name: "Islamabad United", symbol: "$IU", color: "#E4002B", price: 0.0842, change: 12.4 },
    { id: "LQ", name: "Lahore Qalandars", symbol: "$LQ", color: "#00A651", price: 0.0631, change: -3.2 },
  ];

  return (
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[#E6EDF3]">Quick Trade</h3>
      <div className="grid grid-cols-2 gap-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="rounded-lg border p-3"
            style={{ borderColor: `${team.color}30` }}
          >
            <div className="mb-2 flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: team.color }}
              >
                {team.id}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#E6EDF3]">{team.symbol}</p>
                <p className="text-[10px] text-[#8B949E]">${formatPrice(team.price)}</p>
              </div>
            </div>
            <p className={cn(
              "mb-2 text-xs font-medium",
              team.change >= 0 ? "text-[#3FB950]" : "text-[#F85149]"
            )}>
              {formatPercent(team.change)}
            </p>
            <div className="grid grid-cols-2 gap-1">
              <Link
                href={`/trade/${team.id.toLowerCase()}`}
                className="rounded-md bg-[#238636] py-1.5 text-center text-[10px] font-bold text-white hover:bg-[#2EA043] transition-colors"
              >
                Buy
              </Link>
              <Link
                href={`/trade/${team.id.toLowerCase()}`}
                className="rounded-md bg-[#DA3633] py-1.5 text-center text-[10px] font-bold text-white hover:bg-[#F85149] transition-colors"
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
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#FDB913]" />
          <h3 className="text-sm font-semibold text-[#E6EDF3]">Upset Score</h3>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ color: levelColor, backgroundColor: `${levelColor}15` }}
        >
          {level}
        </span>
      </div>

      <div className="mb-3 text-center">
        <p className="text-5xl font-black tabular-nums" style={{ color: levelColor }}>
          {score}
        </p>
        <p className="text-xs text-[#8B949E]">out of 100</p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-[#21262D]">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(to right, #3FB950, #FDB913, #F85149)`,
            width: `${score}%`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-[#0D1117] py-2">
          <p className="text-[10px] text-[#8B949E]">Vault Multiplier</p>
          <p className="text-sm font-bold text-[#6A0DAD]">1.8x</p>
        </div>
        <div className="rounded-lg bg-[#0D1117] py-2">
          <p className="text-[10px] text-[#8B949E]">Potential Payout</p>
          <p className="text-sm font-bold text-[#E6EDF3]">
            {formatCurrency(vaultBalance * 1.8)}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Map an API MatchInfo to the UI MatchData shape using mock team colors as fallback. */
function mapApiMatchToMatchData(m: MatchInfo, base: MatchData): MatchData {
  const team1Mock = PSL_TEAMS.find(
    (t) => t.id === m.team1Id || t.name === m.team1Name
  );
  const team2Mock = PSL_TEAMS.find(
    (t) => t.id === m.team2Id || t.name === m.team2Name
  );

  return {
    ...base,
    id: m.id,
    status: m.status,
    venue: m.venue ?? base.venue,
    upsetScore: m.upsetScore ?? base.upsetScore,
    team1: {
      ...base.team1,
      teamId: m.team1Id,
      teamName: m.team1Name,
      color: team1Mock?.color ?? base.team1.color,
      symbol: team1Mock?.symbol ?? base.team1.symbol,
    },
    team2: {
      ...base.team2,
      teamId: m.team2Id,
      teamName: m.team2Name,
      color: team2Mock?.color ?? base.team2.color,
      symbol: team2Mock?.symbol ?? base.team2.symbol,
    },
  };
}

export default function MatchPage() {
  const [activeChart, setActiveChart] = useState<"IU" | "LQ">("IU");
  const [matchData, setMatchData] = useState<MatchData>(LIVE_MATCH);
  const [upcomingMatch, setUpcomingMatch] = useState<MatchInfo | null>(null);
  const [hasLiveMatch, setHasLiveMatch] = useState(true); // optimistic — flips to false if API says no live
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // First try live matches
        const liveMatches = await api.matches.getLive();

        if (cancelled) return;

        if (liveMatches && liveMatches.length > 0) {
          setHasLiveMatch(true);
          setMatchData(mapApiMatchToMatchData(liveMatches[0], LIVE_MATCH));
        } else {
          // No live match — fetch upcoming and show next match card
          setHasLiveMatch(false);
          try {
            const upcoming = await api.matches.getUpcoming();
            if (!cancelled && upcoming && upcoming.length > 0) {
              setUpcomingMatch(upcoming[0]);
            }
          } catch {
            // Upcoming fetch failed — upcomingMatch stays null, UI shows generic message
          }
        }
      } catch {
        // API down entirely — keep mock live data and hasLiveMatch=true (best-effort display)
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const iuTeam = PSL_TEAMS.find((t) => t.id === "IU")!;
  const lqTeam = PSL_TEAMS.find((t) => t.id === "LQ")!;

  return (
    <div className="min-h-screen bg-[#0D1117]">
      {/* Match status header */}
      <div className="border-b border-[#30363D] bg-[#161B22]">
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
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#30363D] border-t-[#58A6FF]" />
            <span className="ml-3 text-sm text-[#8B949E]">Loading match data...</span>
          </div>
        </div>
      ) : !hasLiveMatch ? (
        /* No live match — show upcoming match info and trading UI */
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="mb-6 rounded-xl border border-[#58A6FF]/30 bg-[#58A6FF]/05 p-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#58A6FF]">
              No live match right now
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
              <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
                <div className="flex items-center gap-2 border-b border-[#30363D] px-4 py-3">
                  <span className="text-sm font-medium text-[#E6EDF3]">Price Chart</span>
                  <div className="ml-auto flex items-center gap-1">
                    {(["IU", "LQ"] as const).map((id) => {
                      const team = PSL_TEAMS.find((t) => t.id === id)!;
                      return (
                        <button
                          key={id}
                          onClick={() => setActiveChart(id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                            activeChart === id
                              ? "text-white"
                              : "bg-transparent text-[#8B949E] hover:text-[#E6EDF3]"
                          )}
                          style={activeChart === id ? { backgroundColor: team.color } : {}}
                        >
                          {team.symbol}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="p-2">
                  <TradingChart
                    data={CANDLESTICK_DATA[activeChart]}
                    teamColor={PSL_TEAMS.find((t) => t.id === activeChart)!.color}
                    height={280}
                  />
                </div>
              </div>
              <BallByBall events={BALL_BY_BALL} />
            </div>
            <div className="space-y-4">
              <UpsetScoreTracker score={matchData.upsetScore} vaultBalance={matchData.vaultBalance} />
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
              <MatchTradingButtons />
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            {/* Left column */}
            <div className="space-y-4">
              {/* Scorecard */}
              <LiveScorecard match={matchData} />

              {/* Price chart with team switcher */}
              <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
                <div className="flex items-center gap-2 border-b border-[#30363D] px-4 py-3">
                  <span className="text-sm font-medium text-[#E6EDF3]">Price Chart</span>
                  <div className="ml-auto flex items-center gap-1">
                    {[
                      { id: "IU" as const, team: iuTeam },
                      { id: "LQ" as const, team: lqTeam },
                    ].map(({ id, team }) => (
                      <button
                        key={id}
                        onClick={() => setActiveChart(id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                          activeChart === id
                            ? "text-white"
                            : "bg-transparent text-[#8B949E] hover:text-[#E6EDF3]"
                        )}
                        style={
                          activeChart === id
                            ? { backgroundColor: team.color }
                            : {}
                        }
                      >
                        {team.symbol}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2">
                  <TradingChart
                    data={CANDLESTICK_DATA[activeChart]}
                    teamColor={activeChart === "IU" ? iuTeam.color : lqTeam.color}
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
              <MatchTradingButtons />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
