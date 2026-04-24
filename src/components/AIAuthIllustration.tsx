/**
 * Stylized marketplace illustration (vector) — reads well beside sign-in on desktop.
 */
export function AIAuthIllustration() {
  return (
    <div className="relative flex h-full min-h-[280px] w-full items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-8 ring-1 ring-white/10">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(52,211,153,0.45), transparent 45%), radial-gradient(circle at 80% 70%, rgba(45,212,191,0.35), transparent 40%)",
        }}
      />
      <svg viewBox="0 0 400 320" className="relative z-10 h-auto w-full max-w-md drop-shadow-2xl" aria-hidden>
        <defs>
          <linearGradient id="auth-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
        <ellipse cx="200" cy="260" rx="140" ry="28" fill="rgba(15,23,42,0.5)" />
        <path
          d="M120 200 L180 120 L240 140 L300 90 L320 200 Z"
          fill="none"
          stroke="url(#auth-grad)"
          strokeWidth="6"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <rect x="70" y="80" width="100" height="72" rx="14" fill="rgba(15,118,110,0.35)" stroke="rgba(52,211,153,0.6)" strokeWidth="2" />
        <rect x="230" y="96" width="110" height="80" rx="16" fill="rgba(30,41,59,0.6)" stroke="rgba(148,163,184,0.5)" strokeWidth="2" />
        <circle cx="200" cy="72" r="36" fill="url(#auth-grad)" opacity="0.85" />
        <path
          d="M188 72 L196 82 L216 58"
          fill="none"
          stroke="#0f172a"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="200" y="302" textAnchor="middle" fill="rgba(226,232,240,0.55)" fontSize="11" fontFamily="system-ui, sans-serif">
          Local buyers · drivers · sellers
        </text>
      </svg>
    </div>
  );
}
