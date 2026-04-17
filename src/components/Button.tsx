import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-teal-600 text-white shadow-md shadow-teal-900/10 hover:bg-teal-700 hover:shadow-lift disabled:bg-teal-300 disabled:shadow-none dark:bg-teal-500 dark:hover:bg-teal-600",
  secondary:
    "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300 dark:bg-rose-500 dark:hover:bg-rose-600",
  ghost:
    "text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/60",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:active:scale-[0.98] motion-safe:hover:scale-[1.01] disabled:pointer-events-none disabled:opacity-60 dark:focus-visible:ring-offset-slate-900 ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
