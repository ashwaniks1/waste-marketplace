# AI Agent Project Context Document

This document covers the combined Waste Marketplace system:

- Web/API repo: `waste-marketplace` (this repository)
- Mobile repo: GitHub `ashwaniks1/waste-marketplace-mobile`
- Local mobile checkout in this workspace: `../waste-marketplace-ios`

Critical system fact:

- The web app uses Next.js route handlers plus Prisma.
- The mobile app mostly talks directly to Supabase tables, views, storage, realtime channels, and SQL RPCs under RLS.
- Because of that split, the Prisma schema is not the whole backend. Several mobile-critical DB objects exist only in SQL migrations and are not represented in `prisma/schema.prisma`.

## Project Overview

- Waste Marketplace is a multi-role marketplace for recyclable or reusable waste/materials.
- Sellers (`customer` in the DB, shown as "seller" in mobile UI) create listings with title, waste type, quantity, photos, address, price, and optional delivery.
- Buyers browse listings, place offers, comment publicly on open listings, open private conversations, track accepted pickups, and submit reviews after completion.
- Drivers browse delivery jobs, claim pickups, share live location, and complete transport with a handoff PIN in the mobile flow.
- Admins can view high-level metrics, listings, and users, and there is an edge-function-based orphan-user health check.

Problem solved:

- Organizes the full waste resale flow in one system instead of splitting listing, negotiation, messaging, delivery coordination, and trust/reviews across multiple tools.

Target users:

- Sellers generating waste or scrap
- Buyers/recyclers/scrap dealers
- Drivers handling marketplace delivery
- Admin/operators

High-level architecture:

- Web: browser -> Next.js App Router pages -> route handlers -> Prisma -> Supabase Postgres
- Mobile: Expo app -> Supabase Auth/Data API/Realtime/Storage/RPC
- Shared services: Supabase Auth, Postgres, Storage, Realtime
- Server-only services: Prisma, service-role Supabase client, Google Geocoding, Sentry

## Tech Stack

| Area | Web/API repo | Mobile repo |
| --- | --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS | Expo 54, React Native 0.81, React Navigation |
| Backend | Next.js route handlers under `src/app/api` | No standalone app server; direct Supabase access plus one call to the web API |
| Database | Supabase Postgres via Prisma 6 and raw SQL migrations | Supabase Postgres via `@supabase/supabase-js` |
| Auth | Supabase Auth with SSR cookies and email/password | Supabase Auth with persisted mobile session |
| Storage | Supabase Storage via service role for web uploads | Supabase Storage direct from mobile under RLS |
| Realtime | Mostly polling on web | Supabase Realtime for chat, notifications, live tracking |
| Maps/geo | Google Geocoding server route, Leaflet + OpenStreetMap tiles, browser geolocation | Expo Location, `react-native-maps`, OS map deep links |
| Validation | Zod in `src/lib/validation.ts` | Custom validation helpers in `src/utils/profileValidation.ts` |
| Error reporting | Optional Sentry (`src/instrumentation.ts`, `src/lib/http.ts`) | No active runtime Sentry wiring in code |
| Testing | Vitest, Playwright, GitHub Actions CI | Vitest, manual Maestro flow docs |
| Suggested hosting | Vercel + Supabase | Expo dev client / simulator; no production deployment config in repo |

Third-party services:

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Realtime
- Google Maps Geocoding API
- Sentry
- OpenStreetMap tiles
- Expo Notifications

## App Features

### Authentication

- Email/password signup, login, logout
- Optional email verification with resend endpoint
- Role-based routing after login
- Idle session expiry enforced server-side through `platform_settings.session_idle_minutes`
- Profile self-healing when `auth.users` exists but `public.users` is missing
- Mobile bearer-token support for a small set of web endpoints

### Core Product Features

- Seller listing creation with:
  - title
  - waste type
  - quantity
  - description
  - photo uploads
  - address
  - asking price and currency
  - optional delivery fee
  - optional coordinates
  - optional pickup ZIP
  - optional driver commission override
- Buyer browse feed
- Offer create/update/withdraw/accept/decline
- Public listing comments
- Private seller/buyer conversations
- Profile pages with reviews and open listings
- Review create/update/delete
- Notifications table with unread tracking

### User Flows

- Seller flow:
  - web seller routes use a persistent 3-column workspace:
    - left rail for all seller listings
    - center canvas for selected listing details or forms
    - right rail for buyer inbox and active chat
    - desktop seller layout is fixed-height so the three panels stay visible together and each panel scrolls internally
  - create listing
  - edit listing while active
  - review pending offers
  - accept or decline offers
  - comment on listing
  - chat with interested buyers
  - mark no-show
  - reopen no-show listing
- Buyer flow:
  - browse open/reopened listings
  - make offer or offer asking price
  - withdraw pending offer
  - chat privately with seller
  - see accepted pickup
  - confirm marketplace delivery release for drivers
  - mark completed pickup
  - review seller and driver after completion
- Driver flow:
  - browse available delivery jobs
  - filter by distance, waste type, or payout
  - claim pickup
  - get transport job
  - filter assigned work by active, available, completed, or all
  - review a separate earnings tab with statement-style posted and pending payout rows
  - share live location
  - update transport status
  - complete with buyer PIN in mobile RPC flow
- Admin flow:
  - view dashboard metrics
  - browse all listings
  - browse all users
  - inspect orphan auth users through a Supabase edge function + RPC

### Admin Features

- `ADMIN_EMAIL` can auto-promote matching signup email to `admin`
- Admin dashboard metrics:
  - total users
  - total listings
  - open listings
  - completed listings in last 7 days
- Admin listing and user views are read-only in the current UI
- Admin can use service-role-backed user fallback lookup

### Background Jobs / Automation

- No queue worker or cron service in repo
- SQL triggers handle:
  - seller notification on new pending offer
  - peer notification on new chat message
  - `conversations.updated_at` bump on new message
  - sync from `users` to `user_public_profiles`
  - profile row creation from `auth.users`
- Web code also emits notifications for:
  - accepted offers
  - driver claim
  - driver job completion

### Realtime Features

