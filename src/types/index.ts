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

/**
 * Le type d’un bloc — et non un nœud : tout ce qui suit reste **dans la même
 * boîte**, le schéma de l’éditeur ne bouge pas. C’est ce qui permet à une
 * question de rester ancrée quand on transforme un paragraphe en titre, en
 * citation ou en case à cocher.
 */
export type BlockKind = "p" | "h1" | "h2" | "h3" | "quote" | "rule";

export interface Block {
  id: string;
  html: string;
  kind: BlockKind;
  /** liste à puces */
  bullet: boolean;
  /** liste numérotée — attribut, pas un nœud de liste */
  ordered?: boolean;
  /** case à cocher */
  task?: boolean;
  /** cochée (n’a de sens qu’avec `task`) */
  checked?: boolean;
  indent: number;
  /** alignement d’un paragraphe ou d’un titre */
  align?: "center" | "right";
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
  /** identifiants liés (mindmap / vault) */
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

/**
 * État de planification partagé par les cartes de question (Cornell) et les
 * fiches de vault. Les champs `state`, `scheduledDays`, `elapsedDays` et
 * `learningSteps` viennent de FSRS (`ts-fsrs`) ; ils sont optionnels pour
 * rester compatible avec les sauvegardes antérieures, converties à la volée.
 */
export interface Schedulable {
  due: string;
  /** intervalle courant en jours (stabilité FSRS) */
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReview?: string;
  /** 0 New · 1 Learning · 2 Review · 3 Relearning */
  state?: number;
  scheduledDays?: number;
  elapsedDays?: number;
  learningSteps?: number;
}

export interface ReviewCard extends Schedulable {
  id: string;
  linkId: string;
  questionId: string;
  noteId: string;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: Rating;
  reviewedAt: string;
  scheduledDays: number;
  elapsedDays: number;
}

/**
 * Un vault n’est **pas** une méthode : c’est une catégorie du projet
 * (« Superposition quantique »), où l’on range des notes et leurs fiches.
 */
export interface ZettelVault {
  id: string;
  projectId?: string;
  name: string;
  note?: string;
  createdAt?: string;
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
  /** Une fiche de vault se révise aussi : titre au recto, corps au verso. */
  schedule?: Schedulable;
}

export interface MindNode {
  id: string;
  text: string;
  /** formes proposées à la création : quatre historiques + deux ajoutées */
  shape: "circle" | "rect" | "square" | "diamond" | "hex" | "pill";
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
  /** style de présentation choisi (voir `src/lib/graph/styles.ts`) */
  styleId?: string;
  updatedAt: string;
}

export interface LessonStep {
  title: string;
  body: string;
  illustration: "book" | "question" | "map" | "cards" | "review" | "timer";
  /**
   * Le geste à faire tout de suite. `href` mène à la page où le faire — sans
   * lui, une pratique est un conseil ; avec lui, c’est un bouton.
   */
  practice?: { title: string; text: string; noteId?: string; href?: string; hrefLabel?: string };
}

export interface Lesson {
  id: string;
  /**
   * 3 = le socle (projet → vault → note, où vit quoi), 1 = tutoriels par
   * outil, 2 = cours « Lire pour retenir ». L’ordre d’affichage est celui de
   * `TRACKS` dans `src/lib/learn.ts`, pas celui des nombres.
   */
  track: 1 | 2 | 3;
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
  /**
   * Accent tiré de l’image de fond (voir `src/lib/palette.ts`).
   * Vrai par défaut : une image derrière l’interface et un accent choisi à
   * l’aveugle, c’est une dissonance visible sur chaque bouton.
   */
  dynamicAccent: boolean;
  /** style de graphe par défaut (voir `src/lib/graph/styles.ts`) */
  graphStyle: string;
  /** étiquettes de relation sur les liens */
  graphLabels: boolean;
  /** dessiner les renvois (liens hors arbre) */
  graphEchoes: boolean;
  /** animer les renvois (désactivé si mouvement réduit) */
  graphAnimate: boolean;
  font: NoteFont;
  fontSize: number;
  contrast: "system" | "on" | "off";
  motion: "system" | "reduced";
  transparency: "system" | "reduced";
  language: "fr" | "en";
  /** mise en page : suivre l’écran, ou forcer bureau / mobile */
  layout?: "auto" | "desktop" | "mobile";
  onboarded: boolean;
  personalization: Personalization;
  /** dernière sauvegarde chiffrée réussie (ISO) */
  lastBackupAt?: string;
  /** empreinte du contenu au moment du dernier export */
  backupStamp?: string;
  /** révision espacée : FSRS et rappels */
  review?: ReviewSettings;
}

/** Réglages de la révision espacée (page Réglages › Révision). */
export interface ReviewSettings {
  /** rétention visée par FSRS, 0,80 – 0,97 (0,90 par défaut) */
  retention: number;
  /** nouvelles cartes introduites par jour */
  dailyNew: number;
  /** cartes de révision par jour, plafond de sécurité */
  dailyReview: number;
  /** ordre de la séance */
  order: "due" | "random";
  /** afficher l'intervalle prévu sous chaque bouton d'évaluation */
  showIntervals: boolean;
  /** rappel quotidien dans l'application */
  reminder: {
    enabled: boolean;
    /** « HH:MM », heure locale */
    time: string;
    /** notification système si l'autorisation a été accordée */
    notifications: boolean;
  };
}
