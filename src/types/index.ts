export type Method = 'outline' | 'cornell' | 'mindmap' | 'zettelkasten';
export type CanvasBg = 'dots' | 'ruled' | 'grid' | 'blank';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'teal' | 'blue' | 'violet' | 'green' | 'terracotta' | 'plum' | 'graphite';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface Note {
  id: string;
  method: Method;
  title: string;
  contentJson: any;
  status: 'draft' | 'captured' | 'questioned' | 'done';
  createdAt: string;
  updatedAt: string;
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
  fromPos: number;
  toPos: number;
}

export interface ZettelCard {
  id: string;
  title: string;
  bodyJson: any;
  sourceRef: string;
  refs: string[];
  createdAt: string;
}

export interface MindMapNode {
  id: string;
  x: number;
  y: number;
  shape: 'circle' | 'rect' | 'square' | 'diamond';
  edgeStyle: 'straight' | 'step' | 'curve';
  text: string;
  color?: string;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
}

export interface ReviewCard {
  id: string;
  sourceType: 'question' | 'zettel';
  sourceId: string;
  due: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
}

export interface ReviewLog {
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  elapsedDays: number;
  scheduledDays: number;
}

export interface AppSettings {
  theme: ThemeMode;
  accent: AccentColor;
  canvasBg: CanvasBg;
  font: 'literata' | 'inter';
  fontSize: number;
  contrast: boolean;
  reduceMotion: boolean;
  language: 'fr' | 'en';
  pinSet: boolean;
  onboarded: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  completed: boolean;
  doneAt?: string;
  category: 'tutorial' | 'course';
}
