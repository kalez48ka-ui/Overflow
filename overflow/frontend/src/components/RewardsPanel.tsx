"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Loader2, CheckCircle } from "lucide-react";
import type { Reward } from "@/types";
import { cn, formatTimeAgo } from "@/lib/utils";

interface RewardsPanelProps {
  rewards: Reward[];
}

export function RewardsPanel({ rewards }: RewardsPanelProps) {
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<Set<string>>(new Set());

  const totalClaimable = rewards
    .filter((r) => r.claimable && !claimed.has(r.id))
    .reduce((sum, r) => sum + r.amount, 0);

  const handleClaim = async (rewardId: string) => {
    setClaiming(rewardId);
    await new Promise((r) => setTimeout(r, 1800));
    setClaiming(null);
    setClaimed((prev) => new Set([...prev, rewardId]));
  };

  const handleClaimAll = async () => {
    const claimable = rewards.filter((r) => r.claimable && !claimed.has(r.id));
    for (const reward of claimable) {
      await handleClaim(reward.id);
    }
  };

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#21262D] px-4 py-2.5">
        <span className="text-xs text-[#8B949E]">Rewards</span>
        {totalClaimable > 0 && (
          <button
            onClick={handleClaimAll}
            className="rounded-lg bg-[#FDB913] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#FFD04D] transition-colors"
          >
            Claim All ({totalClaimable.toFixed(2)} WIRE)
          </button>
        )}
      </div>

      <div className="divide-y divide-[#21262D]">
        {rewards.map((reward) => {
          const isClaimed = claimed.has(reward.id);
          const isClaiming = claiming === reward.id;

          return (
            <div
              key={reward.id}
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#E6EDF3] truncate">
                  {reward.description}
                </p>
                <p className="mt-0.5 text-[10px] text-[#8B949E]">
                  {formatTimeAgo(reward.earnedAt)}
                </p>
              </div>

              <div className="ml-3 flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-[#FDB913]">
                    +{reward.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-[#8B949E]">{reward.token}</p>
                </div>

                <AnimatePresence mode="wait">
                  {isClaimed ? (
                    <motion.div
                      key="claimed"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1C4A2A]"
                    >
                      <CheckCircle className="h-4 w-4 text-[#3FB950]" />
                    </motion.div>
                  ) : reward.claimable ? (
                    <button
                      key="claim"
                      onClick={() => handleClaim(reward.id)}
                      disabled={!!claiming}
                      className={cn(
                        "flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all",
                        "bg-[#FDB913] text-black hover:bg-[#FFD04D]",
                        claiming && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isClaiming ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Claim"
                      )}
                    </button>
                  ) : (
                    <span
                      key="pending"
                      className="rounded-lg border border-[#21262D] px-3 py-1.5 text-[10px] text-[#8B949E]"
                    >
                      Pending
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {rewards.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-[#8B949E]">No rewards yet</p>
            <p className="mt-1 text-xs text-[#484F58]">Trade team tokens to earn rewards</p>
          </div>
        )}
      </div>
    </div>
  );
}
