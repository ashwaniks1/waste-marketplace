"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AIAuthIllustration } from "@/components/AIAuthIllustration";
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

const signupSteps = [
  { n: 1 as const, short: "Role" },
  { n: 2 as const, short: "Account" },
  { n: 3 as const, short: "Optional" },
];

function SignupBrandPanel() {
  return (
    <div className="relative hidden flex-col justify-center p-8 lg:flex lg:p-10">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950" />
      <div className="relative z-10 px-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Waste Marketplace</p>
        <h1 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-white">Join as a seller, buyer, or driver.</h1>
        <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
          Pick a role, create your sign-in, then add business details if you want — everything stays editable in your profile.
        </p>
        <div className="mt-10 max-w-lg">
          <AIAuthIllustration />
        </div>
      </div>
    </div>
  );
}

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
      <main className="min-h-dvh bg-slate-50 text-slate-900">
        <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-2">
          <SignupBrandPanel />
          <div className="flex flex-col justify-center px-4 py-10 sm:px-8">
            <div className="mx-auto mb-4 flex w-full max-w-md justify-end">
              <Link href="/" className="text-sm font-semibold text-teal-700 transition hover:text-teal-900">
                ← Home
              </Link>
            </div>
            <div className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
              <p className="text-sm leading-6 text-slate-600">
                We sent a verification link to <span className="font-semibold text-slate-900">{pendingEmail}</span>.
                Please verify your address before signing in.
              </p>
              <p className="text-sm text-slate-600">
                If you don’t see it shortly, check spam or try again in a few minutes.
              </p>
              <Link href="/login" className="block">
                <Button className="w-full">Back to sign in</Button>
              </Link>
            </div>
            <p className="mx-auto mt-6 w-full max-w-md text-center text-sm text-slate-600">
              Wrong email?{" "}
              <Link href="/signup" className="font-semibold text-teal-700">
                Start over
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  const taxLabel = optionalTaxIdLabel(marketRegion);

  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900">
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-2">
        <SignupBrandPanel />

        <div className="flex flex-col justify-center px-4 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-4 flex justify-end lg:justify-start">
              <Link href="/" className="text-sm font-semibold text-teal-700 transition hover:text-teal-900">
                ← Home
              </Link>
            </div>
            <h1 className="text-center text-2xl font-bold text-slate-900 lg:text-left">Create account</h1>
            <p className="mt-1 text-center text-sm text-slate-600 lg:text-left">
              Three quick steps. Business and tax fields on the last step are optional.
            </p>

            <nav aria-label="Sign up progress" className="mt-6">
              <ol className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {signupSteps.map((s, i) => {
                  const current = step === s.n;
                  const done = step > s.n;
                  return (
                    <li key={s.n} className="flex items-center gap-2">
                      {i > 0 ? (
                        <span className="hidden text-slate-300 sm:inline" aria-hidden>
                          /
                        </span>
                      ) : null}
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          current
                            ? "bg-teal-600 text-white shadow-sm"
                            : done
                              ? "bg-teal-100 text-teal-900"
                              : "bg-slate-200/80 text-slate-700"
                        }`}
                        aria-current={current ? "step" : undefined}
                      >
                        <span className="tabular-nums opacity-90">{s.n}</span>
                        {s.short}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <form
              onSubmit={step === 1 ? goStep2 : step === 2 ? goStep3 : onSubmit}
              className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              {step === 1 ? (
                <div>
                  <p id="signup-role-heading" className="text-sm font-medium text-slate-800">
                    How will you use Waste Marketplace?
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Choose one — you can discuss details with others after joining.</p>
                  <div
                    className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
                    role="group"
                    aria-labelledby="signup-role-heading"
                  >
                    {roleOptions.map((option) => {
                      const active = role === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRole(option.value)}
                          aria-pressed={active}
                          className={`flex w-full flex-col gap-3 rounded-2xl border-2 p-4 text-left transition duration-200 motion-safe:active:scale-[0.99] ${
                            active
                              ? "border-teal-500 bg-gradient-to-br from-teal-50 to-emerald-50 shadow-md ring-2 ring-teal-500/25"
                              : "border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm"
                          }`}
                        >
                          <span
                            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-colors ${
                              active ? "bg-white/80 shadow-sm" : "bg-slate-100"
                            }`}
                            aria-hidden
                          >
                            {option.icon}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">{option.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-800">Your name and sign-in</p>
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
                  <p className="text-sm font-medium text-slate-800">Optional profile details</p>
                  <p className="text-xs text-slate-500">Add these now or anytime from your profile.</p>

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

            <p className="mt-6 text-center text-sm text-slate-600 lg:text-left">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-teal-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
