"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const LoadingScreen = dynamic(
  () => import("@/components/LoadingScreen").then((m) => ({ default: m.LoadingScreen })),
  { ssr: false },
);

const LiquidBlobs = dynamic(
  () => import("@/components/effects/LiquidBlobs").then((m) => ({ default: m.LiquidBlobs })),
  { ssr: false },
);

const SPLASH_KEY = "overflow_splash_shown";
const SPLASH_DURATION_MS = 200;

/**
 * Wraps the app content with an initial loading screen.
 * Shows the splash animation only on the first visit per session (800ms),
 * and skips it entirely on subsequent navigations.
 *
 * Always initializes showLoading=true on server to avoid hydration mismatch,
 * then checks sessionStorage in useEffect on client.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [showLoading, setShowLoading] = useState(true);
  const [removed, setRemoved] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    // Check if splash was already shown this session
    const alreadyShown = sessionStorage.getItem(SPLASH_KEY) === "1";
    if (alreadyShown) {
      setShowLoading(false);
      setRemoved(true);
      return;
    }

    if (hasRun.current) return;
    hasRun.current = true;

    const timer = setTimeout(() => {
      setShowLoading(false);
      try {
        sessionStorage.setItem(SPLASH_KEY, "1");
      } catch {
        // sessionStorage unavailable (e.g. private browsing quota) — ignore
      }
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <LiquidBlobs />
      <AnimatePresence mode="wait">
        {showLoading && (
          <LoadingScreen
            key="splash"
            onComplete={() => setRemoved(true)}
          />
        )}
      </AnimatePresence>

      {/* App content — hidden during splash, revealed after */}
      <div
        style={{
          visibility: showLoading && !removed ? "hidden" : "visible",
          opacity: showLoading && !removed ? 0 : 1,
        }}
      >
        {children}
      </div>
    </>
  );
}
