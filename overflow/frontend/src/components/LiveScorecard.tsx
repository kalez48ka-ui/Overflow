"use client";

import { motion } from "framer-motion";
import { Activity, Target } from "lucide-react";
import type { MatchData } from "@/types";
import { hexToRgba } from "@/lib/utils";

interface LiveScorecardProps {
  match: MatchData;
}

export function LiveScorecard({ match }: LiveScorecardProps) {
  const { team1, team2 } = match;
  const battingTeam = team1.isBatting ? team1 : team2;
  const bowlingTeam = team1.isBatting ? team2 : team1;

  return (
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-3">
        <div className="flex items-center gap-2">
          {match.status === "live" ? (
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F85149] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F85149]" />
              </span>
              <span className="text-xs font-semibold text-[#F85149] uppercase tracking-wider">
                LIVE
              </span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider">
              {match.status === "completed" ? "COMPLETED" : "DEMO"}
            </span>
          )}
          <span className="text-xs text-[#8B949E]">{match.matchType}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#8B949E]">
          <Activity className="h-3 w-3" />
          Over {match.currentOver}
        </div>
      </div>

      {/* Venue */}
      <div className="border-b border-[#30363D] px-4 py-2">
        <p className="text-[10px] text-[#8B949E] text-center">{match.venue}</p>
      </div>

      {/* Scores */}
      <div className="p-4 space-y-3">
        {/* Batting team */}
        <div
          className="rounded-xl p-4"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(battingTeam.color, 0.12)}, ${hexToRgba(battingTeam.color, 0.04)})`,
            border: `1px solid ${hexToRgba(battingTeam.color, 0.3)}`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: battingTeam.color }}
              >
                {battingTeam.teamId}
              </div>
              <div>
                <p className="text-xs text-[#8B949E]">BATTING</p>
                <p className="text-sm font-semibold text-[#E6EDF3]">{battingTeam.teamName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-[#E6EDF3]">
                {battingTeam.runs}
                <span className="text-xl text-[#8B949E]">/{battingTeam.wickets}</span>
              </p>
              <p className="text-xs text-[#8B949E]">{battingTeam.overs} overs</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-[#0D1117]/40 px-3 py-2">
              <p className="text-[10px] text-[#8B949E]">Run Rate</p>
              <p className="text-sm font-bold text-[#E6EDF3]">{battingTeam.runRate.toFixed(2)}</p>
            </div>
            {battingTeam.target && (
              <div className="rounded-lg bg-[#0D1117]/40 px-3 py-2">
                <p className="text-[10px] text-[#8B949E]">Target</p>
                <p className="text-sm font-bold text-[#E6EDF3]">{battingTeam.target}</p>
              </div>
            )}
            {battingTeam.requiredRunRate != null && (
              <div className="rounded-lg bg-[#0D1117]/40 px-3 py-2">
                <p className="text-[10px] text-[#8B949E]">Req. RR</p>
                <p
                  className="text-sm font-bold"
                  style={{
                    color:
                      battingTeam.requiredRunRate > battingTeam.runRate
                        ? "#F85149"
                        : "#3FB950",
                  }}
                >
                  {battingTeam.requiredRunRate.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* VS divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#30363D]" />
          <span className="text-xs font-bold text-[#8B949E]">VS</span>
          <div className="flex-1 h-px bg-[#30363D]" />
        </div>

        {/* Bowling team */}
        <div className="rounded-xl border border-[#30363D] p-4 bg-[#0D1117]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: bowlingTeam.color }}
              >
                {bowlingTeam.teamId}
              </div>
              <div>
                <p className="text-xs text-[#8B949E]">BOWLING / BAT 1ST</p>
                <p className="text-sm font-semibold text-[#E6EDF3]">{bowlingTeam.teamName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-[#8B949E]">
                {bowlingTeam.runs}
                <span className="text-lg">/{bowlingTeam.wickets}</span>
              </p>
              <p className="text-xs text-[#8B949E]">{bowlingTeam.overs} ov</p>
            </div>
          </div>
        </div>

        {/* Bowler info */}
        <div className="flex items-center justify-between rounded-lg bg-[#0D1117] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-[#8B949E]" />
            <span className="text-xs text-[#8B949E]">Current Bowler</span>
          </div>
          <span className="text-xs font-semibold text-[#E6EDF3]">{match.currentBowler}</span>
        </div>
      </div>
    </div>
  );
}
