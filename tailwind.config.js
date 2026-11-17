/** @type {import('tailwindcss').Config} */
// All colors come from CSS variables in app/globals.css (as "R G B" so Tailwind can add opacity), so dark mode is automatic.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        soft: "rgb(var(--soft) / <alpha-value>)",
        accent: { DEFAULT: "rgb(var(--accent) / <alpha-value>)", fg: "rgb(var(--accent-fg) / <alpha-value>)" },
        mark: { DEFAULT: "rgb(var(--mark) / <alpha-value>)", ink: "rgb(var(--mark-ink) / <alpha-value>)" },
        coral: "rgb(var(--coral) / <alpha-value>)",
        mint: "rgb(var(--mint) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
};
