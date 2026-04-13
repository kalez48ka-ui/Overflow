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
  Shield,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

/* ── Logo SVG — Hexagonal crypto mark with rising wave ─────── */
function OverflowLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="hex-fill" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#E4002B" />
          <stop offset="1" stopColor="#8B0019" />
        </linearGradient>
        <linearGradient id="wave-grad" x1="10" y1="20" x2="30" y2="20">
          <stop stopColor="#FDB913" />
          <stop offset="1" stopColor="#00A651" />
        </linearGradient>
        <filter id="logo-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Hexagon body */}
      <path
        d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z"
        fill="url(#hex-fill)"
        stroke="#FF1A3D"
        strokeWidth="0.5"
        opacity="0.95"
      />
      {/* Inner hexagon outline */}
      <path
        d="M20 6 L32.5 13 L32.5 27 L20 34 L7.5 27 L7.5 13 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="0.4"
        opacity="0.15"
      />
      {/* Rising overflow wave — the signature mark */}
      <path
        d="M10 24 Q14 16, 17 20 T24 16 T30 13"
        stroke="url(#wave-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#logo-glow)"
      />
      {/* Small upward arrow tip */}
      <path
        d="M28 15 L30 11 L32 15"
        stroke="#FDB913"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Dot accent */}
      <circle cx="10" cy="24" r="1.5" fill="#00A651" opacity="0.9" />
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
    <nav className="sticky top-0 z-50 border-b border-[#30363D] bg-[#0D1117]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-6">
          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <OverflowLogo className="h-8 w-8 transition-transform group-hover:scale-105" />
            <span className="text-[17px] font-black tracking-tight text-[#E6EDF3]">
              OVER<span className="text-[#E4002B]">FLOW</span>
            </span>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-0.5">
            {primaryLinks.map(({ href, label, icon: Icon, live }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all",
                    isActive
                      ? "bg-[#161B22] text-[#E6EDF3] shadow-sm shadow-black/20"
                      : "text-[#8B949E] hover:bg-[#161B22]/60 hover:text-[#C9D1D9]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {live && (
                    <span className="relative ml-0.5 flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3FB950] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3FB950]" />
                    </span>
                  )}
                </Link>
              );
            })}

            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all",
                  moreOpen || isMoreActive
                    ? "bg-[#161B22] text-[#E6EDF3]"
                    : "text-[#8B949E] hover:bg-[#161B22]/60 hover:text-[#C9D1D9]"
                )}
              >
                More
                <ChevronDown className={cn("h-3 w-3 transition-transform", moreOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-[#30363D] bg-[#161B22] p-1.5 shadow-xl shadow-black/40"
                  >
                    {moreLinks.map(({ href, label, icon: Icon }) => {
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                            isActive
                              ? "bg-[#0D1117] text-[#E6EDF3]"
                              : "text-[#8B949E] hover:bg-[#0D1117]/60 hover:text-[#E6EDF3]"
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
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#30363D] px-2.5 py-1 text-[11px] text-[#8B949E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3FB950]" />
              WireFluid
            </div>

            <SafeConnectButton
              showBalance={false}
              chainStatus="none"
              accountStatus="avatar"
            />

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-[#8B949E] hover:text-[#E6EDF3]"
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
            className="border-t border-[#30363D] bg-[#0D1117] md:hidden overflow-hidden"
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
