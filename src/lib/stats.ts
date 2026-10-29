import type { Note, ReviewCard, ReviewLog, ZettelCard } from "@/types";

/**
 * Les chiffres de l’application, calculés et non décorés.
 *
 * Chaque fonction de ce fichier répond à une question qu’un utilisateur pose
 * vraiment (« est-ce que je progresse ? », « qu’est-ce qui m’attend cette
 * semaine ? ») et n’utilise que des données réellement enregistrées :
 * `note.createdAt`, `log.reviewedAt`, `schedule.due`. Aucune estimation, aucune
 * donnée inventée — le temps d’étude, par exemple, n’existe pas dans le modèle,
 * donc aucun graphique ne prétendra le mesurer.
 *
 * Tout est pur : `now` est un paramètre, jamais `new Date()` implicite.
 */

export interface ActivityPoint {
  /** `YYYY-MM-DD` */
  date: string;
  created: number;
  reviews: number;
}

const DAY = 86_400_000;

/**
 * `YYYY-MM-DD` d’une date, en heure locale (pas en UTC : un jour est un jour).
 *
 * Renvoie `""` pour une date absente ou illisible. Une seule ligne corrompue
 * dans le stockage ne doit pas vider tout l’écran de statistiques : les
 * fonctions ci-dessous ignorent simplement la clé vide, qui n’existe dans
 * aucune fenêtre.
 */
