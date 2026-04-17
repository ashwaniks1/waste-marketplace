"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./Button";
import { RatingStars } from "./RatingStars";
import type { UserRole } from "@prisma/client";

type ReviewRow = {
  id: string;
  score: number;
  body: string | null;
  createdAt: string;
  fromUser: { id: string; name: string; avatarUrl?: string | null; role: string };
};

export function ProfileVisitClient({
  profile,
  reviewSummary,
  reviews,
  openListings,
  viewerId,
  viewerRole,
}: {
  profile: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    role: UserRole;
    avatarUrl?: string | null;
  };
  reviewSummary: { averageRating: number | null; reviewCount: number };
  reviews: ReviewRow[];
  openListings: Array<{
    id: string;
    wasteType: string;
    quantity: string;
    address: string;
    askingPrice: number;
    currency: string;
    deliveryAvailable: boolean;
  }>;
  viewerId: string | null;
  viewerRole: UserRole | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canMessageSeller =
    viewerId && viewerRole === "buyer" && profile.role === "customer" && openListings.length > 0;

  async function startChat() {
    if (!canMessageSeller) return;
    setError(null);
    setLoading(true);
    try {
      const listingId = openListings[0].id;
      const response = await fetch(`/api/listings/${listingId}/conversations`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to start conversation");
        return;
      }
      router.push(`/conversations/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start conversation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-semibold text-slate-900">{profile.name}</p>
            <p className="text-sm text-slate-600">{profile.role === "customer" ? "Seller" : profile.role === "buyer" ? "Buyer" : "Driver"}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-3xl text-emerald-700">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt={`${profile.name} avatar`} className="h-16 w-16 rounded-3xl object-cover" /> : profile.name[0].toUpperCase()}
            </div>
            <div className="space-y-1 text-right text-sm text-slate-600">
              <p>{profile.address ?? "Location not set"}</p>
              <p>{profile.phone ?? "Phone not available"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rating</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {reviewSummary.averageRating != null ? reviewSummary.averageRating.toFixed(1) : "—"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {reviewSummary.reviewCount > 0 ? `${reviewSummary.reviewCount} review${reviewSummary.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Available listings</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{openListings.length}</p>
            {openListings.length > 0 ? <p className="mt-1 text-sm text-slate-600">Open listing available to start a chat.</p> : <p className="mt-1 text-sm text-slate-600">No open listings right now.</p>}
          </div>
        </div>

        {canMessageSeller ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={startChat} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Starting chat…" : "Message seller"}
            </Button>
            <Link href={`/buyer/listings/${openListings[0].id}`} className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 sm:w-auto">
              View listing
            </Link>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-slate-900">Reviews</p>
            <p className="text-sm text-slate-600">Read feedback from recent buyers and sellers.</p>
          </div>
          <RatingStars value={reviewSummary.averageRating ?? 0} />
        </div>

        <div className="mt-6 space-y-4">
          {reviews.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No reviews yet.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-lg text-emerald-700">
                    {review.fromUser.avatarUrl ? (
                      <img src={review.fromUser.avatarUrl} alt={`${review.fromUser.name} avatar`} className="h-11 w-11 rounded-2xl object-cover" />
                    ) : (
                      review.fromUser.name[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{review.fromUser.name}</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{review.fromUser.role}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <RatingStars value={review.score} />
                  <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
                </div>
                {review.body ? <p className="mt-3 text-sm text-slate-700">{review.body}</p> : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
