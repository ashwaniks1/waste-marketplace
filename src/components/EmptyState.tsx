import Link from "next/link";

const variantConfig = {
  generic: { emoji: "♻️", gradient: "from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/30" },
  listings: { emoji: "📦", gradient: "from-emerald-50 to-lime-100 dark:from-emerald-950/50 dark:to-lime-950/30" },
  chat: { emoji: "💬", gradient: "from-sky-100 to-emerald-50 dark:from-sky-950/40 dark:to-emerald-950/30" },
  pickups: { emoji: "🚚", gradient: "from-amber-50 to-emerald-100 dark:from-amber-950/30 dark:to-emerald-950/40" },
} as const;

export type EmptyStateVariant = keyof typeof variantConfig;

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  variant = "generic",
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  variant?: EmptyStateVariant;
}) {
  const v = variantConfig[variant];
  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-8 text-center shadow-glass backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/60">
      <div
        className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br text-4xl shadow-inner ${v.gradient}`}
        aria-hidden
      >
        {v.emoji}
      </div>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
