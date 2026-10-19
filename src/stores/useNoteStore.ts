import { create } from "zustand";
import type { Method, Note, Question, QuestionLink, ZettelCard } from "../types";
import { mockNotes, mockQuestions, mockZettelCards } from "../data/mocks";

interface NoteState {
  notes: Note[];
  questions: Question[];
  questionLinks: QuestionLink[];
  zettelCards: ZettelCard[];

  // Actions
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  getNote: (id: string) => Note | undefined;

  addQuestion: (q: Question) => void;
  getQuestionsForNote: (noteId: string) => Question[];

  addZettelCard: (card: ZettelCard) => void;
  updateZettelCard: (id: string, updates: Partial<ZettelCard>) => void;
  getZettelCards: () => ZettelCard[];
  getZettelCard: (id: string) => ZettelCard | undefined;

  searchNotes: (query: string) => Note[];
  filterByMethod: (method: Method) => Note[];
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: mockNotes,
  questions: mockQuestions,
  questionLinks: [],
  zettelCards: mockZettelCards,

  addNote: (note) => set((s) => ({ notes: [note, ...s.notes] })),

  updateNote: (id, updates) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)),
    })),

  deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  getNote: (id) => get().notes.find((n) => n.id === id),

  addQuestion: (q) => set((s) => ({ questions: [q, ...s.questions] })),

  getQuestionsForNote: (noteId) => get().questions.filter((q) => q.noteId === noteId),

  addZettelCard: (card) => set((s) => ({ zettelCards: [card, ...s.zettelCards] })),

  updateZettelCard: (id, updates) =>
    set((s) => ({
      zettelCards: s.zettelCards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  getZettelCards: () => get().zettelCards,

  getZettelCard: (id) => get().zettelCards.find((c) => c.id === id),

  searchNotes: (query) => {
    const q = query.toLowerCase();
    return get().notes.filter((n) => n.title.toLowerCase().includes(q));
  },

  filterByMethod: (method) => get().notes.filter((n) => n.method === method),
}));
