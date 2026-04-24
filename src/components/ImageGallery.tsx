"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";

export function ImageGallery({ images, className = "" }: { images: string[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images?.length) return null;

  return (
    <>
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>
        {images.map((src, idx) => (
          <button
            key={src}
            type="button"
            className="group relative aspect-[4/3] overflow-hidden rounded-[1.35rem] border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            onClick={() => setOpen(idx)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-contain transition group-hover:scale-[1.01]" />
            <span className="sr-only">View image {idx + 1}</span>
          </button>
        ))}
      </div>
      <ImageLightbox images={images} index={open} onClose={() => setOpen(null)} />
    </>
  );
}
