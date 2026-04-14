"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function FlipWords({
  words,
  duration = 3000,
  className,
}: {
  words: string[];
  duration?: number;
  className?: string;
}) {
  const [currentWord, setCurrentWord] = useState(words[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const startAnimation = useCallback(() => {
    const idx = words.indexOf(currentWord);
    const next = words[(idx + 1) % words.length];
    setCurrentWord(next);
    setIsAnimating(true);
  }, [currentWord, words]);

  useEffect(() => {
    if (!isAnimating) {
      const timer = setTimeout(startAnimation, duration);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, duration, startAnimation]);

  return (
    <AnimatePresence
      onExitComplete={() => setIsAnimating(false)}
    >
      <motion.span
        key={currentWord}
        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{
          opacity: 0,
          y: -20,
          filter: "blur(8px)",
          position: "absolute",
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={cn(
          "z-10 inline-block relative text-left",
          className,
        )}
      >
        {currentWord.split(" ").map((word, wordIdx) => (
          <motion.span
            key={word + wordIdx}
            initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              delay: wordIdx * 0.08,
              duration: 0.3,
            }}
            className="inline-block whitespace-nowrap"
          >
            {word}
            {wordIdx < currentWord.split(" ").length - 1 && (
              <span>&nbsp;</span>
            )}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}
