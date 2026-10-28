import { describe, expect, it } from "vitest";
import { seedZettel } from "@/data/seed";
import type { ZettelCard } from "@/types";
import {
  CARD_H,
  CARD_W,
  compareCodes,
  layoutZettelGraph,
  zettelGraph,
  zettelLinks,
  zettelRoot,
} from "@/lib/graph/zettel";
import { GRAPH_STYLES } from "@/lib/graph/styles";

const card = (code: string, refs: string[] = []): ZettelCard => ({
  id: `id-${code}`,
  code,
  vaultId: "v",
  title: `Fiche ${code}`,
  body: "",
  source: "",
  refs,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x < b.x + CARD_W &&
  a.x + CARD_W > b.x &&
  a.y < b.y + CARD_H &&
  a.y + CARD_H > b.y;

describe("graphe zettelkasten", () => {
  it("ordonne les codes naturellement", () => {
    const codes = ["#1B", "#1A1a", "#2", "#1A", "#1A1"];
    expect([...codes].sort(compareCodes)).toEqual(["#1A", "#1A1", "#1A1a", "#1B", "#2"]);
  });

  it("déduplique les liens et repère les citations réciproques", () => {
    const cards = [card("#1A", ["#1B"]), card("#1B", ["#1A"]), card("#1C", ["#1A", "#1C", "#9Z"])];
    const links = zettelLinks(cards);
    expect(links).toHaveLength(2);
    expect(links.find((link) => link.source === "#1A")?.mutual).toBe(true);
    expect(links.find((link) => link.source === "#1C")?.mutual).toBe(false);
    // ni auto-référence, ni code inconnu
    expect(links.some((link) => link.target === "#1C" && link.source === "#1C")).toBe(false);
    expect(links.some((link) => link.target === "#9Z")).toBe(false);
  });

  it("choisit la fiche la plus citée comme racine, et respecte une fiche imposée", () => {
    const cards = [card("#1A", ["#1B"]), card("#1B", ["#1A"]), card("#1C", ["#1A"]), card("#1D")];
    expect(zettelRoot(cards)?.code).toBe("#1A");
    expect(zettelRoot(cards, "#1D")?.code).toBe("#1D");
    expect(zettelRoot(cards, "#inconnu")?.code).toBe("#1A");
  });

  it("relie toutes les fiches, même isolées", () => {
    const cards = [card("#1A", ["#1B"]), card("#1B"), card("#1C"), card("#2", ["#2A"]), card("#2A")];
    const graph = zettelGraph(cards);
    expect(graph.nodes).toHaveLength(cards.length);
    expect(new Set(graph.nodes.map((node) => node.code)).size).toBe(cards.length);
    const detached = graph.nodes.filter((node) => node.detached);
    expect(detached.length).toBeGreaterThan(0);
    // un arbre de n nœuds a n-1 arêtes, par composante
    const components = 1 + new Set(detached.map((node) => node.parentCode ?? node.code)).size;
    expect(graph.treeLinks.length).toBe(cards.length - components);
  });

  it("donne le même dessin quel que soit l’ordre d’entrée", () => {
    const shuffled = [...seedZettel].reverse();
    const a = layoutZettelGraph(zettelGraph(seedZettel), "tree-both");
    const b = layoutZettelGraph(zettelGraph(shuffled), "tree-both");
    const key = (layout: typeof a) =>
      [...layout.positions]
        .sort((x, y) => compareCodes(x.code, y.code))
        .map((position) => `${position.code}:${position.x},${position.y}`)
        .join("|");
    expect(key(a)).toBe(key(b));
  });

  it("ne fait jamais se chevaucher deux cartes, pour toutes les dispositions", () => {
    for (const style of GRAPH_STYLES) {
      const layout = layoutZettelGraph(zettelGraph(seedZettel), style.layout);
      for (let i = 0; i < layout.positions.length; i += 1) {
        for (let j = i + 1; j < layout.positions.length; j += 1) {
          expect(
            overlaps(layout.positions[i], layout.positions[j]),
            `${style.layout} · ${layout.positions[i].code} ↔ ${layout.positions[j].code}`,
          ).toBe(false);
        }
      }
    }
  });

  it("place chaque fiche, quelle que soit la disposition", () => {
    for (const style of GRAPH_STYLES) {
      const layout = layoutZettelGraph(zettelGraph(seedZettel), style.layout);
      expect(
        layout.positions.map((position) => position.code).sort(),
        style.layout,
      ).toEqual(seedZettel.map((card) => card.code).sort());
    }
  });

  it("garde toutes les cartes dans les bornes annoncées", () => {
    for (const style of GRAPH_STYLES) {
      const layout = layoutZettelGraph(zettelGraph(seedZettel), style.layout);
      for (const position of layout.positions) {
        expect(position.x).toBeGreaterThanOrEqual(0);
        expect(position.y).toBeGreaterThanOrEqual(0);
        expect(position.x + CARD_W).toBeLessThanOrEqual(layout.width);
        expect(position.y + CARD_H).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("place la racine au centre de l’arbre binaire", () => {
    const graph = zettelGraph(seedZettel);
    const layout = layoutZettelGraph(graph, "tree-both");
    const root = layout.positions.find((position) => position.root)!;
    const left = layout.positions.filter((position) => position.x < root.x - 10);
    const right = layout.positions.filter((position) => position.x > root.x + CARD_W - 10);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
  });

  it("ne couronne pas racine une fiche hors arbre", () => {
    const cards = [card("#1A", ["#1B"]), card("#1B"), card("#9A", ["#9B"]), card("#9B")];
    const layout = layoutZettelGraph(zettelGraph(cards), "tree-both");
    const roots = layout.positions.filter((position) => position.root);
    expect(roots).toHaveLength(1);
    expect(roots[0].code).toBe("#1A");
    expect(layout.positions.filter((position) => position.detached).length).toBe(2);
  });

  it("attribue un code unique par vault (clé du graphe)", () => {
    const codes = seedZettel.map((entry) => entry.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("distingue les liens de l’arbre des renvois", () => {
    const graph = zettelGraph(seedZettel);
    expect(graph.echoes.length).toBeGreaterThan(0);
    expect(graph.treeLinks.length + graph.echoes.length).toBe(graph.links.length);
  });
});
