import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_NAV,
  moveItem,
  normalizeItems,
  placeBefore,
  sanitizeItems,
  toggleItem,
  type NavId,
  type NavSurface,
} from "@/lib/navigation";

/**
 * Préférences de navigation, **par surface**.
 *
 * Pourquoi deux listes et pas une : la barre basse du téléphone tient cinq
 * entrées autour du bouton « + » ; le rail du bureau en tient quinze sans
 * effort. Une liste commune aurait imposé le compromis du plus petit — soit
 * appauvrir le bureau, soit déborder le téléphone.
 *
 * Le sélecteur renvoie le tableau stocké tel quel (référence stable) : c’est
 * ce qui évite une boucle avec `useSyncExternalStore`.
 */
interface NavState {
  mobile: NavId[];
  desktop: NavId[];
  setItems: (surface: NavSurface, items: NavId[]) => void;
  toggle: (surface: NavSurface, id: NavId) => void;
  move: (surface: NavSurface, id: NavId, delta: number) => void;
  placeBefore: (surface: NavSurface, id: NavId, target: NavId) => void;
  reset: (surface: NavSurface) => void;
  resetAll: () => void;
}

export const useNavStore = create<NavState>()(
  persist(
    (set, get) => ({
      mobile: [...DEFAULT_NAV.mobile],
      desktop: [...DEFAULT_NAV.desktop],

      setItems: (surface, items) =>
        set({ [surface]: sanitizeItems(surface, items) } as Partial<NavState>),

      toggle: (surface, id) =>
        set({ [surface]: toggleItem(get()[surface], id) } as Partial<NavState>),

      move: (surface, id, delta) =>
        set({ [surface]: moveItem(get()[surface], id, delta) } as Partial<NavState>),

      placeBefore: (surface, id, target) =>
        set({
          [surface]: placeBefore(get()[surface], id, target),
        } as Partial<NavState>),

      reset: (surface) => set({ [surface]: [...DEFAULT_NAV[surface]] } as Partial<NavState>),

      resetAll: () =>
        set({
          mobile: [...DEFAULT_NAV.mobile],
          desktop: [...DEFAULT_NAV.desktop],
        }),
    }),
    {
      name: "engram.nav.v1",
      version: 1,
      /* Une version antérieure (ou un stockage abîmé) ne doit pas casser la
         navigation : tout ce qui entre est normalisé, et une liste vide
         retombe sur les valeurs par défaut. */
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Record<NavSurface, unknown>>;
        return {
          ...current,
          mobile: sanitizeItems("mobile", normalizeItems(saved.mobile)),
          desktop: sanitizeItems("desktop", normalizeItems(saved.desktop)),
        };
      },
    },
  ),
);

/** Raccourci de lecture : les entrées d’une surface, référence stable. */
export function useNavItems(surface: NavSurface): NavId[] {
  return useNavStore((state) => state[surface]);
}
