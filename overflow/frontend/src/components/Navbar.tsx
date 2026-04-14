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
  Target,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useRef, useEffect, useCallback } from "react";

/* ── Logo SVG — Diamond shield with rising candlestick ─────── */
const OverflowLogo = React.memo(function OverflowLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="ball-grad" x1="10" y1="6" x2="30" y2="34">
          <stop stopColor="#E4002B" />
          <stop offset="1" stopColor="#A00020" />
        </linearGradient>
        <linearGradient id="chart-grad" x1="8" y1="28" x2="32" y2="12">
          <stop stopColor="#3FB950" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
        <filter id="logo-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Cricket ball circle */}
      <circle cx="20" cy="20" r="17" fill="url(#ball-grad)" opacity="0.15" />
      <circle cx="20" cy="20" r="17" fill="none" stroke="url(#ball-grad)" strokeWidth="2"
      />
      {/* Cricket ball seam — curved line across */}
      <path
        d="M8 14 Q14 20 8 26"
        fill="none"
        stroke="#E4002B"
        strokeWidth="1.2"
        opacity="0.5"
        strokeLinecap="round"
      />
      <path
        d="M32 14 Q26 20 32 26"
        fill="none"
        stroke="#E4002B"
        strokeWidth="1.2"
        opacity="0.5"
        strokeLinecap="round"
      />
      {/* Upward chart line — the "overflow" */}
      <path
        d="M10 28 L16 24 L20 26 L26 16 L32 10"
        fill="none"
        stroke="url(#chart-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#logo-glow)"
      />
      {/* Chart dot at peak */}
      <circle cx="32" cy="10" r="2.5" fill="#3FB950" />
      {/* Small arrow tip at the end */}
      <path
        d="M29 12 L32 10 L30 7"
        fill="none"
        stroke="#3FB950"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/* ── Navigation config ───────────────────────────────────────── */
const primaryLinks = [
  { href: "/", label: "Markets", icon: BarChart2 },
  { href: "/match", label: "Live", icon: Activity, live: true },
  { href: "/standings", label: "Standings", icon: Trophy },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/vault", label: "Vault", icon: Shield },
  { href: "/fan-wars", label: "Fan Wars", icon: Flame },
  { href: "/predictions", label: "Predict", icon: Target },
];

const moreLinks = [
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/match/history", label: "Match History", icon: Clock },
  { href: "/how-it-works", label: "How It Works", icon: BookOpen },
];

const allLinks = [...primaryLinks, ...moreLinks];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  // Keyboard navigation for the "More" dropdown menu
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!moreOpen) return;

      const items = menuItemsRef.current.filter(Boolean) as HTMLAnchorElement[];
      const currentIndex = items.findIndex((el) => el === document.activeElement);

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[next]?.focus();
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          items[prev]?.focus();
          break;
        }
        case "Home": {
          e.preventDefault();
          items[0]?.focus();
          break;
        }
        case "End": {
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
        }
        case "Escape": {
          e.preventDefault();
          setMoreOpen(false);
          moreButtonRef.current?.focus();
          break;
        }
      }
    },
    [moreOpen],
  );

  // Close "More" dropdown on outside click — only listen when open
  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  // Focus first menu item when "More" dropdown opens
  useEffect(() => {
    if (moreOpen) {
      const firstItem = menuItemsRef.current.find(Boolean);
      firstItem?.focus();
    }
  }, [moreOpen]);

  // Close menus on Escape key and return focus
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobileOpen) {
          setMobileOpen(false);
          hamburgerRef.current?.focus();
        }
        if (moreOpen) {
          setMoreOpen(false);
          moreButtonRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [mobileOpen, moreOpen]);

  // Mobile menu focus trap
  useEffect(() => {
    if (!mobileOpen || !mobileMenuRef.current) return;

    const menu = mobileMenuRef.current;
    const focusableSelector = 'a[href], button, [tabindex]:not([tabindex="-1"])';

    function handleTrapKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = Array.from(menu.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    // Focus first item when menu opens
    const firstFocusable = menu.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    document.addEventListener("keydown", handleTrapKeyDown);
    return () => document.removeEventListener("keydown", handleTrapKeyDown);
  }, [mobileOpen]);

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
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <OverflowLogo className="h-11 w-11 drop-shadow-[0_0_8px_rgba(228,0,43,0.3)]" />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-black tracking-tight text-[#E6EDF3]">
                OVER<span className="text-[#E4002B]">FLOW</span>
              </span>
              <span className="text-[8px] font-medium tracking-[0.2em] text-[#8B949E] uppercase">
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
                      : "text-[#9CA3AF] hover:text-[#C9D1D9]"
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
                ref={moreButtonRef}
                onClick={() => setMoreOpen(!moreOpen)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                className={cn(
                  "relative flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200",
                  moreOpen || isMoreActive
                    ? "text-[#E6EDF3]"
                    : "text-[#9CA3AF] hover:text-[#C9D1D9]"
                )}
              >
                {(moreOpen || isMoreActive) && (
                  <motion.div
                    layoutId="nav-more-active"
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
                    role="menu"
                    aria-label="More navigation"
                    onKeyDown={handleMenuKeyDown}
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/[0.08] bg-[#161B22]/95 backdrop-blur-xl p-1 shadow-2xl shadow-black/60"
                  >
                    {moreLinks.map(({ href, label, icon: Icon }, idx) => {
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={href}
                          ref={(el) => { menuItemsRef.current[idx] = el; }}
                          href={href}
                          role="menuitem"
                          tabIndex={-1}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                            isActive
                              ? "bg-white/[0.06] text-[#E6EDF3]"
                              : "text-[#9CA3AF] hover:bg-white/[0.04] hover:text-[#E6EDF3]"
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
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium tracking-wide text-[#9CA3AF]/80">
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
              ref={hamburgerRef}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#9CA3AF] hover:text-[#E6EDF3] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58A6FF]/50 rounded-lg"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
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
            <div ref={mobileMenuRef} className="flex flex-col gap-0.5 p-3">
              {allLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-3 min-h-[44px] text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#161B22] text-[#E6EDF3]"
                        : "text-[#9CA3AF] hover:bg-[#161B22] hover:text-[#E6EDF3]"
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
