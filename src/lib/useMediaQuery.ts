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

/**
 * Deux seuils, deux décisions différentes :
 *
 * - **768 px** : à partir d’ici, la navigation passe dans une **barre latérale**
 *   (compacte entre 768 et 1023, complète au-delà). En dessous, barre basse.
 *   C’est le seuil de la *navigation* : une tablette, un aperçu de bureau un peu
 *   étroit, une fenêtre réduite gardent le rail.
 * - **1024 px** : à partir d’ici, les écrans riches passent en deux panneaux
 *   (vault liste + fiche), avec mini-carte et contrôles de canevas.
 */
export const RAIL_QUERY = "(min-width: 768px)";
export const DESKTOP_QUERY = "(min-width: 1024px)";
/**
 * Le seuil où **le texte garde la place d’une page**.
 *
 * À 840 px, une colonne de questions de 340 px ne laisse que 300 px de texte :
 * ce n’est plus une note, c’est une colonne de formulaire. En dessous de
 * 1180 px, le panneau redevient donc un tiroir, et le texte reprend la largeur.
 */
export const WIDE_QUERY = "(min-width: 1180px)";

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

/**
 * Préférence effective : adresse (`?bureau=1` / `?mobile=1`) › réglage › écran.
 * Elle **ne crée pas de largeur** : forcer « bureau » sur un écran de 390 px ne
 * fabrique pas un rail de 264 px ni deux panneaux. Le forçage agit donc dans la
 * limite de la place disponible — c’est exactement ce qui distingue une vraie
 * version web d’une enveloppe mise à l’échelle.
 */
function useLayoutPreference(preference?: LayoutPreference) {
  const setting = useAppStore((s) => s.settings.layout);
  /* Relu à chaque rendu : une navigation interne suffit à changer l’adresse. */
  return forcedLayout() ?? preference ?? setting ?? "auto";
}

/** Y a-t-il une **navigation latérale** ? (768 px, ou préférence sans « mobile ».) */
export function useRail(preference?: LayoutPreference) {
  const matches = useMediaQuery(RAIL_QUERY);
  const effective = useLayoutPreference(preference);
  if (effective === "mobile") return false;
  return matches;
}

/**
 * Le rail doit-il être **compact** (icônes seules) ?
 *
 * Décision purement liée à la **largeur réelle**, jamais à la préférence : le
 * CSS dimensionne le rail par media query (88 px avant 1024 px). Si le composant
 * en décidait autrement, une mise en page « bureau » forcée à 820 px afficherait
 * des libellés dans 88 px de large.
 */
export function useCompactRail() {
  return !useMediaQuery(DESKTOP_QUERY);
}

/** Y a-t-il la place pour un **côté** à côté du texte, sans l’écraser ? */
export function useIsWide() {
  return useMediaQuery(WIDE_QUERY);
}

/** Y a-t-il la place pour **deux panneaux** ? (1024 px, ou 768 px si forcé.) */
export function useIsDesktop(preference?: LayoutPreference) {
  const wide = useMediaQuery(DESKTOP_QUERY);
  const rail = useMediaQuery(RAIL_QUERY);
  const effective = useLayoutPreference(preference);
  if (effective === "mobile") return false;
  if (effective === "desktop") return wide || rail;
  return wide;
}
