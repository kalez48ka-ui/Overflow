"use client";

import React from "react";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Position } from "@/types";
import { cn, formatPrice, formatCurrency, formatPercent } from "@/lib/utils";
import { TeamLogo } from "@/components/TeamLogo";

interface PositionCardProps {
  position: Position;
  index?: number;
  onTrade?: (teamId: string) => void;
}

export const PositionCard = React.memo(function PositionCard({ position, index = 0, onTrade }: PositionCardProps) {
  const isProfit = position.pnlPercent >= 0;

  const handleShare = async () => {
    const pnlSign = position.unrealizedPnl > 0 ? "+" : "";
    const text = [
      `I'm holding ${position.amount.toLocaleString()} ${position.symbol} tokens on Overflow!`,
      `Current P&L: ${position.pnlPercent >= 0 ? "+" : ""}${position.pnlPercent.toFixed(2)}% (${pnlSign}${position.unrealizedPnl.toFixed(2)} WIRE)`,
      `Trade PSL team tokens: overflow.app`,
    ].join("\n");

    // Try Web Share API first (mobile-friendly)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        toast.success("Shared!");
        return;
      } catch (e) {
        // User cancelled or share failed — fall through to clipboard
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }

    // Clipboard fallback with textarea trick for non-HTTPS
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl border border-[#21262D] bg-[#161B22] p-4"
    >
      {/* Row 1: Team + P&L */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <TeamLogo teamId={position.teamId} color={position.color} size={32} />
          <div>
            <span className="text-sm font-semibold text-[#E6EDF3]">{position.teamName}</span>
            <span className="ml-2 text-xs text-[#8B949E]">{position.symbol}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span
              className={cn(
                "text-base font-black font-mono tabular-nums",
                isProfit ? "text-[#3FB950]" : "text-[#F85149]"
              )}
            >
              {formatPercent(position.pnlPercent)}
            </span>
            <p
              className={cn(
                "text-[10px] font-mono tabular-nums",
                isProfit ? "text-[#3FB950]" : "text-[#F85149]"
              )}
            >
              {isProfit ? "+" : ""}{formatCurrency(position.unrealizedPnl)}
            </p>
          </div>
          <button
            onClick={handleShare}
            aria-label="Share position"
            className="flex h-9 w-9 items-center justify-center rounded border border-[#21262D] text-[#8B949E] hover:text-[#9CA3AF] transition-colors"
          >
            <Share2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Row 2: Details */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono tabular-nums">
          <span className="text-[#9CA3AF]">{position.amount.toLocaleString()} tokens</span>
          <span className="text-[#8B949E]">avg ${formatPrice(position.avgBuyPrice)}</span>
          <span className="text-[#E6EDF3]">now ${formatPrice(position.currentPrice)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold font-mono tabular-nums text-[#E6EDF3]">{formatCurrency(position.value)}</span>
          <button
            onClick={() => onTrade?.(position.teamId)}
            className="rounded border border-[#21262D] px-2.5 py-1.5 min-h-[44px] sm:min-h-0 sm:py-1 text-[10px] font-medium text-[#9CA3AF] hover:border-[#9CA3AF] hover:text-[#E6EDF3] transition-colors"
          >
            Trade
          </button>
        </div>
      </div>
    </motion.div>
  );
});
