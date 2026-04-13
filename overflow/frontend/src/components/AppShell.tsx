"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Wraps the app content with an initial loading screen.
 * Shows the splash animation on first mount only, then fades out
 * after 2.5 seconds or when the page is fully hydrated (whichever is later).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [showLoading, setShowLoading] = useState(true);
  const [removed, setRemoved] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once on first mount
    if (hasRun.current) return;
    hasRun.current = true;

    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
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
