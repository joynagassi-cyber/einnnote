import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EdgePaint, MindNode } from "@/types";
import type { MindDirection } from "@/stores/useContentStore";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { graphStyleById } from "@/lib/graph/styles";
import { GRAPH_EDGE_TYPES } from "@/lib/graph/edges";
import { canvasGap, canvasSize, canvasVariant } from "@/lib/graph/background";
import { MapDock } from "@/components/canvas/MapDock";
import { EinnoteNode } from "@/components/canvas/mindFlow";
import { toFlow, type FlowNode } from "@/components/canvas/flowData";

/**
 * La planche — un canevas de carte mentale, sans la page autour.
 *
 * C’est la **deuxième surface** qui dessine une carte, et elle dessine
 * exactement la même : mêmes nœuds, mêmes traits, même barre flottante. La
 * différence est ce qu’on met à côté — ici, le texte de la note.
 *
 * Ce que la planche ne fait pas : changer de style de graphe, appliquer un
 * modèle, afficher la mini-carte. Ces trois gestes appartiennent à la page
 * Carte mentale, qui les tient avec le reste de ses réglages. Les dédoubler ici
 * aurait donné deux endroits pour la même décision.
 */
export function MindCanvas({
  mapId,
  className,
  onOpenFull,
}: {
  mapId: string;
  className?: string;
  /** « Ouvrir la planche » — la page complète, si l’appelant en a une */
  onOpenFull?: () => void;
}) {
  const map = useContentStore((s) => s.mindmaps.find((m) => m.id === mapId));
  const addMindNode = useContentStore((s) => s.addMindNode);
  const addMindNodeAt = useContentStore((s) => s.addMindNodeAt);
  const updateMindNode = useContentStore((s) => s.updateMindNode);
  const updateMindEdge = useContentStore((s) => s.updateMindEdge);

  const style = graphStyleById(map?.styleId);
  /* Même règle que la page Carte mentale : un seul fond, porté par le canevas. */
  const background = canvasVariant(useAppStore((s) => s.settings.canvas));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [snap, setSnap] = useState(true);
  /* Replié au départ : sur un canevas, le premier regard doit aller au dessin. */
  const [dockOpen, setDockOpen] = useState(false);
  const [defaultShape, setDefaultShape] = useState<MindNode["shape"]>("rect");
  const [flow, setFlow] = useState<ReactFlowInstance<FlowNode, Edge> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const addChild = useCallback(
    (parentId: string, direction: MindDirection) => {
      const created = addMindNode(mapId, parentId, defaultShape, direction);
      if (created) setSelectedId(created);
    },
    [addMindNode, defaultShape, mapId],
  );

  const createShape = useCallback(
    (shape: MindNode["shape"]) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      const center =
        flow && rect
          ? flow.screenToFlowPosition({
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
            })
          : { x: 0, y: 0 };
      const drift = (map?.nodes.length ?? 0) * 14;
      setDefaultShape(shape);
      setSelectedId(
        addMindNodeAt(mapId, {
          x: center.x - 60 + drift,
          y: center.y - 26 + drift,
          shape,
        }),
      );
    },
    [addMindNodeAt, flow, map?.nodes.length, mapId],
  );

  const handlers = useMemo(
    () => ({
      onAdd: addChild,
      onOpen: (nodeId: string) => setSelectedId(nodeId),
      onResize: (nodeId: string, size: { x: number; y: number; w: number; h: number }) =>
        updateMindNode(mapId, nodeId, size),
    }),
    [addChild, mapId, updateMindNode],
  );

  const initial = useMemo(
    () => (map ? toFlow(map, handlers, null, style) : { nodes: [], edges: [] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);

  const nodesKey = (map?.nodes ?? [])
    .map(
      (node) =>
        `${node.id}:${node.text}:${node.shape}:${node.x}:${node.y}:${node.w ?? 0}x${node.h ?? 0}:${JSON.stringify(node.paint ?? null)}`,
    )
    .join("|");
  const edgesKey = (map?.edges ?? [])
    .map((edge) => `${edge.id}:${JSON.stringify(edge.paint ?? null)}`)
    .join("|");

  useEffect(() => {
    if (!map) return;
    const next = toFlow(map, handlers, selectedId, style);
    setNodes(next.nodes);
    setEdges(next.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesKey, edgesKey, map?.edgeStyle, map?.styleId, selectedId]);

  const selected = map?.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedEdge = map?.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  if (!map) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[13.5px] text-muted">
        Cette note n’a pas encore de planche.
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`relative h-full w-full ${className ?? ""}`}>
      <ReactFlow
        onInit={setFlow}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={{ engram: EinnoteNode }}
        edgeTypes={GRAPH_EDGE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.28, minZoom: 0.4, maxZoom: 1 }}
        minZoom={0.08}
        maxZoom={2.4}
        panOnScroll
        zoomOnPinch
        selectionKeyCode="Shift"
        snapToGrid={snap}
        snapGrid={[16, 16]}
        onNodeClick={(_, node) => {
          setSelectedId(node.id);
          setSelectedEdgeId(null);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          setSelectedId(null);
          setDockOpen(true);
        }}
        onPaneClick={() => {
          setSelectedId(null);
          setSelectedEdgeId(null);
        }}
        onNodeDragStop={(_, node) =>
          updateMindNode(mapId, node.id, {
            x: Math.round(node.position.x),
            y: Math.round(node.position.y),
          })
        }
        proOptions={{ hideAttribution: true }}
        aria-label={`Planche de la note — ${map.nodes.length} formes`}
        className="[&_.react-flow__pane]:cursor-default"
      >
        {background && (
          <Background
            variant={background}
            gap={canvasGap(background)}
            size={canvasSize(background)}
            color="var(--canvas-dot)"
          />
        )}
      </ReactFlow>

      {onOpenFull && (
        <button
          type="button"
          onClick={onOpenFull}
          className="absolute right-3 top-3 z-10 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-accent shadow-float"
        >
          Ouvrir la planche
        </button>
      )}

      <MapDock
        open={dockOpen}
        onToggle={() => setDockOpen((value) => !value)}
        selected={selected ?? undefined}
        edge={selectedEdge ?? null}
        snap={snap}
        onSnap={() => setSnap((value) => !value)}
        onShape={(shape) => (selected ? updateMindNode(mapId, selected.id, { shape }) : createShape(shape))}
        onPaintNode={(patch: Partial<NonNullable<MindNode["paint"]>>) => {
          if (!selected) return;
          updateMindNode(mapId, selected.id, { paint: { ...(selected.paint ?? {}), ...patch } });
        }}
        size={
          selected
            ? {
                w: nodes.find((n) => n.id === selected.id)?.data.w ?? 0,
                h: nodes.find((n) => n.id === selected.id)?.data.h ?? 0,
              }
            : undefined
        }
        onSize={(size) => {
          if (!selected) return;
          updateMindNode(mapId, selected.id, size ?? { w: undefined, h: undefined });
        }}
        onPaintEdge={(patch: Partial<EdgePaint>) => {
          if (!selectedEdge) return;
          updateMindEdge(mapId, selectedEdge.id, {
            paint: { ...(selectedEdge.paint ?? {}), ...patch },
          });
        }}
      />
    </div>
  );
}