- Mobile chat message subscription via Supabase Realtime
- Mobile notification subscription via Supabase Realtime
- Mobile live driver location subscription via Supabase Realtime
- Web chat and notification UI mostly poll instead of subscribing

### Notifications

- Stored in `public.notifications`
- Web notification bell polls REST endpoints
- Mobile notifications screen listens for realtime inserts
- Mobile also schedules local device notifications from incoming DB events

### Payments

- No payment processor integration
- `transactions` table exists but there is no Stripe/payment gateway flow
- Prices, delivery fees, and driver commission amounts are tracked as business data only

## System Architecture

### How Frontend Talks to Backend

- Web pages call internal REST endpoints under `src/app/api`
- Web route handlers use Prisma and sometimes the Supabase service role
- Mobile uses `@supabase/supabase-js` directly against:
  - tables
  - views
  - storage buckets
  - realtime channels
  - RPC functions
- Mobile calls the web API only for `POST /api/ensure-profile`

### API Structure

- Cookie-authenticated REST routes for the web app
- Limited bearer-token support for mobile on:
  - `POST /api/ensure-profile`
  - `GET /api/profile`
  - `PATCH /api/profile`
  - `GET /api/users/me`
- Direct Supabase DB API access on mobile for marketplace data
- SQL RPCs for sensitive driver/buyer delivery workflows

### Data Flow

- Web signup:
  - service role creates Supabase Auth user with `app_metadata.role`
  - Prisma upserts `public.users`
- Mobile signup:
  - client creates Supabase Auth user
  - DB trigger or `/api/ensure-profile` creates `public.users`
  - if no role metadata is present, current fallback behavior defaults to `buyer`
- Listing flow:
  - seller creates listing
  - buyer creates pending offer
  - seller accepts one offer
  - listing becomes `accepted`
  - pickup window starts
  - buyer can complete, or driver flow can take over when delivery is used
- Delivery flow:
  - buyer confirms release for drivers
  - driver claims listing
  - transport job created
  - driver shares live location
  - mobile RPC verifies buyer PIN and completes delivery

### Important Services

- `src/lib/auth.ts`
  - session lookup
  - role lookup
  - idle timeout enforcement
- `src/lib/ensureAppUserProfile.ts`
  - repairs or creates `public.users` rows
- `src/components/BuyerDriverInboxFloat.tsx`
  - buyer/driver floating chat panel launched from the app shell instead of full-page navigation
- `src/lib/listing-visibility.ts`
  - read-access rules by role
- `src/lib/pickup-window.ts`
  - 24h pickup deadline and 24h extension logic
- `src/lib/commission.ts`
  - driver payout calculation
- `src/lib/serialize.ts` and `src/lib/serialize-offer.ts`
  - normalize Prisma decimals to JSON numbers
- `src/proxy.ts`
  - auth redirects
  - coarse API rate limits

### External Integrations

- Google Geocoding through `POST /api/maps/geocode`
- Sentry server error capture if DSN is configured
- Supabase edge function `admin-orphan-users`
- OpenStreetMap tiles on web maps

## Database Schema

### Core Prisma Models

| Object | Kind | Purpose / important fields |
| --- | --- | --- |
| `users` | table | Profile row keyed to `auth.users.id`; stores `role`, names, phone, address, country, currency, timezone, avatar, coordinates, `last_activity_at` |
| `waste_listings` | table | Marketplace listing; key fields include `title`, `waste_type`, `asking_price`, `status`, `accepted_by`, `delivery_required`, `pickup_job_status`, coordinates, commission snapshot, privacy flags |
| `offers` | table | Buyer offers on listings; `status` is `pending/accepted/declined/withdrawn` |
| `listing_comments` | table | Listing discussion thread visible to listing readers |
| `conversations` | table | One row per `(listing_id, buyer_id)` private thread |
| `messages` | table | Chat messages within a conversation; new web/API messages are stored as AES-GCM envelopes in `body` and decrypted only by participant APIs |
| `transport_jobs` | table | Driver delivery jobs tied to listings |
| `transactions` | table | Payment ledger placeholder; not wired to a gateway |
| `reviews` | table | Ratings and optional review text |
| `platform_settings` | table | Singleton config row (`id = 1`) for default driver commission and session idle timeout |
| `notifications` | table | User notifications with read tracking |
| `delivery_handoff_secrets` | table | Buyer/seller-readable delivery PIN; intentionally hidden from drivers |
| `driver_profile_blocks` | table | Hides buyer/seller profile details from drivers after completed delivery |

### SQL-Only Tables / Views / Functions Used by Mobile

These are required even though they are not in `prisma/schema.prisma`.

| Object | Kind | Purpose |
| --- | --- | --- |
| `user_public_profiles` | table | Safe public subset of user profile fields for cross-user profile views |
| `listing_public_feed` | view | Mobile feed source with seller profile join and delivery/privacy fields |
| `listing_live_locations` | table | Latest driver coordinates per listing for live tracking |
| `driver_claim_pickup(uuid)` | RPC | Claims driver job and creates transport job |
| `driver_set_transport_status(uuid, status)` | RPC | Updates transport status for driver |
| `driver_complete_transport_with_pin(uuid, pin)` | RPC | Completes delivery after PIN verification |
| `buyer_confirm_marketplace_delivery(uuid)` | RPC | Releases delivery job to drivers |
| `admin_list_orphan_auth_user_ids()` | RPC | Edge/admin-only health check for auth/profile drift |
| `on_offer_created_notify()` | trigger function | Creates seller notification on new offer |
| `on_message_created_notify()` | trigger function | Creates generic peer notification without copying private message text and bumps conversation timestamp |
| `wmp_handle_new_auth_user()` | trigger function | Mirrors new auth users into `public.users` |
| `private.sync_user_public_profile()` | trigger function | Keeps `user_public_profiles` in sync with `users` |

### Relationships

