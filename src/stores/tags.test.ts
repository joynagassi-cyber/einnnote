import { beforeEach, describe, expect, it } from "vitest";
import { migrateContentData, useContentStore } from "@/stores/useContentStore";
import type { Block, Note } from "@/types";

/**
 * La base des étiquettes — ce que le magasin ajoute au texte des notes.
 *
 * Le texte reste la vérité : ces tests vérifient qu’on n’invente jamais de
 * membre, qu’un renommage réécrit bien les notes, et qu’on refuse de supprimer
 * une étiquette encore portée plutôt que de laisser un mensonge dans la base.
 */

const block = (id: string, html: string): Block => ({
  id,
  html,
  kind: "p",
  bullet: false,
  indent: 0,
});

const note = (id: string, html: string): Note => ({
  id,
  projectId: "p-a",
  method: "cornell",
  title: `Note ${id}`,
  collection: "Test",
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  blocks: [block(`${id}-b1`, html)],
});

const state = () => useContentStore.getState();
const blocksOf = (id: string) => state().notes.find((item) => item.id === id)!.blocks;

beforeEach(() => {
  useContentStore.setState({
    projects: [{ id: "p-a", name: "A", createdAt: "2026-01-01T00:00:00.000Z" }],
    notes: [note("n1", "Une #idée puis #méthode")],
    tags: [],
  });
});

describe("base des étiquettes", () => {
  it("apprend les étiquettes d’une note au premier enregistrement", () => {
    state().replaceBlocks("n1", [block("n1-b1", "Une #idée et une #autre")]);
    expect(state().tags.map((tag) => tag.name)).toEqual(["idée", "autre"]);
  });

  it("ne duplique pas une étiquette déjà connue, casse comprise", () => {
    state().registerTags(["Idée"]);
    state().registerTags(["idée", "IDÉE"]);
    expect(state().tags).toHaveLength(1);
    expect(state().tags[0].name).toBe("Idée");
  });

  it("ignore les noms invalides", () => {
    state().registerTags(["deux mots", "#", "ponctuation!"]);
    expect(state().tags).toEqual([]);
  });

  it("garde une étiquette qui n’est plus dans aucune note", () => {
    state().registerTags(["archive"]);
    state().replaceBlocks("n1", [block("n1-b1", "Rien ici")]);
    expect(state().tags.map((tag) => tag.name)).toEqual(["archive"]);
  });

  it("renomme dans la base et dans le texte des notes", () => {
    state().registerTags(["idée"]);
    const id = state().tags[0].id;
    const result = state().renameTag(id, "concept");

    expect(result.ok).toBe(true);
    expect(state().tags[0].name).toBe("concept");
    expect(blocksOf("n1")[0].html).toBe("Une #concept puis #méthode");
  });

  it("refuse un nom déjà pris ou invalide", () => {
    state().registerTags(["idée", "méthode"]);
    const [idee] = state().tags;

    expect(state().renameTag(idee.id, "Méthode")).toEqual({
      ok: false,
      reason: "Une autre étiquette porte déjà ce nom.",
    });
    expect(state().renameTag(idee.id, "deux mots").ok).toBe(false);
    expect(state().renameTag("t-inconnue", "xrs").ok).toBe(false);
  });

  it("refuse de supprimer une étiquette encore portée, et dit combien de notes", () => {
    state().registerTags(["idée"]);
    const id = state().tags[0].id;
    const result = state().deleteTag(id);

    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Une note porte encore");
    expect(state().tags).toHaveLength(1);

    state().replaceBlocks("n1", [block("n1-b1", "Sans étiquette")]);
    expect(state().deleteTag(id).ok).toBe(true);
    expect(state().tags).toEqual([]);
  });

  it("compte les notes, pas les blocs", () => {
    useContentStore.setState({
      notes: [
        { ...note("n1", "#idée"), blocks: [block("a", "#idée"), block("b", "#idée")] },
        note("n2", "#idée"),
      ],
    });
    state().registerTags(["idée"]);
    expect(state().deleteTag(state().tags[0].id).reason).toContain("2 notes");
  });
});

describe("migration v2 → v3", () => {
  it("reconstitue la base depuis le texte des notes", () => {
    const migrated = migrateContentData(
      { projects: [], notes: [note("n1", "Une #idée et #méthode")], vaults: [] },
      2,
    ) as { tags: { name: string }[] };

    expect(migrated.tags.map((tag) => tag.name)).toEqual(["idée", "méthode"]);
  });

  it("ne touche pas à une base déjà présente", () => {
    const tags = [{ id: "t-1", name: "idée", createdAt: "2026-01-01T00:00:00.000Z" }];
    const input = { projects: [], notes: [], vaults: [], tags };
    expect(migrateContentData(input, 2)).toEqual(input);
  });

  it("traverse v1 d’un seul passage", () => {
    const migrated = migrateContentData(
      { notes: [note("n1", "#idée")], vaults: [] },
      1,
    ) as { tags: unknown[]; notes: { projectId?: string }[] };

    expect(migrated.tags).toHaveLength(1);
    expect(migrated.notes[0].projectId).toBeTruthy();
  });
});
