import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingFooter } from "@/components/LandingFooter";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { getAppUser, getRoleFromSupabaseUser, getSupabaseUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";

function IconCircle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-wm-primary/10 text-wm-primary">
      {children}
    </div>
  );
}

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
    <div className="min-h-screen bg-wm-surface text-wm-secondary">
      <MarketingNavbar />
      <main>
        {/* Section 1 — Hero */}
        <section className="border-b border-wm-border bg-wm-card py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <div>
                <p className="mb-4 inline-flex rounded-full border border-wm-border bg-wm-surface px-3 py-1 text-sm font-semibold text-wm-primary">
                  Sustainable reuse marketplace
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-wm-secondary sm:text-5xl">
                  Turn waste into value—list, bid, and pick up with confidence.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600">
                  Connect sellers, buyers, and drivers on one platform. Clear pricing, offers you control, and pickup
                  coordination built in.
                </p>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-xl bg-[#22C55E] px-6 py-3 text-center text-base font-semibold text-white shadow-sm transition hover:brightness-95"
                  >
                    Get started free
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-center text-base font-semibold text-wm-secondary transition hover:bg-gray-50"
                  >
                    Log in
                  </Link>
                </div>
              </div>

              {/* Right illustration — abstract eco / marketplace visual */}
              <div
                className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-wm-border bg-gradient-to-br from-wm-primary/5 via-wm-surface to-emerald-50 shadow-sm lg:aspect-square"
                aria-hidden
              >
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="relative h-full w-full max-w-sm">
                    <div className="absolute left-[8%] top-[12%] h-24 w-24 rounded-2xl border border-wm-border bg-white shadow-sm" />
                    <div className="absolute right-[10%] top-[20%] h-16 w-16 rounded-full border-2 border-dashed border-wm-primary/40 bg-white/80" />
                    <div className="absolute bottom-[18%] left-[15%] right-[15%] h-28 rounded-2xl border border-wm-border bg-white p-4 shadow-md">
                      <div className="h-2 w-1/3 rounded bg-wm-primary/30" />
                      <div className="mt-3 space-y-2">
                        <div className="h-2 w-full rounded bg-gray-200" />
                        <div className="h-2 w-4/5 rounded bg-gray-100" />
                        <div className="h-2 w-2/3 rounded bg-gray-100" />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <div className="h-8 flex-1 rounded-lg bg-wm-primary/15" />
                        <div className="h-8 w-20 rounded-lg bg-[#22C55E]/20" />
                      </div>
                    </div>
                    <div className="absolute right-[12%] bottom-[28%] flex h-14 w-14 items-center justify-center rounded-xl bg-wm-primary text-xl text-white shadow-lg">
                      ♻
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — How it works */}
        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-wm-secondary">How it works</h2>
              <p className="mt-4 text-base text-gray-600">
                Three simple steps from listing to pickup—whether you sell, buy, or deliver.
              </p>
            </div>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Post waste",
                  description: "Add photos, quantity, location, and your asking price. Publish in minutes.",
                },
                {
                  title: "Get bids",
                  description: "Buyers submit offers. Compare, chat, and accept the deal that works for you.",
                },
                {
                  title: "Schedule pickup",
                  description: "Coordinate pickup or delivery with drivers and track status through completion.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <IconCircle>
                    <span className="text-lg font-bold" aria-hidden>
                      {item.title === "Post waste" ? "①" : item.title === "Get bids" ? "②" : "③"}
                    </span>
                  </IconCircle>
                  <h3 className="text-lg font-semibold text-wm-secondary">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3 — Categories */}
        <section id="categories" className="border-y border-wm-border bg-wm-card py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-wm-secondary">Browse by category</h2>
              <p className="mt-4 text-base text-gray-600">
                List or source materials across common waste streams—all in one marketplace.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { name: "Plastic", icon: "🧴" },
                { name: "Metal", icon: "🔩" },
                { name: "Paper", icon: "📄" },
                { name: "E-waste", icon: "💻" },
                { name: "Construction", icon: "🧱" },
                { name: "Organic", icon: "🌿" },
              ].map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-wm-surface text-2xl" aria-hidden>
                    {cat.icon}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-wm-secondary">{cat.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">Listings & offers available on the platform.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — Why choose us */}
        <section id="why-us" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-wm-secondary">Why choose Waste Marketplace</h2>
              <p className="mt-4 text-base text-gray-600">
                Built for clarity, trust, and speed from first listing to final pickup.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Transparent pricing",
                  description: "Set asking prices and review buyer offers before you commit.",
                  glyph: "◆",
                },
                {
                  title: "Secure messaging",
                  description: "Private conversations between buyers, sellers, and drivers.",
                  glyph: "◇",
                },
                {
                  title: "Role-based workspaces",
                  description: "Tailored flows for sellers, buyers, drivers, and admins.",
                  glyph: "◎",
                },
                {
                  title: "Pickup visibility",
                  description: "Track listing status from open through accepted to completed.",
                  glyph: "◉",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <IconCircle>
                    <span className="text-xl font-light" aria-hidden>
                      {item.glyph}
                    </span>
                  </IconCircle>
                  <h3 className="text-lg font-semibold text-wm-secondary">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5 — Dashboard preview */}
        <section id="preview" className="border-t border-wm-border bg-wm-surface py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold text-wm-secondary">Your dashboard, simplified</h2>
              <p className="mt-4 text-base text-gray-600">
                Manage listings, offers, and pickups from one place once you sign in.
              </p>
            </div>
            <div className="mt-12 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="aspect-[16/10] w-full bg-gradient-to-b from-gray-50 to-gray-100">
                <div className="flex h-full flex-col p-6 sm:p-10">
                  <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
                    <div className="h-10 w-10 rounded-lg bg-wm-primary/20" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 rounded bg-gray-300" />
                      <div className="h-2 w-24 rounded bg-gray-200" />
                    </div>
                  </div>
                  <div className="mt-6 grid flex-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="h-3 w-16 rounded bg-gray-200" />
                      <div className="mt-4 h-20 rounded-lg bg-wm-surface" />
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:col-span-2">
                      <div className="h-3 w-24 rounded bg-gray-200" />
                      <div className="mt-4 space-y-3">
                        <div className="h-3 w-full rounded bg-gray-100" />
                        <div className="h-3 w-[92%] rounded bg-gray-100" />
                        <div className="h-3 w-4/5 rounded bg-gray-100" />
                      </div>
                    </div>
                  </div>
                  <p className="mt-6 text-center text-sm text-gray-500">Dashboard preview — illustration placeholder</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6 — Final CTA */}
        <section className="bg-wm-secondary py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Ready to move your next load?</h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-gray-300">
              Join sellers, buyers, and drivers already using Waste Marketplace to trade materials responsibly.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-w-[200px] items-center justify-center rounded-xl bg-[#22C55E] px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:brightness-95"
              >
                Create free account
              </Link>
              <Link
                href="/login"
                className="inline-flex min-w-[200px] items-center justify-center rounded-xl border border-white/30 bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
