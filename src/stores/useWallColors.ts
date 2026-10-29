import { create } from "zustand";
import type { WallColors } from "@/lib/palette";

/**
 * Les couleurs lues dans l’image de fond, en attente de décodage.
 *
 * Pourquoi un magasin séparé plutôt qu’un champ de `useAppStore` :
 *
 * - elles **ne se persistent pas** — ce sont des pixels, pas une préférence ;
 * - elles dépendent du couple (image, thème) : changer de thème doit les
 *   recalculer, sans salir les réglages de l’utilisateur ;
 * - `applySettingsToDom` doit pouvoir les lire **hors React** (il est appelé
 *   depuis un `useEffect`, un `matchMedia`, un test). Un magasin zustand se lit
 *   avec `getState()`, un état local de composant non.
 */
interface WallColorState {
  /** clé de validité : image + mode + papier, pour ne pas recalculer à vide */
  key: string | null;
  colors: WallColors | null;
  error: string | null;
  set: (key: string, colors: WallColors) => void;
  fail: (key: string, error: string) => void;
  reset: () => void;
}

export const useWallColors = create<WallColorState>()((set) => ({
  key: null,
  colors: null,
  error: null,
  set: (key, colors) => set({ key, colors, error: null }),
  fail: (key, error) => set({ key, colors: null, error }),
  reset: () => set({ key: null, colors: null, error: null }),
}));

/** Clé de cache : mêmes entrées ⇒ mêmes couleurs, aucun recalcul. */
export function wallColorKey(
  wallpaper: string | null,
  mode: "light" | "dark",
  background: string,
): string {
  return `${wallpaper ?? "none"}|${mode}|${background}`;
}
