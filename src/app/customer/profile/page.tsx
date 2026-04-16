"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";

type Me = {
  role: string;
  profile: {
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    role: string;
  } | null;
};

export default function CustomerProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to load");
      else setMe(data);
    })();
  }, []);

  return (
    <>
      <AppHeader title="Profile" backHref="/customer" role="customer" />
      <div className="space-y-4 px-4 pt-6">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {!me ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{me.profile?.name}</p>
            <p className="text-sm text-slate-600">{me.profile?.email}</p>
            {me.profile?.phone ? (
              <a href={`tel:${me.profile.phone}`} className="mt-2 block text-teal-700">
                {me.profile.phone}
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No phone on file</p>
            )}
            {me.profile?.address ? (
              <p className="mt-2 text-sm text-slate-700">{me.profile.address}</p>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
