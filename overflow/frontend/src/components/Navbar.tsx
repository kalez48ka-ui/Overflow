"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SafeConnectButton } from "@/components/WalletProvider";
import { cn } from "@/lib/utils";
import { Activity, BarChart2, Briefcase, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "Markets", icon: BarChart2 },
  { href: "/match", label: "Live Match", icon: Activity },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/vault", label: "Upset Vault", icon: Shield },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#30363D] bg-[#0D1117]/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#E4002B] to-[#B8002A] shadow-lg shadow-[#E4002B]/20 transition-shadow group-hover:shadow-[#E4002B]/30">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-black text-[#E6EDF3] tracking-tight">
              Over<span className="text-[#E4002B]">flow</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#161B22] text-[#E6EDF3]"
                      : "text-[#8B949E] hover:bg-[#161B22] hover:text-[#E6EDF3]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {href === "/match" && (
                    <span className="relative ml-1 flex h-2 w-2 items-center justify-center">
                      <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-[#3FB950] opacity-50" />
                      <span className="absolute inline-flex h-4 w-4 rounded-full bg-[#3FB950]/10" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3FB950]" />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Network indicator */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#30363D] px-3 py-1.5 text-xs text-[#8B949E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3FB950]" />
              WireFluid
            </div>

            <SafeConnectButton
              showBalance={false}
              chainStatus="none"
              accountStatus="avatar"
            />

            {/* Mobile menu button */}
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

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="border-t border-[#30363D] bg-[#0D1117] md:hidden"
        >
          <div className="flex flex-col gap-1 p-4">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
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
    </nav>
  );
}
