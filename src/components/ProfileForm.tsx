"use client";

import { useEffect, useMemo, useState } from "react";
import { AvatarUpload } from "./AvatarUpload";
import { Button } from "./Button";
import { Toast } from "./Toast";

type ProfileData = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  zipCode?: string | null;
  countryCode?: string | null;
  currency?: string;
  role: "customer" | "buyer" | "driver" | "admin";
  reviewCount?: number;
  averageRating?: number | null;
};

function displayName(p: Pick<ProfileData, "name" | "firstName" | "lastName">) {
  const fromParts = [p.firstName, p.lastName]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromParts.length >= 1) return fromParts;
  return p.name?.trim() || "—";
}

function roleLabel(role: ProfileData["role"]) {
  switch (role) {
    case "customer":
      return "Seller";
    case "buyer":
      return "Buyer";
    case "driver":
      return "Driver";
    case "admin":
      return "Admin";
    default:
      return role;
  }
}

export function ProfileForm() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function hydrateFromProfile(p: ProfileData) {
    let fn = (p.firstName ?? "").trim();
    let ln = (p.lastName ?? "").trim();
    if (!fn && !ln && p.name) {
      const parts = p.name.trim().split(/\s+/);
      fn = parts[0] ?? "";
      ln = parts.slice(1).join(" ");
    }
    setFirstName(fn);
    setLastName(ln);
    setPhone(p.phone ?? "");
    setAddress(p.address ?? "");
    setZipCode(p.zipCode ?? "");
    setCountryCode(p.countryCode ?? "");
    setCurrency(p.currency ?? "USD");
    setAvatarUrl(p.avatarUrl ?? null);
  }

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (res.status === 404) {
          const heal = await fetch("/api/ensure-profile", { method: "POST", credentials: "include" });
          await heal.json().catch(() => ({}));
          if (!heal.ok) {
            setError("We couldn’t prepare your profile right now. Refresh the page or try again in a moment.");
            return;
          }
          const retry = await fetch("/api/profile");
          const retryData = await retry.json();
          if (!retry.ok) {
            setError("We couldn’t load your profile right now. Refresh the page or try again in a moment.");
            return;
          }
          const pr: ProfileData = {
            ...retryData.profile,
            firstName: retryData.profile.firstName,
            lastName: retryData.profile.lastName,
            reviewCount: retryData.reviewSummary?.reviewCount ?? 0,
            averageRating: retryData.reviewSummary?.averageRating ?? null,
          };
          setProfile(pr);
          hydrateFromProfile(pr);
          return;
        }
        if (!res.ok) {
          setError("We couldn’t load your profile right now. Refresh the page or try again in a moment.");
          return;
        }
        const pr: ProfileData = {
          ...data.profile,
          firstName: data.profile.firstName,
          lastName: data.profile.lastName,
          reviewCount: data.reviewSummary?.reviewCount ?? 0,
          averageRating: data.reviewSummary?.averageRating ?? null,
        };
        setProfile(pr);
        hydrateFromProfile(pr);
      } catch {
        setError("We couldn’t load your profile right now. Refresh the page or try again in a moment.");
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

  useEffect(() => {
    const cc = countryCode.trim().toUpperCase();
    if (cc === "CA") setCurrency("CAD");
    else if (cc === "GB") setCurrency("GBP");
    else if (["IE", "FR", "DE", "ES", "IT", "NL", "BE", "PT", "AT", "FI", "GR"].includes(cc)) setCurrency("EUR");
    else if (cc === "IN") setCurrency("INR");
    else if (cc === "AU") setCurrency("AUD");
    else if (cc === "NZ") setCurrency("NZD");
    else if (cc === "SG") setCurrency("SGD");
    else if (cc === "AE") setCurrency("AED");
    else if (cc) setCurrency("USD");
  }, [countryCode]);

  const hasChanges = useMemo(() => {
    if (!profile) return false;
    const combined = [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(" ").trim();
    return Boolean(
      combined.length >= 2 &&
        (combined !== displayName(profile) ||
          (profile.phone ?? "") !== phone.trim() ||
          (profile.address ?? "") !== address.trim() ||
          profile.avatarUrl !== avatarUrl ||
          (profile.zipCode ?? "") !== zipCode.trim() ||
          (profile.countryCode ?? "") !== countryCode.trim().toUpperCase()),
    );
  }, [profile, firstName, lastName, phone, address, avatarUrl, zipCode, countryCode]);

  function beginEdit() {
    if (profile) hydrateFromProfile(profile);
    setFieldErrors({});
    setError(null);
    setIsEditing(true);
  }

  function cancelEdit() {
    if (profile) hydrateFromProfile(profile);
    setFieldErrors({});
    setError(null);
    setIsEditing(false);
  }

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
  }

  function validateProfile() {
    const nextErrors: Record<string, string> = {};
    const combined = [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(" ").trim();
    if (combined.length < 2) nextErrors.name = "Enter first and last name (at least 2 characters total).";
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
      const fn = firstName.trim();
      const ln = lastName.trim();
      const avatarChanged = avatarUrl !== profile.avatarUrl;
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fn,
          lastName: ln,
          phone: phone.trim() || null,
          address: address.trim() || null,
          zipCode: zipCode.trim() || null,
          countryCode: countryCode.trim() ? countryCode.trim().toUpperCase() : null,
          avatarUrl: avatarChanged ? avatarUrl || null : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = "We couldn’t save your profile right now. Review the highlighted fields and try again.";
        setError(message);
        showToast("error", message);
        return;
      }
      const next: ProfileData = {
        ...data.profile,
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        reviewCount: profile.reviewCount,
        averageRating: profile.averageRating,
      };
      setProfile(next);
      hydrateFromProfile(next);
      window.dispatchEvent(new CustomEvent("wm:profile-updated", { detail: next }));
      setError(null);
      setIsEditing(false);
      if (data.avatarColumnAvailable === false) {
        showToast("error", "Profile saved, but your photo could not be updated right now.");
      } else {
        showToast("success", "Profile updated");
      }
    } catch {
      setError("We couldn’t save your profile right now. Try again in a moment.");
      showToast("error", "We couldn’t save your profile right now. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Getting your profile ready.</p>;
  }

  if (!profile) {
    return <p className="text-sm text-rose-600">Profile not available.</p>;
  }

  const busy = saving || avatarUploading;
  const publicName = displayName({ name: profile.name, firstName: profile.firstName, lastName: profile.lastName });
  const countryLabels: Record<string, string> = {
    US: "United States",
    CA: "Canada",
    GB: "United Kingdom",
    IE: "Ireland",
    IN: "India",
    AU: "Australia",
    NZ: "New Zealand",
    SG: "Singapore",
    AE: "United Arab Emirates",
  };

  return (
    <>
      <section
        className="overflow-hidden rounded-3xl border border-slate-200/50 bg-white shadow-cosmos-md ring-1 ring-slate-200/30"
        aria-busy={busy}
      >
        <div className="border-b border-slate-200/50 bg-cosmos-page-alt/80 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Account</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">Profile</h2>
              <p className="mt-1 text-sm text-slate-600">How buyers and drivers see you on listings and offers.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                {roleLabel(profile.role)}
              </span>
              {!isEditing ? (
                <Button type="button" onClick={beginEdit} className="rounded-full">
                  Edit profile
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Rating</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {profile.averageRating != null ? profile.averageRating.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-slate-600">
                {profile.reviewCount != null && profile.reviewCount > 0
                  ? `${profile.reviewCount} review${profile.reviewCount === 1 ? "" : "s"}`
                  : "No reviews yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Location</p>
              <p className="mt-1 line-clamp-3 text-sm text-slate-800">{profile.address?.trim() || "Not set"}</p>
            </div>
          </div>

          {error ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}

          {!isEditing ? (
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
              <div className="flex shrink-0 flex-col items-center sm:items-start">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-28 w-28 rounded-2xl object-cover ring-2 ring-slate-100 sm:h-32 sm:w-32"
                  />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-2xl font-bold text-white sm:h-32 sm:w-32">
                    {publicName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() ?? "")
                      .join("") || "?"}
                  </span>
                )}
                <p className="mt-2 text-center text-xs text-slate-500 sm:text-left">Photo is updated when you edit.</p>
              </div>
              <dl className="min-w-0 flex-1 space-y-3">
                <div className="grid gap-1 border-b border-slate-100 py-2 sm:grid-cols-[140px_1fr] sm:items-baseline">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt>
                  <dd className="text-base text-slate-900">{publicName}</dd>
                </div>
                <div className="grid gap-1 border-b border-slate-100 py-2 sm:grid-cols-[140px_1fr] sm:items-baseline">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                  <dd className="text-base text-slate-800">{profile.email}</dd>
                </div>
                <div className="grid gap-1 border-b border-slate-100 py-2 sm:grid-cols-[140px_1fr] sm:items-baseline">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
                  <dd className="text-base text-slate-800">{profile.phone || "—"}</dd>
                </div>
                <div className="grid gap-1 border-b border-slate-100 py-2 sm:grid-cols-[140px_1fr] sm:items-baseline">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">ZIP / postal</dt>
                  <dd className="text-base text-slate-800">{profile.zipCode || "—"}</dd>
                </div>
                <div className="grid gap-1 border-b border-slate-100 py-2 sm:grid-cols-[140px_1fr] sm:items-baseline">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Country</dt>
                  <dd className="text-base text-slate-800">
                    {profile.countryCode ? countryLabels[profile.countryCode] ?? profile.countryCode : "—"}
                  </dd>
                </div>
                <div className="grid gap-1 border-b border-slate-100 py-2 sm:grid-cols-[140px_1fr] sm:items-baseline">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Currency</dt>
                  <dd className="text-base text-slate-800">{profile.currency ?? "—"}</dd>
                </div>
                <div className="grid gap-1 py-2 sm:grid-cols-[140px_1fr] sm:items-start">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</dt>
                  <dd className="whitespace-pre-wrap text-base text-slate-800">{profile.address || "—"}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold text-slate-600">Profile photo</p>
                <AvatarUpload
                  initialUrl={avatarUrl}
                  onUpload={(nextAvatarUrl) => {
                    setAvatarUrl(nextAvatarUrl);
                    setError(null);
                    showToast("success", "Photo updated — save to apply.");
                  }}
                  onUploadingChange={setAvatarUploading}
                  onError={(message) => {
                    setError(message);
                    showToast("error", message);
                  }}
                />
              </div>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-900">First name</span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setFieldErrors((c) => {
                          const n = { ...c };
                          delete n.name;
                          return n;
                        });
                      }}
                      className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                        fieldErrors.name
                          ? "border-rose-400 focus:ring-rose-100"
                          : "border-slate-200 focus:border-teal-500 focus:ring-teal-100"
                      }`}
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-900">Last name</span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setFieldErrors((c) => {
                          const n = { ...c };
                          delete n.name;
                          return n;
                        });
                      }}
                      className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                        fieldErrors.name
                          ? "border-rose-400 focus:ring-rose-100"
                          : "border-slate-200 focus:border-teal-500 focus:ring-teal-100"
                      }`}
                      autoComplete="family-name"
                    />
                  </label>
                </div>
                {fieldErrors.name ? <p className="text-sm text-rose-600">{fieldErrors.name}</p> : null}
                <p className="text-xs text-slate-500">Shown as: {displayName({ name: "", firstName, lastName }) || "—"}</p>

                <label className="block">
                  <span className="text-sm font-medium text-slate-900">Email</span>
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-900">Phone</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setFieldErrors((c) => {
                        const n = { ...c };
                        delete n.phone;
                        return n;
                      });
                    }}
                    className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 ${
                      fieldErrors.phone
                        ? "border-rose-400 focus:ring-rose-100"
                        : "border-slate-200 focus:border-teal-500 focus:ring-teal-100"
                    }`}
                  />
                  {fieldErrors.phone ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.phone}</p> : null}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-900">ZIP / postal code</span>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-900">Country</span>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">Select…</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="IE">Ireland</option>
                    <option value="IN">India</option>
                    <option value="AU">Australia</option>
                    <option value="NZ">New Zealand</option>
                    <option value="SG">Singapore</option>
                    <option value="AE">United Arab Emirates</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-900">Currency</span>
                  <input
                    type="text"
                    value={currency}
                    readOnly
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-900">Address</span>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setFieldErrors((c) => {
                        const n = { ...c };
                        delete n.address;
                        return n;
                      });
                    }}
                    className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 ${
                      fieldErrors.address
                        ? "border-rose-400 focus:ring-rose-100"
                        : "border-slate-200 focus:border-teal-500 focus:ring-teal-100"
                    }`}
                  />
                  {fieldErrors.address ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.address}</p> : null}
                </label>

                <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" onClick={cancelEdit} disabled={busy}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSave} disabled={!hasChanges || busy}>
                    {saving ? "Saving changes" : avatarUploading ? "Uploading photo" : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {toast ? <Toast message={toast.message} variant={toast.type} onClose={() => setToast(null)} /> : null}
    </>
  );
}
