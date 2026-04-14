"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Users,
  Trophy,
  Target,
  Coins,
} from "lucide-react";
import { useAccount } from "wagmi";
import { io } from "socket.io-client";
import { PredictionPoolCard } from "@/components/PredictionPoolCard";
import { LivePredictionBanner } from "@/components/LivePredictionBanner";
import { CountUp } from "@/components/motion";
import { predictionsApi } from "@/lib/api";
import type { PredictionPoolStatus, PredictionLeaderboardEntry } from "@/lib/api";
// Mock data available at @/lib/mockData if API is down
import { formatNumber, shortenAddress } from "@/lib/utils";
import { AnimatedGradientBorder } from "@/components/ui/animated-gradient-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { NumberTicker } from "@/components/ui/number-ticker";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PredictionsPage() {
  const { address, isConnected } = useAccount();

  const [pools, setPools] = useState<PredictionPoolStatus[]>([]);
  const [userPredictions, setUserPredictions] = useState<PredictionPoolStatus[]>([]);
  const [leaderboard, setLeaderboard] = useState<PredictionLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived data
  const activePools = pools.filter(
    (p) => p.status === "OPEN" || p.status === "LIVE",
  );
  const settledPools = pools.filter((p) => p.status === "SETTLED");
  const totalPrizePool = pools.reduce((sum, p) => sum + Number(p.totalPool ?? 0), 0);
  const topAccuracy = leaderboard.length > 0 ? Number(leaderboard[0]?.avgScore ?? 0) : 0;

  // Find any live question for the banner
  const livePool = pools.find((p) => p.status === "LIVE");
  const liveQuestion = livePool?.questions?.find(
    (q) => q.isLive && !q.resolved && new Date(q.deadline).getTime() > Date.now(),
  );

  // Fetch data
  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      const results = await Promise.allSettled([
        predictionsApi.getActivePools(signal),
        isConnected && address
          ? predictionsApi.getUserPredictions(address, signal)
          : Promise.resolve([]),
        predictionsApi.getLeaderboard(10, signal),
      ]);

      if (results[0].status === "fulfilled") {
        setPools(results[0].value ?? []);
      }
      if (results[1].status === "fulfilled") {
        setUserPredictions(results[1].value ?? []);
      }
      if (results[2].status === "fulfilled") {
        setLeaderboard(results[2].value ?? []);
      }
      setLoading(false);
    },
    [address, isConnected],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // Real-time updates via Socket.io
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socket.on(
      "prediction:entry",
      (data: { matchId: string; participantCount: number; totalPool: number }) => {
        setPools((prev) =>
          prev.map((p) => {
            if (p.matchId !== data.matchId) return p;
            return {
              ...p,
              participantCount: data.participantCount,
              totalPool: data.totalPool,
            };
          }),
        );
      },
    );

    socket.on(
      "prediction:live-question",
      (data: { matchId: string; question: PredictionPoolStatus["questions"][0] }) => {
        setPools((prev) =>
          prev.map((p) => {
            if (p.matchId !== data.matchId) return p;
            return {
              ...p,
              questions: (p.questions ?? []).map((q) =>
                q.questionIndex === data.question.questionIndex
                  ? data.question
                  : q,
              ),
            };
          }),
        );
      },
    );

    socket.on("prediction:settled", () => {
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0D1117]"
    >
      {/* Live Question Banner */}
      {livePool && liveQuestion && (
        <LivePredictionBanner
          matchId={livePool.matchId}
          question={liveQuestion}
          bonusPoints={liveQuestion.points}
        />
      )}

      {/* Hero Header */}
      <div className="border-b border-[#21262D]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="text-3xl font-black text-[#E6EDF3] sm:text-4xl">
            Predict & Earn
          </h1>
          <p className="mt-2 text-sm text-[#8B949E]">
            Test your cricket IQ. Answer match questions. Win from the prize pool.
          </p>

          {/* Stats */}
          <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#8B949E]">
                Total Prizes
              </p>
              <p className="text-2xl font-black tabular-nums text-[#FDB913]">
                <NumberTicker
                  value={totalPrizePool}
                  decimals={0}
                  duration={800}
                  showArrow={false}
                />{" "}
                WIRE
              </p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-[#21262D]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#8B949E]">
                Active Pools
              </p>
              <p className="text-2xl font-black tabular-nums text-[#E6EDF3]">
                <CountUp value={activePools.length} duration={1} />
              </p>
            </div>
            <div className="hidden sm:block h-8 w-px bg-[#21262D]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#8B949E]">
                Top Accuracy
              </p>
              <p className="text-2xl font-black tabular-nums text-[#3FB950]">
                <CountUp
                  value={topAccuracy}
                  formatter={(n) => `${n.toFixed(1)}%`}
                  duration={1}
                />
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#21262D] border-t-[#E4002B]" />
            <span className="ml-3 text-sm text-[#8B949E]">
              Loading predictions...
            </span>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Empty state */}
            {activePools.length === 0 && settledPools.length === 0 && (
              <div className="rounded-xl border border-[#21262D] bg-[#161B22] py-16 text-center">
                <Brain className="mx-auto h-10 w-10 text-[#484F58]" />
                <p className="mt-3 text-sm text-[#8B949E]">
                  No prediction pools available yet. Check back before the next match.
                </p>
              </div>
            )}

            {/* Active Pools */}
            {activePools.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#58A6FF]" />
                    <h2 className="text-lg font-semibold text-[#E6EDF3]">
                      Active Pools
                    </h2>
                  </div>
                  <span className="text-xs text-[#8B949E]">
                    {activePools.length} pool{activePools.length !== 1 ? "s" : ""}{" "}
                    open
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {activePools.map((pool) => (
                    <AnimatedGradientBorder
                      key={pool.id}
                      active={pool.status === "OPEN"}
                      gradientColors={["#21262D", "#58A6FF", "#21262D", "#FDB913", "#21262D"]}
                      duration={5}
                      borderWidth={1}
                      containerClassName="rounded-xl"
                    >
                      <PredictionPoolCard
                        pool={pool}
                        onEntrySuccess={fetchData}
                      />
                    </AnimatedGradientBorder>
                  ))}
                </div>
              </section>
            )}

            {/* Your Predictions — only when wallet connected */}
            {isConnected && userPredictions.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-[#58A6FF]" />
                  <h2 className="text-lg font-semibold text-[#E6EDF3]">
                    Your Predictions
                  </h2>
                </div>
                <div className="space-y-3">
                  {userPredictions.map((pred) => (
                    <UserPredictionRow key={pred.id} prediction={pred} />
                  ))}
                </div>
              </section>
            )}

            {/* Past Results */}
            {settledPools.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#FDB913]" />
                  <h2 className="text-lg font-semibold text-[#E6EDF3]">
                    Past Results
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {settledPools.map((pool) => (
                    <PredictionPoolCard key={pool.id} pool={pool} />
                  ))}
                </div>
              </section>
            )}

            {/* Leaderboard */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#8B949E]" />
                  <h2 className="text-lg font-semibold text-[#E6EDF3]">
                    Top Predictors
                  </h2>
                </div>
                <span className="text-xs text-[#8B949E]">
                  By average accuracy
                </span>
              </div>
              <div className="overflow-hidden rounded-lg border border-[#21262D]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#21262D] bg-[#161B22]">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B949E]">
                        Wallet
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#8B949E]">
                        Avg Score
                      </th>
                      <th className="hidden px-4 py-3 text-right text-xs font-semibold text-[#8B949E] sm:table-cell">
                        Profit
                      </th>
                      <th className="hidden px-4 py-3 text-right text-xs font-semibold text-[#8B949E] md:table-cell">
                        Matches
                      </th>
                      <th className="hidden px-4 py-3 text-right text-xs font-semibold text-[#8B949E] md:table-cell">
                        Best
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262D]">
                    {leaderboard.map((entry, idx) => (
                      <tr
                        key={entry.wallet}
                        className="transition-colors hover:bg-[#161B22]"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-bold ${
                              idx === 0
                                ? "text-[#FDB913]"
                                : idx === 1
                                  ? "text-[#C9D1D9]"
                                  : idx === 2
                                    ? "text-[#CD7F32]"
                                    : "text-[#8B949E]"
                            }`}
                          >
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#E6EDF3]">
                          {shortenAddress(entry.wallet)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-bold tabular-nums text-[#58A6FF]">
                          {Number(entry.avgScore ?? 0).toFixed(1)}%
                        </td>
                        <td className="hidden px-4 py-3 text-right text-xs font-bold tabular-nums text-[#3FB950] sm:table-cell">
                          {Number((entry as unknown as Record<string, unknown>).totalEarnings ?? entry.totalProfit ?? 0).toLocaleString()} WIRE
                        </td>
                        <td className="hidden px-4 py-3 text-right text-xs text-[#8B949E] md:table-cell">
                          {String((entry as unknown as Record<string, unknown>).totalPools ?? entry.matchesPlayed ?? 0)}
                        </td>
                        <td className="hidden px-4 py-3 text-right text-xs font-bold tabular-nums text-[#FDB913] md:table-cell">
                          {entry.bestScore ?? Number(entry.avgScore ?? 0).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* How Predict & Earn Works */}
            <section className="border-t border-[#21262D] pt-8">
              <h2 className="text-lg font-semibold text-[#E6EDF3]">
                How Predict & Earn Works
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-[#8B949E]">
                <li>
                  <span className="font-semibold text-[#E6EDF3]">
                    Pay the entry fee, answer match questions.
                  </span>{" "}
                  Pick your answers before the deadline. Each question has a point value.
                </li>
                <li>
                  <span className="font-semibold text-[#E6EDF3]">
                    Earn bonus points from live questions.
                  </span>{" "}
                  During the match, flash questions appear with tight deadlines and bonus points.
                </li>
                <li>
                  <span className="font-semibold text-[#E6EDF3]">
                    Higher score, bigger share of the pool.
                  </span>{" "}
                  After the match settles, payouts are distributed proportionally to your accuracy.
                </li>
              </ul>
            </section>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// User Prediction Row
// ---------------------------------------------------------------------------

function UserPredictionRow({
  prediction,
}: {
  prediction: PredictionPoolStatus;
}) {
  const correctCount =
    prediction.userEntry?.answers?.filter((a) => a.isCorrect === true).length ?? 0;
  const totalQuestions = prediction.questions?.length ?? 0;

  return (
    <div className="flex items-center justify-between rounded-lg border border-[#21262D] bg-[#161B22] px-4 py-3">
      <div className="flex items-center gap-3">
        <Brain className="h-4 w-4 text-[#58A6FF]" />
        <div>
          <p className="text-sm font-semibold text-[#E6EDF3]">
            {prediction.homeTeamSymbol} vs {prediction.awayTeamSymbol}
          </p>
          <p className="text-xs text-[#8B949E]">
            {prediction.matchVenue} &middot;{" "}
            <span
              className={`font-semibold ${
                prediction.status === "SETTLED"
                  ? "text-[#3FB950]"
                  : prediction.status === "CANCELLED"
                    ? "text-[#E4002B]"
                    : prediction.status === "LIVE"
                      ? "text-[#FDB913]"
                      : "text-[#58A6FF]"
              }`}
            >
              {prediction.status}
            </span>
          </p>
        </div>
      </div>
      <div className="text-right">
        {prediction.userEntry?.totalScore !== null &&
          prediction.userEntry?.totalScore !== undefined && (
            <p className="text-sm font-bold tabular-nums text-[#FDB913]">
              {prediction.userEntry.totalScore} pts
            </p>
          )}
        {prediction.status === "SETTLED" && (
          <p className="text-xs text-[#8B949E]">
            {correctCount}/{totalQuestions} correct
          </p>
        )}
        {prediction.userEntry?.payout !== null &&
          prediction.userEntry?.payout !== undefined &&
          prediction.userEntry.payout > 0 && (
            <p className="text-xs font-semibold text-[#3FB950] tabular-nums">
              +{Number(prediction.userEntry.payout).toLocaleString()} WIRE
            </p>
          )}
        {prediction.userEntry?.claimed && (
          <p className="text-[10px] text-[#8B949E]">Claimed</p>
        )}
      </div>
    </div>
  );
}
