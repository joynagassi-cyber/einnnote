import { Rating as FsrsRating, State, createEmptyCard, fsrs, type Grade } from "ts-fsrs";
import type { Rating, ReviewSettings, Schedulable } from "@/types";

/**
 * Ordonnanceur de répétition espacée — **FSRS-5** via `ts-fsrs`.
 *
 * Historique : la première version appliquait une croissance d’intervalle
 * inventée (`stability × 2.4`). Elle donnait des chiffres plausibles et un
 * comportement faux : pas d’état d’apprentissage, pas de recalage après un
 * échec, pas de difficulté par carte. On utilise désormais l’algorithme
 * public FSRS-5 (celui de ts-fsrs, poids par défaut), qui produit une
 * probabilité de rappel et un intervalle optimal pour une rétention visée.
 *
 * Ce que ce module garantit :
 * - **déterministe** : `now` est toujours un paramètre, jamais `Date.now()`
 *   implicite (les tests passent une date fixe) ;
 * - **rétrocompatible** : les cartes enregistrées avant FSRS (sans `state`)
 *   sont converties à la volée (voir `toFsrsCard`) ;
 * - **une seule source** : l’aperçu sous les boutons et l’intervalle appliqué
 *   sortent du même appel `repeat()`.
 */

export const RATINGS: {
  value: Rating;
  label: string;
  hint: string;
}[] = [
  { value: "again", label: "Encore", hint: "raté — revient dans la séance" },
  { value: "hard", label: "Difficile", hint: "retrouvé avec peine" },
  { value: "good", label: "Bien", hint: "retrouvé sans effort" },
  { value: "easy", label: "Facile", hint: "immédiat" },
];

/** Correspondance note → note FSRS (1 Again, 2 Hard, 3 Good, 4 Easy). */
const FSRS_RATING: Record<Rating, Grade> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  retention: 0.9,
  dailyNew: 20,
  dailyReview: 200,
  order: "due",
  showIntervals: true,
  reminder: { enabled: false, time: "19:00", notifications: false },
};

export function reviewSettings(partial?: Partial<ReviewSettings> | null): ReviewSettings {
  if (!partial) return DEFAULT_REVIEW_SETTINGS;
  return {
    ...DEFAULT_REVIEW_SETTINGS,
    ...partial,
    reminder: { ...DEFAULT_REVIEW_SETTINGS.reminder, ...(partial.reminder ?? {}) },
  };
}

export interface SchedulerOptions {
  /** rétention visée, 0,80 – 0,97 */
  retention?: number;
  /** intervalle maximal, en jours */
  maximumInterval?: number;
}

/** Instance FSRS configurée. Créée à la demande : `fsrs()` est sans état. */
export function scheduler(options: SchedulerOptions = {}) {
  const retention = Math.min(0.97, Math.max(0.8, options.retention ?? 0.9));
  return fsrs({
    request_retention: retention,
    maximum_interval: options.maximumInterval ?? 36_500,
  });
}

const DAY = 86_400_000;

/**
 * Convertit une carte enregistrée vers le format ts-fsrs.
 *
 * Les cartes d’avant FSRS n’ont ni `state` ni `last_review`. On les traite
 * comme des cartes de révision déjà connues (jamais comme des nouveautés) :
 * sinon, une deuxième « première » rencontre casserait la progression — et
 * les intervalles affichés mentiraient.
 */
export function toFsrsCard(card: Schedulable, now = new Date()) {
  const due = new Date(card.due);
  const state =
    card.state ??
    (card.reps === 0 ? State.New : card.lastReview ? State.Review : State.Review);
  const scheduledDays =
    card.scheduledDays ?? Math.max(0, Math.round((due.getTime() - now.getTime()) / DAY));
  const lastReview =
    card.lastReview != null
      ? new Date(card.lastReview)
      : state === State.New
        ? undefined
        : new Date(now.getTime() - Math.max(0, scheduledDays) * DAY);
  return {
    due,
    stability: card.stability || 0,
    difficulty: card.difficulty || 0,
    elapsed_days: card.elapsedDays ?? 0,
    scheduled_days: scheduledDays,
    learning_steps: card.learningSteps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: state as State,
    last_review: lastReview,
  };
}

