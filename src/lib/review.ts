import type {
  Method,
  Note,
  Project,
  Question,
  QuestionLink,
  ReviewCard,
  ReviewSettings,
  Schedulable,
  ZettelCard,
  ZettelVault,
} from "@/types";
import { isDue, startOfDay } from "@/lib/scheduler";

/**
 * Planification d’une séance de révision.
 *
 * Une séance mélange deux natures de cartes, et c’est volontaire :
 *
 * | Nature | Recto | Verso | Origine |
 * |---|---|---|---|
 * | `question` | la question écrite à froid | le passage surligné dans la note | Cornell / plan / note |
 * | `fiche` | le titre de la fiche | le corps, la source, les renvois | vault (Zettelkasten) |
 *
 * Les deux sont planifiées par FSRS et se révisent dans la même file : c’est
 * le geste de l’utilisateur (« je révise ce projet »), pas une distinction
 * d’implémentation. Le type est explicite pour que l’interface sache quoi
 * montrer au verso.
 */

export type ReviewTarget =
  | { kind: "all" }
  | { kind: "project"; id: string }
  | { kind: "vault"; id: string }
  | { kind: "note"; id: string };

export interface ReviewItem {
  /** identifiant de séance, stable et préfixé : `card:…` ou `fiche:…` */
  id: string;
  kind: "question" | "fiche";
  title: string;
  body: string;
  schedule: Schedulable;
  reps: number;
  due: string;
  /** question */ cardId?: string;
  questionId?: string;
  noteId?: string;
  noteTitle?: string;
  method?: Method;
  /** fiche */ zettelId?: string;
  code?: string;
  source?: string;
  refs?: string[];
  vaultId?: string;
  vaultName?: string;
  projectId?: string;
  projectName?: string;
}

export interface ReviewData {
  notes: Note[];
  questions: Question[];
  links: QuestionLink[];
  cards: ReviewCard[];
  zettel: ZettelCard[];
  vaults: ZettelVault[];
  projects: Project[];
}

/** État de planification d’une fiche qui n’a jamais été révisée. */
function scheduleOfZettel(card: ZettelCard): Schedulable {
  return (
    card.schedule ?? {
      due: card.createdAt,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      scheduledDays: 0,
      elapsedDays: 0,
      learningSteps: 0,
    }
  );
}

/**
 * Toutes les cartes révisables, sans filtre de portée.
 *
 * `now` sert uniquement à dater les cartes sans planification : une fiche
 * jamais révisée est due dès sa création, pas « dans un an ».
 */
export function allReviewItems(data: ReviewData): ReviewItem[] {
  const projectName = new Map(data.projects.map((p) => [p.id, p.name]));
  const vaultName = new Map(data.vaults.map((v) => [v.id, v.name]));
  const noteById = new Map(data.notes.map((n) => [n.id, n]));
  const questionById = new Map(data.questions.map((q) => [q.id, q]));
  const linkById = new Map(data.links.map((l) => [l.id, l]));

  const questions: ReviewItem[] = [];
  for (const card of data.cards) {
    const link = linkById.get(card.linkId);
    const question = questionById.get(card.questionId);
    const note = noteById.get(card.noteId);
    if (!question) continue;
    const projectId = note?.projectId;
    questions.push({
      id: `card:${card.id}`,
      kind: "question",
      cardId: card.id,
      questionId: question.id,
      title: question.text,
      body: link?.passage ?? "",
      schedule: card,
      reps: card.reps,
      due: card.due,
      noteId: note?.id,
      noteTitle: note?.title,
      method: note?.method,
      vaultId: note?.vaultId,
      vaultName: note?.vaultId ? vaultName.get(note.vaultId) : undefined,
      projectId,
      projectName: projectId ? projectName.get(projectId) : undefined,
    });
  }

  const fiches: ReviewItem[] = data.zettel.map((card) => {
    const schedule = scheduleOfZettel(card);
    const vault = data.vaults.find((v) => v.id === card.vaultId);
    const projectId = vault?.projectId;
    return {
      id: `fiche:${card.id}`,
      kind: "fiche",
      zettelId: card.id,
      title: card.title,
      body: card.body,
      code: card.code,
      source: card.source,
      refs: card.refs,
      schedule,
      reps: schedule.reps,
      due: schedule.due,
      vaultId: card.vaultId,
      vaultName: vault?.name,
      projectId,
      projectName: projectId ? projectName.get(projectId) : undefined,
    };
  });

  return [...questions, ...fiches];
}

