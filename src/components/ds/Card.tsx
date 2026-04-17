import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Subtle lift + shadow on hover (cards in lists) */
  hoverLift?: boolean;
  /** Stronger glass panel */
  glass?: boolean;
};

export function Card({ children, className = "", hoverLift = false, glass = true, ...rest }: CardProps) {
  const base =
    "rounded-xl border shadow-md transition duration-300 ease-out focus-within:ring-2 focus-within:ring-emerald-400/50";
  const glassCls = glass
    ? "border-white/15 bg-white/10 text-slate-100 shadow-emerald-950/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/40"
    : "border-slate-200/90 bg-white text-slate-900 shadow-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
  const lift = hoverLift ? "hover:-translate-y-1 hover:shadow-xl motion-reduce:transform-none" : "";

  return (
    <div className={`${base} ${glassCls} ${lift} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
