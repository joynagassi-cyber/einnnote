/* Modèle de données du prototype (miroir du schéma SQLite du cahier des charges v3.0) */

export type Method = "outline" | "cornell" | "mindmap" | "zettelkasten";

export type ThemeMode = "light" | "dark" | "system";

export type AccentKey =
  | "teal"
  | "indigo"
  | "blue"
  | "violet"
  | "green"
  | "terracotta"
  | "plum"
  | "graphite"
  | "custom";

export type CanvasBg = "dots" | "ruled" | "grid" | "blank";

/** D’où vient la couleur d’action : le thème, un preset, ou une couleur libre. */
export type AccentMode = "theme" | "preset" | "custom";

export type NoteFont = "literata" | "inter";

export type NoteStatus = "draft" | "captured" | "questioned" | "done";

export type Rating = "again" | "hard" | "good" | "easy";

export interface Block {
  id: string;
  html: string;
  kind: "p" | "h1" | "h2" | "quote";
  bullet: boolean;
  indent: number;
  /** surlignage « réponse » : fond accent doux + soulignement accent */
  marked?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  /** projet auquel la note appartient (un seul) */
  projectId?: string;
  method: Method;
  title: string;
  collection: string;
  blocks: Block[];
  status: NoteStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  /** identifiants liés (mindmap / coffre) */
  mindmapId?: string;
  vaultId?: string;
}

export interface Question {
  id: string;
  noteId: string;
  text: string;
  createdAt: string;
}

export interface QuestionLink {
  id: string;
  questionId: string;
  blockId: string;
  passage: string;
  cardId: string;
}

export interface ReviewCard {
  id: string;
  linkId: string;
  questionId: string;
  noteId: string;
  due: string;
  /** intervalle courant en jours (stabilité) */
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReview?: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: Rating;
  reviewedAt: string;
  scheduledDays: number;
  elapsedDays: number;
}

export interface ZettelVault {
  id: string;
  projectId?: string;
  name: string;
  note?: string;
}

export interface ZettelCard {
  id: string;
  code: string;
  vaultId: string;
  title: string;
  body: string;
  source: string;
  image?: boolean;
  refs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MindNode {
  id: string;
  text: string;
  shape: "circle" | "rect" | "square" | "diamond";
  x: number;
  y: number;
  parentId?: string;
}

export interface MindEdge {
  id: string;
  source: string;
  target: string;
}

export type EdgeStyle = "curved" | "step" | "straight";

export interface MindMap {
  id: string;
  noteId: string;
  title: string;
  nodes: MindNode[];
  edges: MindEdge[];
  edgeStyle: EdgeStyle;
  updatedAt: string;
}

export interface LessonStep {
  title: string;
  body: string;
  illustration: "book" | "question" | "map" | "cards" | "review" | "timer";
  practice?: { title: string; text: string; noteId?: string };
}

export interface Lesson {
  id: string;
  /** 1 = tutoriels par outil, 2 = cours « Lire pour retenir » */
  track: 1 | 2;
  index: number;
  title: string;
  subtitle: string;
  minutes: number;
  method?: Method;
  steps: LessonStep[];
}

export interface LessonProgress {
  lessonId: string;
  step: number;
  doneAt?: string;
}

export type Density = "compact" | "regular" | "airy";
export type RadiusStyle = "soft" | "regular" | "sharp";
export type BorderStyle = "subtle" | "regular" | "strong";
export type ElevationStyle = "flat" | "regular" | "raised";
export type PaperTint = "sand" | "ivory" | "grey" | "mist";

/** Personnalisation fine : chaque valeur pilote une variable CSS réelle. */
export interface Personalization {
  density: Density;
  radius: RadiusStyle;
  borders: BorderStyle;
  elevation: ElevationStyle;
  paper: PaperTint;
  /** interligne des notes, en pixels */
  noteLeading: number;
  /** largeur de lecture en bureau, en pixels */
  readingWidth: number;
  /** opacité du motif de canevas, 0-100 */
  canvasStrength: number;
}

export interface AppSettings {
  theme: ThemeMode;
  /** palette complète (23 thèmes vérifiés) */
  paletteKey: string;
  accentMode: AccentMode;
  accent: AccentKey;
  /** couleur libre utilisée quand `accent === "custom"` */
  customAccent?: string;
  canvas: CanvasBg;
  /** fond « verre » : identifiant de `lib/walls.ts`, ou null */
  wallpaper: string | null;
  /** flou du fond, en pixels */
  wallBlur: number;
  /** voile qui protège la lisibilité du texte, en pourcentage */
  wallDim: number;
  font: NoteFont;
  fontSize: number;
  contrast: "system" | "on" | "off";
  motion: "system" | "reduced";
  transparency: "system" | "reduced";
  language: "fr" | "en";
  onboarded: boolean;
  personalization: Personalization;
  /** dernière sauvegarde chiffrée réussie (ISO) */
  lastBackupAt?: string;
}
