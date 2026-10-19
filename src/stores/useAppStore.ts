import { create } from "zustand";
import type { AppSettings, AccentColor, ThemeMode } from "../types";
import { initThemeStyles, updateAccent } from "../styles/theme";

interface AppState {
  settings: AppSettings;
  setTheme: (theme: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
  setCanvasBg: (bg: AppSettings["canvasBg"]) => void;
  setFont: (font: AppSettings["font"]) => void;
  setFontSize: (size: number) => void;
  setContrast: (contrast: boolean) => void;
  setReduceMotion: (reduce: boolean) => void;
  setLanguage: (lang: "fr" | "en") => void;
  setPinSet: (pinSet: boolean) => void;
  setOnboarded: (onboarded: boolean) => void;
  applySettings: (settings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  theme: "light",
  accent: "teal",
  canvasBg: "dots",
  font: "literata",
  fontSize: 16,
  contrast: false,
  reduceMotion: false,
  language: "fr",
  pinSet: false,
  onboarded: false,
};

function applyThemeToDOM(settings: AppSettings) {
  const html = document.documentElement;
  const theme = settings.theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : settings.theme;
  html.setAttribute("data-theme", theme);
  html.setAttribute("data-accent", settings.accent);
  html.setAttribute("data-high-contrast", String(settings.contrast));
  updateAccent(settings.accent, theme === "dark");
}

initThemeStyles();

export const useAppStore = create<AppState>((set, get) => ({
  settings: defaultSettings,

  setTheme: (theme) => {
    set((s) => ({ settings: { ...s.settings, theme } }));
    applyThemeToDOM({ ...get().settings, theme });
  },

  setAccent: (accent) => {
    set((s) => ({ settings: { ...s.settings, accent } }));
    applyThemeToDOM({ ...get().settings, accent });
  },

  setCanvasBg: (canvasBg) => {
    set((s) => ({ settings: { ...s.settings, canvasBg } }));
  },

  setFont: (font) => {
    set((s) => ({ settings: { ...s.settings, font } }));
    document.body.style.fontFamily = font === "literata" ? "'Literata', serif" : "'Inter', sans-serif";
  },

  setFontSize: (fontSize) => {
    set((s) => ({ settings: { ...s.settings, fontSize } }));
    document.body.style.fontSize = `${fontSize}px`;
  },

  setContrast: (contrast) => {
    set((s) => ({ settings: { ...s.settings, contrast } }));
    applyThemeToDOM({ ...get().settings, contrast });
  },

  setReduceMotion: (reduceMotion) => {
    set((s) => ({ settings: { ...s.settings, reduceMotion } }));
    document.documentElement.setAttribute("data-reduce-motion", String(reduceMotion));
  },

  setLanguage: (language) => {
    set((s) => ({ settings: { ...s.settings, language } }));
    document.documentElement.lang = language;
  },

  setPinSet: (pinSet) => {
    set((s) => ({ settings: { ...s.settings, pinSet } }));
  },

  setOnboarded: (onboarded) => {
    set((s) => ({ settings: { ...s.settings, onboarded } }));
  },

  applySettings: (partial) => {
    const newSettings = { ...get().settings, ...partial };
    set((s) => ({ settings: newSettings }));
    applyThemeToDOM(newSettings);
  },
}));
