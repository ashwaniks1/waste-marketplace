"use client";

import type { ListingStatus, WasteType } from "@prisma/client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { ImageGallery } from "@/components/ImageGallery";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/money";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

type ListingDetail = {
  id: string;
  wasteType: WasteType;
  quantity: string;
  description: string | null;
  images: string[];
  address: string;
  status: ListingStatus;
  askingPrice: number;
  currency: string;
  deliveryAvailable: boolean;
  deliveryFee: number | null;
  acceptedOfferAmount: number | null;
  acceptedOfferCurrency: string | null;
  pickupDeadlineAt: string | null;
  acceptedAt: string | null;
  seller: { id: string; name: string; email: string; phone: string | null };
  acceptor: { id: string; name: string; email: string; phone: string | null } | null;
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

export default function CustomerListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<ListingDetail | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");

  async function load() {
    const res = await fetch(`/api/listings/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setRow(data);
    setQuantity(data.quantity);
    setAddress(data.address);
    setDescription(data.description ?? "");
    setAskingPrice(String(data.askingPrice ?? ""));
    setDeliveryAvailable(Boolean(data.deliveryAvailable));
    setDeliveryFee(data.deliveryFee ? String(data.deliveryFee) : "");
    setError(null);

    const [o, c, v] = await Promise.all([
      fetch(`/api/listings/${id}/offers`),
      fetch(`/api/listings/${id}/comments`),
      fetch(`/api/listings/${id}/conversations`),
    ]);
    if (o.ok) setOffers(await o.json());
    if (c.ok) setComments(await c.json());
    if (v.ok) setConversations(await v.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cancel() {
    if (!confirm("Cancel this listing?")) return;
    setBusy(true);
    const res = await fetch(`/api/listings/${id}/cancel`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Could not cancel");
    else await load();
  }

  async function saveEdit() {
    setBusy(true);
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity,
        address,
        description,
        askingPrice: Number(askingPrice),
        deliveryAvailable,
        deliveryFee: deliveryFee ? Number(deliveryFee) : null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Could not save");
    else {
      setEditing(false);
      await load();
    }
  }

  async function acceptOffer(offerId: string) {
    setBusy(true);
    const res = await fetch(`/api/offers/${offerId}/accept`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Could not accept");
    else await load();
  }

  async function declineOffer(offerId: string) {
    setBusy(true);
    const res = await fetch(`/api/offers/${offerId}/decline`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Could not decline");
    else await load();
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

  const icon = WASTE_TYPE_OPTIONS.find((o) => o.value === row?.wasteType)?.icon;
  const acceptorConv =
    row?.acceptor && conversations.find((c) => c.buyer.id === row.acceptor?.id);

  return (
    <>
      <AppHeader title="Listing" backHref="/customer/listings" role="customer" />
      <div className="space-y-6 pb-8 pt-4">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {!row ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{icon}</span>
                <div>
                  <p className="text-xl font-semibold capitalize text-slate-900">
                    {row.wasteType.replace(/_/g, " ").toLowerCase()}
                  </p>
                  {editing ? (
                    <input
                      className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  ) : (
                    <p className="text-slate-600">{row.quantity}</p>
                  )}
                  {editing ? (
                    <label className="mt-2 block text-sm">
                      Asking price
                      <div className="relative mt-1">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-slate-500">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="^\d+(?:[\.,]\d{1,2})?$"
                          className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1 pl-8"
                          value={askingPrice}
                          onChange={(e) => setAskingPrice(e.target.value)}
                        />
                      </div>
                    </label>
                  ) : (
                    <p className="mt-1 text-lg font-semibold text-teal-800">
                      {formatMoney(row.askingPrice, row.currency)}
                    </p>
                  )}
                  {row.deliveryAvailable ? (
                    <p className="mt-2 text-sm text-slate-600">
                      Delivery available for {formatMoney(row.deliveryFee ?? 0, row.currency)}
                    </p>
                  ) : null}
                </div>
              </div>
              <StatusBadge status={row.status} />
            </div>

            {editing ? (
              <label className="block text-sm">
                Address
                <textarea
                  className="mt-1 w-full max-w-2xl rounded-xl border border-slate-200 px-3 py-2"
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </label>
            ) : (
              <p className="text-sm text-slate-700">{row.address}</p>
            )}

            {editing ? (
              <label className="block text-sm">
                Description
                <textarea
                  className="mt-1 w-full max-w-2xl rounded-xl border border-slate-200 px-3 py-2"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
            ) : row.description ? (
              <p className="text-sm text-slate-600">{row.description}</p>
            ) : null}

            {editing ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <legend className="text-sm font-medium text-slate-900">Delivery</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        !deliveryAvailable
                          ? "border-teal-600 bg-teal-600 text-white shadow"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => setDeliveryAvailable(false)}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        deliveryAvailable
                          ? "border-teal-600 bg-teal-600 text-white shadow"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => setDeliveryAvailable(true)}
                    >
                      Offer delivery
                    </button>
                  </div>
                  {deliveryAvailable ? (
                    <label className="mt-3 block text-sm text-slate-900">
                      Fee
                      <div className="relative mt-1">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-slate-500">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="^\d+(?:[\.,]\d{1,2})?$"
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 pl-8"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(e.target.value)}
                        />
                      </div>
                    </label>
                  ) : null}
                </fieldset>
              </div>
            ) : null}

            {row.images?.length ? <ImageGallery images={row.images} /> : null}

            {row.status === "open" && offers.filter((x) => x.status === "pending").length > 0 ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <h2 className="font-semibold text-amber-950">Offers</h2>
                <ul className="mt-2 space-y-2">
                  {offers
                    .filter((x) => x.status === "pending")
                    .map((o) => (
                      <li
                        key={o.id}
                        className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{o.buyer.name}</p>
                          <p className="text-sm text-teal-800">{formatMoney(o.amount, o.currency)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button className="!min-h-10" disabled={busy} onClick={() => acceptOffer(o.id)}>
                            Accept
                          </Button>
                          <Button
                            variant="secondary"
                            className="!min-h-10"
                            disabled={busy}
                            onClick={() => declineOffer(o.id)}
                          >
                            Decline
                          </Button>
                        </div>
                      </li>
                    ))}
                </ul>
              </section>
            ) : null}

            {row.status === "open" && conversations.length > 0 ? (
              <section>
                <h2 className="font-semibold text-slate-900">Private chats</h2>
                <ul className="mt-2 space-y-2">
                  {conversations.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/conversations/${c.id}`}
                        className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-teal-800 hover:border-teal-300"
                      >
                        Chat with {c.buyer.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {row.status === "accepted" && row.acceptor ? (
              <div className="rounded-2xl border border-teal-100 bg-teal-50/80 p-4">
                <p className="text-sm font-semibold text-teal-900">Buyer contact</p>
                {row.acceptedOfferAmount ? (
                  <p className="mt-1 text-sm text-teal-800">
                    Accepted offer: {formatMoney(row.acceptedOfferAmount, row.acceptedOfferCurrency ?? row.currency)}
                  </p>
                ) : null}
                {row.pickupDeadlineAt ? (
                  <div className="mt-3 rounded-2xl border border-teal-200 bg-white p-3">
                    <p className="text-sm font-semibold text-teal-900">Pickup deadline</p>
                    <p className="mt-1 text-sm text-slate-700">{new Date(row.pickupDeadlineAt).toLocaleString()}</p>
                    <p className="text-sm text-teal-800">{formatDeadline(row.pickupDeadlineAt)}</p>
                  </div>
                ) : null}
                <p className="mt-3 text-sm text-teal-800">{row.acceptor.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.acceptor.phone ? (
                    <>
                      <a href={`tel:${row.acceptor.phone}`}>
                        <Button variant="secondary" className="!min-h-10">
                          Call
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
                  ) : (
                    <p className="text-xs text-teal-800">Email: {row.acceptor.email}</p>
                  )}
                  {acceptorConv ? (
                    <Link href={`/conversations/${acceptorConv.id}`}>
                      <Button variant="secondary" className="!min-h-10">
                        Open chat
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
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
              {row.status !== "cancelled" ? (
                <form onSubmit={postComment} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Add a public comment…"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                  />
                  <Button type="submit" disabled={busy} className="sm:w-auto">
                    Post
                  </Button>
                </form>
              ) : null}
            </section>

            {row.status === "open" ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {editing ? (
                  <>
                    <Button onClick={saveEdit} disabled={busy}>
                      Save changes
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                      Cancel edit
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

            <Link href="/customer/listings" className="block text-center text-sm text-teal-700">
              Back to my listings
            </Link>
          </>
        )}
      </div>
    </>
  );
}
