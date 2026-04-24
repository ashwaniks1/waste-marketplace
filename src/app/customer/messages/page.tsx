"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { customerListingDetailHref } from "@/lib/seller-workspace-url";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { UserAvatar } from "@/components/UserAvatar";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspaceContext";
import type { SellerConversationRow } from "@/components/seller/seller-inbox-types";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

export default function CustomerMessagesPage() {
  const searchParams = useSearchParams();
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
    <div className="space-y-5 pt-1 lg:h-full lg:overflow-y-auto lg:pr-1">
      <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-md sm:p-8">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
          Inbox
        </span>
        <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Every buyer thread stays attached to the listing it came from.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Open a thread here or from the floating inbox. Your place in the conversation is kept when you switch
          listings, and messages refresh quietly in the background.
        </p>
      </section>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            variant="chat"
            title="No conversations yet"
            description="When buyers message you on a listing, threads appear here and in the floating inbox."
            actionLabel="New listing"
            actionHref="/customer/listings/new"
          />
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
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
                    <div className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-sm">
                    <div className="flex items-start gap-3">
                      <UserAvatar name={otherName} avatarUrl={row.buyer.avatarUrl} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-slate-950">{otherName}</p>
                            <p className="mt-1 truncate text-sm text-slate-500">
                              {row.listing.title || typeLabel} · {typeLabel}
                            </p>
                          </div>
                          <time className="shrink-0 text-xs text-slate-500">{when}</time>
                        </div>
                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{preview}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200/50 bg-cosmos-page-alt/50 p-3 shadow-cosmos-sm">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-2">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element -- remote listing URLs
                          <img src={cover} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-2xl">♻️</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{row.listing.title || typeLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">Listing status: {row.listing.status.replaceAll("_", " ")}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Button type="button" onClick={() => openChat(row.id)} className="sm:min-w-[140px]">
                        Open chat
                      </Button>
                      <Link
                        href={customerListingDetailHref(row.listing.id, searchParams)}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200/60 bg-cosmos-page-alt/50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-cosmos-sm transition hover:border-slate-300 hover:bg-white sm:min-w-[140px]"
                      >
                        View listing
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
