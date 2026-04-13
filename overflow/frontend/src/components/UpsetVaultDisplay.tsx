"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Shield, TrendingUp, Zap } from "lucide-react";
import { formatCurrency, formatCountdown } from "@/lib/utils";

interface UpsetVaultDisplayProps {
  balance: number;
  multiplier: number;
  nextMatchTime: number;
  compact?: boolean;
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1500;
    startValueRef.current = displayValue;
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (value - startValueRef.current) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return <span>{formatCurrency(displayValue)}</span>;
}

export function UpsetVaultDisplay({
  balance,
  multiplier,
  nextMatchTime,
  compact = false,
}: UpsetVaultDisplayProps) {
  const [countdown, setCountdown] = useState(nextMatchTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(nextMatchTime - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [nextMatchTime]);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#6A0DAD]/40 bg-[#6A0DAD]/10 px-4 py-2.5">
        <Shield className="h-4 w-4 text-[#6A0DAD]" />
        <div>
          <p className="text-[10px] text-[#8B949E]">Upset Vault</p>
          <p className="text-sm font-bold text-[#E6EDF3]">{formatCurrency(balance)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-[#8B949E]">Multiplier</p>
          <p className="text-sm font-bold text-[#6A0DAD]">{multiplier}x</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#6A0DAD]/40 bg-gradient-to-br from-[#2A0050]/60 to-[#161B22] overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#6A0DAD]/30 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6A0DAD]">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#E6EDF3]">Upset Vault</h3>
            <p className="text-xs text-[#8B949E]">Funds when underdogs win</p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="px-5 py-6 text-center">
        <p className="mb-1 text-xs uppercase tracking-widest text-[#8B949E]">Current Balance</p>
        <motion.div
          className="text-4xl font-black tabular-nums text-[#E6EDF3]"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          <AnimatedNumber value={balance} />
        </motion.div>

        {/* Multiplier badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#6A0DAD]/50 bg-[#6A0DAD]/20 px-3 py-1">
          <Zap className="h-3 w-3 text-[#6A0DAD]" />
          <span className="text-xs font-bold text-[#6A0DAD]">
            Current Upset Multiplier: {multiplier}x
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-px border-t border-[#30363D]">
        <div className="bg-[#0D1117]/50 px-4 py-3">
          <p className="text-xs text-[#8B949E]">Next Match</p>
          <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-[#E6EDF3]">
            {countdown > 0 ? formatCountdown(countdown) : "LIVE NOW"}
          </p>
        </div>
        <div className="bg-[#0D1117]/50 px-4 py-3">
          <div className="flex items-center gap-1 text-xs text-[#8B949E]">
            <TrendingUp className="h-3 w-3" />
            Grows every trade
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[#3FB950]">+2% of fees go to vault</p>
        </div>
      </div>
    </div>
  );
}
