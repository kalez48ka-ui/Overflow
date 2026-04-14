"use client";

import { useEffect, useRef, useState } from "react";
import {
  useMotionValue,
  useSpring,
  useReducedMotion,
  motion,
  AnimatePresence,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  /** The current value to display */
  value: number;
  /** Number of decimal places (default 2) */
  decimals?: number;
  /** Text before the number (e.g. "$") */
  prefix?: string;
  /** Text after the number (e.g. "%") */
  suffix?: string;
  /** Custom formatter function */
  formatter?: (n: number) => string;
  /** Spring duration in ms (default 600) */
  duration?: number;
  /** Additional class names */
  className?: string;
  /** Show a brief flash on change (default true) */
  showFlash?: boolean;
  /** Show direction arrow on change (default true) */
  showArrow?: boolean;
}

function defaultFormat(n: number, decimals: number): string {
  const fixed = n.toFixed(decimals);
  const [whole, decimal] = fixed.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal !== undefined ? `${withCommas}.${decimal}` : withCommas;
}

/**
 * NumberTicker — Smoothly animates between number values using spring physics.
 * Only animates on VALUE CHANGE, not on initial mount. Shows a brief green/red
 * flash and direction arrow when the value changes.
 */
export function NumberTicker({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  formatter,
  duration = 600,
  className,
  showFlash = true,
  showArrow = true,
}: NumberTickerProps) {
  const prefersReduced = useReducedMotion();
  const isInitialMount = useRef(true);
  const prevValue = useRef(value);

  const motionVal = useMotionValue(value);
  const springVal = useSpring(motionVal, {
    duration: prefersReduced ? 0 : duration,
    bounce: 0,
  });

  const [display, setDisplay] = useState(() =>
    formatter ? formatter(value) : defaultFormat(value, decimals),
  );

  // Direction of last change: null on mount, "up" or "down" on change
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const flashTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On value change (not initial mount), trigger animation
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevValue.current = value;
      // Set initial display without animation
      motionVal.jump(value);
      return;
    }

    // Determine direction
    if (value !== prevValue.current) {
      const dir = value > prevValue.current ? "up" : "down";
      setDirection(dir);

      // Clear previous flash timeout
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => setDirection(null), 900);

      prevValue.current = value;
    }

    if (prefersReduced) {
      motionVal.jump(value);
    } else {
      motionVal.set(value);
    }
  }, [value, motionVal, prefersReduced]);

  // Subscribe to spring and update display
  useEffect(() => {
    const unsubscribe = springVal.on("change", (latest: number) => {
      setDisplay(
        formatter ? formatter(latest) : defaultFormat(latest, decimals),
      );
    });
    return unsubscribe;
  }, [springVal, formatter, decimals]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeout.current) clearTimeout(flashTimeout.current);
    };
  }, []);

  const flashColor =
    direction === "up"
      ? "rgba(63, 185, 80, 0.15)"
      : direction === "down"
        ? "rgba(248, 81, 73, 0.15)"
        : "transparent";

  const arrowColor =
    direction === "up" ? "#3FB950" : direction === "down" ? "#F85149" : undefined;

  return (
    <span
      className={cn("relative inline-flex items-center tabular-nums font-mono", className)}
    >
      {/* Flash background */}
      {showFlash && (
        <span
          className="absolute inset-0 -mx-1 rounded transition-colors duration-300"
          style={{ backgroundColor: flashColor }}
        />
      )}
      <span className="relative">
        {prefix}
        {display}
        {suffix}
      </span>
      {/* Direction arrow */}
      {showArrow && (
        <AnimatePresence>
          {direction && (
            <motion.span
              initial={{ opacity: 0, y: direction === "up" ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-1 text-[0.7em]"
              style={{ color: arrowColor }}
            >
              {direction === "up" ? "\u2191" : "\u2193"}
            </motion.span>
          )}
        </AnimatePresence>
      )}
    </span>
  );
}
