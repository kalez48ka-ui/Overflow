"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SafeConnectButton } from "@/components/WalletProvider";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart2,
  BookOpen,
  Briefcase,
  ChevronDown,
  Clock,
  Flame,
  Shield,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

/* ── Logo SVG — Diamond shield with rising candlestick ─────── */
function OverflowLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="shield-fill" x1="20" y1="2" x2="20" y2="38">
          <stop stopColor="#1A1F2E" />
          <stop offset="1" stopColor="#0D1117" />
        </linearGradient>
        <linearGradient id="shield-stroke" x1="4" y1="8" x2="36" y2="32">
          <stop stopColor="#E4002B" />
          <stop offset="0.5" stopColor="#FF4D6A" />
          <stop offset="1" stopColor="#E4002B" />
        </linearGradient>
        <linearGradient id="candle-green" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#4ADE80" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id="candle-red" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#F87171" />
          <stop offset="1" stopColor="#EF4444" />
        </linearGradient>
        <filter id="glow-red">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Shield shape */}
      <path
        d="M20 3 L35 10 L35 25 Q35 33 20 38 Q5 33 5 25 L5 10 Z"
        fill="url(#shield-fill)"
        stroke="url(#shield-stroke)"
        strokeWidth="1.8"
      />
      {/* Inner shield highlight */}
      <path
        d="M20 7 L31 12.5 L31 24.5 Q31 30.5 20 34.5 Q9 30.5 9 24.5 L9 12.5 Z"
        fill="none"
        stroke="#E4002B"
        strokeWidth="0.3"
        opacity="0.25"
      />
      {/* Candlestick 1 — red (left) */}
      <rect x="12" y="17" width="3.5" height="8" rx="0.8" fill="url(#candle-red)" />
      <line x1="13.75" y1="14" x2="13.75" y2="17" stroke="#F87171" strokeWidth="1" strokeLinecap="round" />
      <line x1="13.75" y1="25" x2="13.75" y2="28" stroke="#F87171" strokeWidth="1" strokeLinecap="round" />
      {/* Candlestick 2 — green (center, taller = dominant) */}
      <rect x="18.25" y="11" width="3.5" height="12" rx="0.8" fill="url(#candle-green)" />
      <line x1="20" y1="8" x2="20" y2="11" stroke="#4ADE80" strokeWidth="1" strokeLinecap="round" />
      <line x1="20" y1="23" x2="20" y2="26" stroke="#4ADE80" strokeWidth="1" strokeLinecap="round" />
      {/* Candlestick 3 — green (right, medium) */}
      <rect x="24.5" y="13" width="3.5" height="9" rx="0.8" fill="url(#candle-green)" />
      <line x1="26.25" y1="10" x2="26.25" y2="13" stroke="#4ADE80" strokeWidth="1" strokeLinecap="round" />
      <line x1="26.25" y1="22" x2="26.25" y2="25" stroke="#4ADE80" strokeWidth="1" strokeLinecap="round" />
      {/* Upward arrow above center candle */}
      <path
        d="M17.5 8.5 L20 5 L22.5 8.5"
        stroke="#FDB913"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter="url(#glow-red)"
      />
    </svg>
  );
}

/* ── Navigation config ───────────────────────────────────────── */
const primaryLinks = [
  { href: "/", label: "Markets", icon: BarChart2 },
  { href: "/match", label: "Live", icon: Activity, live: true },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/vault", label: "Vault", icon: Shield },
  { href: "/fan-wars", label: "Fan Wars", icon: Flame },
];

const moreLinks = [
  { href: "/match/history", label: "Match History", icon: Clock },
  { href: "/how-it-works", label: "How It Works", icon: BookOpen },
];

const allLinks = [...primaryLinks, ...moreLinks];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isMoreActive = moreLinks.some((l) => pathname === l.href);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0D1117]/80 backdrop-blur-2xl backdrop-saturate-150">
      {/* Subtle gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#E4002B]/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-6">
          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <motion.div
              whileHover={{ rotate: [0, -5, 5, 0], scale: 1.08 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <OverflowLogo className="h-9 w-9 drop-shadow-[0_0_8px_rgba(228,0,43,0.3)]" />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-black tracking-tight text-[#E6EDF3]">
                OVER<span className="text-[#E4002B]">FLOW</span>
              </span>
              <span className="text-[8px] font-medium tracking-[0.2em] text-[#8B949E]/60 uppercase">
                PSL Trading
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] px-1 py-1">
            {primaryLinks.map(({ href, label, icon: Icon, live }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
                    isActive
                      ? "text-[#E6EDF3]"
                      : "text-[#8B949E] hover:text-[#C9D1D9]"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.08]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {live && (
                      <span className="relative ml-0.5 flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3FB950] opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3FB950]" />
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}

            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={cn(
                  "relative flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200",
                  moreOpen || isMoreActive
                    ? "text-[#E6EDF3]"
                    : "text-[#8B949E] hover:text-[#C9D1D9]"
                )}
              >
                {(moreOpen || isMoreActive) && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full bg-white/[0.08] border border-white/[0.08]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  More
                  <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", moreOpen && "rotate-180")} />
                </span>
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/[0.08] bg-[#161B22]/95 backdrop-blur-xl p-1 shadow-2xl shadow-black/60"
                  >
                    {moreLinks.map(({ href, label, icon: Icon }) => {
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                            isActive
                              ? "bg-white/[0.06] text-[#E6EDF3]"
                              : "text-[#8B949E] hover:bg-white/[0.04] hover:text-[#E6EDF3]"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Right side ── */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium tracking-wide text-[#8B949E]/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3FB950] shadow-[0_0_4px_rgba(63,185,80,0.5)]" />
              WireFluid
            </div>

            <SafeConnectButton
              showBalance={false}
              chainStatus="none"
              accountStatus="avatar"
            />

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8B949E] hover:text-[#E6EDF3] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58A6FF]/50 rounded-lg"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <div className="flex flex-col gap-1">
                <span className={cn("block h-0.5 w-5 bg-current transition-transform", mobileOpen && "translate-y-1.5 rotate-45")} />
                <span className={cn("block h-0.5 w-5 bg-current transition-opacity", mobileOpen && "opacity-0")} />
                <span className={cn("block h-0.5 w-5 bg-current transition-transform", mobileOpen && "-translate-y-1.5 -rotate-45")} />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[#21262D] bg-[#0D1117] md:hidden overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 p-3">
              {allLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#161B22] text-[#E6EDF3]"
                        : "text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
