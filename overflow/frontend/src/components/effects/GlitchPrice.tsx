"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CHARS = "0123456789$.,";

interface GlitchPriceProps {
  /** The price string to display, e.g. "$1.2345" */
  value: string;
  /** Previous value — used to determine direction arrow. Pass null on first render. */
  previousValue?: string | null;
  /** How long the scramble lasts in ms. Default 600. */
  duration?: number;
  className?: string;
}

export function GlitchPrice({
  value,
  previousValue = null,
  duration = 600,
  className = "",
}: GlitchPriceProps) {
  const [displayed, setDisplayed] = useState(value);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const [isGlitching, setIsGlitching] = useState(false);
  const [showArrow, setShowArrow] = useState(false);
  const prevRef = useRef(previousValue ?? value);
  const glitchRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runGlitch = useCallback(
    (from: string, to: string) => {
      setIsGlitching(true);

      // Determine direction
      const fromNum = parseFloat(from.replace(/[^0-9.]/g, ""));
      const toNum = parseFloat(to.replace(/[^0-9.]/g, ""));
      if (fromNum !== toNum) {
        setDirection(toNum > fromNum ? "up" : "down");
        setShowArrow(true);
      }

      const totalSteps = Math.ceil(duration / 25);
      let step = 0;

      if (glitchRef.current) clearInterval(glitchRef.current);

      glitchRef.current = setInterval(() => {
        step++;
        const progress = step / totalSteps;

        // Characters resolved so far
        const resolvedCount = Math.floor(progress * to.length);
        const resolved = to.slice(0, resolvedCount);
        const scrambled = Array.from(
          { length: to.length - resolvedCount },
          () => CHARS[Math.floor(Math.random() * CHARS.length)]
        ).join("");

        setDisplayed(resolved + scrambled);

        if (step >= totalSteps) {
          if (glitchRef.current) clearInterval(glitchRef.current);
          setDisplayed(to);
          setIsGlitching(false);

          // Hide arrow after 1.5s
          setTimeout(() => setShowArrow(false), 1500);
        }
      }, 25);
    },
    [duration]
  );

  // Glitch on value change
  useEffect(() => {
    if (value !== prevRef.current) {
      runGlitch(prevRef.current, value);
      prevRef.current = value;
    }
  }, [value, runGlitch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (glitchRef.current) clearInterval(glitchRef.current);
    };
  }, []);

  const glowColor =
    direction === "up"
      ? "#3FB950"
      : direction === "down"
        ? "#F85149"
        : "transparent";

  return (
    <motion.span
      className={`relative inline-flex items-center font-mono ${className}`}
      aria-label={value}
      animate={
        isGlitching
          ? { x: [0, -2, 3, -1, 2, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Glow flash on change */}
      <AnimatePresence>
        {isGlitching && direction && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}40`,
              backgroundColor: `${glowColor}08`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Price digits */}
      <span
        aria-hidden="true"
        style={{
          textShadow: isGlitching
            ? `0 0 8px ${glowColor}80`
            : "none",
          transition: "text-shadow 0.3s ease",
        }}
      >
        {displayed}
      </span>

      {/* Direction arrow that floats away */}
      <AnimatePresence>
        {showArrow && direction && (
          <motion.span
            className="absolute -right-5 text-xs font-bold"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: direction === "up" ? -16 : 16 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ color: glowColor }}
          >
            {direction === "up" ? "\u25B2" : "\u25BC"}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.span>
  );
}
