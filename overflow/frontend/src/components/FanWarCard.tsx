"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Clock,
  Lock,
  Trophy,
  Swords,
  Check,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { CountUp, MouseTrackCard } from "@/components/motion";
import { MagneticButton } from "@/components/effects";
import { TeamLogo } from "@/components/TeamLogo";
import { formatCountdown } from "@/lib/utils";
import { fanWarsApi } from "@/lib/api";
import type { FanWarStatus } from "@/lib/api";

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------

function useCountdown(deadline: string) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(deadline).getTime() - Date.now();
    return diff > 0 ? diff : 0;
  });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return remaining;
}

// ---------------------------------------------------------------------------
// Boost estimation helper
// ---------------------------------------------------------------------------

function estimateBoost(
  amount: number,
  teamSide: "home" | "away",
  war: FanWarStatus,
): { winBoost: number; loseBoost: number } {
  const totalPool = war.boostPool;
  const myTotal =
    teamSide === "home" ? war.totalHomeLocked : war.totalAwayLocked;
  const share = myTotal > 0 ? amount / (myTotal + amount) : 1;

  // Winners get 65% of pool, losers get 35%
  const winBoost = totalPool * 0.65 * share;
  const loseBoost = totalPool * 0.35 * share;
  return { winBoost, loseBoost };
}

// ---------------------------------------------------------------------------
// Team Badge
// ---------------------------------------------------------------------------

