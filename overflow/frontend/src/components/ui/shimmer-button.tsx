"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * ShimmerButton — A button with an animated shimmer/sweep effect.
 * The shimmer is a subtle diagonal gradient that sweeps across on hover.
 * Uses CSS animation for performance (no JS animation loop).
 */
export function ShimmerButton({
  children,
  className,
  shimmerColor = "rgba(255, 255, 255, 0.12)",
  onClick,
  disabled = false,
}: ShimmerButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-xl px-6 py-3 text-sm font-bold text-[#E6EDF3] transition-all duration-300 ease-out",
        "bg-[#E4002B] hover:bg-[#C00025]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {/* Shimmer overlay — sweeps on hover via CSS */}
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-20deg] transition-transform duration-700 ease-out group-hover:translate-x-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
        }}
      />
      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
