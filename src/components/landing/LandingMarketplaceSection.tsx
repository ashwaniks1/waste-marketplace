"use client";

import { useMemo, useState } from "react";

const CATEGORIES = ["All", "Plastic", "Metal", "Paper", "E-waste", "Construction", "Organic"] as const;

type Cat = (typeof CATEGORIES)[number];

const MOCK_LISTINGS: {
  id: string;
  title: string;
  category: Exclude<Cat, "All">;
  qty: string;
  location: string;
  status: string;
}[] = [
  { id: "1", title: "Post-industrial PP regrind", category: "Plastic", qty: "12 MT", location: "Detroit, MI", status: "Open" },
  { id: "2", title: "Aluminum extrusion scrap", category: "Metal", qty: "8 MT", location: "Columbus, OH", status: "Open" },
  { id: "3", title: "OCC baled (mill spec)", category: "Paper", qty: "40 tons", location: "Chicago, IL", status: "Open" },
  { id: "4", title: "Server rack decommission lot", category: "E-waste", qty: "Mixed lot", location: "Ashburn, VA", status: "Open" },
  { id: "5", title: "Clean concrete / brick", category: "Construction", qty: "200 CY", location: "Phoenix, AZ", status: "Open" },
  { id: "6", title: "Food manufacturing organics", category: "Organic", qty: "Per ton", location: "Modesto, CA", status: "Open" },
];

export function LandingMarketplaceSection() {
  const [query, setQuery] = useState("");
  const [wasteFilter, setWasteFilter] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [tab, setTab] = useState<Cat>("All");

  const filtered = useMemo(() => {
    return MOCK_LISTINGS.filter((row) => {
      if (tab !== "All" && row.category !== tab) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (!`${row.title} ${row.location}`.toLowerCase().includes(q)) return false;
      }
      if (wasteFilter !== "all" && row.category.toLowerCase() !== wasteFilter) return false;
      if (region !== "all" && !row.location.includes(region)) return false;
      return true;
    });
  }, [query, tab, wasteFilter, region]);

  return (
    <section id="marketplace" className="border-y border-wm-border bg-wm-card py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-wm-secondary sm:text-2xl">Marketplace</h2>
          <p className="mt-4 text-base text-gray-600">
            Source feedstock, surplus inventory, and recovered materials. Filter by commodity, lane, and site—then
            engage sellers through governed offers and messaging.
          </p>
        </div>

        <div className="mt-10 space-y-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="block flex-1 min-w-0 text-sm font-medium text-wm-secondary">
              Search listings
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SKU, material, MSA region, or site…"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-wm-surface px-4 py-3 text-base text-wm-secondary outline-none ring-wm-primary/30 focus:ring-2"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <label className="text-sm font-medium text-wm-secondary">
                Commodity
                <select
                  value={wasteFilter}
                  onChange={(e) => setWasteFilter(e.target.value)}
                  className="mt-2 w-full min-w-[10rem] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm sm:w-44"
                >
                  <option value="all">All commodities</option>
                  <option value="plastic">Plastic</option>
                  <option value="metal">Metal</option>
                  <option value="paper">Paper</option>
                  <option value="e-waste">E-waste</option>
                  <option value="construction">Construction</option>
                  <option value="organic">Organic</option>
                </select>
              </label>
              <label className="text-sm font-medium text-wm-secondary">
                Lane / region
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="mt-2 w-full min-w-[10rem] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm sm:w-44"
                >
                  <option value="all">All regions</option>
                  <option value="MI">Michigan</option>
                  <option value="OH">Ohio</option>
                  <option value="IL">Illinois</option>
                  <option value="VA">Virginia</option>
                  <option value="AZ">Arizona</option>
                  <option value="CA">California</option>
                </select>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {CATEGORIES.map((c) => {
                const active = tab === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTab(c)}
                    className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-wm-primary bg-wm-primary/10 text-wm-primary"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Representative lots for evaluation. Live inventory, compliance docs, and carrier coordination unlock after
            you authenticate.
          </p>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl border border-gray-200 bg-wm-surface p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold uppercase text-wm-primary ring-1 ring-wm-border">
                    {row.category}
                  </span>
                  <span className="text-xs font-medium text-gray-500">{row.status}</span>
                </div>
                <p className="mt-3 text-base font-semibold text-wm-secondary">{row.title}</p>
                <p className="mt-1 text-sm text-gray-600">{row.qty}</p>
                <p className="mt-2 text-sm text-gray-600">{row.location}</p>
              </li>
            ))}
          </ul>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No sample rows match your filters.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
