"use client";

import type { ListingStatus, WasteType } from "@prisma/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BuyerDriverLiveMap } from "@/components/BuyerDriverLiveMap";
import { Button } from "@/components/Button";
import { ConversationDrawer } from "@/components/ConversationDrawer";
import { ImageGallery } from "@/components/ImageGallery";
import { ReviewForm } from "@/components/ReviewForm";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/money";
import { listingIsOpenForMarketplaceActions } from "@/lib/listing-marketplace";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type ListingDetail = {
  id: string;
  handoffPin?: string | null;
  wasteType: WasteType;
  quantity: string;
  description: string | null;
  images: string[];
  address: string;
  status: ListingStatus;
  askingPrice: number;
  currency: string;
  deliveryAvailable: boolean;
  deliveryRequired?: boolean;
  buyerDeliveryConfirmed?: boolean;
  deliveryFee: number | null;
  acceptedOfferAmount: number | null;
  acceptedOfferCurrency: string | null;
  pickupDeadlineAt: string | null;
  acceptedAt: string | null;
  seller: { id: string; name: string; email: string; phone: string | null; avatarUrl?: string | null };
  acceptor: { id: string; name: string; email: string; phone: string | null } | null;
  assignedDriver: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
};

function formatDeadline(isoDate: string | null) {
  if (!isoDate) return null;
  const deadline = new Date(isoDate);
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return "Due now";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${minutes}m remaining`;
}


type OfferRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; role: string };
};

export default function BuyerListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<ListingDetail | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [offerAmount, setOfferAmount] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("Chat");
  const [chatSubtitle, setChatSubtitle] = useState<string | undefined>(undefined);
  const [chatAvatarUrl, setChatAvatarUrl] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/listings/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError("We couldn’t load this listing right now. Refresh the page or check back in a moment.");
      return;
    }
    setRow(data);
    setOfferAmount(String(data.askingPrice ?? ""));
    setError(null);

    const [o, c] = await Promise.all([
      fetch(`/api/listings/${id}/offers`),
      fetch(`/api/listings/${id}/comments`),
    ]);
    if (o.ok) setOffers(await o.json());
    if (c.ok) setComments(await c.json());
  }

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/users/me");
      const m = await me.json();
      if (me.ok && m.profile) setMeId(m.profile.id);
    })();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitOffer(amount: number) {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError("We couldn’t send your offer right now. Check the amount and try again.");
    else await load();
  }

  async function withdrawOffer(offerId: string) {
    setBusy(true);
    const res = await fetch(`/api/offers/${offerId}/withdraw`, { method: "POST" });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError("We couldn’t withdraw your offer right now. Try again in a moment.");
    else await load();
  }

  async function openChat() {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/conversations`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError("We couldn’t open this chat right now. Try again in a moment.");
      return;
    }
    setConversationId(data.id);
    setChatTitle(row?.seller.name ?? "Seller chat");
    setChatSubtitle(`Private chat with ${row?.seller.name ?? "seller"}`);
    setChatAvatarUrl(row?.seller.avatarUrl ?? null);
    setChatOpen(true);
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    setBusy(false);
    if (!res.ok) {
      await res.json().catch(() => ({}));
      setError("We couldn’t post your comment right now. Try again in a moment.");
      return;
    }
    setCommentBody("");
    const cr = await fetch(`/api/listings/${id}/comments`);
    if (cr.ok) setComments(await cr.json());
  }

  async function submitComplete() {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/complete`, { method: "POST" });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError("We couldn’t mark this pickup complete right now. Try again in a moment.");
    else await load();
  }

  async function confirmMarketplaceDelivery() {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/confirm-marketplace-delivery`, { method: "POST" });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError("We couldn’t request driver delivery right now. Try again in a moment.");
    else {
      setError(null);
      await load();
    }
  }

  async function regenerateHandoffPin() {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/handoff-pin/regenerate`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError("We couldn’t create a new PIN right now. Try again in a moment.");
      return;
    }
    setRow((current) => (current ? { ...current, handoffPin: data.handoffPin } : current));
    setError(null);
  }

  const icon = WASTE_TYPE_OPTIONS.find((o) => o.value === row?.wasteType)?.icon;
  const iAmAcceptor = Boolean(meId && row?.acceptor?.id === meId);
  const myPending = offers.find((o) => o.status === "pending");
  const marketplaceDelivery = Boolean(row?.deliveryRequired || row?.deliveryAvailable);
  const needsBuyerDeliveryRelease =
    Boolean(row && row.status === "accepted" && marketplaceDelivery && !row.buyerDeliveryConfirmed);
  const showHandoffPin = Boolean(row?.status === "accepted" && row.buyerDeliveryConfirmed && row.handoffPin);

  return (
    <>
      <AppHeader title="Listing detail" backHref="/buyer" role="buyer" />
      <div className="space-y-4 pb-8 pt-1 lg:min-h-[calc(100dvh-5.5rem)]">
        {error ? (
          <p className="rounded-3xl border border-rose-200/60 bg-rose-50/90 px-4 py-3 text-sm text-rose-800 shadow-cosmos-sm">
            {error}
          </p>
        ) : null}
        {!row ? (
          <p className="text-sm text-slate-600">Getting the latest listing details.</p>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-md sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="text-4xl" aria-hidden>{icon}</span>
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                      Buyer record
                    </span>
                    <h1 className="mt-3 text-2xl font-semibold capitalize tracking-tight text-slate-950 sm:text-3xl">
                      {row.wasteType.replace(/_/g, " ").toLowerCase()}
                    </h1>
                    <p className="mt-1 text-sm text-slate-600">{row.quantity} · {row.address}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <span className="rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-900">
                        Asking {formatMoney(row.askingPrice, row.currency)}
                      </span>
                      {row.deliveryAvailable ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                          Delivery {formatMoney(row.deliveryFee ?? 0, row.currency)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <StatusBadge status={row.status} />
              </div>
            </section>

            <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
              <aside className="space-y-4 lg:col-span-3">
                <section className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-md">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Summary</p>
                  {row.description ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600">{row.description}</p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-600">No description provided.</p>
                  )}
                  {row.status === "accepted" && row.acceptedOfferAmount ? (
                    <p className="mt-4 rounded-2xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">
                      Seller accepted {formatMoney(row.acceptedOfferAmount, row.acceptedOfferCurrency ?? row.currency)}
                    </p>
                  ) : null}
                  {row.status === "accepted" && row.pickupDeadlineAt ? (
                    <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/80 p-3">
                      <p className="text-sm font-semibold text-teal-900">Pickup deadline</p>
                      <p className="mt-1 text-sm text-slate-700">{new Date(row.pickupDeadlineAt).toLocaleString()}</p>
                      <p className="text-sm text-teal-800">{formatDeadline(row.pickupDeadlineAt)}</p>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-md">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Seller</p>
                  <Link href={`/profile/${row.seller.id}`} className="mt-2 inline-flex font-semibold text-teal-700 underline decoration-teal-200 underline-offset-4">
                    {row.seller.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-600">{row.seller.phone ? row.seller.phone : row.seller.email}</p>
                  <Button variant="secondary" className="mt-4 w-full" disabled={busy} onClick={openChat}>
                    Message seller
                  </Button>
                </section>
              </aside>

              <main className="min-h-0 space-y-4 lg:col-span-6">
                {row.images?.length ? (
                  <section className="rounded-3xl border border-slate-200/50 bg-white p-3 shadow-cosmos-md">
                    <ImageGallery images={row.images} className="sm:grid-cols-1 xl:grid-cols-2" />
                  </section>
                ) : null}

                {listingIsOpenForMarketplaceActions(row.status) ? (
                  <section className="rounded-3xl border border-teal-100 bg-white p-5 shadow-cosmos-md">
                    <h2 className="font-semibold text-teal-950">Make an offer</h2>
                    <p className="text-sm text-teal-900/80">Offer below or above the asking price.</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="flex-1 text-sm font-medium text-slate-800">
                        Your offer ({row.currency})
                        <input
                          type="number"
                          min={0.01}
                          step="0.01"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                          value={offerAmount}
                          onChange={(e) => setOfferAmount(e.target.value)}
                        />
                      </label>
                      <Button className="w-full sm:w-auto" disabled={busy} onClick={() => submitOffer(Number(offerAmount))}>
                        Submit offer
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Button variant="ghost" disabled={busy} onClick={() => submitOffer(Number(row.askingPrice))}>
                        Offer asking price
                      </Button>
                      {myPending ? (
                        <p className="text-sm text-slate-700">
                          Pending: {formatMoney(myPending.amount, row.currency)}{" "}
                          <button type="button" className="text-rose-600 underline" onClick={() => withdrawOffer(myPending.id)}>
                            Withdraw
                          </button>
                        </p>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-md">
                  <h2 className="font-semibold text-slate-900">Comments</h2>
                  <ul className="mt-3 max-h-56 space-y-3 overflow-y-auto">
                    {comments.map((c) => (
                      <li key={c.id} className="border-b border-slate-100 pb-2 text-sm last:border-0">
                        <span className="font-medium text-slate-800">{c.user.name}</span>
                        <span className="text-xs text-slate-500"> · {c.user.role}</span>
                        <p className="text-slate-700">{c.body}</p>
                      </li>
                    ))}
                  </ul>
                  {listingIsOpenForMarketplaceActions(row.status) ? (
                    <form onSubmit={postComment} className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                        placeholder="Ask a question publicly…"
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                      />
                      <Button type="submit" disabled={busy}>Post</Button>
                    </form>
                  ) : null}
                </section>
              </main>

              <aside className="space-y-4 lg:col-span-3">
                {needsBuyerDeliveryRelease ? (
                  <section className="rounded-3xl border border-sky-200 bg-sky-50/90 p-5 shadow-cosmos-md">
                    <p className="text-sm font-semibold text-sky-950">Request driver delivery</p>
                    <p className="mt-1 text-xs leading-5 text-sky-900/90">
                      Publish this accepted pickup to drivers. Your PIN appears after delivery is requested.
                    </p>
                    <Button className="mt-3 w-full" disabled={busy} onClick={() => void confirmMarketplaceDelivery()}>
                      Request driver delivery
                    </Button>
                  </section>
                ) : null}

                {showHandoffPin ? (
                  <section className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 shadow-cosmos-md">
                    <p className="text-sm font-semibold text-amber-950">Delivery PIN</p>
                    <p className="mt-1 text-xs leading-5 text-amber-900/90">Valid until you regenerate it.</p>
                    <p className="mt-4 text-center font-mono text-3xl font-black tracking-widest text-amber-950">
                      {row.handoffPin}
                    </p>
                    <Button type="button" variant="secondary" className="mt-4 w-full" disabled={busy} onClick={() => void regenerateHandoffPin()}>
                      Regenerate PIN
                    </Button>
                  </section>
                ) : null}

                {row.status === "accepted" && row.assignedDriver ? (
                  <BuyerDriverLiveMap listingId={row.id} driverName={row.assignedDriver.name} />
                ) : (
                  <section className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Driver</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Tracking appears here once a driver claims the delivery and shares location.
                    </p>
                  </section>
                )}

                {row.status === "accepted" && iAmAcceptor ? (
                  <Button className="w-full" disabled={busy} onClick={() => submitComplete()}>
                    Mark pickup completed
                  </Button>
                ) : null}

                {row.status === "completed" && row.acceptor ? (
                  <ReviewForm listingId={row.id} toUserId={row.seller.id} toUserName={row.seller.name} onSubmitted={() => load()} />
                ) : null}
                {row.status === "completed" && row.assignedDriver ? (
                  <ReviewForm listingId={row.id} toUserId={row.assignedDriver.id} toUserName={row.assignedDriver.name} onSubmitted={() => load()} />
                ) : null}
              </aside>
            </div>
          </>
        )}
      </div>
      <ConversationDrawer
        open={chatOpen}
        conversationId={conversationId}
        title={chatTitle}
        subtitle={chatSubtitle}
        avatarUrl={chatAvatarUrl}
        onClose={() => setChatOpen(false)}
      />
    </>
  );
}
