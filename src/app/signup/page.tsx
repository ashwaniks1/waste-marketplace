"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { detectMarketRegion, optionalTaxIdLabel, type MarketRegion } from "@/lib/marketRegion";
import {
  fieldErrorsFromZod,
  signupAccountBasicsSchema,
  signupFormSchema,
} from "@/lib/validation";

const roleOptions = [
  { value: "customer" as const, label: "Seller", icon: "♻️", description: "List waste and manage offers." },
  { value: "buyer" as const, label: "Buyer", icon: "🛒", description: "Browse listings and make offers." },
  { value: "driver" as const, label: "Driver", icon: "🚚", description: "Accept pickups and move materials." },
];

const availabilityOptions = [
  { value: "Available", label: "Available" },
  { value: "Weekdays", label: "Weekdays" },
  { value: "Evenings", label: "Evenings" },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"customer" | "buyer" | "driver">("customer");
  const [vehicleType, setVehicleType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [availability, setAvailability] = useState(availabilityOptions[0].value);
  const [gstNumber, setGstNumber] = useState("");
  const [ein, setEin] = useState("");
  const [marketRegion, setMarketRegion] = useState<MarketRegion>("US");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  const requireVerification = process.env.NEXT_PUBLIC_SUPABASE_REQUIRE_EMAIL_VERIFICATION !== "false";

  useEffect(() => {
    setMarketRegion(detectMarketRegion());
    const params = new URLSearchParams(window.location.search);
    const r = params.get("role");
    if (r === "buyer" || r === "driver" || r === "customer") setRole(r);
  }, []);

  const signupPayload = useMemo(
    () => ({
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      address: address || undefined,
      password,
      confirmPassword,
      role,
      vehicleType: role === "driver" ? vehicleType : undefined,
      licenseNumber: role === "driver" ? licenseNumber : undefined,
      availability: role === "driver" ? availability : undefined,
      gstNumber: gstNumber || undefined,
      ein: ein || undefined,
      marketRegion,
    }),
    [
      firstName,
      lastName,
      email,
      phone,
      address,
      password,
      confirmPassword,
      role,
      vehicleType,
      licenseNumber,
      availability,
      gstNumber,
      ein,
      marketRegion,
    ],
  );

  const basicsPayload = useMemo(
    () => ({ firstName, lastName, email, password, confirmPassword }),
    [firstName, lastName, email, password, confirmPassword],
  );

  const canAdvanceFromStep2 = signupAccountBasicsSchema.safeParse(basicsPayload).success;
  const canSubmit = signupFormSchema.safeParse(signupPayload).success;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = signupFormSchema.safeParse(signupPayload);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          password,
          confirmPassword,
          role,
          vehicleType: role === "driver" ? vehicleType : undefined,
          licenseNumber: role === "driver" ? licenseNumber : undefined,
          availability: role === "driver" ? availability : undefined,
          gstNumber: gstNumber.trim() || undefined,
          ein: ein.trim() || undefined,
          marketRegion,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Signup failed");
        return;
      }

      if (requireVerification) {
        setPendingEmail(email);
        setSignedUp(true);
        return;
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) {
        setError(
          "Account created. If email confirmation is enabled in Supabase, confirm your email then sign in.",
        );
        return;
      }
      const r = data.role as string | undefined;
      if (r === "admin") router.push("/admin");
      else if (role === "buyer") router.push("/buyer");
      else if (role === "driver") router.push("/driver");
      else router.push("/customer");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function goStep2(e: React.FormEvent) {
    e.preventDefault();
    setStep(2);
  }

  function goStep3(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signupAccountBasicsSchema.safeParse(basicsPayload);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setFieldErrors({});
    setStep(3);
  }

  if (signedUp) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Check your email</h1>
          <p className="text-sm leading-6 text-slate-600">
            We sent a verification link to <span className="font-semibold text-slate-900">{pendingEmail}</span>.
            Please verify your address before signing in.
          </p>
          <p className="text-sm text-slate-600">
            If you don’t see it shortly, check spam or try again in a few minutes.
          </p>
          <Link href="/login">
            <Button className="w-full">Back to sign in</Button>
          </Link>
        </div>
      </main>
    );
  }

  const taxLabel = optionalTaxIdLabel(marketRegion);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <h1 className="text-center text-2xl font-bold text-slate-900">Create account</h1>
      <p className="mt-1 text-center text-sm text-slate-600">Three quick steps — business details stay optional.</p>

      <ol className="mx-auto mt-6 flex items-center gap-2 text-xs font-medium text-slate-500">
        <li className={step >= 1 ? "text-teal-700" : ""}>1 · Role</li>
        <li aria-hidden>·</li>
        <li className={step >= 2 ? "text-teal-700" : ""}>2 · Basics</li>
        <li aria-hidden>·</li>
        <li className={step >= 3 ? "text-teal-700" : ""}>3 · Optional</li>
      </ol>

      <form onSubmit={step === 1 ? goStep2 : step === 2 ? goStep3 : onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === 1 ? (
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">Step 1 — I am a…</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {roleOptions.map((option) => {
                const active = role === option.value;
                return (
                  <label
                    key={option.value}
                    className={`group flex cursor-pointer flex-col gap-3 rounded-3xl border p-4 text-left transition ${
                      active
                        ? "border-teal-500 bg-teal-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="sr-only"
                      checked={role === option.value}
                      onChange={() => setRole(option.value)}
                    />
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                        {option.icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                        <p className="text-xs text-slate-500">{option.description}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">Step 2 — Your details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                First name
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setFieldErrors((errors) => ({ ...errors, firstName: undefined }));
                  }}
                  autoComplete="given-name"
                  className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                    fieldErrors.firstName
                      ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                      : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                  }`}
                  aria-invalid={Boolean(fieldErrors.firstName)}
                />
                {fieldErrors.firstName ? <p className="mt-2 text-sm text-rose-600">{fieldErrors.firstName}</p> : null}
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Last name
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setFieldErrors((errors) => ({ ...errors, lastName: undefined }));
                  }}
                  autoComplete="family-name"
                  className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                    fieldErrors.lastName
                      ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                      : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                  }`}
                  aria-invalid={Boolean(fieldErrors.lastName)}
                />
                {fieldErrors.lastName ? <p className="mt-2 text-sm text-rose-600">{fieldErrors.lastName}</p> : null}
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((errors) => ({ ...errors, email: undefined }));
                }}
                autoComplete="email"
                className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                  fieldErrors.email
                    ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                }`}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? <p className="mt-2 text-sm text-rose-600">{fieldErrors.email}</p> : null}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((errors) => ({ ...errors, password: undefined }));
                }}
                autoComplete="new-password"
                className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                  fieldErrors.password
                    ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                }`}
                aria-invalid={Boolean(fieldErrors.password)}
              />
              <p className="mt-2 text-sm text-slate-500">Minimum 8 chars, one uppercase, one number.</p>
              {fieldErrors.password ? <p className="mt-2 text-sm text-rose-600">{fieldErrors.password}</p> : null}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((errors) => ({ ...errors, confirmPassword: undefined }));
                }}
                autoComplete="new-password"
                className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                  fieldErrors.confirmPassword
                    ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                }`}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
              />
              {fieldErrors.confirmPassword ? (
                <p className="mt-2 text-sm text-rose-600">{fieldErrors.confirmPassword}</p>
              ) : null}
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">Step 3 — Optional (add now or later in profile)</p>

            <label className="block text-sm font-medium text-slate-700">
              Prices & units
              <select
                value={marketRegion}
                onChange={(e) => setMarketRegion(e.target.value as MarketRegion)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-teal-200"
              >
                <option value="US">United States — $, lbs, ZIP filter, EIN optional</option>
                <option value="IN">India — ₹, kg, city filter, GST optional</option>
              </select>
              <span className="mt-1 block text-xs text-slate-500">Defaults from your browser; adjust here if needed. You can refine this later in your profile.</span>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Phone <span className="font-normal text-slate-400">(optional)</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setFieldErrors((errors) => ({ ...errors, phone: undefined }));
                }}
                className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                  fieldErrors.phone
                    ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                }`}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone ? <p className="mt-2 text-sm text-rose-600">{fieldErrors.phone}</p> : null}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Default address <span className="font-normal text-slate-400">(optional)</span>
              <textarea
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setFieldErrors((errors) => ({ ...errors, address: undefined }));
                }}
                rows={2}
                className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                  fieldErrors.address
                    ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                    : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                }`}
                aria-invalid={Boolean(fieldErrors.address)}
              />
              {fieldErrors.address ? <p className="mt-2 text-sm text-rose-600">{fieldErrors.address}</p> : null}
            </label>

            {marketRegion === "IN" ? (
              <label className="block text-sm font-medium text-slate-700">
                {taxLabel}
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => {
                    setGstNumber(e.target.value);
                    setFieldErrors((errors) => ({ ...errors, gstNumber: undefined }));
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none focus:ring-2 focus:ring-teal-200"
                />
              </label>
            ) : (
              <label className="block text-sm font-medium text-slate-700">
                {taxLabel}
                <input
                  type="text"
                  value={ein}
                  onChange={(e) => {
                    setEin(e.target.value);
                    setFieldErrors((errors) => ({ ...errors, ein: undefined }));
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none focus:ring-2 focus:ring-teal-200"
                />
              </label>
            )}

            {role === "driver" ? (
              <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Driver details</p>
                <label className="block text-sm font-medium text-slate-700">
                  Vehicle type
                  <input
                    type="text"
                    value={vehicleType}
                    onChange={(e) => {
                      setVehicleType(e.target.value);
                      setFieldErrors((errors) => ({ ...errors, vehicleType: undefined }));
                    }}
                    className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                      fieldErrors.vehicleType
                        ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                    }`}
                  />
                  {fieldErrors.vehicleType ? <p className="mt-2 text-sm text-rose-600">{fieldErrors.vehicleType}</p> : null}
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  License number
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => {
                      setLicenseNumber(e.target.value);
                      setFieldErrors((errors) => ({ ...errors, licenseNumber: undefined }));
                    }}
                    className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                      fieldErrors.licenseNumber
                        ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                    }`}
                  />
                  {fieldErrors.licenseNumber ? (
                    <p className="mt-2 text-sm text-rose-600">{fieldErrors.licenseNumber}</p>
                  ) : null}
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Availability
                  <select
                    value={availability}
                    onChange={(e) => {
                      setAvailability(e.target.value);
                      setFieldErrors((errors) => ({ ...errors, availability: undefined }));
                    }}
                    className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
                      fieldErrors.availability
                        ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                        : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
                    }`}
                  >
                    {availabilityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.availability ? (
                    <p className="mt-2 text-sm text-rose-600">{fieldErrors.availability}</p>
                  ) : null}
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="secondary"
              className="sm:min-w-[7rem]"
              onClick={() => {
                setStep((s) => (s === 3 ? 2 : 1) as 1 | 2 | 3);
                setError(null);
              }}
            >
              Back
            </Button>
          ) : (
            <span />
          )}
          {step === 1 ? (
            <Button type="submit" className="sm:ml-auto sm:min-w-[10rem]">
              Continue
            </Button>
          ) : null}
          {step === 2 ? (
            <Button type="submit" disabled={!canAdvanceFromStep2} className="sm:ml-auto sm:min-w-[10rem]">
              Continue
            </Button>
          ) : null}
          {step === 3 ? (
            <Button type="submit" disabled={loading || !canSubmit} className="sm:ml-auto sm:min-w-[10rem]">
              {loading ? "Creating…" : "Create account"}
            </Button>
          ) : null}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal-700">
          Sign in
        </Link>
      </p>
    </main>
  );
}
