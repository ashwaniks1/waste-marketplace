"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { fieldErrorsFromZod, signupFormSchema } from "@/lib/validation";

const roleOptions = [
  { value: "customer" as const, label: "Seller", icon: "♻️", description: "List lots, manage offers, coordinate dock release." },
  { value: "buyer" as const, label: "Buyer", icon: "🛒", description: "Source feedstock and negotiate commercial terms." },
  { value: "driver" as const, label: "Driver", icon: "🚚", description: "Execute linehaul and last-mile under tendered loads." },
];

const availabilityOptions = [
  { value: "Available", label: "Available" },
  { value: "Weekdays", label: "Weekdays" },
  { value: "Evenings", label: "Evenings" },
];

const steps = ["Role", "Company", "User", "Capabilities"] as const;

function SignupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"customer" | "buyer" | "driver">("customer");

  const [companyLegalName, setCompanyLegalName] = useState("");
  const [companyEin, setCompanyEin] = useState("");
  const [hqRegion, setHqRegion] = useState("");

  const [exportCompliance, setExportCompliance] = useState(false);
  const [hazmatOps, setHazmatOps] = useState(false);
  const [dedicatedLanes, setDedicatedLanes] = useState(false);

  const [vehicleType, setVehicleType] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [availability, setAvailability] = useState(availabilityOptions[0].value);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [signedUp, setSignedUp] = useState(false);

  const requireVerification = process.env.NEXT_PUBLIC_SUPABASE_REQUIRE_EMAIL_VERIFICATION !== "false";

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "buyer" || r === "driver" || r === "customer") setRole(r);
  }, [searchParams]);

  const composedAddress = useMemo(() => {
    const base = address.trim();
    const org =
      companyLegalName.trim().length > 0
        ? `\n\nLegal entity: ${companyLegalName.trim()}${companyEin.trim() ? ` · EIN ${companyEin.trim()}` : ""}${hqRegion ? ` · HQ region: ${hqRegion}` : ""}`
        : "";
    const caps: string[] = [];
    if (exportCompliance) caps.push("Export / trade compliance");
    if (hazmatOps) caps.push("Hazmat-capable ops");
    if (dedicatedLanes) caps.push("Dedicated lane coverage");
    const capLine = caps.length ? `\nDeclared capabilities: ${caps.join("; ")}` : "";
    return `${base}${org}${capLine}`.slice(0, 500);
  }, [address, companyLegalName, companyEin, hqRegion, exportCompliance, hazmatOps, dedicatedLanes]);

  const signupPayload = useMemo(
    () => ({
      firstName,
      lastName,
      email,
      phone,
      address: composedAddress,
      password,
      confirmPassword,
      role,
      vehicleType: role === "driver" ? vehicleType : undefined,
      licenseNumber: role === "driver" ? licenseNumber : undefined,
      availability: role === "driver" ? availability : undefined,
    }),
    [
      firstName,
      lastName,
      email,
      phone,
      composedAddress,
      password,
      confirmPassword,
      role,
      vehicleType,
      licenseNumber,
      availability,
    ],
  );

  const isFormValid = useMemo(() => signupFormSchema.safeParse(signupPayload).success, [signupPayload]);

  function nextStep() {
    setError(null);
    setFieldErrors({});
    if (step === 2) {
      if (companyLegalName.trim().length < 2) {
        setFieldErrors({ companyLegalName: "Registered entity name is required" });
        return;
      }
    }
    if (step === 3) {
      const partial = signupFormSchema.safeParse(signupPayload);
      if (!partial.success) {
        setFieldErrors(fieldErrorsFromZod(partial.error));
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

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
          phone,
          address: composedAddress,
          password,
          confirmPassword,
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
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center bg-wm-surface px-4 py-10">
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-wm-secondary">Verify your inbox</h1>
          <p className="text-base text-gray-600">
            We sent a verification link to <span className="font-semibold text-wm-secondary">{pendingEmail}</span>.
            Complete domain verification before production SSO is enabled.
          </p>
          <Link href="/login">
            <Button className="w-full">Return to sign in</Button>
          </Link>
        </div>
      </main>
    );
  }

  const inputClass = (hasError: boolean) =>
    `mt-2 w-full rounded-xl border px-4 py-3 text-base outline-none ring-wm-primary/30 focus:ring-2 ${
      hasError ? "border-rose-500 bg-rose-50" : "border-gray-200"
    }`;

  return (
    <main className="min-h-dvh bg-wm-surface px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tenant enrollment</p>
          <h1 className="mt-2 text-3xl font-bold text-wm-secondary sm:text-4xl">Create account</h1>
          <p className="mt-2 text-base text-gray-600">Provision a workspace for procurement, recovery, or carrier ops.</p>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {steps.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex items-center gap-2">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    active ? "bg-wm-primary text-white" : done ? "bg-emerald-100 text-wm-primary" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {n}
                </span>
                <span className={`hidden text-sm font-medium sm:inline ${active ? "text-wm-secondary" : "text-gray-500"}`}>
                  {label}
                </span>
                {i < steps.length - 1 ? <span className="hidden text-gray-300 sm:inline">→</span> : null}
              </div>
            );
          })}
        </div>

        <form onSubmit={step === 4 ? onSubmit : (e) => e.preventDefault()} className="mt-10 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            {step === 1 ? (
              <fieldset>
                <legend className="text-2xl font-semibold text-wm-secondary">Step 1 — Role selection</legend>
                <p className="mt-2 text-base text-gray-600">Select the primary persona for this login. Billing and RLS inherit from this choice.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {roleOptions.map((option) => {
                    const active = role === option.value;
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md ${
                          active ? "border-wm-primary bg-wm-primary/5" : "border-gray-200 bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          className="sr-only"
                          checked={role === option.value}
                          onChange={() => setRole(option.value)}
                        />
                        <span className="text-2xl" aria-hidden>
                          {option.icon}
                        </span>
                        <p className="text-sm font-semibold text-wm-secondary">{option.label}</p>
                        <p className="text-xs text-gray-600">{option.description}</p>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-wm-secondary">Step 2 — Company profile</h2>
                <p className="text-base text-gray-600">Used for contracting, invoicing alignment, and carrier vetting.</p>
                <label className="block text-sm font-medium text-wm-secondary">
                  Legal entity name
                  <input
                    type="text"
                    value={companyLegalName}
                    onChange={(e) => {
                      setCompanyLegalName(e.target.value);
                      setFieldErrors((f) => ({ ...f, companyLegalName: undefined }));
                    }}
                    className={inputClass(Boolean(fieldErrors.companyLegalName))}
                  />
                  {fieldErrors.companyLegalName ? (
                    <p className="mt-1 text-sm text-rose-600">{fieldErrors.companyLegalName}</p>
                  ) : null}
                </label>
                <label className="block text-sm font-medium text-wm-secondary">
                  Tax ID / EIN (optional)
                  <input type="text" value={companyEin} onChange={(e) => setCompanyEin(e.target.value)} className={inputClass(false)} />
                </label>
                <label className="block text-sm font-medium text-wm-secondary">
                  HQ region
                  <select value={hqRegion} onChange={(e) => setHqRegion(e.target.value)} className={inputClass(false)}>
                    <option value="">Select…</option>
                    <option value="US Northeast">US Northeast</option>
                    <option value="US Southeast">US Southeast</option>
                    <option value="US Midwest">US Midwest</option>
                    <option value="US West">US West</option>
                    <option value="Canada">Canada</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-wm-secondary">Step 3 — User credentials</h2>
                <p className="text-base text-gray-600">Primary operator for this workspace. Use a corporate-controlled mailbox.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-wm-secondary">
                    First name
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setFieldErrors((f) => ({ ...f, firstName: undefined }));
                      }}
                      autoComplete="given-name"
                      className={inputClass(Boolean(fieldErrors.firstName))}
                    />
                    {fieldErrors.firstName ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.firstName}</p> : null}
                  </label>
                  <label className="block text-sm font-medium text-wm-secondary">
                    Last name
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => {
                        setLastName(e.target.value);
                        setFieldErrors((f) => ({ ...f, lastName: undefined }));
                      }}
                      autoComplete="family-name"
                      className={inputClass(Boolean(fieldErrors.lastName))}
                    />
                    {fieldErrors.lastName ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.lastName}</p> : null}
                  </label>
                </div>
                <label className="block text-sm font-medium text-wm-secondary">
                  Work email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((f) => ({ ...f, email: undefined }));
                    }}
                    className={inputClass(Boolean(fieldErrors.email))}
                  />
                  {fieldErrors.email ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.email}</p> : null}
                </label>
                <label className="block text-sm font-medium text-wm-secondary">
                  Phone
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setFieldErrors((f) => ({ ...f, phone: undefined }));
                    }}
                    className={inputClass(Boolean(fieldErrors.phone))}
                  />
                  {fieldErrors.phone ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.phone}</p> : null}
                </label>
                <label className="block text-sm font-medium text-wm-secondary">
                  Primary site / billing address
                  <textarea
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setFieldErrors((f) => ({ ...f, address: undefined }));
                    }}
                    rows={3}
                    className={inputClass(Boolean(fieldErrors.address))}
                  />
                  {fieldErrors.address ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.address}</p> : null}
                </label>
                <label className="block text-sm font-medium text-wm-secondary">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((f) => ({ ...f, password: undefined }));
                    }}
                    autoComplete="new-password"
                    className={inputClass(Boolean(fieldErrors.password))}
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum 8 characters, one uppercase, one number.</p>
                  {fieldErrors.password ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.password}</p> : null}
                </label>
                <label className="block text-sm font-medium text-wm-secondary">
                  Confirm password
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFieldErrors((f) => ({ ...f, confirmPassword: undefined }));
                    }}
                    autoComplete="new-password"
                    className={inputClass(Boolean(fieldErrors.confirmPassword))}
                  />
                  {fieldErrors.confirmPassword ? (
                    <p className="mt-1 text-sm text-rose-600">{fieldErrors.confirmPassword}</p>
                  ) : null}
                </label>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-wm-secondary">Step 4 — Capabilities</h2>
                <p className="text-base text-gray-600">Declare operational scope. Values are appended to your site profile for routing.</p>
                <div className="space-y-3 rounded-2xl border border-gray-100 bg-wm-surface p-4">
                  <label className="flex items-center gap-3 text-sm font-medium text-wm-secondary">
                    <input type="checkbox" checked={exportCompliance} onChange={(e) => setExportCompliance(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    Export / trade compliance workflows
                  </label>
                  <label className="flex items-center gap-3 text-sm font-medium text-wm-secondary">
                    <input type="checkbox" checked={hazmatOps} onChange={(e) => setHazmatOps(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    Hazmat-capable yard or transport
                  </label>
                  <label className="flex items-center gap-3 text-sm font-medium text-wm-secondary">
                    <input type="checkbox" checked={dedicatedLanes} onChange={(e) => setDedicatedLanes(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    Dedicated lane / contract freight
                  </label>
                </div>

                {role === "driver" ? (
                  <div className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-wm-secondary">Carrier credentials</p>
                    <label className="block text-sm font-medium text-wm-secondary">
                      Equipment class
                      <input
                        type="text"
                        value={vehicleType}
                        onChange={(e) => {
                          setVehicleType(e.target.value);
                          setFieldErrors((f) => ({ ...f, vehicleType: undefined }));
                        }}
                        className={inputClass(Boolean(fieldErrors.vehicleType))}
                      />
                      {fieldErrors.vehicleType ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.vehicleType}</p> : null}
                    </label>
                    <label className="block text-sm font-medium text-wm-secondary">
                      Motor carrier / license ID
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => {
                          setLicenseNumber(e.target.value);
                          setFieldErrors((f) => ({ ...f, licenseNumber: undefined }));
                        }}
                        className={inputClass(Boolean(fieldErrors.licenseNumber))}
                      />
                      {fieldErrors.licenseNumber ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.licenseNumber}</p> : null}
                    </label>
                    <label className="block text-sm font-medium text-wm-secondary">
                      Dispatch window
                      <select
                        value={availability}
                        onChange={(e) => {
                          setAvailability(e.target.value);
                          setFieldErrors((f) => ({ ...f, availability: undefined }));
                        }}
                        className={inputClass(Boolean(fieldErrors.availability))}
                      >
                        {availabilityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.availability ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.availability}</p> : null}
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              {step > 1 ? (
                <Button type="button" variant="secondary" onClick={prevStep} className="w-full sm:w-auto">
                  Back
                </Button>
              ) : (
                <span />
              )}
              {step < 4 ? (
                <Button type="button" onClick={nextStep} className="w-full sm:ml-auto sm:w-auto">
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={loading || !isFormValid} className="w-full sm:ml-auto sm:w-auto">
                  {loading ? "Provisioning…" : "Create account"}
                </Button>
              )}
            </div>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Already provisioned?{" "}
          <Link href="/login" className="font-semibold text-wm-primary underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-wm-surface text-gray-600">Loading…</div>}>
      <SignupPageInner />
    </Suspense>
  );
}
