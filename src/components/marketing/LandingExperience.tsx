"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { HeroEcoBackground } from "@/components/HeroEcoBackground";
import { MarketRegionToggle } from "@/components/MarketRegionToggle";
import {
  detectMarketRegion,
  formatListingPrice,
  localityFilterLabel,
  subscribeMarketRegion,
  type MarketRegion,
  weightUnitShort,
} from "@/lib/marketRegion";

/** Direct img URLs (avoid Next image optimizer / hotlink issues with Unsplash). */
const HERO_SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1532996122724-eaa8d004a6ee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=85",
    alt: "Sorted recyclables and materials ready for resale",
  },
  {
    src: "https://images.unsplash.com/photo-1581092160562-40aa8e3c57d6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=85",
    alt: "Industrial scrap and metal collection",
  },
  {
    src: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=85",
    alt: "Flatbed truck moving recovered materials",
  },
  {
    src: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=85",
    alt: "Hands sorting paper and cardboard for recycling",
  },
] as const;

const CATEGORY_MEDIA = [
  {
    title: "Plastic",
    src: "https://images.unsplash.com/photo-1621451537084-482c4a6512b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=85",
    alt: "Baled plastic bottles",
  },
  {
    title: "Paper & cardboard",
    src: "https://images.unsplash.com/photo-1503592146429-6c31f927b0c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=85",
    alt: "Stacks of cardboard",
  },
  {
    title: "Metal",
    src: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=85",
    alt: "Scrap metal pile",
  },
  {
    title: "E-waste",
    src: "https://images.unsplash.com/photo-1558346548-4438937b178f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=85",
    alt: "Old devices for recovery",
  },
] as const;

const HOW_STEPS = [
  {
    title: "List or browse",
    description: "Sellers post quantity and pickup window; buyers filter by material and distance.",
    src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85",
    alt: "Team reviewing listings on a laptop",
  },
  {
    title: "Offers & chat",
    description: "Compare offers, message in-app, and lock a price before anyone travels.",
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85",
    alt: "Two people coordinating a deal",
  },
  {
    title: "Pickup & proof",
    description: "Drivers claim routes, complete pickup, and everyone sees status through delivery.",
    src: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85",
    alt: "Loading dock and logistics",
  },
] as const;

type DashTab = "seller" | "buyer" | "driver";

