"use client";

import { motion } from "framer-motion";

/**
 * Subtle blockchain network animation — connected nodes pulsing in sequence.
 * Designed as an ambient background accent, not a focal element.
 */

interface Node {
  id: number;
  x: number;
  y: number;
}

interface Edge {
  from: number;
  to: number;
}

// 7 nodes in a loose, organic network layout (viewBox 0 0 200 120)
const NODES: Node[] = [
  { id: 0, x: 30, y: 35 },
  { id: 1, x: 75, y: 18 },
  { id: 2, x: 120, y: 40 },
  { id: 3, x: 55, y: 70 },
  { id: 4, x: 100, y: 80 },
  { id: 5, x: 160, y: 25 },
  { id: 6, x: 145, y: 75 },
  { id: 7, x: 170, y: 100 },
];

// Edges connecting nearby nodes — sparse, not fully connected
const EDGES: Edge[] = [
  { from: 0, to: 1 },
  { from: 0, to: 3 },
  { from: 1, to: 2 },
  { from: 1, to: 3 },
  { from: 2, to: 4 },
  { from: 2, to: 5 },
  { from: 3, to: 4 },
  { from: 4, to: 6 },
  { from: 5, to: 6 },
  { from: 6, to: 7 },
];

const LOOP_DURATION = 4; // seconds for full cycle
const PULSE_STAGGER = LOOP_DURATION / NODES.length; // ~0.5s between each node

interface BlockchainPulseProps {
  className?: string;
  width?: number;
  height?: number;
}

export function BlockchainPulse({
  className = "",
  width = 200,
  height = 120,
}: BlockchainPulseProps) {
  return (
    <svg
      viewBox="0 0 200 120"
      width={width}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Edges — thin connecting lines */}
      {EDGES.map(({ from, to }) => {
        const a = NODES[from];
        const b = NODES[to];
        // Find which pulse index should brighten this edge
        const pulseIndex = from;
        const delay = pulseIndex * PULSE_STAGGER;

        return (
          <motion.line
            key={`e-${from}-${to}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="white"
            strokeWidth="1"
            initial={{ opacity: 0.08 }}
            animate={{
              opacity: [0.08, 0.25, 0.08],
            }}
            transition={{
              duration: 1,
              delay,
              repeat: Infinity,
              repeatDelay: LOOP_DURATION - 1,
              ease: "easeInOut",
            }}
          />
        );
      })}

      {/* Nodes — small pulsing dots */}
      {NODES.map((node) => {
        const delay = node.id * PULSE_STAGGER;
        return (
          <motion.circle
            key={`n-${node.id}`}
            cx={node.x}
            cy={node.y}
            r="2"
            fill="white"
            initial={{ opacity: 0.25, scale: 1 }}
            animate={{
              opacity: [0.25, 0.6, 0.25],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 1,
              delay,
              repeat: Infinity,
              repeatDelay: LOOP_DURATION - 1,
              ease: "easeInOut",
            }}
            style={{ transformOrigin: `${node.x}px ${node.y}px` }}
          />
        );
      })}
    </svg>
  );
}
