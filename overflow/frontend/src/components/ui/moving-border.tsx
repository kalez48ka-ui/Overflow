"use client";
import React from "react";
import { cn } from "@/lib/utils";

export function MovingBorderButton({ children, borderRadius = "1.75rem", className, containerClassName, borderClassName, as: Component = "button", ...otherProps }: {
  children: React.ReactNode;
  duration?: number;
  borderRadius?: string;
  className?: string;
  containerClassName?: string;
  borderClassName?: string;
  as?: React.ElementType;
  [key: string]: unknown;
}) {
  return (
    <Component className={cn("relative h-auto w-auto overflow-hidden bg-transparent p-[1px] text-xl", containerClassName)} style={{ borderRadius }} {...otherProps}>
      <div className="absolute inset-0" style={{ borderRadius }}>
        <div className={cn("absolute inset-[-1000%] animate-[spin_3s_linear_infinite]", borderClassName || "bg-[conic-gradient(from_90deg_at_50%_50%,#30363D_0%,#8B949E_50%,#30363D_100%)]")} />
      </div>
      <div className={cn("relative flex h-full w-full items-center justify-center rounded-[calc(1.75rem-1px)] bg-[#0D1117] backdrop-blur-xl", className)} style={{ borderRadius: `calc(${borderRadius} - 1px)` }}>
        {children}
      </div>
    </Component>
  );
}
