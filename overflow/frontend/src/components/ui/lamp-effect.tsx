"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LampContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[180px] sm:min-h-[280px] flex-col items-center justify-center overflow-hidden w-full z-0",
        className,
      )}
    >
      {/* Lamp glow effects */}
      <div className="relative flex w-full flex-1 items-center justify-center isolate z-0">
        {/* Left conic gradient */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage:
              "conic-gradient(var(--conic-position), var(--tw-gradient-stops))",
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] max-w-[50vw] bg-gradient-conic from-[#E4002B]/20 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
        >
          <div className="absolute w-[100%] left-0 bg-[#0D1117] h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-[#0D1117] bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>

        {/* Right conic gradient */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          style={{
            backgroundImage:
              "conic-gradient(var(--conic-position), var(--tw-gradient-stops))",
          }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] max-w-[50vw] bg-gradient-conic from-transparent via-transparent to-[#E4002B]/20 text-white [--conic-position:from_290deg_at_center_top]"
        >
          <div className="absolute w-40 h-[100%] right-0 bg-[#0D1117] bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-[#0D1117] h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>

        {/* Top blur overlay */}
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-[#0D1117] blur-2xl" />
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md" />

        {/* Glowing line */}
        <div className="absolute inset-auto z-50 h-36 w-[28rem] max-w-[90vw] -translate-y-1/2 rounded-full bg-[#E4002B]/8 opacity-50 blur-3xl" />

        {/* Narrow bright line */}
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "16rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-[#E4002B]/15 blur-2xl"
        />

        {/* Top thin line */}
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "30rem" }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] max-w-[90vw] -translate-y-[7rem] bg-[#E4002B]/30"
        />

        {/* BG overlay */}
        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-[#0D1117]" />
      </div>

      {/* Content */}
      <div className="relative z-50 flex -translate-y-20 sm:-translate-y-36 flex-col items-center px-5">
        {children}
      </div>
    </div>
  );
}
