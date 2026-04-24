import { useEffect, useRef } from "react";

/**
 * Calls the latest `cb` on an interval only while the document tab is visible.
 */
export function usePollWhileVisible(cb: () => void, intervalMs: number, enabled = true) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      ref.current();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);
}
