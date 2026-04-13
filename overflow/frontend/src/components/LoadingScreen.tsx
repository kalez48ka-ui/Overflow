"use client";

import { motion } from "framer-motion";
import { CricketBallLoader } from "@/components/effects/CricketBallLoader";
import { BlockchainPulse } from "@/components/effects/BlockchainPulse";

const DURATION_MS = 2500;

interface LoadingScreenProps {
  onComplete: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
      onAnimationComplete={(definition) => {
        // Only fire when the exit animation finishes
        if (
          typeof definition === "object" &&
          definition !== null &&
          "opacity" in definition &&
          (definition as { opacity: number }).opacity === 0
        ) {
          onComplete();
        }
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0D1117]"
    >
      {/* Main content — centered */}
      <div className="relative flex flex-col items-center">
        {/* Cricket ball animation */}
        <CricketBallLoader showText={true} size={72} />

        {/* Blockchain network — subtle, below the text */}
        <div className="mt-8 opacity-40">
          <BlockchainPulse width={240} height={80} />
        </div>
      </div>

      {/* Progress bar — pinned to bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#21262D]">
        <motion.div
          className="h-full bg-[#E4002B]"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{
            duration: DURATION_MS / 1000,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      </div>
    </motion.div>
  );
}
