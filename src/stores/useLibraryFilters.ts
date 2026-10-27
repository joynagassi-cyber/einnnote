import { create } from "zustand";
import { DEFAULT_FILTERS, type LibraryFilters } from "@/lib/libraryFilters";

/**
 * Les filtres survivent à la navigation : on revient de la note avec la même
 * vue, sans avoir à reconstruire son filtre. Volontairement non persistés :
 * une nouvelle session repart d’une bibliothèque complète.
 */
interface LibraryFiltersState {
  filters: LibraryFilters;
  setFilters: (
    next: LibraryFilters | ((current: LibraryFilters) => LibraryFilters),
  ) => void;
  reset: () => void;
}

export const useLibraryFilters = create<LibraryFiltersState>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (next) =>
    set((state) => ({
      filters: typeof next === "function" ? next(state.filters) : next,
    })),
  reset: () => set({ filters: DEFAULT_FILTERS }),
}));
