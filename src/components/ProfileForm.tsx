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
  role: "customer" | "buyer" | "driver" | "admin";
};

export function ProfileForm() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        setProfile(data.profile);
        setName(data.profile.name ?? "");
        setPhone(data.profile.phone ?? "");
        setAddress(data.profile.address ?? "");
        setAvatarUrl(data.profile.avatarUrl ?? null);
      } catch (err) {
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
          (profile.name !== name || profile.phone !== phone || profile.address !== address || profile.avatarUrl !== avatarUrl),
      ),
    [profile, name, phone, address, avatarUrl],
  );

  function resetForm() {
    if (!profile) return;
    setName(profile.name);
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
    setAvatarUrl(profile.avatarUrl ?? null);
    setError(null);
    setToast(null);
  }

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
  }

  async function handleSave() {
    if (!profile) return;
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
    } catch (err) {
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
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                aria-label="Full name"
              />
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
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                aria-label="Phone number"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-900">Address</span>
              <textarea
                id="profile-address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                aria-label="Address"
              />
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
