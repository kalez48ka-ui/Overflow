"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Lock,
  Users,
  Trophy,
} from "lucide-react";
import { useAccount } from "wagmi";
import { io } from "socket.io-client";
import { FanWarCard } from "@/components/FanWarCard";
import { CountUp } from "@/components/motion";
import { fanWarsApi } from "@/lib/api";
import type { FanWarStatus, FanWarLock } from "@/lib/api";
import {
  MOCK_FAN_WARS,
  MOCK_FAN_WAR_LEADERBOARD,
} from "@/lib/mockData";
import { formatNumber, shortenAddress } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FanWarsPage() {
  const { address, isConnected } = useAccount();

  const [fanWars, setFanWars] = useState<FanWarStatus[]>(
    MOCK_FAN_WARS as FanWarStatus[],
  );
  const [userLocks, setUserLocks] = useState<FanWarLock[]>([]);
  const [leaderboard, setLeaderboard] = useState(MOCK_FAN_WAR_LEADERBOARD);
  const [loading, setLoading] = useState(true);

  // Derived data
  const activeWars = fanWars.filter(
    (w) => w.status === "OPEN" || w.status === "LOCKED",
  );
  const settledWars = fanWars.filter((w) => w.status === "SETTLED");
  const totalBoostPool = fanWars.reduce((sum, w) => sum + w.boostPool, 0);

  // Fetch data
  const fetchData = useCallback(async () => {
    const results = await Promise.allSettled([
      fanWarsApi.getActive(),
      isConnected && address ? fanWarsApi.getUserLocks(address) : Promise.resolve([]),
      fanWarsApi.getLeaderboard(),
    ]);

    if (results[0].status === "fulfilled" && results[0].value?.length > 0) {
      setFanWars(results[0].value);
    }
    if (results[1].status === "fulfilled" && results[1].value) {
      setUserLocks(results[1].value);
    }
    if (results[2].status === "fulfilled" && results[2].value?.length > 0) {
      setLeaderboard(results[2].value);
    }
    setLoading(false);
  }, [address, isConnected]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates via Socket.io
  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socket.on("fanwar:lock", (data: { matchId: string; teamId: string; amount: number }) => {
      setFanWars((prev) =>
        prev.map((w) => {
          if (w.matchId !== data.matchId) return w;
          const isHome = data.teamId === w.homeTeamId;
          return {
            ...w,
            totalHomeLocked: isHome
              ? w.totalHomeLocked + data.amount
              : w.totalHomeLocked,
            totalAwayLocked: !isHome
              ? w.totalAwayLocked + data.amount
              : w.totalAwayLocked,
          };
        }),
      );
    });

    socket.on("fanwar:settled", () => {
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
      {/* Hero Header */}
      <div className="border-b border-[#21262D]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <h1 className="text-3xl font-black text-[#E6EDF3] sm:text-4xl">
            Fan Wars
          </h1>
          <p className="mt-2 text-sm text-[#8B949E]">
            Lock your team tokens. Both sides earn boost. Nobody loses.
          </p>

          {/* Stats */}
          <div className="mt-6 flex items-center gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#8B949E]">
                Total Boost Pool
              </p>
              <p className="text-2xl font-black tabular-nums text-[#FDB913]">
                <CountUp value={totalBoostPool} duration={1} /> WIRE
              </p>
            </div>
            <div className="h-8 w-px bg-[#21262D]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[#8B949E]">
                Active Wars
              </p>
              <p className="text-2xl font-black tabular-nums text-[#E6EDF3]">
                <CountUp value={activeWars.length} duration={1} />
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
              Loading fan wars...
            </span>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Empty state when no wars exist */}
            {activeWars.length === 0 && settledWars.length === 0 && (
              <div className="rounded-xl border border-[#21262D] bg-[#161B22] py-16 text-center">
                <p className="text-sm text-[#8B949E]">
                  No fan wars scheduled yet. Check back before the next match.
                </p>
              </div>
            )}

            {/* Active Fan Wars */}
            {activeWars.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#E6EDF3]">
                    Active Fan Wars
                  </h2>
                  <span className="text-xs text-[#8B949E]">
                    {activeWars.length} war{activeWars.length !== 1 ? "s" : ""}{" "}
                    open
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {activeWars.map((war) => (
                    <FanWarCard
                      key={war.id}
                      war={war}
                      onLockSuccess={fetchData}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Your Locks — only when wallet connected */}
            {isConnected && userLocks.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#58A6FF]" />
                  <h2 className="text-lg font-semibold text-[#E6EDF3]">
                    Your Locks
                  </h2>
                </div>
                <div className="space-y-3">
                  {userLocks.map((lock) => (
                    <UserLockRow key={lock.id} lock={lock} />
                  ))}
                </div>
              </section>
            )}

            {/* Past Results */}
            {settledWars.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#FDB913]" />
                  <h2 className="text-lg font-semibold text-[#E6EDF3]">
                    Past Results
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {settledWars.map((war) => (
                    <FanWarCard key={war.id} war={war} />
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
                    Top Participants
                  </h2>
                </div>
                <span className="text-xs text-[#8B949E]">
                  By total boost earned
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
                        Total Boost
                      </th>
                      <th className="hidden px-4 py-3 text-right text-xs font-semibold text-[#8B949E] sm:table-cell">
                        Wars Won
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#21262D]">
                    {leaderboard.map((entry) => (
                      <tr
                        key={entry.wallet}
                        className="transition-colors hover:bg-[#161B22]"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-bold ${
                              entry.rank === 1
                                ? "text-[#FDB913]"
                                : entry.rank === 2
                                  ? "text-[#C9D1D9]"
                                  : entry.rank === 3
                                    ? "text-[#CD7F32]"
                                    : "text-[#8B949E]"
                            }`}
                          >
                            #{entry.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#E6EDF3]">
                          {shortenAddress(entry.wallet)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-bold tabular-nums text-[#3FB950]">
                          {entry.totalBoost.toLocaleString()} WIRE
                        </td>
                        <td className="hidden px-4 py-3 text-right text-xs text-[#8B949E] sm:table-cell">
                          {entry.warsWon}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* How Fan Wars Work — 3 bullet points */}
            <section className="border-t border-[#21262D] pt-8">
              <h2 className="text-lg font-semibold text-[#E6EDF3]">
                How Fan Wars Work
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-[#8B949E]">
                <li>
                  <span className="font-semibold text-[#E6EDF3]">Lock tokens before the deadline.</span>{" "}
                  Pick your side and commit your team tokens to the war.
                </li>
                <li>
                  <span className="font-semibold text-[#E6EDF3]">Match plays out, tokens stay safe.</span>{" "}
                  Your locked tokens are held securely regardless of the result.
                </li>
                <li>
                  <span className="font-semibold text-[#E6EDF3]">Everyone earns boost.</span>{" "}
                  Winners get a bigger share, but losers still earn. Nobody walks away empty.
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
// User Lock Row
// ---------------------------------------------------------------------------

function UserLockRow({ lock }: { lock: FanWarLock }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#21262D] bg-[#161B22] px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: lock.teamColor }}
        />
        <div>
          <p className="text-sm font-semibold text-[#E6EDF3]">
            {lock.teamName}
          </p>
          <p className="text-xs text-[#8B949E]">
            vs {lock.opponentTeam} &middot;{" "}
            <span
              className={`font-semibold ${
                lock.status === "SETTLED"
                  ? "text-[#3FB950]"
                  : lock.status === "CANCELLED"
                    ? "text-[#E4002B]"
                    : "text-[#58A6FF]"
              }`}
            >
              {lock.status}
            </span>
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold tabular-nums text-[#E6EDF3]">
          {lock.amount.toLocaleString()} {lock.teamSymbol}
        </p>
        {lock.boostReward !== null && (
          <p className="text-xs font-semibold text-[#3FB950] tabular-nums">
            +{lock.boostReward.toLocaleString()} WIRE
          </p>
        )}
        {lock.claimed && (
          <p className="text-[10px] text-[#8B949E]">Claimed</p>
        )}
      </div>
    </div>
  );
}
