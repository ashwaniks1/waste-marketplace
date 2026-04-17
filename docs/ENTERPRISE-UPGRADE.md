# Enterprise upgrade (extend-only)

## 1. Plan

- **Stack**: Next.js (App Router), React 19, Prisma, Supabase auth, Tailwind, Zod.
- **Design system**: Eco primary (`teal` / `brand`), glass shadows (`shadow-glass`, `shadow-lift`), rounded-xl/3xl, motion-safe hovers — implemented in shared primitives (`Button`, `EmptyState`, `ListingCard`, `HeroEcoBackground`, `src/components/ds/*` for gradual adoption).
- **Maps**: Listing `latitude` / `longitude` in DB; `POST/PATCH /api/listings` + `POST /api/maps/geocode` (`GOOGLE_MAPS_SERVER_KEY`); `MapCoordinatesPicker` on **create listing**.
- **Validation**: Central `src/lib/validation.ts` — wired to **login**, **signup**, and **signup API**; listing create enforces paired coordinates.
- **QA**: Vitest unit tests for validation (`npm run test`).

## 2. Components created / highlighted

| Area | Location |
|------|-----------|
| Design tokens / DS primitives | `src/components/ds/*`, `tailwind.config.ts`, `src/app/globals.css` |
| Hero backdrop | `src/components/HeroEcoBackground.tsx` (used on landing hero) |
| Map picker | `src/components/MapCoordinatesPicker.tsx` |
| Empty states | `src/components/EmptyState.tsx` (`variant`: generic, listings, chat, pickups) |
| Listing card | `src/components/ListingCard.tsx` (image strip, seller avatar, hover lift) |
| Button | `src/components/Button.tsx` (focus-visible, motion-safe scale) |

## 3. Files modified (recent slice)

- `src/app/page.tsx` — hero wrapped with `HeroEcoBackground`.
- `src/app/login/page.tsx` — `loginFormSchema` + inline errors + `aria-*`.
- `src/app/signup/page.tsx` — `signupFormSchema` + `fieldErrorsFromZod`.
- `src/app/api/auth/signup/route.ts` — shared `signupFormSchema`.
- `src/app/api/listings/route.ts` — paired lat/lng refine on create.
- `src/app/api/listings/[id]/route.ts` — PATCH coordinate pairing rules.
- `src/app/customer/listings/new/page.tsx` — `MapCoordinatesPicker`; correct `latitude`/`longitude` JSON keys.
- `src/app/customer/listings/page.tsx`, `src/app/buyer/page.tsx` — `EmptyState`, skeletons, `ListingCardListing` typing.
- `prisma/schema.prisma` + migration — listing coordinates (if not already applied).

## 4. Features added / tightened

- Geocode + manual / device pin for **new listings**; server geocode when key is set.
- **Login** client validation aligned with Zod.
- **Signup** client + server validation aligned (password rules, phone digits, driver fields).
- **Listing cards** show cover image and seller avatar when API returns them.

## 5. UI upgrades

- Landing hero: layered eco gradient + grid (`HeroEcoBackground`).
- Buttons: ring focus, hover/active micro-motion (respects `prefers-reduced-motion` via `motion-safe:`).
- Cards: glass border/shadow, hover lift on listing cards.
- Buyer / customer listing lists: loading skeletons and illustrated empty states.

## 6. QA checklist

| # | Case | How |
|---|------|-----|
| 1 | Signup roles | Sign up as customer, buyer, driver (driver requires vehicle fields). |
| 2 | Login validation | Submit empty / invalid email on `/login`. |
| 3 | Create listing | Create with address + optional pin; verify DB or detail page shows coords when set. |
| 4 | Geocode | With `GOOGLE_MAPS_SERVER_KEY`, geocode on create listing; without key, expect clear API message. |
| 5 | Accept / no-show / reopen | Existing flows unchanged — regression smoke. |
| 6 | Reviews / chat / profile | Existing routes — smoke after UI changes. |
| 7 | Mobile | Narrow viewport on landing, listing create, buyer feed. |
| 8 | Automated | `npm run test`, `npm run lint` (`eslint src` — Next 16 CLI no longer includes `next lint`), `npm run build`. |

## 7. Ops

```bash
npx prisma migrate deploy && npx prisma generate
npm run lint && npm run test && npm run build
```

Set `GOOGLE_MAPS_SERVER_KEY` in server env for geocoding (never `NEXT_PUBLIC_`).
