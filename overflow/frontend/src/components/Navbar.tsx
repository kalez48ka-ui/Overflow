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

/* ── Logo SVG ────────────────────────────────────────────────── */
function OverflowLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer ring */}
      <circle cx="18" cy="18" r="17" stroke="#E4002B" strokeWidth="2" />
      {/* Inner wave — represents "overflow" */}
      <path
        d="M8 20c2-4 4-8 6-8s4 8 6 8 4-8 6-8"
        stroke="url(#logo-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Upward arrow — represents growth */}
      <path
        d="M18 8l4 5h-3v4h-2v-4h-3l4-5z"
        fill="#E4002B"
      />
      <defs>
        <linearGradient id="logo-grad" x1="8" y1="20" x2="26" y2="20">
          <stop stopColor="#E4002B" />
          <stop offset="0.5" stopColor="#FDB913" />
          <stop offset="1" stopColor="#00A651" />
        </linearGradient>
      </defs>
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
