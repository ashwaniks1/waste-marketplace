"use client";

import Link from "next/link";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Marketplace" },
  { href: "/#sell-waste", label: "Sell waste" },
  { href: "/#buy-materials", label: "Buy materials" },
  { href: "/#transport", label: "Transport" },
  { href: "/#how-it-works", label: "How it works" },
];

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/80 bg-slate-950/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-white" onClick={() => setOpen(false)}>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/90 text-lg font-bold shadow-lg shadow-emerald-500/20">
            W
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[0.18em] text-emerald-200">Waste Marketplace</p>
            <p className="truncate text-xs text-slate-300">Recycle, resell, reuse</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-200 lg:flex">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="whitespace-nowrap transition hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login"
            className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/15"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
          >
            Create account
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:hidden">
          <Link
            href="/signup"
            className="rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-500/30"
          >
            Join
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span className="text-lg leading-none">{open ? "×" : "≡"}</span>
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-white/10 px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2.5 text-sm text-slate-100 hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              className="mt-2 rounded-xl border border-white/15 px-3 py-2.5 text-center text-sm text-slate-100"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
