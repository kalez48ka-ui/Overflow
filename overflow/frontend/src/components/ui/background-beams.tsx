"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BackgroundBeamsProps {
  className?: string;
  /** Number of beam lines (default 6) */
  beamCount?: number;
  /** Color of beams — defaults to white */
  color?: string;
}

/**
 * BackgroundBeams — SVG-based animated beam lines radiating from a focal point.
 * Thin lines at very low opacity that fade in staggered. Hidden on mobile for performance.
 */
export function BackgroundBeams({
  className,
  beamCount = 6,
  color = "#E6EDF3",
}: BackgroundBeamsProps) {
  const id = useId();

  // Generate beam endpoints distributed across the bottom/sides
  const beams = Array.from({ length: beamCount }, (_, i) => {
    const t = i / (beamCount - 1);
    // Focal point near top-center
    const x1 = 50;
    const y1 = 5;
    // Endpoints spread across the bottom and sides
    const angle = -60 + t * 120; // -60deg to +60deg
    const rad = (angle * Math.PI) / 180;
    const length = 110;
    const x2 = x1 + Math.sin(rad) * length;
    const y2 = y1 + Math.cos(rad) * length;
    return { x1, y1, x2, y2, delay: i * 0.15 };
  });

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden hidden md:block",
        className,
      )}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {beams.map((_, i) => (
            <linearGradient
              key={`${id}-grad-${i}`}
              id={`${id}-beam-grad-${i}`}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor={color} stopOpacity="0.08" />
              <stop offset="50%" stopColor={color} stopOpacity="0.04" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {beams.map((beam, i) => (
          <motion.line
            key={`${id}-line-${i}`}
            x1={beam.x1}
            y1={beam.y1}
            x2={beam.x2}
            y2={beam.y2}
            stroke={`url(#${id}-beam-grad-${i})`}
            strokeWidth={0.15}
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{
              opacity: { duration: 0.8, delay: beam.delay },
              pathLength: { duration: 1.2, delay: beam.delay, ease: "easeOut" },
            }}
          />
        ))}
      </svg>
    </div>
  );
}
