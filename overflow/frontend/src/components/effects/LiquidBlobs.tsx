"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * LiquidBlobs — Organic SVG blobs that morph shape and lazily follow the
 * cursor with heavy spring delay. Like a neon lava lamp at very low opacity.
 *
 * Uses PSL brand colours: red, gold, green.
 * Disabled on touch-only devices to save GPU budget.
 */

// Four organic blob shapes. Each is a closed SVG path that fills roughly
// a 200x200 viewBox. We animate between them with framer-motion path morphing.
const BLOB_PATHS = [
  "M45,-59.1C56.6,-51.5,63,-35.2,67.3,-18.3C71.7,-1.4,73.9,16.1,67.5,30.1C61.2,44.1,46.2,54.5,30.2,61.5C14.2,68.5,-2.8,72.1,-19.2,68.2C-35.5,64.3,-51.2,52.9,-60.2,38.2C-69.3,23.5,-71.8,5.5,-68.4,-10.8C-65,-27.1,-55.8,-41.8,-43.3,-49.1C-30.8,-56.5,-15.4,-56.6,1.3,-58.3C18,-60,33.4,-66.6,45,-59.1Z",
  "M39.5,-50.9C50.5,-43.7,58.3,-30.7,62.8,-15.9C67.3,-1.1,68.5,15.5,62.1,28.5C55.7,41.6,41.6,51.1,26.7,57.4C11.8,63.7,-3.9,66.7,-19.8,63.5C-35.7,60.3,-51.8,50.8,-60.4,37C-69,23.2,-70.1,5.1,-65.7,-10.4C-61.2,-25.9,-51.2,-38.8,-39,-47.2C-26.8,-55.5,-12.4,-59.2,1.5,-61.1C15.4,-63,28.5,-58.2,39.5,-50.9Z",
  "M43.3,-55.5C54.4,-47.9,60.8,-33.1,64.4,-17.6C68,-2.1,68.9,14.1,63,27.3C57.1,40.5,44.4,50.8,30.2,57.2C16,63.6,0.3,66.1,-16,63.2C-32.3,60.3,-49.1,52,-58.7,39C-68.2,26,-70.4,8.2,-67,-8.1C-63.6,-24.4,-54.5,-39.2,-42.5,-46.5C-30.6,-53.9,-15.3,-53.8,0.5,-54.4C16.3,-55,32.2,-63.1,43.3,-55.5Z",
  "M37.9,-46.5C49.6,-40.3,59.7,-28.4,64.2,-14.2C68.7,0,67.6,16.5,60.4,29.5C53.1,42.6,39.6,52.2,24.8,58.3C10,64.4,-6.1,67,-20.4,62.7C-34.7,58.4,-47.2,47.2,-55.8,33.4C-64.5,19.6,-69.3,3.2,-66.3,-11.4C-63.2,-26,-52.2,-38.8,-39.6,-44.8C-27,-50.8,-13.5,-50.1,0.6,-50.9C14.8,-51.7,26.3,-52.7,37.9,-46.5Z",
];

const BLOBS = [
  { color: "#ffffff", opacity: 0.03, scale: 1.1, speed: 22 },
  { color: "#ffffff", opacity: 0.025, scale: 0.95, speed: 28 },
  { color: "#ffffff", opacity: 0.03, scale: 1.0, speed: 25 },
];

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(
      typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    );
  }, []);
  return isTouch;
}

export function LiquidBlobs() {
  const isTouch = useIsTouchDevice();
  const [mounted, setMounted] = useState(false);

  // Track mouse position with heavy springs so blobs lag behind the cursor
  const mouseX = useMotionValue(500);
  const mouseY = useMotionValue(500);

  const springConfig = { damping: 60, stiffness: 20, mass: 3 };
  const blobX = useSpring(mouseX, springConfig);
  const blobY = useSpring(mouseY, springConfig);

  useEffect(() => {
    setMounted(true);
    // Centre on actual viewport
    mouseX.set(window.innerWidth / 2);
    mouseY.set(window.innerHeight / 2);
  }, [mouseX, mouseY]);

  useEffect(() => {
    if (isTouch || !mounted) return;

    function handleMove(e: MouseEvent) {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    }

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [isTouch, mounted, mouseX, mouseY]);

  // Don't render on server or touch devices — prevents hydration mismatch
  if (!mounted || isTouch) return null;

  const firstPath = BLOB_PATHS[0] ?? "";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {BLOBS.map((blob, idx) => (
        <motion.div
          key={idx}
          className="absolute"
          style={{
            x: blobX,
            y: blobY,
            translateX: "-50%",
            translateY: "-50%",
            marginLeft: `${(idx - 1) * 180}px`,
            marginTop: `${(idx - 1) * 80}px`,
          }}
        >
          <svg
            width="500"
            height="500"
            viewBox="-100 -100 200 200"
            style={{
              transform: `scale(${blob.scale})`,
              filter: `blur(60px)`,
            }}
          >
            <motion.path
              d={firstPath}
              fill={blob.color}
              fillOpacity={blob.opacity}
              animate={{ d: BLOB_PATHS }}
              transition={{
                d: {
                  duration: blob.speed,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                },
              }}
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
