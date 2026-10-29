import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

/**
 * Une couleur shadcn **avec** son opacité facultative.
 *
 * Tailwind ne sait injecter un alpha que dans une couleur qu’il fabrique
 * lui-même (`rgb(… / <alpha-value>)`). Nos jetons étant des couleurs réelles —
 * nécessaires à `@property` et à `color-mix` — on lui donne la fonction qui
 * fait le travail : `bg-card/40` → `color-mix(in srgb, var(--card) 40%,
 * transparent)`. Sans cela, `bg-card/40` **disparaissait silencieusement** du
 * CSS produit (vérifié : aucune règle générée).
 */
const alpha = (token: string) =>
  `color-mix(in srgb, ${token} calc(<alpha-value> * 100%), transparent)`;

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
        /* compat shadcn/ui — les jetons sont de vraies **couleurs**
           (`#0F766E`), plus des triplets HSL : c’est ce qui permet de les
           animer (`@property … <color>`) et de les mélanger (`color-mix`).
           L’opacité, elle, est fabriquée ici : `bg-card/40` devient
           `color-mix(in srgb, var(--card) calc(0.4 * 100%), transparent)`. */
        border: alpha("var(--border)"),
        input: alpha("var(--input)"),
        ring: alpha("var(--ring)"),
        background: alpha("var(--background)"),
        foreground: alpha("var(--foreground)"),
        primary: {
          DEFAULT: alpha("var(--primary)"),
          foreground: alpha("var(--primary-foreground)"),
        },
        secondary: {
          DEFAULT: alpha("var(--secondary)"),
          foreground: alpha("var(--secondary-foreground)"),
        },
        destructive: {
          DEFAULT: alpha("var(--destructive)"),
          foreground: alpha("var(--destructive-foreground)"),
        },
        card: {
          DEFAULT: alpha("var(--card)"),
          foreground: alpha("var(--card-foreground)"),
        },
        popover: {
          DEFAULT: alpha("var(--popover)"),
          foreground: alpha("var(--popover-foreground)"),
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
