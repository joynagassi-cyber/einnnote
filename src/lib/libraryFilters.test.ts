import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  activeChips,
  activeFilterCount,
  countNotes,
  facetCounts,
  filterNotes,
  hasConstraints,
  matchesFilters,
  noteBody,
  noteStats,
  tagsOf,
  toggleValue,
  type LibraryFilters,
  type LibrarySource,
} from "@/lib/libraryFilters";
import type { Note, ReviewCard } from "@/types";

/* ------------------------------------------------------------------ */
/* Jeu de données minimal, dates fixes                                 */
/* ------------------------------------------------------------------ */

const NOW = new Date("2026-10-27T12:00:00.000Z");
const iso = (days: number) =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

function note(partial: Partial<Note> & Pick<Note, "id" | "title">): Note {
  return {
    method: "cornell",
    collection: "Cours",
    blocks: [],
    status: "captured",
    createdAt: iso(-30),
    updatedAt: iso(-1),
    ...partial,
  };
}

function card(partial: Partial<ReviewCard> & Pick<ReviewCard, "id" | "noteId">) {
  return {
    linkId: "l-1",
    questionId: "q-1",
    due: iso(-2),
    stability: 3,
    difficulty: 5,
    reps: 1,
    ...partial,
  } as ReviewCard;
}

const notes: Note[] = [
  note({
    id: "n-due",
    title: "Contrats",
    blocks: [{ id: "b1", html: "Consentement et <em>capacité</em>", kind: "p", bullet: false, indent: 0 }],
    status: "questioned",
    updatedAt: iso(-0.08),
  }),
  note({
    id: "n-later",
    title: "Marché du travail",
    blocks: [{ id: "b1", html: "Salaire réel", kind: "p", bullet: false, indent: 0 }],
    status: "done",
    collection: "Éco",
    updatedAt: iso(-20),
    method: "outline",
  }),
  note({
    id: "n-empty",
    title: "Brouillon sans carte",
    status: "draft",
    collection: "Éco",
    updatedAt: iso(-2),
  }),
  note({
    id: "n-mindmap",
    title: "Système nerveux",
    method: "mindmap",
    mindmapId: "m-1",
    blocks: [],
    collection: "Thèse",
    updatedAt: iso(-45),
  }),
];

const source: LibrarySource = {
  notes,
  questions: [
    { id: "q-1", noteId: "n-due", text: "Quelles conditions de validité ?", createdAt: iso(-3) },
    { id: "q-2", noteId: "n-later", text: "Comment évolue le chômage ?", createdAt: iso(-3) },
  ],
  cards: [
    card({ id: "c-1", noteId: "n-due", questionId: "q-1", due: iso(-2) }),
    card({ id: "c-2", noteId: "n-due", questionId: "q-1", due: iso(+4) }),
    card({ id: "c-3", noteId: "n-later", questionId: "q-2", due: iso(+10), reps: 3 }),
  ],
  mindmaps: [
    {
      id: "m-1",
      noteId: "n-mindmap",
      title: "Système nerveux",
      nodes: [
        { id: "mn1", text: "Central", shape: "circle", x: 0, y: 0 },
        { id: "mn2", text: "Périphérique", shape: "rect", x: 0, y: 0 },
      ],
      edges: [],
      edgeStyle: "curved",
      updatedAt: iso(-45),
    },
  ],
  zettel: [],
  vaults: [],
};

const withFilters = (patch: Partial<LibraryFilters>): LibraryFilters => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

/** Ensemble, sans tenir compte de l’ordre. */
const ids = (list: Note[]) => list.map((item) => item.id).sort();
/** Ordre de passage du tri. */
const orderedIds = (list: Note[]) => list.map((item) => item.id);

/* ------------------------------------------------------------------ */

