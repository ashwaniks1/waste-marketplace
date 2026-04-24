"use client";

/**
 * Brand mark with a soft rotating highlight (suggests circulation / recycling without shipping a binary GIF).
 * You can later replace the inner content with
 *   <Image src="/brand/waste-mark.gif" alt="" width={44} height={44} unoptimized />
 * if you add an asset to public/brand/.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 shadow-md shadow-slate-900/20 ring-1 ring-white/15 ${className}`}
      aria-hidden
    >
      <span
        className="pointer-events-none absolute -inset-[50%] animate-[spin_3.5s_linear_infinite] opacity-80"
        style={{
          background:
            "conic-gradient(from 180deg, transparent 0%, rgba(255,255,255,0.2) 16%, transparent 32%, transparent 100%)",
        }}
      />
      <span
        className="pointer-events-none absolute inset-0.5 rounded-[0.8rem] border border-white/15"
        style={{ animation: "none" }}
      />
      <span className="relative z-[1] text-sm font-extrabold leading-none text-white">W</span>
    </span>
  );
}