/** Intervalle (en jours) qu’appliquerait une évaluation, sans rien modifier. */
export function previewInterval(
  card: Schedulable,
  rating: Rating,
  options: SchedulerOptions = {},
  now = new Date(),
): number {
  const record = scheduler(options).next(toFsrsCard(card, now), now, FSRS_RATING[rating]);
  return Math.max(0, (record.card.due.getTime() - now.getTime()) / DAY);
}

/** Les quatre intervalles d’un coup : un seul calcul, quatre boutons. */
export function previewAll(
  card: Schedulable,
  options: SchedulerOptions = {},
  now = new Date(),
): Record<Rating, number> {
  const plan = scheduler(options).repeat(toFsrsCard(card, now), now);
  const days = (index: FsrsRating) =>
    Math.max(0, (plan[index].card.due.getTime() - now.getTime()) / DAY);
  return {
    again: days(FsrsRating.Again),
    hard: days(FsrsRating.Hard),
    good: days(FsrsRating.Good),
    easy: days(FsrsRating.Easy),
  };
}

/** Libellé court affiché sous le bouton d’évaluation. */
export function formatInterval(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return "maintenant";
  if (days * 1440 < 60) return `${Math.max(1, Math.round(days * 1440))} min`;
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24));
    return `${hours} h`;
  }
  if (days < 31) return `${Math.round(days)} j`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} mois`;
  }
  const years = days / 365;
  return `${years < 2 ? years.toFixed(1).replace(".0", "") : Math.round(years)} an${
    years >= 2 ? "s" : ""
  }`;
}

/** Nouvel état de planification après une évaluation. */
export function nextCardState(
  card: Schedulable,
  rating: Rating,
  options: SchedulerOptions = {},
  now = new Date(),
): Schedulable {
  const record = scheduler(options).next(toFsrsCard(card, now), now, FSRS_RATING[rating]);
  const next = record.card;
  return {
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    reps: next.reps,
    lapses: next.lapses,
    lastReview: next.last_review?.toISOString() ?? now.toISOString(),
    state: next.state,
    scheduledDays: next.scheduled_days,
    elapsedDays: next.elapsed_days,
    learningSteps: next.learning_steps,
  };
}

/** Probabilité de rappel estimée aujourd’hui (0–1), pour la page Progrès. */
export function retrievability(card: Schedulable, now = new Date()): number {
  const f = scheduler();
  const fsrsCard = toFsrsCard(card, now);
  if (fsrsCard.state === State.New) return 0;
  const value = f.get_retrievability(fsrsCard, now, false);
  return typeof value === "number" ? value : Number(value) || 0;
}

export function isDue(card: Schedulable, now = new Date()): boolean {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return new Date(card.due).getTime() <= endOfDay.getTime();
}

export function dueCards<T extends Schedulable>(cards: T[], now = new Date()): T[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
}

/** Estimation affichée dans le bandeau de la bibliothèque. */
export function estimateMinutes(count: number): number {
  return Math.max(1, Math.round(count * 0.7));
}

/** Minuit local : la journée de révision est une journée civile, pas 24 h glissantes. */
export function startOfDay(now = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

/** Combien de cartes ont été révisées depuis minuit (journal local). */
export function reviewedToday(
  logs: { reviewedAt: string; cardId: string }[],
  now = new Date(),
): { total: number; cardIds: Set<string> } {
  const since = startOfDay(now);
  const today = logs.filter((log) => new Date(log.reviewedAt).getTime() >= since);
  return { total: today.length, cardIds: new Set(today.map((log) => log.cardId)) };
}

/** Y a-t-il un rappel à afficher maintenant ? (heure locale, une fois par jour) */
export function reminderDue(
  settings: ReviewSettings,
  due: number,
  now = new Date(),
): boolean {
  if (!settings.reminder.enabled || due <= 0) return false;
  const [hours, minutes] = settings.reminder.time.split(":").map(Number);
  const target = new Date(now);
  target.setHours(Number.isFinite(hours) ? hours : 19, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return now.getTime() >= target.getTime();
}

/** État FSRS d’une carte neuve, pour les fiches de coffre créées sans planification. */
export function freshSchedule(now = new Date()): Schedulable {
  const card = createEmptyCard(now);
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    reps: 0,
    lapses: 0,
    state: State.New,
    scheduledDays: 0,
    elapsedDays: 0,
    learningSteps: 0,
  };
}
