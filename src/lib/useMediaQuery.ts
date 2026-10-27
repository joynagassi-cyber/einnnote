import { useEffect, useState } from "react";
import { useAppStore } from "@/stores/useAppStore";

/** Suit une media query CSS depuis React (mise à jour au redimensionnement). */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    if (list.addEventListener) {
      list.addEventListener("change", update);
      return () => list.removeEventListener("change", update);
    }
    // Safari < 14
    list.addListener?.(update);
    return () => list.removeListener?.(update);
  }, [query]);

  return matches;
}

/** Seuil de la mise en page bureau (rail latéral visible). */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/** Préférence de mise en page : suivre l’écran, ou forcer l’un des deux. */
export type LayoutPreference = "auto" | "desktop" | "mobile";

/**
 * Mise en page **forçable** — trois raisons, toutes concrètes :
 *
 * 1. vérifier le rendu bureau depuis un aperçu hébergé dans une fenêtre
 *    étroite (`?bureau=1` dans l’adresse) ;
 * 2. régler l’application sur un poste qu’on connaît (tablette, grand écran) ;
 * 3. reproduire un défaut signalé sur téléphone sans changer d’appareil
 *    (`?mobile=1`).
 *
 * Le paramètre d’adresse gagne sur le réglage, le réglage gagne sur l’écran.
 */
export function forcedLayout(): LayoutPreference | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("bureau") === "1" || params.get("desktop") === "1") return "desktop";
  if (params.get("mobile") === "1" || params.get("telephone") === "1") return "mobile";
  return null;
}

export function useIsDesktop(preference?: LayoutPreference) {
  const setting = useAppStore((s) => s.settings.layout);
  const matches = useMediaQuery(DESKTOP_QUERY);
  const [forced, setForced] = useState<LayoutPreference | null>(() => forcedLayout());
  useEffect(() => {
    /* L’adresse peut changer sans rechargement (navigation interne) : on la
       relit à chaque rendu de route. */
    setForced(forcedLayout());
  }, [matches]);
  const effective = forced ?? preference ?? setting ?? "auto";
  if (effective === "desktop") return true;
  if (effective === "mobile") return false;
  return matches;
}
