import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Circle,
  Diamond,
  Hexagon,
  ListBullets,
  Palette,
  Plus,
  PencilSimple,
  Rectangle,
  Sparkle,
  Square,
  Trash,
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
import type { EdgeStyle, MindMap as MindMapType, MindNode } from "@/types";
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
  onAdd: (id: string) => void;
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
 * Toutes les arêtes de la carte passent par `EngramEdge` : un seul composant
 * sait dessiner les cinq familles de trait et accrocher le trait au bord réel
 * des nœuds. Les types intégrés de React Flow ne connaissent que des poignées
 * fixes, ce qui faisait disparaître les liens dès qu’un nœud changeait de
 * forme.
 */
function edgeKindFor(style: GraphStyle | null, fallback: EdgeStyle): GraphEdgeKind {
  return style ? style.edge : EDGE_KIND[fallback];
}

function toFlow(map: MindMapType, handlers: {
  onAdd: (id: string) => void;
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
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...handles,
        type: "engram",
        style: { stroke: "var(--accent)" },
        data: {
          kind: edgeKindFor(style, map.edgeStyle),
          echo: false,
          weight: style?.weight ?? 2.5,
          dashed: Boolean(style?.dashed),
        },
        /* Une carte hiérarchique se lit dans un sens : la flèche dit lequel.
           Sur les courbes organiques et les rubans, elle alourdirait le dessin. */
        ...((style ? style.arrow : map.edgeStyle === "step")
          ? { markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "var(--accent)" } }
          : {}),
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
  const updateMindNode = useContentStore((s) => s.updateMindNode);
  const removeMindNode = useContentStore((s) => s.removeMindNode);
  const setEdgeStyle = useContentStore((s) => s.setEdgeStyle);
  const toast = useToast((s) => s.show);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);
  const [styleOpen, setStyleOpen] = useState(false);
  /* Réorganiser = accepter que le style recalcule les positions. Sans cette
     case, un nœud déplacé à la main le reste : la présentation seule change. */
  const [keepPositions, setKeepPositions] = useState(false);
  const [defaultShape, setDefaultShape] = useState<MindNode["shape"]>("rect");

  const openEditor = useCallback((nodeId: string) => {
    const node = useContentStore
      .getState()
      .mindmaps.find((m) => m.id === id)
      ?.nodes.find((n) => n.id === nodeId);
    setEditingId(nodeId);
    setDraftText(node?.text ?? "");
  }, [id]);

  const addChild = useCallback(
    (parentId: string, shape?: MindNode["shape"]) => {
      addMindNode(id, parentId, shape ?? defaultShape);
      const mapNow = useContentStore.getState().mindmaps.find((m) => m.id === id);
      const created = [...(mapNow?.nodes ?? [])].pop();
      if (created) {
        setSelectedId(created.id);
        setEditingId(created.id);
        setDraftText(created.text);
      }
    },
    [addMindNode, id, defaultShape],
  );

  const initial = useMemo(
    () =>
      map
        ? toFlow(
            map,
            {
              onAdd: (nodeId) => addChild(nodeId),
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
    .map((node) => `${node.id}:${node.text}:${node.shape}`)
    .join("|");

  useEffect(() => {
    if (!map) return;
    const flow = toFlow(
      map,
      {
        onAdd: (nodeId) => addChild(nodeId),
        onOpen: openEditor,
      },
      selectedId,
      graphStyle,
    );
    setNodes(flow.nodes);
    setEdges(flow.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey, map?.edges.length, map?.edgeStyle, map?.styleId, map?.title, selectedId]);

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

  const applyShape = (shape: MindNode["shape"]) => {
    if (selected) {
      updateMindNode(map.id, selected.id, { shape });
    } else {
      setDefaultShape(shape);
      toast(`Nouveaux nœuds : ${shapeLabel(shape)}`);
    }
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

      <div className="relative min-h-0 flex-1">
        <div className="flow-fill">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={{ engram: EngramNode }}
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
          minZoom={0.35}
          maxZoom={1.8}
          panOnScroll
          zoomOnPinch
          selectionOnDrag={false}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onNodeDoubleClick={(_, node) => openEditor(node.id)}
          onNodeDragStop={(_, node) => {
            updateMindNode(map.id, node.id, {
              x: Math.round(node.position.x),
              y: Math.round(node.position.y),
            });
          }}
          onPaneClick={() => setSelectedId(null)}
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

        {map.nodes.length < 3 && (
          <div className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-surface px-3 py-1.5 text-[13px] text-muted shadow-float">
            Touchez un nœud, puis « + » pour créer une liane
          </div>
        )}
      </div>

      <div className="dock pointer-events-none fixed inset-x-0 bottom-[calc(16px+var(--safe-bottom))] z-20 mx-auto px-4">
        <div className="pointer-events-auto flex h-[68px] items-center gap-1 rounded-big border border-line bg-surface px-1 shadow-float">
          <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
            <ShapeButton
              label="Cercle"
              active={selected?.shape === "circle" || (!selected && defaultShape === "circle")}
              onClick={() => applyShape("circle")}
            >
              <Circle size={22} />
            </ShapeButton>
            <ShapeButton
              label="Rectangle"
              active={selected?.shape === "rect" || (!selected && defaultShape === "rect")}
              onClick={() => applyShape("rect")}
            >
              <Rectangle size={22} />
            </ShapeButton>
            <ShapeButton
              label="Carré"
              active={selected?.shape === "square" || (!selected && defaultShape === "square")}
              onClick={() => applyShape("square")}
            >
              <Square size={22} />
            </ShapeButton>
            <ShapeButton
              label="Losange"
              active={selected?.shape === "diamond" || (!selected && defaultShape === "diamond")}
              onClick={() => applyShape("diamond")}
            >
              <Diamond size={22} />
            </ShapeButton>
            <ShapeButton
              label="Pilule"
              active={selected?.shape === "pill" || (!selected && defaultShape === "pill")}
              onClick={() => applyShape("pill")}
            >
              <span className="h-[13px] w-[26px] rounded-full border-[2.5px] border-current" aria-hidden />
            </ShapeButton>
            <ShapeButton
              label="Hexagone"
              active={selected?.shape === "hex" || (!selected && defaultShape === "hex")}
              onClick={() => applyShape("hex")}
            >
              <Hexagon size={22} />
            </ShapeButton>
          </div>

          <span className="h-6 w-px shrink-0 bg-line" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setStyleOpen(true)}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-[22px] px-3 text-[13.5px] font-semibold text-accent"
            aria-label={`Style actuel : ${graphStyle.label}`}
          >
            <Palette size={18} weight="fill" aria-hidden />
            Style
          </button>
        </div>
      </div>

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
                addChild(editing.id);
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

function EngramNode({ id, data }: NodeProps<FlowNode>) {
  const { text, shape, root, depth, sel, onAdd, onOpen } = data;

  const base =
    "relative flex items-center justify-center text-center font-medium leading-[19px] transition-colors";

  return (
    <div className="group relative">
      <Handle type="target" id="t-left" position={Position.Left} isConnectable={false} style={HIDDEN} />
      <Handle type="target" id="t-right" position={Position.Right} isConnectable={false} style={HIDDEN} />
      <Handle type="target" id="t-top" position={Position.Top} isConnectable={false} style={HIDDEN} />
      <Handle type="target" id="t-bottom" position={Position.Bottom} isConnectable={false} style={HIDDEN} />
      <div
        onDoubleClick={() => onOpen(id)}
        className={cn(
          base,
          shape === "circle" &&
            (root
              ? "h-28 w-28 rounded-full bg-accent p-3 font-serif font-semibold text-on-accent"
              : "h-20 w-20 rounded-full border-[1.5px] border-line-strong bg-surface p-2"),
          shape === "rect" && depth <= 1 &&
            "min-h-[52px] w-[136px] gap-1.5 rounded-rect border-[1.5px] border-line-strong bg-surface px-3 py-2 text-[14.5px] shadow-[0_1px_2px_rgba(0,0,0,.05)]",
          shape === "rect" && depth > 1 &&
            "min-h-10 w-[120px] rounded-rect border border-line bg-surface px-2.5 py-1.5 text-[13px] leading-[17px]",
          shape === "square" &&
            "h-20 w-20 rounded-rect border-[1.5px] border-line-strong bg-surface p-2",
          shape === "diamond" && "h-16 w-[124px] p-2",
          shape === "pill" &&
            "h-12 w-[148px] rounded-full border-[1.5px] border-line-strong bg-surface px-4 text-[13.5px]",
          shape === "hex" && "h-[108px] w-[136px] p-3 text-[13px] leading-[17px]",
          sel && shape !== "circle" && "border-2 border-accent bg-accent-soft text-accent-ink",
          sel && shape === "circle" && !root && "border-2 border-accent bg-accent-soft text-accent-ink",
        )}
        style={
          shape === "diamond"
            ? {
                clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)",
                background: sel ? "var(--accent-soft)" : "var(--surface-2)",
                color: sel ? "var(--accent-ink)" : "var(--ink)",
              }
            : shape === "hex"
              ? {
                  clipPath:
                    "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)",
                  background: sel ? "var(--accent-soft)" : "var(--surface-2)",
                  color: sel ? "var(--accent-ink)" : "var(--ink)",
                }
              : undefined
        }
      >
        <span className="line-clamp-3">{text}</span>
      </div>

      <Handle type="source" id="s-left" position={Position.Left} isConnectable={false} style={HIDDEN} />
      <Handle type="source" id="s-right" position={Position.Right} isConnectable={false} style={HIDDEN} />
      <Handle type="source" id="s-top" position={Position.Top} isConnectable={false} style={HIDDEN} />
      <Handle type="source" id="s-bottom" position={Position.Bottom} isConnectable={false} style={HIDDEN} />

      {sel && (
        <div className="absolute -right-4 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
          <button
            type="button"
            aria-label="Ajouter un nœud enfant"
            onClick={(event) => {
              event.stopPropagation();
              onAdd(id);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-on-accent shadow-float"
          >
            <Plus size={16} weight="bold" />
          </button>
          <button
            type="button"
            aria-label="Modifier le nœud"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(id);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-float"
          >
            <PencilSimple size={14} weight="bold" />
          </button>
        </div>
      )}
    </div>
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
