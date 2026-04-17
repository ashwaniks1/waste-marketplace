"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

export function Input({
  id,
  label,
  error,
  hint,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: ReactNode;
}) {
  const inputId = id ?? props.name;
  return (
    <div className="w-full">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`mt-1 w-full rounded-xl border bg-white px-3 py-3 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/80 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 ${
          error ? "border-rose-400 ring-1 ring-rose-200" : "border-slate-200 dark:border-slate-600"
        } ${className}`.trim()}
        {...props}
      />
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
