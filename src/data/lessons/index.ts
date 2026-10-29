import type { Lesson } from "@/types";
import { socleLessons } from "@/data/lessons/socle";
import { outilsLessons } from "@/data/lessons/outils";
import { lectureLessons } from "@/data/lessons/lecture";

/**
 * Le contenu d’Apprendre, séparé du reste des données.
 *
 * Trois fichiers, une piste chacun : le socle (où vivent les notes), les
 * outils (un geste par leçon), la lecture (le cours). Séparer ce contenu des
 * notes de démonstration permet de le relire comme un texte — et de le
 * corriger sans toucher au magasin.
 */
export const seedLessons: Lesson[] = [
  ...socleLessons,
  ...outilsLessons,
  ...lectureLessons,
];

export function lessonById(id: string): Lesson | undefined {
  return seedLessons.find((lesson) => lesson.id === id);
}
