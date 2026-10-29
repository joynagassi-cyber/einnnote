import { beforeEach, describe, expect, it } from "vitest";
import { useContentStore } from "@/stores/useContentStore";
import type { Project } from "@/types";

const project = (id: string, name: string): Project => ({
  id,
  name,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("vaults", () => {
  beforeEach(() => {
    useContentStore.setState({
      projects: [project("p-a", "Alpha"), project("p-b", "Bêta")],
      notes: [],
      vaults: [],
      zettel: [],
      mindmaps: [],
      questions: [],
      cards: [],
    });
  });

  it("crée un vault nommé et le rattache au bon projet", () => {
    const vault = useContentStore.getState().createVault({ name: "  Économie ", projectId: "p-a" });
    expect(vault.name).toBe("Économie");
    expect(vault.projectId).toBe("p-a");
    expect(useContentStore.getState().vaults).toHaveLength(1);
  });

  it("nomme un vault sans nom au lieu de le laisser vide", () => {
    const vault = useContentStore.getState().createVault({ name: "   ", projectId: "p-a" });
    expect(vault.name).toBe("Nouveau vault");
  });

  it("renomme un vault sans écraser son nom par du vide", () => {
    const vault = useContentStore.getState().createVault({ name: "Économie", projectId: "p-a" });
    const store = useContentStore.getState();
    store.renameVault(vault.id, { name: "   " });
    store.renameVault(vault.id, { note: "Monétarisme" });
    const after = useContentStore.getState().vaults[0];
    expect(after.name).toBe("Économie");
    expect(after.note).toBe("Monétarisme");
  });

  it("refuse de supprimer un vault qui contient des fiches", () => {
    const vault = useContentStore.getState().createVault({ name: "Économie", projectId: "p-a" });
    useContentStore.setState({
      zettel: [
        {
          id: "z-1",
          code: "1",
          vaultId: vault.id,
          title: "Inflation",
          body: "Corps",
          source: "Cours",
          refs: [],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const result = useContentStore.getState().deleteVault(vault.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("1 fiche");
    expect(useContentStore.getState().vaults).toHaveLength(1);
  });

  it("supprime un vault vide et ne laisse pas de note orpheline", () => {
    const vault = useContentStore.getState().createVault({ name: "Vide", projectId: "p-a" });
    const note = useContentStore.getState().createNote("cornell", { projectId: "p-a" });
    useContentStore.setState((state) => ({
      notes: state.notes.map((n) => (n.id === note.id ? { ...n, vaultId: vault.id } : n)),
    }));
    expect(useContentStore.getState().deleteVault(vault.id).ok).toBe(true);
    const state = useContentStore.getState();
    expect(state.vaults).toHaveLength(0);
    expect(state.notes.find((n) => n.id === note.id)?.vaultId).toBeUndefined();
  });

  it("place une fiche zettelkasten dans un vault du projet actif", () => {
    const own = useContentStore.getState().createVault({ name: "Autre projet", projectId: "p-b" });
    const note = useContentStore.getState().createNote("zettelkasten", { projectId: "p-a" });
    const state = useContentStore.getState();
    const target = state.vaults.find((v) => v.id === note.vaultId);
    expect(target).toBeDefined();
    expect(target!.projectId).toBe("p-a");
    expect(note.vaultId).not.toBe(own.id);

    // une deuxième fiche ne crée pas un second vault pour le même projet
    const second = useContentStore.getState().createNote("zettelkasten", { projectId: "p-a" });
    expect(second.vaultId).toBe(note.vaultId);
    expect(useContentStore.getState().vaults).toHaveLength(2);
  });

  it("crée un vault nommé d’après le projet quand il n’en existe aucun", () => {
    const note = useContentStore.getState().createNote("zettelkasten", { projectId: "p-b" });
    const state = useContentStore.getState();
    expect(state.vaults).toHaveLength(1);
    expect(state.vaults[0].name).toBe("Vault Bêta");
    expect(note.vaultId).toBe(state.vaults[0].id);
  });

  it("garde les fiches zettelkasten hors du projet dans leur propre vault", () => {
    const note = useContentStore.getState().createNote("zettelkasten", { projectId: "p-a" });
    const state = useContentStore.getState();
    const vault = state.vaults.find((v) => v.id === note.vaultId)!;
    expect(vault.projectId).toBe("p-a");
  });
});
