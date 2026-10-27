import {
  floatingCurve,
  floatingParams,
  ribbonPath,
  stepPath,
  type Box,
  type FloatingParams,
} from "@/lib/graph/floating";

/**
 * Styles de graphe — la **présentation**, séparée de la **structure**.
 *
 * Le dépôt avait déjà 14 modèles de cartes mentales : chacun encode une
 * *manière de penser* (Ishikawa, Toulmin, Bloom). Un style encode autre chose :
 * la manière de **dessiner**. Les deux axes sont indépendants, et c’est ce qui
 * permet d’avoir 14 structures × 12 styles sans écrire 168 modèles.
 *
 * Provenance : chaque style vient d’un exemple réel de React Flow, lu dans
 * `xyflow/xyflow` (voir `docs/GRAPH.md` § 2 pour le tri des 66 exemples et
 * pourquoi les autres n’ont pas été retenus).
 */

export type GraphEdgeKind =
  | "floating"
  | "bezier"
  | "smoothstep"
  | "straight"
  | "tapered";

export type GraphLayoutKind =
  | "tree-lr"
  | "tree-tb"
  | "tree-both"
  | "radial"
  | "columns"
  | "timeline";

export type GraphBackground = "dots" | "lines" | "cross" | "none";

/** `zettel` = le style a besoin du graphe de fiches (arbre binaire). */
export type GraphScope = "both" | "zettel";

export interface GraphStyle {
  id: string;
  label: string;
  /** ce que le style fait au dessin, en une phrase */
  hint: string;
  /** exemple React Flow dont le style est tiré */
  origin: string;
  layout: GraphLayoutKind;
  edge: GraphEdgeKind;
  dashed?: boolean;
  arrow?: boolean;
  background: GraphBackground;
  scope: GraphScope;
  /** épaisseur du trait : les styles fins restent lisibles à 40 nœuds */
  weight?: number;
}

export const GRAPH_STYLES: GraphStyle[] = [
  {
    id: "arbre-binaire",
    label: "Arbre binaire",
    hint: "Racine au centre, branches à gauche et à droite : la lecture d’un plan.",
    origin: "FloatingEdges · utils.ts",
    layout: "tree-both",
    edge: "floating",
    background: "dots",
    scope: "zettel",
    weight: 2.2,
  },
  {
    id: "souffle",
    label: "Souffle",
    hint: "Arbre horizontal, courbes qui frôlent les bords sans jamais les traverser.",
    origin: "FloatingEdges · FloatingEdge.tsx",
    layout: "tree-lr",
    edge: "floating",
    background: "dots",
    scope: "both",
    weight: 2.4,
  },
  {
    id: "reseau",
    label: "Réseau",
    hint: "Radial : la carte au centre, les idées autour, liens flottants.",
    origin: "FloatingEdges · utils.ts",
    layout: "radial",
    edge: "floating",
    background: "cross",
    scope: "both",
    weight: 2,
  },
  {
    id: "flux",
    label: "Flux",
    hint: "Angles arrondis et flèches : on lit un enchaînement, pas une hiérarchie.",
    origin: "EdgeRouting · index.tsx",
    layout: "tree-lr",
    edge: "smoothstep",
    arrow: true,
    background: "lines",
    scope: "both",
    weight: 2,
  },
  {
    id: "circuit",
    label: "Circuit",
    hint: "Équerres franches, flèches pleines : diagramme technique assumé.",
    origin: "EdgeTypes · index.tsx",
    layout: "tree-lr",
    edge: "smoothstep",
    arrow: true,
    background: "dots",
    scope: "both",
    weight: 1.8,
  },
  {
    id: "direct",
    label: "Direct",
    hint: "Segments droits, aucune décoration : le plus rapide à balayer.",
    origin: "EdgeTypes · index.tsx (straight)",
    layout: "tree-tb",
    edge: "straight",
    arrow: true,
    background: "none",
    scope: "both",
    weight: 2,
  },
  {
    id: "plume",
    label: "Plume",
    hint: "Branches qui s’effilent : une calligraphie, pas un organigramme.",
    origin: "FloatingEdges + ruban (calcul maison)",
    layout: "tree-lr",
    edge: "tapered",
    background: "dots",
    scope: "both",
  },
  {
    id: "pointille",
    label: "Pointillé",
    hint: "Courbes légères, tirets : parfait quand tout le graphe est un renvoi.",
    origin: "DefaultEdgeOverwrite · index.tsx",
    layout: "tree-lr",
    edge: "bezier",
    dashed: true,
    background: "none",
    scope: "both",
    weight: 1.8,
  },
  {
    id: "colonnes",
    label: "Colonnes",
    hint: "Une colonne par branche : on compare des familles, on ne hiérarchise pas.",
    origin: "Layouting · layouting (dagre)",
    layout: "columns",
    edge: "smoothstep",
    background: "lines",
    scope: "both",
    weight: 2,
  },
  {
    id: "frise",
    label: "Frise",
    hint: "Lecture de gauche à droite, liens directs : une chronologie de fiches.",
    origin: "EdgeTypes · straight",
    layout: "timeline",
    edge: "straight",
    background: "dots",
    scope: "both",
    weight: 2.2,
  },
  {
    id: "constellation",
    label: "Constellation",
    hint: "Radial, traits fins et croix de repère : beaucoup de fiches, peu de bruit.",
    origin: "Backgrounds · index.tsx (cross)",
    layout: "radial",
    edge: "straight",
    background: "cross",
    scope: "both",
    weight: 1.4,
  },
  {
    id: "encre",
    label: "Encre",
    hint: "Arbre vertical, rubans effilés : la page d’un livre, en haut vers le bas.",
    origin: "FloatingEdges + ruban (calcul maison)",
    layout: "tree-tb",
    edge: "tapered",
    background: "none",
    scope: "both",
  },
];