- `users.id` mirrors `auth.users.id`
- `waste_listings.user_id` -> seller
- `waste_listings.accepted_by` -> buyer who won the listing
- `waste_listings.assigned_driver_id` -> assigned driver
- `offers.listing_id` + `offers.buyer_id`
- `conversations.listing_id` + `conversations.buyer_id`
- `messages.conversation_id`
- `transport_jobs.listing_id`, `transport_jobs.driver_id`, `transport_jobs.requester_id`
- `reviews.listing_id`, `reviews.from_user_id`, `reviews.to_user_id`

### Enums

- `UserRole`: `customer`, `buyer`, `admin`, `driver`
- `WasteType`: `PLASTIC`, `PAPER`, `CARDBOARD`, `METAL`, `GLASS`, `E_WASTE`, `ORGANIC`, `MIXED`, `CUSTOM`
- `ListingStatus`: `open`, `accepted`, `in_progress`, `completed`, `cancelled`, `no_show`, `reopened`
- `OfferStatus`: `pending`, `accepted`, `declined`, `withdrawn`
- `TransportStatus`: `scheduled`, `in_transit`, `completed`, `cancelled`
- `TransactionStatus`: `pending`, `paid`, `failed`, `refunded`
- `TransactionType`: `deposit`, `payout`, `fee`
- `PickupJobStatus`: `none`, `available`, `claimed`, `assigned`, `completed`
- `CommissionKind`: `percent`, `fixed`

### Important Constraints and Indexes

- `users.email` unique
- `conversations(listing_id, buyer_id)` unique
- `reviews(from_user_id, to_user_id)` unique
- `waste_listings` indexed by `status`, `user_id`, `accepted_by`
- `offers` indexed by `listing_id`, `buyer_id`
- `transport_jobs` indexed by `listing_id`, `driver_id`, `requester_id`
- `notifications` indexed by `(user_id, read_at)`
- `driver_profile_blocks` primary key on `(driver_id, blocked_user_id)`
- `listing_live_locations` indexed by `driver_id`

### Multi-Tenant Logic

- This is a single-tenant marketplace, not an org/workspace SaaS
- Data isolation is per authenticated user and role
- Mobile security relies on PostgreSQL RLS, not on hidden client code

## API Specification

General notes:

- Web REST responses usually return camelCase JSON
- Prisma decimal fields are converted to numbers in web API responses
- Direct Supabase rows in mobile stay in snake_case and often return decimal values as strings
- REST errors are generally `{ "error": string }`

### Auth and Session

| Route | Method | Purpose | Request shape | Response shape |
| --- | --- | --- | --- | --- |
| `/api/auth/signup` | `POST` | Create auth user + app profile | `{ firstName, lastName, email, password, confirmPassword, phone?, address?, role, marketRegion? ('IN' \| 'US'), vehicleType?, licenseNumber?, availability?, gstNumber?, ein? }` | `{ id, email, role }` |
| `/api/auth/login` | `POST` | Password login and set Supabase SSR cookies | `{ email, password }` | `{ ok: true }` |
| `/api/auth/logout` | `POST` | Sign out current session | none | `{ ok: true }` |
| `/api/auth/resend-verification` | `POST` | Resend verification email | `{ email }` | `{ ok: true }` |
| `/api/auth/activity` | `POST` | Idle check / keepalive: `?mode=peek` (no `last_activity_at` bump; returns `timeoutMinutes`, `warningSeconds`) or `?mode=touch` (may bump activity) | none | `{ ok, lastActivityAt?, timeoutMinutes?, warningSeconds? }` or `401` |

### Users and Profile

| Route | Method | Purpose | Request shape | Response shape |
| --- | --- | --- | --- | --- |
| `/api/ensure-profile` | `POST` | Create/repair `public.users` row; supports cookie or bearer auth | none | `{ profile, created, avatarColumnAvailable, reviewSummary }` |
| `/api/users/me` | `GET` | Return auth user + Prisma profile; supports cookie or bearer auth | none | `{ role, auth: { id, email }, profile }` |
| `/api/users/:id` | `GET` | Public-ish user profile, review summary, recent reviews, open listings | none | `{ profile, reviewSummary, reviews, openListings, viewerId }` |
| `/api/profile` | `GET` | Load current profile; supports cookie or bearer auth | none | `{ profile, avatarColumnAvailable, reviewSummary }` |
| `/api/profile` | `PATCH` | Update current profile; heals a missing `public.users` row before update and best-effort syncs safe display fields to Supabase Auth `user_metadata` | `{ name?, firstName?, lastName?, phone?, address?, avatarUrl?, zipCode?, countryCode? }` | `{ profile, avatarColumnAvailable }` |
| `/api/profile/avatar` | `POST` | Upload avatar image to storage | multipart `file` | `{ url, path }` |

### Listings

| Route | Method | Purpose | Request shape | Response shape |
| --- | --- | --- | --- | --- |
| `/api/listings` | `GET` | Role-scoped listings list; **buyer** open feed supports `?wasteType=`, `?q=` (title/address), `?sort=` (`newest` \| `price_asc` \| `price_desc`); buyer `?scope=mine` for accepted listings | query `scope?`, `wasteType?`, `q?`, `sort?` | `Listing[]` |
| `/api/listings` | `POST` | Create seller listing | `{ title, wasteType, quantity, description?, images[], address, askingPrice, currency?, deliveryAvailable?, deliveryFee?, latitude?, longitude?, deliveryRequired?, pickupZip?, commissionKind?, driverCommissionPercent?, driverPayoutFixed? }` | `Listing` |
| `/api/listings/:id` | `GET` | Read single listing if viewer can access it | none | `Listing` plus accepted-offer info and optional `handoffPin` |
| `/api/listings/:id` | `PATCH` | Edit listing | partial listing fields | updated `Listing` |
| `/api/listings/:id/cancel` | `POST` | Seller cancel open listing | none | updated `Listing` |
| `/api/listings/:id/complete` | `POST` | Accepting buyer marks listing complete | none | updated `Listing` |
| `/api/listings/:id/no-show` | `POST` | Seller marks accepted listing as no-show | `{ reason? }` | updated `Listing` |
| `/api/listings/:id/reopen` | `POST` | Seller reopens no-show listing | none | updated `Listing` |
| `/api/listings/:id/extend-pickup` | `POST` | Seller extends pickup deadline by 24h | none | updated `Listing` |
| `/api/listings/:id/confirm-marketplace-delivery` | `POST` | Buyer/admin releases delivery job to drivers | none | updated `Listing` |

