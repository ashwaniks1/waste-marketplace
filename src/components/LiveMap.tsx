"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { useMemo } from "react";
import type { GeoPoint } from "@/components/LocationProvider";

// Ship Leaflet's default marker art from `public/leaflet` (BSD-2-Clause, same as package).
const markerIcon = new L.Icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function LiveMap({
  center,
  heightClassName = "h-56",
  label = "You are here",
}: {
  center: GeoPoint;
  heightClassName?: string;
  label?: string;
}) {
  const position = useMemo(() => [center.lat, center.lng] as [number, number], [center.lat, center.lng]);

  return (
    <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${heightClassName}`}>
      <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={markerIcon}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

