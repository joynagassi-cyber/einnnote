import { BaseEdge, useInternalNode, type EdgeProps, type InternalNode } from "@xyflow/react";
import {
  floatingCurve,
  floatingParams,
  ribbonPath,
  type Box,
} from "@/lib/graph/floating";

/**
 * Composants d’arête maison.
 *
 * Pourquoi des arêtes custom plutôt que les types intégrés : nos nœuds ont des
 * tailles très différentes (une racine de 112 px, une carte de fiche de 208 ×
 * 84) et aucune poignée visible. Les arêtes intégrées partent d’une poignée
 * fixe ; celles-ci calculent leur point d’accroche sur le **bord réel** de
 * chaque nœud, à chaque déplacement.
 */

function boxOf(node: InternalNode | undefined, fallbackWidth: number, fallbackHeight: number): Box | null {
  if (!node) return null;
  const position = node.internals?.positionAbsolute ?? node.position;
  const width = node.measured?.width ?? fallbackWidth;
  const height = node.measured?.height ?? fallbackHeight;
  return { x: position.x, y: position.y, width, height };
}

/** Arc organique entre les deux bords les plus proches. */
export function FloatingEdge({ id, source, target, style, markerEnd }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const a = boxOf(sourceNode, 150, 60);
  const b = boxOf(targetNode, 150, 60);
  if (!a || !b) return null;

  const params = floatingParams(a, b);
  return (
    <BaseEdge
      id={id}
      path={floatingCurve(params)}
      markerEnd={markerEnd}
      style={style}
      interactionWidth={18}
    />
  );
}

/** Branche qui s’effile : forme pleine, donc l’épaisseur porte le sens. */
export function TaperedEdge({ id, source, target, style, data }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const a = boxOf(sourceNode, 150, 60);
  const b = boxOf(targetNode, 150, 60);
  if (!a || !b) return null;

  const echo = Boolean((data as { echo?: boolean } | undefined)?.echo);
  const params = floatingParams(a, b);
  const path = ribbonPath(params, {
    startWidth: echo ? 3.4 : 7,
    endWidth: 1.2,
    curve: echo ? 0.1 : 0.16,
  });
  const color = (style?.stroke as string) ?? "var(--accent)";

  return (
    <g>
      <path
        id={id}
        className="react-flow__edge-path"
        d={path}
        /* style inline, et pas l’attribut `fill` : la feuille de style de React
           Flow force `fill: none` sur `.react-flow__edge-path`, et une règle CSS
           gagne toujours contre un attribut de présentation SVG. */
        style={{ fill: color, stroke: "none", opacity: echo ? 0.45 : 0.9 }}
      />
    </g>
  );
}

export const GRAPH_EDGE_TYPES = {
  floating: FloatingEdge,
  tapered: TaperedEdge,
} as const;
