"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BallEvent } from "@/types";
import { cn, formatTimeAgo } from "@/lib/utils";

interface BallByBallProps {
  events: BallEvent[];
}

function RunBadge({ runs, isWicket, isExtra }: { runs: number; isWicket: boolean; isExtra: boolean }) {
  if (isWicket) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F85149] text-xs font-bold text-white">
        W
      </span>
    );
  }
  if (isExtra) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#8B949E] text-xs font-bold text-[#8B949E]">
        +1
      </span>
    );
  }
  const color =
    runs === 6
      ? "bg-[#388BFD] text-white"
      : runs === 4
      ? "bg-[#3FB950] text-white"
      : runs === 0
      ? "bg-[#21262D] text-[#8B949E]"
      : "bg-[#30363D] text-[#E6EDF3]";

  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        color
      )}
    >
      {runs}
    </span>
  );
}

export function BallByBall({ events }: BallByBallProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [localEvents, setLocalEvents] = useState(events);

  // Auto-scroll to top on new event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [localEvents]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      const runsOptions = [0, 1, 2, 4, 6];
      const runs = runsOptions[Math.floor(Math.random() * runsOptions.length)];
      const isWicket = Math.random() < 0.08;
      const isExtra = Math.random() < 0.05;

      const descriptions: Record<number, string[]> = {
        0: ["Dot ball! Beaten outside off.", "Good length delivery, defended."],
        1: ["Pushed to mid-on, quick single.", "Flicked to square leg, one taken."],
        2: ["Driven to long-off, they run two.", "Pulled behind square, two more."],
        4: ["FOUR! Driven through cover, beautiful!", "FOUR! Cut away past point!"],
        6: ["SIX! Launched over long-on!", "SIX! Pulled high and handsome!"],
      };

      const wicketDescs = [
        "WICKET! Caught behind! Perfect delivery!",
        "WICKET! Stumped! Great keeping!",
        "WICKET! Bowled! Through the gate!",
      ];

      const newEvent: BallEvent = {
        id: `live-${Date.now()}`,
        over: 18,
        ball: Math.floor(Math.random() * 6) + 1,
        runs: isWicket ? 0 : runs,
        isWicket,
        isExtra,
        extraType: isExtra ? "wide" : undefined,
        description: isWicket
          ? wicketDescs[Math.floor(Math.random() * wicketDescs.length)]
          : (descriptions[runs] || descriptions[1])[
              Math.floor(Math.random() * 2)
            ],
        timestamp: Date.now(),
      };

      setLocalEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Build current-over mini dots from the most recent events
  const currentOverEvents = localEvents
    .filter((e) => e.over === localEvents[0]?.over)
    .slice()
    .reverse();

  return (
    <div className="rounded-xl border border-[#30363D] bg-[#161B22] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#30363D] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-[#E6EDF3]">Ball by Ball</h3>
          <p className="text-xs text-[#8B949E]">Live commentary feed</p>
        </div>
        {/* Current over mini-dots */}
        {currentOverEvents.length > 0 && (
          <div className="flex items-center gap-1" aria-label={`Over ${currentOverEvents[0]?.over} balls`}>
            <span className="text-[10px] text-[#8B949E] mr-1">
              Ov {currentOverEvents[0]?.over}:
            </span>
            {currentOverEvents.map((e, i) => {
              const bg = e.isWicket
                ? "#F85149"
                : e.isExtra
                ? "#8B949E"
                : e.runs === 6
                ? "#388BFD"
                : e.runs === 4
                ? "#3FB950"
                : e.runs === 0
                ? "#21262D"
                : "#30363D";
              return (
                <span
                  key={e.id + i}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: bg }}
                  title={e.description}
                >
                  {e.isWicket ? "W" : e.isExtra ? "E" : e.runs}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto p-3 space-y-2"
        style={{ scrollBehavior: "smooth" }}
        role="log"
        aria-label="Ball by ball commentary"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {localEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={i === 0 ? { opacity: 0, y: -16 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex items-start gap-3 rounded-lg px-3 py-2.5",
                i === 0 ? "bg-[#21262D]" : "bg-transparent",
                event.isWicket && "border border-[#F85149]/30"
              )}
            >
              <RunBadge
                runs={event.runs}
                isWicket={event.isWicket}
                isExtra={event.isExtra}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-xs leading-relaxed",
                    event.isWicket
                      ? "font-semibold text-[#F85149]"
                      : event.runs >= 4
                      ? "font-semibold text-[#3FB950]"
                      : "text-[#C9D1D9]"
                  )}
                >
                  {event.description}
                </p>
                <p className="mt-0.5 text-[10px] text-[#8B949E]">
                  Over {event.over}.{event.ball} · {formatTimeAgo(event.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
