import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AccentKey,
  AccentMode,
  AppSettings,
  CanvasBg,
  NoteFont,
  Personalization,
  ThemeMode,
} from "@/types";
import { accentVars, deriveAccent, isHex } from "@/lib/accent";
import { ACCENT_PRESETS } from "@/lib/accents";
import {
  DEFAULT_PALETTE_KEY,
  paletteByKey,
  themeVars,
  tokensFor,
} from "@/lib/themes";
import { effectiveBlur, effectiveVeil, glassColor, toRgb } from "@/lib/glass";
import { wallById } from "@/lib/walls";
import { DEFAULT_GRAPH_STYLE } from "@/lib/graph/styles";

interface AppState {
  settings: AppSettings;
  /** projet ouvert : contexte de la bibliothèque et des créations */
  activeProjectId: string | null;
  setActiveProject: (projectId: string | null) => void;
  setTheme: (theme: ThemeMode) => void;
  setPalette: (key: string) => void;
  setAccentMode: (mode: AccentMode) => void;
  /** bascule clair/sombre en suivant la palette jumelle */
  toggleTheme: () => void;
  setAccent: (accent: AccentKey, customHex?: string) => void;
  setCustomAccent: (hex: string) => void;
  setCanvas: (canvas: CanvasBg) => void;
  setWallpaper: (wallpaper: string | null) => void;
  setGraphStyle: (graphStyle: string) => void;
  setWallSettings: (patch: { blur?: number; dim?: number }) => void;
  setFont: (font: NoteFont) => void;
  setFontSize: (fontSize: number) => void;
  setContrast: (contrast: AppSettings["contrast"]) => void;
  setMotion: (motion: AppSettings["motion"]) => void;
  setTransparency: (transparency: AppSettings["transparency"]) => void;
  setLanguage: (language: "fr" | "en") => void;
  /** personnalisation fine : une clé à la fois */
  setPersonalization: (patch: Partial<Personalization>) => void;
  resetPersonalization: () => void;
  markBackup: (iso?: string) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const DEFAULT_PERSONALIZATION: Personalization = {
  density: "regular",
  radius: "regular",
  borders: "regular",
  elevation: "regular",
  paper: "sand",
  noteLeading: 28,
  readingWidth: 720,
  canvasStrength: 100,
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  paletteKey: DEFAULT_PALETTE_KEY,
  accentMode: "theme",
  accent: "teal",
  canvas: "dots",
  wallpaper: null,
  wallBlur: 26,
  wallDim: 55,
  graphStyle: DEFAULT_GRAPH_STYLE,
  font: "literata",
  fontSize: 17,
  contrast: "off",
  motion: "system",
  transparency: "system",
  language: "fr",
  onboarded: false,
  personalization: DEFAULT_PERSONALIZATION,
};

/** Complète un réglage venu d’une ancienne sauvegarde. */
export function withDefaults(settings?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    personalization: {
      ...DEFAULT_PERSONALIZATION,
      ...(settings?.personalization ?? {}),
    },
  };
}

export function resolvedTheme(theme: ThemeMode): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Thème effectif : une palette est intrinsèquement claire ou sombre, elle
 * gagne donc sur le mode global. C’est ce qui rend « Latte » clair même si
 * l’OS est en sombre — sans surprendre, puisqu’un badge l’annonce.
 */
export function effectiveMode(settings: AppSettings): "light" | "dark" {
  const palette = paletteByKey(settings.paletteKey);
  if (palette.key !== DEFAULT_PALETTE_KEY) return palette.mode;
  return resolvedTheme(settings.theme);
}

