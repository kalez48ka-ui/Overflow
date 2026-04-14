"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAccount, useWalletClient } from "wagmi";
import { predictionsApi } from "@/lib/api";
import type { PredictionQuestionData } from "@/lib/api";

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
// LivePredictionBanner
// ---------------------------------------------------------------------------

interface LivePredictionBannerProps {
  matchId: string;
  question: PredictionQuestionData;
  bonusPoints: number;
  onDismiss?: () => void;
  onAnswer?: () => void;
}

export function LivePredictionBanner({
  matchId,
  question,
  bonusPoints,
  onDismiss,
  onAnswer,
}: LivePredictionBannerProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const remaining = useCountdown(question.deadline);
  const isExpired = remaining <= 0;
  const [answered, setAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(true);

  // Calculate countdown bar width
  const totalDuration = 180_000; // 3 minutes assumed for live questions
  const barPercent = Math.min(100, (remaining / totalDuration) * 100);

  // Auto-dismiss after deadline
  useEffect(() => {
    if (isExpired && !answered) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isExpired, answered, onDismiss]);

  const handleAnswer = useCallback(
    async (optionIndex: number) => {
      if (!address || !isConnected) {
        toast.error("Connect your wallet first");
        return;
      }
      if (answered || isExpired) return;

      setSubmitting(true);
      try {
        await predictionsApi.submitLiveAnswer(matchId, {
          wallet: address,
          questionIndex: question.questionIndex,
          chosenOption: optionIndex,
        }, walletClient ?? undefined);
        setAnswered(true);
        toast.success("Live answer submitted!");
        onAnswer?.();
        // Dismiss after a brief celebration
        setTimeout(() => {
          setVisible(false);
          onDismiss?.();
        }, 3000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to submit";
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [address, isConnected, answered, isExpired, matchId, question.questionIndex, onAnswer, onDismiss, walletClient],
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-0 right-0 top-14 z-40 mx-auto max-w-2xl px-4"
        >
          <div className="overflow-hidden rounded-xl border border-[#FDB913]/40 bg-[#161B22] shadow-2xl shadow-[#FDB913]/10">
            {/* Countdown bar */}
            <div className="h-1 w-full bg-[#21262D]">
              <motion.div
                className="h-full rounded-r-full"
                style={{ backgroundColor: barPercent > 30 ? "#FDB913" : "#F85149" }}
                initial={{ width: "100%" }}
                animate={{ width: `${barPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="px-4 py-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FDB913]/20">
                    <Zap className="h-3.5 w-3.5 text-[#FDB913]" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FDB913]">
                    Live Question
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#FDB913]/15 px-2 py-0.5 text-[10px] font-bold text-[#FDB913]">
                    +{bonusPoints} bonus pts
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#9CA3AF]">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono tabular-nums">
                      {Math.floor(remaining / 1000)}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Question */}
              <p className="mt-2 text-sm font-semibold text-[#E6EDF3]">
                {question.questionText}
              </p>

              {/* Quick answer buttons */}
              {!answered && !isExpired && (
                <div className="mt-3 flex gap-2">
                  {question.options.map((opt, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleAnswer(idx)}
                      disabled={submitting}
                      className="flex-1 rounded-lg border border-[#FDB913]/30 bg-[#FDB913]/10 px-3 py-2 text-xs font-bold text-[#FDB913] transition-all hover:border-[#FDB913]/60 hover:bg-[#FDB913]/20 disabled:opacity-50"
                    >
                      {submitting ? (
                        <span className="h-3 w-3 mx-auto block animate-spin rounded-full border-2 border-[#FDB913]/30 border-t-[#FDB913]" />
                      ) : (
                        opt
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Answered state */}
              {answered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-3 flex items-center gap-2 rounded-lg bg-[#3FB950]/10 px-3 py-2"
                >
                  <Zap className="h-4 w-4 text-[#3FB950]" />
                  <span className="text-xs font-bold text-[#3FB950]">
                    Answer locked in! Results after the over.
                  </span>
                </motion.div>
              )}

              {/* Expired state */}
              {isExpired && !answered && (
                <div className="mt-3 rounded-lg bg-[#F85149]/10 px-3 py-2 text-center text-xs font-semibold text-[#F85149]">
                  Time expired
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
