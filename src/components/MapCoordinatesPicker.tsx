"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/Button";

type Props = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  /** Filled when reverse geocoding succeeds (e.g. “Use my location”). */
  onAddressFromCoordinates?: (formattedAddress: string) => void;
};

function hasPin(lat: number | null, lng: number | null) {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

/**
 * Pickup map pin: Google Map preview, geocode from address, device location, or manual coordinates.
 */
export function MapCoordinatesPicker({ address, latitude, longitude, onChange, onAddressFromCoordinates }: Props) {
  const formId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latInput, setLatInput] = useState(latitude != null ? String(latitude) : "");
  const [lngInput, setLngInput] = useState(longitude != null ? String(longitude) : "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setLatInput(latitude != null ? String(latitude) : "");
    setLngInput(longitude != null ? String(longitude) : "");
  }, [latitude, longitude]);

  const pin = hasPin(latitude, longitude);
  const embedSrc =
    pin && latitude != null && longitude != null
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}&z=16&output=embed&hl=en`
      : null;

  function applyInputs() {
    const lt = latInput.trim() === "" ? null : Number(latInput);
    const lg = lngInput.trim() === "" ? null : Number(lngInput);
    if (lt === null && lg === null) {
      onChange(null, null);
      return;
    }
    if (lt == null || lg == null || !Number.isFinite(lt) || !Number.isFinite(lg)) {
      setError("Enter both latitude and longitude, or leave both empty.");
      return;
    }
    if (lt < -90 || lt > 90 || lg < -180 || lg > 180) {
      setError("Coordinates are out of range.");
      return;
    }
    setError(null);
    onChange(lt, lg);
  }

  async function geocodeFromAddress() {
    setError(null);
    if (!address.trim()) {
      setError("Add a pickup address first, or use your location.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/maps/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("We couldn’t place this address on the map. Check the address or set the pin manually.");
        return;
      }
      onChange(data.latitude, data.longitude);
    } finally {
      setBusy(false);
    }
  }

  function useMyLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("This browser does not support location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lt = pos.coords.latitude;
        const lg = pos.coords.longitude;
        setLatInput(String(lt));
        setLngInput(String(lg));
        onChange(lt, lg);
        try {
          const res = await fetch("/api/maps/reverse-geocode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: lt, longitude: lg }),
          });
          const data = await res.json();
          if (res.ok && typeof data?.formattedAddress === "string" && onAddressFromCoordinates) {
            onAddressFromCoordinates(data.formattedAddress);
          }
        } catch {
          // optional; pin still set
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location permission is off. You can type an address and place the pin on the map instead."
            : "We couldn’t read your location. Try again or set the address manually.",
        );
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-cosmos-md">
      <div className="border-b border-slate-200/50 bg-cosmos-page-alt/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Pickup location on map</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          Place a pin to improve distance and discovery. This is optional.
        </p>
      </div>

      <div className="relative aspect-[16/10] w-full min-h-[200px] bg-slate-100">
        {embedSrc ? (
          <iframe
            title="Pickup area preview"
            className="h-full w-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={embedSrc}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center text-sm text-slate-500">
            <span className="text-2xl" aria-hidden>
              📍
            </span>
            <p>No pin yet</p>
            <p className="text-xs">Use your address, your location, or enter coordinates below.</p>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="flex-1 min-w-[8rem] sm:flex-initial" disabled={busy} onClick={geocodeFromAddress}>
            {busy ? "…" : "Place from address"}
          </Button>
          <Button type="button" variant="secondary" className="flex-1 min-w-[8rem] sm:flex-initial" disabled={busy} onClick={useMyLocation}>
            {busy ? "…" : "Use my location"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setLatInput("");
              setLngInput("");
              setError(null);
              onChange(null, null);
            }}
            className="shrink-0"
          >
            Remove pin
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="text-xs font-semibold text-teal-800 hover:underline"
          aria-expanded={showAdvanced}
          aria-controls={`${formId}-advanced`}
        >
          {showAdvanced ? "Hide" : "Set"} coordinates manually
        </button>

        {showAdvanced ? (
          <div id={`${formId}-advanced`} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Latitude
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                inputMode="decimal"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="text-sm text-slate-700">
              Longitude
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                inputMode="decimal"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                autoComplete="off"
              />
            </label>
            <div className="sm:col-span-2">
              <Button type="button" variant="secondary" className="min-h-10 px-3 py-1.5 text-sm" disabled={busy} onClick={applyInputs}>
                Apply coordinates
              </Button>
            </div>
          </div>
        ) : null}

        {pin && latitude != null && longitude != null ? (
          <a
            className="inline-flex text-sm font-medium text-teal-700 hover:underline"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </a>
        ) : null}
        {error ? (
          <p className="text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
