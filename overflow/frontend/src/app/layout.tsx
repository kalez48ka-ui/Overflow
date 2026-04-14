import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ToastProvider";
import { AppShell } from "@/components/AppShell";


const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Overflow — PSL Token Trading",
    template: "%s | Overflow",
  },
  description:
    "Trade PSL cricket team tokens on WireFluid blockchain. Backed by real-time match performance, AI-powered upset detection, and DeFi mechanics. Shariah-compliant cricket prediction market.",
  keywords: [
    "PSL",
    "cricket",
    "trading",
    "blockchain",
    "DeFi",
    "tokens",
    "WireFluid",
    "Pakistan Super League",
    "crypto",
    "shariah-compliant",
  ],
  authors: [{ name: "Overflow Team" }],
  creator: "Overflow",
  openGraph: {
    title: "Overflow — Where Cricket Knowledge Becomes Financial Power",
    description:
      "Trade tokenized PSL team stocks. Prices move with match performance. Earn from upsets.",
    type: "website",
    locale: "en_PK",
  },
  twitter: {
    card: "summary_large_image",
    title: "Overflow — PSL Token Trading",
    description: "Trade PSL cricket team tokens on WireFluid blockchain.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0D1117",
  width: "device-width",
  initialScale: 1,
};

function Footer() {
  return (
    <footer className="py-6" aria-label="Site footer">
      <div className="footer-border-glow" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className="h-6 w-6">
              <circle cx="20" cy="20" r="17" fill="#E4002B" opacity="0.15" />
              <circle cx="20" cy="20" r="17" fill="none" stroke="#E4002B" strokeWidth="2" />
              <path d="M10 28 L16 24 L20 26 L26 16 L32 10" fill="none" stroke="#3FB950" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="32" cy="10" r="2.5" fill="#3FB950" />
            </svg>
            <span className="font-black text-[#E6EDF3] text-sm tracking-tight">
              OVER<span className="text-[#E4002B]">FLOW</span>
            </span>
          </div>

          {/* Center tagline */}
          <p className="flex items-center gap-1 text-xs text-[#9CA3AF]">
            Built with{" "}
            <span className="text-[#E4002B]">&#10084;</span>
            {" "}from{" "}
            <span className="text-[#3FB950] font-medium">Pakistan</span>
            {" "}·{" "}
            Built on{" "}
            <span className="text-[#58A6FF] font-medium">WireFluid</span>
          </p>

          {/* Right — GitHub */}
          <a
            href="https://github.com/kalez48ka-ui/Overflow"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Overflow GitHub repository (opens in new tab)"
            className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#E6EDF3] transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen bg-[#0D1117] text-[#E6EDF3] antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[10000] focus:top-2 focus:left-2 focus:rounded-md focus:bg-[#161B22] focus:px-4 focus:py-2 focus:text-sm focus:text-[#E6EDF3] focus:ring-2 focus:ring-[#58A6FF]"
        >
          Skip to content
        </a>
        <WalletProvider>
          <ToastProvider />
          <AppShell>
            <ErrorBoundary
              fallback={
                <header className="border-b border-[#21262D] bg-[#161B22] px-4 py-3">
                  <span className="font-black text-[#E6EDF3] text-sm tracking-tight">
                    OVER<span className="text-[#E4002B]">FLOW</span>
                  </span>
                </header>
              }
            >
              <Navbar />
            </ErrorBoundary>
            <main id="main-content">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <Footer />
          </AppShell>
        </WalletProvider>
      </body>
    </html>
  );
}
