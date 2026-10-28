import { seedLessons } from "@/data/seed";
import type { Lesson, LessonProgress } from "@/types";

/**
 * Les trois pistes d’**Apprendre**, dans l’ordre où on les montre.
 *
 * L’ordre est le message. « Le socle » passe avant les tutoriels parce qu’avant
 * de savoir *comment* prendre une note, il faut savoir *où* elle vit : un
 * projet contient des coffres, un coffre contient des notes. C’était le trou du
 * parcours — on apprenait six méthodes et on ne savait toujours pas où ranger
 * le résultat. Les tutoriels viennent ensuite (un outil à la fois), puis le
 * cours de lecture, qui est du contenu et non plus de la manipulation.
 */
export type TrackId = 1 | 2 | 3;

export interface Track {
  id: TrackId;
  /** Le nom de la piste, tel qu’il apparaît sur la page */
  label: string;
  /** Ce qu’elle promet, en une ligne */
  blurb: string;
}

export const TRACKS: Track[] = [
  {
    id: 3,
    label: "Le socle · vos espaces",
    blurb: "Où vivent vos notes : un projet, ses coffres, leurs fiches.",
  },
  {
    id: 1,
    label: "Tutoriels par outil",
    blurb: "Une méthode, un geste, une carte à la fin.",
  },
  {
    id: 2,
    label: "Cours · Lire pour retenir",
    blurb: "Quatre niveaux de lecture, du chapitre à l’article.",
  },
];

/** La leçon qui ouvre le parcours : elle répond à « je commence par quoi ? ». */
export const HUB_LESSON = "x-1";

export function lessonsOf(track: TrackId): Lesson[] {
  return seedLessons.filter((lesson) => lesson.track === track);
}

export function trackOf(lesson: Lesson): Track {
  return TRACKS.find((track) => track.id === lesson.track) ?? TRACKS[0];
}

export function isLessonDone(progress: LessonProgress[], lessonId: string): boolean {
  return progress.find((entry) => entry.lessonId === lessonId)?.doneAt !== undefined;
}

export function countDone(progress: LessonProgress[], track: TrackId): { done: number; total: number } {
  const lessons = lessonsOf(track);
  return {
    done: lessons.filter((lesson) => isLessonDone(progress, lesson.id)).length,
    total: lessons.length,
  };
}

/**
 * La prochaine leçon à ouvrir, dans l’ordre du parcours.
 *
 * Parcours voulu : le socle d’abord, puis les outils, puis le cours. Une piste
 * entièrement terminée est sautée — mais on ne saute jamais *dans* une piste :
 * les tutoriels se suivent, l’outline avant Cornell, parce que chacun pose le
 * vocabulaire du suivant.
 */
export function nextLesson(
  progress: LessonProgress[],
): { lesson: Lesson; track: Track } | null {
  for (const track of TRACKS) {
    const lessons = lessonsOf(track.id).sort((a, b) => a.index - b.index);
    const next = lessons.find((lesson) => !isLessonDone(progress, lesson.id));
    if (next) return { lesson: next, track };
  }
  return null;
}

/** Combien de leçons au total, toutes pistes confondues. */
export const TOTAL_LESSONS = seedLessons.length;
