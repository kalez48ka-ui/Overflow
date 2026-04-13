"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { Position } from "@/types";
import { cn, formatPrice, formatCurrency, formatPercent, hexToRgba } from "@/lib/utils";

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
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="relative rounded-xl border bg-[#161B22] p-4 transition-colors hover:border-opacity-70"
      style={{ borderColor: hexToRgba(position.color, 0.3) }}
    >
      {/* Share button — top right */}
      <button
        onClick={handleShare}
        title="Share position"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-[#30363D] text-[#8B949E] hover:border-[#58A6FF] hover:text-[#58A6FF] transition-colors"
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center justify-between pr-8">
        {/* Team info */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: position.color }}
          >
            {position.teamId}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#E6EDF3]">{position.teamName}</p>
            <p className="text-xs text-[#8B949E]">{position.symbol}</p>
          </div>
        </div>

        {/* P&L */}
        <div className="text-right">
          <div
            className={cn(
              "flex items-center gap-1 justify-end text-base font-bold",
              isProfit ? "text-[#3FB950]" : "text-[#F85149]"
            )}
          >
            {isProfit ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {formatPercent(position.pnlPercent)}
          </div>
          <p
            className={cn(
              "text-xs font-medium",
              isProfit ? "text-[#3FB950]" : "text-[#F85149]"
            )}
          >
            {isProfit ? "+" : ""}
            {formatCurrency(position.unrealizedPnl)}
          </p>
        </div>
      </div>

      {/* Details grid */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#30363D] pt-3">
        <div>
          <p className="text-[10px] text-[#8B949E]">Amount</p>
          <p className="text-xs font-semibold text-[#E6EDF3]">
            {position.amount.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#8B949E]">Avg Buy</p>
          <p className="text-xs font-semibold text-[#E6EDF3]">
            ${formatPrice(position.avgBuyPrice)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#8B949E]">Current</p>
          <p className="text-xs font-semibold text-[#E6EDF3]">
            ${formatPrice(position.currentPrice)}
          </p>
        </div>
      </div>

      {/* Value + trade button */}
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[#8B949E]">Position Value</p>
          <p className="text-sm font-bold text-[#E6EDF3]">{formatCurrency(position.value)}</p>
        </div>
        <button
          onClick={() => onTrade?.(position.teamId)}
          className="rounded-lg border border-[#30363D] px-3 py-1.5 text-xs font-medium text-[#8B949E] hover:border-[#58A6FF] hover:text-[#58A6FF] transition-colors"
        >
          Trade
        </button>
      </div>

      {/* Color bar */}
      <div
        className="mt-3 h-1 rounded-full overflow-hidden bg-[#21262D]"
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: isProfit ? "#3FB950" : "#F85149" }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.abs(position.pnlPercent) * 3, 100)}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 }}
        />
      </div>
    </motion.div>
  );
}
