"use client";

import type { MatchData } from "@/types";
import { TextScramble } from "@/components/effects/TextScramble";
import { TeamLogo } from "@/components/TeamLogo";

interface LiveScorecardProps {
  match: MatchData;
}

export function LiveScorecard({ match }: LiveScorecardProps) {
  const { team1, team2 } = match;
  const battingTeam = team1.isBatting ? team1 : team2;
  const bowlingTeam = team1.isBatting ? team2 : team1;

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] overflow-hidden" aria-live="polite" aria-atomic="true">
      {/* Header strip */}
      <div className="flex items-center justify-between border-b border-[#21262D] px-4 py-2">
        <div className="flex items-center gap-2">
          {match.status === "live" ? (
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E4002B] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E4002B]" />
              </span>
              <span className="text-[10px] font-bold text-[#E4002B] uppercase tracking-wider">
                LIVE
              </span>
            </span>
          ) : (
            <span className="text-[10px] font-bold text-[#768390] uppercase tracking-wider">
              {match.status === "completed" ? "COMPLETED" : "DEMO"}
            </span>
          )}
          <span className="text-[10px] text-[#768390]">{match.venue}</span>
        </div>
        <span className="text-[10px] font-mono tabular-nums text-[#768390]">
          Ov {match.currentOver}
        </span>
      </div>

      {/* Scores */}
      <div className="p-4">
        {/* Batting team — dominant */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TeamLogo teamId={battingTeam.teamId} color={battingTeam.color} size={32} />
              <div>
                <p className="text-sm font-semibold text-[#E6EDF3]">{battingTeam.teamName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-[#E6EDF3]">
                <TextScramble
                  key={`${battingTeam.teamId}-${battingTeam.runs}-${battingTeam.wickets}`}
                  text={String(battingTeam.runs)}
                  speed={35}
                  scrambleSpeed={20}
                  resolvedColor="#E6EDF3"
                  scrambledColor="#9CA3AF"
                />
                <span className="text-xl sm:text-2xl text-[#9CA3AF]">/{battingTeam.wickets}</span>
              </p>
              <p className="text-[10px] font-mono tabular-nums text-[#768390]">{battingTeam.overs} ov &middot; RR {battingTeam.runRate.toFixed(2)}</p>
            </div>
          </div>
          {(battingTeam.target || battingTeam.requiredRunRate != null) && (
            <div className="mt-2 flex items-center gap-3 text-xs font-mono tabular-nums">
              {battingTeam.target && (
                <span className="text-[#9CA3AF]">Target <span className="font-bold text-[#E6EDF3]">{battingTeam.target}</span></span>
              )}
              {battingTeam.requiredRunRate != null && (
                <span>
                  <span className="text-[#9CA3AF]">Req </span>
                  <span
                    className="font-bold"
                    style={{
                      color:
                        battingTeam.requiredRunRate > battingTeam.runRate
                          ? "#F85149"
                          : "#3FB950",
                    }}
                  >
                    {battingTeam.requiredRunRate.toFixed(2)}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-[#21262D] mb-4" />

        {/* Bowling team — subdued */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TeamLogo teamId={bowlingTeam.teamId} color={bowlingTeam.color} size={28} className="opacity-70" />
            <p className="text-sm text-[#9CA3AF]">{bowlingTeam.teamName}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold font-mono tabular-nums text-[#9CA3AF]">
              {bowlingTeam.runs}
              <span className="text-base">/{bowlingTeam.wickets}</span>
            </p>
            <p className="text-[10px] font-mono tabular-nums text-[#768390]">{bowlingTeam.overs} ov</p>
          </div>
        </div>

        {/* Bowler */}
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-[#768390]">Bowling</span>
          <span className="font-medium text-[#9CA3AF]">{match.currentBowler}</span>
        </div>
      </div>
    </div>
  );
}
