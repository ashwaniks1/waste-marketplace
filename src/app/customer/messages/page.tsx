"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspaceContext";
import type { SellerConversationRow } from "@/components/seller/seller-inbox-types";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

export default function CustomerMessagesPage() {
  const { openChat } = useSellerWorkspace();
  const [rows, setRows] = useState<SellerConversationRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [me, list] = await Promise.all([fetch("/api/users/me"), fetch("/api/conversations")]);
      const meJson = await me.json();
      if (me.ok && meJson.profile) setMeId(meJson.profile.id);
      const data = await list.json();
      if (list.ok) setRows(data);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <AppHeader title="Messages" backHref="/customer" role="customer" />
      <div className="space-y-3 pt-2">
        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            variant="chat"
            title="No conversations yet"
            description="When buyers message you on a listing, threads appear here and in the communication column."
            actionLabel="New listing"
            actionHref="/customer/listings/new"
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
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

              return (
                <li key={row.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <button
                      type="button"
                      onClick={() => openChat(row.id)}
                      className="flex flex-1 gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm transition hover:border-teal-200 hover:bg-white"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl">♻️</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-semibold text-slate-900">{row.listing.title || typeLabel}</p>
                          <time className="shrink-0 text-xs text-slate-500">{when}</time>
                        </div>
                        <p className="text-xs text-slate-500">
                          {typeLabel} · Buyer: {otherName}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{preview}</p>
                      </div>
                    </button>
                    <Link
                      href={`/customer/listings/${row.listing.id}`}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-white sm:w-24"
                    >
                      Listing
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
