"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Keeps the server-side idle timer fresh and logs out
 * if the server reports an expired session.
 */
export function SessionActivity() {
  const router = useRouter();
  const lastPingRef = useRef<number>(0);
  const [warningSeconds, setWarningSeconds] = useState<number | null>(null);
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(60);
  const warningLabel = useMemo(() => {
    if (warningSeconds == null) return null;
    const m = Math.floor(warningSeconds / 60);
    const s = warningSeconds % 60;
    const mm = String(m);
    const ss = String(s).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [warningSeconds]);

  useEffect(() => {
    let cancelled = false;

    async function ping() {
      const now = Date.now();
      if (now - lastPingRef.current < 30_000) return;
      lastPingRef.current = now;
      try {
        const res = await fetch("/api/auth/activity", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (typeof data?.timeoutMinutes === "number") setTimeoutMinutes(data.timeoutMinutes);
        if (typeof data?.warningSeconds === "number") {
          setWarningSeconds(data.warningSeconds > 0 ? data.warningSeconds : null);
        } else {
          setWarningSeconds(null);
        }
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

  if (warningSeconds == null) return null;
  return (
    <div className="fixed inset-x-0 bottom-3 z-50 px-3 sm:bottom-5">
      <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
        <p className="font-semibold">You’ll be logged out soon due to inactivity.</p>
        <p className="mt-1 text-amber-900">
          Interact with the page to stay signed in. Auto-logout in{" "}
          <span className="font-mono font-semibold">{warningLabel ?? "…"}</span> (idle timeout: {timeoutMinutes} min).
        </p>
      </div>
    </div>
  );
}

