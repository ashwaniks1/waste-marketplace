import Link from "next/link";
import { Button } from "@/components/Button";

export default function CustomerHomePage() {
  return (
    <div className="space-y-6 pt-4">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-100/80 bg-white/90 p-6 shadow-sm ring-1 ring-emerald-50/80 backdrop-blur sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
              Seller workspace
            </span>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Turn everyday waste into cleaner space and quicker cash flow.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Create a listing, review offers from nearby buyers, and keep pickup details organized in one calm workspace.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/customer/listings/new" className="block sm:min-w-[220px]">
                <Button className="h-14 w-full rounded-2xl text-base shadow-sm shadow-teal-200">
                  Sell waste
                </Button>
              </Link>
              <Link
                href="/customer/listings"
                className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white sm:min-w-[220px]"
              >
                Manage active sales
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-sm shadow-emerald-200">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">Fast listing</p>
              <p className="mt-3 text-lg font-semibold">Post a new offer in under a minute.</p>
              <p className="mt-2 text-sm text-emerald-50/90">
                Add quantity, price, and pickup location with a cleaner seller flow.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Seller control</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">Stay on top of offers and pickup status.</p>
              <p className="mt-2 text-sm text-slate-600">
                Open your listing board to review activity, coordinate buyers, and keep deals moving.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Next step</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">Ready to post another listing?</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Strong photos and clear pickup details help buyers respond faster.
          </p>
          <Link href="/customer/listings/new" className="mt-5 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900">
            Start a fresh listing
          </Link>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">Need to review open deals?</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Jump straight into your sales board to manage offers, edit details, and track pickup progress.
          </p>
          <Link href="/customer/listings" className="mt-5 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900">
            Open seller board
          </Link>
        </div>
      </section>
    </div>
  );
}
