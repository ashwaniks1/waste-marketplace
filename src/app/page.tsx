import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingDashboardPreviews } from "@/components/landing/LandingDashboardPreviews";
import { LandingMarketplaceSection } from "@/components/landing/LandingMarketplaceSection";
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
        {/* Hero */}
        <section className="border-b border-wm-border bg-wm-card py-12 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <div>
                <p className="mb-4 inline-flex rounded-full border border-wm-border bg-wm-surface px-3 py-1 text-sm font-semibold text-wm-primary">
                  B2B materials & logistics
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-wm-secondary sm:text-5xl">
                  Recover value from industrial surplus, scrap, and outbound freight.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600">
                  Digitize RFQs, counterparty diligence, and dock-level execution on one rail. Procurement, revenue
                  recovery, and carrier orchestration share a single system of record.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center rounded-xl bg-[#22C55E] px-6 py-3 text-center text-base font-semibold text-white shadow-sm transition hover:brightness-95"
                  >
                    Request tenant access
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-center text-base font-semibold text-wm-secondary transition hover:bg-gray-50"
                  >
                    Sign in
                  </Link>
                </div>
              </div>

              <div
                className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-wm-border bg-gradient-to-br from-wm-primary/5 via-wm-surface to-slate-100 shadow-sm lg:aspect-square"
                aria-hidden
              >
                <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
                  <div className="relative h-full w-full max-w-sm">
                    <div className="absolute left-[6%] top-[10%] h-20 w-20 rounded-2xl border border-wm-border bg-white shadow-sm sm:h-24 sm:w-24" />
                    <div className="absolute right-[8%] top-[16%] h-14 w-14 rounded-full border-2 border-dashed border-wm-primary/40 bg-white/90 sm:h-16 sm:w-16" />
                    <div className="absolute bottom-[14%] left-[12%] right-[12%] rounded-2xl border border-wm-border bg-white p-4 shadow-md sm:p-5">
                      <div className="h-2 w-1/3 rounded bg-wm-primary/30" />
                      <div className="mt-3 space-y-2">
                        <div className="h-2 w-full rounded bg-gray-200" />
                        <div className="h-2 w-4/5 rounded bg-gray-100" />
                        <div className="h-2 w-2/3 rounded bg-gray-100" />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <div className="h-8 flex-1 rounded-lg bg-wm-primary/15" />
                        <div className="h-8 w-16 rounded-lg bg-[#22C55E]/20 sm:w-20" />
                      </div>
                    </div>
                    <div className="absolute bottom-[26%] right-[10%] flex h-12 w-12 items-center justify-center rounded-xl bg-wm-primary text-lg text-white shadow-lg sm:h-14 sm:w-14 sm:text-xl">
                      ♻
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sell / Buy anchor strips */}
        <section className="border-b border-wm-border bg-wm-surface py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div
                id="sell"
                className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8"
              >
                <h2 className="text-2xl font-semibold text-wm-secondary">Sell waste & surplus</h2>
                <p className="mt-3 text-base text-gray-600">
                  Monetize non-core inventory, production scrap, and yard accumulations. Publish governed listings with
                  commercial terms, documentation hooks, and carrier-ready handoffs.
                </p>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-wm-secondary transition hover:bg-gray-50"
                >
                  Onboard as seller
                </Link>
              </div>
              <div
                id="buy"
                className="scroll-mt-28 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8"
              >
                <h2 className="text-2xl font-semibold text-wm-secondary">Buy materials</h2>
                <p className="mt-3 text-base text-gray-600">
                  Secure feedstock and secondary commodities with auditable offers, counterparty profiles, and lane-level
                  visibility from RFQ through proof of delivery.
                </p>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-wm-secondary transition hover:bg-gray-50"
                >
                  Onboard as buyer
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 py-12 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-semibold text-wm-secondary">Operating cadence</h2>
              <p className="mt-4 text-base text-gray-600">
                Standard workflow from posting to settlement—aligned with how procurement and logistics teams already
                run gate reviews.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Post waste",
                  description:
                    "Issue structured lots with weights, grades, MSDS where required, and dock constraints. Route for internal approval before publication.",
                },
                {
                  title: "Receive bids",
                  description:
                    "Compare commercial offers in one thread. Counter, accept, and generate an immutable record for finance and compliance.",
                },
                {
                  title: "Schedule pickup",
                  description:
                    "Assign vetted carriers, share load tenders, and close the loop with POD, weights, and exception codes.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8"
                >
                  <IconCircle>
                    <span className="text-lg font-bold" aria-hidden>
                      {item.title === "Post waste" ? "①" : item.title === "Receive bids" ? "②" : "③"}
                    </span>
                  </IconCircle>
                  <h3 className="text-lg font-semibold text-wm-secondary">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LandingMarketplaceSection />

        {/* Why choose us */}
        <section id="why-us" className="scroll-mt-24 py-12 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-semibold text-wm-secondary">Why operations teams standardize here</h2>
              <p className="mt-4 text-base text-gray-600">
                Reduce leakage between commercial, yard, and transportation—without standing up another bespoke
                portal.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: "Commercial discipline",
                  description: "Structured pricing, counterparty history, and offer governance before release to floor.",
                  glyph: "◆",
                },
                {
                  title: "Secure collaboration",
                  description: "Private channels for procurement, sellers, and carriers with an auditable message trail.",
                  glyph: "◇",
                },
                {
                  title: "Role-based workspaces",
                  description: "Seller, buyer, driver, and admin surfaces tuned to each control point in the chain.",
                  glyph: "◎",
                },
                {
                  title: "Execution visibility",
                  description: "Status from open lot through accepted bid, dispatch, and settlement-ready completion.",
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

        <LandingDashboardPreviews />

        {/* Final CTA */}
        <section className="bg-wm-secondary py-12 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Deploy your next lane on Waste Marketplace</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-300">
              Stand up procurement, recovery, and carrier workflows under enterprise controls. SSO, SCIM, and custom
              MSA packages are scheduled with solutions engineering.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex min-w-[200px] items-center justify-center rounded-xl bg-[#22C55E] px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:brightness-95"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex min-w-[200px] items-center justify-center rounded-xl border border-white/30 bg-transparent px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Login
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
