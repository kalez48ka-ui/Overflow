"use client";

/**
 * MouseTrackCard — 3D perspective tilt wrapper that tracks cursor position.
 *
 * Applies subtle rotateX/rotateY transforms and a radial spotlight gradient
 * that follows the pointer. Inspired by the card effect on stripe.com/payments.
 *
 * On mobile (no pointer device) the tilt is disabled — only children render.
 */

import { useRef, useCallback, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

interface MouseTrackCardProps {
  children: ReactNode;
  /** Max tilt angle in degrees (default 5) */
  maxTilt?: number;
  /** Spring stiffness (default 260) */
  stiffness?: number;
  /** Spring damping (default 24) */
  damping?: number;
  /** Spotlight opacity on hover (0-1, default 0.08) */
  spotlightOpacity?: number;
  className?: string;
}

export function MouseTrackCard({
  children,
  maxTilt = 5,
  stiffness = 260,
  damping = 24,
  spotlightOpacity = 0.08,
  className = "",
}: MouseTrackCardProps) {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalized mouse position (0–1), center = 0.5
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  // Spotlight position for the radial gradient (in %)
  const spotlightX = useMotionValue(50);
  const spotlightY = useMotionValue(50);
  const spotlightAlpha = useMotionValue(0);

  // Map normalized coords to tilt angles
  const rawRotateX = useTransform(mouseY, [0, 1], [maxTilt, -maxTilt]);
  const rawRotateY = useTransform(mouseX, [0, 1], [-maxTilt, maxTilt]);

  // Smooth with springs
  const rotateX = useSpring(rawRotateX, { stiffness, damping });
  const rotateY = useSpring(rawRotateY, { stiffness, damping });
  const smoothAlpha = useSpring(spotlightAlpha, { stiffness: 200, damping: 30 });

  // Build the spotlight background dynamically
  const spotlightBg = useTransform(
    [spotlightX, spotlightY, smoothAlpha],
    ([x, y, a]: number[]) =>
      `radial-gradient(600px circle at ${x}% ${y}%, rgba(255,255,255,${(a * spotlightOpacity).toFixed(3)}), transparent 40%)`
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReduced) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      mouseX.set(nx);
      mouseY.set(ny);
      spotlightX.set(nx * 100);
      spotlightY.set(ny * 100);
    },
    [prefersReduced, mouseX, mouseY, spotlightX, spotlightY],
  );

  const handleMouseEnter = useCallback(() => {
    if (prefersReduced) return;
    spotlightAlpha.set(1);
  }, [prefersReduced, spotlightAlpha]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    spotlightAlpha.set(0);
  }, [mouseX, mouseY, spotlightAlpha]);

  // Skip 3D entirely when user prefers reduced motion
  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        perspective: 800,
        transformStyle: "preserve-3d",
        rotateX,
        rotateY,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {/* Spotlight overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-xl"
        style={{ background: spotlightBg }}
      />
    </motion.div>
  );
}
