import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClass: Record<Variant, string> = {
  primary: "bg-teal-600 text-white hover:bg-teal-700 disabled:bg-teal-300",
  secondary: "bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50",
  danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
  ghost: "text-teal-700 hover:bg-teal-50",
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
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
