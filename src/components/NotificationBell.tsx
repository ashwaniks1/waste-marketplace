"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  listingId: string | null;
  conversationId: string | null;
  createdAt: string;
};

export function NotificationBell({ role }: { role: "customer" | "buyer" | "admin" | "driver" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
    const data = await res.json();
    if (res.ok) {
      setItems(data.items ?? []);
      setUnread(data.unreadCount ?? 0);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    await load();
  }

  async function markAll() {
    setLoading(true);
    await fetch("/api/notifications/read-all", { method: "POST" });
    setLoading(false);
    await load();
  }

  function hrefFor(n: Notif) {
    if (role === "customer" && n.listingId && n.conversationId) {
      return `/customer/listings/${n.listingId}?c=${encodeURIComponent(n.conversationId)}`;
    }
    if (n.conversationId) {
      if (role === "customer") return `/customer/messages?c=${encodeURIComponent(n.conversationId)}`;
      return `/conversations/${n.conversationId}`;
    }
    if (n.listingId) {
      if (role === "customer") return `/customer/listings/${n.listingId}`;
      if (role === "driver") return `/driver/listings/${n.listingId}`;
      return `/listing/${n.listingId}`;
    }
    return "/profile";
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg text-slate-700 transition hover:border-teal-300 hover:bg-teal-50"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        🔔
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-h-[1.1rem] min-w-[1.1rem] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-tight text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-slate-200/60 bg-white py-2 shadow-cosmos-md ring-1 ring-slate-200/40">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 pb-2">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <Button type="button" variant="ghost" className="!min-h-8 px-2 text-xs" disabled={loading || unread === 0} onClick={markAll}>
              Mark all read
            </Button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">You&apos;re all caught up.</li>
            ) : (
              items.map((n) => (
                <li key={n.id} className="border-b border-slate-50 last:border-0">
                  <Link
                    href={hrefFor(n)}
                    className={`block px-3 py-3 text-left text-sm hover:bg-slate-50 ${n.readAt ? "opacity-70" : "bg-emerald-50/50"}`}
                    onClick={() => {
                      if (!n.readAt) void markRead(n.id);
                      setOpen(false);
                    }}
                  >
                    <p className="font-medium text-slate-900">{n.title}</p>
                    {n.body ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">{n.body}</p> : null}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
