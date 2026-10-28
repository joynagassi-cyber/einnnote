import type {
  Method,
  MindMap,
  Note,
  NoteStatus,
  Question,
  ReviewCard,
  ZettelCard,
  ZettelVault,
} from "@/types";

/* ------------------------------------------------------------------ */
/* Données et dimensions du filtre                                     */
/* ------------------------------------------------------------------ */

export interface LibrarySource {
  notes: Note[];
  questions: Question[];
  cards: ReviewCard[];
  mindmaps: MindMap[];
  zettel: ZettelCard[];
  vaults: ZettelVault[];
}

export type SearchScope = "all" | "title" | "body" | "questions";

export type ReviewFilter =
  | "all"
  | "due"
  | "overdue"
  | "never"
  | "upToDate"
  | "noCards";

export type ActivityFilter = "all" | "today" | "week" | "month" | "older";

export type SortKey = "recent" | "title" | "due" | "nextDue" | "questions";

export interface LibraryFilters {
  query: string;
  scope: SearchScope;
  methods: Method[];
  collections: string[];
  statuses: NoteStatus[];
  review: ReviewFilter;
  activity: ActivityFilter;
  sort: SortKey;
}

export const DEFAULT_FILTERS: LibraryFilters = {
  query: "",
  scope: "all",
  methods: [],
  collections: [],
  statuses: [],
  review: "all",
  activity: "all",
  sort: "recent",
};

/* ------------------------------------------------------------------ */
/* Libellés (une seule source pour l’interface et les puces)           */
/* ------------------------------------------------------------------ */

export const SCOPE_LABELS: Record<SearchScope, string> = {
  all: "Partout",
  title: "Titres",
  body: "Contenu",
  questions: "Questions",
};

export const STATUS_LABELS: Record<NoteStatus, string> = {
  draft: "Brouillon",
  captured: "Capturée",
  questioned: "Questionnée",
  done: "Terminée",
};

export const REVIEW_LABELS: Record<ReviewFilter, string> = {
  all: "Toutes",
  due: "À revoir",
  overdue: "En retard",
  never: "Jamais révisée",
  upToDate: "À jour",
  noCards: "Sans carte",
};

export const ACTIVITY_LABELS: Record<ActivityFilter, string> = {
  all: "Toutes",
  today: "Aujourd’hui",
  week: "7 derniers jours",
  month: "30 derniers jours",
  older: "Plus ancienne",
};

export const SORT_LABELS: Record<SortKey, string> = {
  recent: "Récents d’abord",
  title: "Titre A → Z",
  due: "Cartes à revoir",
  nextDue: "Prochaine échéance",
  questions: "Nombre de questions",
};

/* ------------------------------------------------------------------ */
/* Statistiques par note : ce que l’application sait vraiment          */
/* ------------------------------------------------------------------ */