### Offers, Comments, and Conversations

| Route | Method | Purpose | Request shape | Response shape |
| --- | --- | --- | --- | --- |
| `/api/listings/:id/offers` | `GET` | Seller/admin sees all offers; buyer sees own | none | `Offer[]` |
| `/api/listings/:id/offers` | `POST` | Buyer create or update one pending offer | `{ amount, currency? }` | `Offer` |
| `/api/offers/:id/accept` | `POST` | Seller/admin accepts offer and declines other pendings | none | `{ listing, offer }` |
| `/api/offers/:id/decline` | `POST` | Seller/admin declines pending offer | none | `Offer` |
| `/api/offers/:id/withdraw` | `POST` | Buyer withdraws pending offer | none | `Offer` |
| `/api/listings/:id/comments` | `GET` | Fetch comments visible to listing reader | none | `Comment[]` |
| `/api/listings/:id/comments` | `POST` | Seller comment or buyer comment on open listing | `{ body }` | `Comment` |
| `/api/listings/:id/conversations` | `GET` | Seller/admin fetches threads; buyer fetches own | none | `Conversation[]` |
| `/api/listings/:id/conversations` | `POST` | Buyer opens or reuses private thread | none | `Conversation` |
| `/api/conversations` | `GET` | List conversations where user is buyer or listing seller; buyers and customers only (others get `[]`) | none | `Conversation[]` (includes listing, buyer, latest message) |
| `/api/conversations/:id` | `GET` | Conversation metadata for buyer or listing seller only | none | `Conversation` |
| `/api/conversations/:id/messages` | `GET` | Fetch decrypted chat history for buyer or listing seller only | none | `Message[]` |
| `/api/conversations/:id/messages` | `POST` | Encrypt and store chat message for buyer or listing seller only | `{ body }` | decrypted `Message` |

### Driver

| Route | Method | Purpose | Request shape | Response shape |
| --- | --- | --- | --- | --- |
| `/api/driver/feed` | `GET` | Driver pickup feed | query `miles?`, `lat?`, `lng?`, `wasteType?`, `sort?` | `Listing[]` enriched with `distanceMiles`, payout estimates, accepted-offer fields |
| `/api/driver/listings/:id/claim` | `POST` | Driver claims delivery job | none | `{ listing, jobId }` |
| `/api/driver/jobs` | `GET` | Driver's jobs with listing details | none | `TransportJob[]` |
| `/api/driver/jobs/:id` | `GET` | Single driver job detail | none | `TransportJob` |
| `/api/driver/jobs/:id` | `PATCH` | Update job status/notes | `{ status?, notes? }` | updated `TransportJob` |

### Reviews and Notifications

| Route | Method | Purpose | Request shape | Response shape |
| --- | --- | --- | --- | --- |
| `/api/reviews` | `POST` | Create review after completed pickup | `{ listingId, toUserId, score, body? }` | `Review` |
| `/api/reviews/status` | `GET` | Check if current user already reviewed recipient | query `toUserId` | `{ hasReview, review }` |
| `/api/reviews/:id` | `PATCH` | Edit own review | `{ score?, body? }` | updated `Review` |
| `/api/reviews/:id` | `DELETE` | Delete own review | none | `{ ok: true }` |
| `/api/notifications` | `GET` | Recent notifications for current user | query `limit?` | `{ items, unreadCount }` |
| `/api/notifications/:id` | `PATCH` | Mark one notification read | none | `{ ok: true }` |
| `/api/notifications/:id` | `DELETE` | Delete one notification | none | `{ ok: true }` |
| `/api/notifications/read-all` | `POST` | Mark all notifications read | none | `{ ok: true }` |

### Utility

| Route | Method | Purpose | Request shape | Response shape |
| --- | --- | --- | --- | --- |
| `/api/upload` | `POST` | Upload listing photo using service role | multipart `file` | `{ url, path }` |
| `/api/maps/geocode` | `POST` | Server-side address geocoding | `{ address }` | `{ latitude, longitude }` |

### Supabase API Surfaces Used Directly by Mobile

Mobile reads/writes these directly, so changes here require DB/RLS awareness:

- tables:
  - `users`
  - `waste_listings`
  - `offers`
  - `conversations`
  - `messages`
  - `notifications`
  - `reviews`
  - `transport_jobs`
  - `platform_settings`
  - `delivery_handoff_secrets`
  - `driver_profile_blocks`
  - `listing_live_locations`
- views:
  - `listing_public_feed`
  - `user_public_profiles`
- storage buckets:
  - `listing-photos`
  - `avatars`
- RPCs:
  - `driver_claim_pickup`
  - `driver_set_transport_status`
  - `driver_complete_transport_with_pin`
  - `buyer_confirm_marketplace_delivery`

## Folder Structure Explained

### Web/API Repo

| Path | Responsibility | Put new code here when... |
| --- | --- | --- |
| `src/app` | Next.js pages, layouts, and route handlers | adding web pages or REST endpoints |
| `src/app/api` | Server-side HTTP API | logic must stay server-side or use service role / cookies |
| `src/components` | Web UI components and client-side interactions | adding/reusing interface pieces |
| `src/components/ds` | Design-system primitives | building reusable UI tokens and shells |
| `src/lib` | Auth, validation, domain helpers, serialization, clients | business rules or shared server utilities |
| `src/lib/supabase` | SSR/client/service-role Supabase clients | changing how web talks to Supabase |
| `prisma/schema.prisma` | Prisma models | changing Prisma-backed tables or enums |
| `prisma/migrations` | Raw SQL migrations | changing schema, RLS, views, triggers, or RPCs |
| `supabase/functions` | Supabase edge functions | adding edge-admin utilities |
| `e2e` | Playwright smoke tests | adding web E2E coverage |
| `scripts` | DB/schema tooling | adding local/CI health checks |
| `docs` | Historical planning notes | adding project docs, not runtime behavior |