export function LandingExperience() {
  const [region, setRegion] = useState<MarketRegion>("US");
  const [slide, setSlide] = useState(0);
  const [dashTab, setDashTab] = useState<DashTab>("seller");

  useEffect(() => {
    setRegion(detectMarketRegion());
    return subscribeMarketRegion(setRegion);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, []);

  const unit = weightUnitShort(region);
  const filterLabel = localityFilterLabel(region);
  const samplePrice = formatListingPrice(region === "IN" ? 4200 : 275, region);
  const sampleLocality = region === "IN" ? "Indiranagar" : "78702";

  return (
    <>
      <HeroEcoBackground>
        <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pt-24">
          <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
            <div className="max-w-2xl">
              <div className="mb-4">
                <MarketRegionToggle variant="dark" label="Your region" />
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Sell scrap and surplus, buy materials, book transport — locally.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
                List in {unit}, price in {region === "IN" ? "rupees" : "dollars"}, and filter by {filterLabel.toLowerCase()}. Buyers, sellers, and drivers share one simple flow — offers, chat, and pickup status stay in sync.
              </p>
              <p className="mt-3 text-sm text-slate-400">
                Example listing: mixed cardboard · 250 {unit} · <span className="font-semibold text-emerald-200">{samplePrice}</span> pickup this week.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/signup">
                  <Button className="min-w-[10rem]">Create account</Button>
                </Link>
                <Link href="/login">
                  <Button variant="secondary" className="min-w-[10rem]">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative min-h-[220px] w-full overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-slate-950/50 sm:min-h-[280px] lg:min-h-[340px]">
              {HERO_SLIDES.map((item, i) => (
                <div
                  key={item.src}
                  className={`absolute inset-0 transition-opacity duration-700 ${i === slide ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Unsplash: native img avoids optimizer/hotlink failures */}
                  <img
                    src={item.src}
                    alt={item.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                    width={1920}
                    height={1080}
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "low"}
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                </div>
              ))}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 text-xs text-slate-200">
                <span className="rounded-full bg-black/40 px-3 py-1 backdrop-blur">
                  {slide + 1} / {HERO_SLIDES.length}
                </span>
                <div className="flex gap-1.5">
                  {HERO_SLIDES.map((_, i) => (
                    <button
                      key={String(i)}
                      type="button"
                      aria-label={`Show slide ${i + 1}`}
                      onClick={() => setSlide(i)}
                      className={`h-2 w-2 rounded-full transition ${i === slide ? "bg-emerald-400" : "bg-white/30 hover:bg-white/50"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </HeroEcoBackground>

      <section id="dashboard-preview" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Inside the app</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">What you actually see after sign-in</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Each role has screens built for the job: listings, offers, and pickup status stay aligned in one place.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-4 shadow-xl sm:p-6">
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
            {(
              [
                ["seller", "Seller"],
                ["buyer", "Buyer"],
                ["driver", "Driver"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDashTab(id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  dashTab === id ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/40" : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            {dashTab === "seller" ? (
              <>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Active listings</p>
                  <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-medium text-white">Mixed cardboard</span>
                      <span className="text-emerald-300">{samplePrice}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      250 {unit} · {filterLabel}: {sampleLocality}
                    </p>
                    <p className="mt-2 text-xs font-medium text-amber-200">3 open offers</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3 opacity-80">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-medium text-white">Aluminum scrap</span>
                      <span className="text-emerald-300">{formatListingPrice(region === "IN" ? 8900 : 540, region)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">Pickup scheduled · Driver assigned</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Offer thread</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-lg bg-slate-800/80 p-3 text-slate-200">
                      Buyer: &ldquo;Can you do pickup Saturday morning?&rdquo;
                    </div>
                    <div className="rounded-lg bg-emerald-900/40 p-3 text-emerald-50">
                      You: &ldquo;Yes — gate code 4721. Cardboard is palletized.&rdquo;
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/50 p-3 text-emerald-100">
                      Accepted offer · {samplePrice} · Awaiting driver check-in
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {dashTab === "buyer" ? (
              <>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Browse</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-white">Plastic</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-white">Metal</span>
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">{filterLabel}</span>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3">
                    <p className="text-sm font-medium text-white">Office paper — baled</p>
                    <p className="mt-1 text-xs text-slate-400">12 km · {formatListingPrice(region === "IN" ? 3100 : 190, region)}</p>
                    <button type="button" className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white">
                      Make offer
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your offers</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-200">
                    <li className="flex justify-between rounded-lg bg-slate-800/80 px-3 py-2">
                      <span>Copper trimmings</span>
                      <span className="text-amber-200">Pending</span>
                    </li>
                    <li className="flex justify-between rounded-lg bg-slate-800/80 px-3 py-2">
                      <span>HDPE crates</span>
                      <span className="text-emerald-300">Accepted</span>
                    </li>
                  </ul>
                </div>
              </>
            ) : null}

            {dashTab === "driver" ? (
              <>
                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Today&apos;s jobs</p>
                  <div className="rounded-xl border border-white/10 bg-slate-900/90 p-3">
                    <p className="text-sm font-medium text-white">Pickup #1042</p>
                    <p className="mt-1 text-xs text-slate-400">Cardboard · 8 km · window 2–5 pm</p>
                    <p className="mt-2 text-xs text-teal-200">Navigate · Contact seller · Mark picked up</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Route</p>
                  <div className="mt-4 h-40 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 ring-1 ring-white/10">
                    <div className="flex h-full flex-col justify-between p-3 text-xs text-slate-300">
                      <span>Start: warehouse district</span>
                      <span className="self-center rounded-full bg-emerald-600/90 px-3 py-1 font-semibold text-white">Live GPS (in app)</span>
                      <span>Drop: buyer yard · proof photo</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section id="marketplace" className="scroll-mt-28 mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Categories</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Common materials on the marketplace</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {CATEGORY_MEDIA.map((c) => (
            <Link
              key={c.title}
              href="/signup"
              className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg transition hover:border-emerald-500/40 hover:shadow-emerald-900/20"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.src}
                  alt={c.alt}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="px-3 py-3 text-sm font-semibold text-white">{c.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Three steps from listing to loaded truck</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Built for recurring pickups: clear units ({unit}), localized pricing, and filters by {filterLabel.toLowerCase()}.
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          {HOW_STEPS.map((item) => (
            <div key={item.title} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-lg">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-6">
                <p className="text-lg font-semibold text-white">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="sell-waste" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">Sell waste</p>
            <h3 className="mt-4 text-3xl font-semibold text-white">List materials with honest weights and pickup windows.</h3>
            <p className="mt-4 max-w-xl text-slate-300">
              Buyers see distance and {filterLabel.toLowerCase()} at a glance. You stay in control: accept the offer that fits your schedule, then assign a driver when you are ready.
            </p>
            <ul className="mt-8 space-y-4 text-slate-300">
              <li>• Photos + quantity in {unit}</li>
              <li>• Offer comparison before you accept</li>
              <li>• In-app chat until pickup is done</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg">
            <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Seller tools</p>
            <p className="mt-4 text-xl font-semibold text-white">Listings, offers, and pickup in one thread</p>
            <p className="mt-3 text-slate-400">Edit price, pause a listing, or reopen it after a cancelled pickup — without losing message history.</p>
          </div>
        </div>
      </section>

      <section id="buy-materials" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">Buy materials</p>
            <h3 className="mt-4 text-3xl font-semibold text-white">Source feedstock near you, faster.</h3>
            <p className="mt-4 max-w-xl text-slate-300">
              Filter by waste type and {filterLabel.toLowerCase()}, then submit offers sellers can accept or counter. When a deal is live, you see pickup timing and driver status the same way the seller does.
            </p>
            <ul className="mt-8 space-y-4 text-slate-300">
              <li>• Filter by material type and {filterLabel.toLowerCase()}</li>
              <li>• Withdraw an offer before acceptance</li>
              <li>• Chat stays on the listing record</li>
            </ul>
          </div>
          <div className="order-1 rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg lg:order-2">
            <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Buyer tools</p>
            <p className="mt-4 text-xl font-semibold text-white">Offers that match your plant or yard</p>
            <p className="mt-3 text-slate-400">Use {region === "IN" ? "GST on file (optional)" : "EIN on file (optional)"} for invoicing-ready profiles as you scale.</p>
          </div>
        </div>
      </section>

      <section id="transport" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-400">Transport</p>
            <h3 className="mt-4 text-3xl font-semibold text-white">Drivers see jobs with full context.</h3>
            <p className="mt-4 max-w-xl text-slate-300">
              Claim a pickup, message the seller if the dock is hard to find, and mark the job complete so buyers and sellers stay aligned.
            </p>
            <ul className="mt-8 space-y-4 text-slate-300">
              <li>• Material + weight on the job card</li>
              <li>• Seller and buyer contacts when allowed</li>
              <li>• Status updates visible to all parties</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg">
            <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Driver tools</p>
            <p className="mt-4 text-xl font-semibold text-white">One queue for accepted pickups</p>
            <p className="mt-3 text-slate-400">Fewer phone tags — addresses, time windows, and special instructions live on the job.</p>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Features</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Built for real marketplace operations</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { title: "Offers & acceptance", description: "Sellers compare bids; buyers see when an offer is live or declined." },
            { title: "Listing chat", description: "Thread per listing so context does not get lost across deals." },
            { title: "Pickup jobs", description: "Drivers move materials from seller to buyer with shared status." },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg">
              <p className="text-lg font-semibold text-white">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonials" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">Community</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">What early users say</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { quote: "We moved two truckloads of cardboard in a week without endless WhatsApp groups.", name: "Seller · Pune" },
            { quote: "Offers are visible and comparable — we closed faster than our old spreadsheet process.", name: "Buyer · Ohio" },
            { quote: "Job cards have the gate codes and dock hours. Fewer wasted trips.", name: "Driver · Texas" },
          ].map((item) => (
            <div key={item.name} className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-slate-100 shadow-lg">
              <p className="text-lg leading-8 text-slate-200">&ldquo;{item.quote}&rdquo;</p>
              <p className="mt-6 text-sm font-semibold text-white">{item.name}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/95 p-3 backdrop-blur-lg md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-2">
          <p className="text-xs text-slate-300">Join the marketplace</p>
          <Link href="/signup" className="shrink-0 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40">
            Create account
          </Link>
        </div>
      </div>
    </>
  );
}
