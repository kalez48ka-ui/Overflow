"use client";

/**
 * StaggerReveal — Scroll-triggered staggered entrance for child elements.
 *
 * Each direct child animates in with a vertical slide + fade, staggered by
 * a configurable delay. Uses `useInView` with `once: true` so the animation
 * plays only on first scroll into viewport. Wraps children in AnimatePresence
 * for graceful exit animations.
 */

import { useRef, Children, type ReactNode } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";

interface StaggerRevealProps {
  children: ReactNode;
  /** Stagger delay between children in seconds (default 0.08) */
  staggerDelay?: number;
  /** Vertical offset for entrance in px (default 30) */
  yOffset?: number;
  /** Animation duration per child in seconds (default 0.5) */
  duration?: number;
  /** InView margin (default "-60px") */
  margin?: string;
  /** Additional class names for the wrapper */
  className?: string;
}

export function StaggerReveal({
  children,
  staggerDelay = 0.08,
  yOffset = 30,
  duration = 0.5,
  margin = "-60px",
  className = "",
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: margin as `${number}px` });
  const prefersReduced = useReducedMotion();

  const childArray = Children.toArray(children);

  return (
    <div ref={ref} className={className}>
      <AnimatePresence>
        {childArray.map((child, i) => (
          <motion.div
            key={i}
            initial={
              prefersReduced
                ? { opacity: 1 }
                : { opacity: 0, y: yOffset }
            }
            animate={
              isInView
                ? { opacity: 1, y: 0 }
                : prefersReduced
                  ? { opacity: 1 }
                  : { opacity: 0, y: yOffset }
            }
            exit={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, y: -yOffset / 2 }
            }
            transition={{
              duration: prefersReduced ? 0 : duration,
              delay: prefersReduced ? 0 : i * staggerDelay,
              ease: [0.25, 0.1, 0.25, 1.0],
            }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
