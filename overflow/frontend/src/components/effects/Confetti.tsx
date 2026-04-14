"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Lightweight confetti burst using canvas.
 * No external deps — self-contained particle system.
 *
 * Usage:
 *   const { fire, ConfettiCanvas } = useConfetti();
 *   <ConfettiCanvas />
 *   <button onClick={fire}>Celebrate!</button>
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  opacity: number;
  decay: number;
}

const COLORS = ["#3FB950", "#FDB913", "#E4002B", "#58A6FF", "#E6EDF3", "#F85149"];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export function useConfetti(particleCount = 80) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const animFrameRef = useRef<number>(0);

  const fire = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || active) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setActive(true);

    // Size canvas to viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create particles from center-top
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.35;

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: cx + randomBetween(-20, 20),
      y: cy + randomBetween(-10, 10),
      vx: randomBetween(-12, 12),
      vy: randomBetween(-18, -6),
      w: randomBetween(4, 8),
      h: randomBetween(6, 12),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: randomBetween(0, 360),
      rotationSpeed: randomBetween(-10, 10),
      gravity: 0.4,
      opacity: 1,
      decay: randomBetween(0.008, 0.016),
    }));

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let aliveCount = 0;

      for (const p of particles) {
        if (p.opacity <= 0) continue;
        aliveCount++;

        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (aliveCount > 0) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setActive(false);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [active, particleCount]);

  function ConfettiCanvas() {
    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[9999]"
        aria-hidden="true"
      />
    );
  }

  return { fire, ConfettiCanvas, active };
}