export const DEFAULT_GRAPH_STYLE = "arbre-binaire";

export function graphStyleById(id: string | null | undefined): GraphStyle {
  return (
    GRAPH_STYLES.find((style) => style.id === id) ??
    GRAPH_STYLES.find((style) => style.id === DEFAULT_GRAPH_STYLE)!
  );
}

export function graphStylesFor(scope: "mindmap" | "zettel"): GraphStyle[] {
  if (scope === "zettel") return GRAPH_STYLES;
  return GRAPH_STYLES.filter((style) => style.scope !== "zettel");
}

/* ------------------------------------------------------------------ */
/* Vignettes calculées                                                 */
/* ------------------------------------------------------------------ */

const PREVIEW_NODES = ["r", "a", "a1", "a2", "b", "b1", "c"] as const;
type PreviewKey = (typeof PREVIEW_NODES)[number];

const PREVIEW_PARENTS: Record<PreviewKey, PreviewKey | null> = {
  r: null,
  a: "r",
  a1: "a",
  a2: "a",
  b: "r",
  b1: "b",
  c: "r",
};

const PREVIEW_SIDE = 56;
const PREVIEW_HEIGHT = 24;

/** Centres des sept nœuds de la vignette, par disposition. */
function previewCenters(layout: GraphLayoutKind): Record<PreviewKey, { x: number; y: number }> {
  switch (layout) {
    case "tree-both":
      return {
        r: { x: 0, y: 0 },
        a: { x: 132, y: -58 },
        a1: { x: 258, y: -86 },
        a2: { x: 258, y: -30 },
        b: { x: 132, y: 58 },
        b1: { x: 258, y: 86 },
        c: { x: -132, y: 0 },
      };
    case "tree-tb":
      return {
        r: { x: 0, y: -70 },
        a: { x: -124, y: 20 },
        a1: { x: -178, y: 104 },
        a2: { x: -70, y: 104 },
        b: { x: 0, y: 20 },
        b1: { x: 0, y: 104 },
        c: { x: 124, y: 20 },
      };
    case "radial": {
      const radius = 118;
      const angles = [-90, -30, 30, 90, 150, 210];
      const around = Object.fromEntries(
        angles.map((angle, index) => {
          const radians = (angle * Math.PI) / 180;
          return [
            ["a", "a1", "a2", "b", "b1", "c"][index],
            { x: Math.cos(radians) * radius, y: Math.sin(radians) * radius },
          ];
        }),
      ) as Record<PreviewKey, { x: number; y: number }>;
      return { r: { x: 0, y: 0 }, ...around };
    }
    case "columns":
      return {
        r: { x: 0, y: -92 },
        a: { x: -132, y: -8 },
        b: { x: 0, y: -8 },
        c: { x: 132, y: -8 },
        a1: { x: -132, y: 70 },
        a2: { x: -132, y: 132 },
        b1: { x: 0, y: 70 },
      };
    case "timeline":
      return {
        r: { x: -186, y: 0 },
        a: { x: -62, y: -44 },
        a1: { x: -62, y: 44 },
        a2: { x: -62, y: 100 },
        b: { x: 62, y: -44 },
        b1: { x: 62, y: 44 },
        c: { x: 186, y: 0 },
      };
    default:
      return {
        r: { x: 0, y: 0 },
        a: { x: 132, y: -62 },
        a1: { x: 258, y: -92 },
        a2: { x: 258, y: -32 },
        b: { x: 132, y: 8 },
        b1: { x: 258, y: 46 },
        c: { x: 132, y: 78 },
      };
  }
}

