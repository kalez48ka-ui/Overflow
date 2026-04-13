"use client";

import {
  RainbowKitProvider,
  darkTheme,
  ConnectButton,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/config/wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import { useState, useEffect, createContext, useContext } from "react";

// ---------------------------------------------------------------------------
// Context to let child components know whether wallet providers initialized
// ---------------------------------------------------------------------------
const WalletReadyContext = createContext(false);

export function useWalletReady() {
  return useContext(WalletReadyContext);
}

// ---------------------------------------------------------------------------
// Safe ConnectButton — renders a fallback when wallet providers are absent
// or the component tree hasn't hydrated yet.
// ---------------------------------------------------------------------------
export function SafeConnectButton(
  props: Parameters<typeof ConnectButton>[0] & { fallbackLabel?: string },
) {
  const ready = useWalletReady();
  const { fallbackLabel = "Connect Wallet", ...rest } = props;

  if (!ready) {
    return (
      <button
        className="rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
        disabled
      >
        {fallbackLabel}
      </button>
    );
  }

  return <ConnectButton {...rest} />;
}

// ---------------------------------------------------------------------------
// WalletProvider — wraps the app with wagmi + RainbowKit.
// Defers rendering of providers until after hydration so the server
// HTML and initial client HTML always match (prevents mismatch errors).
// ---------------------------------------------------------------------------
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#E4002B",
            accentColorForeground: "white",
            borderRadius: "medium",
            fontStack: "system",
            overlayBlur: "small",
          })}
          modalSize="compact"
        >
          <WalletReadyContext.Provider value={mounted}>
            {children}
          </WalletReadyContext.Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
