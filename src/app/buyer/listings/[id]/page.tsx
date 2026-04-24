"use client";

import type { ListingStatus, WasteType } from "@prisma/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
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
      setError(data.error ?? "Failed");
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
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Offer failed");
    else await load();
  }

  async function withdrawOffer(offerId: string) {
    setBusy(true);
    const res = await fetch(`/api/offers/${offerId}/withdraw`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Withdraw failed");
    else await load();
  }

  async function openChat() {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/conversations`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not open chat");
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
      const data = await res.json();
      setError(data.error ?? "Comment failed");
      return;
    }
    setCommentBody("");
    const cr = await fetch(`/api/listings/${id}/comments`);
    if (cr.ok) setComments(await cr.json());
  }

  async function submitComplete() {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/complete`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Could not complete");
    else await load();
  }

  async function confirmMarketplaceDelivery() {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/confirm-marketplace-delivery`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Could not confirm");
    else {
      setError(null);
      await load();
    }
  }

  const icon = WASTE_TYPE_OPTIONS.find((o) => o.value === row?.wasteType)?.icon;
  const iAmAcceptor = Boolean(meId && row?.acceptor?.id === meId);
  const myPending = offers.find((o) => o.status === "pending");
  const marketplaceDelivery = Boolean(row?.deliveryRequired ?? row?.deliveryAvailable);
  const needsBuyerDeliveryRelease =
    Boolean(row && row.status === "accepted" && marketplaceDelivery && !row.buyerDeliveryConfirmed);

  return (
    <>
      <AppHeader title="Listing detail" backHref="/buyer" role="buyer" />
      <div className="space-y-6 pb-8 pt-4">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {!row ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{icon}</span>
                <div>
                  <p className="text-xl font-semibold capitalize text-slate-900">
                    {row.wasteType.replace(/_/g, " ").toLowerCase()}
                  </p>
                  <p className="text-slate-600">{row.quantity}</p>
                  <p className="mt-1 text-lg font-semibold text-teal-800">
                    Asking {formatMoney(row.askingPrice, row.currency)}
                  </p>
                  {row.deliveryAvailable ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Delivery fee: {formatMoney(row.deliveryFee ?? 0, row.currency)}
                    </p>
                  ) : null}
                  {row.status === "accepted" && row.acceptedOfferAmount ? (
                    <p className="mt-1 text-sm text-teal-800">
                      Seller accepted {formatMoney(row.acceptedOfferAmount, row.acceptedOfferCurrency ?? row.currency)}
                    </p>
                  ) : null}
                  {row.status === "accepted" && row.pickupDeadlineAt ? (
                    <div className="mt-3 rounded-2xl border border-teal-100 bg-teal-50/80 p-3">
                      <p className="text-sm font-semibold text-teal-900">Pickup deadline</p>
                      <p className="mt-1 text-sm text-slate-700">{new Date(row.pickupDeadlineAt).toLocaleString()}</p>
                      <p className="text-sm text-teal-800">{formatDeadline(row.pickupDeadlineAt)}</p>
                    </div>
                  ) : null}
                  {needsBuyerDeliveryRelease ? (
                    <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-3 dark:border-sky-900/50 dark:bg-sky-950/40">
                      <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">Release pickup to drivers</p>
                      <p className="mt-1 text-xs text-sky-900/90 dark:text-sky-100/80">
                        Drivers only see this job after you confirm you are ready for marketplace pickup (for example once pickup details are agreed in chat).
                      </p>
                      <Button className="mt-3 w-full sm:w-auto" disabled={busy} onClick={() => void confirmMarketplaceDelivery()}>
                        I’m ready — show drivers this pickup
                      </Button>
                    </div>
                  ) : null}
                  {row.status === "accepted" && marketplaceDelivery && row.handoffPin ? (
                    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 dark:border-amber-900/50 dark:bg-amber-950/40">
                      <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Delivery PIN</p>
                      <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/80">
                        Give this code to your driver when they arrive so they can mark delivery complete in the app.
                      </p>
                      <p className="mt-2 text-center font-mono text-2xl font-black tracking-widest text-amber-950 dark:text-amber-50">
                        {row.handoffPin}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-slate-700">{row.address}</p>
            {row.description ? <p className="text-sm text-slate-600">{row.description}</p> : null}

            {row.images?.length ? <ImageGallery images={row.images} /> : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Seller</p>
              <p className="text-sm text-slate-700">
                <Link href={`/profile/${row.seller.id}`} className="font-medium text-teal-700 underline">
                  {row.seller.name}
                </Link>
              </p>
              {row.seller.phone ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={`tel:${row.seller.phone}`}>
                    <Button variant="secondary" className="!min-h-10">
                      Call
                    </Button>
                  </a>
                  <a
                    href={`https://wa.me/${row.seller.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="secondary" className="!min-h-10">
                      WhatsApp
                    </Button>
                  </a>
                </div>
              ) : (
                <p className="mt-1 text-xs text-slate-600">Email: {row.seller.email}</p>
              )}
              <Button variant="secondary" className="mt-3 w-full sm:w-auto" disabled={busy} onClick={openChat}>
                Message seller (private chat)
              </Button>
            </div>

            {listingIsOpenForMarketplaceActions(row.status) ? (
              <section className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
                <h2 className="font-semibold text-teal-950">Make an offer</h2>
                <p className="text-sm text-teal-900/80">You can offer below or above the asking price.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex-1 text-sm">
                    Your offer ({row.currency})
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                    />
                  </label>
                  <Button
                    className="w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => submitOffer(Number(offerAmount))}
                  >
                    Submit offer
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="mt-2 w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => submitOffer(Number(row.askingPrice))}
                >
                  Offer asking price
                </Button>
                {myPending ? (
                  <p className="mt-3 text-sm text-slate-700">
                    Pending offer: {formatMoney(myPending.amount, row.currency)}{" "}
                    <button
                      type="button"
                      className="text-rose-600 underline"
                      onClick={() => withdrawOffer(myPending.id)}
                    >
                      Withdraw
                    </button>
                  </p>
                ) : null}
              </section>
            ) : null}

            {row.status === "accepted" && iAmAcceptor ? (
              <Button className="w-full sm:max-w-xs" disabled={busy} onClick={() => submitComplete()}>
                Mark pickup completed
              </Button>
            ) : null}

            {row.status === "completed" && row.acceptor ? (
              <ReviewForm listingId={row.id} toUserId={row.seller.id} toUserName={row.seller.name} onSubmitted={() => load()} />
            ) : null}
            {row.status === "completed" && row.assignedDriver ? (
              <ReviewForm
                listingId={row.id}
                toUserId={row.assignedDriver.id}
                toUserName={row.assignedDriver.name}
                onSubmitted={() => load()}
              />
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-900">Comments</h2>
              <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
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
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Ask a question publicly…"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                  />
                  <Button type="submit" disabled={busy}>
                    Post
                  </Button>
                </form>
              ) : null}
            </section>

            <Link href="/buyer" className="block text-center text-sm text-teal-700">
              Back to listings
            </Link>
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
