# Security Audit Report

Date: 2026-05-02
Scope: Next.js web app/API, Prisma data access, Supabase Storage, Supabase RLS migrations, edge function, and dependency audit for this repository.

Implementation status: primary remediations were implemented on 2026-05-02. The remaining known item is the moderate PostCSS advisory bundled through Next, which should be resolved through a safe Next upgrade rather than `npm audit fix --force`.

## Executive Summary

The app has generally good API-side ownership checks for listings, offers, conversations, notifications, and reviews. The largest risks are at the boundary between the Next.js server and direct Supabase/mobile access: Prisma route handlers bypass RLS and trust `public.users.role`, while Supabase RLS currently lets authenticated users update their entire own `public.users` row.

Fix the critical role-escalation issue first, then close the driver completion bypass and upload/content controls before production.

## Critical Findings

### 1. Authenticated users can likely escalate their own app role through Supabase RLS

Severity: Critical
Affected files:

- `prisma/migrations/20260418103000_rls_fix_profiles_locations/migration.sql:19`
- `src/lib/auth.ts:114`
- `src/lib/guards.ts:11`

Evidence:

```sql
create policy "users_update_own"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
```

The policy constrains only row ownership. It does not prevent changes to sensitive columns such as `role`, `email`, `last_activity_at`, `country_code`, `currency`, or profile coordinates. Web guards and route handlers then authorize from the Prisma `users.role` field:

```ts
const u = await prisma.user.findUnique({ where: { id: authUser.id } });
...
if (!allowed.includes(user.role)) ...
```

Impact:

If the default Supabase table grants allow authenticated `UPDATE` on `public.users` (common in Supabase projects unless revoked), a signed-in user can update their own `role` to `admin`, `driver`, or `customer`. The web app then treats them as that role on routes that use Prisma role checks. This can expose admin pages, seller actions, driver feeds, and other role-specific operations.

Recommended fix:

- Revoke direct `UPDATE` on `public.users` from `authenticated`, then expose a narrow RPC or API route for editable profile fields only.
- If direct mobile profile updates must remain, split sensitive fields out of the writable table or add a database trigger that rejects client changes to `role`, `email`, `last_activity_at`, and other server-owned fields.
- Make web authorization derive the effective role from Supabase `app_metadata.role` or compare Prisma role to app metadata and fail closed on mismatch.
- Add a regression test that attempts to update `public.users.role` through the Supabase anon client and expects denial.

## High Findings

### 2. Driver web route can complete deliveries without the buyer handoff PIN

Severity: High
Affected file: `src/app/api/driver/jobs/[id]/route.ts:71`

Evidence:

`PATCH /api/driver/jobs/:id` accepts any `TransportStatus`. When a driver sends `completed`, the route marks the listing completed:

```ts
if (parsed.status === TransportStatus.completed && job.listing.status === ListingStatus.accepted) {
  await prisma.wasteListing.update({
    data: {
      status: ListingStatus.completed,
      pickupJobStatus: PickupJobStatus.completed,
    },
  });
}
```

The project context says mobile uses an RPC to verify the buyer PIN before completing transport. This web route bypasses that safeguard.

Impact:

An assigned driver can prematurely complete a marketplace delivery without buyer confirmation. That can corrupt marketplace state and enable fraud if payments or settlement are later added.

Recommended fix:

- Remove `completed` from this generic PATCH route, or require `{ pin }` and verify it with the same database logic as `driver_complete_transport_with_pin`.
- Enforce valid transitions, for example `scheduled -> in_transit -> completed`, and reject arbitrary jumps or cancelled-to-completed changes.
- Consume `delivery_handoff_secrets.consumed_at` in the same transaction that completes the listing.

### 3. Listing uploads use service role and do not validate image content

Severity: High
Affected files:

- `src/app/api/upload/route.ts:15`
- `src/app/api/profile/avatar/route.ts:9`

Evidence:

Listing uploads accept any `File` under 5 MB and store it in a public bucket with the browser-provided `contentType`:

```ts
if (file.size > MAX_BYTES) return jsonError("File too large (max 5MB)", 400);
...
contentType: file.type || "application/octet-stream",
```

Avatar uploads check `file.type`, but still trust the browser-provided MIME and derive the stored extension from the original filename.

Impact:

Attackers can upload non-image content or image/polyglot content into public Supabase Storage using the server's service role. Depending on browser/content-type behavior and bucket configuration, this can create stored content abuse, malware hosting, or XSS risk.

Recommended fix:

- Validate magic bytes with a server-side parser such as `file-type`, `sharp`, or equivalent.
- Re-encode uploaded images to safe formats before storing them.
- Enforce allowed MIME types for listing photos, not just avatars.
- Generate canonical server-side extensions from detected content, not filenames.
- Prefer private buckets with signed read URLs for production.

## Medium Findings

### 4. Public user profile API exposes non-self addresses

Severity: Medium
Affected file: `src/app/api/users/[id]/route.ts:110`

Evidence:

For other users, the API hides email and phone but still returns address:

```ts
profile = {
  id,
  name,
  role,
  avatarUrl,
  email: null,
  phone: null,
  address: user.address,
}
```

