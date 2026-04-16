import type { WasteType } from "@prisma/client";

/** Labels and icons (emoji) for MVP — swap for SVGs in Phase 2. */
export const WASTE_TYPE_OPTIONS: { value: WasteType; label: string; icon: string }[] = [
  { value: "PLASTIC", label: "Plastic", icon: "\u{1F9F4}" },
  { value: "PAPER", label: "Paper", icon: "\u{1F4C4}" },
  { value: "CARDBOARD", label: "Cardboard", icon: "\u{1F4E6}" },
  { value: "METAL", label: "Metal", icon: "\u{2699}\u{FE0F}" },
  { value: "GLASS", label: "Glass", icon: "\u{1FAD7}" },
  { value: "E_WASTE", label: "E-waste", icon: "\u{1F4BB}" },
  { value: "ORGANIC", label: "Organic", icon: "\u{1F331}" },
  { value: "MIXED", label: "Mixed waste", icon: "\u{1F5D1}\u{FE0F}" },
  { value: "CUSTOM", label: "Custom", icon: "\u{1F3F7}\u{FE0F}" },
];
