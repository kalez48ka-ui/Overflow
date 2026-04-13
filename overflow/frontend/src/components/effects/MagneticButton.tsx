"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  /** How far (px) from centre the button can be pulled. Default 14. */
  maxPull?: number;
  /** Radius (px) within which the magnetic effect activates. Default 150. */
  magnetRadius?: number;
  /** Glow colour at maximum proximity. Default "#3FB950". */
  glowColor?: string;
  onClick?: () => void;
}

export function MagneticButton({
  children,
  className = "",
  maxPull = 14,
  magnetRadius = 150,
  glowColor = "#3FB950",
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isNear, setIsNear] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glowOpacity = useMotionValue(0);

  const springConfig = { damping: 18, stiffness: 350, mass: 0.5 };
  const sx = useSpring(x, springConfig);
  const sy = useSpring(y, springConfig);
  const sGlow = useSpring(glowOpacity, { damping: 25, stiffness: 200 });

  // Detect touch device and skip magnet effect
  const isTouchRef = useRef(false);
  useEffect(() => {
    isTouchRef.current =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isTouchRef.current || !ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < magnetRadius) {
        const strength = 1 - dist / magnetRadius;
        x.set(dx * strength * (maxPull / magnetRadius));
        y.set(dy * strength * (maxPull / magnetRadius));
        glowOpacity.set(strength);
        setIsNear(true);
      } else {
        x.set(0);
        y.set(0);
        glowOpacity.set(0);
        setIsNear(false);
      }
    },
    [magnetRadius, maxPull, x, y, glowOpacity]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
    glowOpacity.set(0);
    setIsNear(false);
  }, [x, y, glowOpacity]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
        setRipple({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          id: Date.now(),
        });
      }
      onClick?.();
    },
    [onClick]
  );

  return (
    <motion.button
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ x: sx, y: sy }}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      whileTap={{ scale: 0.97 }}
    >
      {/* Dynamic glow ring */}
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          opacity: sGlow,
          boxShadow: `0 0 24px ${glowColor}80, 0 0 48px ${glowColor}40, inset 0 0 12px ${glowColor}20`,
        }}
      />

      {/* Click ripple shockwave */}
      {ripple && (
        <motion.span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: ripple.x,
            top: ripple.y,
            backgroundColor: `${glowColor}30`,
            transform: "translate(-50%, -50%)",
          }}
          initial={{ width: 0, height: 0, opacity: 0.7 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          onAnimationComplete={() => setRipple(null)}
        />
      )}

      {/* Scale-up on approach */}
      <motion.span
        className="relative z-10 flex items-center justify-center"
        animate={{ scale: isNear ? 1.04 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
}
