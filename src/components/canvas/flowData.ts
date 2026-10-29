import type { Edge, Node } from "@xyflow/react";
import type { EdgeStyle, MindMap as MindMapType, MindNode } from "@/types";
import type { MindDirection } from "@/stores/useContentStore";
import { edgeLook } from "@/lib/graph/paint";
import type { GraphEdgeKind, GraphStyle } from "@/lib/graph/styles";

/**
 * Les **données** d’une carte mentale : types, tailles, et conversion vers le
 * graphe.
 *
 * Séparé du composant qui dessine la forme pour deux raisons. L’outillage de
 * rafraîchissement de Vite exige qu’un fichier ne mélange pas composants et
 * fonctions ; et surtout, ce fichier-ci est du calcul pur — il se lit et se
 * vérifie sans navigateur.
 */

export type FlowNodeData = {
  text: string;
  shape: MindNode["shape"];
  root: boolean;
  depth: number;
  sel: boolean;
  paint: MindNode["paint"];
  /** taille effective, en coordonnées du canevas */
  w: number;
  h: number;
  /** position actuelle : le redimensionnement par le bord gauche doit la bouger */
  pos: { x: number; y: number };
  onAdd: (id: string, direction: MindDirection) => void;
  onOpen: (id: string) => void;
  /** appelé pendant le glissement d’un coin, à chaque pas */
  onResize: (
    id: string,
    size: { x: number; y: number; w: number; h: number },
  ) => void;
};

/** Les bornes d’une forme redimensionnée : en deçà, le texte n’existe plus. */
export const MIN_SIZE = { w: 64, h: 36 } as const;
export const MAX_SIZE = { w: 520, h: 360 } as const;

/** Ramène une dimension dans ses bornes, en entier. */
export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

/** La taille « naturelle » d’une forme, quand personne ne l’a redimensionnée. */
function naturalSize(shape: MindNode["shape"], depth: number) {
  if (depth === 0) return { w: 112, h: 112 };
  if (shape === "circle") return { w: 80, h: 80 };
  if (shape === "square") return { w: 80, h: 80 };
  if (shape === "diamond") return { w: 124, h: 64 };
  if (shape === "pill") return { w: 148, h: 48 };
  if (shape === "hex") return { w: 136, h: 108 };
  return { w: depth === 1 ? 136 : 120, h: depth === 1 ? 52 : 44 };
}

/**
 * La taille réelle d’un nœud.
 *
 * Elle sert à deux choses qui doivent **impérativement** s’accorder : dessiner
 * la forme et choisir par quel côté un trait l’atteint. Deux calculs différents
 * donneraient des flèches qui s’arrêtent à quelques pixels du bord, ou qui
 * entrent dedans — c’est exactement ce qui arrive quand on redimensionne sans
 * mettre à jour l’accroche.
 */
export function nodeSize(
  shape: MindNode["shape"],
  depth: number,
  custom?: { w?: number; h?: number },
) {
  const base = naturalSize(shape, depth);
  return {
    w: clamp(custom?.w ?? base.w, MIN_SIZE.w, MAX_SIZE.w),
    h: clamp(custom?.h ?? base.h, MIN_SIZE.h, MAX_SIZE.h),
  };
}

type Side = "top" | "right" | "bottom" | "left";

function sidesFor(
  from: { x: number; y: number; w: number; h: number },
  to: { x: number; y: number; w: number; h: number },
): { source: Side; target: Side } {
  const dx = to.x + to.w / 2 - (from.x + from.w / 2);
  const dy = to.y + to.h / 2 - (from.y + from.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { source: "right", target: "left" }
      : { source: "left", target: "right" };
  }
  return dy >= 0
    ? { source: "bottom", target: "top" }
    : { source: "top", target: "bottom" };
}
export type FlowNode = Node<FlowNodeData, "engram">;

/** Les arêtes choisissent leur côté : les poignées ne doivent pas se voir. */
export const HIDDEN = { opacity: 0, width: 6, height: 6 } as const;