### Mobile Repo

| Path | Responsibility | Put new code here when... |
| --- | --- | --- |
| `../waste-marketplace-ios/src/screens` | Screen-level UI and flows | adding or modifying mobile user journeys |
| `../waste-marketplace-ios/src/navigation` | React Navigation stacks/tabs | wiring new screens into nav |
| `../waste-marketplace-ios/src/providers` | Session/timezone context | changing app-wide state or formatting |
| `../waste-marketplace-ios/src/lib` | Supabase access, storage uploads, chat helpers | changing mobile backend integration |
| `../waste-marketplace-ios/src/components` | Mobile cards and reusable visual components | adding shared mobile UI |
| `../waste-marketplace-ios/maestro` | Manual mobile smoke automation | documenting or adding mobile smoke flows |

Where new code should go:

- Web-only UI change: `src/app` or `src/components`
- Web REST/business rule: `src/app/api` plus likely `src/lib`
- Shared DB or mobile-visible change: `prisma/migrations` first, then web/mobile callers
- Mobile-only UX change: `../waste-marketplace-ios/src/screens` and `src/navigation`
- Cross-stack feature: update all of these together:
  - Prisma schema if the table is Prisma-managed
  - SQL migrations for RLS/views/triggers/RPCs
  - web route handlers
  - mobile Supabase callers

## Environment Variables

### Web/API Repo

| Variable | Purpose | Required |
| --- | --- | --- |
| `DATABASE_URL` | Prisma runtime connection | Yes |
| `DIRECT_URL` | Prisma migrate/direct connection | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role access for signup, uploads, fallback user lookup | Yes for most server features |
| `ADMIN_EMAIL` | Signup emails matching this become admin | Optional |
| `SUPABASE_STORAGE_BUCKET` | Overrides web listing photo bucket; default is `listing-images` | Optional |
| `GOOGLE_MAPS_SERVER_KEY` | Enables `/api/maps/geocode` | Optional |
| `SENTRY_DSN` | Enables server-side Sentry capture | Optional |
| `SENTRY_TRACES_SAMPLE_RATE` | Sentry traces sample rate | Optional |
| `SUPABASE_REQUIRE_EMAIL_VERIFICATION` | Server-side signup verification behavior | Optional |
| `NEXT_PUBLIC_SUPABASE_REQUIRE_EMAIL_VERIFICATION` | Client-side signup page verification messaging | Optional |
| `PLAYWRIGHT_BASE_URL` | Playwright base URL | Optional/test only |
| `PLAYWRIGHT_SKIP_WEBSERVER` | Skip Playwright dev server launch | Optional/test only |
| `CI` | CI behavior for retries/workers | Optional/CI only |

Supabase edge function secrets:

| Variable | Purpose | Required |
| --- | --- | --- |
| `ADMIN_ORPHAN_SECRET` | Protects `admin-orphan-users` function | Yes for that function |
| `SUPABASE_URL` | Edge function Supabase project URL | Yes for that function |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge function RPC access | Yes for that function |

### Mobile Repo

| Variable | Purpose | Required |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase URL for mobile client | Yes |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Publishable Supabase key | Yes |
| `EXPO_PUBLIC_APP_API_URL` | Web origin used by `POST /api/ensure-profile` | Yes for profile self-heal and some profile flows |
| `EXPO_PUBLIC_SENTRY_DSN` | Placeholder in `.env.example`; not read by code today | Optional / currently unused |
| `EXPO_PUBLIC_ENV` | Placeholder in `.env.example`; not read by code today | Optional / currently unused |

## Key Business Logic

- Roles:
  - DB roles are `customer`, `buyer`, `driver`, `admin`
  - mobile normalizes `customer` -> `seller` for UI only
- Listing visibility:
  - admin sees all
  - seller sees own listings
  - buyer sees open/reopened listings and accepted own listings
  - driver sees assigned listings and some delivery jobs
- Offer rules:
  - only buyers make offers
  - only open listings accept offers
  - one pending offer per buyer/listing is updated in place
  - accepting one offer auto-declines all other pending offers
- Comment rules:
  - visible to anyone who can read the listing
  - seller can comment on own listing unless cancelled
  - buyer can comment only while listing is open
- Conversation rules:
  - one conversation per listing/buyer pair
  - seller and buyer are the only regular participants
  - mobile RLS explicitly allows seller-created conversation rows too
- Listing lifecycle:
  - `open` -> `accepted` via accepted offer
  - `accepted` -> `completed` or `no_show`
  - `no_show` -> `reopened`
  - accepted listings get a 24-hour pickup deadline
  - sellers can extend deadline by 24 more hours
  - web auto-relists expired accepted listings when listing access occurs
- Delivery logic:
  - `delivery_required` gates driver workflows
  - `buyer_delivery_confirmed` is intended to release jobs to drivers
  - driver claim computes payout snapshot and creates a `transport_job`
  - mobile completion is PIN-gated through `delivery_handoff_secrets`
  - after verified delivery, profile/privacy restrictions are applied through DB-backed flags and blocks
- Reviews:
  - only after listing is completed
  - reviewer must be a listing participant
  - recipient must be a different listing participant
  - one review per `(from_user, to_user)` pair
- Session policy:
  - idle timeout comes from `platform_settings.session_idle_minutes`
  - activity is refreshed via `requireAppUser()` and `/api/auth/activity`
- Country/currency:
  - country code can update currency automatically
  - default fallback currency is `USD`

## AI Agent Instructions

- Treat this as a cross-stack system, not just a Next.js app.
- Before changing marketplace rules, inspect both:
  - web REST code in `src/app/api`
  - SQL/RLS/RPC/view logic in `prisma/migrations`
- Do not assume Prisma models capture the full backend. Mobile-critical objects like `listing_public_feed`, `user_public_profiles`, `listing_live_locations`, and the driver/buyer RPCs are SQL-only.
- Respect naming differences:
  - web/API JSON is mostly camelCase
  - mobile direct DB rows are snake_case
  - DB role is `customer`, mobile label is `seller`
