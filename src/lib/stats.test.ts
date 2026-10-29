import { describe, expect, it } from "vitest";
import {
  byProject,
  dailyActivity,
  dayKey,
  dueForecast,
  methodBreakdown,
  percent,
  retention,
  streak,
  weeklyRetention,
  regularity,
  weekdayRhythm,
  ratingBreakdown,
} from "@/lib/stats";
import type { Note, ReviewCard, ReviewLog, ZettelCard } from "@/types";

/**
 * Les statistiques sont le seul écran où un chiffre faux passe inaperçu : il
 * ressemble à un chiffre vrai. Ces tests fixent donc les conventions (jour
 * local, jours vides présents, retard replié sur aujourd’hui) avant de fixer
 * les valeurs.
 */

const now = new Date("2026-10-28T12:00:00");

function note(id: string, createdAt: string, method: Note["method"] = "outline"): Note {
  return {
    id,
    projectId: "p1",
    method,
    title: id,
    collection: "c",
    blocks: [],
    status: "done",
    createdAt,
    updatedAt: createdAt,
  };
}

function log(id: string, reviewedAt: string, rating: ReviewLog["rating"] = "good"): ReviewLog {
  return { id, cardId: "k1", rating, reviewedAt, scheduledDays: 3, elapsedDays: 3 };
}

describe("activité", () => {
  it("rend chaque jour de la fenêtre, y compris les jours vides", () => {
    const points = dailyActivity([], [], 7, now);
    expect(points).toHaveLength(7);
    expect(points[6].date).toBe("2026-10-28");
    expect(points[0].date).toBe("2026-10-22");
    expect(points.every((point) => point.created === 0 && point.reviews === 0)).toBe(true);
  });

  it("compte notes créées et révisions sur le bon jour", () => {
    const points = dailyActivity(
      [note("a", "2026-10-28T09:00:00"), note("b", "2026-10-28T10:00:00")],
      [log("l1", "2026-10-27T09:00:00"), log("l2", "2026-10-27T10:00:00"), log("l3", "2026-10-28T08:00:00")],
      7,
      now,
    );
    expect(points[6]).toEqual({ date: "2026-10-28", created: 2, reviews: 1 });
    expect(points[5]).toEqual({ date: "2026-10-27", created: 0, reviews: 2 });
  });

  it("ignore les notes supprimées et ce qui est hors fenêtre", () => {
    const deleted = { ...note("c", "2026-10-28T09:00:00"), deletedAt: "2026-10-28T10:00:00" };
    const points = dailyActivity([deleted, note("d", "2026-01-01T09:00:00")], [], 7, now);
    expect(points.reduce((sum, point) => sum + point.created, 0)).toBe(0);
  });
});

describe("série", () => {
  it("compte les jours consécutifs jusqu’à aujourd’hui", () => {
    const logs = [
      log("1", "2026-10-28T08:00:00"),
      log("2", "2026-10-27T08:00:00"),
      log("3", "2026-10-26T08:00:00"),
    ];
    expect(streak(logs, now)).toBe(3);
  });

  it("ne casse pas une série si la journée en cours est vide", () => {
    const logs = [log("1", "2026-10-27T08:00:00"), log("2", "2026-10-26T08:00:00")];
    expect(streak(logs, now)).toBe(2);
  });

  it("s’arrête au premier jour manquant", () => {
    const logs = [
      log("1", "2026-10-28T08:00:00"),
      log("2", "2026-10-26T08:00:00"),
      log("3", "2026-10-25T08:00:00"),
    ];
    expect(streak(logs, now)).toBe(1);
  });

  it("vaut zéro sans aucune révision", () => {
    expect(streak([], now)).toBe(0);
  });
});

describe("rétention", () => {
  it("compte good et easy comme réussies", () => {
    const result = retention([
      log("1", "2026-10-28T08:00:00", "good"),
      log("2", "2026-10-28T09:00:00", "easy"),
      log("3", "2026-10-28T10:00:00", "again"),
      log("4", "2026-10-28T11:00:00", "hard"),
    ]);
    expect(result).toEqual({ total: 4, passed: 2, rate: 50 });
  });

  it("ne renvoie rien plutôt qu’un faux 0 %", () => {
    expect(retention([])).toBeNull();
    // sans borne, tout l’historique compte
    expect(retention([log("1", "2026-01-01T08:00:00")])).toEqual({
      total: 1,
      passed: 1,
      rate: 100,
    });
    // avec borne, une révision trop ancienne sort de la fenêtre
    expect(retention([log("1", "2026-01-01T08:00:00")], new Date("2026-10-01"))).toBeNull();
  });

  it("découpe par semaine", () => {
    const weeks = weeklyRetention(
      [
        log("1", "2026-10-28T08:00:00", "good"),
        log("2", "2026-10-27T08:00:00", "again"),
        log("3", "2026-10-20T08:00:00", "easy"),
      ],
      2,
      now,
    );
    expect(weeks).toHaveLength(2);
    expect(weeks[1]).toMatchObject({ rate: 50, total: 2 });
    expect(weeks[0]).toMatchObject({ rate: 100, total: 1 });
  });
});

