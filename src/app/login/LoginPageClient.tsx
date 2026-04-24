"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AIAuthIllustration } from "@/components/AIAuthIllustration";
import { Button } from "@/components/Button";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { fieldErrorsFromZod, loginFormSchema } from "@/lib/validation";

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    const q = searchParams.get("error");
    if (q === "oauth") setError("Google sign-in did not complete. Try again or use email.");
    if (q === "session") setError("Session expired. Sign in again.");
  }, [searchParams]);

  async function signInWithGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const origin = window.location.origin;
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/complete")}`,
        },
      });
      if (oauthError) {
        setError(oauthError.message);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Could not start Google sign-in.");
    } finally {
      setGoogleLoading(false);
    }
  }

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
    <main className="min-h-dvh bg-slate-50">
      <div className="mx-auto grid min-h-dvh max-w-6xl lg:grid-cols-2">
        <div className="relative hidden flex-col justify-center p-10 lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950" />
          <div className="relative z-10 px-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Waste Marketplace</p>
            <h1 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-white">Sign in to list, buy, or run pickups.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Same account for sellers, buyers, and drivers — your role decides which tools you see after login.
            </p>
            <div className="mt-10 max-w-lg">
              <AIAuthIllustration />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center px-4 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-4 flex justify-end lg:justify-start">
              <Link
                href="/"
                className="text-sm font-semibold text-teal-700 transition hover:text-teal-900"
              >
                ← Home
              </Link>
            </div>
            <h2 className="text-center text-2xl font-bold text-slate-900 lg:text-left">Sign in</h2>
            <p className="mt-1 text-center text-sm text-slate-600 lg:text-left">Use Google or your email and password.</p>

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="text-lg" aria-hidden>
                  G
                </span>
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              <div className="relative py-2 text-center text-xs text-slate-500">
                <span className="relative z-10 bg-slate-50 px-2">or email</span>
                <span className="absolute inset-x-0 top-1/2 z-0 h-px -translate-y-1/2 bg-slate-200" />
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-2 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2 ${
                    fieldErrors.email ? "border-rose-500 bg-rose-50" : "border-slate-200"
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((f) => ({ ...f, email: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                />
                {fieldErrors.email ? (
                  <p id="login-email-error" className="mt-1 text-sm text-rose-600" role="alert">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  className={`mt-1 w-full rounded-xl border px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2 ${
                    fieldErrors.password ? "border-rose-500 bg-rose-50" : "border-slate-200"
                  }`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((f) => ({ ...f, password: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                />
                {fieldErrors.password ? (
                  <p id="login-password-error" className="mt-1 text-sm text-rose-600" role="alert">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </label>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              {verificationPending ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Didn’t get an email? Use the button below to resend the confirmation link.
                </div>
              ) : null}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in…" : "Sign in with email"}
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
              {resendMessage ? <p className="text-sm text-slate-600">{resendMessage}</p> : null}
            </form>

            <p className="mt-6 text-center text-sm text-slate-600 lg:text-left">
              New here?{" "}
              <Link href="/signup" className="font-semibold text-teal-700">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