- Keep service-role logic on the server only.
- Use `src/lib/validation.ts` for web validation patterns and keep mobile validation aligned when changing auth/profile fields.
- Preserve decimal serialization behavior by using `serializeListing` / `serializeOffer` for web API responses.
- Be careful with privacy-sensitive fields:
  - `delivery_handoff_secrets`
  - `delivery_privacy_locked`
  - `driver_profile_blocks`
  - address visibility for drivers
- If you change listing/offer/chat/driver behavior, verify whether mobile is calling:
  - a REST route
  - a table/view directly
  - an RPC directly
- Prefer migrations over ad hoc DB changes. If a field is used by mobile, update both schema and RLS/view projections.
- Do not introduce a new literal `seller` role in the DB unless you are intentionally migrating away from `customer`.
- Watch for drift between web and mobile:
  - storage bucket names
  - email verification env names
  - delivery completion and PIN logic
  - pickup job availability semantics
- Recommended validation after non-trivial changes:
  - web: `npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build`
  - web smoke: `npm run test:e2e`
  - mobile: `npm run typecheck`, `npm test`
  - mobile manual: Maestro smoke flow if profile/auth or navigation changes

## Development Workflow

### Web/API Repo

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Useful commands:

```bash
npm run lint
npm test
npm run test:e2e
npx tsc --noEmit
npm run build
npm run db:migrate
npm run db:studio
```

### Mobile Repo

```bash
cd ../waste-marketplace-ios
npm install
cp .env.example .env
npm start
```

Useful commands:

```bash
npm run typecheck
npm test
```

Maestro smoke flow:

```bash
maestro test maestro/smoke.yaml
```

### Migrations and DB Changes

- Prisma-managed schema changes: update `prisma/schema.prisma`, then create/apply a migration
- SQL-only mobile surfaces: add or update raw SQL migration files
- Supabase edge functions: deploy separately with `supabase functions deploy`
- If changing RLS or SQL RPC behavior, test on mobile paths, not just web pages

### Deployment

- Web is intended for Vercel or similar
- Supabase hosts auth, Postgres, storage, realtime, and edge functions
- Run `npx prisma migrate deploy` as part of release/deploy
- Mobile repo has local/dev guidance but no production EAS pipeline config in this workspace

## Known Gaps / TODOs

- Web and mobile backend surfaces can drift because:
  - web uses Prisma + route handlers
  - mobile uses direct Supabase + RLS + RPC
- `prisma/schema.prisma` does not model every DB object used by mobile.
- Email verification env naming is inconsistent:
  - code reads `SUPABASE_REQUIRE_EMAIL_VERIFICATION`
  - signup page reads `NEXT_PUBLIC_SUPABASE_REQUIRE_EMAIL_VERIFICATION`
  - docs/env example still mention `SUPABASE_AUTOCONFIRM_NEW_USERS`
- Storage bucket naming is inconsistent:
  - web upload route defaults to `listing-images`
  - mobile listing photo helper uses `listing-photos`
  - avatar uploads use `avatars`
- Mobile signup does not currently expose role selection, so new mobile-created accounts effectively fall back to buyer unless role metadata/profile is provisioned elsewhere.
- Web and mobile delivery completion logic are not perfectly aligned:
  - mobile relies on PIN-gated RPC completion
  - web driver job PATCH can mark a job completed directly
- Web listing creation marks some delivery listings as available earlier than the SQL/mobile flow intends; driver claim is still gated later by `buyerDeliveryConfirmed`.
- Buyer delivery release now supports accepted listings where the seller offered delivery but `delivery_required` was not already true: confirming marketplace delivery sets `delivery_required`, `buyer_delivery_confirmed`, makes the pickup available to drivers, and refreshes the handoff PIN.
- Buyer handoff PINs are hidden until the buyer requests driver delivery. Once shown, the PIN remains valid until the buyer explicitly regenerates it; regeneration replaces the previous unconsumed PIN.
- Web drivers share live location for active assigned jobs through `public.listing_live_locations`; buyers see an embedded Google map on accepted listings once a driver has claimed and shared location.
- Buyer listing detail (`/listing/:id` and `/buyer/listings/:id`) uses a dense 3-column workspace on desktop: summary/seller rail, media and offer/comment center, and delivery/driver rail. Keep future buyer detail changes in that workspace rather than reverting to a sparse single-column stack.
- Transactions/payment flows are not implemented even though a `transactions` table exists.
- Admin UI is mostly read-only.
- Web chat and notification UX still rely on polling in several places.
- Test coverage is shallow:
  - web unit tests cover validation only
  - Playwright coverage is smoke-level
  - mobile tests cover role normalization only
- `buyer/pickups` still labels completed earnings as a placeholder.
- `package.json` contains duplicate keys (`@sentry/node`, `@playwright/test`), which is a maintenance smell.
- Some docs are historical and lag current behavior or naming.

## Quick Start For AI Agents

- Start here for system orientation:
  - `README.md`
  - `prisma/schema.prisma`
  - `src/app/api`
  - `src/lib/auth.ts`
  - `src/lib/validation.ts`
  - `src/lib/listing-visibility.ts`
  - `src/lib/commission.ts`
  - `src/lib/marketRegion.ts` (US/IN marketing + client defaults)
  - `src/components/marketing/LandingExperience.tsx` (unauthenticated home content)
  - `src/lib/marketing-assets.ts` (paths/alt text for first-party art in `public/wm-assets/marketing/`)
  - `src/proxy.ts`
- For mobile context, inspect:
  - `../waste-marketplace-ios/README.md`
  - `../waste-marketplace-ios/src/lib/supabase.ts`
  - `../waste-marketplace-ios/src/providers/SessionProvider.tsx`
  - `../waste-marketplace-ios/src/screens`
- For auth/profile changes:
  - web: `src/app/api/auth/*`, `src/app/api/profile/route.ts`, `src/app/api/ensure-profile/route.ts`
  - mobile: `SignUpScreen`, `LoginScreen`, `EditProfileScreen`, `ensureOwnUsersRow.ts`
  - DB: migrations around `wmp_handle_new_auth_user`, `users`, and `user_public_profiles`
