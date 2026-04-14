import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ToastProvider";
import { AppShell } from "@/components/AppShell";
import { CheckCircle2 } from "lucide-react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <footer className="border-t border-[#21262D] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-b from-[#1A1F2E] to-[#0D1117] border border-[#E4002B]/40">
              <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3">
                <rect x="1" y="5" width="2.5" height="5" rx="0.5" fill="#F87171" />
                <rect x="5.75" y="2" width="2.5" height="8" rx="0.5" fill="#4ADE80" />
                <rect x="10.5" y="3.5" width="2.5" height="6" rx="0.5" fill="#4ADE80" />
              </svg>
            </div>
            <span className="font-black text-[#E6EDF3] text-sm tracking-tight">
              OVER<span className="text-[#E4002B]">FLOW</span>
            </span>
          </div>

          {/* Center tagline */}
          <p className="flex items-center gap-1 text-xs text-[#8B949E]">
            Built on{" "}
            <span className="text-[#58A6FF] font-medium">WireFluid</span>
            {" "}·{" "}
            Powered by{" "}
            <span className="text-[#58A6FF] font-medium">AI</span>
            {" "}·{" "}
            <span className="inline-flex items-center gap-1 text-[#3FB950] font-medium">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Shariah Compliant
            </span>
          </p>

          {/* Right disclaimer */}
          <p className="text-xs text-[#484F58]">
            PSL 2026 · Hackathon Demo
          </p>
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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function isHydNoise(v){return typeof v==='string'&&(v.includes('hydrat')||v.includes('Hydrat')||v.includes('did not match'))};function isHydErr(e){return e&&typeof e==='object'&&typeof e.message==='string'&&isHydNoise(e.message)};var oe=console.error;console.error=function(){if(isHydNoise(arguments[0])||isHydErr(arguments[0]))return;oe.apply(console,arguments)};var ow=console.warn;console.warn=function(){if(isHydNoise(arguments[0]))return;ow.apply(console,arguments)};if(typeof reportError==='function'){var or=reportError;window.reportError=function(e){if(isHydErr(e))return;or.call(window,e)}};var oa=window.addEventListener;window.addEventListener=function(t,fn,o){if(t==='error'){var wfn=function(ev){if(isHydErr(ev.error)){ev.preventDefault();ev.stopImmediatePropagation();return}fn.call(this,ev)};return oa.call(window,t,wfn,o)}return oa.call(window,t,fn,o)}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-[#0D1117] text-[#E6EDF3] antialiased">
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
            <main>
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <Footer />
          </AppShell>
        </WalletProvider>
      </body>
    </html>
  );
}
