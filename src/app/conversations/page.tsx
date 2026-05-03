"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
        if (r === "customer") {
          router.replace("/customer/messages");
          return;
        }
      }
      const data = await list.json();
      if (list.ok) setRows(data);
      setLoading(false);
    })();
  }, [router]);

  return (
    <>
      <AppHeader title="Messages" role={role} />
      <div className="mx-auto max-w-4xl space-y-5 pt-1">
        <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-md sm:p-8">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Inbox
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Keep listing conversations in one focused workspace.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Open a thread to continue the same chat view sellers use while coordinating offers, pickup timing, and handoff details.
          </p>
        </section>

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
                    className="flex gap-3 rounded-3xl border border-slate-200/50 bg-white p-4 shadow-cosmos-sm transition hover:border-teal-200/80 hover:shadow-cosmos-md"
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
