import { describe, expect, it } from "vitest";
import { demoZettel as seedZettel } from "@/test/fixtures";
import { layoutZettelGraph, zettelGraph } from "@/lib/graph/zettel";
import { graphStyleById } from "@/lib/graph/styles";
import {
  escapeXml,
  graphToDocument,
  graphToSvg,
  parseGraphDocument,
  slug,
  wrapTitle,
} from "@/lib/graph/export";

const build = (styleId = "arbre-binaire") => {
  const graph = zettelGraph(seedZettel);
  const style = graphStyleById(styleId);
  const layout = layoutZettelGraph(graph, style.layout);
  return {
    input: {
      vault: { name: "Économie" },
      cards: seedZettel,
      graph,
      positions: layout.positions,
      style,
    },
    graph,
  };
};

describe("export du graphe", () => {
  it("échappe ce qui casserait un fichier SVG", () => {
    expect(escapeXml('A & B <c> "d"')).toBe("A &amp; B &lt;c&gt; &quot;d&quot;");
  });

  it("coupe un titre long en deux lignes au plus", () => {
    const lines = wrapTitle("L’inflation et l’épargne des ménages modestes en zone euro", 20);
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(lines.join(" ").length).toBeLessThanOrEqual(
      "L’inflation et l’épargne des ménages modestes en zone euro".length,
    );
  });

  it("produit un SVG bien formé, sans NaN, avec toutes les fiches", () => {
    const { input } = build();
    const svg = graphToSvg(input);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
    expect(svg).toContain("<title>Graphe · Économie</title>");
    for (const card of seedZettel) {
      expect(svg, card.code).toContain(`>${card.code}<`);
    }
    // une étiquette de relation au moins
    expect(svg).toContain("<textPath");
  });

  it("respecte les options : sans étiquettes, sans renvois, thème sombre", () => {
    const { input } = build();
    const svg = graphToSvg(input, { labels: false, echoes: false, mode: "dark" });
    expect(svg).not.toContain("<textPath");
    expect(svg).toContain("#12110F");
  });

  it("produit un SVG pour chaque style, sans erreur", () => {
    for (const id of ["arbre-binaire", "plume", "flux", "direct", "colonnes"]) {
      const { input } = build(id);
      const svg = graphToSvg(input);
      expect(svg, id).not.toMatch(/NaN/);
      expect(svg, id).toContain("</svg>");
    }
  });

  it("exporte un document JSON complet et slugifie le nom de fichier", () => {
    const { input } = build();
    const document = graphToDocument(input);
    expect(document.format).toBe("engram-graphe");
    expect(document.cards).toHaveLength(seedZettel.length);
    expect(document.treeLinks.length).toBeGreaterThan(0);
    expect(slug("Économie (2026) — essai")).toBe("economie-2026-essai");
    expect(slug("")).toBe("graphe");
  });

  it("refuse un fichier invalide avec une raison, au lieu de casser le canevas", () => {
    expect(parseGraphDocument("pas du json").ok).toBe(false);
    expect(parseGraphDocument("{}").ok).toBe(false);
    expect(parseGraphDocument(JSON.stringify({ format: "autre" })).ok).toBe(false);
    const broken = parseGraphDocument(
      JSON.stringify({
        format: "engram-graphe",
        cards: [{ code: "#1A", title: "a", refs: [] }],
        treeLinks: [{ source: "#1A", target: "#9Z" }],
      }),
    );
    expect(broken.ok).toBe(false);
    const reason = "reason" in broken ? broken.reason : "";
    expect(reason).toContain("#9Z");
  });

  it("refuse deux fiches au même code", () => {
    const parsed = parseGraphDocument(
      JSON.stringify({
        format: "engram-graphe",
        cards: [
          { code: "#1A", title: "a", refs: [] },
          { code: "#1A", title: "b", refs: [] },
        ],
        treeLinks: [],
      }),
    );
    expect(parsed.ok).toBe(false);
    expect(parsed.reason).toContain("#1A");
  });

  it("accepte son propre export (aller-retour)", () => {
    const { input } = build();
    const parsed = parseGraphDocument(JSON.stringify(graphToDocument(input)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.document.cards.map((card) => card.code).sort()).toEqual(
        seedZettel.map((card) => card.code).sort(),
      );
    }
  });
});
