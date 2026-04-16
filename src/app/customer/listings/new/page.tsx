"use client";

import { WasteType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { WASTE_TYPE_OPTIONS } from "@/lib/waste-types";

export default function NewListingPage() {
  const router = useRouter();
  const [wasteType, setWasteType] = useState<WasteType>("PLASTIC");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      urls.push(data.url);
    }
    return urls;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const images = files.length ? await uploadImages() : [];
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wasteType,
          quantity,
          description: description || undefined,
          address,
          images,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create listing");
        return;
      }
      router.push(`/customer/listings/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppHeader title="Create listing" backHref="/customer" role="customer" />
      <form onSubmit={onSubmit} className="space-y-5 px-4 pb-8 pt-4">
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
          Asking price (USD)
          <input
            required
            type="number"
            min={0.01}
            step="0.01"
            placeholder="e.g. 25.00"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
          />
        </label>

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

        <label className="block text-sm font-medium text-slate-800">
          Photos (optional, max 5MB each)
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
          {loading ? "Submitting…" : "Submit request"}
        </Button>
      </form>
    </>
  );
}
