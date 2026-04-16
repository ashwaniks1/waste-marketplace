import type { ListingStatus } from "@prisma/client";

const styles: Record<ListingStatus, string> = {
  open: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  accepted: "bg-amber-50 text-amber-900 ring-amber-200",
  completed: "bg-slate-100 text-slate-700 ring-slate-200",
  cancelled: "bg-rose-50 text-rose-800 ring-rose-200",
};

const labels: Record<ListingStatus, string> = {
  open: "Open",
  accepted: "Accepted",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
