"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Meteors({ number = 20, className }: { number?: number; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const meteors = new Array(number).fill(true);
  return (
    <>
      {meteors.map((_, idx) => (
        <span key={idx} className={cn("animate-meteor-effect absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]",
          "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent", className)}
          style={{ top: 0, left: `${Math.floor(Math.random() * 400 - 200) + idx * 20}px`, animationDelay: `${Math.random() * 0.6 + 0.2}s`, animationDuration: `${Math.floor(Math.random() * 8 + 2)}s` }} />
      ))}
    </>
  );
}
