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
      },
      boxShadow: {
        glass: "0 8px 32px rgba(15, 118, 110, 0.12)",
        lift: "0 12px 40px rgba(15, 23, 42, 0.12)",
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
