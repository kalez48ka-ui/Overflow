"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

interface TextScrambleProps {
  text: string;
  speed?: number;
  scrambleSpeed?: number;
  className?: string;
  trigger?: boolean;
  /** Color for resolved characters. Defaults to #3FB950 (green). */
  resolvedColor?: string;
  /** Color for scrambled (unresolved) characters. Defaults to resolved color at 40% opacity. */
  scrambledColor?: string;
}

export function TextScramble({
  text,
  speed = 50,
  scrambleSpeed = 30,
  className = "",
  trigger = true,
  resolvedColor = "#3FB950",
  scrambledColor,
}: TextScrambleProps) {
  const [displayed, setDisplayed] = useState("");
  const resolvedCount = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scramble = useCallback(() => {
    resolvedCount.current = 0;

    if (intervalRef.current) clearInterval(intervalRef.current);

    // Rapidly redraw scrambled characters
    intervalRef.current = setInterval(() => {
      setDisplayed(() => {
        const resolved = text.slice(0, resolvedCount.current);
        const remaining = text.length - resolvedCount.current;
        const scrambled = Array.from({ length: remaining }, () =>
          CHARS[Math.floor(Math.random() * CHARS.length)]
        ).join("");
        return resolved + scrambled;
      });
    }, scrambleSpeed);

    // Resolve one character at a time
    let charIndex = 0;
    const resolveInterval = setInterval(() => {
      resolvedCount.current++;
      charIndex++;
      if (charIndex >= text.length) {
        clearInterval(resolveInterval);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayed(text);
      }
    }, speed);

    return () => {
      clearInterval(resolveInterval);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, scrambleSpeed]);

  useEffect(() => {
    if (trigger) return scramble();
  }, [trigger, scramble]);

  const unresolved = scrambledColor ?? `${resolvedColor}66`;

  return (
    <span className={`font-mono ${className}`} aria-label={text}>
      {displayed.split("").map((char, i) => (
        <span
          key={i}
          style={{
            color: i < resolvedCount.current ? resolvedColor : unresolved,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  );
}
