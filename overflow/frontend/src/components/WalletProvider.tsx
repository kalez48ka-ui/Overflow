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
        className="inline-flex items-center justify-center rounded-xl bg-[#E4002B] px-4 py-2 text-sm font-semibold text-white opacity-60 cursor-not-allowed"
        disabled
      >
        {fallbackLabel}
      </button>
    );
  }

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted: btnMounted }) => {
        const connected = btnMounted && account && chain;

        return (
          <div
            {...(!btnMounted && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E4002B] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#C8002A] active:scale-[0.97]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                      <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                      <circle cx="18" cy="16" r="2" />
                    </svg>
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F85149]/20 px-3 py-2 text-xs font-semibold text-[#F85149] transition-all hover:bg-[#F85149]/30"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#21262D] bg-[#161B22] px-3 py-2 text-xs font-mono text-[#E6EDF3] transition-all hover:border-[#30363D] hover:bg-[#1C2129]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#3FB950] shadow-[0_0_4px_rgba(63,185,80,0.5)]" />
                  {account.displayName}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
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
