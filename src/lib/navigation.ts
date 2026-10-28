import {
  CardsThree,
  ClockCounterClockwise,
  FolderSimple,
  Gear,
  GraduationCap,
  House,
  SquaresFour,
  Stack,
  type Icon,
} from "@phosphor-icons/react";

/**
 * Catalogue de navigation — **une seule source pour les deux barres**.
 *
 * Le défaut réparé ici : la barre basse du téléphone était une liste écrite en
 * dur de quatre entrées, et le rail du bureau une autre liste, également en
 * dur. Résultat, « Espaces » existait sur ordinateur et n’existait pas sur
 * téléphone — alors que c’est précisément la page qui explique où créer un
 * projet, un coffre, une note. Deux listes qui divergent, c’est une fonction
 * qui disparaît d’un appareil sans que personne ne l’ait décidé.
 *
 * Désormais : un catalogue, deux listes de préférences (téléphone, bureau),
 * et les deux barres lisent les mêmes données. Ce module est **pur** — il ne
 * touche ni au store ni au DOM —, donc testable sans navigateur.
 */

export type NavSurface = "mobile" | "desktop";

export type NavId =
  | "notes"
  | "spaces"
  | "review"
  | "learn"
  | "projects"
  | "vaults"
  | "cards"
  | "settings";

export interface NavDestination {
  id: NavId;
  to: string;
  /** libellé long (rail, réglages, listes) */
  label: string;
  /** libellé court (barre basse : la place manque) */
  short: string;
  hint: string;
  icon: Icon;
}

/**
 * Ordre du catalogue = ordre de présentation dans les réglages. Ce n’est pas
 * un ordre par défaut : chaque surface a le sien (voir `DEFAULT_NAV`).
 */
export const NAV_CATALOG: NavDestination[] = [
  {
    id: "notes",
    to: "/",
    label: "Notes",
    short: "Notes",
    hint: "La bibliothèque : toutes vos notes, tous vos projets.",
    icon: House,
  },
  {
    id: "spaces",
    to: "/spaces",
    label: "Espaces",
    short: "Espaces",
    hint: "Projet → coffre → note. La page qui dit où vit quoi, et où créer.",
    icon: SquaresFour,
  },
  {
    id: "review",
    to: "/review",
    label: "Réviser",
    short: "Réviser",
    hint: "Les cartes du jour, par portée : projet, coffre ou note.",
    icon: ClockCounterClockwise,
  },
  {
    id: "learn",
    to: "/learn",
    label: "Apprendre",
    short: "Apprendre",
    hint: "Les leçons et les tutoriels de méthode.",
    icon: GraduationCap,
  },
  {
    id: "projects",
    to: "/projects",
    label: "Projets",
    short: "Projets",
    hint: "Créer, renommer, supprimer un projet — le classeur d’un travail.",
    icon: FolderSimple,
  },
  {
    id: "vaults",
    to: "/vaults",
    label: "Coffres",
    short: "Coffres",
    hint: "Créer un coffre dans un projet, et voir ses fiches.",
    icon: Stack,
  },
  {
    id: "cards",
    to: "/settings/cards",
    label: "Studio des cartes",
    short: "Cartes",
    hint: "Éventail, relief, carte image — vos fiches réelles.",
    icon: CardsThree,
  },
  {
    id: "settings",
    to: "/settings",
    label: "Réglages",
    short: "Réglages",
    hint: "Tous les réglages : apparence, données, cloud, navigation.",
    icon: Gear,
  },
];

const BY_ID = new Map<NavId, NavDestination>(
  NAV_CATALOG.map((destination) => [destination.id, destination]),
);

export function navById(id: string): NavDestination | undefined {
  return BY_ID.get(id as NavId);
}

export function isNavId(value: unknown): value is NavId {
  return typeof value === "string" && BY_ID.has(value as NavId);
}

/** Combien d’entrées tiennent dans la barre basse, autour du bouton central. */
export const MOBILE_SLOTS = 5;

/**
 * Pages qui ont une **place fixe** sur une surface : elles n’entrent pas dans
 * la liste réglable. Sur bureau, « Réglages » est déjà en pied de rail — la
 * mettre aussi dans la liste la ferait apparaître deux fois.
 */
export const FIXED_ON: Record<NavSurface, NavId[]> = {
  mobile: [],
  desktop: ["settings"],
};

/** Les pages qu’une surface peut réellement choisir. */
export function catalogFor(surface: NavSurface): NavDestination[] {
  return NAV_CATALOG.filter((destination) => !FIXED_ON[surface].includes(destination.id));
}

/**
 * Combien d’entrées une surface porte **sans arbitrage**.
 *
 * Ce n’est pas une limite technique, c’est une limite de sens : la barre basse
 * n’a pas de défilement, au-delà de cinq entrées il faut choisir lesquelles y
 * vivent. Le rail, lui, défile et tient largement le catalogue actuel — tant
 * qu’il y a de la place, demander à l’utilisateur de masquer des pages serait
 * une question sans enjeu.
 */
export const SURFACE_SLOTS: Record<NavSurface, number> = {
  mobile: MOBILE_SLOTS,
  desktop: 12,
};

