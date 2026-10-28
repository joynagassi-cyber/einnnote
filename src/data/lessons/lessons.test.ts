import { describe, expect, it } from "vitest";
import { seedLessons } from "@/data/lessons";

/**
 * La qualité du parcours, tenue par des tests.
 *
 * Une leçon « basique » se reconnaît à trois signes : elle n’annonce pas ce
 * qu’elle apprend, ses étapes n’ont pas de points à retenir, et elle ne dit
 * jamais comment savoir qu’on a compris. Ces tests interdisent les trois — et
 * interdisent aussi de renvoyer vers une note de démonstration : le parcours
 * porte sur les gestes, pas sur nos exemples.
 */

describe("contenu des leçons", () => {
  it("annonce ce qu’on saura faire, et en combien de temps", () => {
    for (const lesson of seedLessons) {
      expect(lesson.outcome.length, `${lesson.id} : objectif trop court`).toBeGreaterThan(60);
      expect(lesson.minutes).toBeGreaterThanOrEqual(4);
      expect(lesson.phases?.length).toBe(3);
    }
  });

  it("approfondit : au moins quatre étapes, chacune avec ses points", () => {
    for (const lesson of seedLessons) {
      expect(lesson.steps.length, `${lesson.id}`).toBeGreaterThanOrEqual(4);
      for (const [position, step] of lesson.steps.entries()) {
        const last = position === lesson.steps.length - 1;
        expect(step.body.length, `${lesson.id} / ${step.title}`).toBeGreaterThan(180);
        /* La dernière étape conclut par un critère ; les autres doivent
           apporter des points à retenir, pas des phrases de liaison. */
        if (!last) {
          expect(step.points?.length ?? 0, `${lesson.id} / ${step.title}`).toBeGreaterThanOrEqual(3);
        }
        if (last) expect(step.check, `${lesson.id} : pas de critère final`).toBeTruthy();
      }
    }
  });

  it("nomme les erreurs fréquentes et le critère de réussite", () => {
    let total = 0;
    for (const lesson of seedLessons) {
      const mistakes = lesson.steps.reduce((sum, step) => sum + (step.mistakes?.length ?? 0), 0);
      total += mistakes;
      expect(mistakes, `${lesson.id} : aucune erreur signalée`).toBeGreaterThanOrEqual(1);
      expect(
        lesson.steps.some((step) => Boolean(step.check)),
        `${lesson.id} : aucun critère de réussite`,
      ).toBe(true);
    }
    /* Un cours qui n’avertit jamais de rien n’est qu’un résumé. */
    expect(total).toBeGreaterThanOrEqual(seedLessons.length);
  });

  it("ne renvoie vers aucune note de démonstration", () => {
    for (const lesson of seedLessons) {
      for (const step of lesson.steps) {
        expect(step.practice?.noteId).toBeUndefined();
        expect(step.practice?.text ?? "").not.toMatch(/note exemple/i);
        expect(step.body).not.toMatch(/note exemple/i);
      }
    }
  });

  it("garde une progression cohérente dans chaque piste", () => {
    for (const track of [1, 2, 3]) {
      const indexes = seedLessons
        .filter((lesson) => lesson.track === track)
        .map((lesson) => lesson.index)
        .sort((a, b) => a - b);
      expect(indexes).toEqual(indexes.map((_, position) => position + 1));
    }
  });
});
