import { describe, expect, it } from "vitest";
import { VAULT_TEMPLATES, getVaultTemplate, vaultSignature } from "@/lib/templates/graphs";
import { vaultFromTemplate } from "@/lib/templates/apply";
import { graphStyleById, GRAPH_STYLES } from "@/lib/graph/styles";
import { zettelGraph } from "@/lib/graph/zettel";
import type { ZettelCard } from "@/types";

/**
 * Un modèle de coffre est une donnée : s’il est faux, il casse le graphe au
 * premier geste, sans erreur visible. Ces tests vérifient donc les invariants
 * qu’on ne peut pas voir à l’œil : codes uniques, références résolues, style
 * connu, et un graphe réellement connexe.
 */

const asCards = (id: string): ZettelCard[] =>
  (getVaultTemplate(id)?.cards ?? []).map((card, index) => ({
    id: `t-${id}-${index}`,
    code: card.code,
    vaultId: "v",
    title: card.title,
    body: card.body,
    source: card.source,
    refs: card.refs,
    createdAt: "",
    updatedAt: "",
  }));

describe("modèles de coffre", () => {
  it("en propose six, tous identifiables", () => {
    expect(VAULT_TEMPLATES).toHaveLength(6);
    expect(new Set(VAULT_TEMPLATES.map((template) => template.id)).size).toBe(6);
  });

  it("n’a ni code en double ni référence orpheline", () => {
    for (const template of VAULT_TEMPLATES) {
      const codes = template.cards.map((card) => card.code);
      expect(new Set(codes).size, template.id).toBe(codes.length);
      for (const card of template.cards) {
        expect(card.code).toMatch(/^#/);
        for (const ref of card.refs) {
          expect(codes, `${template.id} : ${card.code} → ${ref}`).toContain(ref);
        }
      }
    }
  });

  it("pointe vers des styles de graphe existants", () => {
    const ids = new Set(GRAPH_STYLES.map((style) => style.id));
    for (const template of VAULT_TEMPLATES) {
      expect(ids.has(template.style), `${template.id} → ${template.style}`).toBe(true);
      expect(graphStyleById(template.style).id).toBe(template.style);
    }
  });

  it("produit un graphe connexe : aucune fiche hors arbre", () => {
    for (const template of VAULT_TEMPLATES) {
      const graph = zettelGraph(asCards(template.id));
      expect(graph.rootCode, template.id).not.toBeNull();
      expect(graph.nodes.length, template.id).toBe(template.cards.length);
      expect(graph.nodes.filter((node) => node.detached), template.id).toEqual([]);
      expect(graph.treeLinks.length, template.id).toBeGreaterThan(0);
    }
  });

  it("annonce ce qu’il pose", () => {
    const signature = vaultSignature(VAULT_TEMPLATES[0]);
    expect(signature).toContain("fiches");
    expect(signature).toContain("liens");
  });

  it("se déplie sans perdre les codes ni les références", () => {
    for (const template of VAULT_TEMPLATES) {
      const seed = vaultFromTemplate(template);
      expect(seed.cards.map((card) => card.code)).toEqual(
        template.cards.map((card) => card.code),
      );
      expect(seed.cards[0].refs).not.toBe(template.cards[0].refs);
      expect(seed.style).toBe(template.style);
      expect(seed.name).toBe(template.name);
    }
  });
});
