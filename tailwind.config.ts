import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#059669",
          dark: "#047857",
          light: "#6ee7b7",
          muted: "#d1fae5",
        },
        /** Landing / marketing design system */
        wm: {
          primary: "#0E7C66",
          secondary: "#0A2540",
          surface: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          cta: "#22C55E",
        },
        /** Salesforce Cosmos / SLDS-inspired workspace canvas */
        cosmos: {
          page: "#f3f2f2",
          "page-alt": "#ecebea",
          border: "rgba(15, 23, 42, 0.08)",
          "panel-tint": "#fafaf9",
        },
      },
      boxShadow: {
        glass: "0 8px 32px rgba(15, 118, 110, 0.12)",
        lift: "0 12px 40px rgba(15, 23, 42, 0.12)",
        /** Soft elevation for cards (content vs. chrome) */
        "cosmos-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.04), 0 1px 3px 0 rgba(0, 0, 0, 0.06)",
        "cosmos-md": "0 2px 4px 0 rgba(0, 0, 0, 0.04), 0 4px 8px 0 rgba(0, 0, 0, 0.06)",
        "cosmos-nav": "0 1px 0 0 rgba(0, 0, 0, 0.05)",
      },
      borderRadius: {
        "4xl": "1.5rem",
        "5xl": "1.75rem",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "soft-scale": {
          "0%,100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "soft-scale": "soft-scale 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
