"use client";

import { useState } from "react";

type Tab = "seller" | "buyer" | "driver";

export function LandingDashboardPreviews() {
  const [tab, setTab] = useState<Tab>("seller");

  const tabs: { id: Tab; label: string }[] = [
    { id: "seller", label: "Seller" },
    { id: "buyer", label: "Buyer" },
    { id: "driver", label: "Driver" },
  ];

  return (
    <section id="logistics" className="scroll-mt-24 border-t border-wm-border bg-wm-surface py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-wm-secondary">Control tower previews</h2>
          <p className="mt-4 text-base text-gray-600">
            Operational views for procurement, revenue recovery, and last-mile execution—mirroring the authenticated
            workspaces.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-gray-50/80 p-3 sm:p-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  tab === t.id
                    ? "bg-wm-primary text-white shadow-sm"
                    : "text-gray-600 hover:bg-white hover:shadow-sm"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {tab === "seller" ? (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { k: "Open RFQs", v: "14" },
                    { k: "Accepted lots", v: "6" },
                    { k: "In transit", v: "3" },
                  ].map((s) => (
                    <div
                      key={s.k}
                      className="rounded-2xl border border-gray-200 bg-wm-surface p-5 shadow-sm transition hover:shadow-md"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{s.k}</p>
                      <p className="mt-2 text-2xl font-bold text-wm-secondary">{s.v}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Lot</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Buyer</th>
                        <th className="px-4 py-3 text-right">Asking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-wm-secondary">
                      {[
                        ["PP regrind · Detroit", "Open", "—", "$42,500"],
                        ["Al scrap · Columbus", "Accepted", "Acme Recycling", "$61,200"],
                        ["OCC bales · Chicago", "In progress", "North Mill Co.", "$88,000"],
                      ].map((row) => (
                        <tr key={row[0]} className="bg-white">
                          <td className="px-4 py-3 font-medium">{row[0]}</td>
                          <td className="px-4 py-3 text-gray-600">{row[1]}</td>
                          <td className="px-4 py-3 text-gray-600">{row[2]}</td>
                          <td className="px-4 py-3 text-right font-semibold">{row[3]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {tab === "buyer" ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    readOnly
                    placeholder="Search open inventory (sign in to run queries)"
                    className="w-full flex-1 rounded-xl border border-gray-200 bg-wm-surface px-4 py-3 text-sm text-gray-600"
                  />
                  <button
                    type="button"
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-wm-secondary"
                  >
                    Filters
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { t: "Mill-spec OCC", s: "Open · FOB yard", p: "$82 / ton" },
                    { t: "Cu #1 wire", s: "Open · weigh & pay", p: "Spot + basis" },
                    { t: "Pallets — A/B grade", s: "Open · trailer load", p: "Per unit" },
                  ].map((c) => (
                    <div
                      key={c.t}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <p className="text-base font-semibold text-wm-secondary">{c.t}</p>
                      <p className="mt-1 text-sm text-gray-600">{c.s}</p>
                      <p className="mt-3 text-sm font-semibold text-wm-primary">{c.p}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "driver" ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="relative min-h-[220px] overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-100 to-emerald-50 shadow-sm">
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <div>
                      <p className="text-sm font-semibold text-wm-secondary">Live map surface</p>
                      <p className="mt-2 text-xs text-gray-600">
                        After sign-in, route-ready tiles and Google Maps pickup previews render here.
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] font-medium uppercase text-gray-500">
                    <span>Geofence</span>
                    <span>ETA</span>
                    <span>POD</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-wm-secondary">Pickup board</p>
                  {[
                    { lane: "DET → ORD", mat: "Plastic · 12 MT", pay: "Linehaul + fuel" },
                    { lane: "CMH local", mat: "Metal · 8 MT", pay: "Spot payout" },
                  ].map((j) => (
                    <div
                      key={j.lane}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                    >
                      <p className="text-xs font-semibold uppercase text-gray-500">{j.lane}</p>
                      <p className="mt-1 text-base font-semibold text-wm-secondary">{j.mat}</p>
                      <p className="mt-1 text-sm text-gray-600">{j.pay}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
