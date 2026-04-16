"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";

export function ImageGallery({ images, className = "" }: { images: string[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images?.length) return null;

  return (
    <>
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 ${className}`}>
        {images.map((src, idx) => (
          <button
            key={src}
            type="button"
            className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            onClick={() => setOpen(idx)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover transition group-hover:opacity-90" />
            <span className="sr-only">View image {idx + 1}</span>
          </button>
        ))}
      </div>
      <ImageLightbox images={images} index={open} onClose={() => setOpen(null)} />
    </>
  );
}
