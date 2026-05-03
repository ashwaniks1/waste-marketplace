"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspaceContext";
import type { SellerConversationRow } from "@/components/seller/seller-inbox-types";
import { useSupabaseRealtimeRefresh } from "@/hooks/useSupabaseRealtimeRefresh";

export function SellerInboxPanel() {
  const { openChat, activeThreadId } = useSellerWorkspace();
  const [rows, setRows] = useState<SellerConversationRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRows = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    const [me, list] = await Promise.all([fetch("/api/users/me"), fetch("/api/conversations")]);
    const meJson = await me.json();
    if (me.ok && meJson.profile) setMeId(meJson.profile.id);
    const data = await list.json();
    if (list.ok) setRows(data);
    if (!opts?.silent) setLoading(false);
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useSupabaseRealtimeRefresh({
    channelName: "seller-inbox-panel",
    changes: [{ event: "*", schema: "public", table: "conversations" }],
    onChange: () => void loadRows({ silent: true }),
    onSubscribed: () => void loadRows({ silent: true }),
  });

  return (
    <aside className="flex h-min flex-col overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/90 shadow-sm ring-1 ring-emerald-50/50">
      <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/90 to-white px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-800">Communication</p>
        <p className="text-sm font-semibold text-slate-900">Inbox</p>
        <p className="mt-0.5 text-xs text-slate-500">Tap a thread to open the chat</p>
      </div>
      <div className="max-h-[min(50vh,420px)] min-h-0 space-y-2 overflow-y-auto p-3">
        {loading ? (
          <p className="px-1 text-xs text-slate-500">Getting recent conversations.</p>
        ) : rows.length === 0 ? (
          <p className="px-1 text-sm leading-6 text-slate-600">
            No messages yet. When buyers open a thread on your listings, it shows up here.
          </p>
        ) : (
          rows.slice(0, 12).map((row) => {
            const imSeller = meId != null && row.listing.userId === meId;
            const otherName = imSeller ? row.buyer.name : row.listing.seller.name;
            const preview = row.messages[0]?.body ?? "No messages yet";
            const when = new Date(row.updatedAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });
            const typeLabel =
              WASTE_TYPE_OPTIONS.find((o) => o.value === row.listing.wasteType)?.label ?? row.listing.wasteType;
            const cover = row.listing.images?.[0];
            const isActive = activeThreadId === row.id;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => openChat(row.id)}
                className={`flex w-full gap-2 rounded-xl border p-2.5 text-left transition ${
                  isActive
                    ? "border-teal-400 bg-teal-50/80 shadow-sm"
                    : "border-slate-100 bg-slate-50/50 hover:border-teal-200 hover:bg-white"
                }`}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-emerald-50">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg">♻️</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.listing.title || typeLabel}</p>
                    <time className="shrink-0 text-[10px] text-slate-500">{when}</time>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {typeLabel} · Buyer: {otherName}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{preview}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="border-t border-slate-100 p-2">
        <Link
          href="/customer/messages"
          className="block rounded-xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-teal-800 transition hover:bg-emerald-50"
        >
          Open full inbox
        </Link>
      </div>
    </aside>
  );
}
