"use client";

import { useState } from "react";
import { Button } from "./Button";
import { RatingStars } from "./RatingStars";

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
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!listingId || !toUserId) return;
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
        setError(typeof data.error === "string" ? data.error : "Unable to submit review");
        return;
      }
      setSuccess("Review posted successfully.");
      setComment("");
      setScore(5);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit review");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-slate-900">Review {toUserName}</p>
          <p className="text-sm text-slate-600">Leave a rating and optional comment after completion.</p>
        </div>
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <RatingStars value={score} />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Rating
          <select
            value={score}
            onChange={(event) => setScore(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} star{value > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Comment
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving review…" : "Submit review"}
        </Button>
      </form>
    </section>
  );
}
