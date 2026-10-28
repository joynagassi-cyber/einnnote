import { describe, expect, it } from "vitest";
import {
  allReviewItems,
  itemsInTarget,
  planSession,
  reviewedTodayCounts,
  summarize,
  type ReviewData,
} from "@/lib/review";
import { reviewSettings } from "@/lib/scheduler";

const NOW = new Date("2026-05-01T09:00:00.000Z");
const PAST = "2026-04-28T09:00:00.000Z";
const FUTURE = "2026-06-01T09:00:00.000Z";

function data(): ReviewData {
  return {
    projects: [
      { id: "p1", name: "Droit", createdAt: PAST },
      { id: "p2", name: "Éco", createdAt: PAST },
    ],
    notes: [
      {
        id: "n1",
        projectId: "p1",
        method: "cornell",
        title: "Contrats",
        collection: "Droit",
        blocks: [],
        status: "questioned",
        createdAt: PAST,
        updatedAt: PAST,
      },
      {
        id: "n2",
        projectId: "p2",
        method: "cornell",
        title: "Marché",
        collection: "Éco",
        blocks: [],
        status: "questioned",
        createdAt: PAST,
        updatedAt: PAST,
        vaultId: "v1",
      },
    ],
    questions: [
      { id: "q1", noteId: "n1", text: "Conditions de validité ?", createdAt: PAST },
      { id: "q2", noteId: "n2", text: "Qu’ajuste le salaire réel ?", createdAt: PAST },
      { id: "q3", noteId: "n2", text: "Question future", createdAt: PAST },
    ],
    links: [
      { id: "l1", questionId: "q1", blockId: "b1", passage: "Art. 1128", cardId: "c1" },
      { id: "l2", questionId: "q2", blockId: "b2", passage: "Offre et demande", cardId: "c2" },
      { id: "l3", questionId: "q3", blockId: "b3", passage: "Plus tard", cardId: "c3" },
    ],
    cards: [
      { id: "c1", linkId: "l1", questionId: "q1", noteId: "n1", due: PAST, stability: 3, difficulty: 3, reps: 2, lapses: 0 },
      { id: "c2", linkId: "l2", questionId: "q2", noteId: "n2", due: PAST, stability: 2, difficulty: 4, reps: 1, lapses: 0 },
      { id: "c3", linkId: "l3", questionId: "q3", noteId: "n2", due: FUTURE, stability: 9, difficulty: 2, reps: 4, lapses: 0 },
    ],
    vaults: [{ id: "v1", projectId: "p2", name: "Économie" }],
    zettel: [
      {
        id: "z1",
        code: "#1A",
        vaultId: "v1",
        title: "Inflation",
        body: "Les prix montent.",
        source: "Livre",
        refs: [],
        createdAt: PAST,
        updatedAt: PAST,
      },
      {
        id: "z2",
        code: "#1B",
        vaultId: "v1",
        title: "Épargne",
        body: "Elle perd de la valeur.",
        source: "Livre",
        refs: [],
        createdAt: PAST,
        updatedAt: PAST,
        schedule: { due: PAST, stability: 2, difficulty: 4, reps: 2, lapses: 0, state: 2 },
      },
    ],
  };
}

describe("portées et séances de révision", () => {
  it("« Tout » garde les questions et les fiches déjà travaillées", () => {
    const items = allReviewItems(data());
    const all = itemsInTarget(items, { kind: "all" });
    expect(all.map((item) => item.id).sort()).toEqual(["card:c1", "card:c2", "card:c3", "fiche:z2"]);
  });

  it("un vault ouvre ses fiches, y compris neuves", () => {
    const items = allReviewItems(data());
    const vault = itemsInTarget(items, { kind: "vault", id: "v1" });
    expect(vault.map((item) => item.id).sort()).toEqual(["card:c2", "card:c3", "fiche:z1", "fiche:z2"]);
  });

  it("une note ne contient que ses questions", () => {
    const items = allReviewItems(data());
    const note = itemsInTarget(items, { kind: "note", id: "n1" });
    expect(note).toHaveLength(1);
    expect(note[0].title).toBe("Conditions de validité ?");
    expect(note[0].body).toBe("Art. 1128");
  });

  it("un projet réunit ses questions et les fiches de ses vaults", () => {
    const items = allReviewItems(data());
    const project = itemsInTarget(items, { kind: "project", id: "p2" });
    expect(project.map((item) => item.id).sort()).toEqual(["card:c2", "card:c3", "fiche:z1", "fiche:z2"]);
  });

  it("compte les dues sans compter le futur", () => {
    const items = allReviewItems(data());
    const summary = summarize(itemsInTarget(items, { kind: "note", id: "n2" }), NOW);
    expect(summary).toEqual({ total: 2, due: 1, fresh: 0 });
  });

  it("ne garde que les cartes échues quand `onlyDue` est vrai", () => {
    const items = allReviewItems(data());
    const session = planSession(itemsInTarget(items, { kind: "vault", id: "v1" }), reviewSettings(), {
      now: NOW,
      onlyDue: true,
    });
    expect(session.map((item) => item.id).sort()).toEqual(["card:c2", "fiche:z1", "fiche:z2"]);
  });

  it("respecte le plafond de nouvelles cartes", () => {
    const items = allReviewItems(data());
    const session = planSession(
      itemsInTarget(items, { kind: "vault", id: "v1" }),
      reviewSettings({ dailyNew: 1, dailyReview: 10 }),
      { now: NOW, onlyDue: true },
    );
    expect(session.filter((item) => item.reps === 0)).toHaveLength(1);
  });

  it("compte les cartes déjà révisées aujourd’hui", () => {
    const items = allReviewItems(data());
    const counts = reviewedTodayCounts(
      [
        { reviewedAt: "2026-05-01T08:00:00.000Z", cardId: "c1" },
        { reviewedAt: "2026-04-30T08:00:00.000Z", cardId: "c2" },
      ],
      items,
      NOW,
    );
    expect(counts).toEqual({ cards: 1, fresh: 0 });
  });
});
