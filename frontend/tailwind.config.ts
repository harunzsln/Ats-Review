import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deliberate palette: deep indigo primary + warm amber accent reserved
        // for score/insight highlights (the product's signature moment).
        brand: {
          DEFAULT: "#4f46e5",
          dark: "#4338ca",
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        accent: {
          DEFAULT: "#f59e0b",
          dark: "#d97706",
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
        },
        // Score band colors (paired with labels + icons, never color-only).
        score: {
          strong: "#16a34a",
          good: "#65a30d",
          fair: "#f59e0b",
          weak: "#dc2626",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        lift: "0 10px 30px -12px rgb(79 70 229 / 0.25)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
