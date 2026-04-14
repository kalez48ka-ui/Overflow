"use client";

import { useEffect, useRef, useState } from "react";

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
  const currentValueRef = useRef<number>(0);
  currentValueRef.current = displayValue;

  useEffect(() => {
    const duration = 1500;
    startValueRef.current = currentValueRef.current;
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
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setCountdown(nextMatchTime - Date.now());
    const interval = setInterval(() => {
      setCountdown(nextMatchTime - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [nextMatchTime]);

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#21262D] bg-[#161B22] px-4 py-2.5">
        <div>
          <p className="text-[10px] text-[#8B949E]">Vault</p>
          <p className="text-sm font-bold font-mono tabular-nums text-[#E6EDF3]">{formatCurrency(balance)}</p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-xs font-bold font-mono tabular-nums text-[#E4002B]">{multiplier}x</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#21262D] bg-[#161B22] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#21262D] px-4 py-2.5">
        <span className="text-xs text-[#8B949E]">Upset Vault</span>
        <span className="text-[10px] font-bold font-mono tabular-nums text-[#E4002B]">{multiplier}x</span>
      </div>

      <div className="p-4">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-black font-mono tabular-nums text-[#E6EDF3]">
            <AnimatedNumber value={balance} />
          </span>
          <span className="text-xs text-[#8B949E]">WIRE</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-[#8B949E]">Next </span>
            <span className="font-mono tabular-nums text-[#E6EDF3]">
              {countdown > 0 ? formatCountdown(countdown) : "LIVE"}
            </span>
          </div>
          <span className="text-[#8B949E]">+2% of fees</span>
        </div>
      </div>
    </div>
  );
}
