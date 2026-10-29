import { describe, expect, it } from "vitest";
import {
  mergeSnapshots,
  rowsToSnapshot,
  stampOf,
  tombstoneKey,
} from "@/lib/cloud/merge";
import type { ContentSnapshot, Tombstone } from "@/lib/cloud/types";

function empty(): ContentSnapshot {
  return {
    projects: [],
    notes: [],
    questions: [],
    links: [],
    cards: [],
    logs: [],
    vaults: [],
    zettel: [],
    mindmaps: [],
    progress: [],
  };
}

function note(id: string, title: string, updatedAt: string) {
  return {
    id,
    projectId: "p1",
    method: "cornell" as const,
    title,
    collection: "Droit",
    blocks: [],
    status: "captured" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt,
  };
}

describe("estampilles", () => {
  it("prend la date de modification, sinon celle de création", () => {
    expect(
      stampOf("notes", {
        updatedAt: "2026-03-02T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(Date.parse("2026-03-02T00:00:00.000Z"));
    expect(
      stampOf("projects", { createdAt: "2026-01-01T00:00:00.000Z" }),
    ).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
  });

  it("traite les collections immuables comme intemporelles", () => {
    expect(stampOf("links", { id: "l1" })).toBe(0);
    expect(stampOf("logs", { id: "g1", reviewedAt: "2026-02-02T00:00:00.000Z" })).toBe(0);
  });

  it("renvoie 0 sur une date absente ou invalide, jamais NaN", () => {
    expect(stampOf("notes", {})).toBe(0);
    expect(stampOf("notes", { updatedAt: "pas une date" })).toBe(0);
    expect(Number.isNaN(stampOf("zettel", { updatedAt: "x" }))).toBe(false);
  });
});

describe("fusion locale ↔ distante", () => {
  it("apporte une note créée sur l’autre appareil", () => {
    const local = empty();
    const remote = empty();
    remote.notes = [note("n2", "Depuis le téléphone", "2026-05-01T10:00:00.000Z")];

    const out = mergeSnapshots(local, remote, [], []);
    expect(out.merged.notes.map((n) => n.id)).toEqual(["n2"]);
    expect(out.report.applied).toBe(1);
    expect(out.changedLocal).toBe(true);
    expect(out.toPush).toHaveLength(0);
  });

  it("garde la version la plus récente quand les deux ont changé", () => {
    const local = empty();
    const remote = empty();
    local.notes = [note("n1", "Version ancienne", "2026-05-01T09:00:00.000Z")];
    remote.notes = [note("n1", "Version récente", "2026-05-01T12:00:00.000Z")];

    const out = mergeSnapshots(local, remote, [], []);
    expect((out.merged.notes[0] as { title: string }).title).toBe("Version récente");
    expect(out.report.applied).toBe(1);
  });

  it("envoie la version locale quand elle est plus récente", () => {
    const local = empty();
    const remote = empty();
    local.notes = [note("n1", "Locale récente", "2026-05-01T15:00:00.000Z")];
    remote.notes = [note("n1", "Distante ancienne", "2026-05-01T09:00:00.000Z")];

    const out = mergeSnapshots(local, remote, [], []);
    expect(out.toPush.map((row) => row.entity_id)).toContain("n1");
    expect(out.report.pushed).toBe(1);
  });

  it("ne ressuscite pas une note supprimée sur l’autre appareil", () => {
    const local = empty();
    const remote = empty();
    local.notes = [note("n1", "Supprimée", "2026-05-01T09:00:00.000Z")];
    const stone: Tombstone = {
      collection: "notes",
      id: "n1",
      deletedAt: "2026-05-02T09:00:00.000Z",
    };

    const out = mergeSnapshots(local, remote, [], [stone]);
    expect(out.merged.notes).toHaveLength(0);
    expect(out.report.deleted).toBe(1);
    expect(out.changedLocal).toBe(true);
  });

  it("garde une édition postérieure à la suppression", () => {
    const local = empty();
    const remote = empty();
    local.notes = [note("n1", "Réécrite après", "2026-05-03T09:00:00.000Z")];
    const stone: Tombstone = {
      collection: "notes",
      id: "n1",
      deletedAt: "2026-05-02T09:00:00.000Z",
    };

    const out = mergeSnapshots(local, remote, [], [stone]);
    expect(out.merged.notes).toHaveLength(1);
    expect(out.report.deleted).toBe(0);
  });

  it("propage une suppression locale vers le serveur", () => {
    const local = empty();
    const remote = empty();
    remote.notes = [note("n1", "Encore là", "2026-05-01T09:00:00.000Z")];
    const stone: Tombstone = {
      collection: "notes",
      id: "n1",
      deletedAt: "2026-05-04T09:00:00.000Z",
    };

    const out = mergeSnapshots(local, remote, [stone], []);
    expect(out.merged.notes).toHaveLength(0);
    const tombRow = out.toPush.find((row) => row.deleted);
    expect(tombRow?.entity_id).toBe("n1");
    expect(tombRow?.collection).toBe("notes");
  });

  it("signale un conflit à estampille égale au lieu de l’écraser", () => {
    const local = empty();
    const remote = empty();
    local.notes = [note("n1", "Moi", "2026-05-01T09:00:00.000Z")];
    remote.notes = [note("n1", "Eux", "2026-05-01T09:00:00.000Z")];

    const out = mergeSnapshots(local, remote, [], []);
    expect(out.report.conflicts).toHaveLength(1);
    expect(out.report.conflicts[0]).toMatchObject({
      collection: "notes",
      id: "n1",
      winner: "local",
    });
    expect((out.merged.notes[0] as { title: string }).title).toBe("Moi");
  });

  it("n’envoie rien quand tout est identique", () => {
    const local = empty();
    const remote = empty();
    local.notes = [note("n1", "Pareil", "2026-05-01T09:00:00.000Z")];
    remote.notes = [note("n1", "Pareil", "2026-05-01T09:00:00.000Z")];

    const out = mergeSnapshots(local, remote, [], []);
    expect(out.toPush).toHaveLength(0);
    expect(out.report.unchanged).toBe(1);
    expect(out.changedLocal).toBe(false);
  });

  it("unit les journaux de révision sans les arbitrer", () => {
    const local = empty();
    const remote = empty();
    local.logs = [
      { id: "g1", cardId: "c1", rating: "good", reviewedAt: "2026-05-01T09:00:00.000Z", scheduledDays: 3, elapsedDays: 1 },
    ];
    remote.logs = [
      { id: "g2", cardId: "c1", rating: "hard", reviewedAt: "2026-05-02T09:00:00.000Z", scheduledDays: 1, elapsedDays: 1 },
    ];

    const out = mergeSnapshots(local, remote, [], []);
    // Union : deux révisions distinctes doivent survivre toutes les deux.
    expect(out.merged.logs).toHaveLength(2);
    expect(out.report.conflicts).toHaveLength(0);
  });

  it("ne perd pas les deux journaux quand les ids diffèrent", () => {
    const local = empty();
    const remote = empty();
    local.logs = [
      { id: "g1", cardId: "c1", rating: "good", reviewedAt: "2026-05-01T09:00:00.000Z", scheduledDays: 3, elapsedDays: 1 },
    ];
    remote.logs = [
      { id: "g1", cardId: "c1", rating: "good", reviewedAt: "2026-05-01T09:00:00.000Z", scheduledDays: 3, elapsedDays: 1 },
      { id: "g2", cardId: "c1", rating: "easy", reviewedAt: "2026-05-02T09:00:00.000Z", scheduledDays: 9, elapsedDays: 3 },
    ];

    const out = mergeSnapshots(local, remote, [], []);
    expect(out.merged.logs.map((log) => (log as { id: string }).id)).toEqual(["g1", "g2"]);
  });

  it("identifie les progrès de leçon par leur lessonId", () => {
    const local = empty();
    const remote = empty();
    local.progress = [{ lessonId: "l1", step: 1, doneAt: "2026-05-01T09:00:00.000Z" }];
    remote.progress = [{ lessonId: "l1", step: 2, doneAt: "2026-05-02T09:00:00.000Z" }];

    const out = mergeSnapshots(local, remote, [], []);
    expect(out.merged.progress).toHaveLength(1);
    expect((out.merged.progress[0] as { step: number }).step).toBe(2);
  });

  it("est déterministe : le même couple donne le même résultat", () => {
    const local = empty();
    const remote = empty();
    local.notes = [note("b", "B", "2026-05-01T09:00:00.000Z"), note("a", "A", "2026-05-01T09:00:00.000Z")];
    remote.notes = [note("c", "C", "2026-05-02T09:00:00.000Z")];

    const first = mergeSnapshots(local, remote, [], []);
    const second = mergeSnapshots(local, remote, [], []);
    expect(JSON.stringify(first.merged)).toBe(JSON.stringify(second.merged));
    expect(first.merged.notes.map((n) => (n as { id: string }).id)).toEqual(["a", "b", "c"]);
  });
});

describe("aller-retour ligne serveur ↔ instantané", () => {
  it("reconstruit l’instantané et les tombes depuis les lignes", () => {
    const { snapshot, tombstones } = rowsToSnapshot([
      {
        collection: "notes",
        entity_id: "n1",
        payload: note("n1", "Note", "2026-05-01T09:00:00.000Z"),
        stamp: Date.parse("2026-05-01T09:00:00.000Z"),
        deleted: false,
        updated_at: "2026-05-01T09:00:00.000Z",
      },
      {
        collection: "notes",
        entity_id: "n2",
        payload: {},
        stamp: Date.parse("2026-05-02T09:00:00.000Z"),
        deleted: true,
        updated_at: "2026-05-02T09:00:00.000Z",
      },
    ]);
    expect(snapshot.notes).toHaveLength(1);
    expect(tombstones).toEqual([
      { collection: "notes", id: "n2", deletedAt: "2026-05-02T09:00:00.000Z" },
    ]);
  });

  it("clé de tombe stable", () => {
    expect(tombstoneKey("notes", "n1")).toBe("notes:n1");
  });
});
