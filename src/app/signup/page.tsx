"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "buyer">("customer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          address: address || undefined,
          password,
          role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Signup failed");
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
      else router.push("/customer");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <h1 className="text-center text-2xl font-bold text-slate-900">Create account</h1>
      <p className="mt-1 text-center text-sm text-slate-600">Join as a seller or buyer</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">I am a…</legend>
          <div className="mt-2 flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-3 py-3 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
              <input
                type="radio"
                name="role"
                className="sr-only"
                checked={role === "customer"}
                onChange={() => setRole("customer")}
              />
              Seller
            </label>
            <label className="flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-3 py-3 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50">
              <input
                type="radio"
                name="role"
                className="sr-only"
                checked={role === "buyer"}
                onChange={() => setRole("buyer")}
              />
              Buyer
            </label>
          </div>
        </fieldset>

        <label className="block text-sm font-medium text-slate-700">
          Full name
          <input
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Phone (optional)
          <input
            type="tel"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Default address (optional)
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password (min 8 characters)
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none ring-teal-500 focus:ring-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
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