Impact:

Any authenticated user can fetch another user's saved profile address by UUID. This is more sensitive than the public profile subset created in `user_public_profiles` and may expose personal or business locations outside listing context.

Recommended fix:

- Remove `address` from non-self profile responses.
- Use `user_public_profiles` as the public source of truth.
- Return approximate location or ZIP only when product requirements need it.

### 5. Unauthenticated resend-verification route uses admin invite flow and leaks provider errors

Severity: Medium
Affected file: `src/app/api/auth/resend-verification/route.ts:10`

Evidence:

The endpoint is unauthenticated, rate-limited in memory, and calls:

```ts
service.auth.admin.inviteUserByEmail(body.email.trim())
```

It returns Supabase error messages directly.

Impact:

This can be abused for email spam/invites and account enumeration. It may also create new invited users instead of strictly resending confirmation for an existing pending account, depending on Supabase behavior.

Recommended fix:

- Use the proper resend/OTP verification flow for existing users only.
- Return a generic success response regardless of account existence.
- Add CAPTCHA or stronger abuse controls for unauthenticated email endpoints.
- Avoid returning raw provider errors to clients.

### 6. Rate limiting is in-memory and not production-robust

Severity: Medium
Affected files:

- `src/lib/rateLimit.ts:1`
- `src/proxy.ts:1`

Evidence:

The limiter stores request timestamps in a process-local `Map`.

Impact:

Limits reset on deploy/restart and are bypassable across multiple serverless instances or regions. Auth, signup, profile, and resend endpoints need shared counters in production.

Recommended fix:

- Move rate limiting to a shared store such as Upstash Redis, Supabase-backed counters, or platform edge rate limits.
- Key on both IP and normalized account identifier for auth endpoints.
- Add long-window limits for email-sending endpoints.

### 7. Geocoding endpoints can burn server-side Google quota

Severity: Medium
Affected files:

- `src/app/api/maps/geocode/route.ts:14`
- `src/app/api/maps/reverse-geocode/route.ts:21`

Evidence:

Authenticated users can call Google geocoding without route-specific rate limits.

Impact:

A compromised or low-trust account can consume map API quota and generate cost.

Recommended fix:

- Add per-user and per-IP rate limits to both map endpoints.
- Cache repeated geocode/reverse-geocode requests.
- Restrict the Google key by API and server egress/IP where possible.

### 8. Missing security headers/CSP in Next config

Severity: Medium
Affected file: `next.config.ts:3`

Evidence:

`next.config.ts` only configures remote image patterns. There are no app-level headers for Content Security Policy, frame protection, referrer policy, MIME sniffing protection, or permissions policy.

Impact:

Any future XSS or uploaded-content issue has a larger blast radius. Clickjacking and unexpected browser capability exposure are also easier.

Recommended fix:

- Add `headers()` in `next.config.ts` with at least:
  - `Content-Security-Policy`
  - `X-Frame-Options: DENY` or `frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` limiting geolocation/camera/microphone as appropriate
- Test CSP with Supabase Storage images, Google/OSM maps, and Sentry before enforcing broadly.

## Dependency Findings

### 9. `npm audit` reports vulnerable PostCSS bundled through Next

Severity: Moderate
Command: `npm audit --audit-level=moderate`

Result:

- `postcss < 8.5.10`
- Advisory: `GHSA-qx2v-qp2m-jg93`
- Path: `node_modules/next/node_modules/postcss`
- Reported through `next`

NPM suggested `npm audit fix --force`, but that would install an old/breaking Next version according to the audit output. Do not apply that blindly.

Recommended fix:

- Upgrade Next to a version whose bundled PostCSS is patched once available and compatible.
- Track the advisory and verify with `npm audit` after the upgrade.

## Positive Controls Observed

- API route errors avoid logging request bodies and PII in `src/lib/http.ts`.
- Most business mutations use explicit ownership checks before Prisma writes.
- Conversations and messages check buyer/seller/admin access.
- Delivery claim uses a transaction and `updateMany` race guard.
- Supabase service role is kept in server-only helper code and was not found in client components.
- `.env.example` does not contain real secrets.

## Suggested Fix Order

1. Lock down `public.users` RLS/grants and make role authorization fail closed.
2. Require/centralize PIN verification for driver delivery completion.
3. Harden Storage upload validation and bucket privacy.
4. Remove address from non-self public profile responses.
5. Replace in-memory rate limiting for auth/email/map endpoints.
6. Add security headers and CSP.
7. Resolve dependency advisory through a safe Next upgrade.

## Verification Checklist For Fixing Agents

- Try direct Supabase anon-client update: `public.users.role = 'admin'`; it must fail.
- Confirm web admin layout rejects users whose Prisma role and Supabase app metadata disagree.
- Attempt driver completion without PIN through `/api/driver/jobs/:id`; it must fail.
- Attempt upload of a renamed text/HTML file as `.jpg`; it must fail.
- Fetch another user's profile and confirm email, phone, and address are absent.
- Run `npm audit --audit-level=moderate` and document remaining advisories.
