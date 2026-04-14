"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientBorderProps {
  children: React.ReactNode;
  className?: string;
  /** Container class names applied to the outer wrapper */
  containerClassName?: string;
  /** Border radius (default "0.75rem" / rounded-xl) */
  borderRadius?: string;
  /** Border width in px (default 1) */
  borderWidth?: number;
  /** Gradient colors for the animated border */
  gradientColors?: string[];
  /** Animation duration in seconds (default 4) */
  duration?: number;
  /** Whether the animation is active (default true) — useful for conditional activation */
  active?: boolean;
}

/**
 * AnimatedGradientBorder — A card wrapper with a rotating conic gradient border.
 * The gradient smoothly rotates, creating a subtle animated border effect.
 * Uses CSS animation for performance — no JS animation loop.
 */
export function AnimatedGradientBorder({
  children,
  className,
  containerClassName,
  borderRadius = "0.75rem",
  borderWidth = 1,
  gradientColors = ["#21262D", "#9CA3AF", "#21262D", "#8B949E", "#21262D"],
  duration = 4,
  active = true,
}: AnimatedGradientBorderProps) {
  const gradientString = gradientColors.join(", ");

  return (
    <div
      className={cn("relative overflow-hidden", containerClassName)}
      style={{ borderRadius, padding: borderWidth }}
    >
      {/* Rotating conic gradient — acts as the visible border */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius,
          background: active
            ? `conic-gradient(from 0deg at 50% 50%, ${gradientString})`
            : `${gradientColors[0]}`,
          animation: active ? `spin ${duration}s linear infinite` : "none",
        }}
      />
      {/* Inner content area — sits on top with the background color */}
      <div
        className={cn("relative bg-[#161B22]", className)}
        style={{
          borderRadius: `calc(${borderRadius} - ${borderWidth}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
