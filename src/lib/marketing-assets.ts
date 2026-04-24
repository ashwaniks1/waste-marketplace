/**
 * First-party marketing imagery (AI-generated, Waste Marketplace use only).
 * Files live under `public/wm-assets/marketing/`; metadata stays in code/VC rather
 * than Postgres so the landing stays fast and deploys stay simple.
 */

const base = "/wm-assets/marketing" as const;

const src = (file: string) => `${base}/${file}` as const;

export const HERO_SLIDES = [
  {
    id: "hero-01",
    src: src("hero-01-sorted.webp"),
    alt: "Illustration: sorted recyclables and materials ready for resale",
  },
  {
    id: "hero-02",
    src: src("hero-02-scrap.webp"),
    alt: "Illustration: industrial metal scrap and recovered materials",
  },
  {
    id: "hero-03",
    src: src("hero-03-truck.webp"),
    alt: "Illustration: truck transporting baled recyclables",
  },
  {
    id: "hero-04",
    src: src("hero-04-paper.webp"),
    alt: "Illustration: paper and cardboard prepared for recovery",
  },
] as const;

export const CATEGORY_MEDIA = [
  {
    id: "cat-plastic",
    title: "Plastic",
    src: src("cat-plastic.webp"),
    alt: "Illustration: baled plastic bottles for recycling",
  },
  {
    id: "cat-paper",
    title: "Paper & cardboard",
    src: src("cat-paper.webp"),
    alt: "Illustration: stacked cardboard bales",
  },
  {
    id: "cat-metal",
    title: "Metal",
    src: src("cat-metal.webp"),
    alt: "Illustration: scrap metal for recovery",
  },
  {
    id: "cat-ewaste",
    title: "E-waste",
    src: src("cat-ewaste.webp"),
    alt: "Illustration: end-of-life electronics and circuit boards",
  },
] as const;

export const HOW_STEPS = [
  {
    id: "how-01",
    title: "List or browse",
    description: "Sellers post quantity and pickup window; buyers filter by material and distance.",
    src: src("how-01-browse.webp"),
    alt: "Illustration: browsing listings and filters on a laptop",
  },
  {
    id: "how-02",
    title: "Offers & chat",
    description: "Compare offers, message in-app, and lock a price before anyone travels.",
    src: src("how-02-deal.webp"),
    alt: "Illustration: offers and in-app communication",
  },
  {
    id: "how-03",
    title: "Pickup & proof",
    description: "Drivers claim routes, complete pickup, and everyone sees status through delivery.",
    src: src("how-03-dock.webp"),
    alt: "Illustration: loading dock and logistics",
  },
] as const;
