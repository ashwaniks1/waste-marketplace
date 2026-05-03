"use client";

import type { ListingStatus, WasteType } from "@prisma/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { ImageGallery } from "@/components/ImageGallery";
import { ReviewForm } from "@/components/ReviewForm";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspaceContext";
import { formatMoney } from "@/lib/money";
import { listingIsOpenForMarketplaceActions } from "@/lib/listing-marketplace";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type ListingDetail = {
  id: string;
  title: string | null;
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
  seller: { id: string; name: string; email: string; phone: string | null };
  acceptor: { id: string; name: string; email: string; phone: string | null } | null;
  assignedDriver: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
};

type OfferRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  buyer: { id: string; name: string; email: string };
};

type CommentRow = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string; role: string };
};

type ConvRow = {
  id: string;
  buyer: { id: string; name: string; email: string };
};

function formatDeadline(isoDate: string | null) {
  if (!isoDate) return null;
  const deadline = new Date(isoDate);
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return "Due now";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m remaining`;
}

function formatDateTime(isoDate: string | null) {
  if (!isoDate) return null;
  return new Date(isoDate).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeMetaFor(type: WasteType) {
  return WASTE_TYPE_OPTIONS.find((option) => option.value === type);
}

const liveStatuses = new Set<ListingStatus>(["open", "accepted", "in_progress", "reopened"]);

export default function CustomerListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { openChat } = useSellerWorkspace();
  const [row, setRow] = useState<ListingDetail | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  async function load() {
    const res = await fetch(`/api/listings/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError("We couldn’t load this listing right now. Refresh the page or check back in a moment.");
      return;
    }

    setRow(data);
    setTitle(data.title ?? "");
    setQuantity(data.quantity);
    setAddress(data.address);
    setDescription(data.description ?? "");
    setAskingPrice(String(data.askingPrice ?? ""));
    setDeliveryAvailable(Boolean(data.deliveryAvailable));
    setDeliveryFee(data.deliveryFee ? String(data.deliveryFee) : "");
    setActiveImageIndex(0);
    setError(null);

    const [offersResponse, commentsResponse, conversationsResponse] = await Promise.all([
      fetch(`/api/listings/${id}/offers`, { cache: "no-store" }),
      fetch(`/api/listings/${id}/comments`, { cache: "no-store" }),
      fetch(`/api/listings/${id}/conversations`, { cache: "no-store" }),
    ]);

    if (offersResponse.ok) setOffers(await offersResponse.json());
    if (commentsResponse.ok) setComments(await commentsResponse.json());
    if (conversationsResponse.ok) setConversations(await conversationsResponse.json());
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancel() {
    if (!confirm("Cancel this listing?")) return;
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/cancel`, { method: "POST" });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError("We couldn’t cancel this listing right now. Try again in a moment.");
    else await load();
  }

  async function saveEdit() {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        quantity,
        address,
        description,
        askingPrice: Number(askingPrice),
        deliveryAvailable,
        deliveryFee: deliveryFee ? Number(deliveryFee) : null,
      }),
    });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError("We couldn’t save your listing changes right now. Review the details and try again.");
      return;
    }

    setEditing(false);
    await load();
  }

  async function acceptOffer(offerId: string) {
    setBusy(true);
    const res = await fetch(`/api/offers/${offerId}/accept`, { method: "POST" });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError("We couldn’t accept this offer right now. Try again in a moment.");
    else await load();
  }

  async function declineOffer(offerId: string) {
    setBusy(true);
    const res = await fetch(`/api/offers/${offerId}/decline`, { method: "POST" });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError("We couldn’t decline this offer right now. Try again in a moment.");
    else await load();
  }

  async function markNoShow() {
    if (!confirm("Mark this accepted listing as a no-show?")) return;
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/no-show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "No pickup completed" }),
    });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError("We couldn’t update this pickup status right now. Try again in a moment.");
    else await load();
  }

  async function reopenListing() {
    if (!confirm("Reopen this listing so buyers can make offers again?")) return;
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/reopen`, { method: "POST" });
    await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setError("We couldn’t reopen this listing right now. Try again in a moment.");
    else await load();
  }

  async function postComment(event: React.FormEvent) {
    event.preventDefault();
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
    const commentsResponse = await fetch(`/api/listings/${id}/comments`, { cache: "no-store" });
    if (commentsResponse.ok) setComments(await commentsResponse.json());
  }

  const typeMeta = row ? typeMetaFor(row.wasteType) : null;
  const headline = row?.title?.trim() ? row.title.trim() : typeMeta?.label ?? "Listing";
  const activeImage = row?.images?.[activeImageIndex] ?? row?.images?.[0] ?? null;
  const pendingOffers = offers.filter((offer) => offer.status === "pending");
  const acceptedConversation =
    row?.acceptor && conversations.find((conversation) => conversation.buyer.id === row.acceptor?.id);
  const summaryLabel = row?.status && liveStatuses.has(row.status) ? "Active listing" : "Archived listing";

  return (
    <div className="space-y-6 pb-10 pt-1 lg:h-full lg:overflow-y-auto lg:pb-0 lg:pr-1">
      {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

      {!row ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading listing">
          <div className="h-72 animate-pulse rounded-[2rem] bg-slate-200" />
          <div className="h-56 animate-pulse rounded-[2rem] bg-slate-200" />
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-[2rem] border border-emerald-100/80 bg-white/92 p-5 shadow-sm ring-1 ring-emerald-50/80 backdrop-blur sm:p-7">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.95fr)]">
              <div>
                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
                  {summaryLabel}
                </span>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                    {editing ? (title.trim() ? title.trim() : headline) : headline}
                  </h1>
                  <StatusBadge status={row.status} />
                </div>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {row.description?.trim()
                    ? row.description
                    : "Keep the essentials crisp so buyers can decide quickly and drivers show up with the right context."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {typeMeta?.label ?? row.wasteType}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {row.quantity}
                  </span>
                  <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    {formatMoney(row.askingPrice, row.currency)}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {row.deliveryAvailable
                      ? `Delivery ${row.deliveryFee ? `· ${formatMoney(row.deliveryFee, row.currency)}` : "available"}`
                      : "Pickup only"}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Asking price</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{formatMoney(row.askingPrice, row.currency)}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Pending offers</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{pendingOffers.length}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Buyer threads</p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{conversations.length}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Pickup location</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{row.address}</p>
                </div>

                {listingIsOpenForMarketplaceActions(row.status) ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {editing ? (
                      <>
                        <Button onClick={saveEdit} disabled={busy}>
                          Save changes
                        </Button>
                        <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                          Discard edits
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" onClick={() => setEditing(true)} disabled={busy}>
                          Edit listing
                        </Button>
                        <Button variant="danger" onClick={cancel} disabled={busy}>
                          Cancel listing
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.8rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-3 shadow-inner">
                <div className="relative flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[1.45rem] bg-white/10 backdrop-blur">
                  {activeImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote listing image URLs
                    <img src={activeImage} alt="" className="max-h-[22rem] w-full object-contain p-4" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 text-center text-white/80">
                      <span className="text-5xl" aria-hidden>
                        {typeMeta?.icon ?? "♻️"}
                      </span>
                      <p className="max-w-xs text-sm leading-6">Add a clear listing photo to help buyers trust the material condition quickly.</p>
                    </div>
                  )}
                </div>

                {row.images.length > 1 ? (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {row.images.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setActiveImageIndex(index)}
                        className={`overflow-hidden rounded-2xl border p-1 transition ${
                          index === activeImageIndex
                            ? "border-teal-300 bg-white/20 ring-1 ring-teal-200"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- remote listing image URLs */}
                        <img src={image} alt="" className="h-16 w-full object-contain" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {editing ? (
            <section className="rounded-[1.85rem] border border-slate-200 bg-white/92 p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Edit listing</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Clean up the details buyers rely on</h2>
                </div>
                <p className="max-w-sm text-sm leading-6 text-slate-600">
                  Tight titles, honest quantity, and the right delivery setup cut down follow-up questions in chat.
                </p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <label className="block text-sm font-medium text-slate-800">
                  Listing title
                  <input
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Give buyers a clear, specific title"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Quantity
                  <input
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Asking price
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="^\\d+(?:[\\.,]\\d{1,2})?$"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 pl-9 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      value={askingPrice}
                      onChange={(event) => setAskingPrice(event.target.value)}
                    />
                  </div>
                </label>

                <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-sm font-medium text-slate-800">Delivery option</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        !deliveryAvailable
                          ? "bg-teal-600 text-white shadow-sm shadow-teal-200"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => setDeliveryAvailable(false)}
                    >
                      Pickup only
                    </button>
                    <button
                      type="button"
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        deliveryAvailable
                          ? "bg-teal-600 text-white shadow-sm shadow-teal-200"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      onClick={() => setDeliveryAvailable(true)}
                    >
                      Offer delivery
                    </button>
                  </div>

                  {deliveryAvailable ? (
                    <label className="mt-4 block text-sm font-medium text-slate-800">
                      Delivery fee
                      <div className="relative mt-1.5">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="^\\d+(?:[\\.,]\\d{1,2})?$"
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 pl-9 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                          value={deliveryFee}
                          onChange={(event) => setDeliveryFee(event.target.value)}
                        />
                      </div>
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <label className="block text-sm font-medium text-slate-800">
                  Address
                  <textarea
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    rows={3}
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Description
                  <textarea
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <div className="space-y-4">
              {pendingOffers.length > 0 ? (
                <section className="rounded-[1.8rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50/70 p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-800">Offers</p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-950">Pending buyer offers</h2>
                    </div>
                    <p className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-900">
                      {pendingOffers.length} awaiting review
                    </p>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {pendingOffers.map((offer) => (
                      <li key={offer.id} className="rounded-[1.45rem] border border-amber-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-base font-semibold text-slate-950">
                              <Link href={`/profile/${offer.buyer.id}`} className="text-teal-700 underline decoration-teal-200 underline-offset-4">
                                {offer.buyer.name}
                              </Link>
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{offer.buyer.email}</p>
                            <p className="mt-3 text-lg font-semibold text-amber-900">{formatMoney(offer.amount, offer.currency)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button className="!min-h-10" disabled={busy} onClick={() => acceptOffer(offer.id)}>
                              Accept
                            </Button>
                            <Button variant="secondary" className="!min-h-10" disabled={busy} onClick={() => declineOffer(offer.id)}>
                              Decline
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {row.status === "accepted" && row.acceptor ? (
                <section className="rounded-[1.8rem] border border-teal-100 bg-white/92 p-5 shadow-sm ring-1 ring-teal-50 sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">Active deal</p>
                  <div className="mt-4 flex items-start gap-4">
                    <UserAvatar name={row.acceptor.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-semibold text-slate-950">{row.acceptor.name}</p>
                      {row.acceptedOfferAmount ? (
                        <p className="mt-1 text-sm text-slate-600">
                          Accepted offer: {formatMoney(row.acceptedOfferAmount, row.acceptedOfferCurrency ?? row.currency)}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-slate-500">
                        {row.acceptor.phone ? row.acceptor.phone : row.acceptor.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {row.pickupDeadlineAt ? (
                      <div className="rounded-[1.4rem] border border-teal-100 bg-teal-50/70 p-4">
                        <p className="text-sm font-semibold text-teal-900">Pickup deadline</p>
                        <p className="mt-1 text-sm text-slate-700">{formatDateTime(row.pickupDeadlineAt)}</p>
                        <p className="mt-1 text-sm text-teal-800">{formatDeadline(row.pickupDeadlineAt)}</p>
                      </div>
                    ) : null}

                    {(row.deliveryRequired || row.deliveryAvailable) && !row.buyerDeliveryConfirmed ? (
                      <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-sm font-semibold text-slate-900">Waiting on buyer release</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Drivers can claim the pickup after the buyer confirms the delivery handoff in the app.
                        </p>
                      </div>
                    ) : null}

                    {row.deliveryAvailable && row.handoffPin ? (
                      <div className="rounded-[1.4rem] border border-amber-200 bg-amber-50/80 p-4">
                        <p className="text-sm font-semibold text-amber-950">Driver handoff PIN</p>
                        <p className="mt-1 text-sm leading-6 text-amber-900/80">
                          Share this code with the assigned driver when the materials are ready to leave.
                        </p>
                        <p className="mt-3 text-center font-mono text-2xl font-black tracking-[0.35em] text-amber-950">{row.handoffPin}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {row.acceptor.phone ? (
                      <>
                        <a href={`tel:${row.acceptor.phone}`}>
                          <Button variant="secondary" className="!min-h-10">
                            Call buyer
                          </Button>
                        </a>
                        <a
                          href={`https://wa.me/${row.acceptor.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="secondary" className="!min-h-10">
                            WhatsApp
                          </Button>
                        </a>
                      </>
                    ) : null}
                    {acceptedConversation ? (
                      <Button variant="secondary" className="!min-h-10" onClick={() => openChat(acceptedConversation.id)}>
                        Open chat
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      className="!min-h-10"
                      onClick={() => navigator.clipboard.writeText(row.acceptor?.email ?? "")}
                    >
                      Copy buyer email
                    </Button>
                    <Button variant="danger" className="!min-h-10" onClick={markNoShow} disabled={busy}>
                      Mark no-show
                    </Button>
                  </div>
                </section>
              ) : null}

              {row.status === "no_show" ? (
                <section className="rounded-[1.8rem] border border-amber-200 bg-amber-50/80 p-5 shadow-sm sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-800">No-show</p>
                  <h2 className="mt-2 text-xl font-semibold text-amber-950">This deal did not complete</h2>
                  <p className="mt-3 text-sm leading-6 text-amber-900/80">
                    Reopen the listing when you are ready to accept new offers and restart buyer conversations.
                  </p>
                  <Button className="mt-5" disabled={busy} onClick={reopenListing}>
                    Reopen listing
                  </Button>
                </section>
              ) : null}

              {row.images.length > 0 ? (
                <section className="rounded-[1.8rem] border border-slate-200 bg-white/92 p-5 shadow-sm sm:p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Photos</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Full listing gallery</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Photos are shown uncropped here so you can quickly check what buyers are seeing.
                  </p>
                  <ImageGallery images={row.images} className="mt-5" />
                </section>
              ) : null}

              <section className="rounded-[1.8rem] border border-slate-200 bg-white/92 p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Public comments</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-950">Listing discussion</h2>
                  </div>
                  <p className="rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">{comments.length} messages</p>
                </div>

                {comments.length > 0 ? (
                  <ul className="mt-5 space-y-3">
                    {comments.map((comment) => (
                      <li key={comment.id} className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">
                            {comment.user.name}
                            <span className="ml-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                              {comment.user.role}
                            </span>
                          </p>
                          <time className="text-xs text-slate-500">{formatDateTime(comment.createdAt)}</time>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{comment.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-5 rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50/70 px-5 py-8 text-center">
                    <p className="text-sm font-semibold text-slate-900">No public comments yet</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Questions buyers ask here can help the next buyer make a decision faster too.
                    </p>
                  </div>
                )}

                {row.status !== "cancelled" ? (
                  <form onSubmit={postComment} className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 !text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      style={{ color: "#0f172a" }}
                      placeholder="Add a public update or answer a buyer question…"
                      value={commentBody}
                      onChange={(event) => setCommentBody(event.target.value)}
                    />
                    <Button type="submit" disabled={busy} className="sm:w-auto">
                      Post comment
                    </Button>
                  </form>
                ) : null}
              </section>

              {row.status === "completed" && row.acceptor ? (
                <ReviewForm listingId={row.id} toUserId={row.acceptor.id} toUserName={row.acceptor.name} onSubmitted={() => void load()} />
              ) : null}

              {row.status === "completed" && row.assignedDriver ? (
                <ReviewForm
                  listingId={row.id}
                  toUserId={row.assignedDriver.id}
                  toUserName={row.assignedDriver.name}
                  onSubmitted={() => void load()}
                />
              ) : null}
            </div>

            <div className="space-y-4">
              <section className="rounded-[1.8rem] border border-slate-200 bg-white/92 p-5 shadow-sm sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Snapshot</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">What matters at a glance</h2>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Material</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{typeMeta?.label ?? row.wasteType}</p>
                    <p className="mt-1 text-sm text-slate-600">{row.quantity}</p>
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Delivery</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {row.deliveryAvailable ? "Delivery offered" : "Seller pickup only"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {row.deliveryAvailable
                        ? row.deliveryFee
                          ? formatMoney(row.deliveryFee, row.currency)
                          : "Fee not set"
                        : "Buyer handles pickup."}
                    </p>
                  </div>

                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
