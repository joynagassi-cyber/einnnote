import { useMemo } from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  graphStylePreview,
  graphStylesFor,
  type GraphStyle,
} from "@/lib/graph/styles";
import { LAYOUT_LABELS } from "@/lib/mindmap/layout";

/**
 * Galerie de styles de graphe.
 *
 * Même principe que la galerie de modèles : **l’aperçu est calculé**, jamais
 * dessiné à la main. Les liens de la vignette sortent des mêmes fonctions que
 * le canevas (`floatingCurve`, `stepPath`, `ribbonPath`), donc un style ne peut
 * pas mentir sur son rendu.
 *
 * Ce que voit l’utilisateur en premier, c’est la **différence** : le trait. Le
 * nom vient ensuite, la provenance React Flow en dernier (utile à qui lit le
 * code, inutile à qui écrit ses fiches).
 */

function StylePreview({ style }: { style: GraphStyle }) {
  const preview = useMemo(() => graphStylePreview(style), [style]);
  const tapered = style.edge === "tapered";
  return (
    <svg
      viewBox={`0 0 ${preview.width} ${preview.height}`}
      className="h-full w-full"
      role="img"
      aria-label={`Aperçu du style ${style.label}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={`translate(${-preview.offset.x} ${-preview.offset.y})`}>
        {preview.edges.map((edge) =>
          tapered ? (
            <path
              key={edge.key}
              d={edge.d}
              fill="var(--accent)"
              opacity={edge.echo ? 0.35 : 0.85}
            />
          ) : (
            <path
              key={edge.key}
              d={edge.d}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={edge.echo ? 1 : (style.weight ?? 2) * 0.9}
              strokeLinecap="round"
              strokeDasharray={style.dashed ? "4 3" : undefined}
              opacity={edge.echo ? 0.4 : 0.8}
            />
          ),
        )}
      </g>
      {preview.nodes.map((node) => (
        <rect
          key={node.key}
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx={node.root ? 8 : 6}
          fill={node.root ? "var(--accent-soft)" : "var(--surface)"}
          stroke={node.root ? "var(--accent)" : "var(--line-strong)"}
          strokeWidth={node.root ? 1.6 : 1}
        />
      ))}
    </svg>
  );
}

export function GraphStyleGallery({
  scope,
  selectedId,
  onPick,
}: {
  scope: "mindmap" | "zettel";
  selectedId?: string | null;
  onPick: (style: GraphStyle) => void;
}) {
  const styles = graphStylesFor(scope);
  return (
    <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
      {styles.map((style) => {
        const active = selectedId === style.id;
        return (
          <li key={style.id}>
            <button
              type="button"
              onClick={() => onPick(style)}
              aria-pressed={active}
              aria-label={`Style ${style.label}`}
              className={cn(
                "flex h-full w-full flex-col overflow-hidden rounded-card border bg-surface text-left transition-colors",
                active
                  ? "border-2 border-accent"
                  : "border-line hover:border-line-strong active:bg-surface-2",
              )}
            >
              <span className="flex h-[92px] items-center justify-center border-b border-line bg-surface-2/50 p-2">
                <StylePreview style={style} />
              </span>
              <span className="flex flex-1 flex-col gap-0.5 p-2.5">
                <span className="flex items-center gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
                    {style.label}
                  </span>
                  {active && (
                    <Check size={14} weight="bold" className="shrink-0 text-accent" />
                  )}
                </span>
                <span className="line-clamp-2 text-[11.5px] leading-[15px] text-muted">
                  {style.hint}
                </span>
                <span className="mt-1 truncate text-[10.5px] uppercase tracking-wide text-muted/80">
                  {LAYOUT_LABELS[style.layout === "tree-both" ? "tree-lr" : style.layout]}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
