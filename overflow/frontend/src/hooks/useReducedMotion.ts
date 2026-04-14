"use client";

import { useReducedMotion as useFramerReducedMotion } from "framer-motion";

/**
 * Shared hook that wraps framer-motion's useReducedMotion.
 * Returns `true` when the user prefers reduced motion (OS-level setting).
 *
 * Usage:
 *   const prefersReduced = useReducedMotion();
 *   // skip or simplify animations when prefersReduced is true
 */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}

/**
 * Returns animation props that respect reduced-motion preference.
 * When reduced motion is preferred, animations resolve instantly
 * (opacity snaps to final state, no y/x translation, no stagger).
 */
export function useMotionProps() {
  const prefersReduced = useReducedMotion();

  /** Fade-up reveal used across hero sections and cards */
  const fadeUp = prefersReduced
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {};

  /** whileInView section reveal — disable completely when reduced */
  const sectionReveal = prefersReduced
    ? {
        initial: { opacity: 1, y: 0 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 32 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-10%" as const },
        transition: { duration: 0.6, ease: "easeOut" as const },
      };

  /** Stagger items — instant when reduced */
  function staggerItem(delay: number) {
    if (prefersReduced) {
      return {
        initial: { opacity: 1, y: 0 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0 },
      };
    }
    return {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true },
      transition: { duration: 0.5, delay },
    };
  }

  return { prefersReduced, fadeUp, sectionReveal, staggerItem };
}
