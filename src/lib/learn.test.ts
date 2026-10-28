import { describe, expect, it } from "vitest";
import {
  HUB_LESSON,
  TOTAL_LESSONS,
  TRACKS,
  countDone,
  isLessonDone,
  lessonsOf,
  nextLesson,
} from "@/lib/learn";
import { seedLessons } from "@/data/lessons";
import type { LessonProgress } from "@/types";

/**
 * Le parcours d’Apprendre est une décision, pas un tri : le socle (où vit une
 * note) passe avant les outils (comment l’écrire), qui passent avant le cours
 * de lecture. Ces tests tiennent cette décision — sans eux, un changement de
 * numérotation de piste remettrait « Lire pour retenir » en tête sans que
 * personne ne le remarque.
 */

const done = (lessonId: string): LessonProgress => ({
  lessonId,
  step: 0,
  doneAt: new Date().toISOString(),
});

describe("parcours", () => {
  it("commence par le socle : Espaces avant les outils", () => {
    expect(TRACKS[0].id).toBe(3);
    expect(TRACKS.map((track) => track.id)).toEqual([3, 1, 2]);
    expect(lessonsOf(3)[0].id).toBe(HUB_LESSON);
  });

  it("ouvre sur la hiérarchie projet → vault → note", () => {
    const hub = seedLessons.find((lesson) => lesson.id === HUB_LESSON);
    expect(hub).toBeDefined();
    const text = [hub!.title, hub!.subtitle, ...hub!.steps.map((step) => step.body)].join(" ");
    expect(text).toMatch(/projet/i);
    expect(text).toMatch(/vault/i);
    expect(text).toMatch(/note/i);
    // le premier geste de la leçon mène aux espaces, pas à un texte
    expect(hub!.steps[0].practice?.href).toBe("/spaces");
  });

  it("n’a ni identifiant ni rang en double", () => {
    const ids = seedLessons.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const track of TRACKS) {
      const indexes = lessonsOf(track.id).map((lesson) => lesson.index);
      expect(new Set(indexes).size).toBe(indexes.length);
    }
    expect(TOTAL_LESSONS).toBe(seedLessons.length);
  });

  it("ne propose que des gestes qui mènent à une page réelle", () => {
    /* Les seules pages où un geste de leçon peut envoyer : la bibliothèque,
       Espaces, l’éditeur, la révision, une autre leçon. */
    const roots = ["", "spaces", "new", "review", "learn"];
    for (const lesson of seedLessons) {
      for (const step of lesson.steps) {
        if (!step.practice?.href) continue;
        const path = step.practice.href.split("?")[0];
        /* La première barre du chemin suffit : `/learn/x-2` reste une leçon. */
        const [root = ""] = path.split("/").filter(Boolean);
        expect(roots).toContain(root);
        // un bouton sans libellé serait un bouton muet
        expect(step.practice.hrefLabel).toBeTruthy();
      }
    }
  });
});

describe("progression", () => {
  it("propose le socle à qui n’a rien commencé", () => {
    const next = nextLesson([]);
    expect(next?.lesson.id).toBe(HUB_LESSON);
    expect(next?.track.id).toBe(3);
  });

  it("avance dans l’ordre et saute une piste terminée", () => {
    const socleDone = lessonsOf(3).map((lesson) => done(lesson.id));
    expect(nextLesson(socleDone)?.track.id).toBe(1);
    expect(nextLesson(socleDone)?.lesson.id).toBe("t-outline");

    const halfSocle = lessonsOf(3)
      .slice(0, 2)
      .map((lesson) => done(lesson.id));
    expect(nextLesson(halfSocle)?.lesson.index).toBe(3);
  });

  it("ne propose plus rien quand tout est fait", () => {
    const all = seedLessons.map((lesson) => done(lesson.id));
    expect(nextLesson(all)).toBeNull();
    expect(TOTAL_LESSONS).toBe(all.length);
  });

  it("compte par piste et reconnaît une leçon terminée", () => {
    const progress = [done("x-1"), done("x-2")];
    expect(countDone(progress, 3)).toEqual({ done: 2, total: lessonsOf(3).length });
    expect(countDone(progress, 1)).toEqual({ done: 0, total: lessonsOf(1).length });
    expect(isLessonDone(progress, "x-1")).toBe(true);
    // commencée mais pas finie : `step` seul ne vaut pas « terminé »
    expect(isLessonDone([{ lessonId: "x-3", step: 1 }], "x-3")).toBe(false);
  });
});
