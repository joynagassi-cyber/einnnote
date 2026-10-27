import { describe, expect, it } from "vitest";
import {
  layoutMindmap,
  measureTree,
  type MindmapLayoutKind,
  type TemplateNode,
} from "@/lib/mindmap/layout";

const TREE: TemplateNode = {
  key: "root",
  text: "Racine",
  shape: "circle",
  children: [
    {
      key: "a",
      text: "Branche A",
      children: [
        { key: "a1", text: "Feuille A1" },
        { key: "a2", text: "Feuille A2" },
      ],
    },
    {
      key: "b",
      text: "Branche B",
      children: [
        { key: "b1", text: "Feuille B1" },
        { key: "b2", text: "Feuille B2" },
        { key: "b3", text: "Feuille B3" },
      ],
    },
    { key: "c", text: "Branche C", children: [{ key: "c1", text: "Feuille C1" }] },
  ],
};

const KINDS: MindmapLayoutKind[] = [
  "tree-lr",
  "tree-tb",
  "radial",
  "timeline",
  "matrix",
  "fishbone",
  "columns",
  "ladder",
];

/** Deux boîtes de 150 × 96 ne doivent jamais se recouvrir. */
function overlaps(kind: MindmapLayoutKind) {
  const { nodes } = layoutMindmap(TREE, kind);
  const collisions: string[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if (dx < 150 && dy < 96) collisions.push(`${a.id}/${b.id}`);
    }
  }
  return collisions;
}

describe("disposition des cartes mentales", () => {
  it("place chaque nœud une seule fois, dans le positif", () => {
    for (const kind of KINDS) {
      const { nodes } = layoutMindmap(TREE, kind);
      expect(nodes, kind).toHaveLength(10);
      expect(new Set(nodes.map((node) => node.id)).size, kind).toBe(10);
      expect(Math.min(...nodes.map((node) => node.x)), kind).toBeGreaterThanOrEqual(0);
      expect(Math.min(...nodes.map((node) => node.y)), kind).toBeGreaterThanOrEqual(0);
    }
  });

  it("ne superpose jamais deux nœuds, quel que soit le modèle", () => {
    for (const kind of KINDS) {
      expect(overlaps(kind), kind).toEqual([]);
    }
  });

  it("crée exactement une arête par nœud non racine, toutes valides", () => {
    for (const kind of KINDS) {
      const { nodes, edges } = layoutMindmap(TREE, kind);
      expect(edges, kind).toHaveLength(9);
      const ids = new Set(nodes.map((node) => node.id));
      for (const edge of edges) {
        expect(ids.has(edge.source), kind).toBe(true);
        expect(ids.has(edge.target), kind).toBe(true);
      }
      expect(nodes.filter((node) => !node.parentId)).toHaveLength(1);
    }
  });

  it("lit de gauche à droite en arbre horizontal", () => {
    const { nodes } = layoutMindmap(TREE, "tree-lr");
    const byId = new Map(nodes.map((node) => [node.id, node]));
    for (const node of nodes) {
      if (!node.parentId) continue;
      const parent = byId.get(node.parentId)!;
      expect(node.x).toBeGreaterThan(parent.x);
    }
    // le parent est centré verticalement sur ses enfants
    const a = byId.get("a")!;
    const a1 = byId.get("a1")!;
    const a2 = byId.get("a2")!;
    expect(a.y).toBeGreaterThan(Math.min(a1.y, a2.y));
    expect(a.y).toBeLessThan(Math.max(a1.y, a2.y));
  });

  it("lit de haut en bas en arbre vertical", () => {
    const { nodes } = layoutMindmap(TREE, "tree-tb");
    const byId = new Map(nodes.map((node) => [node.id, node]));
    for (const node of nodes) {
      if (!node.parentId) continue;
      expect(node.y).toBeGreaterThan(byId.get(node.parentId)!.y);
    }
  });

  it("met les branches de premier niveau sur un même cercle en radial", () => {
    const { nodes } = layoutMindmap(TREE, "radial");
    const root = nodes.find((node) => node.depth === 0)!;
    const center = { x: root.x + 75, y: root.y + 48 };
    const radii = nodes
      .filter((node) => node.depth === 1)
      .map((node) => Math.hypot(node.x + 75 - center.x, node.y + 48 - center.y));
    const spread = Math.max(...radii) - Math.min(...radii);
    expect(spread).toBeLessThan(1);
  });

  it("est déterministe : deux calculs donnent les mêmes positions", () => {
    const first = layoutMindmap(TREE, "fishbone");
    const second = layoutMindmap(TREE, "fishbone");
    expect(first).toEqual(second);
  });

  it("mesure la taille d’un modèle", () => {
    expect(measureTree(TREE)).toEqual({ nodes: 10, depth: 3 });
  });
});
