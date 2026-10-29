import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  CaretDown,
  CaretUp,
  Circle,
  Diamond,
  Hexagon,
  Magnet,
  ListBullets,
  Palette,
  Plus,
  PencilSimple,
  Rectangle,
  Sparkle,
  Square,
  Trash,
  X,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen, Sheet } from "@/components/Layout";
import { DisplayMenu } from "@/components/DisplayMenu";
import { MindmapTemplateGallery } from "@/components/TemplateGallery";
import {
  columnsFor,
  gridStyle,
  groupItems,
  sortItems,
  type DisplayFields,
} from "@/lib/display";
import { useSurfacePrefs } from "@/stores/useDisplayStore";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { useContentStore } from "@/stores/useContentStore";
import { useToast } from "@/stores/useToast";
import { cn } from "@/lib/utils";
import type {
  EdgePaint,
  EdgeStyle,
  MindEdge,
  MindMap as MindMapType,
  MindNode,
} from "@/types";
import type { MindDirection } from "@/stores/useContentStore";
import {
  ARROWS,
  EDGE_WIDTHS,
  PAINT_COLORS,
  TEXTURES,
  edgeLook,
  nodeLook,
  textureBackground,
  type ArrowKind,
} from "@/lib/graph/paint";
import { MINDMAP_TEMPLATES, type MindmapTemplate } from "@/lib/templates/mindmaps";
import { mindmapFromTemplate } from "@/lib/templates/apply";
import { GraphStyleGallery } from "@/components/GraphStyleGallery";
import {
  graphStyleById,
  type GraphEdgeKind,
  type GraphStyle,
} from "@/lib/graph/styles";
import { relayoutMindmap } from "@/lib/graph/mindmapStyle";
import { GRAPH_EDGE_TYPES } from "@/lib/graph/edges";

