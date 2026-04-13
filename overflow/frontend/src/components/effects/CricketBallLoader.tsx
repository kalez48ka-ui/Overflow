"use client";

import { motion, Variants } from "framer-motion";

const BALL_SIZE = 80;
const ACCENT = "#E4002B";
const SEAM = "#E6EDF3";

const dropVariants: Variants = {
  hidden: { y: -120, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 10,
      stiffness: 180,
      mass: 0.7,
    },
  },
};

const spinVariants: Variants = {
  initial: { rotate: 0 },
  spinning: {
    rotate: 360,
    transition: {
      duration: 2,
      ease: "linear",
      repeat: Infinity,
    },
  },
};

const shadowVariants: Variants = {
  hidden: { scaleX: 0.3, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 0.3,
    transition: {
      type: "spring",
      damping: 10,
      stiffness: 180,
      mass: 0.7,
    },
  },
};

const textVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 1.4, ease: [0.33, 1, 0.68, 1] },
  },
};

/**
 * Compute a point on the upper or lower seam curve at parameter t (0..1).
 * The seam follows a sinusoidal arc across the ball equator.
 */
function seamPoint(
  t: number,
  upper: boolean
): { x: number; y: number; angle: number } {
  const x = 8 + t * 64;
  const amplitude = upper ? -15 : 15;
  const y = 40 + amplitude * Math.sin(t * Math.PI);
  // tangent angle for stitch orientation
  const dx = 64;
  const dy = amplitude * Math.PI * Math.cos(t * Math.PI);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { x, y, angle };
}

/** Generate cross-stitch marks perpendicular to the seam curve */
function stitchMarks(upper: boolean) {
  const stitchPositions = [0.12, 0.24, 0.36, 0.5, 0.64, 0.76, 0.88];
  return stitchPositions.map((t, i) => {
    const { x, y, angle } = seamPoint(t, upper);
    const perpAngle = angle + 90;
    const rad = (perpAngle * Math.PI) / 180;
    const len = 2.8;
    return (
      <line
        key={`${upper ? "u" : "l"}-${i}`}
        x1={x - Math.cos(rad) * len}
        y1={y - Math.sin(rad) * len}
        x2={x + Math.cos(rad) * len}
        y2={y + Math.sin(rad) * len}
        stroke={SEAM}
        strokeWidth="0.8"
        strokeLinecap="round"
        opacity="0.65"
      />
    );
  });
}

interface CricketBallLoaderProps {
  showText?: boolean;
  size?: number;
  className?: string;
}

export function CricketBallLoader({
  showText = true,
  size = BALL_SIZE,
  className = "",
}: CricketBallLoaderProps) {
  const scale = size / BALL_SIZE;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Ball + shadow container */}
      <div className="relative" style={{ width: size, height: size + 20 }}>
        {/* Shadow beneath the ball */}
        <motion.div
          variants={shadowVariants}
          initial="hidden"
          animate="visible"
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: size * 0.55,
            height: 6 * scale,
            borderRadius: "50%",
            background: "rgba(228, 0, 43, 0.12)",
            filter: `blur(${5 * scale}px)`,
          }}
        />

        {/* Ball — drops in with spring, then spins continuously */}
        <motion.div
          variants={dropVariants}
          initial="hidden"
          animate="visible"
          className="absolute inset-0"
        >
          <motion.div
            variants={spinVariants}
            initial="initial"
            animate="spinning"
            style={{ width: size, height: size }}
          >
            <svg
              viewBox="0 0 80 80"
              width={size}
              height={size}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Ball body */}
              <circle cx="40" cy="40" r="38" fill={ACCENT} />

              {/* Leather shading — highlight top-left, darken bottom-right */}
              <circle cx="40" cy="40" r="38" fill="url(#leatherShading)" />

              {/* Subtle edge darkening */}
              <circle
                cx="40"
                cy="40"
                r="37"
                stroke="rgba(0,0,0,0.15)"
                strokeWidth="2"
                fill="none"
              />

              {/* Upper seam arc */}
              <path
                d="M8 40 C18 28, 30 25, 40 25 C50 25, 62 28, 72 40"
                stroke={SEAM}
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />

              {/* Lower seam arc */}
              <path
                d="M8 40 C18 52, 30 55, 40 55 C50 55, 62 52, 72 40"
                stroke={SEAM}
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />

              {/* Cross-stitches on upper seam */}
              {stitchMarks(true)}

              {/* Cross-stitches on lower seam */}
              {stitchMarks(false)}

              <defs>
                <radialGradient
                  id="leatherShading"
                  cx="32%"
                  cy="32%"
                  r="65%"
                >
                  <stop offset="0%" stopColor="white" stopOpacity="0.14" />
                  <stop offset="60%" stopColor="transparent" stopOpacity="0" />
                  <stop offset="100%" stopColor="black" stopOpacity="0.22" />
                </radialGradient>
              </defs>
            </svg>
          </motion.div>
        </motion.div>
      </div>

      {/* Brand text — fades in after ball lands */}
      {showText && (
        <motion.div
          variants={textVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          <h1 className="font-black text-2xl tracking-tight text-[#E6EDF3]">
            OVER<span className="text-[#E4002B]">FLOW</span>
          </h1>
          <p className="text-xs text-[#8B949E] mt-1 tracking-widest uppercase">
            PSL Trading Platform
          </p>
        </motion.div>
      )}
    </div>
  );
}
