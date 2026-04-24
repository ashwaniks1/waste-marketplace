import Link from "next/link";
import { Button } from "@/components/Button";

export default function CustomerHomePage() {
  return (
    <div className="space-y-6 pt-1 lg:h-full lg:overflow-y-auto lg:pr-1">
      <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-md sm:p-8">
        <div>
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Seller workspace
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Run your listings and buyer conversations with less context switching.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Your <strong className="font-semibold text-slate-800">related list</strong> on the left keeps every listing one
            click away. The <strong className="font-semibold text-slate-800">center</strong> is the record you are
            working in—offers, comments, status, and pickup. Open the <strong className="font-semibold text-slate-800">floating inbox</strong> in the
            corner when you want to chat; the same thread stays open while you move between listings, and messages
            update quietly in the background.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            Tip: from <span className="text-slate-700">Settings</span> in the header menu you can update your profile, avatar, and notification preferences
            any time.
          </p>

          <div className="mt-6">
            <Link href="/customer/listings/new" className="inline-block min-w-[200px] sm:min-w-[220px]">
              <Button className="h-12 w-full rounded-2xl text-base shadow-cosmos-sm sm:h-14">Create listing</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">How it works</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">Stay oriented while the deal moves.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Select a listing in the left rail to load it in the center. You can change pricing, review offers, log pickup
            notes, and complete the sale without the list disappearing—so you always know what else is live or in motion.
          </p>
          <Link
            href="/customer/listings"
            className="mt-5 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900"
          >
            Open listing workspace
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200/50 bg-white p-6 shadow-cosmos-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Messages</p>
          <p className="mt-3 text-xl font-semibold text-slate-900">Chat stays with you, not the single screen.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Start or continue buyer threads from the floating panel or the full messages page. When you open a thread, it
            remains active as you switch listings—so you are not forced to re-open chat each time. List and message data
            refresh on a light schedule while you work.
          </p>
          <Link
            href="/customer/messages"
            className="mt-5 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-900"
          >
            Open full inbox
          </Link>
        </div>
      </section>
    </div>
  );
}