/** Dessin du trait quand aucun style de graphe n’est choisi sur la carte. */
const EDGE_KIND: Record<EdgeStyle, GraphEdgeKind> = {
  curved: "bezier",
  step: "smoothstep",
  straight: "straight",
};

/**
 * Toutes les arêtes de la carte passent par `EinnoteEdge` : un seul composant
 * sait dessiner les cinq familles de trait et accrocher le trait au bord réel
 * des nœuds. Les types intégrés de React Flow ne connaissent que des poignées
 * fixes, ce qui faisait disparaître les liens dès qu’un nœud changeait de
 * forme.
 */
function edgeKindFor(style: GraphStyle | null, fallback: EdgeStyle): GraphEdgeKind {
  return style ? style.edge : EDGE_KIND[fallback];
}

export function toFlow(map: MindMapType, handlers: {
  onAdd: (id: string, direction: MindDirection) => void;
  onOpen: (id: string) => void;
  onResize: (id: string, size: { x: number; y: number; w: number; h: number }) => void;
}, selId: string | null = null, style: GraphStyle | null = null): { nodes: FlowNode[]; edges: Edge[] } {
  const depthOfNode = new Map<string, number>();
  const byId = new Map(map.nodes.map((node) => [node.id, node]));
  const walkDepth = (node: MindNode, guard = new Set<string>()): number => {
    if (!node.parentId || guard.has(node.id)) return 0;
    const known = depthOfNode.get(node.id);
    if (known !== undefined) return known;
    guard.add(node.id);
    const parent = byId.get(node.parentId);
    const depth = parent ? walkDepth(parent, guard) + 1 : 0;
    depthOfNode.set(node.id, depth);
    return depth;
  };
  map.nodes.forEach((node) => walkDepth(node));

  return {
    nodes: map.nodes.map((node) => {
      const depth = depthOfNode.get(node.id) ?? 0;
      const size = nodeSize(node.shape, depth, node);
      return {
        id: node.id,
        type: "engram" as const,
        position: { x: node.x, y: node.y },
        data: {
          text: node.text,
          shape: node.shape,
          root: !node.parentId,
          depth,
          sel: node.id === selId,
          paint: node.paint,
          w: size.w,
          h: size.h,
          pos: { x: node.x, y: node.y },
          onAdd: handlers.onAdd,
          onOpen: handlers.onOpen,
          onResize: handlers.onResize,
        },
      };
    }),
    edges: map.edges.map((edge) => {
      const from = byId.get(edge.source);
      const to = byId.get(edge.target);
      let handles: { sourceHandle?: string; targetHandle?: string } = {};
      if (from && to) {
        const fromDepth = depthOfNode.get(from.id) ?? 0;
        const toDepth = depthOfNode.get(to.id) ?? 0;
        const a = { x: from.x, y: from.y, ...nodeSize(from.shape, fromDepth, from) };
        const b = { x: to.x, y: to.y, ...nodeSize(to.shape, toDepth, to) };
        const sides = sidesFor(a, b);
        handles = {
          sourceHandle: `s-${sides.source}`,
          targetHandle: `t-${sides.target}`,
        };
      }
      const look = edgeLook(edge, {
        width: style?.weight ?? 2.5,
        dashed: Boolean(style?.dashed),
        arrow: style ? Boolean(style.arrow) : map.edgeStyle === "step",
      });
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...handles,
        type: "engram",
        /* Le trait porte son habillage dans `data` : le composant d’arête s’en
           sert pour la couleur, l’épaisseur et le pointillé. Sans cela, un
           trait personnalisé reviendrait à l’accent au premier rendu. */
        style: {
          stroke: look.color,
          strokeWidth: look.width,
          strokeDasharray: look.dashed ? "6 5" : undefined,
        },
        data: {
          kind: edgeKindFor(style, map.edgeStyle),
          echo: false,
          weight: look.width,
          dashed: look.dashed,
          color: look.color,
          arrow: look.arrow,
        },
      };
    }),
  };
}

