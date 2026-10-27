import { useEffect, useState } from "react";

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

export function useIsDesktop() {
  return useMediaQuery(DESKTOP_QUERY);
}
