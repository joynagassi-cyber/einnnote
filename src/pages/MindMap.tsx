import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNoteStore } from "@/stores/useNoteStore";
import { useAppStore } from "@/stores/useAppStore";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import { HeaderBar } from "@/components/ui/HeaderBar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ArrowLeft,
  Plus,
  Circle,
  Square,
  Rectangle,
  Diamond,
  Trash,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Shape = "circle" | "rect" | "square" | "diamond";

interface MMNode {
  id: string;
  x: number;
  y: number;
  shape: Shape;
  text: string;
  color?: string;
}

interface MMEdge {
  id: string;
  source: string;
  target: string;
}

const SHAPES: { id: Shape; icon: typeof Circle }[] = [
  { id: "circle", icon: Circle },
  { id: "rect", icon: Square },
  { id: "square", icon: Square },
  { id: "diamond", icon: Diamond },
];

export default function MindMapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getNote, updateNote } = useNoteStore();

  const [nodes, setNodes] = useState<MMNode[]>([
    { id: "n1", x: 400, y: 250, shape: "circle", text: "Idée centrale", color: "hsl(var(--accent))" },
  ]);
  const [edges, setEdges] = useState<MMEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showShapePicker, setShowShapePicker] = useState(false);
  const { settings } = useAppStore();

  const note = id ? getNote(id) : null;

  useEffect(() => {
    if (note?.contentJson?.nodes) {
      setNodes(note.contentJson.nodes);
      setEdges(note.contentJson.edges || []);
    }
  }, [note?.id]);

  const save = useCallback(() => {
    if (!note) return;
    updateNote(note.id, {
      contentJson: { ...note.contentJson, nodes, edges },
      updatedAt: new Date().toISOString(),
    });
  }, [note, nodes, edges, updateNote]);

  useEffect(() => {
    const t = setTimeout(save, 300);
    return () => clearTimeout(t);
  }, [nodes, edges, save]);

  const addNode = (parent?: string) => {
    const id = `mn-${Date.now()}`;
    const parentNode = parent ? nodes.find((n) => n.id === parent) : null;
    const x = parentNode ? parentNode.x + (Math.random() - 0.5) * 200 : 400;
    const y = parentNode ? parentNode.y + (Math.random() - 0.5) * 150 : 250;
    const newNode: MMNode = { id, x, y, shape: "rect", text: "Nouveau" };
    setNodes((prev) => [...prev, newNode]);
    if (parent) {
      setEdges((prev) => [...prev, { id: `me-${Date.now()}`, source: parent, target: id }]);
    }
    setEditingId(id);
    setEditText("Nouveau");
  };

  const updateNode = (nodeId: string, updates: Partial<MMNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)));
  };

  const deleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedId(null);
  };

  const setShape = (nodeId: string, shape: Shape) => {
    updateNode(nodeId, { shape });
    setShowShapePicker(false);
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <DesktopSidebar />
      <PageShell padding="p-0" className="!max-w-none relative overflow-hidden">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
            <ArrowLeft weight="bold" className="w-5 h-5" />
          </button>
          {note && (
            <span className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] font-literata font-semibold text-[var(--ink)] text-sm">
              {note.title}
            </span>
          )}
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <EmptyState
              icon={Plus}
              title="Créez votre première carte"
              description="Ajoutez un nœud pour commencer à construire votre carte mentale."
              actionLabel="Ajouter un nœud"
              onAction={() => addNode()}
            />
          </div>
        )}

        {/* Canvas area */}
        <div className={cn("w-full h-screen relative overflow-auto", settings.canvasBg !== "blank" ? `canvas-${settings.canvasBg}` : "")}>
          <div className="relative min-w-full min-h-full" style={{ minHeight: "800px", minWidth: "800px" }}>
            {/* Edges (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {edges.map((e) => {
                const src = nodes.find((n) => n.id === e.source);
                const tgt = nodes.find((n) => n.id === e.target);
                if (!src || !tgt) return null;
                return (
                  <line
                    key={e.id}
                    x1={src.x + 60}
                    y1={src.y + 24}
                    x2={tgt.x + 60}
                    y2={tgt.y + 24}
                    stroke="var(--line)"
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedId === node.id;
              const isEditing = editingId === node.id;
              const ShapeComponent = {
                circle: Circle,
                rect: Square,
                square: Rectangle,
                diamond: Diamond,
              }[node.shape] ?? Square;

              return (
                <div
                  key={node.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); setShowShapePicker(false); }}
                  onDoubleClick={() => { setEditingId(node.id); setEditText(node.text); }}
                  className={cn(
                    "absolute cursor-pointer select-none group",
                    "transition-shadow duration-150",
                    isSelected && "ring-2 ring-[hsl(var(--accent))] ring-offset-2 rounded-2xl"
                  )}
                  style={{ left: node.x, top: node.y, zIndex: 2 }}
                >
                  <div className={cn(
                    "flex flex-col items-center gap-1 px-4 py-3 rounded-2xl min-w-[80px] max-w-[200px]",
                    "bg-[var(--surface)] border-2 shadow-sm",
                    isSelected ? "border-[hsl(var(--accent))]" : "border-[var(--line)]",
                    node.shape === "circle" && "rounded-full",
                    node.shape === "diamond" && "rotate-45 rounded-xl",
                    node.shape === "square" && "rounded-lg"
                  )}>
                    {node.shape === "diamond" && (
                      <span className="-rotate-45 font-literata text-sm font-medium text-[var(--ink)] text-center break-words">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => { updateNode(node.id, { text: editText }); setEditingId(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { updateNode(node.id, { text: editText }); setEditingId(null); } }}
                            className="w-full bg-transparent text-center font-literata text-sm outline-none"
                          />
                        ) : node.text}
                      </span>
                    )}
                    {node.shape !== "diamond" && isEditing ? (
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => { updateNode(node.id, { text: editText }); setEditingId(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { updateNode(node.id, { text: editText }); setEditingId(null); } }}
                        className="w-full bg-transparent text-center font-literata text-sm outline-none text-[var(--ink)]"
                      />
                    ) : (
                      <span className="font-literata text-sm font-medium text-[var(--ink)] text-center break-words">
                        {node.text}
                      </span>
                    )}
                  </div>

                  {/* Add button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); addNode(node.id); }}
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[hsl(var(--accent))] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] shadow-sm"
                    aria-label="Ajouter un nœud enfant"
                  >
                    <Plus weight="bold" className="w-4 h-4" />
                  </button>

                  {/* Delete button */}
                  {isSelected && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                      className="absolute -bottom-2 -left-2 w-7 h-7 rounded-full bg-[var(--danger)] text-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--danger)] shadow-sm"
                      aria-label="Supprimer le nœud"
                    >
                      <Trash weight="bold" className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Shape picker */}
                  {isSelected && showShapePicker && (
                    <div className="absolute top-full left-0 mt-2 bg-[var(--surface)] border border-[var(--line)] rounded-xl p-2 shadow-lg z-20 flex gap-1">
                      {SHAPES.map(({ id: sid, icon: Icon }) => (
                        <button
                          key={sid}
                          onClick={() => setShape(node.id, sid)}
                          className={cn(
                            "p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors focus:outline-none",
                            node.shape === sid && "bg-[hsl(var(--accent-soft))] text-[hsl(var(--accent))]"
                          )}
                        >
                          <Icon weight="fill" className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Shape toggle hint */}
        {selectedId && !showShapePicker && (
          <button
            onClick={() => setShowShapePicker(true)}
            className="fixed bottom-20 md:bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-lg font-inter text-sm text-[var(--muted)] hover:text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          >
            <Diamond weight="fill" className="w-4 h-4" /> Changer forme
          </button>
        )}
      </PageShell>
      <AppLayoutMobile />
    </div>
  );
}
