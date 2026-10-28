import type {
  MindMap,
  Note,
  Project,
  Question,
  QuestionLink,
  ReviewCard,
  ReviewLog,
  LessonProgress,
  ZettelCard,
  ZettelVault,
} from "@/types";

/**
 * Modèle de synchronisation cloud.
 *
 * Le choix structurant : on ne synchronise **pas** un gros JSON en
 * « dernier qui écrit gagne ». Ce modèle perd des notes dès que deux appareils
 * travaillent : le second écrase la travail du premier, silencieusement.
 *
 * On synchronise donc **entité par entité**, avec une estampille par entité et
 * des **tombes** (tombstones) pour les suppressions. C’est plus de code, mais
 * c’est la seule façon de ne rien perdre — et c’est entièrement testable sans
 * réseau, ce que fait `merge.test.ts`.
 */

export const COLLECTIONS = [
  "projects",
  "notes",
  "questions",
  "links",
  "cards",
  "logs",
  "vaults",
  "zettel",
  "mindmaps",
  "progress",
] as const;

export type CollectionKey = (typeof COLLECTIONS)[number];

export type AnyEntity =
  | Project
  | Note
  | Question
  | QuestionLink
  | ReviewCard
  | ReviewLog
  | ZettelVault
  | ZettelCard
  | MindMap
  | LessonProgress;

/** Contenu local complet, tel qu’il est persisté. */
export interface ContentSnapshot {
  projects: Project[];
  notes: Note[];
  questions: Question[];
  links: QuestionLink[];
  cards: ReviewCard[];
  logs: ReviewLog[];
  vaults: ZettelVault[];
  zettel: ZettelCard[];
  mindmaps: MindMap[];
  progress: LessonProgress[];
}

/** « cette entité a été supprimée » — sans quoi elle ressuscite à la synchro. */
export interface Tombstone {
  collection: CollectionKey;
  id: string;
  deletedAt: string;
}

/** Une ligne telle qu’elle est stockée côté serveur. */
export interface CloudRow {
  collection: CollectionKey;
  entity_id: string;
  payload: Record<string, unknown>;
  /** millisecondes epoch ; sert d’arbitre */
  stamp: number;
  deleted: boolean;
  updated_at: string;
}

export interface MergeConflict {
  collection: CollectionKey;
  id: string;
  /** qui gagne, et pourquoi */
  winner: "local" | "remote";
  localStamp: number;
  remoteStamp: number;
}

export interface MergeReport {
  /** entités retenues du serveur (à appliquer localement) */
  applied: number;
  /** entités locales à envoyer */
  pushed: number;
  /** suppressions propagées */
  deleted: number;
  conflicts: MergeConflict[];
  /** entités identiques des deux côtés : rien à faire */
  unchanged: number;
}

export interface MergeOutcome {
  merged: ContentSnapshot;
  tombstones: Tombstone[];
  /** ce qu’il faut envoyer au serveur */
  toPush: CloudRow[];
  /** ce qu’il faut appliquer au store local */
  changedLocal: boolean;
  report: MergeReport;
}
