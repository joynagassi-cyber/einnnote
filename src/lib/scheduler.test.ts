import { describe, expect, it } from "vitest";
import {
  DEFAULT_REVIEW_SETTINGS,
  dueCards,
  formatInterval,
  isDue,
  nextCardState,
  previewAll,
  previewInterval,
  reminderDue,
  reviewSettings,
} from "@/lib/scheduler";
import type { Schedulable } from "@/types";

const NOW = new Date("2026-05-01T09:00:00.000Z");

function card(partial: Partial<Schedulable> = {}): Schedulable {
  return {
    due: NOW.toISOString(),
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    ...partial,
  };
}

describe("ordonnanceur FSRS", () => {
  it("ordonne les quatre intervalles : encore < difficile < bien < facile", () => {
    const intervals = previewAll(card(), {}, NOW);
    expect(intervals.again).toBeLessThan(1 / 24);
    expect(intervals.hard).toBeLessThan(intervals.good);
    expect(intervals.good).toBeLessThan(intervals.easy);
  });

  it("fait grandir l’intervalle quand la carte est retrouvée sans effort", () => {
    const fresh = previewInterval(card(), "good", {}, NOW);
    const known = previewInterval(
      card({ stability: 12, difficulty: 3, reps: 4, state: 2, lastReview: "2026-04-20T09:00:00.000Z" }),
      "good",
      {},
      NOW,
    );
    expect(known).toBeGreaterThan(fresh);
  });

  it("renvoie une carte ratée dans la séance, pas dans un mois", () => {
    const next = nextCardState(
      card({ stability: 20, difficulty: 4, reps: 5, state: 2, lastReview: "2026-04-01T09:00:00.000Z" }),
      "again",
      {},
      NOW,
    );
    const days = (new Date(next.due).getTime() - NOW.getTime()) / 86_400_000;
    expect(days).toBeLessThan(1 / 24);
    expect(next.reps).toBe(6);
    expect(next.lapses).toBe(1);
    expect(next.state).toBe(3); // Relearning
  });

  it("raccourcit les intervalles quand la rétention visée monte", () => {
    const relaxed = previewInterval(card({ reps: 3, state: 2, stability: 10, difficulty: 4 }), "good", { retention: 0.8 }, NOW);
    const strict = previewInterval(card({ reps: 3, state: 2, stability: 10, difficulty: 4 }), "good", { retention: 0.97 }, NOW);
    expect(strict).toBeLessThan(relaxed);
  });

  it("est déterministe : deux appels à la même date donnent la même échéance", () => {
    const first = nextCardState(card({ reps: 2, state: 2, stability: 4, difficulty: 3 }), "good", {}, NOW);
    const second = nextCardState(card({ reps: 2, state: 2, stability: 4, difficulty: 3 }), "good", {}, NOW);
    expect(first.due).toBe(second.due);
    expect(first.stability).toBe(second.stability);
  });

  it("convertit une carte d’avant FSRS sans la traiter comme une nouveauté", () => {
    // reps > 0, pas de `state`, pas de `lastReview` : données du prototype.
    const legacy: Schedulable = {
      due: "2026-05-01T00:00:00.000Z",
      stability: 3,
      difficulty: 3.2,
      reps: 3,
      lapses: 0,
    };
    const next = nextCardState(legacy, "good", {}, NOW);
    expect(next.state).not.toBe(1); // ni Learning ni New
    expect(next.reps).toBe(4);
  });

  it("trie les cartes dues et ignore le futur", () => {
    const soon = card({ due: "2026-04-30T08:00:00.000Z" });
    const later = card({ due: "2026-06-30T08:00:00.000Z" });
    expect(isDue(soon, NOW)).toBe(true);
    expect(isDue(later, NOW)).toBe(false);
    expect(dueCards([later, soon], NOW)).toEqual([soon]);
  });

  it("formate les intervalles en français, sans virgule inutile", () => {
    expect(formatInterval(10 / 1440)).toBe("10 min");
    expect(formatInterval(3)).toBe("3 j");
    expect(formatInterval(45)).toBe("2 mois");
    expect(formatInterval(365 * 1.5)).toBe("1.5 an");
  });

  it("ne déclenche le rappel qu’après l’heure choisie et s’il reste des cartes", () => {
    const settings = reviewSettings({
      ...DEFAULT_REVIEW_SETTINGS,
      reminder: { enabled: true, time: "19:00", notifications: false },
    });
    expect(reminderDue(settings, 0, NOW)).toBe(false);
    expect(reminderDue(settings, 5, new Date("2026-05-01T18:59:00.000Z"))).toBe(false);
    expect(reminderDue(settings, 5, new Date("2026-05-01T19:00:00.000Z"))).toBe(true);
    expect(
      reminderDue({ ...settings, reminder: { ...settings.reminder, enabled: false } }, 5, NOW),
    ).toBe(false);
  });
});
