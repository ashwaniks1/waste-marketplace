"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ProfileData = {
  name: string;
  avatarUrl?: string | null;
};

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export function UserMenu({
  profile,
  onLogout,
}: {
  profile: ProfileData | null;
  onLogout: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const name = profile?.name?.trim() || "My account";
  const initials = initialsOf(name);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-white py-1 pl-1 pr-2 shadow-sm transition hover:border-teal-200 hover:bg-slate-50/90 sm:pr-3"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white sm:h-10 sm:w-10"
          />
        ) : (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-semibold text-white sm:h-10 sm:w-10">
            {initials}
          </span>
        )}
        <span className="hidden max-w-[8rem] truncate text-left text-sm font-medium text-slate-800 sm:block">{name}</span>
        <span className="text-slate-500" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 min-w-[12.5rem] overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-1.5 shadow-lg shadow-slate-900/10 ring-1 ring-slate-100"
          role="menu"
        >
          <p className="px-3 pb-2 pt-1 text-xs font-medium text-slate-500">Signed in as</p>
          <p className="px-3 pb-2 text-sm font-semibold text-slate-900">{name}</p>
          <div className="my-1 border-t border-slate-100" />
          <Link
            href="/profile?tab=profile"
            className="block px-3 py-2.5 text-sm text-slate-800 transition hover:bg-slate-50"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            className="w-full px-3 py-2.5 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void onLogout();
            }}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
