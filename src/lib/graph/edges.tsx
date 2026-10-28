import { BaseEdge, useInternalNode, type EdgeProps, type InternalNode } from "@xyflow/react";
import {
  floatingCurve,
  floatingParams,
  ribbonPath,
  stepPath,
  type Box,
} from "@/lib/graph/floating";
import type { GraphEdgeKind } from "@/lib/graph/styles";

/**
 * L’arête unique du graphe — une seule implémentation, cinq dessins.
 *
 * Pourquoi un seul composant : les arêtes intégrées de React Flow partent d’une
 * poignée fixe. Nos nœuds ont des tailles très différentes (racine 208 × 84,
 * cartes identiques mais mesurées par le navigateur) et aucune poignée visible.
 * Une arête doit donc calculer son point d’accroche sur le bord réel, à chaque
 * déplacement — et si elle sait le faire, elle sait aussi porter une
 * **étiquette de relation** sur son propre chemin.
 *
 * Étiquette : `<text><textPath href="#id">`, idée reprise de
 * `Flow_renderer_test` (`FlowComponents/CustomEdge/index.js`), qui pose un
 * texte au milieu du chemin via `startOffset="50%"`. Deux corrections :
 * le texte reçoit un liseré (`paint-order: stroke`) pour rester lisible
 * au-dessus du trait, et il est déduit des données au lieu d’être le
 * « connection line text » codé en dur de l’exemple.
 */

export interface EinnoteEdgeData extends Record<string, unknown> {
  kind: GraphEdgeKind;
  label?: string;
  echo?: boolean;
  labels?: boolean;
  animate?: boolean;
  weight?: number;
  dashed?: boolean;
}

function boxOf(node: InternalNode | undefined, fallbackWidth: number, fallbackHeight: number): Box | null {
  if (!node) return null;
  const position = node.internals?.positionAbsolute ?? node.position;
  const width = node.measured?.width ?? fallbackWidth;
  const height = node.measured?.height ?? fallbackHeight;
  return { x: position.x, y: position.y, width, height };
}

/** Construit le chemin selon la famille de trait du style. */
export function pathFor(kind: GraphEdgeKind, from: Box, to: Box, weight = 2): string {
  const params = floatingParams(from, to);
  switch (kind) {
    case "floating":
      return floatingCurve(params, 0.42);
    case "tapered":
      return ribbonPath(params, { startWidth: weight * 3, endWidth: 1.2, curve: 0.16 });
    case "smoothstep":
      return stepPath(params, 12);
    case "straight":
      return `M ${params.sx} ${params.sy} L ${params.tx} ${params.ty}`;
    default: {
      const midX = (params.sx + params.tx) / 2;
      return `M ${params.sx} ${params.sy} Q ${midX} ${params.sy} ${midX} ${
        (params.sy + params.ty) / 2
      } T ${params.tx} ${params.ty}`;
    }
  }
}

export function EinnoteEdge({ id, source, target, data, style, markerEnd }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const a = boxOf(sourceNode, 150, 60);
  const b = boxOf(targetNode, 150, 60);
  if (!a || !b) return null;

  const config = (data ?? {}) as EinnoteEdgeData;
  const kind = config.kind ?? "floating";
  const echo = Boolean(config.echo);
  const weight = config.weight ?? 2;
  const path = pathFor(kind, a, b, weight);
  const color = (style?.stroke as string) ?? "var(--accent)";
  const showLabel = Boolean(config.labels) && Boolean(config.label) && !echo;
  const animate = Boolean(config.animate);
  /* Motif de tirets : 14 px de période dans tous les cas animés, pour que
     `stroke-dashoffset: -28` (deux périodes) boucle sans saut visible. */
  const dash = animate
    ? echo
      ? "6 8"
      : "7 7"
    : echo
      ? "4 5"
      : config.dashed
        ? "6 4"
        : undefined;

  const animation = animate
    ? { animation: "engram-flow 1.2s linear infinite" }
    : undefined;

  return (
    <>
      {kind === "tapered" ? (
        <path
          id={id}
          className="react-flow__edge-path"
          d={path}
          /* style inline : la feuille de React Flow force `fill: none` sur
             `.react-flow__edge-path`, et une règle CSS gagne contre un attribut
             de présentation SVG. */
          style={{ fill: color, stroke: "none", opacity: echo ? 0.42 : 0.8 }}
        />
      ) : (
        <BaseEdge
          id={id}
          path={path}
          markerEnd={markerEnd}
          interactionWidth={18}
          style={{
            ...style,
            strokeWidth: echo ? Math.max(1, weight * 0.7) : weight,
            opacity: echo ? 0.4 : 1,
            strokeDasharray: dash,
            ...animation,
            ...(animation ? { strokeDashoffset: 0 } : {}),
          }}
        />
      )}

      {showLabel && (
        <text
          className="pointer-events-none select-none"
          style={{ fontSize: 10.5, fill: "var(--muted)", fontWeight: 600 }}
          aria-hidden="true"
        >
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            <tspan
              style={{
                paintOrder: "stroke",
                stroke: "var(--bg)",
                strokeWidth: 4,
                strokeLinejoin: "round",
              }}
            >
              {config.label}
            </tspan>
          </textPath>
        </text>
      )}
    </>
  );
}

export const GRAPH_EDGE_TYPES = {
  engram: EinnoteEdge,
} as const;
