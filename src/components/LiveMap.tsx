"use client";

import type { GeoPoint } from "@/components/LocationProvider";

export function LiveMap({
  center,
  heightClassName = "h-56",
  label = "You are here",
}: {
  center: GeoPoint;
  heightClassName?: string;
  label?: string;
}) {
  const query = `${center.lat},${center.lng}`;
  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=13&output=embed&hl=en`;
  const openHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-cosmos-sm ${heightClassName}`}>
      <iframe
        title={label}
        className="h-full w-full border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={embedSrc}
      />
      <a
        href={openHref}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-3 right-3 rounded-full border border-slate-200/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-cosmos-sm transition hover:border-teal-200 hover:text-teal-800"
      >
        Open in Google Maps
      </a>
    </div>
  );
}

