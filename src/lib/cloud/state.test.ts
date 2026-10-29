import { describe, expect, it } from "vitest";
import {
  activeTombstones,
  deriveTombstones,
  emptyState,
  idsOf,
  loadState,
  rowsFromRpc,
  saveState,
  syncKeyOf,
} from "@/lib/cloud/state";
import type { ContentSnapshot, Tombstone } from "@/lib/cloud/types";

const snapshot = (parts: Partial<ContentSnapshot> = {}): ContentSnapshot => ({
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
  ...parts,
});

const note = (id: string, updatedAt = "2026-01-02T10:00:00.000Z") => ({
  id,
  projectId: "p1",
  method: "cornell" as const,
  title: id,
  collection: "Droit",
  blocks: [],
  status: "captured" as const,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt,
});

describe("syncKeyOf", () => {
  it("préfère l’identifiant propre", () => {
    expect(syncKeyOf({ id: "abc" })).toBe("abc");
  });

  it("retombe sur lessonId pour la progression", () => {
    expect(syncKeyOf({ lessonId: "l1" })).toBe("lesson:l1");
  });

  it("refuse une entité sans identifiant", () => {
    expect(syncKeyOf({ title: "sans id" })).toBeNull();
    expect(syncKeyOf(null)).toBeNull();
  });
});

describe("idsOf", () => {
  it("trie les identifiants pour être comparable entre appareils", () => {
    const ids = idsOf(snapshot({ notes: [note("b"), note("a")] }));
    expect(ids.notes).toEqual(["a", "b"]);
  });

  it("couvre toutes les collections, même vides", () => {
    const ids = idsOf(snapshot());
    expect(Object.keys(ids)).toHaveLength(10);
    expect(ids.zettel).toEqual([]);
  });
});

describe("deriveTombstones", () => {
  it("déduit une suppression de ce qui était connu et qui a disparu", () => {
    const state = { ...emptyState("u1"), known: { notes: ["n1", "n2"] } };
    const stones = deriveTombstones(
      state,
      snapshot({ notes: [note("n1")] }),
      "2026-02-01T00:00:00.000Z",
    );

    expect(stones).toEqual([
      { collection: "notes", id: "n2", deletedAt: "2026-02-01T00:00:00.000Z" },
    ]);
  });

  it("n’invente rien quand tout est encore là", () => {
    const state = { ...emptyState("u1"), known: { notes: ["n1"] } };
    expect(deriveTombstones(state, snapshot({ notes: [note("n1")] }), "2026-02-01T00:00:00.000Z")).toEqual([]);
  });

  it("ne duplique pas une tombe déjà connue", () => {
    const state = {
      ...emptyState("u1"),
      known: { notes: [] as string[] },
      tombstones: [{ collection: "notes", id: "n9", deletedAt: "2026-01-15T00:00:00.000Z" }] as Tombstone[],
    };
    expect(deriveTombstones(state, snapshot(), "2026-02-01T00:00:00.000Z")).toEqual([]);
  });

  it("ignore une première synchro : rien n’a jamais été envoyé", () => {
    const stones = deriveTombstones(emptyState("u1"), snapshot(), "2026-02-01T00:00:00.000Z");
    expect(stones).toEqual([]);
  });
});

describe("activeTombstones", () => {
  it("garde une tombe quand l’entité est absente", () => {
    const stones = [{ collection: "notes", id: "n1", deletedAt: "2026-02-01T00:00:00.000Z" }] as Tombstone[];
    expect(activeTombstones(stones, snapshot())).toHaveLength(1);
  });

  it("annule la tombe si l’entité a été modifiée après la suppression", () => {
    const stones = [{ collection: "notes", id: "n1", deletedAt: "2026-02-01T00:00:00.000Z" }] as Tombstone[];
    const revived = activeTombstones(
      stones,
      snapshot({ notes: [note("n1", "2026-03-01T00:00:00.000Z")] }),
    );
    expect(revived).toHaveLength(0);
  });

  it("conserve la tombe si l’entité réapparaît avec une date antérieure", () => {
    const stones = [{ collection: "notes", id: "n1", deletedAt: "2026-02-01T00:00:00.000Z" }] as Tombstone[];
    const kept = activeTombstones(
      stones,
      snapshot({ notes: [note("n1", "2026-01-05T00:00:00.000Z")] }),
    );
    expect(kept).toHaveLength(1);
  });
});

describe("persistance locale", () => {
  it("repasse par le disque sans perte", () => {
    const state = {
      userId: "u1",
      lastSyncAt: "2026-02-01T00:00:00.000Z",
      tombstones: [{ collection: "notes", id: "n1", deletedAt: "2026-02-01T00:00:00.000Z" }] as Tombstone[],
      known: { notes: ["n1"] },
    };
    saveState(state);
    expect(loadState("u1")).toEqual(state);
  });

  it("ignore l’état d’un autre compte", () => {
    saveState({ ...emptyState("u1"), lastSyncAt: "2026-02-01T00:00:00.000Z" });
    expect(loadState("u2").lastSyncAt).toBeNull();
  });

  it("survit à un état corrompu", () => {
    window.localStorage.setItem("engram.cloud.state.v1", "{{{");
    expect(loadState("u1").tombstones).toEqual([]);
  });
});

describe("rowsFromRpc", () => {
  it("garde les lignes valides et écarte le reste", () => {
    const rows = rowsFromRpc([
      {
        collection: "notes",
        entity_id: "n1",
        payload: { id: "n1" },
        stamp: 1,
        deleted: false,
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      { collection: "inconnu", entity_id: "x" },
      null,
      "bruit",
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].entity_id).toBe("n1");
  });

  it("renvoie une liste vide plutôt que de lever sur une réponse inattendue", () => {
    expect(rowsFromRpc(undefined)).toEqual([]);
    expect(rowsFromRpc({ nope: true })).toEqual([]);
  });
});
