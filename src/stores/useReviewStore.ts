import { create } from "zustand";
import type { ReviewCard, ReviewLog, ReviewRating } from "../types";
import { mockReviewCards } from "../data/mocks";

const RATING_MAP: Record<ReviewRating, number> = { again: 0, hard: 1, good: 2, easy: 3 };

// Simple DS-2 inspired interval calculation
function calculateInterval(stability: number, difficulty: number, rating: number): number {
  const f = (s: number, d: number, r: number) => {
    const q = [s, d, r];
    const w = [0.4, 0.9, 2.3, 4.1, 13.0];
    let sum = 0;
    for (let i = 0; i < 5; i++) sum += w[i] * (i < q.length ? q[i] : 0);
    return Math.max(0.1, sum);
  };
  const nextStability = f(stability, difficulty, rating);
  const nextDifficulty = Math.min(10, difficulty - 0.8 + 0.28 * rating - 0.02 * rating * rating);
  return Math.round(nextStability * Math.pow(1.5, rating));
}

interface ReviewState {
  reviewCards: ReviewCard[];
  reviewLogs: ReviewLog[];
  currentCardIndex: number;
  sessionComplete: boolean;

  getDueToday: () => ReviewCard[];
  review: (cardId: string, rating: ReviewRating, elapsedDays: number) => void;
  setCurrentCardIndex: (index: number) => void;
  resetSession: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviewCards: mockReviewCards,
  reviewLogs: [],
  currentCardIndex: 0,
  sessionComplete: false,

  getDueToday: () => {
    const today = new Date().toISOString().slice(0, 10);
    return get().reviewCards.filter((c) => c.due.split("T")[0] <= today);
  },

  review: (cardId, rating, elapsedDays) => {
    const card = get().reviewCards.find((c) => c.id === cardId);
    if (!card) return;

    const scheduledDays = calculateInterval(card.stability, card.difficulty, RATING_MAP[rating]);
    const newDue = new Date(Date.now() + scheduledDays * 86400000).toISOString();

    set((s) => ({
      reviewCards: s.reviewCards.map((c) =>
        c.id === cardId
          ? {
              ...c,
              due: newDue,
              stability: card.stability * (1 + scheduledDays / Math.max(1, card.stability)),
              difficulty: Math.max(1, Math.min(10, card.difficulty - 0.8 + 0.28 * RATING_MAP[rating] - 0.02 * RATING_MAP[rating] ** 2)),
              reps: c.reps + 1,
              lapses: rating === "again" ? c.lapses + 1 : c.lapses,
            }
          : c
      ),
      reviewLogs: [
        ...s.reviewLogs,
        { cardId, rating, reviewedAt: new Date().toISOString(), elapsedDays, scheduledDays },
      ],
      currentCardIndex: s.currentCardIndex + 1,
      sessionComplete: s.currentCardIndex + 1 >= s.getDueToday().length,
    }));
  },

  setCurrentCardIndex: (index) => set({ currentCardIndex: index }),

  resetSession: () => set({ currentCardIndex: 0, sessionComplete: false }),
}));