type FlowNodeData = {
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
type FlowNode = Node<FlowNodeData, "engram">;

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

function toFlow(map: MindMapType, handlers: {
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

export default function MindMap() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const map = useContentStore((s) => s.mindmaps.find((m) => m.id === id));
  const graphStyle = graphStyleById(map?.styleId);
  const updateMindMap = useContentStore((s) => s.updateMindMap);
  const addMindNode = useContentStore((s) => s.addMindNode);
  const addMindNodeAt = useContentStore((s) => s.addMindNodeAt);
  const updateMindNode = useContentStore((s) => s.updateMindNode);
  const updateMindEdge = useContentStore((s) => s.updateMindEdge);
  const removeMindNode = useContentStore((s) => s.removeMindNode);
  const setEdgeStyle = useContentStore((s) => s.setEdgeStyle);
  const toast = useToast((s) => s.show);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /* Sélection multiple : le canevas doit permettre de ranger un groupe
     (aligner, répartir, supprimer) sans déplacer les nœuds un par un. */
  const [selection, setSelection] = useState<string[]>([]);
  const [snap, setSnap] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  /* Réorganiser = accepter que le style recalcule les positions. Sans cette
     case, un nœud déplacé à la main le reste : la présentation seule change. */
  const [keepPositions, setKeepPositions] = useState(false);
  const [defaultShape, setDefaultShape] = useState<MindNode["shape"]>("rect");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  /* La barre flottante se replie : dépliée elle porte tous les outils, repliée
     elle ne laisse qu’une poignée. Sur un canevas, la place est au dessin. */
  const [dockOpen, setDockOpen] = useState(true);
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const openEditor = useCallback((nodeId: string) => {
    const node = useContentStore
      .getState()
      .mindmaps.find((m) => m.id === id)
      ?.nodes.find((n) => n.id === nodeId);
    setEditingId(nodeId);
    setDraftText(node?.text ?? "");
  }, [id]);

  /**
   * Le geste qui relie : la poignée `+` d’une forme pose une branche du côté
   * touché et ouvre son texte. Rien d’autre ne crée de lien.
   */
  const addChild = useCallback(
    (parentId: string, direction: MindDirection, shape?: MindNode["shape"]) => {
      const createdId = addMindNode(id, parentId, shape ?? defaultShape, direction);
      if (!createdId) return;
      setSelectedId(createdId);
      setEditingId(createdId);
      setDraftText("Nouvelle idée");
    },
    [addMindNode, id, defaultShape],
  );

  /**
   * Le geste qui pose : la barre flottante dépose une forme **libre** au centre
   * du canevas, sans lien. C’est ce qui permet de commencer une carte depuis
   * une feuille vide, puis de relier à la main.
   */
  const createShape = useCallback(
    (shape: MindNode["shape"]) => {
      const rect = mapRef.current?.getBoundingClientRect();
      const center = flow && rect
        ? flow.screenToFlowPosition({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })
        : { x: 0, y: 0 };
      /* Un léger décalage à chaque pose : deux formes créées d’affilée ne se
         superposent pas exactement, on les voit toutes les deux. */
      const drift = (map?.nodes.length ?? 0) * 14;
      const createdId = addMindNodeAt(id, {
        x: center.x - 70 + drift,
        y: center.y - 30 + drift,
        shape,
      });
      setDefaultShape(shape);
      setSelectedId(createdId);
      setEditingId(createdId);
      setDraftText("Nouvelle idée");
      setSelectedEdgeId(null);
    },
    [addMindNodeAt, flow, id, map?.nodes.length],
  );

  const initial = useMemo(
    () =>
      map
        ? toFlow(
            map,
            {
              onAdd: (nodeId, direction) => addChild(nodeId, direction),
              onOpen: openEditor,
            },
            null,
            graphStyle,
          )
        : { nodes: [], edges: [] },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);

  /* Reflète l’état enregistré (texte, forme, ajout, suppression, style) */
  const nodesKey = (map?.nodes ?? [])
    .map(
      (node) =>
        `${node.id}:${node.text}:${node.shape}:${node.x}:${node.y}:${JSON.stringify(node.paint ?? null)}`,
    )
    .join("|");

  /* L’habillage d’un trait vit dans l’arête, pas dans le style : il faut donc
     suivre aussi son contenu, sinon une couleur choisie n’arriverait jamais au
     dessin. */
  const edgesKey = (map?.edges ?? [])
    .map((edge) => `${edge.id}:${JSON.stringify(edge.paint ?? null)}`)
    .join("|");

  useEffect(() => {
    if (!map) return;
    const flow = toFlow(
      map,
      {
        onAdd: (nodeId, direction) => addChild(nodeId, direction),
        onOpen: openEditor,
      },
      selectedId,
      graphStyle,
    );
    setNodes(flow.nodes);
    setEdges(flow.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey, edgesKey, map?.edgeStyle, map?.styleId, map?.title, selectedId]);

  /* Un clic sur le fond referme aussi le panneau du trait. */

  /* Affichage des nœuds : la carte reste reine, mais un plan lisible évite
     de tourner autour du canevas pour retrouver une idée. Les crochets sont
     déclarés avant la sortie « carte introuvable » : un retour anticipé ne
     doit jamais changer l’ordre des hooks. */
  const { prefs: display } = useSurfacePrefs("mindmap", { view: "list", sortBy: "depth" });
  const desktop = useIsDesktop();
  const [nodesOpen, setNodesOpen] = useState(false);

  if (!map) {
  return (
      <Screen className="px-5">
        <AppBar back title="" />
        <EmptyState
          title="Carte introuvable"
          description="Cette carte mentale n’existe plus."
          action={
            <button className="btn-primary" onClick={() => navigate("/")}>
              Retour à la bibliothèque
            </button>
          }
        />
      </Screen>
    );
  }

  /* Alignement et répartition : les deux gestes de rangement attendus sur un
     canevas infini. Ils écrivent des positions entières, donc stables après
     rechargement. */
  const alignSelection = (edge: "left" | "top") => {
    if (!map || selection.length < 2) return;
    const nodes = map.nodes.filter((node) => selection.includes(node.id));
    const target =
      edge === "left"
        ? Math.min(...nodes.map((node) => node.x))
        : Math.min(...nodes.map((node) => node.y));
    nodes.forEach((node) =>
      updateMindNode(id, node.id, edge === "left" ? { x: target } : { y: target }),
    );
  };

  const distributeSelection = () => {
    if (!map || selection.length < 3) return;
    const nodes = [...map.nodes]
      .filter((node) => selection.includes(node.id))
      .sort((a, b) => a.x - b.x);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const step = (last.x - first.x) / (nodes.length - 1);
    nodes.forEach((node, index) => {
      if (index === 0 || index === nodes.length - 1) return;
      updateMindNode(id, node.id, { x: Math.round(first.x + step * index) });
    });
  };

  const depthOf = (nodeId: string): number => {
    let depth = 0;
    let current = map.nodes.find((node) => node.id === nodeId);
    const guard = new Set<string>();
    while (current?.parentId && !guard.has(current.id)) {
      guard.add(current.id);
      current = map.nodes.find((node) => node.id === current?.parentId);
      depth += 1;
    }
    return depth;
  };

  const nodeFields: DisplayFields<MindNode> = {
    text: { label: "Texte", value: (node) => node.text },
    depth: { label: "Profondeur", value: (node) => depthOf(node.id), type: "number" },
    shape: { label: "Forme", value: (node) => node.shape },
    children: {
      label: "Enfants",
      value: (node) =>
        map.nodes.filter((child) => child.parentId === node.id).length,
      type: "number",
    },
  };
  const nodeGroups = groupItems(
    sortItems(map.nodes, nodeFields, [display.sortBy, display.thenBy]),
    nodeFields,
    display.groupBy,
  );

  const editing = map.nodes.find((n) => n.id === editingId);
  const selected = map.nodes.find((n) => n.id === selectedId);

  /**
   * La barre de formes fait exactement deux choses, et elles sont distinctes :
   * avec une forme sélectionnée elle la **change** ; sans sélection elle en
   * **pose une nouvelle**, libre, au centre. L’ancienne version ne faisait que
   * mémoriser une préférence invisible — d’où l’impression que rien ne se
   * passait.
   */
  const applyShape = (shape: MindNode["shape"]) => {
    if (selected) {
      updateMindNode(map.id, selected.id, { shape });
    } else {
      createShape(shape);
    }
  };

  const selectedEdge = map.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  const paintNode = (patch: Partial<NonNullable<MindNode["paint"]>>) => {
    if (!selected) return;
    updateMindNode(map.id, selected.id, {
      paint: { ...(selected.paint ?? {}), ...patch },
    });
  };

  const paintEdge = (patch: Partial<EdgePaint>) => {
    if (!selectedEdge) return;
    updateMindEdge(map.id, selectedEdge.id, {
      paint: { ...(selectedEdge.paint ?? {}), ...patch },
    });
  };

  /** Une carte vidée de tout, sauf un point de départ. */
  const blankMap = () => {
    const keep = map.nodes[0];
    updateMindMap(map.id, {
      nodes: keep ? [{ ...keep, paint: undefined }] : [],
      edges: [],
    });
    setSelectedId(keep?.id ?? null);
    setSelectedEdgeId(null);
    toast("Carte vierge", "accent");
  };

  const deleteNode = () => {
    if (!editing) return;
    removeMindNode(map.id, editing.id);
    setEditingId(null);
    setSelectedId(null);
    toast("Branche supprimée");
  };

  /* Un style ne touche jamais au texte : il applique une disposition (sauf si
     l’on garde ses positions) et une forme de lien. */
  const applyStyle = (style: GraphStyle) => {
    const patch: Partial<MindMapType> = { styleId: style.id };
    if (!keepPositions) {
      patch.nodes = relayoutMindmap(map, style.layout);
    }
    updateMindMap(map.id, patch);
    setStyleOpen(false);
    toast(`Style « ${style.label} » appliqué`, "accent");
  };

  /* Changer de modèle remplace la carte, mais seulement après un second
     geste : une carte de 25 nœuds ne doit pas disparaître sur un appui. */
  const applyTemplate = (template: MindmapTemplate) => {
    const seed = mindmapFromTemplate(template);
    updateMindMap(map.id, {
      nodes: seed.nodes,
      edges: seed.edges,
      edgeStyle: seed.edgeStyle,
      title: map.title,
    });
    setSelectedId(null);
    setEditingId(null);
    setPickedTemplate(null);
    setTemplatesOpen(false);
    toast(`Modèle « ${template.name} » appliqué`, "accent");
  };

  return (
    <div className="paper screen screen-canvas" data-canvas="dots">
      <div className="sticky top-0 z-20 glass">
        <AppBar
          back
          onBack={() => navigate("/")}
          center={false}
          title={map.title}
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Styles de graphe"
                title="Style"
                onClick={() => setStyleOpen(true)}
                className={cn(
                  "h-10 text-accent",
                  desktop
                    ? "pill gap-1.5 px-3 text-[13.5px] font-semibold"
                    : "icon-btn w-10",
                )}
              >
                <Palette size={desktop ? 16 : 20} weight="fill" aria-hidden />
                {desktop && "Style"}
              </button>
              <button
                type="button"
                aria-label="Modèles de carte"
                title="Modèles"
                onClick={() => setTemplatesOpen(true)}
                className={cn(
                  "h-10 text-accent",
                  desktop
                    ? "pill gap-1.5 px-3 text-[13.5px] font-semibold"
                    : "icon-btn w-10",
                )}
              >
                <Sparkle size={desktop ? 16 : 20} weight="fill" aria-hidden />
                {desktop && "Modèles"}
              </button>
              <DisplayMenu
                surface="mindmap"
                views={[
                  { value: "list", label: "Liste", hint: "Plan linéaire" },
                  { value: "grid", label: "Grille", hint: "Vignettes" },
                ]}
                defaults={{ view: "list", sortBy: "depth" }}
                columns={{
                  min: 1,
                  max: 3,
                  fallback: desktop ? 3 : 2,
                  autoHint: "Automatique : 2 sur téléphone, 3 en bureau.",
                }}
                groupOptions={[
                  { value: "depth", label: "Profondeur" },
                  { value: "shape", label: "Forme" },
                ]}
                sortOptions={[
                  { value: "depth", label: "Profondeur" },
                  { value: "text", label: "Texte A → Z" },
                  { value: "children", label: "Nombre d’enfants" },
                  { value: "shape", label: "Forme" },
                ]}
                label="Nœuds"
              />
              <button
                type="button"
                className="icon-btn h-10 w-10"
                aria-label="Plan des nœuds"
                title="Plan"
                onClick={() => setNodesOpen(true)}
              >
                <ListBullets size={19} />
              </button>
            </div>
          }
        />
      </div>

      <Sheet
        open={nodesOpen}
        onClose={() => setNodesOpen(false)}
        title={`Nœuds · ${map.nodes.length}`}
      >
        {nodeGroups.map((group) => {
          const columns = columnsFor(display, {
            fallback: desktop ? 3 : 2,
            min: 1,
            max: 3,
          });
          return (
            <div key={group.key} className="mb-3">
              {group.label && (
                <h3 className="mb-1.5 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                  {group.label}
                  <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-bold">
                    {group.items.length}
                  </span>
                </h3>
              )}
              <ul
                className={
                  display.view === "grid"
                    ? "grid gap-2"
                    : "flex flex-col gap-1.5"
                }
                style={display.view === "grid" ? gridStyle(columns) : undefined}
              >
                {group.items.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(node.id);
                        setNodesOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-field border border-line bg-surface px-3 py-2 text-left hover:border-line-strong"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: "var(--accent)" }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[14px]">
                        {node.text}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">
                        {depthOf(node.id) === 0 ? "racine" : `niv. ${depthOf(node.id)}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <p className="mt-3 text-[12.5px] leading-[18px] text-muted">
          Touchez un nœud pour le sélectionner sur le canevas.
        </p>
      </Sheet>

      <div ref={mapRef} className="relative min-h-0 flex-1">
        <div className="flow-fill">
        <ReactFlow
          onInit={setFlow}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={{ engram: EinnoteNode }}
          edgeTypes={GRAPH_EDGE_TYPES}
          fitView
          /* Sur téléphone, ne pas dézoomer au point que le texte devienne
             illisible : mieux vaut une carte qu’on fait glisser qu’une carte
             entière réduite à des taches. */
          fitViewOptions={{
            padding: desktop ? 0.3 : 0.08,
            minZoom: desktop ? 0.5 : 0.6,
            maxZoom: 1.1,
          }}
          /* Un canevas sans limite : on peut s’éloigner jusqu’à voir la carte
             entière comme une planète, et zoomer jusqu’au détail du texte. */
          minZoom={0.08}
          maxZoom={2.4}
          panOnScroll
          zoomOnPinch
          /* Miro et tldraw ont la même grammaire : le glissement déplace le
             canevas, Maj + glissement trace un rectangle de sélection, et
             Cmd/Ctrl + clic ajoute un nœud à la sélection. */
          selectionKeyCode="Shift"
          multiSelectionKeyCode={["Meta", "Control"]}
          snapToGrid={snap}
          snapGrid={[16, 16]}
          onSelectionChange={({ nodes: selectedNodes }) =>
            setSelection((previous) => {
              /* React Flow rappelle cette fonction à chaque rendu avec un
                 tableau neuf : sans comparaison, on déclencherait un rendu
                 infini (boucle constatée en test). */
              const next = selectedNodes.map((node) => node.id);
              if (
                next.length === previous.length &&
                next.every((id, index) => id === previous[index])
              ) {
                return previous;
              }
              return next;
            })
          }
          onNodeClick={(_, node) => {
            setSelectedId(node.id);
            setSelectedEdgeId(null);
          }}
          /* Toucher un trait ouvre son habillage : couleur, épaisseur, pointillé,
             forme de la pointe. */
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id);
            setSelectedId(null);
            setDockOpen(true);
          }}
          onNodeDoubleClick={(_, node) => openEditor(node.id)}
          onNodeDragStop={(_, node) => {
            updateMindNode(map.id, node.id, {
              x: Math.round(node.position.x),
              y: Math.round(node.position.y),
            });
          }}
          onPaneClick={() => {
            setSelectedId(null);
            setSelectedEdgeId(null);
          }}
          proOptions={{ hideAttribution: true }}
          nodesFocusable
          edgesFocusable
          aria-label={`Carte mentale ${map.title} — ${map.nodes.length} nœuds`}
          className="[&_.react-flow__pane]:cursor-default"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.4}
            color="var(--canvas-dot)"
          />
          {desktop && (
            <>
              <Controls
                showInteractive={false}
                position="bottom-left"
                className="!bottom-24 !left-4 !rounded-rect !border !border-line !bg-surface !shadow-float [&_button]:!border-line [&_button]:!bg-surface [&_button]:!fill-ink"
              />
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                ariaLabel="Aperçu de la carte"
                className="!bottom-24 !right-4 !rounded-rect !border !border-line !bg-surface"
                maskColor="var(--surface-2)"
                nodeColor={(node) =>
                  (node.data as FlowNodeData).root ? "var(--accent)" : "var(--line-strong)"
                }
                nodeStrokeWidth={0}
                nodeBorderRadius={4}
              />
            </>
          )}
        </ReactFlow>
        </div>

        {selection.length > 1 && (
          <div className="absolute inset-x-0 top-3 z-10 mx-auto flex w-fit items-center gap-1 rounded-full border border-line bg-surface px-1.5 py-1 shadow-float">
            <span className="px-2 text-[12.5px] font-semibold tabnum">
              {selection.length} nœuds
            </span>
            <SelectionAction
              label="Aligner à gauche"
              onClick={() => alignSelection("left")}
            >
              ⇤
            </SelectionAction>
            <SelectionAction label="Aligner en haut" onClick={() => alignSelection("top")}>
              ⇧
            </SelectionAction>
            <SelectionAction label="Répartir horizontalement" onClick={distributeSelection}>
              ⇹
            </SelectionAction>
            <SelectionAction
              label="Supprimer la sélection"
              destructive
              onClick={() => {
                selection.forEach((nodeId) => removeMindNode(id, nodeId));
                setSelection([]);
                setSelectedId(null);
              }}
            >
              ✕
            </SelectionAction>
          </div>
        )}

        {map.nodes.length < 3 && (
          <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-surface px-3 py-1.5 text-[13px] text-muted shadow-float">
            Touchez un nœud, puis « + » pour créer une liane
          </div>
        )}
      </div>

      <MapDock
        open={dockOpen}
        onToggle={() => setDockOpen((value) => !value)}
        selected={selected}
        edge={selectedEdge}
        snap={snap}
        onSnap={() => setSnap((value) => !value)}
        onShape={applyShape}
        onPaintNode={paintNode}
        onPaintEdge={paintEdge}
        onStyle={() => setStyleOpen(true)}
        styleLabel={graphStyle.label}
      />

      {/* Édition d’un nœud */}
      <Sheet
        open={Boolean(editing)}
        onClose={() => setEditingId(null)}
        title="Nœud"
      >
        {editing && (
          <>
            <label htmlFor="node-text" className="mb-1.5 block text-[14px] font-semibold text-muted">
              Texte
            </label>
            <input
              id="node-text"
              value={draftText}
              onChange={(event) => {
                setDraftText(event.target.value);
                updateMindNode(map.id, editing.id, { text: event.target.value });
              }}
              autoFocus
              className="field h-12"
            />
            <p className="mb-2 mt-4 text-[14px] font-semibold text-muted">Forme</p>
            <div className="flex gap-2">
              {(["circle", "rect", "square", "diamond", "pill", "hex"] as const).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => updateMindNode(map.id, editing.id, { shape })}
                  aria-label={shapeLabel(shape)}
                  aria-pressed={editing.shape === shape}
                  className={cn(
                    "flex h-12 flex-1 items-center justify-center rounded-field border",
                    editing.shape === shape
                      ? "border-accent bg-accent-soft text-accent-ink"
                      : "border-line bg-surface text-ink",
                  )}
                >
                  {shapeIcon(shape)}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              {editing.parentId && (
                <button type="button" onClick={deleteNode} className="btn-secondary flex-1 text-danger">
                  <Trash size={18} />
                  Supprimer
                </button>
              )}
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  if (draftText.trim()) {
                    updateMindNode(map.id, editing.id, { text: draftText.trim() });
                  }
                  setEditingId(null);
                }}
              >
                Terminé
              </button>
            </div>
            <button
              type="button"
              className="btn-quiet mt-2 w-full"
              onClick={() => {
                addChild(editing.id, "right");
              }}
            >
              <Plus size={18} weight="bold" /> Ajouter un enfant
            </button>
          </>
        )}
      </Sheet>

      {/* Styles : la présentation d’un graphe, pas son contenu */}
      <Sheet
        open={styleOpen}
        onClose={() => setStyleOpen(false)}
        title={`Styles · ${graphStyle.label}`}
        size="wide"
      >
        <p className="mb-2 text-[13.5px] leading-[20px] text-muted">
          Un style change la disposition et la forme des liens, jamais le texte.
          Il est mémorisé avec cette carte.
        </p>
        <label className="mb-3 flex items-center gap-2.5 rounded-field border border-line bg-surface px-3 py-2.5">
          <input
            type="checkbox"
            checked={keepPositions}
            onChange={(event) => setKeepPositions(event.target.checked)}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-[13px] leading-[18px]">
            Garder mes positions
            <span className="block text-[11.5px] text-muted">
              Décoché, le style range les nœuds selon sa disposition.
            </span>
          </span>
        </label>
        <GraphStyleGallery
          scope="mindmap"
          selectedId={graphStyle.id}
          onPick={applyStyle}
        />
      </Sheet>

      {/* Modèles : 14 manières de penser, une galerie unique */}
      <Sheet
        open={templatesOpen}
        onClose={() => {
          setTemplatesOpen(false);
          setPickedTemplate(null);
        }}
        title={`Modèles · ${MINDMAP_TEMPLATES.length}`}
        size="wide"
      >
        <p className="mb-3 text-[14px] leading-[21px] text-muted">
          Chaque modèle encode une méthode réelle : Ishikawa pour les causes,
          Toulmin pour l’argumentation, croissance de Bloom pour la progression.
          L’aperçu est la disposition exacte qui sera créée. Remplacer efface les
          nœuds actuels ; renommer et déplacer reste possible après.
        </p>
        <MindmapTemplateGallery
          templates={MINDMAP_TEMPLATES}
          selectedId={pickedTemplate}
          onPick={(template) => setPickedTemplate(template.id)}
        />
        <button
          type="button"
          disabled={!pickedTemplate}
          onClick={() => {
            const template = MINDMAP_TEMPLATES.find(
              (item) => item.id === pickedTemplate,
            );
            if (template) applyTemplate(template);
          }}
          className="btn-primary mt-3 w-full disabled:opacity-50"
        >
          {pickedTemplate ? "Remplacer la carte par ce modèle" : "Choisissez un modèle"}
        </button>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function shapeLabel(shape: MindNode["shape"]) {
  return {
    circle: "Cercle",
    rect: "Rectangle",
    square: "Carré",
    diamond: "Losange",
    pill: "Pilule",
    hex: "Hexagone",
  }[shape];
}

function shapeIcon(shape: MindNode["shape"]) {
  if (shape === "circle") return <Circle size={20} />;
  if (shape === "square") return <Square size={20} />;
  if (shape === "diamond") return <Diamond size={20} />;
  if (shape === "hex") return <Hexagon size={20} />;
  if (shape === "pill") {
    return <span className="h-[11px] w-[22px] rounded-full border-2 border-current" aria-hidden />;
  }
  return <Rectangle size={20} />;
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
function EinnoteNode({ id, data }: NodeProps<FlowNode>) {
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

/**
 * La barre flottante du canevas.
 *
 * Elle fait deux métiers, et c’est voulu qu’ils cohabitent : **poser** une
 * forme libre quand rien n’est sélectionné, **habiller** la forme ou le trait
 * sélectionné le reste du temps. Repliée, elle ne laisse qu’une poignée — sur
 * un canevas, la place appartient au dessin.
 */
function MapDock({
  open,
  onToggle,
  selected,
  edge,
  snap,
  onSnap,
  onShape,
  onPaintNode,
  onPaintEdge,
  onStyle,
  styleLabel,
}: {
  open: boolean;
  onToggle: () => void;
  selected: MindNode | undefined;
  edge: MindEdge | null;
  snap: boolean;
  onSnap: () => void;
  onShape: (shape: MindNode["shape"]) => void;
  onPaintNode: (patch: Partial<NonNullable<MindNode["paint"]>>) => void;
  onPaintEdge: (patch: Partial<EdgePaint>) => void;
  onStyle: () => void;
  styleLabel: string;
}) {
  const [panel, setPanel] = useState<"node" | "edge">("node");
  /* Le panneau suit ce qui est sélectionné : toucher un trait montre ses
     réglages, toucher une forme montre les siens — sans geste de plus. */
  const showing = edge ? "edge" : selected ? "node" : panel;
  const paint = selected?.paint ?? {};
  const edgePaint = edge?.paint ?? {};

  const heading = edge
    ? "Trait"
    : selected
      ? `Forme · ${selected.text.slice(0, 22)}`
      : "Poser une forme";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(12px+var(--safe-bottom))] z-20 mx-auto flex w-full justify-center px-3">
      <div className="pointer-events-auto w-full max-w-[760px] overflow-hidden rounded-big border border-line bg-surface shadow-float">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? "Replier les outils du canevas" : "Déplier les outils du canevas"}
          className="flex h-9 w-full items-center gap-2 px-3 text-left"
        >
          <span className="h-1 w-6 rounded-full bg-line-strong" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-muted">
            {heading}
          </span>
          {open ? <CaretDown size={15} /> : <CaretUp size={15} />}
        </button>

        {open && (
          <div className="max-h-[54vh] overflow-y-auto border-t border-line px-2 pb-2">
            <div className="flex items-center gap-1 overflow-x-auto py-1.5">
              <ShapeButton label="Cercle" active={selected?.shape === "circle"} onClick={() => onShape("circle")}>
                <Circle size={21} />
              </ShapeButton>
              <ShapeButton label="Rectangle" active={selected?.shape === "rect"} onClick={() => onShape("rect")}>
                <Rectangle size={21} />
              </ShapeButton>
              <ShapeButton label="Carré" active={selected?.shape === "square"} onClick={() => onShape("square")}>
                <Square size={21} />
              </ShapeButton>
              <ShapeButton label="Losange" active={selected?.shape === "diamond"} onClick={() => onShape("diamond")}>
                <Diamond size={21} />
              </ShapeButton>
              <ShapeButton label="Pilule" active={selected?.shape === "pill"} onClick={() => onShape("pill")}>
                <span className="h-[12px] w-[24px] rounded-full border-2 border-current" aria-hidden />
              </ShapeButton>
              <ShapeButton label="Hexagone" active={selected?.shape === "hex"} onClick={() => onShape("hex")}>
                <Hexagon size={21} />
              </ShapeButton>

              <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden />

              <button
                type="button"
                onClick={onSnap}
                aria-pressed={snap}
                aria-label={snap ? "Désactiver l’aimant" : "Activer l’aimant"}
                title={snap ? "Aimant activé (grille 16 px)" : "Aimant désactivé"}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-rect",
                  snap ? "text-accent" : "text-muted",
                )}
              >
                <Magnet size={19} weight={snap ? "fill" : "regular"} aria-hidden />
              </button>
              <button
                type="button"
                onClick={onStyle}
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-rect px-3 text-[13px] font-semibold text-accent"
                aria-label={`Style actuel : ${styleLabel}`}
              >
                <Palette size={17} weight="fill" aria-hidden />
                Style
              </button>
            </div>

            {(selected || edge) && (
              <div className="flex gap-1 border-t border-line pt-1.5">
                {selected && (
                  <button
                    type="button"
                    onClick={() => setPanel("node")}
                    aria-pressed={showing === "node"}
                    className={cn(
                      "h-7 rounded-full px-2.5 text-[12px] font-semibold",
                      showing === "node" ? "bg-accent-soft text-accent-ink" : "text-muted",
                    )}
                  >
                    Forme
                  </button>
                )}
                {edge && (
                  <button
                    type="button"
                    onClick={() => setPanel("edge")}
                    aria-pressed={showing === "edge"}
                    className={cn(
                      "h-7 rounded-full px-2.5 text-[12px] font-semibold",
                      showing === "edge" ? "bg-accent-soft text-accent-ink" : "text-muted",
                    )}
                  >
                    Trait
                  </button>
                )}
              </div>
            )}

            {!selected && !edge && (
              <p className="pb-1 text-[12px] leading-[17px] text-muted">
                Touchez une forme pour la poser librement sur le canevas, puis reliez-la avec le
                « + » d’une autre forme.
              </p>
            )}

            {selected && showing === "node" && (
              <div className="flex flex-col gap-1.5 pb-1">
                <PaintRow label="Remplissage">
                  {PAINT_COLORS.map((choice) => (
                    <Swatch
                      key={`fill-${choice.label}`}
                      label={choice.label}
                      color={choice.swatch}
                      active={(paint.fill ?? null) === choice.value}
                      onClick={() => onPaintNode({ fill: choice.value ?? undefined })}
                    />
                  ))}
                </PaintRow>
                <PaintRow label="Texte">
                  {PAINT_COLORS.map((choice) => (
                    <Swatch
                      key={`ink-${choice.label}`}
                      label={choice.label}
                      color={choice.swatch}
                      active={(paint.ink ?? null) === choice.value}
                      onClick={() => onPaintNode({ ink: choice.value ?? undefined })}
                    />
                  ))}
                </PaintRow>
                <PaintRow label="Contour">
                  {PAINT_COLORS.map((choice) => (
                    <Swatch
                      key={`border-${choice.label}`}
                      label={choice.label}
                      color={choice.swatch}
                      active={(paint.border ?? null) === choice.value}
                      onClick={() => onPaintNode({ border: choice.value ?? undefined })}
                    />
                  ))}
                  <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
                  {[1.5, 2.5, 4].map((width) => (
                    <Chip
                      key={`bw-${width}`}
                      label={`${width} px`}
                      active={(paint.borderWidth ?? 1.5) === width}
                      onClick={() => onPaintNode({ borderWidth: width })}
                    />
                  ))}
                </PaintRow>
                <PaintRow label="Texture">
                  {TEXTURES.map((texture) => (
                    <Chip
                      key={texture.value}
                      label={texture.label}
                      active={(paint.texture ?? "none") === texture.value}
                      onClick={() => onPaintNode({ texture: texture.value })}
                    />
                  ))}
                </PaintRow>
                <PaintRow label="Surlignage">
                  {PAINT_COLORS.map((choice) => (
                    <Swatch
                      key={`hl-${choice.label}`}
                      label={choice.label}
                      color={choice.swatch}
                      active={(paint.highlight ?? null) === choice.value}
                      onClick={() => onPaintNode({ highlight: choice.value ?? undefined })}
                    />
                  ))}
                </PaintRow>
              </div>
            )}

            {edge && showing === "edge" && (
              <div className="flex flex-col gap-1.5 pb-1">
                <PaintRow label="Couleur">
                  {PAINT_COLORS.map((choice) => (
                    <Swatch
                      key={`edge-${choice.label}`}
                      label={choice.label}
                      color={choice.swatch}
                      active={(edgePaint.color ?? null) === choice.value}
                      onClick={() => onPaintEdge({ color: choice.value ?? undefined })}
                    />
                  ))}
                </PaintRow>
                <PaintRow label="Épaisseur">
                  {EDGE_WIDTHS.map((width) => (
                    <Chip
                      key={`ew-${width}`}
                      label={`${width} px`}
                      active={(edgePaint.width ?? 2.5) === width}
                      onClick={() => onPaintEdge({ width })}
                    />
                  ))}
                  <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
                  <Chip
                    label="Pointillé"
                    active={Boolean(edgePaint.dashed)}
                    onClick={() => onPaintEdge({ dashed: !edgePaint.dashed })}
                  />
                </PaintRow>
                <PaintRow label="Pointe">
                  {ARROWS.map((arrow) => (
                    <Chip
                      key={arrow.value}
                      label={arrow.label}
                      active={(edgePaint.arrow ?? "arrow") === arrow.value}
                      onClick={() => onPaintEdge({ arrow: arrow.value as ArrowKind })}
                    />
                  ))}
                </PaintRow>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PaintRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      <span className="w-[74px] shrink-0 text-[11.5px] font-semibold text-muted">{label}</span>
      {children}
    </div>
  );
}

function Swatch({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
        active ? "border-accent" : "border-transparent",
      )}
    >
      <span
        className="h-[19px] w-[19px] rounded-full border border-line"
        style={{
          background: color,
          /* « Automatique » n’est pas une couleur : c’est un dégradé qui dit
             qu’on suit le thème. */
          backgroundImage: label === "Automatique"
            ? "linear-gradient(135deg, var(--accent) 50%, var(--surface) 50%)"
            : undefined,
        }}
        aria-hidden
      />
    </button>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-8 shrink-0 rounded-full border px-2.5 text-[12px] font-semibold",
        active
          ? "border-accent bg-accent-soft text-accent-ink"
          : "border-line bg-surface text-ink",
      )}
    >
      {label}
    </button>
  );
}

function ShapeButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-rect",
        active ? "bg-accent-soft text-accent" : "text-ink active:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function SelectionAction({
  label,
  onClick,
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        destructive
          ? "flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold text-danger hover:bg-surface-2"
          : "flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-bold text-ink hover:bg-surface-2"
      }
    >
      {children}
    </button>
  );
}
