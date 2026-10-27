import type { MindMap, MindNode } from "@/types";
import { layoutMindmap, type TemplateNode } from "@/lib/mindmap/layout";
import { placeColumns, placeFrieze } from "@/lib/mindmap/levels";
import type { GraphLayoutKind, GraphStyle } from "@/lib/graph/styles";

/**
 * Appliquer un style à une carte mentale existante.
 *
 * Une carte porte du texte et des formes écrites par la personne qui l’a
 * remplie : un style ne doit jamais y toucher. Il ne peut changer que deux
 * choses — **où** sont les nœuds (disposition) et **comment** les liens sont
 * dessinés. C’est pourquoi cette fonction ne prend que des nœuds et rend des
 * nœuds, sans jamais renommer ni supprimer.
 */

/** Convertit les nœuds stockés en arbre de disposition (garde tout le texte). */
function specFromNodes(nodes: MindNode[]): TemplateNode | null {
  const childrenOf = new Map<string | undefined, MindNode[]>();
  for (const node of nodes) {
    const list = childrenOf.get(node.parentId) ?? [];
    list.push(node);
    childrenOf.set(node.parentId, list);
  }
  const root = nodes.find((node) => !node.parentId);
  if (!root) return null;
  const build = (node: MindNode, seen = new Set<string>()): TemplateNode => {
    if (seen.has(node.id)) return { key: node.id, text: node.text, shape: node.shape };
    seen.add(node.id);
    return {
      key: node.id,
      text: node.text,
      shape: node.shape,
      children: (childrenOf.get(node.id) ?? []).map((child) => build(child, seen)),
    };
  };
  return build(root);
}

/**
 * Recalcule les positions selon la disposition du style. Les nœuds qui ne sont
 * pas atteignables depuis la racine (données anciennes, branche orpheline)
 * gardent leurs coordonnées : mieux vaut un nœud mal placé qu’un nœud perdu.
 */
export function relayoutMindmap(
  map: Pick<MindMap, "nodes">,
  layout: GraphLayoutKind,
): MindNode[] {
  const spec = specFromNodes(map.nodes);
  if (!spec) return map.nodes;

  /* Colonnes et frise ne passent pas par le moteur : il s’arrête au niveau 2
     (les modèles de cartes mentales n’ont que deux niveaux, mais une carte
     construite à la main peut être plus profonde, et ses nœuds ne doivent pas
     se retrouver empilés les uns sur les autres). */
  let byId: Map<string, { x: number; y: number }>;
  if (layout === "columns" || layout === "timeline") {
    const size = { width: 150, height: 96 };
    const boxes =
      layout === "columns"
        ? placeColumns(spec, size, { x: 90, y: 40 })
        : placeFrieze(spec, size, { x: 60, y: 90 });
    byId = new Map(boxes.map((box) => [box.key, { x: box.x, y: box.y }]));
  } else {
    const kind = layout === "tree-tb" ? "tree-tb" : layout === "radial" ? "radial" : "tree-lr";
    const placed = layoutMindmap(spec, kind);
    byId = new Map(placed.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
  }

  return map.nodes.map((node) => {
    const position = byId.get(node.id);
    return position ? { ...node, x: position.x, y: position.y } : node;
  });
}

/** Le style change-t-il les positions ? (une disposition, oui ; un trait, non) */
export function styleMovesNodes(style: GraphStyle, current?: GraphLayoutKind): boolean {
  return style.layout !== (current ?? "tree-lr");
}
