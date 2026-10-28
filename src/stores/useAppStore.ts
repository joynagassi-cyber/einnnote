import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AccentKey,
  AccentMode,
  AppSettings,
  CanvasBg,
  NoteFont,
  Personalization,
  ReviewSettings,
  ThemeMode,
} from "@/types";
import { accentVars, deriveAccent, isHex } from "@/lib/accent";
import { DEFAULT_REVIEW_SETTINGS } from "@/lib/scheduler";
import { ACCENT_PRESETS } from "@/lib/accents";
import {
  DEFAULT_PALETTE_KEY,
  paletteByKey,
  themeVars,
  tokensFor,
} from "@/lib/themes";
import { WALL_BLUR_MAX, effectiveBlur, effectiveVeil, glassColor, toRgb } from "@/lib/glass";
import { wallById } from "@/lib/walls";
import {
  presentTokens,
  presentationAttributes,
  presentationVars,
} from "@/lib/presentation";
import { DEFAULT_GRAPH_STYLE, graphStyleById as styleById } from "@/lib/graph/styles";
import { applyWallColors, veilFromTone, FALLBACK_DEEP } from "@/lib/palette";
import { useWallColors } from "@/stores/useWallColors";

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
  /** accent tiré du fond, ou accent du thème */
  setDynamicAccent: (on: boolean) => void;
  setGraphStyle: (graphStyle: string) => void;
  setLayout: (layout: "auto" | "desktop" | "mobile") => void;
  /** réglages de la révision espacée (fusion partielle) */
  setReview: (patch: Partial<ReviewSettings>) => void;
  setReminder: (patch: Partial<ReviewSettings["reminder"]>) => void;
  resetReview: () => void;
  setGraphDisplay: (patch: {
    labels?: boolean;
    echoes?: boolean;
    animate?: boolean;
  }) => void;
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
  markBackup: (iso?: string, stamp?: string) => void;
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
  wallBlur: 8,
  wallDim: 28,
  dynamicAccent: true,
  graphStyle: DEFAULT_GRAPH_STYLE,
  layout: "auto",
  graphLabels: false,
  graphEchoes: true,
  graphAnimate: false,
  font: "literata",
  fontSize: 17,
  contrast: "off",
  motion: "system",
  transparency: "system",
  language: "fr",
  onboarded: false,
  personalization: DEFAULT_PERSONALIZATION,
  review: DEFAULT_REVIEW_SETTINGS,
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
    review: {
      ...DEFAULT_REVIEW_SETTINGS,
      ...(settings?.review ?? {}),
      reminder: {
        ...DEFAULT_REVIEW_SETTINGS.reminder,
        ...(settings?.review?.reminder ?? {}),
      },
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

  /* 1. La palette pose tous les jetons neutres (et son accent d’origine),
     puis les réglages de présentation les déplacent — teinte de papier et
     contraste des traits. Ce calcul est en JavaScript et non en CSS parce que
     les jetons sont posés en style en ligne : une règle `[data-paper]` serait
     écrasée, ce qui rendait ces deux réglages silencieusement inopérants. */
  const ui = settings.personalization ?? DEFAULT_PERSONALIZATION;
  const tokens = presentTokens(tokensFor(palette.key), ui);
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

  /* 2. L’accent. Trois sources, dans cet ordre de priorité :
     a) **l’image de fond** (`dynamicAccent`) — lue par un canvas 48×48, puis
        corrigée jusqu’à AA sur le verre réel ; elle écrit aussi `--primary`,
        `--ring`, `--accent`, `--on-accent` et `--tint` (les jetons shadcn) ;
     b) une couleur libre, ou un preset ;
     c) sinon celui du thème.
     La source (a) attend que l’image soit décodée : `useWallPalette` la pose
     dans `useWallColors` puis rappelle cette fonction. D’ici là, `--tint`
     garde la couleur mesurée du fond — donc jamais de carte incolore. */
  const wallColors =
    settings.dynamicAccent && wall ? useWallColors.getState().colors : null;

  if (wallColors) {
    applyWallColors(root, wallColors, resolved);
  } else if (wall) {
    /* Repli : la couleur moyenne mesurée du fond, assombrie pour un voile. */
    root.style.setProperty("--tint", veilFromTone(wall.tone, resolved));
  } else {
    root.style.setProperty("--tint", FALLBACK_DEEP);
  }

  const mode = settings.accentMode ?? "theme";
  if (!wallColors && mode === "custom" && settings.customAccent && isHex(settings.customAccent)) {
    const vars = accentVars(
      deriveAccent(settings.customAccent, resolved, reference),
    );
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }
  } else if (!wallColors && mode === "preset") {
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

  /* Présentation : les attributs viennent du registre, comme les variables.
     Aucun écran ne connaît cette liste (voir `src/lib/presentation.ts`). */
  for (const [name, value] of Object.entries(presentationAttributes(ui))) {
    root.dataset[name] = value;
  }
  for (const [name, value] of Object.entries(presentationVars(ui))) {
    root.style.setProperty(name, value);
  }

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
      setDynamicAccent: (dynamicAccent) =>
        set((s) => ({ settings: { ...s.settings, dynamicAccent } })),
      /* Choisir un style règle aussi la valeur initiale des étiquettes : les
         styles qui reposent sur des liens nommés les allument, les autres les
         laissent éteintes. L’utilisateur reste maître du réglage ensuite. */
      setLayout: (layout) =>
        set((s) => ({ settings: { ...s.settings, layout } })),
      setReview: (patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            review: {
              ...(s.settings.review ?? DEFAULT_REVIEW_SETTINGS),
              ...patch,
              reminder: {
                ...(s.settings.review ?? DEFAULT_REVIEW_SETTINGS).reminder,
                ...(patch.reminder ?? {}),
              },
            },
          },
        })),
      setReminder: (patch) =>
        set((s) => {
          const review = s.settings.review ?? DEFAULT_REVIEW_SETTINGS;
          return {
            settings: {
              ...s.settings,
              review: {
                ...review,
                reminder: { ...review.reminder, ...patch },
              },
            },
          };
        }),
      resetReview: () =>
        set((s) => ({ settings: { ...s.settings, review: DEFAULT_REVIEW_SETTINGS } })),
      setGraphStyle: (graphStyle) =>
        set((s) => ({
          settings: {
            ...s.settings,
            graphStyle,
            graphLabels: Boolean(styleById(graphStyle).labels),
          },
        })),
      setGraphDisplay: ({ labels, echoes, animate }) =>
        set((s) => ({
          settings: {
            ...s.settings,
            graphLabels: labels ?? s.settings.graphLabels,
            graphEchoes: echoes ?? s.settings.graphEchoes,
            graphAnimate: animate ?? s.settings.graphAnimate,
          },
        })),
      setWallSettings: ({ blur, dim }) =>
        set((s) => ({
          settings: {
            ...s.settings,
            wallBlur: blur === undefined ? s.settings.wallBlur : Math.min(WALL_BLUR_MAX, Math.max(0, blur)),
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
      markBackup: (iso, stamp) =>
        set((s) => ({
          settings: {
            ...s.settings,
            lastBackupAt: iso ?? new Date().toISOString(),
            ...(stamp === undefined ? {} : { backupStamp: stamp }),
          },
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
