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
  Circle,
  Diamond,
  Hexagon,
  ListBullets,
  Palette,
  Plus,
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
import { MapDock } from "@/components/canvas/MapDock";
import {
  EinnoteNode,
  toFlow,
  type FlowNode,
  type FlowNodeData,
} from "@/components/canvas/mindFlow";

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
  const [flow, setFlow] = useState<ReactFlowInstance<FlowNode, Edge> | null>(null);
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
