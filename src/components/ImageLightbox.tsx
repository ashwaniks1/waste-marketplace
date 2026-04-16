"use client";

import { useCallback, useEffect } from "react";

export function ImageLightbox({
  images,
  index,
  onClose,
}: {
  images: string[];
  index: number | null;
  onClose: () => void;
}) {
  const i = index ?? 0;
  const src = index !== null ? images[i] : null;

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (src) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [src, onKey]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white hover:bg-white/20"
        onClick={onClose}
      >
        Close
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
