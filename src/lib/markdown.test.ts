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