export interface PreviewNode {
  key: string;
  x: number;
  y: number;
  root: boolean;
  width: number;
  height: number;
}

export interface PreviewEdge {
  key: string;
  d: string;
  /** renvoi (lien en plus de l’arbre) : dessiné plus fin */
  echo?: boolean;
}

export interface GraphStylePreview {
  nodes: PreviewNode[];
  /** chemins exprimés dans le repère d’origine : le composant les translate */
  edges: PreviewEdge[];
  offset: { x: number; y: number };
  width: number;
  height: number;
}

function edgePath(style: GraphStyle, from: Box, to: Box, echo: boolean): string {
  const params: FloatingParams = floatingParams(from, to);
  switch (style.edge) {
    case "floating":
      return floatingCurve(params, echo ? 0.32 : 0.42);
    case "tapered":
      return ribbonPath(params, {
        startWidth: echo ? 3 : 7,
        endWidth: 1.2,
        curve: 0.16,
      });
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

/**
 * Silhouette d’un style : sept nœuds, les vrais calculs de courbe, une échelle
 * réduite. Ce n’est pas une capture d’écran et ce n’est pas non plus un dessin
 * à la main : les liens sont produits par les mêmes fonctions que le canevas.
 */
export function graphStylePreview(style: GraphStyle): GraphStylePreview {
  const centers = previewCenters(style.layout);
  const nodes: PreviewNode[] = PREVIEW_NODES.map((key) => {
    const center = centers[key];
    return {
      key,
      x: center.x - PREVIEW_SIDE / 2,
      y: center.y - PREVIEW_HEIGHT / 2,
      width: PREVIEW_SIDE,
      height: PREVIEW_HEIGHT,
      root: key === "r",
    };
  });
  const boxOf = (key: PreviewKey): Box => {
    const node = nodes.find((item) => item.key === key)!;
    return { x: node.x, y: node.y, width: node.width, height: node.height };
  };

  const edges: PreviewEdge[] = [];
  for (const key of PREVIEW_NODES) {
    const parent = PREVIEW_PARENTS[key];
    if (!parent) continue;
    edges.push({
      key: `${parent}-${key}`,
      d: edgePath(style, boxOf(parent), boxOf(key), false),
    });
  }
  // un renvoi, pour montrer comment un lien hors arbre se dessine
  edges.push({
    key: "echo-a2-b1",
    d: edgePath(style, boxOf("a2"), boxOf("b1"), true),
    echo: true,
  });

  const minX = Math.min(...nodes.map((node) => node.x)) - 18;
  const minY = Math.min(...nodes.map((node) => node.y)) - 18;
  const maxX = Math.max(...nodes.map((node) => node.x + node.width)) + 18;
  const maxY = Math.max(...nodes.map((node) => node.y + node.height)) + 18;

  return {
    nodes: nodes.map((node) => ({ ...node, x: node.x - minX, y: node.y - minY })),
    edges,
    offset: { x: minX, y: minY },
    width: maxX - minX,
    height: maxY - minY,
  };
}
