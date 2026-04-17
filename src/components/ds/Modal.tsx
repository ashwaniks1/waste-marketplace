"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

export function Modal({
  open,
  title,
  children,
  onClose,
  labelledBy,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
}) {
  const autoId = useId();
  const titleId = labelledBy ?? `${autoId}-title`;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-white/20 bg-white/95 p-6 text-slate-900 shadow-2xl shadow-emerald-950/30 outline-none backdrop-blur-xl dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