export function dayKey(date: Date | string | null | undefined): string {
  const value = date instanceof Date ? date : date ? new Date(date) : null;
  if (!value || Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Les `count` derniers jours, du plus ancien à aujourd’hui, jour vide compris. */
export function lastDays(now: Date, count: number): Date[] {
  const today = startOfLocalDay(now);
  return Array.from({ length: count }, (_, index) => addDays(today, index - (count - 1)));
}

/**
 * Activité jour par jour : notes créées et révisions faites.
 *
 * Les jours sans rien sont **présents à zéro** : sans eux, un histogramme
 * mentirait en collant deux semaines vides l’une contre l’autre.
 */
export function dailyActivity(
  notes: Note[],
  logs: ReviewLog[],
  days: number,
  now: Date = new Date(),
): ActivityPoint[] {
  const window = lastDays(now, days);
  const index = new Map(window.map((date) => [dayKey(date), { created: 0, reviews: 0 }]));

  for (const note of notes) {
    if (note.deletedAt) continue;
    const bucket = index.get(dayKey(note.createdAt));
    if (bucket) bucket.created += 1;
  }
  for (const log of logs) {
    const bucket = index.get(dayKey(log.reviewedAt));
    if (bucket) bucket.reviews += 1;
  }

  return window.map((date) => {
    const key = dayKey(date);
    const bucket = index.get(key)!;
    return { date: key, created: bucket.created, reviews: bucket.reviews };
  });
}

/**
 * Série : nombre de jours consécutifs avec au moins une révision, en remontant
 * depuis aujourd’hui (ou depuis hier, si rien n’a encore été fait aujourd’hui —
 * une journée en cours ne casse pas une série).
 */
export function streak(logs: ReviewLog[], now: Date = new Date()): number {
  const days = new Set(logs.map((log) => dayKey(log.reviewedAt)));
  if (days.size === 0) return 0;

  let cursor = startOfLocalDay(now);
  if (!days.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let count = 0;
  while (days.has(dayKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export interface Retention {
  total: number;
  passed: number;
  /** 0–100, arrondi */
  rate: number;
}

/** Rétention : part des révisions réussies (`good` ou `easy`) sur la période. */
export function retention(logs: ReviewLog[], since?: Date): Retention | null {
  const window = since
    ? logs.filter((log) => new Date(log.reviewedAt).getTime() >= startOfLocalDay(since).getTime())
    : logs;
  if (window.length === 0) return null;
  const passed = window.filter((log) => log.rating === "good" || log.rating === "easy").length;
  return { total: window.length, passed, rate: Math.round((passed / window.length) * 100) };
}

export interface WeeklyRetention {
  /** lundi de la semaine, `YYYY-MM-DD` */
  week: string;
  rate: number;
  total: number;
}

/** Rétention par semaine, de la plus ancienne à la plus récente. */
export function weeklyRetention(
  logs: ReviewLog[],
  weeks: number,
  now: Date = new Date(),
): WeeklyRetention[] {
  const result: WeeklyRetention[] = [];
  const today = startOfLocalDay(now);

  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const end = addDays(today, -offset * 7);
    const start = addDays(end, -6);
    const from = start.getTime();
    const to = addDays(end, 1).getTime();
    const window = logs.filter((log) => {
      const at = new Date(log.reviewedAt).getTime();
      return at >= from && at < to;
    });
    const passed = window.filter((log) => log.rating === "good" || log.rating === "easy").length;
    result.push({
      week: dayKey(start),
      rate: window.length === 0 ? 0 : Math.round((passed / window.length) * 100),
      total: window.length,
    });
  }
  return result;
}

export interface MethodCount {
  method: Note["method"];
  count: number;
}

/** Répartition des notes vivantes par méthode — l’ordre du plus au moins. */
export function methodBreakdown(notes: Note[]): MethodCount[] {
  const counts = new Map<Note["method"], number>();
  for (const note of notes) {
    if (note.deletedAt) continue;
    counts.set(note.method, (counts.get(note.method) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count || a.method.localeCompare(b.method));
}

export interface ForecastPoint {
  date: string;
  count: number;
}

/**
 * Charge à venir : combien de cartes et de fiches arrivent chaque jour.
 * Les cinq derniers jours de retard sont repliés sur aujourd’hui — sinon une
 * barre « en retard » de 300 cartes écraserait tout le reste du graphique.
 */
export function dueForecast(
  cards: (ReviewCard | ZettelCard)[],
  days: number,
  now: Date = new Date(),
): ForecastPoint[] {
  const window = lastDays(now, 1).concat(
    Array.from({ length: days - 1 }, (_, index) => addDays(startOfLocalDay(now), index + 1)),
  );
  const index = new Map(window.map((date) => [dayKey(date), 0]));
  const todayKey = dayKey(now);
  const horizon = addDays(startOfLocalDay(now), days).getTime();

  for (const card of cards) {
    /* Les deux modèles coexistent encore (voir `docs/ARCHITECTURE.md` §6) :
       une carte de question porte FSRS à plat, une fiche de vault le porte
       sous `schedule`. On lit les deux, on n’en privilégie aucun. */
    const raw = "due" in card ? card.due : card.schedule?.due;
    if (!raw) continue;
    const due = new Date(raw);
    const key = dayKey(due);
    if (due.getTime() < startOfLocalDay(now).getTime()) {
      index.set(todayKey, (index.get(todayKey) ?? 0) + 1);
      continue;
    }
    if (due.getTime() >= horizon) continue;
    if (index.has(key)) index.set(key, (index.get(key) ?? 0) + 1);
  }

  return window.map((date) => {
    const key = dayKey(date);
    return { date: key, count: index.get(key) ?? 0 };
  });
}

export interface ScopeRow {
  id: string;
  name: string;
  notes: number;
  due: number;
  retention: Retention | null;
}

/**
 * Tableau par projet : notes, à revoir, rétention.
 *
 * La rétention d’un projet se mesure sur les révisions **de ses notes** ; une
 * carte dont la note a été supprimée n’est attribuée à aucun projet plutôt que
 * d’être comptée au hasard.
 */
export function byProject(params: {
  projects: { id: string; name: string }[];
  notes: Note[];
  cards: ReviewCard[];
  logs: ReviewLog[];
  dueNow: (card: ReviewCard) => boolean;
}): ScopeRow[] {
  const { projects, notes, cards, logs, dueNow } = params;

  return projects.map((project) => {
    const own = notes.filter((note) => !note.deletedAt && note.projectId === project.id);
    const ids = new Set(own.map((note) => note.id));
    const ownCards = cards.filter((card) => ids.has(card.noteId));
    const ownLogs = logs.filter((log) =>
      ownCards.some((card) => card.id === log.cardId),
    );
    return {
      id: project.id,
      name: project.name,
      notes: own.length,
      due: ownCards.filter(dueNow).length,
      retention: retention(ownLogs),
    };
  });
}

/** Un pourcentage sûr : `null` plutôt qu’un `NaN` affiché. */
export function percent(value: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((value / total) * 100);
}

/** Bornes glissantes utilisées par l’écran (et par ses tests). */
export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export function periodStart(period: Period, now: Date = new Date()): Date {
  return addDays(startOfLocalDay(now), -(period - 1));
}

export { DAY };

/* ------------------------------------------------------------------ */
/* Lectures complémentaires                                            */
/* ------------------------------------------------------------------ */

export interface HeatmapDay {
  /** `YYYY-MM-DD` */
  date: string;
  /** actions du jour : notes créées + révisions */
  count: number;
}

export interface HeatmapWeek {
  days: HeatmapDay[];
}

/**
 * Régularité : une case par jour, sept par colonne, sur `weeks` semaines.
 *
 * C’est la seule lecture qui montre les **trous**. Un total mensuel peut être
 * excellent avec trois jours de travail intense ; une grille dit la vérité en
 * un regard. Les semaines commencent le lundi et se terminent aujourd’hui.
 */
export function regularity(
  notes: Note[],
  logs: ReviewLog[],
  weeks: number,
  now: Date = new Date(),
): HeatmapWeek[] {
  const today = startOfLocalDay(now);
  const offset = (today.getDay() + 6) % 7;
  const end = addDays(today, 6 - offset); // dimanche de la semaine en cours

  const counts = new Map<string, number>();
  for (const note of notes) {
    if (note.deletedAt) continue;
    const key = dayKey(note.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const log of logs) {
    const key = dayKey(log.reviewedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const firstMonday = addDays(end, -7 * weeks + 1);
  const result: HeatmapWeek[] = [];
  for (let week = 0; week < weeks; week += 1) {
    const days: HeatmapDay[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = addDays(firstMonday, week * 7 + day);
      const key = dayKey(date);
      days.push({
        date: key,
        count: date.getTime() > today.getTime() ? -1 : (counts.get(key) ?? 0),
      });
    }
    result.push({ days });
  }
  return result;
}

export interface WeekdayRhythm {
  /** 0 = lundi … 6 = dimanche */
  weekday: number;
  reviews: number;
}

/** Rythme : combien de révisions par jour de la semaine, sur tout l’historique. */
export function weekdayRhythm(logs: ReviewLog[]): WeekdayRhythm[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const log of logs) {
    const day = (new Date(log.reviewedAt).getDay() + 6) % 7;
    counts[day] += 1;
  }
  return counts.map((reviews, weekday) => ({ weekday, reviews }));
}

export interface RatingCount {
  rating: ReviewLog["rating"];
  count: number;
}

/** Distribution des quatre notes FSRS : ce que vos réponses disent vraiment. */
export function ratingBreakdown(logs: ReviewLog[], since?: Date): RatingCount[] {
  const order: ReviewLog["rating"][] = ["again", "hard", "good", "easy"];
  const from = since ? startOfLocalDay(since).getTime() : null;
  const window = from === null
    ? logs
    : logs.filter((log) => new Date(log.reviewedAt).getTime() >= from);
  return order.map((rating) => ({
    rating,
    count: window.filter((log) => log.rating === rating).length,
  }));
}
