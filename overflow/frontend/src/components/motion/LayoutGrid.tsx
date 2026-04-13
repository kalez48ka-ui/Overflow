"use client";

/**
 * LayoutGrid — Animated grid that smoothly reflows when items are filtered or sorted.
 *
 * Each child must have a unique `key`. Uses Framer Motion `layout` animations
 * with AnimatePresence for enter/exit transitions. When items change position
 * they glide to their new spot with spring physics instead of teleporting.
 */

import { Children, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface LayoutGridProps {
  children: ReactNode;
  /** CSS class for the grid container */
  className?: string;
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export function LayoutGrid({ children, className = "" }: LayoutGridProps) {
  const prefersReduced = useReducedMotion();
  const childArray = Children.toArray(children);

  return (
    <motion.div layout className={className}>
      <AnimatePresence mode="popLayout">
        {childArray.map((child) => {
          // Extract the key from the child — React sets it on the element
          const key =
            child && typeof child === "object" && "key" in child
              ? child.key
              : undefined;

          return (
            <motion.div
              key={key}
              layout={!prefersReduced}
              variants={prefersReduced ? undefined : itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{
                layout: {
                  type: "spring",
                  stiffness: 350,
                  damping: 30,
                },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              }}
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
