"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SellerRelatedPanel() {
  const pathname = usePathname();

  if (pathname === "/customer") {
    return (
      <aside className="h-min space-y-3 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Related</p>
        <p className="text-sm font-semibold text-slate-900">Listing tips</p>
        <p className="text-xs leading-6 text-slate-600">
          Clear photos, honest weights, and a pickup window help buyers answer quickly with strong offers.
        </p>
        <Link
          href="/customer/listings/new"
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          New listing
        </Link>
        <Link href="/profile" className="block text-center text-xs font-medium text-teal-700 hover:underline">
          Profile & compliance
        </Link>
      </aside>
    );
  }

  if (pathname === "/customer/listings" || pathname === "/customer/listings/new") {
    return (
      <aside className="h-min space-y-3 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Related</p>
        <p className="text-sm font-semibold text-slate-900">Seller board</p>
        <p className="text-xs leading-6 text-slate-600">Compare offers, adjust pricing, and keep pickup notes current so drivers show up ready.</p>
        <Link
          href="/customer"
          className="block text-center text-xs font-semibold text-teal-700 hover:underline"
        >
          Back to home
        </Link>
      </aside>
    );
  }

  if (pathname === "/customer/messages") {
    return (
      <aside className="h-min space-y-3 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Related</p>
        <p className="text-sm font-semibold text-slate-900">Messaging</p>
        <p className="text-xs leading-6 text-slate-600">Keep negotiations on-platform so your listing history and pickup details stay in one place.</p>
        <p className="text-xs text-slate-500">Use the communication column to jump between buyers without leaving your workspace.</p>
      </aside>
    );
  }

  if (pathname.startsWith("/customer/listings/") && pathname !== "/customer/listings/new") {
    return (
      <aside className="h-min space-y-3 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Related</p>
        <p className="text-sm font-semibold text-slate-900">This listing</p>
        <p className="text-xs leading-6 text-slate-600">Reply to offers and buyer questions from the comm column, or from the full inbox view.</p>
        <Link href="/customer/listings" className="block text-center text-xs font-semibold text-teal-700 hover:underline">
          All my listings
        </Link>
      </aside>
    );
  }

  return (
    <aside className="h-min space-y-2 rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/50 p-4 text-xs text-slate-500">
      Seller workspace. Use the center column for context-sensitive tips.
    </aside>
  );
}
