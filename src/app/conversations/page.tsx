"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type Row = {
  id: string;
  updatedAt: string;
  listing: {
    id: string;
    title: string;
    wasteType: string;
    status: string;
    userId: string;
    images: string[];
    seller: { id: string; name: string };
  };
  buyer: { id: string; name: string; avatarUrl?: string | null };
  messages: { id: string; body: string; createdAt: string }[];
};

export default function ConversationsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [role, setRole] = useState<"customer" | "buyer" | "admin" | "driver">("buyer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [me, list] = await Promise.all([fetch("/api/users/me"), fetch("/api/conversations")]);
      const meJson = await me.json();
      if (me.ok && meJson.profile) {
        setMeId(meJson.profile.id);
        const r = meJson.profile.role;
        if (r === "admin" || r === "buyer" || r === "customer" || r === "driver") setRole(r);
      }
      const data = await list.json();
      if (list.ok) setRows(data);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <AppHeader title="Messages" role={role} />
      <div className="mx-auto max-w-2xl space-y-3 px-4 pb-10 pt-2 sm:px-6">
        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : rows.length === 0 ? (
          role === "admin" ? (
            <EmptyState
              variant="chat"
              title="No conversations"
              description="Conversations for buyers and sellers appear here. Admins can manage site activity from the admin dashboard."
            />
          ) : role === "driver" ? (
            <EmptyState
              variant="chat"
              title="No messages"
              description="In-app chat is available to buyers and sellers. Use the pickup board to manage your jobs."
              actionLabel="Open pickup board"
              actionHref="/driver"
            />
          ) : (
            <EmptyState
              variant="chat"
              title="No conversations yet"
              description="Open a listing and start a thread with the seller, or wait for buyers to message you on your listings."
              actionLabel={role === "customer" ? "New listing" : "Browse listings"}
              actionHref={role === "customer" ? "/customer/listings/new" : "/buyer"}
            />
          )
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const imSeller = meId != null && row.listing.userId === meId;
              const otherName = imSeller ? row.buyer.name : row.listing.seller.name;
              const otherRole = imSeller ? "Buyer" : "Seller";
              const preview = row.messages[0]?.body ?? "No messages yet";
              const when = new Date(row.updatedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              });
              const typeLabel = WASTE_TYPE_OPTIONS.find((o) => o.value === row.listing.wasteType)?.label ?? row.listing.wasteType;
              const cover = row.listing.images?.[0];

              return (
                <li key={row.id}>
                  <Link
                    href={`/conversations/${row.id}`}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:border-teal-200 hover:bg-white"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote listing URLs
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
                        {typeLabel} · {otherRole}: {otherName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{preview}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
