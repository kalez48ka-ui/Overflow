"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/* DotWave — 3D animated dot-wave canvas (converted from Framer)      */
/* ------------------------------------------------------------------ */

interface DotWaveProps {
  className?: string;
}

/* ---- Hardcoded config tuned for Overflow hero background ---- */

const DOT_SPACING_X = 40;
const DOT_SPACING_Y = 40;
const DOT_SIZE_X = 3.5;
const DOT_SIZE_Y = 3.5;

const WAVE_SPEED = 1.5;
const WAVE_AMPLITUDE = 30;
const WAVE_FREQUENCY = 0.12;
const WAVE_COMPLEXITY = 6;
const WAVE_CHOPPINESS = 1.5;

const CAMERA_PITCH = 50;
const CAMERA_YAW = 5;
const CAMERA_X = -40;
const CAMERA_Y = -300; // computed from display 170
const CAMERA_Z = -500;
const BASE_FOV = 800; // computed from display 85

const DOT_COLOR = "#FF1744";
const DOT_COLOR_2 = "#3A1520";

const MOUSE_LINE_COLOR = "#2D8B3E";
const MOUSE_LINE_COLOR_2 = "#B8304A";
const MOUSE_LINE_DISTANCE = 220;
const MOUSE_LINE_OPACITY = 1.0;
const MOUSE_LINE_COUNT = 8;

const MOUSE_REPEL_STRENGTH = 35;
const MOUSE_REPEL_RADIUS = 200;

const GLOW_INTENSITY = 2.0;
const FADE_START_DISTANCE = 200;
const FADE_END_DISTANCE = 800;

