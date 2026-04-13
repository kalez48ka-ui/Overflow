import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Zap } from "lucide-react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CricTrade — PSL Token Trading",
    template: "%s | CricTrade",
  },
  description:
    "Trade PSL cricket team tokens on WireFluid blockchain. Backed by real-time match performance, AI-powered upset detection, and DeFi mechanics. The first Halal-compliant cricket prediction market.",
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
    "halal",
  ],
  authors: [{ name: "CricTrade Team" }],
  creator: "CricTrade",
  openGraph: {
    title: "CricTrade — Where Cricket Knowledge Becomes Financial Power",
    description:
      "Trade tokenized PSL team stocks. Prices move with match performance. Earn from upsets.",
    type: "website",
    locale: "en_PK",
  },
  twitter: {
    card: "summary_large_image",
    title: "CricTrade — PSL Token Trading",
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
    <footer className="border-t border-[#30363D] py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#E4002B]">
              <Zap className="h-3 w-3 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-[#E6EDF3]">
              Cric<span className="text-[#E4002B]">Trade</span>
            </span>
          </div>

          {/* Center tagline */}
          <p className="text-xs text-[#8B949E]">
            Built on{" "}
            <span className="text-[#58A6FF] font-medium">WireFluid</span>
            {" "}·{" "}
            Powered by{" "}
            <span className="text-[#58A6FF] font-medium">AI</span>
            {" "}·{" "}
            <span className="text-[#3FB950] font-medium">Halal Compliant</span>
          </p>

          {/* Right disclaimer */}
          <p className="text-xs text-[#30363D]">
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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#0D1117] text-[#E6EDF3] antialiased">
        <WalletProvider>
          <Navbar />
          <main>
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
