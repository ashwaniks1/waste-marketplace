"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { fieldErrorsFromZod, loginFormSchema } from "@/lib/validation";

type UiRole = "buyer" | "seller" | "driver";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [uiRole, setUiRole] = useState<UiRole>("buyer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [ssoOrigin, setSsoOrigin] = useState("");

  useEffect(() => {
    setSsoOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "buyer" || r === "driver") setUiRole(r);
    if (r === "customer" || r === "seller") setUiRole("seller");
  }, [searchParams]);

  const signupHref = useMemo(() => {
    const map: Record<UiRole, string> = {
      buyer: "buyer",
      seller: "customer",
      driver: "driver",
    };
    return `/signup?role=${map[uiRole]}`;
  }, [uiRole]);

  const googleHref = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base || !ssoOrigin) return "";
    const redirect = encodeURIComponent(`${ssoOrigin}/`);
    return `${base}/auth/v1/authorize?provider=google&redirect_to=${redirect}`;
  }, [ssoOrigin]);

  const azureHref = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base || !ssoOrigin) return "";
    const redirect = encodeURIComponent(`${ssoOrigin}/`);
    return `${base}/auth/v1/authorize?provider=azure&redirect_to=${redirect}`;
  }, [ssoOrigin]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }
    setVerificationPending(false);
    setResendMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : "Login failed";
        if (message.toLowerCase().includes("not confirmed") || message.toLowerCase().includes("email")) {
          setVerificationPending(true);
          setError("Your email address is not verified yet. Check your inbox or resend the confirmation email.");
        } else {
          setError(message);
        }
        return;
      }
      const me = await fetch("/api/users/me");
      const profile = await me.json();
      if (!me.ok) {
        setError("Could not load profile");
        return;
      }
      if (profile.role === "buyer") router.push("/buyer");
      else if (profile.role === "admin") router.push("/admin");
      else if (profile.role === "driver") router.push("/driver");
      else router.push("/customer");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResendMessage(typeof data.error === "string" ? data.error : "Unable to resend verification email.");
      } else {
        setResendMessage("Verification email resent. Check your inbox.");
      }
    } catch {
      setResendMessage("Unable to resend verification email.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-wm-surface text-wm-secondary">
      <div className="mx-auto grid min-h-dvh max-w-7xl lg:grid-cols-2">
        {/* Left — headline + illustration */}
        <div className="relative hidden flex-col justify-center border-r border-wm-border bg-wm-secondary px-10 py-16 text-white lg:flex">
          <div className="max-w-md">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300/90">Enterprise access</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">Sign in to your control tower</h1>
            <p className="mt-6 text-base leading-relaxed text-slate-300">
              Govern procurement, recovery, and carrier execution from one rail. MFA, SSO, and SCIM are provisioned
              per tenant—contact solutions engineering for rollout windows.
            </p>
          </div>
          <div className="pointer-events-none absolute bottom-10 right-10 h-48 w-48 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm" aria-hidden />
          <div className="pointer-events-none absolute bottom-24 right-32 h-32 w-32 rounded-full border border-emerald-400/30" aria-hidden />
        </div>

        {/* Right — form */}
        <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="lg:hidden">
              <h1 className="text-3xl font-bold text-wm-secondary sm:text-4xl">Sign in</h1>
              <p className="mt-2 text-base text-gray-600">Industrial materials & logistics workspace</p>
            </div>
            <div className="hidden lg:block">
              <h2 className="text-2xl font-semibold text-wm-secondary">Credentials</h2>
              <p className="mt-2 text-base text-gray-600">Use your corporate email and password. SSO is optional below.</p>
            </div>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Workspace profile</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "buyer" as const, label: "Buyer" },
                    { id: "seller" as const, label: "Seller" },
                    { id: "driver" as const, label: "Driver" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setUiRole(opt.id)}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                      uiRole === opt.id
                        ? "border-wm-primary bg-wm-primary/10 text-wm-primary"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Routing after sign-in follows your account role in the directory. This selector sets defaults for{" "}
                <Link href={signupHref} className="font-semibold text-wm-primary underline">
                  new enrollment
                </Link>
                .
              </p>

              <div className="mt-6 grid gap-3">
                {googleHref ? (
                  <a
                    href={googleHref}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-wm-secondary shadow-sm transition hover:bg-gray-50"
                  >
                    <span aria-hidden>G</span>
                    Continue with Google
                  </a>
                ) : (
                  <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-center text-xs text-gray-500">
                    SSO requires <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> in environment.
                  </p>
                )}
                {azureHref ? (
                  <a
                    href={azureHref}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-wm-secondary shadow-sm transition hover:bg-gray-50"
                  >
                    <span aria-hidden>◆</span>
                    Continue with Microsoft
                  </a>
                ) : null}
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-medium uppercase text-gray-400">or email</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <label className="block text-sm font-medium text-wm-secondary">
                  Work email
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    className={`mt-2 w-full rounded-xl border px-4 py-3 text-base outline-none ring-wm-primary/30 focus:ring-2 ${
                      fieldErrors.email ? "border-rose-500 bg-rose-50" : "border-gray-200"
                    }`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((f) => ({ ...f, email: undefined }));
                    }}
                    aria-invalid={Boolean(fieldErrors.email)}
                  />
                  {fieldErrors.email ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.email}</p> : null}
                </label>
                <label className="block text-sm font-medium text-wm-secondary">
                  Password
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    className={`mt-2 w-full rounded-xl border px-4 py-3 text-base outline-none ring-wm-primary/30 focus:ring-2 ${
                      fieldErrors.password ? "border-rose-500 bg-rose-50" : "border-gray-200"
                    }`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((f) => ({ ...f, password: undefined }));
                    }}
                    aria-invalid={Boolean(fieldErrors.password)}
                  />
                  {fieldErrors.password ? <p className="mt-1 text-sm text-rose-600">{fieldErrors.password}</p> : null}
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <a
                    href="mailto:enterprise@wastemarketplace.com?subject=Waste%20Marketplace%20—%20password%20reset%20request&body=Work%20email%3A%20"
                    className="text-sm font-semibold text-wm-primary underline"
                  >
                    Forgot password
                  </a>
                  <a
                    href="mailto:enterprise@wastemarketplace.com?subject=Waste%20Marketplace%20—%20enterprise%20tenant%20request"
                    className="text-sm font-semibold text-gray-600 underline"
                  >
                    Enterprise / MSA request
                  </a>
                </div>

                {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                {verificationPending ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                    Didn’t get an email? Resend the verification link below.
                  </div>
                ) : null}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                {verificationPending ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={resendLoading || !email}
                    onClick={resendVerification}
                    className="w-full"
                  >
                    {resendLoading ? "Resending…" : "Resend verification email"}
                  </Button>
                ) : null}
                {resendMessage ? <p className="text-sm text-gray-600">{resendMessage}</p> : null}
              </form>
            </div>

            <p className="mt-8 text-center text-sm text-gray-600">
              Need a tenant?{" "}
              <Link href={signupHref} className="font-semibold text-wm-primary underline">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-wm-surface text-gray-600">Loading…</div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
