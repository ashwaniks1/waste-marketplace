"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { fieldErrorsFromZod, loginFormSchema } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <h1 className="text-center text-2xl font-bold text-slate-900">Waste Marketplace</h1>
      <p className="mt-1 text-center text-sm text-slate-600">Sign in to continue</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
        {resendMessage ? <p className="text-sm text-slate-600">{resendMessage}</p> : null}
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-teal-700">
          Create an account
        </Link>
      </p>
    </main>
  );
}
