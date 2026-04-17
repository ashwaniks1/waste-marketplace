"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the server-side idle timer fresh and logs out
 * if the server reports an expired session.
 */
export function SessionActivity() {
  const router = useRouter();
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      const now = Date.now();
      if (now - lastPingRef.current < 30_000) return;
      lastPingRef.current = now;
      try {
        const res = await fetch("/api/auth/activity", { method: "POST" });
        if (res.status === 401) {
          if (cancelled) return;
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
        }
      } catch {
        // ignore transient network errors
      }
    }

    const onActivity = () => void ping();
    const events: (keyof WindowEventMap)[] = ["click", "keydown", "touchstart", "mousemove", "scroll"];
    events.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    // Initial ping and background heartbeat to catch "passive" use.
    void ping();
    const interval = window.setInterval(() => void ping(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [router]);

  return null;
}

