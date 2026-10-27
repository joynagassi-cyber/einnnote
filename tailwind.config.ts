import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        /* Design system « papier calme » — jetons sémantiques */
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        "accent-ink": "var(--accent-ink)",
        "on-accent": "var(--on-accent)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        highlight: "var(--highlight)",
        "canvas-dot": "var(--canvas-dot)",
        /* compat shadcn/ui */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        rect: "var(--r-rect, 12px)",
        field: "var(--r-field, 14px)",
        card: "var(--r-card, 18px)",
        sheet: "var(--r-sheet, 24px)",
        big: "28px",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Literata", "Georgia", "serif"],
        literata: ["Literata", "Georgia", "serif"],
        inter: ["Inter", "ui-sans-serif", "sans-serif"],
      },
      boxShadow: {
        card: "var(--elev-card, 0 10px 30px rgba(43,42,39,.08))",
        float: "0 8px 24px rgba(43,42,39,.12)",
        lift: "0 14px 34px rgba(43,42,39,.14)",
        accent: "0 6px 16px rgba(15,118,110,.28)",
      },
      keyframes: {
        "sheet-up": {
          from: { transform: "translateY(24px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "card-in": {
          from: { transform: "translateY(10px) scale(.985)", opacity: "0" },
          to: { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        "mark-flash": {
          "0%,100%": { backgroundColor: "var(--accent-soft)" },
          "50%": { backgroundColor: "var(--highlight)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "sheet-up": "sheet-up .22s cubic-bezier(.2,.8,.3,1)",
        "fade-in": "fade-in .18s ease-out",
        "card-in": "card-in .24s cubic-bezier(.2,.8,.3,1)",
        "mark-flash": "mark-flash 1.2s ease-in-out 2",
        "accordion-down": "accordion-down .2s ease-out",
        "accordion-up": "accordion-up .2s ease-out",
      },
    },
  },
  plugins: [animate, typography],
};

export default config;
