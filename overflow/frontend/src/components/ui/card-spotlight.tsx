"use client";

import React, { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CardSpotlightProps {
  children: React.ReactNode;
  className?: string;
  /** Spotlight color — defaults to a subtle white */
  color?: string;
  /** Spotlight radius in px (default 200) */
  radius?: number;
  /** Spotlight opacity (default 0.08) */
  opacity?: number;
}

/**
 * CardSpotlight — A card wrapper with a radial gradient spotlight that
 * follows the cursor position within the card. Lightweight alternative
 * to MouseTrackCard — just the spotlight effect, no 3D transforms.
 */
export function CardSpotlight({
  children,
  className,
  color = "255, 255, 255",
  radius = 200,
  opacity = 0.08,
}: CardSpotlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [],
  );

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Spotlight radial gradient */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${radius}px circle at ${position.x}px ${position.y}px, rgba(${color}, ${opacity}), transparent 70%)`,
        }}
      />
      {/* Card content */}
      <div className="relative z-0">{children}</div>
    </div>
  );
}
