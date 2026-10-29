import { Handle, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import type { EdgeStyle, MindMap as MindMapType, MindNode } from "@/types";
import type { MindDirection } from "@/stores/useContentStore";
import { edgeLook, nodeLook, textureBackground } from "@/lib/graph/paint";
import type { GraphEdgeKind, GraphStyle } from "@/lib/graph/styles";
import { cn } from "@/lib/utils";

/**
 * Le dessin d’une carte mentale : la conversion des nœuds en graphe, et la
 * forme elle-même.
 *
 * Ce fichier existe pour être partagé par **deux** surfaces : la page Carte
 * mentale (qui y ajoute sa barre, ses styles, ses modèles, sa mini-carte) et le
 * tableau blanc, qui pose la même planche à côté du texte. Une seule
 * implémentation du nœud, donc : un habillage choisi dans l’une se voit dans
 * l’autre, à l’identique.
 */

export type FlowNodeData = {
  text: string;
  shape: MindNode["shape"];
  root: boolean;
  depth: number;
  sel: boolean;
  paint: MindNode["paint"];
  onAdd: (id: string, direction: MindDirection) => void;
  onOpen: (id: string) => void;
};

/* Taille approchée d’un nœud : sert à choisir par quel côté l’arête entre et
   sort, comme le font les exemples « floating edges » de React Flow. Sans cela,
   une carte radiale dessine des boucles qui passent sous les nœuds. */
function nodeSize(shape: MindNode["shape"], depth: number) {
  if (depth === 0) return { w: 112, h: 112 };
  if (shape === "circle") return { w: 80, h: 80 };
  if (shape === "square") return { w: 80, h: 80 };
  if (shape === "diamond") return { w: 124, h: 64 };
  if (shape === "pill") return { w: 148, h: 48 };
  if (shape === "hex") return { w: 136, h: 108 };
  return { w: depth === 1 ? 136 : 120, h: depth === 1 ? 52 : 44 };
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
const HIDDEN = { opacity: 0, width: 6, height: 6 } as const;

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
    nodes: map.nodes.map((node) => ({
      id: node.id,
      type: "engram" as const,
      position: { x: node.x, y: node.y },
      data: {
        text: node.text,
        shape: node.shape,
        root: !node.parentId,
        depth: depthOfNode.get(node.id) ?? 0,
        sel: node.id === selId,
        paint: node.paint,
        onAdd: handlers.onAdd,
        onOpen: handlers.onOpen,
      },
    })),
    edges: map.edges.map((edge) => {
      const from = byId.get(edge.source);
      const to = byId.get(edge.target);
      let handles: { sourceHandle?: string; targetHandle?: string } = {};
      if (from && to) {
        const fromDepth = depthOfNode.get(from.id) ?? 0;
        const toDepth = depthOfNode.get(to.id) ?? 0;
        const a = { x: from.x, y: from.y, ...nodeSize(from.shape, fromDepth) };
        const b = { x: to.x, y: to.y, ...nodeSize(to.shape, toDepth) };
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

/** Les deux formes à angles : elles demandent un tracé, pas un `border`. */
const POLY: Partial<Record<MindNode["shape"], string>> = {
  diamond: "50% 0%, 100% 50%, 50% 100%, 0% 50%",
  hex: "25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%",
};

const POINTS: Partial<Record<MindNode["shape"], string>> = {
  diamond: "50,0 100,50 50,100 0,50",
  hex: "25,0 75,0 100,50 75,100 25,100 0,50",
};

const SIDE_OF: Record<MindDirection, { x: string; y: string; label: string }> = {
  top: { x: "left-1/2 -translate-x-1/2", y: "-top-3", label: "au-dessus" },
  right: { x: "-right-3", y: "top-1/2 -translate-y-1/2", label: "à droite" },
  bottom: { x: "left-1/2 -translate-x-1/2", y: "-bottom-3", label: "en dessous" },
  left: { x: "-left-3", y: "top-1/2 -translate-y-1/2", label: "à gauche" },
};

/**
 * Une forme de la carte.
 *
 * Trois choses s’y décident :
 * 1. **l’habillage** vient de `nodeLook` : couleur, encre, contour, épaisseur,
 *    surlignage, texture — et, quand rien n’est choisi, l’accent du thème ;
 * 2. **les quatre poignées `+`** n’apparaissent que sur la forme sélectionnée et
 *    posent une branche du côté touché : c’est le seul geste qui relie ;
 * 3. les formes à angles (losange, hexagone) sont tracées en SVG, car un
 *    `border` sur un `clip-path` se fait couper aux pointes.
 */
export function EinnoteNode({ id, data }: NodeProps<FlowNode>) {
  const { text, shape, root, depth, sel, paint, onAdd, onOpen } = data;
  const look = nodeLook({ paint }, root);
  const texture = textureBackground(look.texture, look.border);

  const base =
    "relative flex items-center justify-center text-center font-medium leading-[19px] transition-colors";

  const sizing = cn(
    base,
    shape === "circle" && (root ? "h-28 w-28 rounded-full p-3 font-serif text-[15px] font-semibold" : "h-20 w-20 rounded-full p-2"),
    shape === "rect" && depth <= 1 && "min-h-[52px] w-[136px] gap-1.5 rounded-rect px-3 py-2 text-[14.5px]",
    shape === "rect" && depth > 1 && "min-h-10 w-[120px] rounded-rect px-2.5 py-1.5 text-[13px] leading-[17px]",
    shape === "square" && "h-20 w-20 rounded-rect p-2",
    shape === "pill" && "h-12 w-[148px] rounded-full px-4 text-[13.5px]",
    shape === "diamond" && "h-16 w-[124px] p-2 text-[13px] leading-[17px]",
    shape === "hex" && "h-[108px] w-[136px] p-3 text-[13px] leading-[17px]",
    !root && shape !== "circle" && "shadow-[0_1px_2px_rgba(0,0,0,.05)]",
  );

  /* Le remplissage et le trait passent en style : ils dépendent du nœud, pas
     d’une classe. `backgroundImage` porte la texture par-dessus la couleur. */
  const surface = {
    background: look.fill,
    backgroundImage: texture.image,
    backgroundSize: texture.size,
    color: look.ink,
    borderColor: look.border,
    borderWidth: look.borderWidth,
    /* Surlignage : une aura extérieure, jamais une deuxième couleur de fond —
       le texte doit rester lisible sur n’importe quel remplissage. */
    boxShadow: look.highlight
      ? `0 0 0 5px color-mix(in srgb, ${look.highlight} 42%, transparent)`
      : undefined,
  } as const;

  const poly = POINTS[shape] ?? null;

  return (
    <div className="group relative">
      <Handle type="target" id="t-left" position={Position.Left} isConnectable={false} style={HIDDEN} />
      <Handle type="target" id="t-right" position={Position.Right} isConnectable={false} style={HIDDEN} />
      <Handle type="target" id="t-top" position={Position.Top} isConnectable={false} style={HIDDEN} />
      <Handle type="target" id="t-bottom" position={Position.Bottom} isConnectable={false} style={HIDDEN} />

      <div
        onDoubleClick={() => onOpen(id)}
        className={cn(sizing, sel && "outline outline-2 outline-offset-[3px] outline-accent")}
        style={sel && poly ? { ...surface, outlineOffset: 6 } : surface}
      >
        {poly && (
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <polygon
              points={poly}
              fill={look.fill}
              stroke={look.border}
              strokeWidth={look.borderWidth}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {poly && texture.image && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[2px] opacity-70"
            style={{
              clipPath: `polygon(${POLY[shape]})`,
              backgroundImage: texture.image,
              backgroundSize: texture.size,
            }}
          />
        )}
        <span className={cn("relative line-clamp-3", poly && "px-3")}>{text}</span>
      </div>

      <Handle type="source" id="s-left" position={Position.Left} isConnectable={false} style={HIDDEN} />
      <Handle type="source" id="s-right" position={Position.Right} isConnectable={false} style={HIDDEN} />
      <Handle type="source" id="s-top" position={Position.Top} isConnectable={false} style={HIDDEN} />
      <Handle type="source" id="s-bottom" position={Position.Bottom} isConnectable={false} style={HIDDEN} />

      {sel && (
        <>
          {(Object.keys(SIDE_OF) as MindDirection[]).map((direction) => (
            <button
              key={direction}
              type="button"
              aria-label={`Ajouter une forme ${SIDE_OF[direction].label}`}
              title={`Ajouter une forme ${SIDE_OF[direction].label}`}
              onClick={(event) => {
                event.stopPropagation();
                onAdd(id, direction);
              }}
              className={cn(
                "absolute flex h-6 w-6 items-center justify-center rounded-full border border-accent bg-surface text-accent shadow-float",
                "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
                sel && "opacity-100",
                SIDE_OF[direction].x,
                SIDE_OF[direction].y,
              )}
            >
              <Plus size={13} weight="bold" />
            </button>
          ))}
          <button
            type="button"
            aria-label="Modifier la forme"
            title="Modifier la forme"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(id);
            }}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-float"
          >
            <PencilSimple size={12} weight="bold" />
          </button>
        </>
      )}
    </div>
  );
}

