# Phase 2 — Product feedback & scope notes

**Status:** Implemented in app (responsive shell, asking price + offers, image lightbox, comments + private chat). Run `npx prisma migrate deploy` for DB changes.

Captured from stakeholder input; kept for history and future iterations (e.g. realtime chat, counter-offers).

---

## 1. Responsive layout & waste-management UX

**Goal:** The app should feel **full-page** and appropriate on **mobile, tablet, and desktop** (not a narrow “phone-only” strip on large screens).

**Direction:**

- Replace fixed `max-w-lg` shells with **responsive containers** (`max-w-*` per breakpoint, or full width with sensible padding).
- Use **breakpoint-aware** navigation (e.g. bottom nav on small screens, side/top bar on tablet+).
- **Visual language** aligned with waste / sustainability: clear hierarchy, strong CTAs, readable status badges, iconography for waste types, calm greens/teals with accessible contrast.
- Audit **touch targets**, spacing, and typography scale across breakpoints.

**Engineering:** Tailwind breakpoints (`sm` / `md` / `lg` / `xl`), optional shared `AppShell` layout, design tokens for color/spacing.

---

## 2. Listing price & buyer offers

**Goal:** Sellers set an **asking price**; buyers can **submit offers** (higher or lower, e.g. ask $10 → offer $9 or $11).

**Direction:**

- Extend `WasteListing` (or related model) with **`askingPrice`** (numeric + currency, default single currency for MVP).
- New **`Offer`** model: `listingId`, `buyerId`, `amount`, `status` (`pending` | `accepted` | `declined` | `withdrawn`), `createdAt`.
- Seller flow: view offers, **accept one** (optional: auto-decline others), or counter (Phase 2b).
- Buyer flow: place/retract offer; see status.
- API: e.g. `POST /api/listings/:id/offers`, `GET /api/listings/:id/offers`, `POST /api/offers/:id/accept` (seller only).
- UI: price on cards/detail; “Make offer” modal with validation; offer list on listing detail for seller.

**Edge cases:** Listing already accepted by “direct accept” path vs offer-accept — product decision: Phase 2 may **replace** simple accept with offer workflow or keep both behind flags.

---

## 3. Images — full view on click (lightbox)

**Goal:** Uploaded images are **fully visible** when tapped/clicked, not cropped/half-shown.

**Direction:**

- **Lightbox / modal** pattern: click thumbnail → overlay with full-size image, close on backdrop/Escape.
- Mobile: optional swipe between images, pinch-zoom if low effort.
- Ensure **aspect ratio** preserved; avoid fixed small boxes that clip content without a zoom path.

**Engineering:** Client component (e.g. `ImageLightbox`), reuse on customer/buyer/admin listing views.

---

## 4. Comments & private chat (seller ↔ buyer)

**Goal:** **Comments** (possibly listing-threaded) and **private chat** between seller and buyer.

**Direction:**

- **Comments:** `ListingComment` table (`listingId`, `userId`, `body`, `createdAt`); visibility rules (public on listing vs participants only — product call).
- **Private chat:** `Conversation` + `Message` (or thread keyed by `listingId` + seller + buyer) with realtime updates.
- **Stack options:** Supabase **Realtime** + Postgres tables; RLS if exposing via client; or keep reads/writes via Next API with service role initially.
- Notifications (Phase 2/3): email or push when new message arrives.

**Privacy:** Confirm whether comments are public to all buyers or only after a connection/accept.

---

## Summary checklist (Phase 2 planning)

| # | Theme              | Deliverable summary |
|---|--------------------|----------------------------------------------------------|
| 1 | Layout & UX        | Responsive full-view layouts; waste-themed UI polish |
| 2 | Price & offers     | Asking price + offers + seller accept/decline           |
| 3 | Images             | Lightbox / full-size on click |
| 4 | Chat & comments    | Listing comments + private messaging (data model + UI) |

---

*Last updated from stakeholder feedback.*
