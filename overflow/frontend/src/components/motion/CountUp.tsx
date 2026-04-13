"use client";

/**
 * CountUp — Animated number counter that smoothly interpolates from 0 to target.
 *
 * Triggers when the element scrolls into view (once). Uses Framer Motion's
 * useMotionValue + useSpring for butter-smooth 60fps interpolation.
 */

import { useRef, useEffect, useState } from "react";
import {
  useMotionValue,
  useSpring,
  useInView,
  useReducedMotion,
} from "framer-motion";

interface CountUpProps {
  /** Target value to count up to */
  value: number;
  /** Duration in seconds (default 1.5) */
  duration?: number;
  /** Text before the number (e.g. "$") */
  prefix?: string;
  /** Text after the number (e.g. "K") */
  suffix?: string;
  /** Number of decimal places (default: 0) */
  decimals?: number;
  /** Custom formatter — overrides default comma formatting */
  formatter?: (n: number) => string;
  /** Additional class names */
  className?: string;
}

function defaultFormat(n: number, decimals: number): string {
  const fixed = n.toFixed(decimals);
  const [whole, decimal] = fixed.split(".");
  // Insert commas into the integer portion
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal !== undefined ? `${withCommas}.${decimal}` : withCommas;
}

export function CountUp({
  value,
  duration = 1.5,
  prefix = "",
  suffix = "",
  decimals = 0,
  formatter,
  className = "",
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const prefersReduced = useReducedMotion();

  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    duration: duration * 1000,
    bounce: 0,
  });

  const [display, setDisplay] = useState("0");

  // Drive the spring to the target once in view
  useEffect(() => {
    if (isInView) {
      if (prefersReduced) {
        motionVal.jump(value);
      } else {
        motionVal.set(value);
      }
    }
  }, [isInView, value, motionVal, prefersReduced]);

  // Subscribe to spring changes and update display string
  useEffect(() => {
    const unsubscribe = springVal.on("change", (latest: number) => {
      const formatted = formatter
        ? formatter(latest)
        : defaultFormat(latest, decimals);
      setDisplay(formatted);
    });
    return unsubscribe;
  }, [springVal, formatter, decimals]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
