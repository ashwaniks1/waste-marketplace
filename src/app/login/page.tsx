import { Suspense } from "react";
import { LoginPageClient } from "./LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-cosmos-page text-sm text-slate-600">Loading…</main>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
}
