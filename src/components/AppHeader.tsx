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
    <header className="mb-4 rounded-2xl border border-slate-200/60 bg-white px-5 py-3.5 shadow-cosmos-sm sm:rounded-3xl sm:px-6 sm:py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {role === "admin" ? "Admin" : role === "buyer" ? "Buyer" : role === "driver" ? "Driver" : "Seller"}
          </p>
          <div className="mt-0.5 flex items-center gap-3">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex h-9 items-center rounded-full border border-slate-200/80 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-cosmos-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Back
              </Link>
            ) : null}
            <p className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
