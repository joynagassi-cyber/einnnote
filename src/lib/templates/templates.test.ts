import { describe, expect, it } from "vitest";
import {
  CORNELL_TEMPLATES,
  NOTE_TEMPLATES,
  OUTLINE_TEMPLATES,
  ZETTEL_TEMPLATES,
  noteTemplatesFor,
} from "@/lib/templates/notes";
import { MINDMAP_TEMPLATES, DEFAULT_MINDMAP_TEMPLATE } from "@/lib/templates/mindmaps";
import {
  blocksFromTemplate,
  mindmapFromTemplate,
  noteFromTemplate,
} from "@/lib/templates/apply";
import { layoutMindmap, measureTree, type TemplateNode } from "@/lib/mindmap/layout";

const walks = (node: TemplateNode): TemplateNode[] => [
  node,
  ...(node.children ?? []).flatMap(walks),
];

describe("modèles de notes", () => {
  it("propose six modèles pour chaque méthode", () => {
    expect(OUTLINE_TEMPLATES).toHaveLength(6);
    expect(CORNELL_TEMPLATES).toHaveLength(6);
    expect(noteTemplatesFor("outline")).toHaveLength(6);
    expect(noteTemplatesFor("cornell")).toHaveLength(6);
  });

  it("garde des identifiants et des noms uniques", () => {
    expect(new Set(NOTE_TEMPLATES.map((t) => t.id)).size).toBe(NOTE_TEMPLATES.length);
    expect(new Set(NOTE_TEMPLATES.map((t) => t.name)).size).toBe(NOTE_TEMPLATES.length);
    expect(new Set(ZETTEL_TEMPLATES.map((t) => t.id)).size).toBe(ZETTEL_TEMPLATES.length);
    expect(new Set(MINDMAP_TEMPLATES.map((t) => t.id)).size).toBe(
      MINDMAP_TEMPLATES.length,
    );
  });

  it("n’a aucun bloc vide et annonce toujours un usage", () => {
    for (const template of NOTE_TEMPLATES) {
      expect(template.intent.length, template.id).toBeGreaterThan(20);
      expect(template.blocks.length, template.id).toBeGreaterThanOrEqual(8);
      for (const block of template.blocks) {
        expect(block.text.trim(), `${template.id} / ${block.kind}`).not.toBe("");
      }
      // un titre de section ne doit jamais être le dernier bloc
      const last = template.blocks[template.blocks.length - 1];
      expect(last.kind, template.id).not.toBe("h1");
    }
  });

  it("contient le modèle d’enseignement biblique demandé", () => {
    const biblical = CORNELL_TEMPLATES.find((t) => t.id === "cornell-enseignement");
    expect(biblical).toBeDefined();
    const text = biblical!.blocks.map((block) => block.text).join(" | ");
    for (const field of [
      "Date",
      "Orateur",
      "Thème",
      "Verset principal",
      "Détails de l’enseignement",
    ]) {
      expect(text, field).toContain(field);
    }
    // la structure de la méthode Cornell reste présente
    expect(text).toMatch(/Résumé/);
    expect(text).toMatch(/Application personnelle/);
  });

  it("couvre les publics annoncés", () => {
    const audiences = new Set(
      [...NOTE_TEMPLATES, ...ZETTEL_TEMPLATES, ...MINDMAP_TEMPLATES].map(
        (template) => template.audience,
      ),
    );
    expect(audiences.has("Étudiant")).toBe(true);
    expect(audiences.has("Scientifique")).toBe(true);
    expect(audiences.has("Autodidacte")).toBe(true);
  });
});

describe("modèles de fiches Zettelkasten", () => {
  it("fournit six charpentes rédigées", () => {
    expect(ZETTEL_TEMPLATES).toHaveLength(6);
    for (const template of ZETTEL_TEMPLATES) {
      expect(template.body.length, template.id).toBeGreaterThan(80);
      expect(template.title.trim(), template.id).not.toBe("");
      expect(template.intent.length, template.id).toBeGreaterThan(20);
    }
  });
});

describe("modèles de carte mentale", () => {
  it("en propose au moins douze, tous différents", () => {
    expect(MINDMAP_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    const layouts = new Set(MINDMAP_TEMPLATES.map((t) => t.layout));
    const audiences = new Set(MINDMAP_TEMPLATES.map((t) => t.audience));
    expect(layouts.size).toBeGreaterThanOrEqual(6);
    expect(audiences.size).toBeGreaterThanOrEqual(4);
  });

  it("désigne un seul modèle par défaut", () => {
    expect(MINDMAP_TEMPLATES.filter((t) => t.isDefault)).toHaveLength(1);
    expect(DEFAULT_MINDMAP_TEMPLATE.isDefault).toBe(true);
    expect(DEFAULT_MINDMAP_TEMPLATE.id).toBe("carte-lecture");
  });

  it("reste lisible : profondeur 2 et textes courts", () => {
    for (const template of MINDMAP_TEMPLATES) {
      const { depth } = measureTree(template.spec);
      /* measureTree compte les niveaux : racine + branches + feuilles = 3 */
      expect(depth, template.id).toBeLessThanOrEqual(3);
      for (const node of walks(template.spec)) {
        expect(node.text.trim(), `${template.id}/${node.key}`).not.toBe("");
        expect(node.text.length, `${template.id}/${node.key}`).toBeLessThanOrEqual(64);
      }
      expect(walks(template.spec).length, template.id).toBeGreaterThanOrEqual(9);
    }
  });

  it("produit une carte sans collision pour chaque modèle", () => {
    for (const template of MINDMAP_TEMPLATES) {
      const { nodes, edges } = layoutMindmap(template.spec, template.layout);
      expect(nodes).toHaveLength(walks(template.spec).length);
      expect(edges).toHaveLength(nodes.length - 1);
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = Math.abs(nodes[i].x - nodes[j].x);
          const dy = Math.abs(nodes[i].y - nodes[j].y);
          expect(dx < 150 && dy < 96, `${template.id}: ${nodes[i].id}/${nodes[j].id}`).toBe(
            false,
          );
        }
      }
    }
  });
});

describe("application d’un modèle", () => {
  it("convertit les blocs en contenu éditable, identifiants uniques", () => {
    const template = CORNELL_TEMPLATES[0];
    const seed = noteFromTemplate(template);
    expect(seed.blocks).toHaveLength(template.blocks.length);
    expect(new Set(seed.blocks.map((block) => block.id)).size).toBe(seed.blocks.length);
    expect(seed.blocks[1].kind).toBe(template.blocks[1].kind);
    expect(seed.blocks.some((block) => block.marked)).toBe(true);
  });

  it("convertit une carte mentale en nœuds et arêtes cohérents", () => {
    const seed = mindmapFromTemplate(DEFAULT_MINDMAP_TEMPLATE);
    expect(seed.nodes.length).toBeGreaterThan(10);
    expect(seed.edges.length).toBe(seed.nodes.length - 1);
    const ids = new Set(seed.nodes.map((node) => node.id));
    for (const edge of seed.edges) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
    expect(seed.nodes.filter((node) => !node.parentId)).toHaveLength(1);
    expect(seed.edgeStyle).toBe(DEFAULT_MINDMAP_TEMPLATE.edgeStyle);
  });

  it("ne réutilise pas les identifiants de blocs entre deux créations", () => {
    const a = blocksFromTemplate(CORNELL_TEMPLATES[0].blocks);
    const b = blocksFromTemplate(CORNELL_TEMPLATES[0].blocks);
    const ids = new Set([...a, ...b].map((block) => block.id));
    expect(ids.size).toBe(a.length + b.length);
  });
});
