import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowRight, Graph, Stack } from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { projectGraphModel, projectLayout } from "@/lib/graph/project";
import { cn } from "@/lib/utils";

/**
 * **Le graphe du projet** — la vue qui manquait.
 *
 * Le graphe d'un vault montre des fiches. Monter ce même graphe au niveau du
 * projet afficherait trois cents nœuds et ne dirait rien. Ce qu'un projet a à
 * montrer est d'une autre nature : quels vaults se parlent. Une arête signifie
 * « une fiche de ce vault renvoie à une fiche de cet autre », et son épaisseur
 * est le nombre de ces renvois.
 *
 * C'est une carte de la pensée du projet, pas une carte de son contenu : elle
 * répond à « est-ce que mes deux vaults traitent vraiment de la même chose ? »
 * et à « lequel ne parle à personne ? ».
 */

type VaultNodeData = {
  label: string;
  count: number;
  outgoing: number;
  incoming: number;
  loose: boolean;
};

function VaultNode({ data }: NodeProps<Node<VaultNodeData>>) {
  return (
    <div
      className={cn(
        "w-[180px] rounded-card border bg-surface px-3 py-2 shadow-sm",
        data.loose ? "border-dashed border-line-strong" : "border-line",
        data.incoming + data.outgoing > 0 && "border-accent/60",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !bg-accent" />
      <p className="truncate font-serif text-[14px] font-semibold leading-tight">{data.label}</p>
      <p className="mt-0.5 text-[11px] text-muted">
        {data.count} fiche{data.count > 1 ? "s" : ""} · {data.outgoing} sortant
        {data.outgoing > 1 ? "s" : ""} · {data.incoming} entrant
        {data.incoming > 1 ? "s" : ""}
      </p>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !bg-accent" />
    </div>
  );
}

const nodeTypes = { vaultNode: VaultNode };

export default function ProjectGraph() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const desktop = useIsDesktop();

  const projects = useContentStore((s) => s.projects);
  const vaults = useContentStore((s) => s.vaults);
  const zettel = useContentStore((s) => s.zettel);

  const project = projects.find((entry) => entry.id === id);
  const ownVaults = useMemo(
    () => vaults.filter((vault) => vault.projectId === id),
    [vaults, id],
  );

  const model = useMemo(() => {
    const vaultIds = new Set(ownVaults.map((vault) => vault.id));
    return projectGraphModel({
      vaults: ownVaults,
      cards: zettel.filter((card) => vaultIds.has(card.vaultId)),
    });
  }, [ownVaults, zettel]);

  const positions = useMemo(() => projectLayout(model, { radius: 200 }), [model]);

  const nodes: Node<VaultNodeData>[] = model.nodes.map((node) => {
    const point = positions.get(node.id) ?? { x: 0, y: 0 };
    return {
      id: node.id,
      type: "vaultNode",
      position: { x: point.x - 90, y: point.y - 30 },
      data: {
        label: node.label,
        count: node.count,
        outgoing: node.outgoing,
        incoming: node.incoming,
        loose: node.kind === "loose",
      },
      draggable: true,
    };
  });

  const edges = model.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: `${edge.weight}`,
    labelStyle: { fontSize: 11, fill: "var(--muted)" },
    labelBgStyle: { fill: "var(--surface)" },
    style: {
      stroke: "var(--accent)",
      strokeWidth: Math.min(4, 1 + edge.weight * 0.6),
      opacity: 0.75,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)", width: 14, height: 14 },
  }));

  if (!project) {
    return (
      <Screen className="px-5">
        <AppBar back onBack={() => navigate("/spaces")} title="Graphe du projet" />
        <EmptyState
          icon={Graph}
          title="Projet introuvable"
          description="Ce projet a peut-être été supprimé."
          action={
            <button type="button" className="btn-primary" onClick={() => navigate("/spaces")}>
              Voir les projets
            </button>
          }
        />
      </Screen>
    );
  }

  const isolated = model.nodes.filter((node) => model.isolated.includes(node.id));

  return (
    <Screen className="px-5 lg:px-8" withNav>
      <AppBar
        back
        onBack={() => navigate(`/spaces/${project.id}`)}
        title={`Graphe · ${project.name}`}
      />

      <header className="mt-1">
        <h1 className="font-serif text-[26px] font-semibold leading-tight">Graphe du projet</h1>
        <p className="mt-1 max-w-[62ch] text-[13.5px] leading-[20px] text-muted">
          Un nœud par vault, une flèche par renvoi croisé — une fiche de ce vault cite une
          fiche de celui-là. L’épaisseur compte les renvois.
        </p>
      </header>

      {model.nodes.length === 0 ? (
        <EmptyState
          icon={Stack}
          title="Rien à relier"
          description="Ce projet n’a pas encore de vault, donc pas de fiches à relier."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate(`/spaces/${project.id}`)}
            >
              Ouvrir le projet
            </button>
          }
        />
      ) : (
        <div
          className={cn(
            "mt-4 grid gap-3",
            desktop ? "grid-cols-[minmax(0,1fr)_260px]" : "grid-cols-1",
          )}
        >
          <div className="h-[58vh] min-h-[320px] overflow-hidden rounded-card border border-line bg-surface">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.4}
              maxZoom={1.4}
              proOptions={{ hideAttribution: true }}
              aria-label={`Graphe du projet ${project.name}`}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>

          <aside className="rounded-card border border-line bg-surface p-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">
              Vaults · {model.nodes.length}
            </h2>
            <ul className="mt-2 flex flex-col gap-1">
              {model.nodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        node.kind === "loose"
                          ? `/spaces/${project.id}`
                          : `/vault/${node.id}/graph`,
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-field px-2 py-1.5 text-left hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-[13px]">{node.label}</span>
                    <span className="shrink-0 text-[11px] text-muted">
                      {node.count} fiche{node.count > 1 ? "s" : ""}
                    </span>
                    <ArrowRight size={13} className="shrink-0 text-muted" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>

            {isolated.length > 0 && (
              <p className="mt-3 rounded-field bg-surface-2 px-2 py-1.5 text-[11.5px] leading-[16px] text-muted">
                {isolated.length} nœud{isolated.length > 1 ? "s" : ""} sans renvoi croisé :{" "}
                {isolated.map((node) => node.label).join(", ")}
                . Rien d’anormal s’ils traitent d’un sujet à part — sinon, un renvoi manque.
              </p>
            )}

            <p className="mt-3 text-[11.5px] leading-[16px] text-muted">
              S’il reste des fiches hors vault, elles apparaissent en pointillés — c’est le
              signe qu’elles n’ont pas encore trouvé leur question.
            </p>
          </aside>
        </div>
      )}

      <div className="h-24" />
    </Screen>
  );
}
