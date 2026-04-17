import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/Button";
import { LandingFooter } from "@/components/LandingFooter";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { getAppUser, getRoleFromSupabaseUser, getSupabaseUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export default async function HomePage() {
  const user = await getSupabaseUser();
  if (user) {
    const metaRole = getRoleFromSupabaseUser(user);
    if (metaRole) {
      if (metaRole === "buyer") redirect("/buyer");
      if (metaRole === "admin") redirect("/admin");
      if (metaRole === "driver") redirect("/driver");
      redirect("/customer");
    }

    const profile = await getAppUser();
    if (profile) {
      if (profile.role === UserRole.buyer) redirect("/buyer");
      if (profile.role === UserRole.admin) redirect("/admin");
      if (profile.role === UserRole.driver) redirect("/driver");
      redirect("/customer");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <MarketingNavbar />
      <main className="relative overflow-hidden">
        <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pt-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_42%)]" />
          <div className="relative grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-2xl">
              <p className="mb-4 inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-200">
                Sustainable reuse marketplace
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Sell waste faster, buy smarter, and move more with trusted local partners.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
                Waste Marketplace connects sellers, buyers, and drivers in one eco-friendly platform. List your materials, discover offers, and coordinate pickups with visibility and speed.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/signup">
                  <Button className="min-w-[10rem]">Get started</Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary" className="min-w-[10rem]">Login</Button>
                </Link>
              </div>
            </div>

            <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="mb-6 rounded-3xl bg-slate-900/95 p-6 text-slate-100 ring-1 ring-white/10">
                <h2 className="text-lg font-semibold">Quick snapshot</h2>
                <p className="mt-3 text-sm text-slate-300">
                  Create a listing, review offers, and message buyers or drivers from one clean dashboard.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { title: "Sell materials", description: "List scrap, cardboard, metal, and more in minutes." },
                  { title: "Find buyers", description: "Browse offers from verified buyers and accept the best deal." },
                  { title: "Arrange pickup", description: "Coordinate local drivers for fast collection and delivery." },
                  { title: "Track status", description: "See listing progress from open to completed in one place." },
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">How it works</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">One platform for every role</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Waste Marketplace helps sellers list waste, buyers bid on materials, and drivers manage pickups with reliable communication.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              { title: "List waste", description: "Upload details, set a price, and publish your listing in seconds." },
              { title: "Review offers", description: "Compare buyer offers and negotiate directly in the app." },
              { title: "Accept pickup", description: "Assign drivers and track collection until completion." },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg shadow-slate-950/20">
                <p className="text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="sellers" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">For sellers</p>
              <h3 className="mt-4 text-3xl font-semibold text-white">Get the best return on your materials.</h3>
              <p className="mt-4 max-w-xl text-slate-300">
                Publish your waste listings with clear pricing, optional delivery, and easy buyer communication.
              </p>
              <ul className="mt-8 space-y-4 text-slate-300">
                <li>• Instant listing creation</li>
                <li>• Offer tracking and acceptance</li>
                <li>• Driver coordination built in</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg shadow-slate-950/20">
              <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Seller spotlight</p>
              <p className="mt-4 text-xl font-semibold text-white">Manage your listings with confidence</p>
              <p className="mt-3 text-slate-400">Keep your inventory visible, accept offers fast, and avoid wasted trips with pickup scheduling.</p>
            </div>
          </div>
        </section>

        <section id="buyers" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="order-2 lg:order-1">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">For buyers</p>
              <h3 className="mt-4 text-3xl font-semibold text-white">Find materials locally, save time.</h3>
              <p className="mt-4 max-w-xl text-slate-300">
                Browse open listings, make offers, and message sellers directly for faster, more reliable procurement.
              </p>
              <ul className="mt-8 space-y-4 text-slate-300">
                <li>• Search by material type</li>
                <li>• Submit and withdraw offers</li>
                <li>• Private seller chat built in</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg shadow-slate-950/20">
              <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Buyer spotlight</p>
              <p className="mt-4 text-xl font-semibold text-white">Turn good deals into quick pickups</p>
              <p className="mt-3 text-slate-400">See listing status, accepted offers, and communicate with sellers without leaving the marketplace.</p>
            </div>
          </div>
        </section>

        <section id="drivers" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">For drivers</p>
              <h3 className="mt-4 text-3xl font-semibold text-white">Coordinate pickups with ease.</h3>
              <p className="mt-4 max-w-xl text-slate-300">
                Accept pickup requests, manage routes, and communicate with customers using the same marketplace workflow.
              </p>
              <ul className="mt-8 space-y-4 text-slate-300">
                <li>• See pickup details at a glance</li>
                <li>• Access contact info and directions</li>
                <li>• Complete jobs and track status</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg shadow-slate-950/20">
              <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Driver spotlight</p>
              <p className="mt-4 text-xl font-semibold text-white">Keep every pickup moving smoothly</p>
              <p className="mt-3 text-slate-400">Monitor accepted listings, driver assignments, and completed jobs in one place.</p>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Features</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Everything you need to trade waste safely</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { title: "Secure offers", description: "Review and accept bids before pickup." },
              { title: "Private chat", description: "Direct messaging between buyers, sellers, and drivers." },
              { title: "Pickup management", description: "Track accepted listings and delivery timelines." },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg shadow-slate-950/20">
                <p className="text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="testimonials" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Testimonials</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Trusted by users across the supply chain</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { quote: "A great way to move materials quickly.", name: "Seller Sahil" },
              { quote: "Offers are easy to compare and accept.", name: "Buyer Priya" },
              { quote: "Driver coordination is much better now.", name: "Driver Dev" },
            ].map((item) => (
              <div key={item.name} className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg shadow-slate-950/20">
                <p className="text-lg leading-8 text-slate-200">“{item.quote}”</p>
                <p className="mt-6 text-sm font-semibold text-white">{item.name}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
