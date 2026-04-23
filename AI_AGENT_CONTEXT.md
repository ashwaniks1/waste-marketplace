# AI Agent Context — Waste Marketplace

Single source of truth for architecture, schema, APIs, env, and conventions. **Read this before changing code.** Update relevant sections (and **Last Updated**) when behavior, schema, routes, env, or flows change.

---

## Purpose

Mobile-first marketplace: **customers** list waste, **buyers** browse and make offers, **drivers** claim delivery pickups, **admins** oversee. **Supabase Auth** (cookies) + **PostgreSQL** (Prisma) + optional **Supabase Storage** for images.

---

## Stack

| Layer | Technology |
|--------|------------|
| App | Next.js **16** App Router (`src/app`), React **19**, Turbopack dev |
| API | Next Route Handlers under `src/app/api/**/route.ts` |
| Auth | `@supabase/ssr` — server + browser clients; roles in `app_metadata.role` |
| DB | Prisma **6** → PostgreSQL (Supabase-hosted) |
| Validation | Zod (`src/lib/validation.ts`) |
| Tests | Vitest (`npm test`) |
| Maps (driver) | `leaflet` + `react-leaflet` — **must not SSR** (see Driver UI) |

---

## Repository layout

| Path | Role |
|------|------|
| `src/app/` | Routes: marketing (`page.tsx`), role homepages, `(customer|buyer|admin|driver)/**` |
| `src/app/api/` | REST-style JSON APIs |
| `src/components/` | Shared UI (`AppShell`, `SessionActivity`, `LiveMap`, etc.) |
| `src/lib/` | Auth, Prisma singleton, HTTP helpers, domain helpers |
| `prisma/schema.prisma` | Schema source of truth |
| `prisma/migrations/` | SQL migrations |
| `docs/` | Human-facing product/phase notes |
| `AGENTS.md` | **Cursor Cloud** quirks (tmux + env injection, driver map SSR) |

---

## Architecture (high level)

1. **Browser** → Next.js pages (client components fetch `/api/*`).
2. **Middleware** `src/proxy.ts` — refreshes Supabase session from cookies on matched paths.
3. **API routes** — `requireAppUser()` (or `getSupabaseUser`) + Prisma for business data.
4. **Supabase** — Auth sessions; service role used server-side for signup admin user creation and storage uploads.

Business profile rows live in **`public.users`** (Prisma `User`), keyed by **`auth.users.id`**. Listings, offers, jobs, etc. reference `users.id`.

---

## Authentication & sessions

### Supabase

- Session persisted in **HTTP-only cookies** (Supabase SSR pattern).
- **Role** for routing: `user.app_metadata.role` — one of `customer` | `buyer` | `admin` | `driver` (set at signup via service role, not user-editable).

### Prisma profile requirement

- Most protected APIs use **`requireAppUser()`**: valid Supabase user **and** a row in `public.users`.
- **`POST /api/auth/login`**: after `signInWithPassword`, **upserts** `public.users` from Supabase metadata so legacy/auth-only users get a profile. Sets **`lastActivityAt`** to now on login.

### Idle timeout (app-level)

- **`users.last_activity_at`** tracks last activity (column `last_activity_at`).
- **`platform_settings.session_idle_minutes`** (default **60**, min **5** if set) defines idle window.
- **`requireAppUser()`**:
  - If idle exceeded → `supabase.auth.signOut()` + **`401` `"Session expired"`**.
  - Otherwise, if **`touchActivity`** is true (default), bumps `lastActivityAt` at most **once per minute**.
- **`touchActivity: false`**: validate session + idle only — **does not** bump `lastActivityAt` (for passive “peek” checks).

### Session activity API

- **`POST /api/auth/activity?mode=peek`** — does **not** extend idle clock; returns JSON: `timeoutMinutes`, `warningSeconds` (seconds until logout when inside the **last 5 minutes** of the window; `null` if not in warning window).
- **`POST /api/auth/activity?mode=touch`** (or any non-`peek` mode) — extends activity (subject to 1-minute throttle inside `requireAppUser`).

### Client: `SessionActivity` (`src/components/SessionActivity.tsx`)

- Mounted from **`AppShell`**. Uses **`peek`** on an interval and on load; **`touch`** on user events (click, keydown, etc.).
- Shows a **fixed bottom banner** with countdown when `warningSeconds` is present.
- On **`401`** from activity → logout API + redirect to `/login`.

---

## Database schema (Prisma)

**Enums (summary):** `UserRole`, `WasteType`, `ListingStatus`, `OfferStatus`, `TransportStatus`, `TransactionStatus`, `TransactionType`, `PickupJobStatus`, `CommissionKind`.

**Core models:**

