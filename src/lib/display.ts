/**
 * Affichage et tri — moteur commun à tous les écrans.
 *
 * Un seul modèle (vue, colonnes, regroupement, tri principal, tri secondaire)
 * et des « champs » déclarés par écran. Les écrans ne réimplémentent donc ni
 * le tri ni le regroupement : ils déclarent ce qu’ils savent lire, le moteur
 * fait le reste. C’est ce qui permet au même menu de servir une bibliothèque,
 * une pile de cartes et une liste de nœuds.
 */

/** « stack » : la pile feuilletée du Zettelkasten, une troisième étagère. */
export type DisplayView = "grid" | "list" | "stack";

export interface DisplayPrefs {
  view: DisplayView;
  /** nombre de colonnes, ou "auto" (dépend de la largeur) */
  columns: number | "auto";
  /** clé de champ, ou null pour aucun regroupement */
  groupBy: string | null;
  sortBy: string;
  thenBy: string | null;
}

export const DEFAULT_PREFS: DisplayPrefs = {
  view: "grid",
  columns: "auto",
  groupBy: null,
  sortBy: "recent",
  thenBy: null,
};

export interface DisplayField<T> {
  label: string;
  /** valeur lue pour trier et regrouper */
  value: (item: T) => string | number;
  /** nature de la valeur : change le comparateur */
  type?: "text" | "number" | "date";
}

export type DisplayFields<T> = Record<string, DisplayField<T>>;

export interface DisplayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

function comparable<T>(field: DisplayField<T>, item: T): string | number {
  const raw = field.value(item);
  if (field.type === "date") {
    const time = new Date(raw).getTime();
    return Number.isNaN(time) ? 0 : time;
  }
  if (field.type === "number") return typeof raw === "number" ? raw : Number(raw);
  return typeof raw === "string" ? raw : String(raw);
}

/** Compare deux valeurs d’un même champ, sans jamais renvoyer NaN. */
export function compareValues(
  a: string | number,
  b: string | number,
  type: DisplayField<unknown>["type"] = "text",
): number {
  if (type === "date") {
    const ta = typeof a === "number" ? a : Date.parse(String(a));
    const tb = typeof b === "number" ? b : Date.parse(String(b));
    const sa = Number.isNaN(ta) ? 0 : ta;
    const sb = Number.isNaN(tb) ? 0 : tb;
    return sa === sb ? 0 : sa > sb ? 1 : -1;
  }
  if (type === "number") {
    const na = typeof a === "number" ? a : Number(a);
    const nb = typeof b === "number" ? b : Number(b);
    const safeA = Number.isNaN(na) ? 0 : na;
    const safeB = Number.isNaN(nb) ? 0 : nb;
    return safeA === safeB ? 0 : safeA > safeB ? 1 : -1;
  }
  return collator.compare(String(a), String(b));
}

/**
 * Tri multi-critères stable : le tri secondaire ne s’applique qu’à égalité
 * stricte du premier, et l’ordre d’origine tranche en dernier.
 */
export function sortItems<T>(
  items: T[],
  fields: DisplayFields<T>,
  keys: (string | null | undefined)[],
): T[] {
  const active = keys.filter(
    (key): key is string => Boolean(key) && Boolean(fields[key as string]),
  );
  if (active.length === 0) return [...items];

  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      for (const key of active) {
        const field = fields[key];
        const result = compareValues(
          comparable(field, left.item),
          comparable(field, right.item),
          field.type,
        );
        if (result !== 0) return result;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.item);
}

/** Regroupe en conservant l’ordre reçu à l’intérieur de chaque groupe. */
export function groupItems<T>(
  items: T[],
  fields: DisplayFields<T>,
  groupBy: string | null,
): DisplayGroup<T>[] {
  if (!groupBy || !fields[groupBy]) {
    return items.length ? [{ key: "__all__", label: "", items }] : [];
  }
  const field = fields[groupBy];
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const raw = field.value(item);
    const key = String(raw === "" || raw === undefined ? "—" : raw);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const keys = [...groups.keys()].sort((a, b) =>
    compareValues(a, b, field.type === "number" ? "number" : "text"),
  );
  return keys.map((key) => ({
    key,
    label: key,
    items: groups.get(key) ?? [],
  }));
}

/** Nombre de colonnes réellement appliqué par la grille. */
export function columnsFor(
  prefs: DisplayPrefs,
  options: { fallback: number; min?: number; max?: number } = { fallback: 2 },
): number {
  const min = options.min ?? 1;
  const max = options.max ?? 6;
  if (prefs.columns === "auto") return options.fallback;
  return Math.min(max, Math.max(min, Math.round(prefs.columns)));
}

/** Libellé court « 3 col. » / « auto », pour le bouton du menu. */
export function columnsLabel(prefs: DisplayPrefs): string {
  return prefs.columns === "auto" ? "auto" : `${prefs.columns} col.`;
}

/** Nombre de réglages qui s’écartent du défaut (badge du bouton). */
export function activePrefCount(prefs: DisplayPrefs, initial: DisplayPrefs): number {
  let count = 0;
  if (prefs.view !== initial.view) count += 1;
  if (prefs.columns !== initial.columns) count += 1;
  if (prefs.groupBy !== initial.groupBy) count += 1;
  if (prefs.sortBy !== initial.sortBy) count += 1;
  if (prefs.thenBy !== initial.thenBy) count += 1;
  return count;
}

/** Grille CSS : Tailwind ne peut pas générer des colonnes dynamiques. */
export function gridStyle(columns: number): React.CSSProperties {
  return { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
}
