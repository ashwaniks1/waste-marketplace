import Link from "next/link";
import { ListingStatus } from "@prisma/client";
import { AppHeader } from "@/components/AppHeader";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [users, listings, openCount, completedWeek] = await Promise.all([
    prisma.user.count(),
    prisma.wasteListing.count(),
    prisma.wasteListing.count({ where: { status: ListingStatus.open } }),
    prisma.wasteListing.count({
      where: {
        status: ListingStatus.completed,
        updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return (
    <>
      <AppHeader title="Admin dashboard" role="admin" />
      <div className="space-y-6 px-4 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Users</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{users}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Listings</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{listings}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open</p>
            <p className="mt-1 text-3xl font-bold text-teal-700">{openCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Done (7d)</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{completedWeek}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/admin/listings"
            className="flex h-12 items-center justify-center rounded-xl bg-teal-600 text-sm font-semibold text-white"
          >
            View all listings
          </Link>
          <Link
            href="/admin/users"
            className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800"
          >
            View users
          </Link>
        </div>
      </div>
    </>
  );
}
