import { test, expect } from "@playwright/test";

/**
 * Smoke: unauthenticated profile API returns 401 (no silent 200).
 * Full signup + profile E2E needs real Supabase credentials (set E2E_FULL=1 + secrets).
 */
test("GET /api/profile without session is unauthorized", async ({ request }) => {
  const res = await request.get("/api/profile");
  expect(res.status()).toBe(401);
});

test("POST /api/ensure-profile without session is unauthorized", async ({ request }) => {
  const res = await request.post("/api/ensure-profile");
  expect(res.status()).toBe(401);
});
