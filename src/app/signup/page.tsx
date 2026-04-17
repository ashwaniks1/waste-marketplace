"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/Button";

const roleOptions = [
  { value: "customer", label: "Seller", icon: "♻️", description: "List waste and manage offers." },
  { value: "buyer", label: "Buyer", icon: "🛒", description: "Browse listings and make offers." },
  { value: "driver", label: "Driver", icon: "🚚", description: "Accept pickups and move materials." },
];

const availabilityOptions = [
  { value: "Available", label: "Available" },
  { value: "Weekdays", label: "Weekdays" },
  { value: "Evenings", label: "Evenings" },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "buyer" | "driver">("customer");
  const [vehicleType, setVehicleType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [availability, setAvailability] = useState(availabilityOptions[0].value);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  const requireVerification = process.env.NEXT_PUBLIC_SUPABASE_REQUIRE_EMAIL_VERIFICATION !== "false";

  const isFormValid = useMemo(() => {
    if (name.trim().length < 2) return false;
    if (!emailRegex.test(email)) return false;
    if (phone.replace(/\D/g, "").length < 10) return false;
    if (address.trim().length === 0) return false;
    if (!passwordRegex.test(password)) return false;
    if (role === "driver") {
      if (!vehicleType.trim() || !licenseNumber.trim() || !availability.trim()) return false;
    }
    return true;
  }, [name, email, phone, address, password, role, vehicleType, licenseNumber, availability]);

  function validateFields() {
    const errors: Record<string, string> = {};
    if (name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
    if (!emailRegex.test(email)) errors.email = "Enter a valid email address.";
    if (phone.replace(/\D/g, "").length < 10) errors.phone = "Phone number must contain at least 10 digits.";
    if (address.trim().length === 0) errors.address = "Address is required.";
    if (!passwordRegex.test(password)) {
      errors.password = "Password needs 8+ chars, one uppercase letter, and one number.";
    }
    if (role === "driver") {
      if (!vehicleType.trim()) errors.vehicleType = "Vehicle type is required for drivers.";
      if (!licenseNumber.trim()) errors.licenseNumber = "License number is required for drivers.";
      if (!availability.trim()) errors.availability = "Availability is required for drivers.";
    }
    setFieldErrors(errors);
    return errors;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errors = validateFields();
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          address,
          password,
          role,
          vehicleType: role === "driver" ? vehicleType : undefined,
          licenseNumber: role === "driver" ? licenseNumber : undefined,
          availability: role === "driver" ? availability : undefined,
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
            <Button className="w-full">Back to login</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <h1 className="text-center text-2xl font-bold text-slate-900">Create account</h1>
      <p className="mt-1 text-center text-sm text-slate-600">Join as a seller, buyer, or driver.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">I am a…</legend>
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
                  }`}>
                  <input
                    type="radio"
                    name="role"
                    className="sr-only"
                    checked={role === option.value}
                    onChange={() => setRole(option.value as "customer" | "buyer" | "driver")}
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

        <label className="block text-sm font-medium text-slate-700">
          Full name
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((errors) => ({ ...errors, name: undefined }));
            }}
            className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
              fieldErrors.name
                ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
            }`}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
          />
          {fieldErrors.name ? <p id="name-error" className="mt-2 text-sm text-rose-600">{fieldErrors.name}</p> : null}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((errors) => ({ ...errors, email: undefined }));
            }}
            className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none transition focus:ring-2 ${
              fieldErrors.email
                ? "border-rose-500 bg-rose-50 focus:border-rose-500 focus:ring-rose-100"
                : "border-slate-200 focus:border-teal-500 focus:ring-teal-200"
            }`}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
          {fieldErrors.email ? <p id="email-error" className="mt-2 text-sm text-rose-600">{fieldErrors.email}</p> : null}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Phone
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
            aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
          />
          {fieldErrors.phone ? <p id="phone-error" className="mt-2 text-sm text-rose-600">{fieldErrors.phone}</p> : null}
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Default address
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
            aria-describedby={fieldErrors.address ? "address-error" : undefined}
          />
          {fieldErrors.address ? <p id="address-error" className="mt-2 text-sm text-rose-600">{fieldErrors.address}</p> : null}
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
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          <p className="mt-2 text-sm text-slate-500">Minimum 8 chars, one uppercase, one number.</p>
          {fieldErrors.password ? <p id="password-error" className="mt-2 text-sm text-rose-600">{fieldErrors.password}</p> : null}
        </label>

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
                aria-invalid={Boolean(fieldErrors.vehicleType)}
                aria-describedby={fieldErrors.vehicleType ? "vehicleType-error" : undefined}
              />
              {fieldErrors.vehicleType ? <p id="vehicleType-error" className="mt-2 text-sm text-rose-600">{fieldErrors.vehicleType}</p> : null}
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
                aria-invalid={Boolean(fieldErrors.licenseNumber)}
                aria-describedby={fieldErrors.licenseNumber ? "licenseNumber-error" : undefined}
              />
              {fieldErrors.licenseNumber ? <p id="licenseNumber-error" className="mt-2 text-sm text-rose-600">{fieldErrors.licenseNumber}</p> : null}
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
                aria-invalid={Boolean(fieldErrors.availability)}
                aria-describedby={fieldErrors.availability ? "availability-error" : undefined}
              >
                {availabilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.availability ? <p id="availability-error" className="mt-2 text-sm text-rose-600">{fieldErrors.availability}</p> : null}
            </label>
          </div>
        ) : null}

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <Button type="submit" disabled={loading || !isFormValid} className="w-full">
          {loading ? "Creating…" : "Create account"}
        </Button>
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
