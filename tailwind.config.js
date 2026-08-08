/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F2F5F1",
        surface: "#FFFFFF",
        ink: "#17231D",
        brand: {
          DEFAULT: "#1F6E52",
          dark: "#164F3B",
          light: "#2C8A68",
        },
        accent: {
          DEFAULT: "#E2A33B",
          dark: "#C08425",
        },
        muted: "#6B786F",
        line: "#DCE3DD",
        danger: "#B8452E",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,35,29,0.04), 0 8px 24px rgba(23,35,29,0.06)",
      },
    },
  },
  plugins: [],
};
