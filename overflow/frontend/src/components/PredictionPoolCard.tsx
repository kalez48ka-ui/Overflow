"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Clock,
  Users,
  Trophy,
  Check,
  X,
  MapPin,
  Coins,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount, useWalletClient } from "wagmi";
import { CountUp } from "@/components/motion/CountUp";
import { MouseTrackCard } from "@/components/motion/MouseTrackCard";
import { MagneticButton } from "@/components/effects/MagneticButton";
import { TeamLogo } from "@/components/TeamLogo";
import { formatCountdown } from "@/lib/utils";
import { predictionsApi } from "@/lib/api";
import type { PredictionPoolStatus, PredictionQuestionData } from "@/lib/api";

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------

function useCountdown(deadline: string) {
  const [remaining, setRemaining] = useState(0);

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
// Estimate payout helper
// ---------------------------------------------------------------------------

function estimatePayout(
  totalPoints: number,
  maxPoints: number,
  pool: PredictionPoolStatus,
): number {
  if (maxPoints <= 0 || totalPoints <= 0) return 0;
  const scorePercent = totalPoints / maxPoints;
  // Top scorers split the pool proportionally; rough estimate
  const estimatedRank = Math.max(1, Math.round(pool.participantCount * (1 - scorePercent)));
  const share = 1 / Math.max(estimatedRank, 1);
  // Pool pays out ~90% to participants (10% platform fee)
  return pool.totalPool * 0.9 * share;
}

// ---------------------------------------------------------------------------
// QuestionOption — custom styled radio
// ---------------------------------------------------------------------------

function QuestionOption({
  label,
  selected,
  correct,
  wrong,
  disabled,
  accentColor,
  onClick,
}: {
  label: string;
  selected: boolean;
  correct: boolean;
  wrong: boolean;
  disabled: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  let borderColor = "#21262D";
  let bgColor = "transparent";
  let textColor = "#9CA3AF";
  let icon = null;

  if (correct) {
    borderColor = "#3FB950";
    bgColor = "rgba(63, 185, 80, 0.08)";
    textColor = "#3FB950";
    icon = <Check className="h-3.5 w-3.5 text-[#3FB950]" />;
  } else if (wrong) {
    borderColor = "#F85149";
    bgColor = "rgba(248, 81, 73, 0.08)";
    textColor = "#F85149";
    icon = <X className="h-3.5 w-3.5 text-[#F85149]" />;
  } else if (selected) {
    borderColor = accentColor;
    bgColor = `${accentColor}12`;
    textColor = "#E6EDF3";
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.01 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all duration-200"
      style={{
        borderColor,
        backgroundColor: bgColor,
        color: textColor,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && !correct && !wrong && !selected ? 0.5 : 1,
      }}
    >
      {/* Radio dot */}
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all"
        style={{
          borderColor: selected || correct || wrong ? borderColor : "#768390",
        }}
      >
        {(selected || correct || wrong) && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: correct
                ? "#3FB950"
                : wrong
                  ? "#F85149"
                  : accentColor,
            }}
          />
        )}
      </span>
      <span className="flex-1">{label}</span>
      {icon}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// PredictionPoolCard
// ---------------------------------------------------------------------------

interface PredictionPoolCardProps {
  pool: PredictionPoolStatus;
  onEntrySuccess?: () => void;
}

export function PredictionPoolCard({ pool, onEntrySuccess }: PredictionPoolCardProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const questions = pool.questions ?? [];
  const remaining = useCountdown(pool.deadline);
  const isExpired = remaining <= 0;
  const isOpen = pool.status === "OPEN" && !isExpired;
  const isLive = pool.status === "LIVE";
  const isSettled = pool.status === "SETTLED";
  const isCancelled = pool.status === "CANCELLED";

  // Local user answers (before submission)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [localUserEntry, setLocalUserEntry] = useState(pool.userEntry);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    setLocalUserEntry(pool.userEntry);
  }, [pool.userEntry]);

  const hasSubmitted = localUserEntry !== null;
  const maxPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const selectedCount = Object.keys(selectedAnswers).length;
  const allPreMatchAnswered = questions.filter((q) => !q.isLive).every(
    (q) => selectedAnswers[q.questionIndex] !== undefined,
  );

  // Calculate estimated points based on selections
  const estimatedPoints = Object.entries(selectedAnswers).reduce((sum, [idx]) => {
    const q = questions.find((q) => q.questionIndex === Number(idx));
    return sum + (q?.points || 0);
  }, 0);

  const estimatedPayout = estimatePayout(estimatedPoints, maxPoints, pool);

  const accentColor = pool.homeTeamColor;

  const handleSelectAnswer = useCallback(
    (questionIndex: number, optionIndex: number) => {
      if (hasSubmitted) return;
      setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
    },
    [hasSubmitted],
  );

  const handleSubmit = useCallback(async () => {
    if (!address || !isConnected) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!allPreMatchAnswered) {
      toast.error("Answer all questions before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const answers = Object.entries(selectedAnswers).map(([qi, co]) => ({
        questionIndex: Number(qi),
        chosenOption: co,
      }));
      await predictionsApi.enter(pool.matchId, { wallet: address, answers }, walletClient ?? undefined);
      setLocalUserEntry({
        answers: answers.map((a) => ({
          ...a,
          isCorrect: null,
          pointsEarned: null,
        })),
        totalScore: null,
        payout: null,
        claimed: false,
      });
      toast.success("Predictions submitted! Good luck.");
      onEntrySuccess?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [address, isConnected, allPreMatchAnswered, selectedAnswers, pool.matchId, onEntrySuccess, walletClient]);

  const handleClaim = useCallback(async () => {
    if (!address) return;
    setClaiming(true);
    try {
      const result = await predictionsApi.claim(pool.matchId, { wallet: address }, walletClient ?? undefined);
      setLocalUserEntry((prev) =>
        prev ? { ...prev, claimed: true, payout: result.payout } : prev,
      );
      setShowCelebration(true);
      toast.success(`Claimed ${result.payout.toLocaleString()} WIRE!`);
      setTimeout(() => setShowCelebration(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Claim failed";
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  }, [address, pool.matchId, walletClient]);

  return (
    <MouseTrackCard maxTilt={3} spotlightOpacity={0.05}>
      <div className="relative overflow-hidden rounded-xl border border-[#21262D] bg-[#161B22] transition-all duration-200 ease-out hover:border-[#21262D]/80">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[#21262D] px-4 py-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[#58A6FF]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#58A6FF]">
              Predict & Earn
            </span>
            {isSettled && (
              <span className="rounded-full bg-[#3FB950]/15 px-2 py-0.5 text-[10px] font-bold text-[#3FB950]">
                SETTLED
              </span>
            )}
            {isLive && (
              <span className="flex items-center gap-1 rounded-full bg-[#E4002B]/15 px-2 py-0.5 text-[10px] font-bold text-[#E4002B]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E4002B] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E4002B]" />
                </span>
                LIVE
              </span>
            )}
            {isCancelled && (
              <span className="rounded-full bg-[#9CA3AF]/15 px-2 py-0.5 text-[10px] font-bold text-[#9CA3AF]">
                CANCELLED
              </span>
            )}
          </div>
          {isOpen && (
            <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">
                {formatCountdown(remaining)}
              </span>
            </div>
          )}
        </div>

        {/* Teams + Pool info */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <TeamLogo
                teamId={pool.homeTeamSymbol.replace("$", "")}
                color={pool.homeTeamColor}
                size={36}
                glow
              />
              <TeamLogo
                teamId={pool.awayTeamSymbol.replace("$", "")}
                color={pool.awayTeamColor}
                size={36}
                glow
              />
            </div>
            <div>
              <p className="text-sm font-bold text-[#E6EDF3]">
                <span style={{ color: pool.homeTeamColor }}>
                  {pool.homeTeamSymbol}
                </span>
                {" "}vs{" "}
                <span style={{ color: pool.awayTeamColor }}>
                  {pool.awayTeamSymbol}
                </span>
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]">
                <MapPin className="h-3 w-3" />
                {pool.matchVenue}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          <div className="rounded-lg bg-[#0D1117] px-2 py-1.5 text-center">
            <p className="text-[10px] text-[#9CA3AF]">Entry Fee</p>
            <p className="text-xs font-bold tabular-nums text-[#E6EDF3]">
              {pool.entryFee} WIRE
            </p>
          </div>
          <div className="rounded-lg bg-[#0D1117] px-2 py-1.5 text-center">
            <p className="text-[10px] text-[#9CA3AF]">Prize Pool</p>
            <p className="text-xs font-bold tabular-nums text-[#FDB913]">
              <CountUp
                value={pool.totalPool}
                formatter={(n) => `${Math.round(n).toLocaleString()}`}
                duration={1}
              />{" "}
              WIRE
            </p>
          </div>
          <div className="rounded-lg bg-[#0D1117] px-2 py-1.5 text-center">
            <p className="text-[10px] text-[#9CA3AF]">Players</p>
            <p className="text-xs font-bold tabular-nums text-[#E6EDF3]">
              <CountUp value={pool.participantCount} duration={1} />
            </p>
          </div>
        </div>

        {/* Questions */}
        <div className="border-t border-[#21262D] px-4 py-3">
          <p className="mb-3 text-xs font-semibold text-[#E6EDF3]">
            {isSettled ? "Results" : "Questions"}{" "}
            <span className="text-[#9CA3AF] font-normal">
              ({questions.length} questions, {maxPoints} pts max)
            </span>
          </p>
          <div className="space-y-4">
            {questions.map((q) => (
              <QuestionBlock
                key={q.questionIndex}
                question={q}
                accentColor={accentColor}
                userAnswer={
                  hasSubmitted
                    ? localUserEntry?.answers.find(
                        (a) => a.questionIndex === q.questionIndex,
                      )?.chosenOption ?? -1
                    : selectedAnswers[q.questionIndex] ?? -1
                }
                userCorrect={
                  hasSubmitted
                    ? localUserEntry?.answers.find(
                        (a) => a.questionIndex === q.questionIndex,
                      )?.isCorrect ?? null
                    : null
                }
                disabled={
                  hasSubmitted || (!isOpen && !q.isLive) || isCancelled
                }
                onSelect={(optIdx) => handleSelectAnswer(q.questionIndex, optIdx)}
              />
            ))}
          </div>
        </div>

        {/* Estimated Rewards (before submit) */}
        <AnimatePresence mode="wait">
          {isOpen && !hasSubmitted && selectedCount > 0 && (
            <motion.div
              key="estimate"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-[#21262D] px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-[#FDB913]" />
                  <span className="text-xs text-[#9CA3AF]">
                    Potential points: {estimatedPoints}/{maxPoints}
                  </span>
                </div>
                <span className="text-xs font-bold tabular-nums text-[#3FB950]">
                  ~{Math.round(estimatedPayout).toLocaleString()} WIRE
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        {isOpen && !hasSubmitted && (
          <div className="border-t border-[#21262D] px-4 py-3">
            <MagneticButton
              glowColor="#58A6FF"
              className="w-full rounded-lg"
              onClick={
                !allPreMatchAnswered || submitting || !isConnected
                  ? undefined
                  : handleSubmit
              }
            >
              <span
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#58A6FF] px-4 py-2.5 text-sm font-bold text-white transition-opacity"
                style={{
                  opacity:
                    !allPreMatchAnswered || submitting || !isConnected ? 0.4 : 1,
                }}
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {isConnected
                  ? `Submit Predictions (${pool.entryFee} WIRE)`
                  : "Connect Wallet"}
              </span>
            </MagneticButton>
          </div>
        )}

        {/* Already submitted indicator */}
        {hasSubmitted && !isSettled && (
          <div className="border-t border-[#21262D] px-4 py-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#3FB950]" />
              <span className="text-xs font-semibold text-[#E6EDF3]">
                Predictions submitted
              </span>
              {localUserEntry?.totalScore !== null &&
                localUserEntry?.totalScore !== undefined && (
                  <span className="ml-auto text-xs font-bold tabular-nums text-[#FDB913]">
                    Score so far: {localUserEntry.totalScore}
                  </span>
                )}
            </div>
          </div>
        )}

        {/* Settlement result */}
        <AnimatePresence>
          {isSettled && localUserEntry && (
            <motion.div
              key="settled"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-[#21262D] px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#FDB913]" />
                  <span className="text-xs font-semibold text-[#E6EDF3]">
                    Your Score:{" "}
                    <span className="text-lg font-black tabular-nums text-[#FDB913]">
                      <CountUp
                        value={localUserEntry.totalScore ?? 0}
                        duration={1.5}
                      />
                    </span>
                    <span className="text-[#9CA3AF]">/{maxPoints}</span>
                  </span>
                </div>

                {localUserEntry.payout !== null &&
                  localUserEntry.payout > 0 &&
                  !localUserEntry.claimed && (
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
                        Claim {localUserEntry.payout.toLocaleString()} WIRE
                      </span>
                    </MagneticButton>
                  )}
                {localUserEntry.claimed && (
                  <span className="text-xs font-semibold text-[#3FB950]">
                    Claimed
                  </span>
                )}
              </div>

              {pool.highestScore !== null && (
                <p className="mt-1 text-[10px] text-[#9CA3AF]">
                  Highest score in pool:{" "}
                  <span className="font-bold text-[#E6EDF3] tabular-nums">
                    {pool.highestScore}
                  </span>
                </p>
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
                    left: `${10 + i * 7}%`,
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
// QuestionBlock — single question with options
// ---------------------------------------------------------------------------

function QuestionBlock({
  question,
  accentColor,
  userAnswer,
  userCorrect,
  disabled,
  onSelect,
}: {
  question: PredictionQuestionData;
  accentColor: string;
  userAnswer: number;
  userCorrect: boolean | null;
  disabled: boolean;
  onSelect: (optIdx: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[#E6EDF3]">
          {question.questionText}
          {question.isLive && (
            <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-[#FDB913]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#FDB913]">
              <Zap className="h-2.5 w-2.5" />
              LIVE
            </span>
          )}
        </p>
        <span className="shrink-0 text-[10px] font-bold tabular-nums text-[#9CA3AF]">
          {question.points} pts
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {question.options.map((opt, optIdx) => {
          const isSelected = userAnswer === optIdx;
          const isCorrectAnswer =
            question.resolved && question.correctOption === optIdx;
          const isWrong =
            question.resolved && isSelected && question.correctOption !== optIdx;

          return (
            <QuestionOption
              key={optIdx}
              label={opt}
              selected={isSelected}
              correct={isCorrectAnswer}
              wrong={isWrong}
              disabled={disabled}
              accentColor={accentColor}
              onClick={() => onSelect(optIdx)}
            />
          );
        })}
      </div>
      {userCorrect !== null && question.resolved && (
        <p
          className={`text-[10px] font-semibold ${
            userCorrect ? "text-[#3FB950]" : "text-[#F85149]"
          }`}
        >
          {userCorrect
            ? `+${question.points} pts`
            : "0 pts"}
        </p>
      )}
    </div>
  );
}
