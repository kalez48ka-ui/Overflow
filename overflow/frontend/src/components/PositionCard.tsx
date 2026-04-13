"use client";

import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Position } from "@/types";
import { cn, formatPrice, formatCurrency, formatPercent } from "@/lib/utils";

interface PositionCardProps {
  position: Position;
  index?: number;
  onTrade?: (teamId: string) => void;
}

export function PositionCard({ position, index = 0, onTrade }: PositionCardProps) {
  const isProfit = position.pnlPercent >= 0;

  const handleShare = () => {
    const pnlSign = position.unrealizedPnl > 0 ? "+" : "";
    const text = [
      `I'm holding ${position.amount.toLocaleString()} ${position.symbol} tokens on Overflow!`,
      `Current P&L: ${position.pnlPercent >= 0 ? "+" : ""}${position.pnlPercent.toFixed(2)}% (${pnlSign}${position.unrealizedPnl.toFixed(2)} WIRE)`,
      `Trade PSL team tokens: overflow.app`,
    ].join("\n");

    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy");
    });
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
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: position.color }}
          >
            {position.teamId}
          </div>
          <div>
            <span className="text-sm font-semibold text-[#E6EDF3]">{position.teamName}</span>
            <span className="ml-2 text-xs text-[#484F58]">{position.symbol}</span>
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
              {isProfit ? "+" : ""}{formatPercent(position.pnlPercent)}
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
            title="Share position"
            className="flex h-7 w-7 items-center justify-center rounded border border-[#21262D] text-[#484F58] hover:text-[#8B949E] transition-colors"
          >
            <Share2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Row 2: Details */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 font-mono tabular-nums">
          <span className="text-[#8B949E]">{position.amount.toLocaleString()} tokens</span>
          <span className="text-[#484F58]">avg ${formatPrice(position.avgBuyPrice)}</span>
          <span className="text-[#E6EDF3]">now ${formatPrice(position.currentPrice)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold font-mono tabular-nums text-[#E6EDF3]">{formatCurrency(position.value)}</span>
          <button
            onClick={() => onTrade?.(position.teamId)}
            className="rounded border border-[#21262D] px-2.5 py-1 text-[10px] font-medium text-[#8B949E] hover:border-[#8B949E] hover:text-[#E6EDF3] transition-colors"
          >
            Trade
          </button>
        </div>
      </div>
    </motion.div>
  );
}
