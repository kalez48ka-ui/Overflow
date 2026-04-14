import { useState, useEffect } from "react";

/**
 * Countdown hook — returns remaining milliseconds until the given deadline.
 * Ticks every second. Returns 0 when the deadline has passed.
 */
export function useCountdown(deadline: string) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      setRemaining(diff > 0 ? diff : 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return remaining;
}
