"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { RatingStars } from "./RatingStars";

type StatusReview = { id: string; score: number; body: string | null; listingId: string };

export function ReviewForm({
  listingId,
  toUserId,
  toUserName,
  onSubmitted,
}: {
  listingId: string;
  toUserId: string;
  toUserName: string;
  onSubmitted?: () => void;
}) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [existing, setExisting] = useState<StatusReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatusLoading(true);
      try {
        const res = await fetch(`/api/reviews/status?toUserId=${encodeURIComponent(toUserId)}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.hasReview && data.review) {
          setExisting(data.review as StatusReview);
        } else if (!cancelled) {
          setExisting(null);
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toUserId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!listingId || !toUserId || score < 1) return;
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, toUserId, score, body: comment.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError("We couldn’t post your review right now. Try again in a moment.");
        return;
      }
      const created = data as { id: string; score: number; body: string | null; listingId: string };
      setSuccess("Review posted successfully.");
      setComment("");
      setScore(0);
      setExisting(created);
      onSubmitted?.();
    } catch {
      setError("We couldn’t post your review right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (statusLoading) {
    return (
      <section className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-sm">
        <p className="text-sm text-slate-600">Checking review status…</p>
      </section>
    );
  }

  if (existing) {
    return (
      <section className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-sm">
        <p className="text-sm font-semibold text-slate-900">You already reviewed {toUserName}</p>
        <p className="mt-1 text-sm text-slate-600">
          You can leave one review per person, like Google. Update or remove it from their profile.
        </p>
        <div className="mt-3">
          <RatingStars value={existing.score} />
        </div>
        {existing.body ? <p className="mt-2 text-sm text-slate-700">{existing.body}</p> : null}
        <Link
          href={`/profile/${toUserId}`}
          className="mt-4 inline-flex text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
        >
          Open profile to edit or delete
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200/50 bg-white p-5 shadow-cosmos-sm">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-slate-900">Review {toUserName}</p>
          <p className="text-sm text-slate-600">Tap stars to rate, then add an optional comment.</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-3">
          <RatingStars value={score} onChange={setScore} />
          <p className="mt-2 text-xs text-slate-500">{score < 1 ? "Select 1–5 stars to continue." : `${score} star${score > 1 ? "s" : ""} selected`}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Comment <span className="font-normal text-slate-500">(optional)</span>
          <textarea
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            placeholder="Share what worked well or what could improve"
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

        <Button type="submit" disabled={loading || score < 1} className="w-full">
          {loading ? "Saving review…" : "Submit review"}
        </Button>
      </form>
    </section>
  );
}