/**
 * Faut-il proposer d’**afficher ou masquer** des pages sur cette surface ?
 *
 * Règle unique, et c’est le point : on ne règle que la surface où l’on est, et
 * on n’y règle le masquage **que lorsqu’il y a plus de pages que de place**.
 * Aujourd’hui : vrai sur téléphone (8 pages pour 5 places), faux sur bureau
 * (8 pages pour 12 places). Le jour où le catalogue dépassera la place du
 * rail, le choix réapparaîtra de lui-même, sans retoucher l’écran.
 */
export function needsPicker(surface: NavSurface): boolean {
  return catalogFor(surface).length > SURFACE_SLOTS[surface];
}

/**
 * Toutes les pages du catalogue, dans l’ordre choisi, les manquantes à la fin.
 *
 * Sert à la surface qui n’a pas de sélection à faire : plutôt que d’afficher
 * une liste partielle qu’on ne pourrait plus compléter (le masquage étant
 * retiré), on complète. Rien ne peut ainsi devenir invisible sans recours.
 */
export function fillItems(surface: NavSurface, items: NavId[]): NavId[] {
  const allowed = new Set(catalogFor(surface).map((destination) => destination.id));
  const filled = normalizeItems(items).filter((id) => allowed.has(id));
  for (const destination of catalogFor(surface)) {
    if (!filled.includes(destination.id)) filled.push(destination.id);
  }
  return filled;
}

/**
 * Par défaut, le téléphone montre **cinq** entrées — dont « Espaces », qui y
 * manquait. Le bureau en montre sept : la hauteur du rail ne coûte rien.
 */
export const DEFAULT_NAV: Record<NavSurface, NavId[]> = {
  mobile: ["notes", "spaces", "review", "learn", "settings"],
  desktop: ["notes", "spaces", "review", "learn", "projects", "vaults", "cards"],
};

/**
 * Nettoie une liste venue du stockage : identifiants inconnus retirés,
 * doublons supprimés, ordre conservé. Une entrée qu’on ne sait plus afficher
 * (page retirée d’une version à l’autre) ne doit pas laisser un trou.
 */
export function normalizeItems(value: unknown): NavId[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<NavId>();
  const items: NavId[] = [];
  for (const entry of value) {
    if (!isNavId(entry) || seen.has(entry)) continue;
    seen.add(entry);
    items.push(entry);
  }
  return items;
}

/**
 * Une barre vide n’est pas une préférence, c’est une impasse : on retombe sur
 * la liste par défaut de la surface.
 */
export function sanitizeItems(surface: NavSurface, value: unknown): NavId[] {
  /* Une page à place fixe ne peut pas entrer dans la liste réglable : elle y
     apparaîtrait deux fois (Réglages dans le rail *et* en pied de rail). */
  const fixed = FIXED_ON[surface];
  const items = normalizeItems(value).filter((id) => !fixed.includes(id));
  return items.length > 0 ? items : [...DEFAULT_NAV[surface]];
}

/** Ajoute ou retire une entrée. Retirer la dernière est refusé. */
export function toggleItem(items: NavId[], id: NavId): NavId[] {
  if (items.includes(id)) {
    return items.length > 1 ? items.filter((entry) => entry !== id) : items;
  }
  const next = [...items, id];
  /* On garde un ordre lisible : celui du catalogue, sauf si l’utilisateur a
     déjà défini le sien — dans ce cas l’ajout se fait à la fin, là où il l’a
     demandé implicitement. */
  return next;
}

export function moveItem(items: NavId[], id: NavId, delta: number): NavId[] {
  const index = items.indexOf(id);
  if (index < 0) return items;
  const target = Math.max(0, Math.min(items.length - 1, index + delta));
  if (target === index) return items;
  const next = [...items];
  next.splice(index, 1);
  next.splice(target, 0, id);
  return next;
}

/**
 * Place `id` juste avant `target`. C’est le geste du rail : on clique la page
 * à déplacer, puis la page devant laquelle elle doit se ranger.
 */
export function placeBefore(items: NavId[], id: NavId, target: NavId): NavId[] {
  if (id === target) return items;
  if (!items.includes(id) || !items.includes(target)) return items;
  const without = items.filter((entry) => entry !== id);
  const index = without.indexOf(target);
  without.splice(index, 0, id);
  return without;
}

/** Les entrées visibles, résolues en destinations prêtes à rendre. */
export function resolveItems(items: NavId[]): NavDestination[] {
  return items
    .map((id) => BY_ID.get(id))
    .filter((destination): destination is NavDestination => destination !== undefined);
}

/** Entrées activables mais masquées, dans l’ordre du catalogue. */
export function availableItems(items: NavId[]): NavDestination[] {
  return NAV_CATALOG.filter((destination) => !items.includes(destination.id));
}

/**
 * Découpe la liste mobile en « barre » et « débordement ».
 *
 * Une barre basse n’a pas de défilement : au-delà de `MOBILE_SLOTS`, les
 * entrées supplémentaires iraient sous le bord de l’écran. Elles passent donc
 * derrière un bouton « Plus » — visible, nommé, et jamais une entrée qu’on a
 * activée sans pouvoir l’atteindre.
 */
export function splitMobile(items: NavId[]): {
  bar: NavId[];
  overflow: NavId[];
} {
  if (items.length <= MOBILE_SLOTS) return { bar: items, overflow: [] };
  return {
    bar: items.slice(0, MOBILE_SLOTS - 1),
    overflow: items.slice(MOBILE_SLOTS - 1),
  };
}
