import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PROJECT_ID, migrateContentData, useContentStore } from "@/stores/useContentStore";
import { DEFAULT_PERSONALIZATION, DEFAULT_SETTINGS, withDefaults } from "@/stores/useAppStore";
import type { Note, ZettelVault } from "@/types";

const note = (id: string, projectId?: string): Note => ({
  id,
  projectId,
  method: "cornell",
  title: `Note ${id}`,
  collection: "Test",
  status: "draft",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  blocks: [],
});

const vault = (id: string, projectId?: string): ZettelVault => ({
  id,
  projectId,
  name: `Vault ${id}`,
  note: "",
});

describe("projets", () => {
  beforeEach(() => {
    useContentStore.setState({
      projects: [
        { id: "p-a", name: "A", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "p-b", name: "B", createdAt: "2026-01-01T00:00:00.000Z" },
      ],
      notes: [note("n1", "p-a")],
      vaults: [vault("v1", "p-a")],
    });
  });

  it("crée une note dans le projet demandé", () => {
    const created = useContentStore.getState().createNote("cornell", {
      projectId: "p-b",
    });
    expect(created.projectId).toBe("p-b");
    expect(
      useContentStore.getState().notes.find((n) => n.id === created.id)?.projectId,
    ).toBe("p-b");
  });

  it("range la note dans le premier projet quand aucun n’est précisé", () => {
    const created = useContentStore.getState().createNote("outline");
    expect(created.projectId).toBe("p-a");
  });

  it("rattache un vault Zettelkasten au projet de la note", () => {
    const created = useContentStore.getState().createNote("zettelkasten", {
      projectId: "p-a",
    });
    expect(created.vaultId).toBe("v1");
  });

  it("renomme un projet sans toucher aux autres", () => {
    useContentStore.getState().renameProject("p-b", "Thèse");
    const projects = useContentStore.getState().projects;
    expect(projects.find((p) => p.id === "p-b")?.name).toBe("Thèse");
    expect(projects.find((p) => p.id === "p-a")?.name).toBe("A");
  });

  it("refuse de supprimer un projet qui contient des notes", () => {
    const result = useContentStore.getState().deleteProject("p-a");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("1 note");
    expect(useContentStore.getState().projects).toHaveLength(2);
  });

  it("supprime un projet vide", () => {
    const result = useContentStore.getState().deleteProject("p-b");
    expect(result.ok).toBe(true);
    expect(useContentStore.getState().projects.map((p) => p.id)).toEqual(["p-a"]);
  });

  it("garde toujours au moins un projet", () => {
    useContentStore.setState({ notes: [] });
    useContentStore.getState().deleteProject("p-b");
    const result = useContentStore.getState().deleteProject("p-a");
    expect(result.ok).toBe(false);
    expect(useContentStore.getState().projects).toHaveLength(1);
  });

  it("déplace une note vers un autre projet", () => {
    useContentStore.getState().assignNoteToProject("n1", "p-b");
    expect(useContentStore.getState().notes[0].projectId).toBe("p-b");
  });
});

describe("migration de contenu v1 → v2", () => {
  it("rattache les notes et les vaults au projet par défaut", () => {
    const migrated = migrateContentData(
      { notes: [note("n1")], vaults: [vault("v1")] },
      1,
    ) as { projects: { id: string }[]; notes: Note[]; vaults: ZettelVault[] };

    const projectId = migrated.projects[0].id;
    expect(projectId).toBeTruthy();
    expect(migrated.notes[0].projectId).toBe(projectId);
    expect(migrated.vaults[0].projectId).toBe(projectId);
  });

  it("ne touche pas à un contenu déjà en v2", () => {
    const input = { projects: [], notes: [note("n1", "p-z")], vaults: [] };
    const migrated = migrateContentData(input, 2) as typeof input;
    expect(migrated).toEqual(input);
  });

  it("survit à un contenu vide", () => {
    expect(migrateContentData(undefined, 1)).toBeUndefined();
  });
});

describe("réglages : compatibilité des sauvegardes", () => {
  it("complète une personnalisation absente", () => {
    const settings = withDefaults({ theme: "dark" });
    expect(settings.theme).toBe("dark");
    expect(settings.personalization).toEqual(DEFAULT_PERSONALIZATION);
  });

  it("complète une personnalisation partielle", () => {
    const settings = withDefaults({
      personalization: { ...DEFAULT_PERSONALIZATION, paper: "mist" },
    });
    expect(settings.personalization.paper).toBe("mist");
    expect(settings.personalization.noteLeading).toBe(
      DEFAULT_SETTINGS.personalization.noteLeading,
    );
  });

  it("expose un identifiant de projet par défaut stable", () => {
    expect(DEFAULT_PROJECT_ID).toBe("p-general");
  });
});
