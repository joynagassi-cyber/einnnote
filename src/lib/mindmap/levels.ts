import type { TemplateNode } from "@/lib/mindmap/layout";

/**
 * Deux dispositions qui ne s’arrêtent pas à la profondeur 2.
 *
 * Le moteur de cartes mentales (`layout.ts`) suppose des modèles à deux
 * niveaux : c’est ce qui garde les cartes lisibles sur un téléphone, et c’est
 * vérifié par test. Mais un **graphe de fiches** cite en chaîne : cinq niveaux
 * sont banals. Ces deux placements parcourent donc n’importe quelle profondeur
 * et ne perdent jamais de nœud.
 *
 * Coordonnées : coins supérieurs gauches, dans un repère positif, avec les
 * tailles de boîte passées en paramètre (une carte de fiche n’a pas la taille
 * d’un nœud de carte mentale).
 */

export interface LevelNode {
  key: string;
  depth: number;
  text: string;
}

export interface PlacedBox {
  key: string;
  x: number;
  y: number;
  depth: number;
}

export interface BoxSize {
  width: number;
  height: number;
}

/** Niveaux dans l’ordre d’un parcours en largeur (enfants dans l’ordre du modèle). */
export function levelsOf(root: TemplateNode): LevelNode[] {
  const out: LevelNode[] = [];
  const queue: { node: TemplateNode; depth: number; guard: Set<string> }[] = [
    { node: root, depth: 0, guard: new Set([root.key]) },
  ];
  while (queue.length) {
    const { node, depth, guard } = queue.shift()!;
    out.push({ key: node.key, depth, text: node.text });
    for (const child of node.children ?? []) {
      if (guard.has(child.key)) continue; // un cycle ne doit pas boucler
      queue.push({ node: child, depth: depth + 1, guard: new Set([...guard, child.key]) });
    }
  }
  return out;
}

/** Une colonne par niveau, chaque colonne centrée verticalement. */
export function placeColumns(
  root: TemplateNode,
  size: BoxSize,
  gap = { x: 88, y: 26 },
): PlacedBox[] {
  const byDepth = new Map<number, string[]>();
  for (const level of levelsOf(root)) {
    const list = byDepth.get(level.depth) ?? [];
    list.push(level.key);
    byDepth.set(level.depth, list);
  }
  const tallest = Math.max(...[...byDepth.values()].map((list) => list.length));
  const fullHeight = tallest * (size.height + gap.y) - gap.y;
  const out: PlacedBox[] = [];
  for (const [depth, keys] of byDepth) {
    const height = keys.length * (size.height + gap.y) - gap.y;
    const top = (fullHeight - height) / 2;
    keys.forEach((key, index) => {
      out.push({
        key,
        x: depth * (size.width + gap.x),
        y: top + index * (size.height + gap.y),
        depth,
      });
    });
  }
  return out;
}

/** Frise : lecture de gauche à droite, chaque niveau un cran plus bas. */
export function placeFrieze(
  root: TemplateNode,
  size: BoxSize,
  gap = { x: 56, y: 70 },
): PlacedBox[] {
  return levelsOf(root).map((level, index) => ({
    key: level.key,
    x: index * (size.width + gap.x),
    y: level.depth * (size.height + gap.y),
    depth: level.depth,
  }));
}
