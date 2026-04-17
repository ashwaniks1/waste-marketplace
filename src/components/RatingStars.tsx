export function RatingStars({ value }: { value: number }) {
  const rating = Math.max(0, Math.min(5, value));
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-1 text-sm font-semibold text-emerald-700" aria-label={`Rating ${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const star = index + 1;
        const colorClass = star <= fullStars || (halfStar && star === fullStars + 1) ? "text-emerald-600" : "text-slate-300";
        return (
          <span key={star} className={`text-xl ${colorClass}`} aria-hidden="true">
            ★
          </span>
        );
      })}
      <span className="text-sm text-slate-700">{rating.toFixed(1)}</span>
    </div>
  );
}
