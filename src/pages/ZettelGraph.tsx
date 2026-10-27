import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useNodesState,
  useEdgesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Crosshair,
  DownloadSimple,
  Graph,
  Plus,
  SlidersHorizontal,
  Sparkle,
  TreeStructure,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen, Sheet } from "@/components/Layout";
import { GraphStyleGallery } from "@/components/GraphStyleGallery";
import { GraphExchange } from "@/components/GraphExchange";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import {
  CARD_H,
  CARD_W,
  layoutZettelGraph,
  zettelGraph,
  type ZettelGraph as ZettelGraphModel,
  type ZettelPosition,
} from "@/lib/graph/zettel";
import { graphStyleById, type GraphStyle } from "@/lib/graph/styles";
import { GRAPH_EDGE_TYPES } from "@/lib/graph/edges";
import { linkLabel } from "@/lib/graph/labels";
import type { GraphDocument } from "@/lib/graph/export";
import type { ZettelCard } from "@/types";

type FicheData = {
  code: string;
  title: string;
  refs: number;
  root: boolean;
  detached: boolean;
  depth: number;
};

type FicheNode = Node<FicheData, "fiche">;

const BACKGROUNDS: Record<string, BackgroundVariant | null> = {
  dots: BackgroundVariant.Dots,
  lines: BackgroundVariant.Lines,
  cross: BackgroundVariant.Cross,
  none: null,
};

/**
 * Le graphe d’un coffre Zettelkasten.
 *
 * Décision de conception : **la vue par défaut est un arbre**, pas une pelote.
 * Un coffre de 13 fiches citées dans tous les sens produit un graphe illisible
 * si on dessine tous les liens à plat ; un arbre (BFS depuis la fiche la plus
 * citée) montre la structure, et les liens hors arbre restent visibles en
 * « renvois » plus fins. C’est la distinction structure / références croisées
 * que pratiquent les vrais outils Zettelkasten.
 *
 * La présentation (disposition + forme des liens) vient de `GRAPH_STYLES` ;
 * le choix est mémorisé dans les réglages, donc chaque coffre s’ouvre avec le
 * style préféré, et le style par défaut de l’application est « Arbre binaire ».
 */
