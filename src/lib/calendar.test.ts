import { describe, expect, it } from "vitest";
import {
  calendarEvents,
  daySummary,
  monthGrid,
  type CalendarEvent,
} from "@/lib/calendar";
import type { Note, ReviewCard, ReviewLog, ZettelCard } from "@/types";

/**
 * Le calendrier dérive tout : ces tests vérifient la **dérivation**, pas le
 * rendu. Ce qui casse en silence ici, c’est le décalage de fuseau (une note
 * créée à 23 h qui glisse au lendemain) et l’agrégation des échéances (trente
 * lignes identiques au lieu d’un événement).
 */

const now = new Date(2026, 9, 28, 12, 0); // 28 octobre 2026, midi local

function note(id: string, createdAt: string, extra: Partial<Note> = {}): Note {
  return {
    id,
    projectId: "p1",
    method: "outline",
    title: `Note ${id}`,
    collection: "c",
    blocks: [],
    status: "done",
    createdAt,
    updatedAt: createdAt,
    ...extra,
  };
}

function log(id: string, reviewedAt: string, rating: ReviewLog["rating"] = "good"): ReviewLog {
  return { id, cardId: "k1", rating, reviewedAt, scheduledDays: 3, elapsedDays: 2 };
}

function card(id: string, due: string): ReviewCard {
  return {
    id,
    linkId: "l",
    questionId: "q",
    noteId: "n1",
    due,
    stability: 1,
    difficulty: 1,
    reps: 1,
    lapses: 0,
  };
}

describe("dérivation des événements", () => {
  it("place une note créée à 23 h sur le bon jour", () => {
    const events = calendarEvents(
      { notes: [note("n1", "2026-10-27T23:30:00")], logs: [], cards: [], zettel: [] },
      new Date(2026, 9, 26),
      new Date(2026, 9, 29),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "note", date: "2026-10-27", time: "23:30" });
  });

  it("ignore ce qui est hors de l’intervalle et les notes supprimées", () => {
    const events = calendarEvents(
      {
        notes: [
          note("n1", "2026-09-01T10:00:00"),
          note("n2", "2026-10-27T10:00:00", { deletedAt: "2026-10-27T11:00:00" }),
        ],
        logs: [],
        cards: [],
        zettel: [],
      },
      new Date(2026, 9, 26),
      new Date(2026, 9, 29),
    );
    expect(events).toHaveLength(0);
  });

  it("nomme une révision et sa prochaine échéance", () => {
    const events = calendarEvents(
      { notes: [], logs: [log("l1", "2026-10-28T09:12:00", "hard")], cards: [], zettel: [] },
      new Date(2026, 9, 28),
      new Date(2026, 9, 28),
    );
    expect(events[0].title).toBe("Révision difficile");
    expect(events[0].detail).toContain("3 j");
  });

  it("agrège les échéances du même jour en un seul événement", () => {
    const events = calendarEvents(
      {
        notes: [],
        logs: [],
        cards: [
          card("k1", "2026-10-29T08:00:00"),
          card("k2", "2026-10-29T08:00:00"),
          card("k3", "2026-10-29T08:00:00"),
        ],
        zettel: [],
      },
      new Date(2026, 9, 29),
      new Date(2026, 9, 29),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "due", title: "3 cartes à revoir" });
  });

  it("lit aussi la planification des fiches de vault", () => {
    const fiche: ZettelCard = {
      id: "z1",
      code: "1a",
      vaultId: "v",
      title: "Fiche",
      body: "",
      source: "",
      refs: [],
      createdAt: "2026-10-01T08:00:00",
      updatedAt: "2026-10-01T08:00:00",
      schedule: { due: "2026-10-30T08:00:00", stability: 1, difficulty: 1, reps: 0, lapses: 0 },
    };
    const events = calendarEvents(
      { notes: [], logs: [], cards: [], zettel: [fiche] },
      new Date(2026, 9, 30),
      new Date(2026, 9, 30),
    );
    expect(events[0]).toMatchObject({ kind: "due", title: "1 carte à revoir" });
  });

  it("affiche les modifications seulement si on le demande", () => {
    const edited = note("n1", "2026-10-27T10:00:00", { updatedAt: "2026-10-28T15:00:00" });
    const sources = { notes: [edited], logs: [], cards: [], zettel: [] };
    const from = new Date(2026, 9, 27);
    const to = new Date(2026, 9, 28);

    expect(calendarEvents(sources, from, to)).toHaveLength(1);
    expect(calendarEvents(sources, from, to, { includeUpdated: true })).toHaveLength(2);
  });

  it("trie par jour puis par heure, échéances en fin de journée", () => {
    const events = calendarEvents(
      {
        notes: [note("n1", "2026-10-28T15:00:00")],
        logs: [log("l1", "2026-10-28T09:00:00")],
        cards: [card("k1", "2026-10-28T00:00:00")],
        zettel: [],
      },
      new Date(2026, 9, 28),
      new Date(2026, 9, 28),
    );
    expect(events.map((event) => event.kind)).toEqual(["review", "note", "due"]);
  });
});

describe("grille du mois", () => {
  it("commence un lundi et couvre le mois entier", () => {
    const days = monthGrid(new Date(2026, 9, 15), [], now);
    expect(days[0].date.getDay()).toBe(1);
    expect(days.some((day) => day.key === "2026-10-01")).toBe(true);
    expect(days.some((day) => day.key === "2026-10-31")).toBe(true);
    expect(days.length % 7).toBe(0);
  });

  it("marque aujourd’hui et les jours hors mois", () => {
    const days = monthGrid(new Date(2026, 9, 15), [], now);
    expect(days.find((day) => day.isToday)?.key).toBe("2026-10-28");
    expect(days[0].inMonth).toBe(false);
  });

  it("donne 5 semaines quand le mois en tient en 5", () => {
    // mars 2027 commence un lundi et compte 31 jours → 5 semaines
    expect(monthGrid(new Date(2027, 2, 10), [], now)).toHaveLength(35);
  });

  it("porte les événements sur la bonne case", () => {
    const event: CalendarEvent = {
      id: "e1",
      kind: "note",
      date: "2026-10-28",
      title: "Note",
    };
    const days = monthGrid(new Date(2026, 9, 1), [event], now);
    expect(days.find((day) => day.key === "2026-10-28")?.events).toHaveLength(1);
  });

  it("résume une case sans compter deux fois les mêmes familles", () => {
    const summary = daySummary([
      { id: "1", kind: "review", date: "2026-10-28", title: "a" },
      { id: "2", kind: "review", date: "2026-10-28", title: "b" },
      { id: "3", kind: "due", date: "2026-10-28", title: "12 cartes à revoir" },
    ]);
    expect(summary.kinds).toEqual(["review", "due"]);
    expect(summary.due).toBe(12);
  });
});
