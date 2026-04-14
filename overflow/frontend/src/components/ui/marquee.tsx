"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  /** Scroll direction */
  direction?: "left" | "right";
  /** Animation duration in seconds (default 40) */
  duration?: number;
  /** Pause on hover */
  pauseOnHover?: boolean;
  /** Additional class for the container */
  className?: string;
  /** Repeat content N times for seamless loop (default 2) */
  repeat?: number;
}

export function Marquee({
  children,
  direction = "left",
  duration = 40,
  pauseOnHover = true,
  className,
  repeat = 2,
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group flex overflow-hidden [--gap:1rem] gap-[var(--gap)]",
        className,
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 items-center justify-around gap-[var(--gap)]",
            direction === "left" ? "animate-marquee-left" : "animate-marquee-right",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
          )}
          style={{ animationDuration: `${duration}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