export default function ZettelGraph() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const desktop = useIsDesktop();

  const vault = useContentStore((s) => s.vaults.find((item) => item.id === id));
  const allCards = useContentStore((s) => s.zettel);
  const graphStyle = useAppStore((s) => s.settings.graphStyle);
  const setGraphStyle = useAppStore((s) => s.setGraphStyle);
  const graphLabels = useAppStore((s) => s.settings.graphLabels);
  const graphEchoes = useAppStore((s) => s.settings.graphEchoes);
  const graphAnimate = useAppStore((s) => s.settings.graphAnimate);
  const setGraphDisplay = useAppStore((s) => s.setGraphDisplay);

  const createVault = useContentStore((s) => s.createVault);
  const addZettelCard = useContentStore((s) => s.addZettelCard);
  const updateZettelCard = useContentStore((s) => s.updateZettelCard);

  const style = graphStyleById(graphStyle);
  const [pickedStyle, setPickedStyle] = useState<string | null>(null);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [rootCode, setRootCode] = useState<string | null>(params.get("card"));
  const [rootPickOpen, setRootPickOpen] = useState(false);
  const [epoch, setEpoch] = useState(0);

  const cards = useMemo(
    () =>
      allCards
        .filter((card) => card.vaultId === id)
        .sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true })),
    [allCards, id],
  );

  const graph = useMemo(
    () => zettelGraph(cards, rootCode),
    [cards, rootCode],
  );
  const layout = useMemo(
    () => layoutZettelGraph(graph, style.layout),
    [graph, style.layout],
  );

  const display = useMemo(
    () => ({ labels: graphLabels, echoes: graphEchoes, animate: graphAnimate }),
    [graphLabels, graphEchoes, graphAnimate],
  );

  const flow = useMemo(
    () => toFlow(cards, graph, layout.positions, style, display),
    [cards, graph, layout, style, display],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FicheNode>(flow.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(flow.edges);

  const signature = [
    style.id,
    display.labels ? "l1" : "l0",
    display.echoes ? "e1" : "e0",
    display.animate ? "a1" : "a0",
    rootCode ?? "",
    epoch,
    cards.map((card) => `${card.code}:${card.title}:${card.refs.length}`).join("|"),
  ].join("~");
  useEffect(() => {
    /* Le canevas est piloté par le modèle : style, racine ou nombre de fiches
       changent → on remplace les nœuds. Les déplacements à la main restent
       locaux (ils ne sont pas une donnée de la fiche). */
    setNodes(flow.nodes);
    setEdges(flow.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!vault) {
    return (
      <Screen className="px-5">
        <AppBar back title="" />
        <EmptyState
          icon={Graph}
          title="Coffre introuvable"
          description="Ce coffre n’existe plus."
        />
      </Screen>
    );
  }

  if (!cards.length) {
    return (
      <Screen className="px-5">
        <AppBar back onBack={() => navigate(`/vault/${id}`)} title={`Coffre · ${vault.name}`} />
        <EmptyState
          icon={Graph}
          title="Pas encore de réseau"
          description="Les fiches d’un coffre apparaissent ici dès la première carte créée."
          action={
            <button className="btn-primary" onClick={() => navigate(`/vault/${id}/new`)}>
              Créer une fiche
            </button>
          }
        />
      </Screen>
    );
  }

  const background = BACKGROUNDS[style.background];
  const rootCard = cards.find((card) => card.code === graph.rootCode);
  const dashed = Boolean(style.dashed);

  return (
    <div className="paper screen screen-wide" data-canvas="dots">
      <div className="sticky top-0 z-20 glass">
        <AppBar
          back
          onBack={() => navigate(`/vault/${id}`)}
          center={false}
          title={`Graphe · ${vault.name}`}
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStylesOpen(true)}
                aria-label="Styles de graphe"
                className={cn(
                  "h-10 text-accent",
                  desktop
                    ? "pill gap-1.5 px-3 text-[13.5px] font-semibold"
                    : "icon-btn w-10",
                )}
              >
                <Sparkle size={desktop ? 16 : 19} weight="fill" aria-hidden />
                {desktop && "Style"}
              </button>
              <button
                type="button"
                onClick={() => setDisplayOpen(true)}
                aria-label="Affichage et export"
                className={cn(
                  "h-10 text-ink",
                  desktop
                    ? "pill gap-1.5 px-3 text-[13.5px] font-semibold"
                    : "icon-btn w-10",
                )}
              >
                <SlidersHorizontal size={desktop ? 16 : 19} aria-hidden />
                {desktop && "Affichage"}
              </button>
              <button
                type="button"
                onClick={() => setRootPickOpen(true)}
                aria-label="Choisir la fiche racine"
                className={cn(
                  "h-10 text-ink",
                  desktop
                    ? "pill gap-1.5 px-3 text-[13.5px] font-semibold"
                    : "icon-btn w-10",
                )}
              >
                <TreeStructure size={desktop ? 16 : 19} aria-hidden />
                {desktop && "Racine"}
              </button>
            </div>
          }
        />
      </div>

      <div className="flex-1 px-4 pt-2 lg:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
          <span className="font-semibold text-ink">
            {cards.length} fiche{cards.length > 1 ? "s" : ""}
          </span>
          <span>{graph.treeLinks.length} liens d’arbre</span>
          <span>{graph.echoes.length} renvois</span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="h-px w-5 bg-accent" aria-hidden /> arbre
            <span className="ml-2 h-px w-5 border-t border-dashed border-accent" aria-hidden /> renvoi
          </span>
          {graph.nodes.some((node) => node.detached) && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px]">
              {graph.nodes.filter((node) => node.detached).length} hors arbre
            </span>
          )}
        </div>
      </div>

      <div className="relative mt-2 flex-1">
        <ReactFlow
          key={`${epoch}-${style.id}`}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={{ fiche: FicheNodeView }}
          edgeTypes={GRAPH_EDGE_TYPES}
          fitView
          /* Un arbre de 12 fiches fait ~2000 px de large : le montrer entier sur
             un téléphone rendrait les titres illisibles. On plafonne donc le
             dézoom initial et on laisse paner — c’est le comportement des vrais
             outils de graphe. « Recentrer » recadre. */
          fitViewOptions={{
            padding: 0.26,
            minZoom: desktop ? 0.55 : 0.42,
            maxZoom: 1.1,
          }}
          minZoom={0.2}
          maxZoom={1.8}
          panOnScroll
          zoomOnPinch
          selectionOnDrag={false}
          onNodeClick={(_, node) =>
            navigate(`/vault/${id}?card=${encodeURIComponent((node.data as FicheData).code)}`)
          }
          proOptions={{ hideAttribution: true }}
          aria-label={`Graphe du coffre ${vault.name} — ${cards.length} fiches, racine ${graph.rootCode}, style ${style.label}`}
          className="[&_.react-flow__pane]:cursor-default"
        >
          {background && (
            <Background
              variant={background}
              gap={background === BackgroundVariant.Cross ? 64 : 24}
              size={background === BackgroundVariant.Dots ? 1.3 : 1}
              color="var(--canvas-dot)"
            />
          )}
          {desktop && (
            <>
              <Controls
                showInteractive={false}
                position="bottom-left"
                className="!bottom-28 !left-4 !rounded-rect !border !border-line !bg-surface !shadow-float [&_button]:!border-line [&_button]:!bg-surface [&_button]:!fill-ink"
              />
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                ariaLabel="Aperçu du graphe"
                className="!bottom-28 !right-4 !rounded-rect !border !border-line !bg-surface"
                maskColor="var(--surface-2)"
                nodeColor={(node) =>
                  (node.data as FicheData).root ? "var(--accent)" : "var(--line-strong)"
                }
                nodeStrokeWidth={0}
                nodeBorderRadius={3}
              />
            </>
          )}
        </ReactFlow>
      </div>

      <div className="dock pointer-events-none fixed inset-x-0 bottom-[calc(16px+var(--safe-bottom))] z-20 mx-auto flex gap-2.5 px-4 lg:max-w-[560px]">
        <button
          type="button"
          className="btn-secondary pointer-events-auto h-14 flex-1 rounded-big"
          onClick={() => setEpoch((value) => value + 1)}
        >
          <Crosshair size={19} aria-hidden />
          Recentrer
        </button>
        <button
          type="button"
          className="btn-primary pointer-events-auto h-14 flex-[1.6] rounded-big text-[16px]"
          onClick={() =>
            navigate(
              `/vault/${id}?card=${encodeURIComponent(rootCard?.code ?? cards[0].code)}`,
            )
          }
        >
          Ouvrir la fiche
        </button>
      </div>

      {/* Style : la présentation, séparée de la structure */}
      <Sheet
        open={stylesOpen}
        onClose={() => {
          setStylesOpen(false);
          setPickedStyle(null);
        }}
        title={`Styles · ${style.label}`}
        size="wide"
      >
        <p className="mb-3 text-[13.5px] leading-[20px] text-muted">
          Un style ne change pas vos fiches : il change la façon de les dessiner.
          La disposition et la forme des liens sont appliquées tout de suite ;
          le choix est mémorisé, donc le prochain graphe s’ouvrira ainsi.
        </p>
        <GraphStyleGallery
          scope="zettel"
          selectedId={pickedStyle ?? style.id}
          onPick={(picked) => {
            setPickedStyle(picked.id);
            setGraphStyle(picked.id);
            setEpoch((value) => value + 1);
          }}
        />
        <p className="mt-3 text-[12px] leading-[17px] text-muted">
          Aperçus calculés avec les mêmes fonctions que le canevas. Provenance :
          exemples React Flow `FloatingEdges`, `EdgeRouting`, `EdgeTypes`,
          `Backgrounds` — voir `docs/GRAPH.md`.
        </p>
      </Sheet>

      {/* Affichage, export, reprise : ce qu’on voit est ce qu’on emporte */}
      <Sheet
        open={displayOpen}
        onClose={() => setDisplayOpen(false)}
        title="Affichage et export"
      >
        <GraphExchange
          input={{ vault, cards, graph, positions: layout.positions, style }}
          style={style}
          display={display}
          onDisplay={(patch) => setGraphDisplay(patch)}
          onImport={(document) => {
            /* Un fichier validé devient un coffre neuf : on crée les fiches,
               puis on leur rend leur code d’origine (le magasin en attribue un
               autre à la création). Aucune fiche existante n’est touchée. */
            const created = createVault({
              name: document.vault.name,
              projectId: vault.projectId,
              note: `Importé le ${new Date(document.exportedAt).toLocaleDateString("fr-FR")} · style ${document.style}`,
            });
            for (const card of [...document.cards].reverse()) {
              const made = addZettelCard({
                vaultId: created.id,
                title: card.title,
                body: card.body ?? "",
                source: card.source ?? "",
                refs: card.refs ?? [],
              });
              updateZettelCard(made.id, { code: card.code, refs: card.refs ?? [] });
            }
            setDisplayOpen(false);
            navigate(`/vault/${created.id}/graph`);
          }}
        />
      </Sheet>

      {/* Racine : voir le coffre depuis une autre fiche */}
      <Sheet
        open={rootPickOpen}
        onClose={() => setRootPickOpen(false)}
        title="Voir depuis…"
      >
        <p className="mb-2 text-[13.5px] leading-[20px] text-muted">
          L’arbre part de la fiche la plus citée. Choisissez-en une autre pour
          relire le coffre depuis cette idée.
        </p>
        <ul className="flex flex-col gap-1.5">
          {cards.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => {
                  setRootCode(card.code);
                  setRootPickOpen(false);
                  setEpoch((value) => value + 1);
                }}
                aria-pressed={card.code === graph.rootCode}
                className={cn(
                  "flex w-full items-center gap-2 rounded-field border px-3 py-2 text-left",
                  card.code === graph.rootCode
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <span className="shrink-0 text-[12px] font-bold text-accent">
                  {card.code}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px]">{card.title}</span>
                {card.code === graph.rootCode && (
                  <span className="shrink-0 text-[11px] font-semibold text-accent">racine</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Traduction modèle → React Flow                                      */
/* ------------------------------------------------------------------ */

function toFlow(
  cards: ZettelCard[],
  graph: ZettelGraphModel,
  positions: ZettelPosition[],
  style: GraphStyle,
  display: { labels: boolean; echoes: boolean; animate: boolean },
): { nodes: FicheNode[]; edges: Edge[] } {
  const labelsEnabled = display.labels;
  const { echoes, animate } = display;
  const byCode = new Map(cards.map((card) => [card.code, card]));
  const boxOf = new Map(
    positions.map((position) => [
      position.code,
      { x: position.x, y: position.y, width: CARD_W, height: CARD_H },
    ]),
  );
  const refCount = new Map<string, number>();
  for (const link of graph.links) {
    refCount.set(link.source, (refCount.get(link.source) ?? 0) + 1);
  }

  const nodes: FicheNode[] = positions.flatMap((position) => {
    const card = byCode.get(position.code);
    if (!card) return [];
    return [
      {
        id: position.code,
        type: "fiche" as const,
        position: { x: position.x, y: position.y },
        data: {
          code: card.code,
          title: card.title,
          refs: refCount.get(card.code) ?? 0,
          root: position.root,
          detached: position.detached,
          depth: position.depth,
        },
      },
    ];
  });

  const weight = style.weight ?? 2;
  const marker = style.arrow
    ? { type: MarkerType.ArrowClosed, width: 13, height: 13, color: "var(--accent)" }
    : undefined;

  const edgeOf = (source: string, target: string, echo: boolean): Edge | null => {
    const a = boxOf.get(source);
    const b = boxOf.get(target);
    if (!a || !b) return null;
    const label = linkLabel(cards, source, target);
    return {
      id: `${echo ? "echo" : "tree"}-${source}-${target}`,
      source,
      target,
      /* Une seule arête maison : elle calcule son accroche sur le bord réel des
         deux cartes et porte l’étiquette de relation sur son propre chemin. */
      type: "engram",
      data: {
        kind: style.edge,
        echo,
        /* Un lien d’arbre sans citation déclarée n’a pas de relation à
           nommer : « lien » n’apprend rien et alourdit le canevas. L’export
           applique exactement la même règle. */
        label: label.relation === "lie" ? undefined : label.label,
        labels: labelsEnabled,
        animate,
        weight,
        dashed: style.dashed,
      },
      style: { stroke: "var(--accent)" },
      ...(echo || !marker ? {} : { markerEnd: marker }),
    };
  };

  const edges: Edge[] = [
    ...graph.treeLinks.map((link) => edgeOf(link.source, link.target, false)),
    ...(echoes ? graph.echoes.map((link) => edgeOf(link.source, link.target, true)) : []),
  ].filter((edge): edge is Edge => Boolean(edge));

  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/* Carte-fiche                                                         */
/* ------------------------------------------------------------------ */

function FicheNodeView({ data }: NodeProps<FicheNode>) {
  const { code, title, refs, root, detached } = data;
  return (
    <div className="group relative">
      <div
        style={{ width: CARD_W, minHeight: CARD_H }}
        className={cn(
          "flex flex-col justify-center gap-1 rounded-card border bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,.06)] transition-colors",
          root
            ? "border-2 border-accent bg-accent-soft"
            : "border-[1.5px] border-line-strong group-hover:border-accent",
          detached && "border-dashed opacity-90",
        )}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[11.5px] font-bold tracking-wide text-accent">{code}</span>
          {detached && (
            <span className="rounded-full bg-surface-2 px-1.5 text-[9.5px] font-semibold uppercase tracking-wide text-muted">
              hors arbre
            </span>
          )}
          {refs > 0 && (
            <span className="ml-auto text-[10.5px] text-muted">
              {refs} lien{refs > 1 ? "s" : ""}
            </span>
          )}
        </span>
        <span className="line-clamp-2 font-serif text-[14.5px] font-semibold leading-[18px]">
          {title}
        </span>
      </div>
    </div>
  );
}
