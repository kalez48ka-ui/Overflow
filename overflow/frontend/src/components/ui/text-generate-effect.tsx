"use client";

import { useEffect } from "react";
import { motion, stagger, useAnimate, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TextGenerateEffectProps {
  /** The text to animate in */
  text: string;
  /** Additional class names for the container */
  className?: string;
  /** Stagger delay between words in seconds (default 0.06) */
  staggerDelay?: number;
  /** Whether to animate only once when in view (default true) */
  once?: boolean;
}

/**
 * TextGenerateEffect — Text that fades/blurs in word by word with a stagger.
 * Each word starts blurred and transparent, then resolves to sharp and visible.
 * Triggers when the element scrolls into view.
 */
export function TextGenerateEffect({
  text,
  className,
  staggerDelay = 0.06,
  once = true,
}: TextGenerateEffectProps) {
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope, { once, margin: "-40px" });
  const prefersReduced = useReducedMotion();

  const words = text.split(" ");

  useEffect(() => {
    if (!isInView) return;

    if (prefersReduced) {
      // Skip animation, just show all words
      animate(
        "span.word",
        { opacity: 1, filter: "blur(0px)" },
        { duration: 0 },
      );
      return;
    }

    animate(
      "span.word",
      { opacity: 1, filter: "blur(0px)" },
      {
        duration: 0.4,
        delay: stagger(staggerDelay, { startDelay: 0.1 }),
        ease: "easeOut",
      },
    );
  }, [isInView, animate, staggerDelay, prefersReduced]);

  return (
    <span ref={scope} className={cn("inline", className)}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="word inline-block"
          style={{ opacity: 0, filter: "blur(6px)" }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </span>
  );
}
