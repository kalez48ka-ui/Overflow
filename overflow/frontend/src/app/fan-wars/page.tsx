"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Trophy,
  Lock,
  ArrowRight,
  Users,
  Zap,
} from "lucide-react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { io } from "socket.io-client";
import { FanWarCard } from "@/components/FanWarCard";
import { CountUp, StaggerReveal, MouseTrackCard } from "@/components/motion";
import { TextScramble, GlitchPrice } from "@/components/effects";
import { fanWarsApi } from "@/lib/api";
import type { FanWarStatus, FanWarLock } from "@/lib/api";
import {
  MOCK_FAN_WARS,
  MOCK_FAN_WAR_LEADERBOARD,
} from "@/lib/mockData";
import { formatNumber, shortenAddress } from "@/lib/utils";
import Link from "next/link";

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="min-h-screen bg-[#0D1117]"
    >
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-[#F85149]/30 bg-gradient-to-r from-[#3A0000]/60 via-[#161B22] to-[#161B22]">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-[#F85149]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-[#FDB913]/5 blur-3xl" />


        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-full border border-[#F85149]/40 bg-[#F85149]/10 px-4 py-1.5 text-xs font-medium text-[#F85149]"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F85149] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F85149]" />
              </span>
              <TextScramble
                text="Fan Wars Active"
                speed={40}
                resolvedColor="#F85149"
                scrambledColor="#F8514966"
              />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="flex items-center gap-3 text-3xl font-black text-[#E6EDF3] sm:text-4xl lg:text-5xl">
                <Flame className="h-8 w-8 text-[#F85149] sm:h-10 sm:w-10" />
                <TextScramble
                  text="Fan Wars"
                  speed={50}
                  resolvedColor="#E6EDF3"
                  scrambledColor="#E6EDF366"
                />
              </h1>
              <p className="mt-3 max-w-xl text-sm text-[#8B949E] sm:text-base">
                Lock your team tokens. Earn boost rewards.{" "}
                <span className="font-semibold text-[#3FB950]">
                  Nobody loses.
                </span>
              </p>
            </motion.div>

            {/* Total Boost Pool stat */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex items-center gap-6 rounded-xl border border-[#30363D] bg-[#0D1117]/60 px-6 py-3"
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#8B949E]">
                  Total Boost Pool
                </p>
                <p className="text-2xl font-black tabular-nums text-[#FDB913] sm:text-3xl">
                  <GlitchPrice
                    value={`${totalBoostPool.toLocaleString()} WIRE`}
                    duration={800}
                    autoScrambleInterval={8000}
                  />
                </p>
              </div>
              <div className="h-10 w-px bg-[#30363D]" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[#8B949E]">
                  Active Wars
                </p>
                <p className="text-2xl font-black tabular-nums text-[#E6EDF3]">
                  <CountUp value={activeWars.length} duration={1} />
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#30363D] border-t-[#F85149]" />
            <span className="ml-3 text-sm text-[#8B949E]">
              Loading fan wars...
            </span>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Active Fan Wars */}
            {activeWars.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-[#F85149]" />
                    <h2 className="text-lg font-bold text-[#E6EDF3]">
                      Active Fan Wars
                    </h2>
                  </div>
                  <span className="text-xs text-[#8B949E]">
                    {activeWars.length} war{activeWars.length !== 1 ? "s" : ""}{" "}
                    open
                  </span>
                </div>
                <StaggerReveal
                  className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                  staggerDelay={0.12}
                  yOffset={24}
                >
                  {activeWars.map((war) => (
                    <FanWarCard
                      key={war.id}
                      war={war}
                      onLockSuccess={fetchData}
                    />
                  ))}
                </StaggerReveal>
              </section>
            )}

            {/* Your Locks — only when wallet connected */}
            {isConnected && userLocks.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#58A6FF]" />
                  <h2 className="text-lg font-bold text-[#E6EDF3]">
                    Your Locks
                  </h2>
                </div>
                <StaggerReveal
                  className="space-y-3"
                  staggerDelay={0.08}
                  yOffset={16}
                >
                  {userLocks.map((lock) => (
                    <UserLockRow key={lock.id} lock={lock} />
                  ))}
                </StaggerReveal>
              </section>
            )}

            {/* Past Results */}
            {settledWars.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[#FDB913]" />
                  <h2 className="text-lg font-bold text-[#E6EDF3]">
                    Past Results
                  </h2>
                </div>
                <StaggerReveal
                  className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                  staggerDelay={0.12}
                  yOffset={24}
                >
                  {settledWars.map((war) => (
                    <FanWarCard key={war.id} war={war} />
                  ))}
                </StaggerReveal>
              </section>
            )}

            {/* Leaderboard */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#A855F7]" />
                  <h2 className="text-lg font-bold text-[#E6EDF3]">
                    Top Participants
                  </h2>
                </div>
                <span className="text-xs text-[#8B949E]">
                  By total boost earned
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-[#30363D]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#30363D] bg-[#21262D]">
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
                  <tbody className="divide-y divide-[#30363D] bg-[#161B22]">
                    {leaderboard.map((entry, idx) => (
                      <motion.tr
                        key={entry.wallet}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.06, duration: 0.3 }}
                        className="hover:bg-[#21262D] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-black ${
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
                          {entry.wallet}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-bold tabular-nums text-[#3FB950]">
                          {entry.totalBoost.toLocaleString()} WIRE
                        </td>
                        <td className="hidden px-4 py-3 text-right text-xs text-[#8B949E] sm:table-cell">
                          {entry.warsWon}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* How Fan Wars Work */}
            <section className="rounded-xl border border-[#30363D] bg-[#161B22] p-6">
              <h2 className="mb-5 text-lg font-bold text-[#E6EDF3]">
                How Fan Wars Work
              </h2>
              <StaggerReveal
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                staggerDelay={0.1}
                yOffset={20}
              >
                {[
                  {
                    step: "01",
                    title: "Pick Your Side",
                    desc: "Lock team tokens before the deadline. Choose which team you back in the upcoming match.",
                    color: "#F85149",
                    icon: Flame,
                  },
                  {
                    step: "02",
                    title: "Tokens Are Locked",
                    desc: "Once the deadline passes, all locks are sealed. Tokens are held until the match settles.",
                    color: "#58A6FF",
                    icon: Lock,
                  },
                  {
                    step: "03",
                    title: "Match Plays Out",
                    desc: "Watch the match live. Your tokens stay safe regardless of outcome.",
                    color: "#FDB913",
                    icon: Zap,
                  },
                  {
                    step: "04",
                    title: "Everyone Earns",
                    desc: "Winners get a bigger share. Losers still earn boost. Nobody walks away empty.",
                    color: "#3FB950",
                    icon: Trophy,
                  },
                ].map(({ step, title, desc, color, icon: Icon }) => (
                  <div
                    key={step}
                    className="group relative rounded-lg border border-[#30363D] bg-[#0D1117] p-4 transition-all duration-300 hover:border-opacity-60"
                  >
                    <div
                      className="absolute top-0 left-4 right-4 h-px opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ backgroundColor: color }}
                    />
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color }} />
                      <span
                        className="text-2xl font-black"
                        style={{ color: `${color}50` }}
                      >
                        {step}
                      </span>
                    </div>
                    <h3
                      className="mb-1.5 text-sm font-bold"
                      style={{ color }}
                    >
                      {title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#8B949E]">
                      {desc}
                    </p>
                  </div>
                ))}
              </StaggerReveal>
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
    <div className="flex items-center justify-between rounded-xl border border-[#30363D] bg-[#161B22] px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: lock.teamColor }}
        >
          {lock.teamId}
        </div>
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
                    ? "text-[#F85149]"
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
