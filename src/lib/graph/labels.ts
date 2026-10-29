import type { ZettelCard } from "@/types";
import { compareCodes, type ZettelGraph, type ZettelLink } from "@/lib/graph/zettel";

/**
 * Étiquettes de lien — la leçon de la « carte conceptuelle ».
 *
 * Une carte conceptuelle n’est pas un arbre : c’est un graphe dont **chaque
 * lien est nommé** (« inflation → réduit → pouvoir d’achat »). Sans le mot sur
 * la flèche, le lecteur doit deviner la relation ; avec, le graphe devient un
 * texte.
 *
 * Règle d’honnêteté : un lien d’**arbre** est un lien de structure (parcours en
 * largeur), pas forcément une citation. On ne l’étiquette donc jamais « cite »
 * par défaut — on recalcule le sens réel depuis les `refs` des fiches, et on
 * écrit « lié » quand aucune citation n’a été déclarée.
 *
 * Provenance : `Flow_renderer_test` (`CustomEdge` pose un texte sur le chemin
 * via `textPath`, `data.text = "connection line text"`). On garde l’idée, on
 * remplace le texte fixe par une relation déduite des données.
 */

export type Relation = "cite" | "cite-par" | "reciproque" | "lie";

export const RELATION_LABELS: Record<Relation, string> = {
  cite: "cite",
  "cite-par": "cité par",
  reciproque: "↔",
  lie: "lié",
};

export interface LinkLabel {
  relation: Relation;
  label: string;
  /** vrai quand la relation est déclarée des deux côtés */
  mutual: boolean;
}

function pairKey(a: string, b: string) {
  return [a, b].sort(compareCodes).join("\u0000");
}

/** Index des citations déclarées : paire → sens réel. */
export function citationIndex(cards: ZettelCard[]): Map<string, LinkLabel> {
  const index = new Map<string, LinkLabel>();
  const refs = new Map<string, Set<string>>();
  for (const card of cards) refs.set(card.code, new Set(card.refs));
  for (const card of cards) {
    for (const ref of card.refs) {
      if (ref === card.code) continue;
      if (!refs.has(ref)) continue;
      const key = pairKey(card.code, ref);
      const back = refs.get(ref)?.has(card.code) ?? false;
      const existing = index.get(key);
      if (back) {
        index.set(key, { relation: "reciproque", label: RELATION_LABELS.reciproque, mutual: true });
        continue;
      }
      if (!existing) {
        index.set(key, { relation: "cite", label: RELATION_LABELS.cite, mutual: false });
      }
    }
  }
  return index;
}

/**
 * Étiquette d’un lien orienté `from → to`.
 *
 * L’index ne retient qu’une paire : il faut donc confronter le sens demandé aux
 * `refs` pour distinguer « cite » de « cité par ».
 */
export function linkLabel(cards: ZettelCard[], from: string, to: string): LinkLabel {
  const byCode = new Map(cards.map((card) => [card.code, card]));
  const source = byCode.get(from);
  const target = byCode.get(to);
  if (!source || !target) return { relation: "lie", label: RELATION_LABELS.lie, mutual: false };

  const forward = source.refs.includes(to);
  const backward = target.refs.includes(from);

  if (forward && backward) {
    return { relation: "reciproque", label: RELATION_LABELS.reciproque, mutual: true };
  }
  if (forward) return { relation: "cite", label: RELATION_LABELS.cite, mutual: false };
  if (backward) {
    return { relation: "cite-par", label: RELATION_LABELS["cite-par"], mutual: false };
  }
  return { relation: "lie", label: RELATION_LABELS.lie, mutual: false };
}

/** Répartition des relations d’un graphe — sert au bandeau et à la légende. */
export function relationCounts(graph: ZettelGraph, cards: ZettelCard[]) {
  const counts: Record<Relation, number> = { cite: 0, "cite-par": 0, reciproque: 0, lie: 0 };
  const links: ZettelLink[] = [...graph.links];
  for (const link of links) {
    counts[linkLabel(cards, link.source, link.target).relation] += 1;
  }
  return counts;
}
