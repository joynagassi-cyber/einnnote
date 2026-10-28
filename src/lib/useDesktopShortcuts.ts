import { useEffect, useRef } from "react";

/**
 * Couche clavier du bureau.
 *
 * Trois règles non négociables :
 * 1. **Jamais sous 1024 px** : un clavier de téléphone n’a pas de « g puis n ».
 * 2. **Jamais en train de taper** : dès qu’un champ, un éditeur ou un
 *    `contenteditable` a le focus, les lettres redeviennent des lettres.
 * 3. **Jamais sans issue de secours** : `?` affiche la liste des raccourcis.
 *
 * Les gestes suivent la convention des éditeurs (Gmail, GitHub, Linear) :
 * `/` pour chercher, `n` pour créer, `g` puis une lettre pour changer d’espace.
 */

export interface ShortcutActions {
  onSearch: () => void;
  onNew: () => void;
  onHelp: () => void;
  onNavigate: (path: string) => void;
}

const CHORD_TARGETS: Record<string, { path: string; label: string }> = {
  n: { path: "/", label: "Notes" },
  p: { path: "/spaces", label: "Espaces" },
  r: { path: "/review", label: "Réviser" },
  l: { path: "/learn", label: "Apprendre" },
  a: { path: "/settings/appearance", label: "Apparence" },
};

/** Le focus est-il dans un endroit où l’on écrit ? */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true'], .note-prose"));
}

export const SHORTCUTS = [
  { keys: ["/"], label: "Chercher dans la bibliothèque" },
  { keys: ["n"], label: "Nouvelle note" },
  { keys: ["g", "n"], label: "Aller aux notes" },
  { keys: ["g", "p"], label: "Aller aux projets" },
  { keys: ["g", "r"], label: "Aller à la révision" },
  { keys: ["g", "l"], label: "Aller aux leçons" },
  { keys: ["g", "a"], label: "Aller à l’apparence" },
  { keys: ["?"], label: "Liste des raccourcis" },
  { keys: ["Échap"], label: "Fermer un panneau" },
] as const;

export function useDesktopShortcuts(enabled: boolean, actions: ShortcutActions) {
  const chord = useRef<{ armed: boolean; timer: number | null }>({
    armed: false,
    timer: null,
  });
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (!enabled) return;

    const clearChord = () => {
      chord.current.armed = false;
      if (chord.current.timer) window.clearTimeout(chord.current.timer);
      chord.current.timer = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      const key = event.key;

      if (chord.current.armed) {
        const target = CHORD_TARGETS[key.toLowerCase()];
        clearChord();
        if (target) {
          event.preventDefault();
          actionsRef.current.onNavigate(target.path);
        }
        return;
      }

      if (key === "/") {
        event.preventDefault();
        actionsRef.current.onSearch();
        return;
      }
      if (key === "n") {
        event.preventDefault();
        actionsRef.current.onNew();
        return;
      }
      if (key === "?") {
        event.preventDefault();
        actionsRef.current.onHelp();
        return;
      }
      if (key.toLowerCase() === "g") {
        event.preventDefault();
        chord.current.armed = true;
        chord.current.timer = window.setTimeout(clearChord, 1200);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearChord();
    };
  }, [enabled]);
}

/** Événement écouté par la bibliothèque pour prendre le focus. */
export const FOCUS_SEARCH_EVENT = "engram:focus-search";
