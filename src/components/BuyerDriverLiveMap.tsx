"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LiveMap } from "@/components/LiveMap";
import { createBrowserSupabase } from "@/lib/supabase/client";

type LiveLocation = {
  listingId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  recordedAt: string;
  updatedAt: string;
};

type RealtimeLocationRow = {
  listing_id: string;
  driver_id: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  recorded_at: string;
  updated_at: string;
};

function normalizeRealtimeRow(row: RealtimeLocationRow): LiveLocation {
  return {
    listingId: row.listing_id,
    driverId: row.driver_id,
    lat: row.lat,
    lng: row.lng,
    heading: row.heading,
    speed: row.speed,
    recordedAt: row.recorded_at,
    updatedAt: row.updated_at,
  };
}

function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function BuyerDriverLiveMap({
  listingId,
  driverName,
}: {
  listingId: string;
  driverName?: string | null;
}) {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLocation = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/live-location`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Unable to load driver location");
        return;
      }
      setLocation(data.location ?? null);
      setError(null);
    } catch {
      setError("Unable to load driver location");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void loadLocation();
  }, [loadLocation]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`listing-live-location:${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listing_live_locations",
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setLocation(null);
            return;
          }
          setLocation(normalizeRealtimeRow(payload.new as RealtimeLocationRow));
        },
      )
      .subscribe();

    const poll = window.setInterval(() => void loadLocation({ silent: true }), 20_000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [listingId, loadLocation]);

  const updatedLabel = useMemo(() => (location ? formatUpdatedAt(location.updatedAt) : null), [location]);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-cosmos-md">
      <div className="border-b border-slate-200/50 bg-cosmos-page-alt/80 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Driver tracking</p>
        <h2 className="mt-1 text-base font-bold text-slate-900">
          {driverName ? `${driverName}'s live location` : "Live driver location"}
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Updates appear here while the driver shares location for this pickup.
        </p>
      </div>

      <div className="p-4">
        {loading ? <p className="text-sm text-slate-600">Loading driver location…</p> : null}
        {error ? (
          <p className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {!loading && !error && location ? (
          <>
            <LiveMap
              center={{ lat: location.lat, lng: location.lng }}
              heightClassName="h-64 lg:h-72"
              label={driverName ? `${driverName} is here` : "Driver is here"}
            />
            <p className="mt-3 text-xs text-slate-500">
              Last updated {updatedLabel}. Coordinates are approximate and depend on the driver&apos;s device.
            </p>
          </>
        ) : null}
        {!loading && !error && !location ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-cosmos-page-alt/60 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-900">Waiting for driver location</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              The map appears as soon as the assigned driver shares their live location.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