describe("filtres — étiquettes", () => {
  const taggedNote = (id: string, html: string) =>
    note({
      id,
      title: `Note ${id}`,
      blocks: [{ id: `${id}-b1`, html, kind: "p", bullet: false, indent: 0 }],
    });

  const tagged: LibrarySource = {
    ...source,
    notes: [
      taggedNote("n-t1", "Un #thèse et une #lecture"),
      taggedNote("n-t2", "Une #Thèse majuscule"),
      taggedNote("n-t3", "Un #these sans accent"),
    ],
  };

  /* L’accent compte : `#thèse` et `#these` sont deux étiquettes. La casse,
     elle, ne compte pas — sinon `#Thèse` ouvrirait une deuxième entrée. */
  it("liste les étiquettes réellement portées, sans doubler sur la casse", () => {
    expect(tagsOf(tagged)).toEqual(["lecture", "these", "thèse"]);
  });

  it("garde les notes qui portent l’étiquette, casse comprise", () => {
    expect(ids(filterNotes(tagged, withFilters({ tags: ["thèse"] }), NOW))).toEqual([
      "n-t1",
      "n-t2",
    ]);
  });

  it("élargit avec plusieurs étiquettes — un OU, pas un ET", () => {
    expect(
      ids(filterNotes(tagged, withFilters({ tags: ["lecture", "inconnue"] }), NOW)),
    ).toEqual(["n-t1"]);
  });

  it("ne laisse rien passer quand l’étiquette n’existe pas", () => {
    expect(filterNotes(tagged, withFilters({ tags: ["absente"] }), NOW)).toEqual([]);
  });

  it("compte l’étiquette comme un filtre actif, avec sa puce", () => {
    const filters = withFilters({ tags: ["lecture"] });
    expect(activeFilterCount(filters)).toBe(1);
    expect(hasConstraints(filters)).toBe(true);
    const chip = activeChips(filters, () => "")[0];
    expect(chip.label).toBe("#lecture");
    expect(chip.clear(filters).tags).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */

describe("statistiques par note", () => {
  it("compte les cartes dues, en retard et jamais révisées", () => {
    const stats = noteStats(notes[0], source, NOW);
    expect(stats.cards).toBe(2);
    expect(stats.due).toBe(1); // c-1 en retard
    expect(stats.overdue).toBe(1);
    expect(stats.questions).toBe(1);
    expect(stats.neverReviewed).toBe(false);
    expect(stats.nextDue).toBe(new Date(iso(-2)).getTime());
  });

  it("ne confond pas « sans carte » et « jamais révisée »", () => {
    expect(noteStats(notes[2], source, NOW).cards).toBe(0);
    const fresh = { ...card({ id: "c-9", noteId: "n-empty", due: iso(0) }), reps: 0 };
    const withFresh = { ...source, cards: [...source.cards, fresh] };
    const stats = noteStats(notes[2], withFresh, NOW);
    expect(stats.cards).toBe(1);
    expect(stats.neverReviewed).toBe(true);
  });
});

describe("filtres", () => {
  it("filtre par méthode et par état, avec un OU dans chaque groupe", () => {
    expect(ids(filterNotes(source, withFilters({ methods: ["mindmap"] }), NOW))).toEqual([
      "n-mindmap",
    ]);
    expect(
      ids(
        filterNotes(
          source,
          withFilters({ methods: ["mindmap", "outline"], statuses: ["done", "captured", "questioned", "draft"] }),
          NOW,
        ),
      ),
    ).toEqual(["n-later", "n-mindmap"]);
  });

  it("applique les cinq critères de révision", () => {
    const review = (value: LibraryFilters["review"]) =>
      ids(filterNotes(source, withFilters({ review: value }), NOW));

    expect(review("due")).toEqual(["n-due"]);
    expect(review("overdue")).toEqual(["n-due"]);
    expect(review("upToDate")).toEqual(["n-later"]);
    expect(review("noCards")).toEqual(["n-empty", "n-mindmap"]);
    expect(review("never")).toEqual([]);
    expect(review("all")).toEqual(["n-due", "n-empty", "n-later", "n-mindmap"]);
  });

  it("respecte la portée de la recherche", () => {
    // « capacité » n’est que dans le contenu
    expect(countNotes(source, withFilters({ query: "capacité" }), NOW)).toBe(1);
    expect(
      countNotes(source, withFilters({ query: "capacité", scope: "title" }), NOW),
    ).toBe(0);
    expect(
      countNotes(source, withFilters({ query: "capacité", scope: "body" }), NOW),
    ).toBe(1);
    // texte présent uniquement dans une question
    expect(
      countNotes(source, withFilters({ query: "validité", scope: "questions" }), NOW),
    ).toBe(1);
    expect(
      countNotes(source, withFilters({ query: "validité", scope: "body" }), NOW),
    ).toBe(0);
    // nom de collection cherchable seulement en portée « partout »
    expect(countNotes(source, withFilters({ query: "éco" }), NOW)).toBe(2);
    expect(
      countNotes(source, withFilters({ query: "éco", scope: "title" }), NOW),
    ).toBe(0);
  });

  it("cherche dans les nœuds d’une carte mentale", () => {
    expect(noteBody(notes[3], source)).toContain("Périphérique");
    expect(
      countNotes(source, withFilters({ query: "périphérique", scope: "body" }), NOW),
    ).toBe(1);
  });

  it("filtre par période de modification", () => {
    expect(ids(filterNotes(source, withFilters({ activity: "today" }), NOW))).toEqual([
      "n-due",
    ]);
    expect(ids(filterNotes(source, withFilters({ activity: "week" }), NOW))).toEqual([
      "n-due",
      "n-empty",
    ]);
    expect(ids(filterNotes(source, withFilters({ activity: "month" }), NOW))).toEqual([
      "n-due",
      "n-empty",
      "n-later",
    ]);
    expect(ids(filterNotes(source, withFilters({ activity: "older" }), NOW))).toEqual([
      "n-mindmap",
    ]);
  });

  it("ignore les notes en corbeille", () => {
    const trashed = {
      ...source,
      notes: [{ ...notes[0], deletedAt: iso(-1) }, ...notes.slice(1)],
    };
    expect(ids(filterNotes(trashed, DEFAULT_FILTERS, NOW))).toEqual([
      "n-empty",
      "n-later",
      "n-mindmap",
    ]);
  });

  it("trie par échéance, titre et nombre de questions", () => {
    // ordre significatif : échéance la plus proche d’abord, sans carte ensuite
    const byNextDue = orderedIds(
      filterNotes(source, withFilters({ sort: "nextDue" }), NOW),
    );
    expect(byNextDue).toEqual(["n-due", "n-later", "n-empty", "n-mindmap"]);

    // à égalité, la note modifiée le plus récemment passe devant
    expect(
      orderedIds(filterNotes(source, withFilters({ sort: "recent" }), NOW)),
    ).toEqual(["n-due", "n-empty", "n-later", "n-mindmap"]);
    expect(
      orderedIds(filterNotes(source, withFilters({ sort: "title" }), NOW)),
    ).toEqual(["n-empty", "n-due", "n-later", "n-mindmap"]);

    // deux notes à une question : la plus récemment modifiée d’abord
    expect(
      orderedIds(filterNotes(source, withFilters({ sort: "questions" }), NOW)),
    ).toEqual(["n-due", "n-later", "n-empty", "n-mindmap"]);
  });
});

describe("comptes à facettes et puces", () => {
  it("compte chaque option en tenant compte des autres critères", () => {
    const counts = facetCounts(
      source,
      withFilters({ statuses: ["questioned"] }),
      ["cornell", "outline", "mindmap", "zettelkasten"] as const,
      (current, method) => ({ ...current, methods: [...current.methods, method] }),
      NOW,
    );
    expect(counts.cornell).toBe(1);
    expect(counts.outline).toBe(0); // la note outline n’est pas « questionnée »
  });

  it("expose les puces actives et permet de les retirer une à une", () => {
    const filters = withFilters({
      methods: ["cornell"],
      statuses: ["draft"],
      review: "due",
      activity: "week",
      scope: "body",
    });
    expect(activeFilterCount(filters)).toBe(5);
    expect(hasConstraints(DEFAULT_FILTERS)).toBe(false);
    expect(hasConstraints(withFilters({ query: " a " }))).toBe(true);

    const chips = activeChips(filters, (method) => method);
    expect(chips.map((chip) => chip.label)).toEqual([
      "cornell",
      "Brouillon",
      "À revoir",
      "7 derniers jours",
      "Dans : Contenu",
    ]);

    const withoutReview = chips.find((chip) => chip.key === "review")!.clear(filters);
    expect(withoutReview.review).toBe("all");
    expect(withoutReview.methods).toEqual(["cornell"]);
  });

  it("bascule une valeur multiple", () => {
    expect(toggleValue<string>([], "a")).toEqual(["a"]);
    expect(toggleValue(["a", "b"], "a")).toEqual(["b"]);
    expect(
      matchesFilters(notes[0], withFilters({ collections: ["Éco"] }), source, NOW),
    ).toBe(false);
  });
});
