import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Operator-grade dark palette. `ink` is the neutral ladder used for
        // page, surfaces, borders and text. Deep blue-black base, not pure
        // black, so status tints and the brand accent read cleanly against it.
        ink: {
          50: "#eef2f7",
          100: "#dbe1ec",
          200: "#b8c1d1",
          300: "#98a1b4",
          400: "#6b7488",
          500: "#4b5468",
          600: "#333a4c",
          700: "#252b3a",
          800: "#1a2030",
          850: "#131828",
          900: "#0e1220",
          925: "#0a0e1a",
          950: "#070a14",
        },
        // Cool aviation blue, retuned so the primary actions sit well on the
        // dark ink surfaces. 400 is the link / icon shade; 500/600 drive
        // buttons and focus rings.
        brand: {
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#0b2850",
        },
        status: {
          notStarted: "#94a3b8",
          inProgress: "#60a5fa",
          needsWork: "#fbbf24",
          underReview: "#a78bfa",
          complete: "#34d399",
        },
      },
      boxShadow: {
        // Used on elevated cards to float them above the ink base.
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
