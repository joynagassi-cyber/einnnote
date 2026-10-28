import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRAPH_STYLE,
  GRAPH_STYLES,
  graphStyleById,
  graphStylePreview,
  graphStylesFor,
} from "@/lib/graph/styles";

describe("styles de graphe", () => {
  it("en propose au moins douze, tous nommés et uniques", () => {
    expect(GRAPH_STYLES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(GRAPH_STYLES.map((style) => style.id)).size).toBe(GRAPH_STYLES.length);
    expect(new Set(GRAPH_STYLES.map((style) => style.label)).size).toBe(GRAPH_STYLES.length);
    for (const style of GRAPH_STYLES) {
      expect(style.hint.length, style.id).toBeGreaterThan(20);
      expect(style.origin.length, style.id).toBeGreaterThan(5);
    }
  });

  it("couvre les cinq familles de liens et les six dispositions", () => {
    const edges = new Set(GRAPH_STYLES.map((style) => style.edge));
    expect([...edges].sort()).toEqual(["bezier", "floating", "smoothstep", "straight", "tapered"]);
    const layouts = new Set(
      GRAPH_STYLES.filter((style) => style.scope === "both").map((style) => style.layout),
    );
    expect(layouts.size).toBeGreaterThanOrEqual(4);
  });

  it("retombe sur le style par défaut, jamais sur rien", () => {
    expect(graphStyleById(DEFAULT_GRAPH_STYLE).id).toBe(DEFAULT_GRAPH_STYLE);
    expect(graphStyleById("inconnu").id).toBe(DEFAULT_GRAPH_STYLE);
    expect(graphStyleById(null).id).toBe(DEFAULT_GRAPH_STYLE);
  });

  it("réserve l’arbre binaire aux vaults (il lui faut un graphe de fiches)", () => {
    const zettel = graphStylesFor("zettel");
    const mindmap = graphStylesFor("mindmap");
    expect(zettel.length).toBeGreaterThan(mindmap.length);
    expect(zettel.some((style) => style.id === "arbre-binaire")).toBe(true);
    expect(mindmap.some((style) => style.id === "arbre-binaire")).toBe(false);
  });

  it("produit une vignette finie pour chaque style", () => {
    for (const style of GRAPH_STYLES) {
      const preview = graphStylePreview(style);
      expect(preview.nodes).toHaveLength(7);
      expect(preview.edges).toHaveLength(7); // 6 liens d’arbre + 1 renvoi
      expect(preview.width).toBeGreaterThan(100);
      expect(preview.height).toBeGreaterThan(60);
      for (const edge of preview.edges) {
        expect(edge.d, style.id).toMatch(/^M /);
        expect(edge.d, style.id).not.toMatch(/NaN|Infinity|undefined/);
      }
      for (const node of preview.nodes) {
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.x + node.width).toBeLessThanOrEqual(preview.width);
        expect(node.y + node.height).toBeLessThanOrEqual(preview.height);
      }
    }
  });

  it("dessine les liens d’un style « plume » en formes pleines", () => {
    const tapered = GRAPH_STYLES.filter((style) => style.edge === "tapered");
    expect(tapered.length).toBeGreaterThan(0);
    for (const style of tapered) {
      for (const edge of graphStylePreview(style).edges) {
        expect(edge.d.trim().endsWith("Z"), style.id).toBe(true);
      }
    }
  });
});