/* ---- Utility: parse hex to {r,g,b} ---- */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/* ---- Utility: lerp between two {r,g,b} ---- */
function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number,
) {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

/* ---- Ocean-wave height function (identical to Framer original) ---- */
function calculateOceanWave(
  x: number,
  z: number,
  time: number,
  amplitude: number,
  frequency: number,
  complexity: number,
  choppiness: number,
): number {
  let height = 0;
  let amp = amplitude;
  let freq = frequency;

  for (let i = 0; i < complexity; i++) {
    const angle = Math.cos(i * 1.3) * 0.5;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const rx = x * cosA - z * sinA;
    const rz = x * sinA + z * cosA;

    const wave = Math.sin(rx * freq + time * WAVE_SPEED * (1 + i * 0.1));
    const choppy = Math.pow(Math.abs(wave), choppiness) * Math.sign(wave);
    height += choppy * amp;

    const detail = Math.sin(rz * freq * 1.5 + time * WAVE_SPEED * 0.8);
    height += detail * amp * 0.3;

    amp *= 0.5;
    freq *= 1.8;
  }

  return height;
}

/* ---- 3D projection (identical to Framer original) ---- */
function project3D(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  cz: number,
  pitch: number,
  yaw: number,
  fov: number,
  halfW: number,
  halfH: number,
): { screenX: number; screenY: number; depth: number } | null {
  let dx = x - cx;
  let dy = y - cy;
  let dz = z - cz;

  // Yaw rotation
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const x1 = dx * cosYaw - dz * sinYaw;
  const z1 = dx * sinYaw + dz * cosYaw;
  dx = x1;
  dz = z1;

  // Pitch rotation
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const y1 = dy * cosPitch - dz * sinPitch;
  const z2 = dy * sinPitch + dz * cosPitch;
  dy = y1;
  dz = z2;

  if (dz <= 0) return null;

  const scale = fov / dz;
  return {
    screenX: halfW + dx * scale,
    screenY: halfH + dy * scale,
    depth: dz,
  };
}

/* ================================================================== */
/*  Component                                                         */
/* ================================================================== */

export function DotWave({ className }: DotWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const isVisibleRef = useRef(true);
  const prefersReducedRef = useRef(false);

  // Mouse state stored in refs — tracked via document-level events so canvas stays pointer-events:none
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    /* --- Check reduced motion --- */
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedRef.current = motionQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedRef.current = e.matches;
    };
    motionQuery.addEventListener("change", onMotionChange);

    /* --- IntersectionObserver to pause when off-screen --- */
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    observer.observe(container);

    /* --- Pre-parse colours --- */
    const dotRgb1 = hexToRgb(DOT_COLOR);
    const dotRgb2 = hexToRgb(DOT_COLOR_2);
    const lineRgb1 = hexToRgb(MOUSE_LINE_COLOR);
    const lineRgb2 = hexToRgb(MOUSE_LINE_COLOR_2);

    /* --- Main render loop --- */
    const pitchRad = (CAMERA_PITCH * Math.PI) / 180;
    const yawRad = (CAMERA_YAW * Math.PI) / 180;

    let lastTs = 0;

    function render(ts: number) {
      animFrameRef.current = requestAnimationFrame(render);

      if (!isVisibleRef.current) return;

      const dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
      lastTs = ts;

      // If reduced motion, render one static frame then stop requesting
      if (prefersReducedRef.current && timeRef.current > 0.05) return;
      timeRef.current += dt;

      const w = container!.clientWidth;
      const h = container!.clientHeight;
      if (w === 0 || h === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = w * dpr;
      const ch = h * dpr;

      if (canvas!.width !== cw || canvas!.height !== ch) {
        canvas!.width = cw;
        canvas!.height = ch;
        canvas!.style.width = `${w}px`;
        canvas!.style.height = `${h}px`;
      }

      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const halfW = w / 2;
      const halfH = h / 2;

      const cam = { x: CAMERA_X, y: CAMERA_Y, z: CAMERA_Z };
      const time = timeRef.current;

      // Grid range
      const gridRangeX = Math.ceil((w * 1.5) / DOT_SPACING_X);
      const gridRangeZ = Math.ceil((h * 2) / DOT_SPACING_Y);

      // Collect projected dots
      type Dot = {
        sx: number;
        sy: number;
        depth: number;
        waveH: number;
        worldX: number;
        worldZ: number;
      };
      const dots: Dot[] = [];

      for (let ix = -gridRangeX; ix <= gridRangeX; ix++) {
        for (let iz = -gridRangeZ; iz <= gridRangeZ; iz++) {
          const wx = ix * DOT_SPACING_X;
          const wz = iz * DOT_SPACING_Y;

          let waveH = calculateOceanWave(
            wx,
            wz,
            time,
            WAVE_AMPLITUDE,
            WAVE_FREQUENCY,
            WAVE_COMPLEXITY,
            WAVE_CHOPPINESS,
          );

          // Mouse repel
          const mx = mouseRef.current.x;
          const my = mouseRef.current.y;
          if (mx > -9000) {
            // project to get approximate screen dist later — for repel we work in world space approx
            const p = project3D(
              wx,
              waveH,
              wz,
              cam.x,
              cam.y,
              cam.z,
              pitchRad,
              yawRad,
              BASE_FOV,
              halfW,
              halfH,
            );
            if (p) {
              const sdx = p.screenX - mx;
              const sdy = p.screenY - my;
              const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
              if (sDist < MOUSE_REPEL_RADIUS && sDist > 0) {
                const force =
                  (1 - sDist / MOUSE_REPEL_RADIUS) * MOUSE_REPEL_STRENGTH;
                waveH -= force;
              }
            }
          }

          const proj = project3D(
            wx,
            waveH,
            wz,
            cam.x,
            cam.y,
            cam.z,
            pitchRad,
            yawRad,
            BASE_FOV,
            halfW,
            halfH,
          );
          if (!proj) continue;

          // Frustum cull with margin
          const margin = 60;
          if (
            proj.screenX < -margin ||
            proj.screenX > w + margin ||
            proj.screenY < -margin ||
            proj.screenY > h + margin
          )
            continue;

          dots.push({
            sx: proj.screenX,
            sy: proj.screenY,
            depth: proj.depth,
            waveH,
            worldX: wx,
            worldZ: wz,
          });
        }
      }

      // Sort back-to-front
      dots.sort((a, b) => b.depth - a.depth);

      // Draw dots
      for (const dot of dots) {
        // Distance fade
        const fadeFactor =
          dot.depth < FADE_START_DISTANCE
            ? 1
            : dot.depth > FADE_END_DISTANCE
              ? 0
              : 1 -
                (dot.depth - FADE_START_DISTANCE) /
                  (FADE_END_DISTANCE - FADE_START_DISTANCE);

        if (fadeFactor <= 0) continue;

        // Wave-height–based color interpolation
        const normalizedH =
          Math.min(
            1,
            Math.max(0, (dot.waveH + WAVE_AMPLITUDE) / (WAVE_AMPLITUDE * 2)),
          );
        const dotClr = lerpColor(dotRgb2, dotRgb1, normalizedH);

        // Size based on depth
        const depthScale = BASE_FOV / dot.depth;
        const sx = DOT_SIZE_X * depthScale;
        const sy = DOT_SIZE_Y * depthScale;

        // Glow
        const glowAlpha = fadeFactor * normalizedH * GLOW_INTENSITY * 0.3;
        if (glowAlpha > 0.02) {
          ctx!.beginPath();
          ctx!.ellipse(dot.sx, dot.sy, sx * 3, sy * 3, 0, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${dotClr.r},${dotClr.g},${dotClr.b},${glowAlpha.toFixed(3)})`;
          ctx!.fill();
        }

        // Core dot
        const alpha = fadeFactor * 0.9;
        ctx!.beginPath();
        ctx!.ellipse(dot.sx, dot.sy, sx, sy, 0, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${dotClr.r},${dotClr.g},${dotClr.b},${alpha.toFixed(3)})`;
        ctx!.fill();
      }

      // Mouse proximity lines
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      if (mx > -9000) {
        // Find nearest dots
        const withDist = dots.map((d) => {
          const dx = d.sx - mx;
          const dy = d.sy - my;
          return { ...d, mouseDist: Math.sqrt(dx * dx + dy * dy) };
        });
        withDist.sort((a, b) => a.mouseDist - b.mouseDist);

        const nearby = withDist
          .filter((d) => d.mouseDist < MOUSE_LINE_DISTANCE)
          .slice(0, MOUSE_LINE_COUNT);

        for (const nd of nearby) {
          const t = 1 - nd.mouseDist / MOUSE_LINE_DISTANCE;
          const lineClr = lerpColor(lineRgb1, lineRgb2, t);
          const lineAlpha = t * MOUSE_LINE_OPACITY;

          // Line glow (wider, softer)
          ctx!.beginPath();
          ctx!.moveTo(mx, my);
          ctx!.lineTo(nd.sx, nd.sy);
          ctx!.strokeStyle = `rgba(${lineClr.r},${lineClr.g},${lineClr.b},${(lineAlpha * 0.3).toFixed(3)})`;
          ctx!.lineWidth = t * 4;
          ctx!.stroke();

          // Core line
          ctx!.beginPath();
          ctx!.moveTo(mx, my);
          ctx!.lineTo(nd.sx, nd.sy);
          ctx!.strokeStyle = `rgba(${lineClr.r},${lineClr.g},${lineClr.b},${lineAlpha.toFixed(3)})`;
          ctx!.lineWidth = t * 1.5;
          ctx!.stroke();

          // Dot glow at connection point
          const glowR = 6 * t;
          ctx!.beginPath();
          ctx!.arc(nd.sx, nd.sy, glowR, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${lineClr.r},${lineClr.g},${lineClr.b},${(t * 0.5).toFixed(3)})`;
          ctx!.fill();
        }
      }
    }

    /* --- Start --- */
    animFrameRef.current = requestAnimationFrame(render);

    /* --- Document-level mouse tracking (canvas has pointer-events:none) --- */
    const onDocMouseMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Only track if mouse is within the canvas bounds
      if (mx >= 0 && mx <= rect.width && my >= 0 && my <= rect.height) {
        mouseRef.current = { x: mx, y: my };
      } else {
        mouseRef.current = { x: -9999, y: -9999 };
      }
    };
    document.addEventListener("mousemove", onDocMouseMove, { passive: true });

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("mousemove", onDocMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          willChange: "transform",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