function TeamBadge({
  teamId,
  color,
  size = "md",
}: {
  teamId: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = { sm: 32, md: 48, lg: 64 };
  return (
    <TeamLogo teamId={teamId} color={color} size={sizeMap[size]} glow />
  );
}

// ---------------------------------------------------------------------------
// Lock Distribution Bar
// ---------------------------------------------------------------------------

function LockDistributionBar({
  homeTotal,
  awayTotal,
  homeColor,
  awayColor,
}: {
  homeTotal: number;
  awayTotal: number;
  homeColor: string;
  awayColor: string;
}) {
  const total = homeTotal + awayTotal;
  const homePercent = total > 0 ? (homeTotal / total) * 100 : 50;
  const awayPercent = total > 0 ? 100 - homePercent : 50;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-semibold">
        <span style={{ color: homeColor }}>{homePercent.toFixed(0)}%</span>
        <span className="text-[#8B949E]">Lock Distribution</span>
        <span style={{ color: awayColor }}>{awayPercent.toFixed(0)}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-[#21262D]">
        <motion.div
          className="h-full rounded-l-full"
          style={{ backgroundColor: homeColor }}
          initial={{ width: 0 }}
          animate={{ width: `${homePercent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.div
          className="h-full rounded-r-full"
          style={{ backgroundColor: awayColor }}
          initial={{ width: 0 }}
          animate={{ width: `${awayPercent}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset amount buttons
// ---------------------------------------------------------------------------

const PRESETS = [
  { label: "25%", factor: 0.25 },
  { label: "50%", factor: 0.5 },
  { label: "75%", factor: 0.75 },
  { label: "MAX", factor: 1 },
];

// ---------------------------------------------------------------------------
// FanWarCard
// ---------------------------------------------------------------------------

interface FanWarCardProps {
  war: FanWarStatus;
  onLockSuccess?: () => void;
}

export function FanWarCard({ war, onLockSuccess }: FanWarCardProps) {
  const { address, isConnected } = useAccount();
  const remaining = useCountdown(war.lockDeadline);
  const isExpired = remaining <= 0;
  const isOpen = war.status === "OPEN" && !isExpired;
  const isSettled = war.status === "SETTLED";
  const isCancelled = war.status === "CANCELLED";

  // Lock form state — independent for each side
  const [homeAmount, setHomeAmount] = useState("");
  const [awayAmount, setAwayAmount] = useState("");
  const [locking, setLocking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [localUserLock, setLocalUserLock] = useState(war.userLock);
  const [showCelebration, setShowCelebration] = useState(false);

  // Keep localUserLock in sync with prop changes
  useEffect(() => {
    setLocalUserLock(war.userLock);
  }, [war.userLock]);

  // Fake token balance for demo (would come from on-chain in production)
  const tokenBalance = 10000;

  const handleLock = useCallback(
    async (teamId: string, amount: number) => {
      if (!address || !isConnected) {
        toast.error("Connect your wallet first");
        return;
      }
      if (amount <= 0) {
        toast.error("Enter a valid amount");
        return;
      }
      if (localUserLock) {
        toast.error("You already locked tokens for this war");
        return;
      }

      setLocking(true);
      try {
        await fanWarsApi.lock(war.matchId, {
          wallet: address,
          teamId,
          amount,
        });
        setLocalUserLock({ teamId, amount, boostReward: null, claimed: false });
        setHomeAmount("");
        setAwayAmount("");
        toast.success(`Locked ${amount.toLocaleString()} tokens for ${teamId}!`);
        onLockSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Lock failed";
        toast.error(msg);
      } finally {
        setLocking(false);
      }
    },
    [address, isConnected, war.matchId, localUserLock, onLockSuccess],
  );

  const handleClaim = useCallback(async () => {
    if (!address) return;
    setClaiming(true);
    try {
      const result = await fanWarsApi.claim(war.matchId, { wallet: address });
      setLocalUserLock((prev) =>
        prev ? { ...prev, claimed: true, boostReward: result.claimed } : prev,
      );
      setShowCelebration(true);
      toast.success(`Claimed ${result.claimed.toLocaleString()} WIRE boost!`);
      setTimeout(() => setShowCelebration(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Claim failed";
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  }, [address, war.matchId]);

  // Determine if user's team won
  const userWon =
    isSettled && localUserLock && war.winnerTeamId === localUserLock.teamId;

  // Estimate boost for the amounts in the input
  const homeNum = parseFloat(homeAmount) || 0;
  const awayNum = parseFloat(awayAmount) || 0;
  const homeEstimate = estimateBoost(homeNum, "home", war);
  const awayEstimate = estimateBoost(awayNum, "away", war);

  return (
    <MouseTrackCard maxTilt={3} spotlightOpacity={0.05}>
      <div className="relative overflow-hidden rounded-xl border border-[#21262D] bg-[#161B22] transition-all duration-200 ease-out hover:border-[#21262D]/80">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#21262D] px-4 py-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#F85149]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#F85149]">
              Fan War
            </span>
            {isSettled && (
              <span className="rounded-full bg-[#3FB950]/15 px-2 py-0.5 text-[10px] font-bold text-[#3FB950]">
                SETTLED
              </span>
            )}
            {isCancelled && (
              <span className="rounded-full bg-[#8B949E]/15 px-2 py-0.5 text-[10px] font-bold text-[#8B949E]">
                CANCELLED
              </span>
            )}
          </div>
          {isOpen && (
            <div className="flex items-center gap-1.5 text-xs text-[#8B949E]">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">
                {formatCountdown(remaining)}
              </span>
            </div>
          )}
          {war.status === "LOCKED" && (
            <span className="flex items-center gap-1 text-xs text-[#FDB913]">
              <Lock className="h-3 w-3" />
              Locked
            </span>
          )}
        </div>

        {/* Boost Pool */}
        <div className="px-4 pt-3 pb-1 text-center">
          <p className="text-[10px] uppercase tracking-widest text-[#8B949E]">
            Boost Pool
          </p>
          <p className="text-2xl font-black tabular-nums text-[#FDB913]">
            <CountUp
              value={war.boostPool}
              formatter={(n) => `${Math.round(n).toLocaleString()} WIRE`}
              duration={1.5}
            />
          </p>
        </div>

        {/* VS Layout */}
        <div className="flex items-center justify-center gap-4 px-4 py-4 sm:gap-8">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <TeamBadge teamId={war.homeTeamId} color={war.homeTeamColor} />
            <p className="text-lg font-black tabular-nums text-[#E6EDF3]">
              <CountUp value={war.totalHomeLocked} duration={1} />
            </p>
            <p
              className="text-xs font-semibold"
              style={{ color: war.homeTeamColor }}
            >
              {war.homeTeamSymbol}
            </p>
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1">
            <Swords className="h-5 w-5 text-[#484F58]" />
            <span className="text-xs font-black text-[#484F58]">VS</span>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <TeamBadge teamId={war.awayTeamId} color={war.awayTeamColor} />
            <p className="text-lg font-black tabular-nums text-[#E6EDF3]">
              <CountUp value={war.totalAwayLocked} duration={1} />
            </p>
            <p
              className="text-xs font-semibold"
              style={{ color: war.awayTeamColor }}
            >
              {war.awayTeamSymbol}
            </p>
          </div>
        </div>

        {/* Lock Distribution */}
        <div className="px-4 pb-3">
          <LockDistributionBar
            homeTotal={war.totalHomeLocked}
            awayTotal={war.totalAwayLocked}
            homeColor={war.homeTeamColor}
            awayColor={war.awayTeamColor}
          />
        </div>

        {/* Venue */}
        <div className="flex items-center gap-1.5 px-4 pb-3 text-[10px] text-[#8B949E]">
          <MapPin className="h-3 w-3" />
          {war.matchVenue}
        </div>

        {/* Lock UI — only when open and user hasn't locked yet */}
        <AnimatePresence mode="wait">
          {isOpen && !localUserLock && (
            <motion.div
              key="lock-ui"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-[#21262D] px-4 py-4"
            >
              <div className="grid grid-cols-2 gap-3">
                {/* Home side lock */}
                <LockSide
                  teamId={war.homeTeamId}
                  teamSymbol={war.homeTeamSymbol}
                  teamColor={war.homeTeamColor}
                  amount={homeAmount}
                  onAmountChange={setHomeAmount}
                  maxBalance={tokenBalance}
                  estimate={homeEstimate}
                  onLock={() => handleLock(war.homeTeamId, homeNum)}
                  disabled={locking || awayNum > 0}
                  loading={locking}
                  isConnected={isConnected}
                />
                {/* Away side lock */}
                <LockSide
                  teamId={war.awayTeamId}
                  teamSymbol={war.awayTeamSymbol}
                  teamColor={war.awayTeamColor}
                  amount={awayAmount}
                  onAmountChange={setAwayAmount}
                  maxBalance={tokenBalance}
                  estimate={awayEstimate}
                  onLock={() => handleLock(war.awayTeamId, awayNum)}
                  disabled={locking || homeNum > 0}
                  loading={locking}
                  isConnected={isConnected}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Lock display */}
        <AnimatePresence>
          {localUserLock && (
            <motion.div
              key="user-lock"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-[#21262D] px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#3FB950]" />
                  <span className="text-xs font-semibold text-[#E6EDF3]">
                    Your Lock:{" "}
                    <span className="tabular-nums">
                      {localUserLock.amount.toLocaleString()}
                    </span>{" "}
                    {localUserLock.teamId === war.homeTeamId
                      ? war.homeTeamSymbol
                      : war.awayTeamSymbol}
                  </span>
                </div>
                {isSettled && localUserLock.boostReward !== null && !localUserLock.claimed && (
                  <MagneticButton
                    glowColor="#3FB950"
                    className="rounded-lg"
                    onClick={handleClaim}
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#238636] px-3 py-1.5 text-xs font-bold text-white">
                      {claiming ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Trophy className="h-3 w-3" />
                      )}
                      Claim {localUserLock.boostReward.toLocaleString()} WIRE
                    </span>
                  </MagneticButton>
                )}
                {localUserLock.claimed && (
                  <span className="text-xs font-semibold text-[#3FB950]">
                    Claimed
                  </span>
                )}
              </div>

              {/* Boost estimates for active locks */}
              {!isSettled && localUserLock.boostReward === null && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#0D1117] px-2 py-1.5 text-center">
                    <p className="text-[10px] text-[#8B949E]">
                      If {localUserLock.teamId} wins
                    </p>
                    <p className="text-xs font-bold text-[#3FB950] tabular-nums">
                      ~{Math.round(
                        estimateBoost(
                          localUserLock.amount,
                          localUserLock.teamId === war.homeTeamId
                            ? "home"
                            : "away",
                          war,
                        ).winBoost,
                      ).toLocaleString()}{" "}
                      WIRE
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#0D1117] px-2 py-1.5 text-center">
                    <p className="text-[10px] text-[#8B949E]">
                      If {localUserLock.teamId} loses
                    </p>
                    <p className="text-xs font-bold text-[#8B949E] tabular-nums">
                      ~{Math.round(
                        estimateBoost(
                          localUserLock.amount,
                          localUserLock.teamId === war.homeTeamId
                            ? "home"
                            : "away",
                          war,
                        ).loseBoost,
                      ).toLocaleString()}{" "}
                      WIRE
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settlement result */}
        <AnimatePresence>
          {isSettled && war.winnerTeamId && (
            <motion.div
              key="settled-result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-[#21262D] px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#FDB913]" />
                  <span className="text-xs font-semibold text-[#E6EDF3]">
                    Winner:{" "}
                    <span
                      className="font-black"
                      style={{
                        color:
                          war.winnerTeamId === war.homeTeamId
                            ? war.homeTeamColor
                            : war.awayTeamColor,
                      }}
                    >
                      {war.winnerTeamId === war.homeTeamId
                        ? war.homeTeamName
                        : war.awayTeamName}
                    </span>
                  </span>
                </div>
                {war.marginType && (
                  <span className="rounded-full bg-[#FDB913]/15 px-2 py-0.5 text-[10px] font-bold text-[#FDB913]">
                    {war.marginType}
                  </span>
                )}
              </div>
              {war.homeBoostShare !== null && war.awayBoostShare !== null && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#0D1117] px-2 py-1.5 text-center">
                    <p className="text-[10px] text-[#8B949E]">
                      {war.homeTeamSymbol} Boost
                    </p>
                    <p
                      className="text-xs font-bold tabular-nums"
                      style={{ color: war.homeTeamColor }}
                    >
                      {war.homeBoostShare.toLocaleString()} WIRE
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#0D1117] px-2 py-1.5 text-center">
                    <p className="text-[10px] text-[#8B949E]">
                      {war.awayTeamSymbol} Boost
                    </p>
                    <p
                      className="text-xs font-bold tabular-nums"
                      style={{ color: war.awayTeamColor }}
                    >
                      {war.awayBoostShare.toLocaleString()} WIRE
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration particles */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      i % 3 === 0
                        ? "#FDB913"
                        : i % 3 === 1
                          ? "#3FB950"
                          : "#58A6FF",
                    left: `${10 + (i * 7)}%`,
                    top: "50%",
                  }}
                  initial={{ y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    y: [0, -80 - Math.random() * 60],
                    x: [(Math.random() - 0.5) * 100],
                    opacity: [1, 0],
                    scale: [1, 0.3],
                  }}
                  transition={{
                    duration: 1.5 + Math.random() * 0.5,
                    ease: "easeOut",
                    delay: i * 0.05,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MouseTrackCard>
  );
}

// ---------------------------------------------------------------------------
// Lock Side — one side of the lock UI (home or away)
// ---------------------------------------------------------------------------

function LockSide({
  teamId,
  teamSymbol,
  teamColor,
  amount,
  onAmountChange,
  maxBalance,
  estimate,
  onLock,
  disabled,
  loading,
  isConnected,
}: {
  teamId: string;
  teamSymbol: string;
  teamColor: string;
  amount: string;
  onAmountChange: (val: string) => void;
  maxBalance: number;
  estimate: { winBoost: number; loseBoost: number };
  onLock: () => void;
  disabled: boolean;
  loading: boolean;
  isConnected: boolean;
}) {
  const numAmount = parseFloat(amount) || 0;

  return (
    <div
      className="rounded-lg border p-3 space-y-2"
      style={{ borderColor: `${teamColor}30` }}
    >
      <p
        className="text-xs font-bold text-center"
        style={{ color: teamColor }}
      >
        Lock My {teamSymbol}
      </p>

      {/* Amount input */}
      <div className="relative">
        <input
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0"
          min={0}
          className="w-full rounded-md border border-[#21262D] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] outline-none transition-all focus:border-[#58A6FF] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          disabled={disabled}
        />
      </div>

      {/* Preset buttons */}
      <div className="flex gap-1">
        {PRESETS.map(({ label, factor }) => (
          <button
            key={label}
            onClick={() =>
              onAmountChange(Math.floor(maxBalance * factor).toString())
            }
            disabled={disabled}
            className="flex-1 rounded-md border border-[#21262D] py-1 text-[10px] font-semibold text-[#8B949E] transition-colors hover:border-[#58A6FF]/50 hover:text-[#E6EDF3] disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Estimates */}
      {numAmount > 0 && (
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-[#8B949E]">Win boost:</span>
            <span className="font-semibold text-[#3FB950]">
              ~{Math.round(estimate.winBoost).toLocaleString()} WIRE
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8B949E]">Lose boost:</span>
            <span className="font-semibold text-[#8B949E]">
              ~{Math.round(estimate.loseBoost).toLocaleString()} WIRE
            </span>
          </div>
        </div>
      )}

      {/* Lock button */}
      <MagneticButton
        glowColor={teamColor}
        className="w-full rounded-lg"
        onClick={disabled || numAmount <= 0 || !isConnected ? undefined : onLock}
      >
        <span
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white transition-opacity"
          style={{
            backgroundColor: teamColor,
            opacity: disabled || numAmount <= 0 || !isConnected ? 0.4 : 1,
          }}
        >
          {loading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Lock className="h-3 w-3" />
          )}
          {isConnected ? "LOCK TOKENS" : "Connect Wallet"}
        </span>
      </MagneticButton>
    </div>
  );
}
