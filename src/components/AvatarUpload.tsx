"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

const MAX_BYTES = 3 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function AvatarUpload({
  initialUrl,
  onUpload,
  onUploadingChange,
  onError,
}: {
  initialUrl?: string | null;
  onUpload: (avatarUrl: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onError?: (message: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPreview(initialUrl ?? null);
  }, [initialUrl]);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [onUploadingChange, uploading]);

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error("We couldn’t upload your photo right now. Try a JPG, PNG, or WEBP under 3 MB.");

      return typeof data.url === "string" ? data.url : null;
    } catch (err) {
      const message = (err as Error)?.message ?? "We couldn’t upload your photo right now. Try again in a moment.";
      setError(message);
      onError?.(message);
      return null;
    } finally {
      setUploading(false);
    }
  }

  function validateFile(file: File) {
    if (file.type && !allowedTypes.has(file.type)) {
      return "Please upload a JPG, PNG, or WEBP image.";
    }
    if (file.size > MAX_BYTES) {
      return "Image must be 3 MB or smaller.";
    }
    return null;
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    const previousPreview = preview;
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    const uploadedUrl = await uploadFile(file);
    URL.revokeObjectURL(previewUrl);

    if (!uploadedUrl) {
      setPreview(previousPreview ?? initialUrl ?? null);
      return;
    }

    setPreview(uploadedUrl);
    onUpload(uploadedUrl);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="relative overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-1">
          {preview ? (
            <img
              src={preview}
              alt="Profile avatar"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700"
              aria-hidden="true"
            >
              WM
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload profile photo"
            disabled={uploading}
          >
            {uploading ? "Uploading photo" : "Upload photo"}
          </Button>
          <p className="text-sm text-slate-500">
            JPG, PNG, or WEBP. Max 3 MB.
          </p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
