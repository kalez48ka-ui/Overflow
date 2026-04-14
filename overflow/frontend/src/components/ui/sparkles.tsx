"use client";

import React, { useId, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SparklesProps {
  className?: string;
  /** Number of sparkle particles (default 20) */
  count?: number;
  /** Min size in px (default 1) */
  minSize?: number;
  /** Max size in px (default 3) */
  maxSize?: number;
  /** Min animation duration in s (default 1) */
  minDuration?: number;
  /** Max animation duration in s (default 3) */
  maxDuration?: number;
  /** Sparkle color (default #FDB913 gold) */
  color?: string;
  children?: React.ReactNode;
}

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function Sparkles({
  className,
  count = 20,
  minSize = 1,
  maxSize = 3,
  minDuration = 1,
  maxDuration = 3,
  color = "#FDB913",
  children,
}: SparklesProps) {
  const id = useId();

  const sparkles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `${id}-${i}`,
        x: `${random(0, 100)}%`,
        y: `${random(0, 100)}%`,
        size: random(minSize, maxSize),
        duration: random(minDuration, maxDuration),
        delay: random(0, maxDuration),
      })),
    [id, count, minSize, maxSize, minDuration, maxDuration],
  );

  return (
    <div className={cn("relative inline-block", className)}>
      {sparkles.map((sparkle) => (
        <motion.span
          key={sparkle.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            width: sparkle.size,
            height: sparkle.size,
            backgroundColor: color,
            boxShadow: `0 0 ${sparkle.size * 2}px ${color}`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      {children && <span className="relative z-10">{children}</span>}
    </div>
  );
}
