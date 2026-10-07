/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        encode: {
          blue: "#38B6FF",
          blueDark: "#1E9EEF",
          blueTint: "#EAF7FF",
          black: "#000000",
          near: "#0A0A0A",
          soft: "#F7F9FB",
          grey: "#6B7280",
          border: "#E5E7EB",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Sora'", "'Inter'", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["clamp(2.75rem, 6vw, 6rem)", { lineHeight: "1.02", letterSpacing: "-0.03em" }],
        "display": ["clamp(2.25rem, 4.5vw, 4rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-sm": ["clamp(1.75rem, 3vw, 2.75rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      maxWidth: {
        content: "1280px",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, #E5E7EB 1px, transparent 1px), linear-gradient(to bottom, #E5E7EB 1px, transparent 1px)",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        dash: {
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        dash: "dash 1.6s ease forwards",
      },
    },
  },
  plugins: [],
};
