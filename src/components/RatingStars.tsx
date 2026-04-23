"use client";

import { useState } from "react";

type RatingStarsProps = {
  value: number;
  /** When provided, stars are clickable (integer 1–5). Hover previews fill like Google Maps. */
  onChange?: (score: number) => void;
  /** Show numeric label (e.g. average); default false when interactive, true when read-only. */
  showValueLabel?: boolean;
  className?: string;
};

export function RatingStars({ value, onChange, showValueLabel, className = "" }: RatingStarsProps) {
  const interactive = Boolean(onChange);
  const [hover, setHover] = useState<number | null>(null);

  if (interactive) {
    const preview = hover ?? (value >= 1 ? Math.min(5, Math.round(value)) : 0);
    const showLabel = showValueLabel ?? false;

    return (
      <div
        className={`flex items-center gap-1 ${className}`}
        role="group"
        aria-label="Star rating"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: 5 }).map((_, index) => {
          const star = index + 1;
          const filled = preview > 0 && star <= preview;
          return (
            <button
              key={star}
              type="button"
              className={`rounded p-0.5 text-2xl leading-none transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                filled ? "text-amber-500" : "text-slate-300"
              }`}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              aria-pressed={hover == null && value === star}
              onMouseEnter={() => setHover(star)}
              onFocus={() => setHover(star)}
              onBlur={() => setHover(null)}
              onClick={() => {
                onChange?.(star);
                setHover(null);
              }}
            >
              ★
            </button>
          );
        })}
        {showLabel ? (
          <span className="ml-1 text-sm font-semibold text-slate-700">{preview > 0 ? preview : "—"}</span>
        ) : null}
      </div>
    );
  }

  const rating = Math.max(0, Math.min(5, value));
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;
  const showLabel = showValueLabel ?? true;

  return (
    <div
      className={`flex items-center gap-1 text-sm font-semibold text-emerald-700 ${className}`}
      aria-label={`Rating ${rating.toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1;
        const colorClass =
          star <= fullStars || (halfStar && star === fullStars + 1) ? "text-emerald-600" : "text-slate-300";
        return (
          <span key={star} className={`text-xl ${colorClass}`} aria-hidden="true">
            ★
          </span>
        );
      })}
      {showLabel ? <span className="text-sm text-slate-700">{rating.toFixed(1)}</span> : null}
    </div>
  );
}
