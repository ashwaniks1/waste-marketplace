"use client";

import { useEffect, useMemo, useState } from "react";
import { AvatarUpload } from "./AvatarUpload";
import { Button } from "./Button";
import { Toast } from "./Toast";

type ProfileData = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  zipCode?: string | null;
  role: "customer" | "buyer" | "driver" | "admin";
  reviewCount?: number;
  averageRating?: number | null;
};

export function ProfileForm() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Unable to load profile");
          return;
        }
        setProfile({
          ...data.profile,
          reviewCount: data.reviewSummary?.reviewCount ?? 0,
          averageRating: data.reviewSummary?.averageRating ?? null,
        });
        setName(data.profile.name ?? "");
        setPhone(data.profile.phone ?? "");
        setAddress(data.profile.address ?? "");
        setZipCode(data.profile.zipCode ?? "");
        setAvatarUrl(data.profile.avatarUrl ?? null);
      } catch {
        setError("Unable to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const hasChanges = useMemo(
    () =>
      Boolean(
        profile &&
          name.trim().length > 0 &&
          (profile.name !== name ||
            profile.phone !== phone ||
            profile.address !== address ||
            profile.avatarUrl !== avatarUrl ||
            (profile.zipCode ?? "") !== zipCode.trim()),
      ),
    [profile, name, phone, address, avatarUrl, zipCode],
  );

  function resetForm() {
    if (!profile) return;
    setName(profile.name);
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
    setAvatarUrl(profile.avatarUrl ?? null);
    setError(null);
    setFieldErrors({});
    setToast(null);
  }

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
  }

  function validateProfile() {
    const nextErrors: Record<string, string> = {};
    if (name.trim().length < 2) nextErrors.name = "Name must be at least 2 characters.";
    if (phone.trim().replace(/\D/g, "").length < 10) nextErrors.phone = "Phone must be at least 10 digits.";
    if (address.trim().length === 0) nextErrors.address = "Address is required.";
    setFieldErrors(nextErrors);
    return nextErrors;
  }

  async function handleSave() {
    if (!profile) return;
    const validationErrors = validateProfile();
    if (Object.keys(validationErrors).length > 0) {
      const message = "Please fix the highlighted fields before saving.";
      setError(message);
      showToast("error", message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const avatarChanged = avatarUrl !== profile.avatarUrl;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          zipCode: zipCode.trim() || null,
          avatarUrl: avatarChanged ? avatarUrl || null : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error ?? "Unable to save profile";
        setError(message);
        showToast("error", message);
        return;
      }
      setProfile(data.profile);
      setName(data.profile.name ?? "");
      setPhone(data.profile.phone ?? "");
      setAddress(data.profile.address ?? "");
      setAvatarUrl(data.profile.avatarUrl ?? null);
      setError(null);
      if (avatarChanged && data.avatarColumnAvailable === false) {
        showToast("error", "Profile saved, but avatar could not be stored until the database migration is applied.");
      } else {
        showToast("success", "Profile updated successfully");
      }
    } catch {
      setError("Unable to save profile");
      showToast("error", "Unable to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading profile…</p>;
  }

  if (!profile) {
    return <p className="text-sm text-rose-600">Profile not available.</p>;
  }

  const busy = saving || avatarUploading;

  return (
    <>
      <section
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        aria-busy={busy}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-2xl font-semibold text-slate-900">My profile</p>
            <p className="mt-1 text-sm text-slate-600">Update your account details and avatar.</p>
          </div>
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {profile.role}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rating</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {profile.averageRating != null ? profile.averageRating.toFixed(1) : "—"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {profile.reviewCount != null && profile.reviewCount > 0
                ? `${profile.reviewCount} review${profile.reviewCount === 1 ? "" : "s"}`
                : "No reviews yet"}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Location</p>
            <p className="mt-2 text-sm text-slate-700">{profile.address ?? "Not set"}</p>
          </div>
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-3xl bg-slate-50 p-5">
            <AvatarUpload
              initialUrl={avatarUrl}
              onUpload={(nextAvatarUrl) => {
                setAvatarUrl(nextAvatarUrl);
                setError(null);
                showToast("success", "Photo uploaded. Save changes to update your profile.");
              }}
              onUploadingChange={setAvatarUploading}
              onError={(message) => {
                setError(message);
                showToast("error", message);
              }}
            />
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-slate-900">Name</span>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.name;
                    return next;
                  });
                }}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                  fieldErrors.name
                    ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 bg-white focus:border-teal-500 focus:ring-teal-200"
                }`}
                aria-label="Full name"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "profile-name-error" : undefined}
              />
              {fieldErrors.name ? <p id="profile-name-error" className="mt-2 text-sm text-rose-600">{fieldErrors.name}</p> : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-900">Email</span>
              <input
                id="profile-email"
                type="email"
                value={profile.email}
                readOnly
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-600"
                aria-label="Email address"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-900">Phone</span>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.phone;
                    return next;
                  });
                }}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                  fieldErrors.phone
                    ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 bg-white focus:border-teal-500 focus:ring-teal-200"
                }`}
                aria-label="Phone number"
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "profile-phone-error" : undefined}
              />
              {fieldErrors.phone ? <p id="profile-phone-error" className="mt-2 text-sm text-rose-600">{fieldErrors.phone}</p> : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-900">ZIP / postal code</span>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                placeholder="e.g. 94103"
                aria-label="ZIP or postal code"
              />
              <p className="mt-1 text-xs text-slate-500">Used for coarse pickup matching.</p>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-900">Address</span>
              <textarea
                id="profile-address"
                rows={3}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.address;
                    return next;
                  });
                }}
                className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                  fieldErrors.address
                    ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 bg-white focus:border-teal-500 focus:ring-teal-200"
                }`}
                aria-label="Address"
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={fieldErrors.address ? "profile-address-error" : undefined}
              />
              {fieldErrors.address ? <p id="profile-address-error" className="mt-2 text-sm text-rose-600">{fieldErrors.address}</p> : null}
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={resetForm}
                disabled={!hasChanges || busy}
                aria-label="Cancel changes"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || busy}
                aria-label="Save profile"
              >
                {saving ? "Saving…" : avatarUploading ? "Uploading…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {toast ? (
        <Toast message={toast.message} variant={toast.type} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