export function applySettingsToDom(settings: AppSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const palette = paletteByKey(settings.paletteKey);
  const resolved = effectiveMode(settings);
  root.dataset.theme = resolved;
  root.dataset.accent = settings.accent;
  root.dataset.palette = palette.key;

  /* 1. La palette pose tous les jetons neutres (et son accent d’origine). */
  const tokens = tokensFor(palette.key);
  for (const [name, value] of Object.entries(themeVars(tokens))) {
    root.style.setProperty(name, value);
  }

  /* Fond réel sous le texte : sans fond, le papier du thème ; avec un fond,
     le verre (voile effectif puis surface d’écran). L’accent se recale dessus,
     donc il reste AA quel que soit le voile choisi. */
  const wall = wallById(settings.wallpaper);
  const wallTone = wall ? toRgb(wall.tone) : null;
  const veil = wallTone
    ? effectiveVeil(settings.wallDim, tokens, wallTone)
    : settings.wallDim;
  const reference = wallTone
    ? `#${glassColor(toRgb(tokens.bg), wallTone, veil / 100)
        .map((value) => Math.round(value).toString(16).padStart(2, "0"))
        .join("")}`
    : tokens.bg;

  /* 2. L’accent : celui du thème, un preset, ou une couleur libre. Dans les
     deux derniers cas la palette est dérivée *sur le papier du thème* —
     sinon un accent choisi pour du sable serait illisible sur du bleu nuit. */
  const mode = settings.accentMode ?? "theme";
  if (mode === "custom" && settings.customAccent && isHex(settings.customAccent)) {
    const vars = accentVars(
      deriveAccent(settings.customAccent, resolved, reference),
    );
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }
  } else if (mode === "preset") {
    const preset = ACCENT_PRESETS.find((item) => item.key === settings.accent);
    if (preset) {
      const vars = accentVars(
        deriveAccent(
          resolved === "dark" ? preset.dark : preset.light,
          resolved,
          reference,
        ),
      );
      for (const [name, value] of Object.entries(vars)) {
        root.style.setProperty(name, value);
      }
    }
  }
  root.dataset.canvas = settings.canvas;
  root.dataset.font = settings.font;

  /* Fond « verre » : l’image est posée par la couche `WallLayer`, mais le
     flou et le voile sont des variables : ils se règlent sans recharger. */
  root.dataset.wall = settings.wallpaper ?? "none";
  root.style.setProperty("--wall-blur", `${effectiveBlur(settings.wallBlur)}px`);
  root.style.setProperty("--wall-dim", String(veil / 100));

  const prefersContrast = window.matchMedia("(prefers-contrast: more)").matches;
  const highContrast =
    settings.contrast === "on" ||
    (settings.contrast === "system" && prefersContrast);
  root.dataset.contrast = highContrast ? "high" : "normal";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const reducedMotion =
    settings.motion === "reduced" ||
    (settings.motion === "system" && prefersReducedMotion);
  root.dataset.motion = reducedMotion ? "reduced" : "full";

  const prefersReducedTransparency = window.matchMedia(
    "(prefers-reduced-transparency: reduce)",
  ).matches;
  const reducedTransparency =
    settings.transparency === "reduced" ||
    (settings.transparency === "system" && prefersReducedTransparency);
  root.dataset.transparency = reducedTransparency ? "reduced" : "full";

  /* Personnalisation : les attributs basculent des blocs CSS entiers,
     les variables couvrent les valeurs continues. */
  const ui = settings.personalization ?? DEFAULT_PERSONALIZATION;
  root.dataset.density = ui.density;
  root.dataset.radius = ui.radius;
  root.dataset.borders = ui.borders;
  root.dataset.elevation = ui.elevation;
  root.dataset.paper = ui.paper;
  root.style.setProperty("--note-leading", `${ui.noteLeading}px`);
  root.style.setProperty("--reading-width", `${ui.readingWidth}px`);
  root.style.setProperty("--canvas-strength", String(ui.canvasStrength / 100));

  root.style.setProperty("--note-size", `${settings.fontSize}px`);
  root.style.setProperty(
    "--font-note",
    settings.font === "literata"
      ? '"Literata", Georgia, serif'
      : '"Inter", ui-sans-serif, sans-serif',
  );
  root.lang = settings.language;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      activeProjectId: null,
      setActiveProject: (activeProjectId) => set({ activeProjectId }),
      setTheme: (theme) =>
        set((s) => ({ settings: { ...s.settings, theme } })),
      setPalette: (paletteKey) => {
        const palette = paletteByKey(paletteKey);
        set((s) => ({
          settings: {
            ...s.settings,
            paletteKey: palette.key,
            theme: palette.mode,
          },
        }));
      },
      setAccentMode: (accentMode) =>
        set((s) => ({ settings: { ...s.settings, accentMode } })),
      toggleTheme: () =>
        set((s) => {
          const current = effectiveMode(s.settings);
          const next = current === "dark" ? "light" : "dark";
          const palette = paletteByKey(s.settings.paletteKey);
          if (palette.mode !== next && palette.sibling) {
            return { settings: { ...s.settings, paletteKey: palette.sibling } };
          }
          return { settings: { ...s.settings, theme: next } };
        }),
      setAccent: (accent, customHex) =>
        set((s) => ({
          settings: {
            ...s.settings,
            accent,
            accentMode: accent === "custom" ? "custom" : "preset",
            customAccent:
              accent === "custom"
                ? (customHex ?? s.settings.customAccent ?? "#0F766E")
                : s.settings.customAccent,
          },
        })),
      setCustomAccent: (hex) =>
        set((s) => ({
          settings: {
            ...s.settings,
            accent: "custom",
            accentMode: "custom",
            customAccent: hex,
          },
        })),
      setCanvas: (canvas) =>
        set((s) => ({ settings: { ...s.settings, canvas } })),
      setWallpaper: (wallpaper) =>
        set((s) => ({ settings: { ...s.settings, wallpaper } })),
      setGraphStyle: (graphStyle) =>
        set((s) => ({ settings: { ...s.settings, graphStyle } })),
      setWallSettings: ({ blur, dim }) =>
        set((s) => ({
          settings: {
            ...s.settings,
            wallBlur: blur === undefined ? s.settings.wallBlur : Math.min(48, Math.max(0, blur)),
            wallDim: dim === undefined ? s.settings.wallDim : Math.min(90, Math.max(0, dim)),
          },
        })),
      setFont: (font) => set((s) => ({ settings: { ...s.settings, font } })),
      setFontSize: (fontSize) =>
        set((s) => ({
          settings: {
            ...s.settings,
            fontSize: Math.min(22, Math.max(14, fontSize)),
          },
        })),
      setContrast: (contrast) =>
        set((s) => ({ settings: { ...s.settings, contrast } })),
      setMotion: (motion) => set((s) => ({ settings: { ...s.settings, motion } })),
      setTransparency: (transparency) =>
        set((s) => ({ settings: { ...s.settings, transparency } })),
      setLanguage: (language) =>
        set((s) => ({ settings: { ...s.settings, language } })),
      setPersonalization: (patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            personalization: {
              ...(s.settings.personalization ?? DEFAULT_PERSONALIZATION),
              ...patch,
            },
          },
        })),
      resetPersonalization: () =>
        set((s) => ({
          settings: { ...s.settings, personalization: DEFAULT_PERSONALIZATION },
        })),
      markBackup: (iso) =>
        set((s) => ({
          settings: { ...s.settings, lastBackupAt: iso ?? new Date().toISOString() },
        })),
      completeOnboarding: () =>
        set((s) => ({ settings: { ...s.settings, onboarded: true } })),
      reset: () =>
        set({ settings: DEFAULT_SETTINGS, activeProjectId: null }),
    }),
    {
      name: "engram.settings.v1",
      version: 3,
      /* Une ancienne version n’a ni personnalisation ni suivi de sauvegarde :
         on complète au lieu de casser. */
      migrate: (persisted) => {
        const state = persisted as { settings?: Partial<AppSettings> } | undefined;
        return { settings: withDefaults(state?.settings) } as never;
      },
      merge: (persisted, current) => {
        const state = persisted as
          | { settings?: Partial<AppSettings>; activeProjectId?: string | null }
          | undefined;
        return {
          ...current,
          ...state,
          settings: withDefaults(state?.settings),
          activeProjectId: state?.activeProjectId ?? null,
        };
      },
      partialize: (state) => ({
        settings: state.settings,
        activeProjectId: state.activeProjectId,
      }),
    },
  ),
);
