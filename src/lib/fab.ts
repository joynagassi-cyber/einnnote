/**
 * Le bouton flottant — **ce qu'on peut créer ici**, et seulement ici.
 *
 * Avant : un « + » au milieu de la barre de navigation, sur toutes les pages,
 * qui proposait toujours la même chose (une note) y compris là où l'on ne
 * crée pas de note. Un bouton permanent qui ment sur ce qu'il fait est pire
 * qu'un bouton absent.
 *
 * La règle tient en une fonction **pure** : on lui donne le chemin, elle rend
 * la liste des créations possibles. Rien à synchroniser, testable sans DOM.
 */

export type FabKind = "project" | "vault" | "card" | "note";

export interface FabAction {
  kind: FabKind;
  /** ce que le bouton dit, à l'écran comme au lecteur d'écran */
  label: string;
  /** où l'on va pour le faire */
  to: string;
}

const PROJECT_NEW = "/spaces?new=1";

export function fabFor(pathname: string): FabAction[] {
  const segments = pathname.split("/").filter(Boolean);

  /* Les formulaires et les graphes ne créent rien : on y est déjà en train de
     faire, ou de regarder. */
  if (segments.includes("new") || segments.includes("graph")) return [];

  /* Un vault (une catégorie) : on y écrit des **notes**. C’est l’unité de
     travail de la page ; les fiches de révision sont un second geste. */
  if (segments[0] === "vault" && segments.length === 2) {
    return [{ kind: "note", label: "Nouvelle note", to: `/new?vault=${segments[1]}` }];
  }

  /* La page des fiches, elle, ajoute une fiche. */
  if (segments[0] === "vault" && segments[2] === "fiches") {
    return [{ kind: "card", label: "Nouvelle fiche", to: `/vault/${segments[1]}/new` }];
  }

  /* Un projet : on y crée un vault. */
  if (segments[0] === "spaces" && segments.length === 2) {
    return [
      { kind: "vault", label: "Nouveau vault", to: `/spaces/${segments[1]}?new=1` },
    ];
  }

  /* La racine des espaces : on y crée un projet. */
  if (segments[0] === "spaces" && segments.length === 1) {
    return [{ kind: "project", label: "Nouveau projet", to: PROJECT_NEW }];
  }

  /* Bibliothèque et Apprendre : une note libre — sans projet, sans vault.
     Elle se rattachera plus tard, depuis son en-tête. */
  if (segments.length === 0 || segments[0] === "learn") {
    return [{ kind: "note", label: "Nouvelle note", to: "/new" }];
  }

  /* Réviser, les réglages, l'éditeur, la corbeille : rien. */
  return [];
}

/** Le FAB ne recouvre jamais une barre de formulaire ou une action critique. */
export function fabVisible(pathname: string): boolean {
  return fabFor(pathname).length > 0;
}
