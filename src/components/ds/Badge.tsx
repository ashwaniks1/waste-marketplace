import type { ReactNode } from "react";

const variants: Record<string, string> = {
  eco: "bg-emerald-100 text-emerald-900 ring-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-100",
  slate: "bg-slate-100 text-slate-800 ring-slate-200 dark:bg-slate-800 dark:text-slate-100",
  amber: "bg-amber-100 text-amber-950 ring-amber-200 dark:bg-amber-500/20 dark:text-amber-50",
  rose: "bg-rose-100 text-rose-900 ring-rose-200 dark:bg-rose-500/20 dark:text-rose-50",
};

export function Badge({
  children,
  variant = "eco",
  className = "",
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${variants[variant] ?? variants.eco} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
