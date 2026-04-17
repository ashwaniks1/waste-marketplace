import type { ReactNode } from "react";

/**
 * Layered eco “AI-style” hero backdrop — pure CSS/SVG (no external image CDN).
 * Keeps LCP predictable and works offline.
 */
export function HeroEcoBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-[min(100dvh,52rem)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-1/4 top-0 h-[120%] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(52,211,153,0.35),_transparent_55%)] blur-3xl motion-safe:animate-pulse"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1/4 bottom-0 h-[90%] w-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.22),_transparent_60%)] blur-3xl"
        aria-hidden
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
        aria-hidden
      >
        <defs>
          <pattern id="eco-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#eco-grid)" />
      </svg>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