/** Filtre une liste selon la portée choisie (projet, vault, note, tout). */
export function itemsInTarget(items: ReviewItem[], target: ReviewTarget): ReviewItem[] {
  switch (target.kind) {
    case "all":
      /* « Tout » reste la file des cartes **dues** : les questions, plus les
         fiches déjà travaillées. Une fiche neuve entre par son vault, jamais
         par surprise au milieu d’une séance de questions. */
      return items.filter((item) => item.kind === "question" || item.reps > 0);
    case "project":
      return items.filter((item) => item.projectId === target.id);
    case "vault":
      // Les fiches du vault **et** les questions des notes qui lui sont
      // rattachées : un vault est une réserve, pas une cloison.
      return items.filter((item) => item.vaultId === target.id);
    case "note":
      return items.filter((item) => item.noteId === target.id);
  }
}

export interface ScopeSummary {
  total: number;
  due: number;
  fresh: number;
}

export function summarize(items: ReviewItem[], now = new Date()): ScopeSummary {
  const due = items.filter((item) => isDue(item.schedule, now)).length;
  const fresh = items.filter((item) => item.reps === 0).length;
  return { total: items.length, due, fresh };
}

/**
 * Construit la séance.
 *
 * - `onlyDue` : ne garder que ce qui est échu (le cas par défaut de « Tout »).
 * - Les plafonds quotidiens (`dailyNew`, `dailyReview`) s’appliquent **par
 *   jour civil**, pas par séance : deux séances le même jour ne doublent pas
 *   le quota. Le compteur vient du journal de révision (`logs`).
 * - `again` n’est pas traité ici : une carte ratée est replacée en fin de
 *   séance par l’écran lui-même, ce qui garde cette fonction pure.
 */
export function planSession(
  items: ReviewItem[],
  settings: ReviewSettings,
  options: {
    now?: Date;
    onlyDue?: boolean;
    reviewedToday?: { cards: number; fresh: number };
  } = {},
): ReviewItem[] {
  const now = options.now ?? new Date();
  const dueOnly = options.onlyDue ?? true;
  const pool = dueOnly
    ? items
        .filter((item) => isDue(item.schedule, now))
        .sort((a, b) => new Date(a.schedule.due).getTime() - new Date(b.schedule.due).getTime())
    : items;

  const ordered = [...pool].sort((a, b) => {
    if (settings.order === "random") return Math.random() - 0.5;
    return new Date(a.schedule.due).getTime() - new Date(b.schedule.due).getTime();
  });

  const newAllowance = Math.max(0, settings.dailyNew - (options.reviewedToday?.fresh ?? 0));
  const reviewAllowance = Math.max(
    0,
    settings.dailyReview - (options.reviewedToday?.cards ?? 0),
  );

  const picked: ReviewItem[] = [];
  let fresh = 0;
  let reviews = 0;
  for (const item of ordered) {
    if (item.reps === 0) {
      if (fresh >= newAllowance) continue;
      fresh += 1;
    } else {
      if (reviews >= reviewAllowance) continue;
      reviews += 1;
    }
    picked.push(item);
  }
  return picked;
}

/** Ce qui a déjà été révisé aujourd’hui, à partir du journal. */
export function reviewedTodayCounts(
  logs: { reviewedAt: string; cardId: string }[],
  items: ReviewItem[],
  now = new Date(),
): { cards: number; fresh: number } {
  const since = startOfDay(now);
  const repsById = new Map(items.map((item) => [item.id, item.reps]));
  let cards = 0;
  let fresh = 0;
  for (const log of logs) {
    if (new Date(log.reviewedAt).getTime() < since) continue;
    cards += 1;
    // Une carte qui avait 0 répétition au moment du log était une nouveauté.
    const id = `card:${log.cardId}`;
    if (repsById.get(id) === 0) fresh += 1;
  }
  return { cards, fresh };
}

/** Résumé lisible d’une portée, pour les tuiles du hub. */
export function scopeLabel(target: ReviewTarget, data: ReviewData): string {
  switch (target.kind) {
    case "all":
      return "Toutes les cartes";
    case "project":
      return data.projects.find((p) => p.id === target.id)?.name ?? "Projet";
    case "vault":
      return data.vaults.find((v) => v.id === target.id)?.name ?? "Vault";
    case "note":
      return data.notes.find((n) => n.id === target.id)?.title ?? "Note";
  }
}
