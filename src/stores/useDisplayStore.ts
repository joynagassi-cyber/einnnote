import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_PREFS, type DisplayPrefs } from "@/lib/display";

/**
 * Préférences d’affichage, **par écran**.
 *
 * Pourquoi par écran : une grille à 4 colonnes convient à la bibliothèque et
 * ruine la pile Zettelkasten. Un réglage global aurait forcé un compromis
 * permanent ; ici chaque surface garde sa mémoire.
 */
export type SurfaceKey =
  | "library"
  | "vault"
  | "projects"
  | "project"
  | "questions"
  | "mindmap"
  | "trash"
  | "review";

interface DisplayState {
  prefs: Partial<Record<SurfaceKey, DisplayPrefs>>;
  get: (surface: SurfaceKey) => DisplayPrefs;
  /** `patch` peut porter une clé `initial` pour ne pas perdre le défaut */
  set: (surface: SurfaceKey, patch: Partial<DisplayPrefs>) => void;
  reset: (surface: SurfaceKey) => void;
  resetAll: () => void;
}

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set, get) => ({
      prefs: {},
      get: (surface) => ({ ...DEFAULT_PREFS, ...(get().prefs[surface] ?? {}) }),
      set: (surface, patch) =>
        set((state) => ({
          prefs: {
            ...state.prefs,
            [surface]: {
              ...DEFAULT_PREFS,
              ...(state.prefs[surface] ?? {}),
              ...patch,
            },
          },
        })),
      reset: (surface) =>
        set((state) => {
          const next = { ...state.prefs };
          delete next[surface];
          return { prefs: next };
        }),
      resetAll: () => set({ prefs: {} }),
    }),
    {
      name: "engram.display.v1",
      version: 1,
    },
  ),
);

/**
 * Raccourci de composant : préférences + écriture, pour une surface.
 *
 * Le sélecteur renvoie la valeur stockée telle quelle (référence stable) :
 * fabriquer un objet neuf dans le sélecteur ferait boucler `useSyncExternalStore`.
 */
export function useSurfacePrefs(
  surface: SurfaceKey,
  /** valeurs de départ propres à l’écran (ex. la pile du Zettelkasten) */
  fallback: Partial<DisplayPrefs> = {},
) {
  const stored = useDisplayStore((state) => state.prefs[surface]);
  const set = useDisplayStore((state) => state.set);
  const reset = useDisplayStore((state) => state.reset);
  const prefs: DisplayPrefs = { ...DEFAULT_PREFS, ...fallback, ...(stored ?? {}) };
  return {
    prefs,
    set: (patch: Partial<DisplayPrefs>) => set(surface, patch),
    reset: () => reset(surface),
  };
}
