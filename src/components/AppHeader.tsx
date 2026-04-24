"use client";

import Link from "next/link";

export function AppHeader({
  title,
  backHref,
  role,
}: {
  title: string;
  backHref?: string;
  role: "customer" | "buyer" | "admin" | "driver";
}) {
  return (
    <header className="mb-6 rounded-[1.75rem] border border-white/80 bg-white/80 px-5 py-4 shadow-sm ring-1 ring-slate-100/80 backdrop-blur">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            {role === "admin" ? "Admin" : role === "buyer" ? "Buyer" : role === "driver" ? "Driver" : "Seller"}
          </p>
          <div className="mt-1 flex items-center gap-3">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                Back
              </Link>
            ) : null}
            <p className="truncate text-xl font-semibold text-slate-900 sm:text-2xl">{title}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
