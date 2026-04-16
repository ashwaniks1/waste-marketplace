"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";

function formatDistance(target: Date) {
  const remainingMs = target.getTime() - Date.now();
  if (remainingMs <= 0) {
    return { expired: true, label: "Window expired" };
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const nextHours = hours % 24;
    return { expired: false, label: `${days}d ${nextHours}h ${minutes}m left` };
  }

  return { expired: false, label: `${hours}h ${minutes}m ${seconds}s left` };
}

export function PickupDeadlineCard({
  deadlineAt,
  extendedAt,
  canExtend = false,
  busy = false,
  onExtend,
}: {
  deadlineAt?: string | null;
  extendedAt?: string | null;
  canExtend?: boolean;
  busy?: boolean;
  onExtend?: () => void;
}) {
  const target = useMemo(() => (deadlineAt ? new Date(deadlineAt) : null), [deadlineAt]);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (!target) return;
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (!target || Number.isNaN(target.getTime())) return null;
  const state = formatDistance(target);
  void nowTick;

  return (
    <section className="rounded-[1.75rem] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-emerald-50/70 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Pickup window</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{state.label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The listing will automatically go back live when the 24-hour pickup window ends, unless the seller extends it first.
          </p>
          <p className="mt-3 text-xs font-medium text-slate-500">
            Ends {target.toLocaleString()}
            {extendedAt ? ` · extended ${new Date(extendedAt).toLocaleString()}` : ""}
          </p>
        </div>

        {canExtend && onExtend ? (
          <div className="flex shrink-0 flex-col gap-2">
            <Button onClick={onExtend} disabled={busy} className="rounded-2xl px-5">
              {busy ? "Extending…" : "Extend by 24 hours"}
            </Button>
            <p className="text-xs text-slate-500">Use this if pickup needs more time.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
