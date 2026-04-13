"use client";

import { useRef } from "react";
import { motion, useInView, Variants } from "framer-motion";

const lineVariants: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: (i: number) => ({
    y: "0%",
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: [0.33, 1, 0.68, 1], // cubic-bezier ease-out-cubic
      delay: 0.075 * i,
    },
  }),
};

interface RevealTextProps {
  lines: string[];
  className?: string;
  /** Extra class applied to each line wrapper (the motion div). */
  lineClassName?: string;
}

export function RevealText({
  lines,
  className = "",
  lineClassName = "",
}: RevealTextProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-15%" });

  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => (
        <div key={i} className="overflow-hidden">
          <motion.div
            custom={i}
            variants={lineVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className={lineClassName}
          >
            {line}
          </motion.div>
        </div>
      ))}
    </div>
  );
}
