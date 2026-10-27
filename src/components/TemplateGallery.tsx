import { useMemo } from "react";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { layoutMindmap, LAYOUT_LABELS } from "@/lib/mindmap/layout";
import type { MindmapTemplate } from "@/lib/templates/mindmaps";
import type { NoteTemplate, ZettelTemplate } from "@/lib/templates/notes";
import { templateSignature } from "@/lib/templates/apply";

/**
 * Galerie de modèles — commune aux quatre méthodes.
 *
 * Deux principes :
 * 1. **L’aperçu est calculé, pas dessiné.** La vignette d’une carte mentale est
 *    la projection SVG du vrai moteur de disposition : ce qu’on voit est ce
 *    qu’on obtient, au nœud près.
 * 2. **Un modèle annonce son usage**, pas sa beauté : « à quoi ça sert », pour
 *    qui, et d’où vient la méthode.
 */

export interface TemplateCardProps {
  name: string;
  intent: string;
  audience: string;
  meta: string;
  preview: React.ReactNode;
  selected?: boolean;
  onPick: () => void;
  actionLabel?: string;
}

function TemplateCard({
  name,
  intent,
  audience,
  meta,
  preview,
  selected,
  onPick,
  actionLabel,
}: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-card border bg-surface text-left transition-colors",
        selected
          ? "border-2 border-accent"
          : "border-line hover:border-line-strong active:bg-surface-2",
      )}
    >
      <span className="flex h-[104px] items-center justify-center border-b border-line bg-surface-2/60 px-3">
        {preview}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-3">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 font-serif text-[16px] font-semibold leading-tight">
            {name}
          </span>
          {selected && <Check size={15} weight="bold" className="mt-0.5 shrink-0 text-accent" />}
        </span>
        <span className="line-clamp-2 text-[12.5px] leading-[17px] text-muted">
          {intent}
        </span>
        <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent-ink">
            {audience}
          </span>
          <span className="text-muted">{meta}</span>
        </span>
        {actionLabel && (
          <span className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-accent">
            {actionLabel}
            <ArrowRight size={13} weight="bold" aria-hidden />
          </span>
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Aperçus                                                             */
/* ------------------------------------------------------------------ */

/** Vignette d’une carte mentale : la vraie disposition, réduite. */
export function MindmapPreview({ template }: { template: MindmapTemplate }) {
  const { nodes, edges } = useMemo(
    () => layoutMindmap(template.spec, template.layout),
    [template],
  );

  const box = useMemo(() => {
    const width = Math.max(...nodes.map((node) => node.x)) + 170;
    const height = Math.max(...nodes.map((node) => node.y)) + 110;
    return { width, height };
  }, [nodes]);

  const byId = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  return (
    <svg
      viewBox={`0 0 ${box.width} ${box.height}`}
      role="img"
      aria-label={`Aperçu : ${template.name}, disposition ${LAYOUT_LABELS[template.layout]}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {edges.map((edge) => {
        const from = byId.get(edge.source);
        const to = byId.get(edge.target);
        if (!from || !to) return null;
        return (
          <line
            key={edge.id}
            x1={from.x + 60}
            y1={from.y + 48}
            x2={to.x + 60}
            y2={to.y + 48}
            stroke="var(--line-strong)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
      {nodes.map((node) => {
        const isRoot = node.depth === 0;
        const fill = isRoot ? "var(--accent)" : "var(--surface)";
        const stroke = isRoot ? "var(--accent)" : "var(--line-strong)";
        const cx = node.x + 60;
        const cy = node.y + 48;
        if (node.shape === "circle") {
          return (
            <circle
              key={node.id}
              cx={cx}
              cy={cy}
              r={isRoot ? 26 : 18}
              fill={fill}
              stroke={stroke}
              strokeWidth={2.5}
            />
          );
        }
        if (node.shape === "diamond") {
          return (
            <polygon
              key={node.id}
              points={`${cx},${cy - 22} ${cx + 30},${cy} ${cx},${cy + 22} ${cx - 30},${cy}`}
              fill={fill}
              stroke={stroke}
              strokeWidth={2.5}
            />
          );
        }
        const w = node.shape === "square" ? 46 : 62;
        const h = node.shape === "square" ? 46 : 30;
        return (
          <rect
            key={node.id}
            x={cx - w / 2}
            y={cy - h / 2}
            width={w}
            height={h}
            rx={8}
            fill={fill}
            stroke={stroke}
            strokeWidth={2.5}
          />
        );
      })}
    </svg>
  );
}

/** Vignette d’une note : la silhouette réelle des blocs du modèle. */
function NotePreview({ template }: { template: NoteTemplate }) {
  const rows = template.blocks.slice(0, 7);
  return (
    <span className="flex w-full flex-col gap-1.5" aria-hidden="true">
      {rows.map((block, index) => {
        if (block.kind === "h1" || block.kind === "h2") {
          return (
            <span
              key={index}
              className="block h-[6px] rounded-full bg-accent/70"
              style={{ width: block.kind === "h1" ? "64%" : "46%" }}
            />
          );
        }
        return (
          <span
            key={index}
            className={cn(
              "block h-[3px] rounded-full bg-line-strong",
              block.bullet && "ml-2",
            )}
            style={{ width: `${72 - (index % 3) * 12}%` }}
          />
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Galeries                                                            */
/* ------------------------------------------------------------------ */

export function MindmapTemplateGallery({
  templates,
  selectedId,
  onPick,
}: {
  templates: MindmapTemplate[];
  selectedId?: string | null;
  onPick: (template: MindmapTemplate) => void;
}) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {templates.map((template) => (
        <li key={template.id}>
          <TemplateCard
            name={template.name}
            intent={template.intent}
            audience={template.audience}
            meta={`${LAYOUT_LABELS[template.layout]} · ${template.discipline}`}
            preview={<MindmapPreview template={template} />}
            selected={selectedId === template.id}
            onPick={() => onPick(template)}
          />
        </li>
      ))}
    </ul>
  );
}

export function NoteTemplateGallery({
  templates,
  onPick,
}: {
  templates: NoteTemplate[];
  onPick: (template: NoteTemplate) => void;
}) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {templates.map((template) => (
        <li key={template.id}>
          <TemplateCard
            name={template.name}
            intent={template.intent}
            audience={template.audience}
            meta={templateSignature(template)}
            preview={<NotePreview template={template} />}
            onPick={() => onPick(template)}
            actionLabel="Utiliser"
          />
        </li>
      ))}
    </ul>
  );
}

export function ZettelTemplateGallery({
  templates,
  onPick,
}: {
  templates: ZettelTemplate[];
  onPick: (template: ZettelTemplate) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {templates.map((template) => (
        <li key={template.id}>
          <button
            type="button"
            onClick={() => onPick(template)}
            className="row w-full"
          >
            <span className="tile-accent" aria-hidden="true">
              <span className="text-[15px] font-bold">#</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-[16px] font-semibold">
                {template.name}
              </span>
              <span className="block text-[13px] leading-[18px] text-muted">
                {template.intent}
              </span>
              <span className="mt-1 block text-[11.5px] text-muted">
                {template.audience} · {template.discipline}
              </span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-muted" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
