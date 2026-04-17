"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";

type Props = {
  address: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
};

/**
 * Optional pin: browser geolocation, server geocode (when configured), or manual entry.
 */
export function MapCoordinatesPicker({ address, latitude, longitude, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latInput, setLatInput] = useState(latitude != null ? String(latitude) : "");
  const [lngInput, setLngInput] = useState(longitude != null ? String(longitude) : "");

  useEffect(() => {
    setLatInput(latitude != null ? String(latitude) : "");
    setLngInput(longitude != null ? String(longitude) : "");
  }, [latitude, longitude]);

  function applyInputs() {
    const lt = latInput.trim() === "" ? null : Number(latInput);
    const lg = lngInput.trim() === "" ? null : Number(lngInput);
    if (lt === null && lg === null) {
      onChange(null, null);
      return;
    }
    if (lt == null || lg == null || !Number.isFinite(lt) || !Number.isFinite(lg)) {
      setError("Enter both valid latitude and longitude, or leave both empty");
      return;
    }
    if (lt < -90 || lt > 90 || lg < -180 || lg > 180) {
      setError("Coordinates out of range");
      return;
    }
    setError(null);
    onChange(lt, lg);
  }

  async function geocodeServer() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/maps/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Geocode failed");
        return;
      }
      setLatInput(String(data.latitude));
      setLngInput(String(data.longitude));
      onChange(data.latitude, data.longitude);
    } finally {
      setBusy(false);
    }
  }

  function useMyLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation not supported in this browser");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lt = pos.coords.latitude;
        const lg = pos.coords.longitude;
        setLatInput(String(lt));
        setLngInput(String(lg));
        onChange(lt, lg);
        setBusy(false);
      },
      () => {
        setError("Could not read your location (permission denied or unavailable)");
        setBusy(false);
      },
      { enableHighAccuracy: false, timeout: 12_000 },
    );
  }

  return (
    <fieldset className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <legend className="text-sm font-medium text-slate-800 dark:text-slate-100">Map pin (optional)</legend>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Improves distance-based features. Geocode the address, use your device, or type coordinates.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={busy || !address.trim()} onClick={geocodeServer}>
          Geocode address
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={useMyLocation}>
          Use my location
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
        >
          Clear pin
        </Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={applyInputs}>
          Apply coordinates
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700 dark:text-slate-200">
          Latitude
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 dark:border-slate-600 dark:bg-slate-950"
            inputMode="decimal"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            aria-label="Latitude"
          />
        </label>
        <label className="text-sm text-slate-700 dark:text-slate-200">
          Longitude
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 dark:border-slate-600 dark:bg-slate-950"
            inputMode="decimal"
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            aria-label="Longitude"
          />
        </label>
      </div>
      {latitude != null && longitude != null ? (
        <a
          className="mt-3 inline-block text-sm text-teal-700 underline dark:text-teal-300"
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          Preview on map
        </a>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