- For listing/offer/chat changes:
  - web: `src/app/api/listings/*`, `src/app/api/offers/*`, `src/app/api/conversations/*`
  - mobile: `BuyerHomeScreen`, `CreateListingScreen`, `ListingDetailScreen`, `Chat*`
  - DB: `listing_public_feed`, `offers`, `conversations`, `messages`, notification triggers
- For driver flow changes:
  - web: `src/app/api/driver/*`
  - mobile: `DriverHomeScreen`, `LiveTrackScreen`, `DriverPickupCard`
  - DB: `driver_claim_pickup`, `driver_set_transport_status`, `driver_complete_transport_with_pin`, `listing_live_locations`

Safest extension strategy:

1. Identify whether the behavior is web-only, mobile-only, or shared.
2. If shared, update DB schema/RLS/view/RPC surfaces first.
3. Update web route handlers and serializers.
4. Update mobile Supabase callers and screen expectations.
5. Run the relevant web and mobile validation commands.

## Web: public marketing landing (unauthenticated)

- **`src/app/page.tsx`** — If the visitor has no Supabase session (or no resolvable profile role), the shell is **`MarketingNavbar` → `LandingExperience` → `LandingFooter`**. Logged-in visitors still `redirect()` to the role home (`/buyer`, `/customer`, `/driver`, `/admin`) as in code. The homepage does **not** mount `src/components/landing/LandingMarketplaceSection.tsx` (that file exists in the repo but is unused from this route at present).
- **`src/components/marketing/LandingExperience.tsx`** — Client marketing page: hero slideshow, **material / category** tiles, how-it-works, features, testimonials, and **`#dashboard-preview`**. Imagery is **first-party WebP** shipped under **`public/wm-assets/marketing/`** with metadata in **`src/lib/marketing-assets.ts`** (not hotlinked stock photos). **`next/image`** serves these local files. Example prices and “similar listing” copy follow **`marketRegion` (`IN` \| `US`)**; users switch regions with **`MarketRegionToggle`**. (There is no separate “US-ready marketplace” / “India-ready” pill above the hero; region is explicit via the toggle.)
- **`src/lib/marketRegion.ts` + `MarketRegionToggle`** — `localStorage` key **`wm_market_region`**, `readStoredMarketRegion` / `setMarketRegionPreference` / `subscribeMarketRegion`, and **`detectMarketRegion()`** (stored value, else India timezones, else `navigator.language` / `Intl` locale for a US/IN guess). The toggle is in the hero and in **`MarketingNavbar`** (desktop and mobile). Signup, driver copy, and similar surfaces may read the same helper; `users.country_code` from the profile is the server-side complement for logged-in users.
- **`src/components/MarketingNavbar.tsx`** — Sticky header: `/#marketplace`, `/#sell-waste`, `/#buy-materials`, `/#transport`, `/#how-it-works`; **Login** / **Create account**; **region toggle** beside auth on desktop, same in the mobile menu.
- **`src/components/LandingFooter.tsx`** — Links to login, signup, `#marketplace`, `#how-it-works` (and related anchors as implemented).
- **`src/app/login/page.tsx` + `LoginPageClient.tsx`** — `Suspense` border for `useSearchParams` (e.g. OAuth error query). Two-column layout: left gradient + **`AIAuthIllustration`**, right column **“← Home”** to `/`, Google OAuth when configured, email/password, **POST `/api/auth/login`** then **`/api/users/me`** for role-based redirect.
- **`src/app/signup/page.tsx`** — Client-only multi-step signup (`Role` → `Account` → `Optional` profile) posting to **`POST /api/auth/signup`** (Zod `signupFormSchema`); **“← Home”** on the main flow and on post-submit email verification. **Step 3** uses **`detectMarketRegion()`** for the default `marketRegion`; payload includes **tax IDs** when required for the region/role. No `Suspense` wrapper (the page is `"use client"` end-to-end).
- **Design tokens** — Tailwind `theme.extend.colors.wm`: `primary` `#0E7C66`, `secondary` `#0A2540`, `surface` `#F8FAFC`, `card` `#FFFFFF`, `border` `#E2E8F0`, `cta` `#22C55E` (see `tailwind.config.ts`). Marketing CTAs use the **`wm` / emerald** stack consistent with the signed-in app shell.

---

## Web repo: idle session UX (cookie sessions)

These details apply to the **Next.js web app** in this repository and extend the generic session notes above.

### `POST /api/auth/activity`

- **`?mode=peek`** — Validates Supabase session + idle timeout; **does not** bump `users.last_activity_at`. Response includes `timeoutMinutes`, `warningSeconds` (seconds remaining when inside the last **5 minutes** of the idle window; otherwise `null`).
- **`?mode=touch`** (or any non-`peek` value) — Same validation; **may** bump `last_activity_at` (throttled to at most once per minute inside `requireAppUser`).

### `requireAppUser({ touchActivity })`

- Default `touchActivity: true` for normal API routes.
- `touchActivity: false` for activity **peek** checks so passive polling does not extend the idle clock.

### Client: `SessionActivity`

- Mounted from `AppShell`. Uses **peek** on interval/initial load and **touch** on user interaction (click, keydown, etc.).
- Shows a bottom banner with countdown when `warningSeconds` is returned.
- On `401` from activity → logout + redirect to `/login`.

### `POST /api/auth/login`

- After successful `signInWithPassword`, calls **`ensureAppUserProfile`** so `public.users` exists (aligns with `/api/ensure-profile` / mobile-created auth users), then updates profile fields from Supabase metadata and refreshes **`last_activity_at`** so stale profiles do not immediately hit idle expiry.

## Web repo: security hardening notes

