import type { Rating, ReviewCard } from "@/types";

/**
 * Ordonnanceur de répétition espacée.
 *
 * Le cahier des charges prévoit `ts-fsrs` en production. Ce prototype en
 * reprend la logique visible : quatre évaluations, un intervalle prévisualisé
 * sur chaque bouton, et une stabilité qui grandit avec les réussites.
 */
export const RATINGS: {
  value: Rating;
  label: string;
  hint: string;
}[] = [
  { value: "again", label: "Encore", hint: "à revoir tout de suite" },
  { value: "hard", label: "Difficile", hint: "avec peine" },
  { value: "good", label: "Bien", hint: "réponse juste" },
  { value: "easy", label: "Facile", hint: "sans effort" },
];

const MINUTE = 10 / (24 * 60); // 10 minutes en jours

/** Intervalle (en jours) qu’appliquerait une évaluation, sans rien modifier. */
export function previewInterval(card: ReviewCard, rating: Rating): number {
  if (rating === "again") return MINUTE;
  const first = card.reps === 0;
  switch (rating) {
    case "hard":
      return first ? 1 : Math.max(1, Math.round(card.stability * 1.2));
    case "good":
      return first ? 3 : Math.max(2, Math.round(card.stability * 2.4));
    case "easy":
      return first ? 7 : Math.max(4, Math.round(card.stability * 3.6));
  }
}

/** Libellé court affiché sous le bouton d’évaluation. */
export function formatInterval(days: number): string {
  if (days < 1 / 24) return "< 10 min";
  if (days < 1) {
    const minutes = Math.max(10, Math.round(days * 24 * 60));
    return `${minutes} min`;
  }
  if (days < 31) return `${Math.round(days)} j`;
  if (days < 365) return `${Math.round(days / 30)} mois`;
  const years = days / 365;
  return `${years < 2 ? years.toFixed(1).replace(".0", "") : Math.round(years)} an${years >= 2 ? "s" : ""}`;
}

export function nextCardState(card: ReviewCard, rating: Rating, now = Date.now()) {
  const days = previewInterval(card, rating);
  const due = new Date(now + days * 86_400_000).toISOString();
  const difficulty = Math.min(
    10,
    Math.max(
      1,
      card.difficulty +
        (rating === "again" ? 0.9 : rating === "hard" ? 0.25 : rating === "easy" ? -0.35 : 0),
    ),
  );
  const stability =
    rating === "again" ? Math.max(0.05, card.stability * 0.4) : days;

  return {
    due,
    stability,
    difficulty,
    reps: card.reps + 1,
    lapses: rating === "again" ? card.lapses + 1 : card.lapses,
    lastReview: new Date(now).toISOString(),
  };
}

export function isDue(card: ReviewCard, now = new Date()): boolean {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return new Date(card.due).getTime() <= endOfDay.getTime();
}

export function dueCards(cards: ReviewCard[], now = new Date()): ReviewCard[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
}

/** Estimation affichée dans le bandeau de la bibliothèque. */
export function estimateMinutes(count: number): number {
  return Math.max(1, Math.round(count * 0.7));
}
