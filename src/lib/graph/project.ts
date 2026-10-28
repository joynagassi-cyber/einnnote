import type { ZettelCard, ZettelVault } from "@/types";

/**
 * Le graphe d'un **projet** — vue de haut, au niveau des vaults.
 *
 * Un vault a déjà son graphe, fiche par fiche. Monter ce même graphe au niveau
 * du projet ne dirait rien de plus : il faudrait tout afficher d'un coup et la
 * figure deviendrait illisible. Ce que le projet a à montrer est d'une autre
 * nature — **quels vaults se parlent**. Deux vaults se parlent quand une fiche
 * de l'un renvoie à une fiche de l'autre : c'est le signe qu'une question
 * traverse les deux, donc qu'ils ne sont pas deux dossiers voisins mais deux
 * moitiés d'un même travail.
 *
 * D'où ce modèle : un nœud par vault, une arête par vault cité, avec le nombre
 * de renvois. Module pur, sans React ni DOM : il se teste.
 */

export interface ProjectNode {
  id: string;
  kind: "vault" | "loose";
  label: string;
  /** nombre de fiches */
  count: number;
  /** nombre de renvois qui sortent vers un autre vault */
  outgoing: number;
  /** nombre de renvois reçus d'un autre vault */
  incoming: number;
}

export interface ProjectEdge {
  id: string;
  from: string;
  to: string;
  /** nombre de renvois croisés */
  weight: number;
  /** quelques codes de fiches pour l'infobulle */
  samples: string[];
}

export interface ProjectGraphModel {
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  /** vaults sans aucun renvoi croisé : présents, mais isolés */
  isolated: string[];
}

/** Identifiant du nœud qui rassemble les fiches sans vault. */
export const LOOSE_NODE = "__loose__";

export function projectGraphModel({
  vaults,
  cards,
  looseCards = [],
  looseLabel = "Fiches sans vault",
}: {
  vaults: ZettelVault[];
  cards: ZettelCard[];
  /** fiches du projet qui ne sont dans aucun vault */
  looseCards?: ZettelCard[];
  looseLabel?: string;
}): ProjectGraphModel {
  const cardsByVault = new Map<string, ZettelCard[]>();
  for (const vault of vaults) {
    cardsByVault.set(
      vault.id,
      cards.filter((card) => card.vaultId === vault.id),
    );
  }

  /* Où vit chaque code ? C'est la seule table dont on a besoin : un renvoi est
     une chaîne, il ne sait pas dans quel vault il pointe. */
  const vaultByCode = new Map<string, string>();
  for (const [vaultId, owned] of cardsByVault) {
    for (const card of owned) vaultByCode.set(card.code, vaultId);
  }
  for (const card of looseCards) vaultByCode.set(card.code, LOOSE_NODE);

  const edges = new Map<string, ProjectEdge>();
  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();

  const pairs: { id: string; owned: ZettelCard[] }[] = [
    ...vaults.map((vault) => ({ id: vault.id, owned: cardsByVault.get(vault.id) ?? [] })),
  ];
  if (looseCards.length > 0) pairs.push({ id: LOOSE_NODE, owned: looseCards });

  for (const { id, owned } of pairs) {
    for (const card of owned) {
      for (const ref of card.refs) {
        const target = vaultByCode.get(ref);
        if (!target || target === id) continue;
        const key = `${id}→${target}`;
        const existing = edges.get(key);
        if (existing) {
          existing.weight += 1;
          if (existing.samples.length < 3) existing.samples.push(card.code);
        } else {
          edges.set(key, {
            id: key,
            from: id,
            to: target,
            weight: 1,
            samples: [card.code],
          });
        }
        outgoing.set(id, (outgoing.get(id) ?? 0) + 1);
        incoming.set(target, (incoming.get(target) ?? 0) + 1);
      }
    }
  }

  const nodes: ProjectNode[] = [
    ...vaults.map((vault) => ({
      id: vault.id,
      kind: "vault" as const,
      label: vault.name,
      count: cardsByVault.get(vault.id)?.length ?? 0,
      outgoing: outgoing.get(vault.id) ?? 0,
      incoming: incoming.get(vault.id) ?? 0,
    })),
  ];
  if (looseCards.length > 0) {
    nodes.push({
      id: LOOSE_NODE,
      kind: "loose",
      label: looseLabel,
      count: looseCards.length,
      outgoing: outgoing.get(LOOSE_NODE) ?? 0,
      incoming: incoming.get(LOOSE_NODE) ?? 0,
    });
  }

  const linked = new Set<string>();
  for (const edge of edges.values()) {
    linked.add(edge.from);
    linked.add(edge.to);
  }

  return {
    nodes,
    edges: [...edges.values()].sort((a, b) => b.weight - a.weight),
    isolated: nodes.filter((node) => !linked.has(node.id)).map((node) => node.id),
  };
}

/**
 * Positions en cercle : avec un nombre de vaults d'un projet (deux à six en
 * pratique), un cercle est plus lisible qu'une colonne et ne force aucun tri
 * arbitraire. Les isolés vont sur un second cercle, plus large, pour qu'on
 * voie justement qu'ils ne touchent personne.
 */
export function projectLayout(
  model: ProjectGraphModel,
  { radius = 220, center = { x: 0, y: 0 } } = {},
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const linked = model.nodes.filter((node) => !model.isolated.includes(node.id));
  const lonely = model.nodes.filter((node) => model.isolated.includes(node.id));

  const place = (
    list: ProjectNode[],
    ring: number,
  ) => {
    list.forEach((node, index) => {
      const angle = (index / Math.max(1, list.length)) * Math.PI * 2 - Math.PI / 2;
      positions.set(node.id, {
        x: Math.round(center.x + Math.cos(angle) * ring),
        y: Math.round(center.y + Math.sin(angle) * ring),
      });
    });
  };

  place(linked, radius);
  place(lonely, radius * 1.6);
  return positions;
}
