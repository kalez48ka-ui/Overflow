"use client";

import dynamic from "next/dynamic";

const LiquidBlobs = dynamic(
  () => import("@/components/effects/LiquidBlobs").then((m) => ({ default: m.LiquidBlobs })),
  { ssr: false },
);

/**
 * Wraps the app content with background effects.
 * Splash screen removed — the app loads fast enough without it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LiquidBlobs />
      {children}
    </>
  );
}
