"use client";

import { useEffect, useId, useState } from "react";
import {
  detectMarketRegion,
  setMarketRegionPreference,
  subscribeMarketRegion,
  type MarketRegion,
} from "@/lib/marketRegion";

type Variant = "dark" | "light";

export function MarketRegionToggle({
  className = "",
  variant = "dark",
  label = "Region",
}: {
  className?: string;
  variant?: Variant;
  label?: string;
}) {
  const [region, setRegion] = useState<MarketRegion>("US");

  useEffect(() => {
    setRegion(detectMarketRegion());
    return subscribeMarketRegion(setRegion);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== "wm_market_region") return;
      if (e.newValue === "IN" || e.newValue === "US") {
        setRegion(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isDark = variant === "dark";
  const labelId = useId();

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      <span
        className={`text-xs font-medium uppercase tracking-wide ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}
        id={labelId}
      >
        {label}
      </span>
      <div
        className={`inline-flex rounded-full p-0.5 ${
          isDark ? "border border-white/15 bg-slate-900/40" : "border border-slate-200 bg-slate-100"
        }`}
        role="group"
        aria-labelledby={labelId}
      >
        {(
          [
            { id: "US" as const, name: "United States" },
            { id: "IN" as const, name: "India" },
          ] as const
        ).map((opt) => {
          const active = region === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMarketRegionPreference(opt.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                active
                  ? isDark
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200"
                  : isDark
                    ? "text-slate-300 hover:bg-white/5 hover:text-white"
                    : "text-slate-600 hover:bg-white"
              }`}
              aria-pressed={active}
            >
              {opt.id === "US" ? "US" : "India"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