describe("répartition et prévision", () => {
  it("classe les méthodes du plus au moins utilisé", () => {
    const rows = methodBreakdown([
      note("a", "2026-10-01T08:00:00", "cornell"),
      note("b", "2026-10-01T08:00:00", "cornell"),
      note("c", "2026-10-01T08:00:00", "mindmap"),
    ]);
    expect(rows).toEqual([
      { method: "cornell", count: 2 },
      { method: "mindmap", count: 1 },
    ]);
  });

  it("replie le retard sur aujourd’hui et ignore au-delà de l’horizon", () => {
    const card = (id: string, due: string): ReviewCard => ({
      id,
      linkId: "l",
      questionId: "q",
      noteId: "n",
      due,
      stability: 1,
      difficulty: 1,
      reps: 1,
      lapses: 0,
    });
    const forecast = dueForecast(
      [
        card("a", "2026-10-20T08:00:00"),
        card("b", "2026-10-28T08:00:00"),
        card("c", "2026-10-30T08:00:00"),
        card("d", "2026-12-01T08:00:00"),
      ],
      4,
      now,
    );
    expect(forecast).toHaveLength(4);
    expect(forecast[0]).toEqual({ date: "2026-10-28", count: 2 });
    expect(forecast[2]).toEqual({ date: "2026-10-30", count: 1 });
    expect(forecast[3]).toEqual({ date: "2026-10-31", count: 0 });
  });

  it("compte aussi les fiches de vault", () => {
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
      schedule: { due: "2026-10-29T08:00:00", stability: 1, difficulty: 1, reps: 0, lapses: 0 },
    };
    const forecast = dueForecast([fiche], 3, now);
    expect(forecast[1]).toEqual({ date: "2026-10-29", count: 1 });
  });
});

describe("tableau par projet", () => {
  it("attribue les révisions aux notes de leur projet", () => {
    const notes = [note("n1", "2026-10-01T08:00:00")];
    const cards: ReviewCard[] = [
      {
        id: "k1",
        linkId: "l",
        questionId: "q",
        noteId: "n1",
        due: "2026-10-28T08:00:00",
        stability: 1,
        difficulty: 1,
        reps: 1,
        lapses: 0,
      },
    ];
    const rows = byProject({
      projects: [
        { id: "p1", name: "Projet" },
        { id: "p2", name: "Vide" },
      ],
      notes,
      cards,
      logs: [log("log1", "2026-10-27T08:00:00", "good")],
      dueNow: () => true,
    });

    expect(rows[0]).toMatchObject({ name: "Projet", notes: 1, due: 1 });
    expect(rows[0].retention).toEqual({ total: 1, passed: 1, rate: 100 });
    expect(rows[1]).toMatchObject({ name: "Vide", notes: 0, due: 0, retention: null });
  });

  it("ne divise jamais par zéro", () => {
    expect(percent(0, 0)).toBeNull();
    expect(percent(3, 12)).toBe(25);
  });

  it("écrit les jours en heure locale", () => {
    expect(dayKey(new Date(2026, 9, 28, 23, 30))).toBe("2026-10-28");
  });
});

describe("régularité et rythme", () => {
  it("survit à une date illisible sans vider l’écran", () => {
    /* Une ligne corrompue dans le stockage ne doit pas casser tout un panneau. */
    expect(dayKey(undefined)).toBe("");
    expect(dayKey("")).toBe("");
    expect(dayKey("pas une date")).toBe("");
    const log = { id: "x", cardId: "c", rating: "good", reviewedAt: "??", scheduledDays: 1, elapsedDays: 0 } as unknown as ReviewLog;
    expect(streak([log], new Date(2026, 9, 8))).toBe(0);
    expect(regularity([], [log], 2, new Date(2026, 9, 8))).toHaveLength(2);
    expect(weekdayRhythm([log]).reduce((sum, day) => sum + day.reviews, 0)).toBe(0);
  });

  it("grille de 7 jours par semaine, du lundi au dimanche", () => {
    const weeks = regularity([], [], 4, new Date(2026, 9, 8, 12));
    expect(weeks).toHaveLength(4);
    expect(weeks[0].days).toHaveLength(7);
    /* le 8 octobre 2026 est un jeudi : la dernière colonne commence un lundi */
    expect(weeks[0].days[0].date).toBe("2026-09-14");
    expect(weeks[3].days[6].date).toBe("2026-10-11");
  });

  it("compte les notes et les révisions du même jour", () => {
    const day = new Date(2026, 9, 8, 10).toISOString();
    const weeks = regularity(
      [note("n1", day)],
      [log("l1", day)],
      1,
      new Date(2026, 9, 8, 20),
    );
    const flat = weeks.flatMap((week) => week.days);
    expect(flat.find((entry) => entry.date === "2026-10-08")?.count).toBe(2);
  });

  it("marque les jours à venir d’un -1, jamais d’un zéro trompeur", () => {
    const weeks = regularity([], [], 1, new Date(2026, 9, 8));
    const flat = weeks.flatMap((week) => week.days);
    expect(flat.find((entry) => entry.date === "2026-10-10")?.count).toBe(-1);
    expect(flat.find((entry) => entry.date === "2026-10-07")?.count).toBe(0);
  });

  it("répartit les révisions par jour de la semaine", () => {
    const rhythm = weekdayRhythm([
      log("a", new Date(2026, 9, 5, 9).toISOString()),
      log("b", new Date(2026, 9, 5, 10).toISOString()),
      log("c", new Date(2026, 9, 6, 10).toISOString()),
    ]);
    expect(rhythm[0].reviews).toBe(2); // lundi
    expect(rhythm[1].reviews).toBe(1); // mardi
    expect(rhythm.reduce((sum, entry) => sum + entry.reviews, 0)).toBe(3);
  });

  it("donne les quatre notes dans l’ordre FSRS", () => {
    const rows = ratingBreakdown([
      log("a", new Date(2026, 9, 5).toISOString(), "good"),
      log("b", new Date(2026, 9, 5).toISOString(), "again"),
    ]);
    expect(rows.map((row) => row.rating)).toEqual(["again", "hard", "good", "easy"]);
    expect(rows.find((row) => row.rating === "good")?.count).toBe(1);
  });
});