export interface NoteStats {
  questions: number;
  cards: number;
  due: number;
  overdue: number;
  /** prochaine échéance (timestamp) ou null si aucune carte */
  nextDue: number | null;
  neverReviewed: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

function startOfToday(now: Date) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function noteStats(
  note: Note,
  source: LibrarySource,
  now: Date = new Date(),
): NoteStats {
  const cards = source.cards.filter((card) => card.noteId === note.id);
  const today = startOfToday(now);
  const endOfToday = today + DAY;

  const due = cards.filter((card) => new Date(card.due).getTime() < endOfToday);
  const overdue = cards.filter((card) => new Date(card.due).getTime() < today);
  const nextDue = cards.length
    ? Math.min(...cards.map((card) => new Date(card.due).getTime()))
    : null;

  return {
    questions: source.questions.filter((q) => q.noteId === note.id).length,
    cards: cards.length,
    due: due.length,
    overdue: overdue.length,
    nextDue,
    neverReviewed: cards.length > 0 && cards.every((card) => card.reps === 0),
  };
}

/* ------------------------------------------------------------------ */
/* Texte indexé : blocs, nœuds de carte mentale, cartes du vault      */
/* ------------------------------------------------------------------ */

function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function noteBody(note: Note, source: LibrarySource): string {
  const blocks = note.blocks.map((block) => htmlToText(block.html)).join(" ");
  const nodes =
    note.method === "mindmap"
      ? (source.mindmaps
          .find((map) => map.id === note.mindmapId || map.noteId === note.id)
          ?.nodes.map((node) => node.text)
          .join(" ") ?? "")
      : "";
  const zettel =
    note.method === "zettelkasten"
      ? source.zettel
          .filter((card) => card.vaultId === note.vaultId)
          .map((card) => `${card.title} ${card.body}`)
          .join(" ")
      : "";
  return `${blocks} ${nodes} ${zettel}`.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/* Prédicats                                                           */
/* ------------------------------------------------------------------ */

function matchesQuery(note: Note, filters: LibraryFilters, source: LibrarySource) {
  const query = filters.query.trim().toLowerCase();
  if (!query) return true;

  const inText = (value: string) => value.toLowerCase().includes(query);
  const title = inText(note.title);
  const body = inText(noteBody(note, source));
  const questions = source.questions.some(
    (question) => question.noteId === note.id && inText(question.text),
  );
  const collection = inText(note.collection);

  switch (filters.scope) {
    case "title":
      return title;
    case "body":
      return body;
    case "questions":
      return questions;
    default:
      return title || body || questions || collection;
  }
}

function matchesReview(
  stats: NoteStats,
  review: ReviewFilter,
): boolean {
  switch (review) {
    case "due":
      return stats.due > 0;
    case "overdue":
      return stats.overdue > 0;
    case "never":
      return stats.neverReviewed;
    case "upToDate":
      return stats.cards > 0 && stats.due === 0;
    case "noCards":
      return stats.cards === 0;
    default:
      return true;
  }
}

function matchesActivity(updatedAt: string, activity: ActivityFilter, now: Date) {
  if (activity === "all") return true;
  const age = now.getTime() - new Date(updatedAt).getTime();
  switch (activity) {
    case "today":
      return age < DAY;
    case "week":
      return age < 7 * DAY;
    case "month":
      return age < 30 * DAY;
    case "older":
      return age >= 30 * DAY;
  }
}

export function matchesFilters(
  note: Note,
  filters: LibraryFilters,
  source: LibrarySource,
  now: Date = new Date(),
): boolean {
  if (note.deletedAt) return false;
  if (filters.methods.length && !filters.methods.includes(note.method)) {
    return false;
  }
  if (
    filters.collections.length &&
    !filters.collections.includes(note.collection)
  ) {
    return false;
  }
  if (filters.statuses.length && !filters.statuses.includes(note.status)) {
    return false;
  }
  if (!matchesReview(noteStats(note, source, now), filters.review)) return false;
  if (!matchesActivity(note.updatedAt, filters.activity, now)) return false;
  return matchesQuery(note, filters, source);
}

/* ------------------------------------------------------------------ */
/* Tri                                                                 */
/* ------------------------------------------------------------------ */

export function sortNotes(
  notes: Note[],
  sort: SortKey,
  source: LibrarySource,
): Note[] {
  const list = [...notes];
  const stats = new Map(notes.map((note) => [note.id, noteStats(note, source)]));
  const recency = (note: Note) => new Date(note.updatedAt).getTime();
  /* Comparateur toujours cohérent : `Infinity - Infinity` donne NaN et
     laisse le tri dans un ordre arbitraire. */
  const byNumber = (a: number, b: number, tieA: Note, tieB: Note) => {
    if (a === b) return recency(tieB) - recency(tieA);
    return a - b;
  };

  switch (sort) {
    case "title":
      return list.sort((a, b) =>
        a.title.localeCompare(b.title, "fr", { sensitivity: "base" }),
      );
    case "due":
      return list.sort((a, b) =>
        byNumber(
          stats.get(b.id)?.due ?? 0,
          stats.get(a.id)?.due ?? 0,
          a,
          b,
        ),
      );
    case "nextDue":
      return list.sort((a, b) =>
        byNumber(
          stats.get(a.id)?.nextDue ?? Number.POSITIVE_INFINITY,
          stats.get(b.id)?.nextDue ?? Number.POSITIVE_INFINITY,
          a,
          b,
        ),
      );
    case "questions":
      return list.sort((a, b) =>
        byNumber(
          stats.get(b.id)?.questions ?? 0,
          stats.get(a.id)?.questions ?? 0,
          a,
          b,
        ),
      );
    default:
      return list.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
}

export function filterNotes(
  source: LibrarySource,
  filters: LibraryFilters,
  now: Date = new Date(),
): Note[] {
  const matching = source.notes.filter((note) =>
    matchesFilters(note, filters, source, now),
  );
  return sortNotes(matching, filters.sort, source);
}

/* ------------------------------------------------------------------ */
/* Comptes à facettes : nombre de résultats pour chaque option,        */
/* en tenant compte de tous les autres critères actifs.                */
/* ------------------------------------------------------------------ */

export function countNotes(
  source: LibrarySource,
  filters: LibraryFilters,
  now: Date = new Date(),
): number {
  return source.notes.filter((note) =>
    matchesFilters(note, filters, source, now),
  ).length;
}

export function facetCounts<T extends string>(
  source: LibrarySource,
  filters: LibraryFilters,
  values: readonly T[],
  apply: (filters: LibraryFilters, value: T) => LibraryFilters,
  now: Date = new Date(),
): Record<T, number> {
  const counts = {} as Record<T, number>;
  for (const value of values) {
    counts[value] = countNotes(source, apply(filters, value), now);
  }
  return counts;
}

/* ------------------------------------------------------------------ */
/* Puces de filtre actives + compteur                                  */
/* ------------------------------------------------------------------ */

export interface FilterChip {
  key: string;
  label: string;
  clear: (filters: LibraryFilters) => LibraryFilters;
}

export function activeFilterCount(filters: LibraryFilters): number {
  return (
    filters.methods.length +
    filters.collections.length +
    filters.statuses.length +
    (filters.review === "all" ? 0 : 1) +
    (filters.activity === "all" ? 0 : 1) +
    (filters.scope === "all" ? 0 : 1)
  );
}

export function hasConstraints(filters: LibraryFilters): boolean {
  return activeFilterCount(filters) > 0 || filters.query.trim().length > 0;
}

export function activeChips(filters: LibraryFilters, methodLabel: (m: Method) => string): FilterChip[] {
  const chips: FilterChip[] = [];

  for (const method of filters.methods) {
    chips.push({
      key: `method-${method}`,
      label: methodLabel(method),
      clear: (current) => ({
        ...current,
        methods: current.methods.filter((item) => item !== method),
      }),
    });
  }
  for (const collection of filters.collections) {
    chips.push({
      key: `collection-${collection}`,
      label: collection,
      clear: (current) => ({
        ...current,
        collections: current.collections.filter((item) => item !== collection),
      }),
    });
  }
  for (const status of filters.statuses) {
    chips.push({
      key: `status-${status}`,
      label: STATUS_LABELS[status],
      clear: (current) => ({
        ...current,
        statuses: current.statuses.filter((item) => item !== status),
      }),
    });
  }
  if (filters.review !== "all") {
    chips.push({
      key: "review",
      label: REVIEW_LABELS[filters.review],
      clear: (current) => ({ ...current, review: "all" }),
    });
  }
  if (filters.activity !== "all") {
    chips.push({
      key: "activity",
      label: ACTIVITY_LABELS[filters.activity],
      clear: (current) => ({ ...current, activity: "all" }),
    });
  }
  if (filters.scope !== "all") {
    chips.push({
      key: "scope",
      label: `Dans : ${SCOPE_LABELS[filters.scope]}`,
      clear: (current) => ({ ...current, scope: "all" }),
    });
  }
  return chips;
}

export function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function collectionsOf(source: LibrarySource): string[] {
  return Array.from(
    new Set(
      source.notes
        .filter((note) => !note.deletedAt)
        .map((note) => note.collection)
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "fr"));
}
