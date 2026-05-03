"use client";

import { WasteType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { MapCoordinatesPicker } from "@/components/MapCoordinatesPicker";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

export default function NewListingPage() {
  const router = useRouter();
  const [wasteType, setWasteType] = useState<WasteType>("PLASTIC");
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [deliveryRequired, setDeliveryRequired] = useState(false);
  const [pickupZip, setPickupZip] = useState("");
  const [driverCommissionPercent, setDriverCommissionPercent] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (deliveryAvailable) setDeliveryRequired(true);
    else setDeliveryRequired(false);
  }, [deliveryAvailable]);

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("We couldn’t upload one of your photos. Try a JPG, PNG, or WEBP under 5 MB.");
      urls.push(data.url);
    }
    return urls;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Listing name is required.");
      return;
    }
    if (files.length < 1) {
      setError("Add at least one photo of your materials.");
      return;
    }
    setLoading(true);
    try {
      const images = await uploadImages();
      const pct = driverCommissionPercent.trim();
      const body = {
        title: title.trim(),
        wasteType,
        quantity: quantity.trim(),
        description: description.trim() || undefined,
        address: address.trim(),
        askingPrice: askingPrice.trim(),
        deliveryAvailable,
        deliveryRequired: deliveryAvailable && deliveryRequired,
        deliveryFee: deliveryFee.trim() || undefined,
        pickupZip: pickupZip.trim() || undefined,
        driverCommissionPercent: pct === "" ? undefined : Number(pct),
        images,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      };
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError("We couldn’t publish this listing right now. Review the required details and try again.");
        return;
      }
      router.push(`/customer/listings/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn’t publish this listing right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-10 pt-1 lg:h-full lg:overflow-y-auto lg:pb-0 lg:pr-1">
      <section className="overflow-hidden rounded-[2rem] border border-emerald-100/80 bg-white/90 p-6 shadow-sm ring-1 ring-emerald-50/80 backdrop-blur sm:p-8">
        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
          New listing
        </span>
        <h1 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Create a listing buyers can trust in a few seconds.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
          Clear photos, honest quantity, and a clean pickup help offers come in faster. Use the map pin to place your
          pickup. Your related list and inbox return after you publish.
        </p>
      </section>

      <form onSubmit={onSubmit} className="space-y-5">
        <section className="space-y-5 rounded-[1.85rem] border border-slate-200 bg-white/92 p-5 shadow-sm sm:p-6">
        <fieldset>
          <legend className="text-sm font-medium text-slate-800">Waste type</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {WASTE_TYPE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer flex-col items-center rounded-xl border border-slate-200 bg-white p-2 text-center text-xs has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"
              >
                <input
                  type="radio"
                  name="wasteType"
                  className="sr-only"
                  checked={wasteType === o.value}
                  onChange={() => setWasteType(o.value)}
                />
                <span className="text-xl" aria-hidden>
                  {o.icon}
                </span>
                <span className="mt-1 font-medium text-slate-800">{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm font-medium text-slate-800">
          Listing name <span className="font-normal text-slate-500">(required)</span>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="e.g. Clean cardboard from retail backroom"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <label className="block text-sm font-medium text-slate-800">
            Asking price (USD)
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
              <input
                required
                type="text"
                inputMode="decimal"
                pattern="^\d+(?:[\.,]\d{1,2})?$"
                placeholder="e.g. 25.00"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pl-9 text-base outline-none ring-teal-500 focus:ring-2"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
              />
            </div>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Delivery option
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                type="button"
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  !deliveryAvailable
                    ? "border-teal-600 bg-teal-600 text-white shadow"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setDeliveryAvailable(false)}
              >
                No delivery
              </button>
              <button
                type="button"
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  deliveryAvailable
                    ? "border-teal-600 bg-teal-600 text-white shadow"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setDeliveryAvailable(true)}
              >
                Offer delivery
              </button>
            </div>
            {deliveryAvailable ? (
              <div className="mt-3">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="^\d+(?:[\.,]\d{1,2})?$"
                    placeholder="Delivery fee"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pl-9 text-base outline-none ring-teal-500 focus:ring-2"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </label>
        </div>

        {deliveryAvailable ? (
          <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                checked={deliveryRequired}
                onChange={(e) => setDeliveryRequired(e.target.checked)}
              />
              <span>
                List for <strong>driver pickup</strong> — drivers nearby can claim delivery and earn a commission.
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Pickup ZIP (optional)
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
                placeholder="e.g. 94103"
                value={pickupZip}
                onChange={(e) => setPickupZip(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-800">
              Driver commission % override (optional)
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
                inputMode="decimal"
                placeholder="Leave blank for platform default (10%)"
                value={driverCommissionPercent}
                onChange={(e) => setDriverCommissionPercent(e.target.value)}
              />
            </label>
          </div>
        ) : null}

        <label className="block text-sm font-medium text-slate-800">
          Approximate quantity
          <input
            required
            placeholder="e.g. ~20 kg, 3 bags"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Description (optional)
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="block text-sm font-medium text-slate-800">
          Pickup address
          <textarea
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <MapCoordinatesPicker
          address={address}
          latitude={latitude}
          longitude={longitude}
          onChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
          onAddressFromCoordinates={(formatted) => setAddress(formatted)}
        />

        <label className="block text-sm font-medium text-slate-800">
          Photos (required, at least one — max 5MB each)
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-1 w-full text-sm"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Publishing listing…" : "Publish listing"}
        </Button>
        </section>
      </form>
    </div>
  );
}
