import type { LessonProgress, Note, ReviewCard, ReviewLog, ZettelCard } from "@/types";
import { addDays, dayKey, startOfLocalDay } from "@/lib/stats";

/**
 * Le calendrier ne stocke rien : il **dérive** ses événements de ce qui est
 * déjà enregistré. Créer une entité « événement » aurait été plus simple à
 * coder et faux à l’usage — deux vérités pour une même révision.
 *
 * Quatre familles, et c’est tout :
 *   `note`    une note a été créée (ou modifiée, si on l’affiche)
 *   `review`  une révision a été faite
 *   `due`     des cartes arrivent à échéance
 *   `lesson`  une leçon a été terminée
 */

export type EventKind = "note" | "review" | "due" | "lesson";

export interface CalendarEvent {
  id: string;
  kind: EventKind;
  /** `YYYY-MM-DD` — le jour, jamais l’heure seule */
  date: string;
  /** heure locale `HH:MM` quand elle existe */
  time?: string;
  title: string;
  detail?: string;
  projectId?: string;
  noteId?: string;
}

export interface CalendarSources {
  notes: Note[];
  logs: ReviewLog[];
  cards: ReviewCard[];
  zettel: ZettelCard[];
  progress?: LessonProgress[];
  /** pour nommer les notes dans les révisions */
  noteById?: (id: string) => Note | undefined;
}

const pad = (value: number) => `${value}`.padStart(2, "0");

function timeOf(value: string): string {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Les événements d’un intervalle `[from, to]`, bornes incluses, triés. */
export function calendarEvents(
  sources: CalendarSources,
  from: Date,
  to: Date,
  options: { includeUpdated?: boolean } = {},
): CalendarEvent[] {
  const start = startOfLocalDay(from).getTime();
  const end = addDays(startOfLocalDay(to), 1).getTime();
  const inside = (value: string) => {
    const at = new Date(value).getTime();
    return at >= start && at < end;
  };

  const events: CalendarEvent[] = [];

  for (const note of sources.notes) {
    if (note.deletedAt) continue;
    if (inside(note.createdAt)) {
      events.push({
        id: `note-${note.id}`,
        kind: "note",
        date: dayKey(note.createdAt),
        time: timeOf(note.createdAt),
        title: note.title,
        detail: "Note créée",
        projectId: note.projectId,
        noteId: note.id,
      });
    }
    if (options.includeUpdated && note.updatedAt !== note.createdAt && inside(note.updatedAt)) {
      events.push({
        id: `edit-${note.id}`,
        kind: "note",
        date: dayKey(note.updatedAt),
        time: timeOf(note.updatedAt),
        title: note.title,
        detail: "Note modifiée",
        projectId: note.projectId,
        noteId: note.id,
      });
    }
  }

  for (const log of sources.logs) {
    if (!inside(log.reviewedAt)) continue;
    events.push({
      id: `log-${log.id}`,
      kind: "review",
      date: dayKey(log.reviewedAt),
      time: timeOf(log.reviewedAt),
      title: `Révision ${labelRating(log.rating)}`,
      detail: log.scheduledDays > 0 ? `prochaine dans ${log.scheduledDays} j` : undefined,
    });
  }

  /* Les échéances sont agrégées **par jour et par portée** : trente cartes dues
     le même jour font un événement, pas trente lignes. */
  const dueBuckets = new Map<string, { cardRefs: number; noteIds: Set<string> }>();
  const addDue = (due: string, noteId?: string) => {
    if (!inside(due)) return;
    const key = dayKey(due);
    const bucket = dueBuckets.get(key) ?? { cardRefs: 0, noteIds: new Set<string>() };
    bucket.cardRefs += 1;
    if (noteId) bucket.noteIds.add(noteId);
    dueBuckets.set(key, bucket);
  };

  for (const card of sources.cards) {
    if (card.due) addDue(card.due, card.noteId);
  }
  for (const fiche of sources.zettel) {
    if (fiche.schedule?.due) addDue(fiche.schedule.due);
  }

  for (const [date, bucket] of dueBuckets) {
    events.push({
      id: `due-${date}`,
      kind: "due",
      date,
      title: `${bucket.cardRefs} carte${bucket.cardRefs > 1 ? "s" : ""} à revoir`,
      detail:
        bucket.noteIds.size > 0
          ? `sur ${bucket.noteIds.size} note${bucket.noteIds.size > 1 ? "s" : ""}`
          : undefined,
    });
  }

  for (const entry of sources.progress ?? []) {
    if (!entry.doneAt || !inside(entry.doneAt)) continue;
    events.push({
      id: `lesson-${entry.lessonId}`,
      kind: "lesson",
      date: dayKey(entry.doneAt),
      time: timeOf(entry.doneAt),
      title: "Leçon terminée",
      detail: entry.lessonId,
    });
  }

  return events.sort(byTime);
}

function byTime(a: CalendarEvent, b: CalendarEvent): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  /* Les échéances n’ont pas d’heure : elles ferment la journée. */
  if (!a.time && !b.time) return a.title.localeCompare(b.title);
  if (!a.time) return 1;
  if (!b.time) return -1;
  return a.time.localeCompare(b.time);
}

function labelRating(rating: ReviewLog["rating"]): string {
  if (rating === "again") return "à refaire";
  if (rating === "hard") return "difficile";
  if (rating === "easy") return "facile";
  return "réussie";
}

export interface MonthDay {
  date: Date;
  key: string;
  /** appartient au mois affiché (sinon : jour de remplissage) */
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

/**
 * La grille d’un mois, semaines complètes du lundi au dimanche.
 *
 * 35 ou 42 cases selon le mois : c’est `weeks` qui décide, jamais une hauteur
 * fixe, sinon un mois de 6 semaines déborde de sa carte.
 */
export function monthGrid(cursor: Date, events: CalendarEvent[], now: Date = new Date()): MonthDay[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const start = addDays(first, -offset);
  const month = first.getMonth();
  const today = dayKey(now);

  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = byDay.get(event.date) ?? [];
    list.push(event);
    byDay.set(event.date, list);
  }

  const days: MonthDay[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = addDays(start, index);
    const key = dayKey(date);
    days.push({
      date,
      key,
      inMonth: date.getMonth() === month,
      isToday: key === today,
      events: byDay.get(key) ?? [],
    });
    if (index >= 34 && date.getMonth() !== month && (index + 1) % 7 === 0) break;
  }
  return days;
}

/** Ce qu’un jour contient, résumé pour la pastille de la case. */
export function daySummary(events: CalendarEvent[]): {
  kinds: EventKind[];
  due: number;
} {
  const kinds = [...new Set(events.map((event) => event.kind))];
  const due = events
    .filter((event) => event.kind === "due")
    .reduce((sum, event) => sum + (Number.parseInt(event.title, 10) || 0), 0);
  return { kinds, due };
}

export function monthLabel(cursor: Date): string {
  const label = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function dayLabel(date: Date): string {
  const label = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
