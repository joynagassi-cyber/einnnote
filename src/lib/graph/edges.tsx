import { BaseEdge, useInternalNode, type EdgeProps, type InternalNode } from "@xyflow/react";
import {
  floatingCurve,
  floatingParams,
  ribbonPath,
  stepPath,
  type Box,
} from "@/lib/graph/floating";
import type { GraphEdgeKind } from "@/lib/graph/styles";
import type { Point, Side } from "@/lib/graph/floating";

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
  /** habillage explicite d’un trait ; absent = accent du thème */
  color?: string;
  /** forme de la pointe ; `none` = trait nu */
  arrow?: "none" | "arrow" | "triangle" | "circle" | "diamond" | "bar";
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
  const tip = edgeTip(kind, a, b);
  const color = config.color ?? (style?.stroke as string) ?? "var(--accent)";
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

      {/* La pointe est dessinée ici, jamais par `markerEnd` : React Flow ne
          fournirait qu’une flèche. */}
      {!echo && arrowhead(config.arrow ?? "none", tip, color)}

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

/** En deçà de cette longueur, une pointe ne dit plus rien : elle devient une tache. */
const POINT_LENGTH = 13;

const round = (value: number) => Math.round(value * 100) / 100;

const INWARD: Record<Side, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

/**
 * Où le trait arrive, et dans quelle direction il arrive.
 *
 * Les courbes flottantes et les traits en escalier touchent la forme
 * perpendiculairement à leur côté : leur tangente est donc la normale du côté
 * visé, pas la droite entre les deux centres. Sans cette distinction, la pointe
 * d’une arête verticale partirait de travers.
 */
function edgeTip(kind: GraphEdgeKind, from: Box, to: Box): { end: Point; dir: Point } {
  const p = floatingParams(from, to);
  const dir =
    kind === "straight" || kind === "bezier"
      ? { x: p.tx - p.sx, y: p.ty - p.sy }
      : INWARD[p.targetSide];
  return { end: { x: p.tx, y: p.ty }, dir };
}

/**
 * Les six pointes.
 *
 * React Flow n’en connaît que deux (flèche ouverte, flèche fermée) et une seule
 * longueur. Or une carte mentale se lit aussi à la pointe : le cercle marque une
 * appartenance, le losange une décision, la barre une fin de relation. On les
 * dessine donc ici, orientés sur la tangente réelle du chemin, pour qu’ils
 * suivent les courbes au lieu de flotter.
 */
function arrowhead(
  shape: NonNullable<EinnoteEdgeData["arrow"]>,
  tipAt: { end: Point; dir: Point },
  color: string,
) {
  const { end, dir } = tipAt;
  const angle = Math.atan2(dir.y, dir.x);
  const tip = `translate(${round(end.x)}, ${round(end.y)}) rotate(${round((angle * 180) / Math.PI)})`;
  const L = POINT_LENGTH;
  const half = L * 0.42;
  const head = L * 0.9;

  switch (shape) {
    case "none":
      return null;
    case "arrow":
      return (
        <path
          d={`M ${-L} ${-half} L 0 0 L ${-L} ${half}`}
          transform={tip}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "triangle":
      return (
        <path
          d={`M 0 0 L ${-L} ${-half} L ${-L} ${half} Z`}
          transform={tip}
          fill={color}
        />
      );
    case "circle":
      return (
        <circle
          cx={-head * 0.5}
          cy={0}
          r={Math.max(4, L * 0.4)}
          transform={tip}
          fill={color}
        />
      );
    case "diamond":
      return (
        <path
          d={`M 0 0 L ${-half} ${-half} L ${-L} 0 L ${-half} ${half} Z`}
          transform={tip}
          fill={color}
        />
      );
    default:
      return (
        <path
          d={`M 0 ${-half - 1} L 0 ${half + 1}`}
          transform={tip}
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      );
  }
}

export const GRAPH_EDGE_TYPES = {
  engram: EinnoteEdge,
} as const;