| Model | Table | Notes |
|-------|--------|--------|
| `User` | `users` | `id` = Supabase auth user UUID; `last_activity_at`, profile fields |
| `WasteListing` | `waste_listings` | Seller `userId`, status, pricing, delivery flags, driver pickup fields |
| `Offer` | `offers` | Buyer offers on listings |
| `ListingComment`, `Conversation`, `Message` | `listing_comments`, `conversations`, `messages` | Social / chat |
| `TransportJob` | `transport_jobs` | Driver jobs linked to listings |
| `Transaction` | `transactions` | Money records (MVP scaffolding) |
| `Review` | `reviews` | Ratings |
| `Notification` | `notifications` | In-app notifications |
| `PlatformSettings` | `platform_settings` | Singleton `id: 1`; includes `session_idle_minutes`, driver commission default |

Apply migrations: `npx prisma migrate deploy` (and `npx prisma generate`).

---

## Key API routes (non-exhaustive)

| Area | Method | Path | Notes |
|------|--------|------|--------|
| Auth | POST | `/api/auth/signup` | Service role creates user + Prisma `users` |
| Auth | POST | `/api/auth/login` | Cookie session; upsert profile + refresh `lastActivityAt` |
| Auth | POST | `/api/auth/logout` | Clear session |
| Auth | POST | `/api/auth/activity` | Query `mode=peek` \| `touch` — idle warning / keepalive |
| Auth | POST | `/api/auth/resend-verification` | Email verification helper |
| User | GET | `/api/users/me` | Auth + profile summary |
| User | GET/PATCH | `/api/users/[id]` | Profile access rules |
| Profile | GET/PATCH | `/api/profile` | Current user profile (+ reviews aggregate); may use Supabase REST fallback for columns |
| Listings | GET/POST | `/api/listings` | Role-scoped list; buyer `?scope=mine` |
| Listings | GET/PATCH | `/api/listings/[id]` | Visibility via `canViewListing` |
| Offers | … | `/api/listings/[id]/offers`, `/api/offers/[id]/accept` | Offer lifecycle |
| Driver | GET | `/api/driver/feed` | Pickup board |
| Driver | POST | `/api/driver/listings/[id]/claim` | Claim pickup |
| Driver | GET/PATCH | `/api/driver/jobs`, `/api/driver/jobs/[id]` | Jobs |
| Maps | POST | `/api/maps/geocode` | Server-side geocode; needs `GOOGLE_MAPS_SERVER_KEY` |
| Media | POST | `/api/upload` | Multipart; Supabase Storage bucket |
| Reviews / Notifications | Various | `/api/reviews/*`, `/api/notifications/*` | As implemented in `src/app/api` |

---

## Environment variables

From `.env.example` and code:

| Variable | Required | Notes |
|----------|-----------|--------|
| `DATABASE_URL` | Yes | Pooler URL for Prisma (often `?pgbouncer=true`) |
| `DIRECT_URL` | Yes | Direct Postgres for migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Signup admin metadata, uploads — never expose |
| `ADMIN_EMAIL` | Optional | Matching email → `admin` on signup |
| `SUPABASE_STORAGE_BUCKET` | Optional | Default `listing-images` |
| `GOOGLE_MAPS_SERVER_KEY` | Optional | Geocoding route |
| `SUPABASE_REQUIRE_EMAIL_VERIFICATION` / `NEXT_PUBLIC_SUPABASE_REQUIRE_EMAIL_VERIFICATION` | Optional | Signup/login UX |

---

## User flows (product)

1. **Signup** → role selection → `POST /api/auth/signup` → redirect by role (or email verification UI if enabled).
2. **Customer** → create listing (`POST /api/listings`) → manage offers → accept → pickup / driver flow as implemented.
3. **Buyer** → open/reopened listings on home; offers; “My pickups” uses `GET /api/listings?scope=mine`.
4. **Driver** → feed + claim; map uses client-only Leaflet load (see `AGENTS.md`).
5. **Idle** → warning banner → logout if no activity until expiry.

---

## Conventions for agents

- **Do not** import `leaflet` in modules that SSR the driver page; use **`next/dynamic` with `ssr: false`** for map components.
- **Protected APIs**: use `requireAppUser()` unless the route is explicitly public.
- **Listings empty state**: distinguish **no rows** vs **401** (customer/buyer listing pages may show error string from API).
- **Cursor Cloud**: if secrets are injected after tmux started, restart tmux server so `npm run dev` sees env (see `AGENTS.md`).
- **`ERR_CONNECTION_REFUSED` on localhost:3000**: dev server not running or wrong port — run `npm run dev`, check tmux pane output.

---

## Dependencies (notable)

- `next`, `react`, `react-dom`, `@prisma/client`, `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `leaflet`, `react-leaflet`, `vitest` (dev).

---

## Last Updated

- **2026-04-23** — Created `AI_AGENT_CONTEXT.md`. Documented stack, auth, **idle session** (`requireAppUser` + `peek`/`touch` activity API + `SessionActivity`), schema summary, API index, env vars, conventions. **Code fix:** `requireAppUser({ touchActivity })` so `mode=peek` does not bump `last_activity_at`; activity route reads **`?mode=`** query (aligned with `SessionActivity`).