- **Direct Supabase profile writes** — Migration `20260502120000_security_hardening` revokes broad authenticated `UPDATE` on `public.users` and grants column-level updates only for editable profile fields. A DB trigger protects `id`, `email`, `role`, `last_activity_at`, and `created_at` from direct authenticated client mutation. Server-side Prisma writes still manage server-owned fields.
- **Public metadata RLS** — Migration `20260503110000_enable_rls_on_public_metadata_tables` enables RLS on `public._prisma_migrations` to satisfy Supabase/PostgREST exposed-schema linting for Prisma metadata. `public.spatial_ref_sys` is PostGIS extension metadata owned by `supabase_admin` on Supabase; apply the owner-required SQL in `docs/SUPABASE_MANUAL_SECURITY_SQL.md` so it keeps read-only `SELECT` for `anon` / `authenticated`.
- **Effective role on web/API** — `src/lib/auth.ts` overlays Supabase `app_metadata.role` onto the Prisma profile when metadata is present, so protected web/API routes do not trust a mismatched `public.users.role`. Legacy auth users without role metadata continue to use the existing profile role.
- **Driver completion** — Web driver jobs now require the buyer handoff PIN when completing an in-transit delivery. `PATCH /api/driver/jobs/:id` validates and consumes `delivery_handoff_secrets` in the same transaction that completes the `transport_jobs` row and `waste_listings` row. The SQL RPC `driver_complete_transport_with_pin` is updated to enforce `in_transit`, consume the PIN, and mark the listing completed.
- **Uploads** — `src/lib/imageUpload.ts` detects JPEG/PNG/WEBP by magic bytes. Listing and avatar upload routes use the detected content type and canonical extension instead of trusting browser-provided MIME or filenames.
- **Public profile API** — `GET /api/users/:id` no longer returns saved profile addresses for non-self viewers.
- **Abuse/security controls** — Google geocode routes have per-user/IP limits, resend verification uses Supabase anon `auth.resend` with generic success, and `next.config.ts` defines baseline CSP/security headers.

## Last Updated

- **2026-05-03** — Buyer/driver floating chat now matches seller chrome with back navigation plus minimize/close controls and no full-inbox shortcut. Driver earnings moved to `/driver/earnings` as a separate nav tab with bank-statement style posted/pending rows. Web chat message bodies are encrypted at rest with server-only AES-GCM envelopes (`MESSAGE_ENCRYPTION_KEY` / `APP_ENCRYPTION_KEY`), participant APIs decrypt responses, admin read access was removed from conversation APIs, and message notifications no longer copy private text.
- **2026-05-03** — Fixed buyer profile update freshness by healing missing app profile rows, keeping app-shell profile state in sync after save, and best-effort syncing safe display fields into Supabase Auth metadata. Buyer/driver message FAB now opens a bottom-right floating inbox instead of navigating full-screen. Driver jobs now include active/available/completed/all filters plus Uber-style earnings summary cards.
- **2026-05-03** — Added metadata-table RLS migration for Supabase linter finding on `public._prisma_migrations` plus manual owner-required SQL for `public.spatial_ref_sys`. Marketplace app-table RLS policies for listings/offers/jobs are unchanged; PostGIS SRID metadata should remain readable when the manual SQL is applied.
- **2026-05-03** — Updated buyer marketplace delivery release so accepted delivery-offered listings can be converted into driver pickup jobs, aligned driver feed visibility to buyer-released accepted jobs, replaced the driver live map Leaflet/OSM preview with Google Maps embed, and refreshed driver/chat UI panels to match the seller workspace style.
- **2026-05-03** — Hid buyer delivery PINs until delivery is requested, added buyer PIN regeneration, added web driver live-location upserts and buyer realtime tracking map, and expanded buyer/driver pages toward 3-column workspace layouts.
- **2026-05-03** — Reworked buyer listing detail into a compact 3-column workspace to remove wide empty canvas space on accepted/completed listing screens.
- **2026-05-02** — Implemented security audit remediations: direct `public.users` role mutation hardening, app-metadata effective role overlay, PIN-gated driver completion on web and RPC, upload magic-byte validation, non-self profile address redaction, map/resend rate limits, and baseline security headers.
- **2026-04-24** — Replaced Unsplash and external Unpkg Leaflet marker URLs: **`public/wm-assets/marketing/*.webp`**, **`src/lib/marketing-assets.ts`**, **`next/image`** on the landing; map markers from **`public/leaflet/`** (copies of Leaflet 1.9.4 stock icons). `next.config` no longer whitelists `images.unsplash.com`.
- **2026-04-23** — **Unauthenticated home** is **`LandingExperience`** + **US/India** `marketRegion` (`wm_market_region`, `src/lib/marketRegion.ts`, `MarketRegionToggle` in hero and navbar), marketing art as **self-hosted WebP** + **`marketing-assets.ts`**. **`MarketingNavbar`** anchors: `/#marketplace`, `/#sell-waste`, `/#buy-materials`, `/#transport`, `/#how-it-works`. **Login / signup** include **Home → `/`**. **API table** updated: **`GET /api/conversations`**, buyer **`GET /api/listings`** query params, **`POST /api/auth/signup`** body (`marketRegion`, `gstNumber` / `ein`, etc.). Doc previously described **`LandingMarketplaceSection`** on `/`; that does not match the current `page.tsx` (the component file may still exist under `src/components/landing/`).
- **2026-04-23** — Enterprise **landing** refresh: single **Marketplace** section with tabs/filters (`src/components/landing/LandingMarketplaceSection.tsx`), **dashboard tab previews** (`LandingDashboardPreviews.tsx`), navbar/footer copy, **`login`** / **`signup`** layout (multi-step signup; SSO mailto fallbacks). No API contract changes for auth/signup payloads beyond folding optional company text into `address`.
- **2026-04-23** — Redesigned unauthenticated **homepage** (`src/app/page.tsx`) for clearer hierarchy and CTAs; updated **`MarketingNavbar`** / **`LandingFooter`** and added Tailwind **`wm.*`** tokens (`tailwind.config.ts`). No change to auth redirect business logic.
- **2026-04-23** — Merged `origin/main` into `cursor/e2e-listings-flow-0d63`: resolved `AI_AGENT_CONTEXT.md` (add/add) by keeping `main`’s cross-stack document and appending web idle-session + login behavior. Resolved `src/app/api/auth/login/route.ts` by combining **rate limiting** from `main` with **`ensureAppUserProfile`** + profile field sync + **`last_activity_at`** refresh from the feature branch.
