import { describe, expect, it } from "vitest";
import { buildMarkdown, type MarkdownSource } from "@/lib/markdown";
import {
  seedLinks,
  seedMindMaps,
  seedNotes,
  seedProjects,
  seedQuestions,
  seedVaults,
  seedZettel,
} from "@/data/seed";

const source: MarkdownSource = {
  projects: seedProjects,
  notes: seedNotes,
  questions: seedQuestions,
  links: seedLinks,
  vaults: seedVaults,
  zettel: seedZettel,
  mindmaps: seedMindMaps,
};

describe("export Markdown du vault", () => {
  it("exporte toute la bibliothèque avec un en-tête YAML", () => {
    const file = buildMarkdown(source);
    expect(file.filename).toMatch(/^engram-bibliotheque-\d{4}-\d{2}-\d{2}\.md$/);
    expect(file.content.startsWith("---\n")).toBe(true);
    expect(file.content).toContain("# Bibliothèque Engram");
    expect(file.notes).toBe(seedNotes.filter((n) => !n.deletedAt).length);
  });

  it("inclut chaque note avec ses métadonnées", () => {
    const file = buildMarkdown(source);
    for (const note of seedNotes) {
      expect(file.content).toContain(`# ${note.title}`);
      expect(file.content).toContain(`title: ${note.title}`);
    }
  });

  it("traduit les blocs en Markdown", () => {
    const file = buildMarkdown(source);
    expect(file.content).toContain("## 3. Lire un article scientifique");
    expect(file.content).toContain("- Résumé d’abord");
  });

  it("joint les questions et leur passage", () => {
    const file = buildMarkdown(source);
    expect(file.content).toContain("## Questions");
    expect(file.content).toMatch(/\*\*Q1\.\*\*/);
  });

  it("rend la carte mentale en arborescence", () => {
    const file = buildMarkdown({ ...source, notes: seedNotes.filter((n) => n.method === "mindmap") });
    expect(file.content).toContain("## Carte mentale");
    expect(file.content).toMatch(/^- /m);
  });

  it("rend les cartes d’un coffre Zettelkasten", () => {
    const file = buildMarkdown(source);
    expect(file.content).toContain("## Cartes du coffre");
    expect(file.content).toContain("### #1A ·");
  });

  it("respecte le périmètre d’un projet", () => {
    const file = buildMarkdown(source, { kind: "project", projectId: "p-these" });
    expect(file.filename).toContain("engram-these-");
    expect(file.content).toContain("# Thèse");
    const contrats = seedNotes.find((n) => n.id === "n-contrats")!;
    expect(contrats.projectId).toBe("p-general");
    expect(file.content).not.toContain(`# ${contrats.title}`);
  });

  it("respecte le périmètre d’un coffre", () => {
    const file = buildMarkdown(source, { kind: "vault", vaultId: "v-eco" });
    expect(file.filename).toMatch(/^engram-economie-/);
    expect(file.content).toContain("# Économie");
    expect(file.notes).toBe(0);
    expect(file.cards).toBeGreaterThan(0);
  });

  it("ignore les notes en corbeille", () => {
    const withTrash = {
      ...source,
      notes: seedNotes.map((note, index) =>
        index === 0 ? { ...note, deletedAt: new Date().toISOString() } : note,
      ),
    };
    const file = buildMarkdown(withTrash);
    expect(file.content).not.toContain(`# ${seedNotes[0].title}`);
    expect(file.notes).toBe(seedNotes.length - 1);
  });

  it("ne produit pas un fichier vide pour un coffre inconnu", () => {
    const file = buildMarkdown(source, { kind: "vault", vaultId: "inconnu" });
    expect(file.content).toBe("");
    expect(file.cards).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Arborescence                                                       */
/* ------------------------------------------------------------------ */

import { buildMarkdownTree, fileSafe } from "@/lib/markdown";

describe("export en arborescence", () => {
  const source = {
    projects: [
      { id: "p1", name: "Thèse", description: "Travail de fond", createdAt: "", updatedAt: "" },
      { id: "p2", name: "Cours", description: "", createdAt: "", updatedAt: "" },
    ],
    notes: [
      {
        id: "n1",
        title: "Plan du chapitre 3",
        projectId: "p1",
        method: "outline" as const,
        status: "captured" as const,
        collection: "",
        blocks: [],
        createdAt: "2025-01-01",
        updatedAt: "2025-01-02",
        vaultId: undefined,
      },
      {
        id: "n2",
        title: "Plan du chapitre 3",
        projectId: "p1",
        method: "cornell" as const,
        status: "captured" as const,
        collection: "",
        blocks: [],
        createdAt: "2025-01-01",
        updatedAt: "2025-01-03",
        vaultId: undefined,
      },
    ],
    questions: [],
    links: [],
    vaults: [
      { id: "v1", name: "Économie", projectId: "p1", note: "" },
      { id: "v2", name: "Vide", projectId: "p2", note: "" },
    ],
    zettel: [
      {
        id: "z1",
        code: "#1A",
        vaultId: "v1",
        title: "L’inflation / l’épargne",
        body: "Corps",
        source: "Livre",
        refs: ["#1B"],
        createdAt: "2025-01-01",
        updatedAt: "2025-01-02",
      },
      {
        id: "z2",
        code: "#1B",
        vaultId: "v1",
        title: "Taux nominal",
        body: "Corps 2",
        source: "",
        refs: [],
        createdAt: "2025-01-01",
        updatedAt: "2025-01-02",
      },
    ],
    mindmaps: [],
  };

  it("range un fichier par note sous son projet", () => {
    const tree = buildMarkdownTree(source as never);
    const notes = tree.files.filter((file) => file.path.startsWith("Notes/"));
    expect(notes).toHaveLength(2);
    expect(notes[0].path.startsWith("Notes/Thèse/")).toBe(true);
    /* deux notes de même titre ne s’écrasent pas */
    expect(new Set(notes.map((file) => file.path)).size).toBe(2);
    expect(notes.some((file) => file.path.includes("Plan du chapitre 3 - 2.md"))).toBe(true);
  });

  it("range les fiches par projet puis par coffre, une par fichier", () => {
    const tree = buildMarkdownTree(source as never);
    const cards = tree.files.filter((file) => file.path.startsWith("Coffres/"));
    expect(cards.map((file) => file.path)).toEqual([
      "Coffres/Thèse/Économie/_coffre.md",
      "Coffres/Thèse/Économie/#1A L’inflation l’épargne.md",
      "Coffres/Thèse/Économie/#1B Taux nominal.md",
    ]);
    expect(tree.cards).toBe(2);
    /* un coffre vide ne crée pas de dossier fantôme */
    expect(tree.files.some((file) => file.path.includes("/Vide/"))).toBe(false);
  });

  it("lie les fiches entre elles, dans les deux sens", () => {
    const tree = buildMarkdownTree(source as never);
    const first = tree.files.find((file) => file.path.includes("#1A"))!;
    expect(first.content).toContain("[[#1B Taux nominal]]");
    const second = tree.files.find((file) => file.path.includes("#1B"))!;
    expect(second.content).toContain("Cité par");
    expect(second.content).toContain("[[#1A L’inflation l’épargne]]");
  });

  it("pose un index général et une fiche par projet", () => {
    const tree = buildMarkdownTree(source as never);
    expect(tree.files[0].path).toBe("_index.md");
    expect(tree.files.some((file) => file.path === "Projets/Thèse.md")).toBe(true);
    expect(tree.root).toMatch(/^Engram \d{4}-\d{2}-\d{2}$/);
  });

  it("nettoie les noms de fichiers sans perdre les accents", () => {
    expect(fileSafe("Économie / inflation : le cas")).toBe("Économie inflation le cas");
    expect(fileSafe("  ")).toBe("sans-titre");
    expect(fileSafe("point final...")).toBe("point final");
    expect(fileSafe(".cache")).toBe("_cache");
  });
});
