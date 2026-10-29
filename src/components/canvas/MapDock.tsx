import { useState, type ReactNode } from "react";
import {
  CaretLeft,
  CaretRight,
  Circle,
  Diamond,
  Hexagon,
  Magnet,
  Palette,
  Rectangle,
  Square,
} from "@phosphor-icons/react";
import type { EdgePaint, MindEdge, MindNode } from "@/types";
import {
  ARROWS,
  EDGE_WIDTHS,
  PAINT_COLORS,
  TEXTURES,
  seedColor,
  type ArrowKind,
} from "@/lib/graph/paint";
import { cn } from "@/lib/utils";
import { MAX_SIZE, MIN_SIZE } from "@/components/canvas/flowData";

/**
 * La barre flottante d’un canevas — **la même partout**.
 *
 * Elle ne connaît pas la page qui l’héberge : la carte mentale, la planche du
 * tableau blanc et, demain, n’importe quel autre graphe reçoivent exactement ces
 * outils. Trois décisions ont commandé sa forme :
 *
 * 1. **Elle se retire vers la gauche.** Repliée, il ne reste qu’une poignée d’une
 *    vingtaine de pixels contre le bord, avec un chevron. Une barre posée en bas
 *    mangeait la moitié de la hauteur utile d’un téléphone, et recouvrait le
 *    canevas qu’on est venu dessiner.
 * 2. **Ouverte, elle montre tout.** Les formes, l’aimant, le style, puis
 *    l’habillage de la forme et celui du trait — sans second niveau à découvrir.
 * 3. **Elle s’efface devant le dessin.** Aucun fond opaque plein écran : c’est
 *    une planche d’outils posée sur le côté, pas une fenêtre.
 */

const INK_COLORS = PAINT_COLORS.filter((choice) => choice.value !== "transparent");

export function MapDock({
  open,
  onToggle,
  selected,
  edge,
  snap,
  onSnap,
  onShape,
  onPaintNode,
  onPaintEdge,
  size,
  onSize,
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
  /** taille effective de la forme sélectionnée (celle que le canevas dessine) */
  size?: { w: number; h: number };
  /** taille écrite à la main ; `null` rend la forme à sa taille naturelle */
  onSize?: (size: { w: number; h: number } | null) => void;
  /** absent : le bouton « Style » n’a pas lieu d’être sur cette surface */
  onStyle?: () => void;
  styleLabel?: string;
}) {
  const [tab, setTab] = useState<"node" | "edge">("node");
  /* Le panneau suit ce qui est sélectionné : toucher un trait montre ses
     réglages, toucher une forme montre les siens — sans geste de plus. */
  const showing = edge ? "edge" : "node";
  const paint = selected?.paint ?? {};
  const edgePaint = edge?.paint ?? {};
  const both = Boolean(selected && edge);

  const heading = edge
    ? "Trait"
    : selected
      ? "Forme"
      : "Poser une forme";

  return (
    <div
      className={cn(
        "fixed bottom-[calc(10px+var(--safe-bottom))] top-[62px] z-20 flex items-stretch",
        "left-[var(--rail,0px)]",
      )}
    >
      {/* La poignée : tout ce qui reste quand la barre est repliée. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={open ? "Replier les outils du canevas" : "Déplier les outils du canevas"}
        title={open ? "Replier les outils" : "Outils du canevas"}
        className={cn(
          "my-auto flex h-24 w-6 shrink-0 flex-col items-center justify-center gap-1 rounded-r-full border border-l-0 border-line text-muted shadow-float transition-colors",
          open ? "bg-surface-2" : "bg-surface hover:text-accent",
        )}
      >
        {open ? <CaretLeft size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
        <span className="text-[10px] font-bold leading-none">⋮</span>
      </button>

      <div
        className={cn(
          "flex w-[min(84vw,308px)] flex-col overflow-hidden border border-l-0 border-line bg-surface shadow-float transition-[margin,opacity] duration-200",
          "rounded-r-big",
          open ? "opacity-100" : "pointer-events-none -ml-[min(84vw,308px)] opacity-0",
        )}
        aria-hidden={!open}
        inert={!open}
      >
        {/* Un seul contrôle de repli : la poignée, toujours visible. Un second
            bouton au même endroit pour le même geste obligerait à se demander
            lequel ferme quoi. */}
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold uppercase tracking-[0.05em] text-muted">
            {heading}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          {/* ------------------------------------------------- formes */}
          <p className="px-1 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
            {selected ? "Changer la forme" : "Poser une forme"}
          </p>
          <div className="grid grid-cols-6 gap-0.5">
            <ToolTile label="Cercle" active={selected?.shape === "circle"} onClick={() => onShape("circle")}>
              <Circle size={19} />
            </ToolTile>
            <ToolTile label="Rectangle" active={selected?.shape === "rect"} onClick={() => onShape("rect")}>
              <Rectangle size={19} />
            </ToolTile>
            <ToolTile label="Carré" active={selected?.shape === "square"} onClick={() => onShape("square")}>
              <Square size={19} />
            </ToolTile>
            <ToolTile label="Losange" active={selected?.shape === "diamond"} onClick={() => onShape("diamond")}>
              <Diamond size={19} />
            </ToolTile>
            <ToolTile label="Pilule" active={selected?.shape === "pill"} onClick={() => onShape("pill")}>
              <span className="h-[11px] w-[22px] rounded-full border-2 border-current" aria-hidden />
            </ToolTile>
            <ToolTile label="Hexagone" active={selected?.shape === "hex"} onClick={() => onShape("hex")}>
              <Hexagon size={19} />
            </ToolTile>
          </div>

          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={onSnap}
              aria-pressed={snap}
              aria-label={snap ? "Désactiver l’aimant" : "Activer l’aimant"}
              title={snap ? "Aimant activé (grille 16 px)" : "Aimant désactivé"}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-rect",
                snap ? "text-accent" : "text-muted",
              )}
            >
              <Magnet size={18} weight={snap ? "fill" : "regular"} aria-hidden />
            </button>
            {onStyle && (
              <button
                type="button"
                onClick={onStyle}
                className="flex h-9 flex-1 items-center gap-1.5 rounded-rect px-2 text-[12.5px] font-semibold text-accent"
                aria-label={`Style actuel : ${styleLabel ?? ""}`}
              >
                <Palette size={16} weight="fill" aria-hidden />
                Style
              </button>
            )}
          </div>

          {!selected && !edge && (
            <p className="mt-2 rounded-field bg-surface-2 px-2.5 py-2 text-[11.5px] leading-[16px] text-muted">
              Une forme posée ici reste <strong>libre</strong>. Pour la relier, touchez-la puis son
              « + ».
            </p>
          )}

          {both && (
            <div className="mt-2 flex gap-1">
              <Tab label="Forme" active={tab === "node"} onClick={() => setTab("node")} />
              <Tab label="Trait" active={tab === "edge"} onClick={() => setTab("edge")} />
            </div>
          )}

          {selected && (showing === "node" || (both && tab === "node")) && (
            <div className="mt-2 flex flex-col gap-2">
              {/* La taille, au chiffre près. Les coins de la forme suffisent au
                  geste ; ceci sert quand on veut deux formes **identiques** —
                  à la main, on n’y arrive pas. */}
              {size && onSize && (
                <Group label="Taille">
                  <div className="flex flex-col gap-1">
                    <Stepper
                      axis="L"
                      value={size.w}
                      onChange={(w) => onSize({ w, h: size.h })}
                    />
                    <Stepper
                      axis="H"
                      value={size.h}
                      onChange={(h) => onSize({ w: size.w, h })}
                    />
                    <button
                      type="button"
                      onClick={() => onSize(null)}
                      className="mt-0.5 h-6 w-fit rounded-full border border-line px-2 text-[11px] font-semibold text-muted"
                    >
                      Taille naturelle
                    </button>
                  </div>
                </Group>
              )}
              <Group label="Remplissage">
                <Swatches
                  colors={PAINT_COLORS}
                  value={paint.fill ?? null}
                  onPick={(value) => onPaintNode({ fill: value ?? undefined })}
                  field="fill"
                />
              </Group>
              <Group label="Texte">
                <Swatches
                  colors={INK_COLORS}
                  value={paint.ink ?? null}
                  onPick={(value) => onPaintNode({ ink: value ?? undefined })}
                  field="ink"
                />
              </Group>
              <Group label="Contour">
                <Swatches
                  colors={PAINT_COLORS}
                  value={paint.border ?? null}
                  onPick={(value) => onPaintNode({ border: value ?? undefined })}
                  field="border"
                />
                <div className="mt-1 flex items-center gap-1">
                  {[1.5, 2.5, 4].map((width) => (
                    <Chip
                      key={`bw-${width}`}
                      label={`${width} px`}
                      active={(paint.borderWidth ?? 1.5) === width}
                      onClick={() => onPaintNode({ borderWidth: width })}
                    />
                  ))}
                </div>
              </Group>
              <Group label="Surlignage">
                <Swatches
                  colors={INK_COLORS}
                  value={paint.highlight ?? null}
                  onPick={(value) => onPaintNode({ highlight: value ?? undefined })}
                  field="highlight"
                />
              </Group>
              <Group label="Texture">
                <div className="flex flex-wrap gap-1">
                  {TEXTURES.map((texture) => (
                    <Chip
                      key={texture.value}
                      label={texture.label}
                      active={(paint.texture ?? "none") === texture.value}
                      onClick={() => onPaintNode({ texture: texture.value })}
                    />
                  ))}
                </div>
              </Group>
            </div>
          )}

          {edge && (showing === "edge" || (both && tab === "edge")) && (
            <div className="mt-2 flex flex-col gap-2">
              <Group label="Couleur">
                <Swatches
                  colors={INK_COLORS}
                  value={edgePaint.color ?? null}
                  onPick={(value) => onPaintEdge({ color: value ?? undefined })}
                  field="edge-color"
                />
              </Group>
              <Group label="Épaisseur">
                <div className="flex flex-wrap items-center gap-1">
                  {EDGE_WIDTHS.map((width) => (
                    <Chip
                      key={`ew-${width}`}
                      label={`${width} px`}
                      active={(edgePaint.width ?? 2.5) === width}
                      onClick={() => onPaintEdge({ width })}
                    />
                  ))}
                  <Chip
                    label="Pointillé"
                    active={Boolean(edgePaint.dashed)}
                    onClick={() => onPaintEdge({ dashed: !edgePaint.dashed })}
                  />
                </div>
              </Group>
              <Group label="Pointe">
                <div className="grid grid-cols-3 gap-1">
                  {ARROWS.map((arrow) => (
                    <ArrowChip
                      key={arrow.value}
                      kind={arrow.value}
                      label={arrow.label}
                      active={(edgePaint.arrow ?? "arrow") === arrow.value}
                      onClick={() => onPaintEdge({ arrow: arrow.value as ArrowKind })}
                    />
                  ))}
                </div>
              </Group>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

function ToolTile({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-9 items-center justify-center rounded-rect",
        active ? "bg-accent-soft text-accent-ink" : "text-ink hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-7 flex-1 rounded-full text-[12px] font-semibold",
        active ? "bg-accent-soft text-accent-ink" : "text-muted",
      )}
    >
      {label}
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="pb-1 text-[11px] font-semibold text-muted">{label}</p>
      {children}
    </div>
  );
}

/**
 * Une rangée de couleurs, **plus** le sélecteur libre.
 *
 * « Automatique » (`null`) suit l’accent du thème, « Sans couleur »
 * (`transparent`) retire le fond, et le nuancier du système ouvre toutes les
 * autres teintes. Trois intentions différentes, trois entrées distinctes : les
 * confondre obligerait à deviner ce que fait un clic sur la même pastille.
 */
function Swatches({
  colors,
  value,
  onPick,
  field,
}: {
  colors: typeof PAINT_COLORS;
  value: string | null;
  onPick: (value: string | null) => void;
  field: string;
}) {
  const free = value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {colors.map((choice) => (
        <Swatch
          key={`${field}-${choice.label}`}
          label={choice.label}
          color={choice.swatch}
          active={value === choice.value}
          onClick={() => onPick(choice.value)}
        />
      ))}
      {/* Le nuancier du système : une couleur qu’aucun thème ne connaît. */}
      <label
        title="Couleur libre"
        className={cn(
          "relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border",
          free ? "border-accent" : "border-dashed border-line-strong",
        )}
      >
        <span
          className="h-[17px] w-[17px] rounded-full"
          style={{
            background: free
              ? free
              : "conic-gradient(from 0deg, #f43f5e, #f59e0b, #22c55e, #06b6d4, #6366f1, #f43f5e)",
          }}
          aria-hidden
        />
        <input
          type="color"
          aria-label={`Couleur libre — ${field}`}
          value={seedColor(value ?? undefined)}
          onChange={(event) => onPick(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
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
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
        active ? "border-accent" : "border-transparent",
      )}
    >
      <span
        className="h-[17px] w-[17px] rounded-full border border-line"
        style={{
          background: color,
          /* Trois signes, pas un dégradé commun : « Automatique » est mi-thème
             mi-vide, « Sans couleur » est barré — on doit les distinguer sans
             lire l’infobulle. */
          backgroundImage:
            label === "Automatique"
              ? "linear-gradient(135deg, var(--accent) 50%, var(--surface) 50%)"
              : label === "Sans couleur"
                ? "linear-gradient(135deg, transparent 44%, var(--danger) 44% 56%, transparent 56%)"
                : undefined,
        }}
        aria-hidden
      />
    </button>
  );
}

/**
 * Un pas de 16 px sur une dimension.
 *
 * 16 et pas 1 : la grille d’aimant fait 16 px, donc deux formes ajustées au
 * pas se retrouvent alignées sans effort. Un pas de 1 px obligerait à tenir le
 * bouton pour changer quelque chose de visible.
 */
function Stepper({
  axis,
  value,
  onChange,
}: {
  axis: "L" | "H";
  value: number;
  onChange: (value: number) => void;
}) {
  const min = axis === "L" ? MIN_SIZE.w : MIN_SIZE.h;
  const max = axis === "L" ? MAX_SIZE.w : MAX_SIZE.h;
  return (
    <div className="flex items-center gap-1">
      <span className="w-3 text-[11px] font-semibold text-muted">{axis}</span>
      <button
        type="button"
        aria-label={`Réduire la ${axis === "L" ? "largeur" : "hauteur"}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 16))}
        className="h-6 w-6 rounded-rect border border-line text-[13px] font-bold text-ink disabled:opacity-35"
      >
        −
      </button>
      <span className="w-9 text-center text-[11.5px] font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label={`Augmenter la ${axis === "L" ? "largeur" : "hauteur"}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 16))}
        className="h-6 w-6 rounded-rect border border-line text-[13px] font-bold text-ink disabled:opacity-35"
      >
        +
      </button>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-7 shrink-0 rounded-full border px-2.5 text-[11.5px] font-semibold",
        active ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-surface text-ink",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Une pointe de flèche, dessinée.
 *
 * Le libellé seul ne dit pas la différence entre « losange » et « cercle » à qui
 * ne lit pas l’anglais des diagrammes ; le dessin, si. C’est la même géométrie
 * que sur les traits, réduite.
 */
function ArrowChip({
  kind,
  label,
  active,
  onClick,
}: {
  kind: ArrowKind;
  label: string;
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
        "flex h-8 items-center justify-center gap-1 rounded-rect border",
        active ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-surface text-ink",
      )}
    >
      <svg viewBox="0 0 34 12" aria-hidden className="h-3 w-8 shrink-0">
        <line x1="1" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.6" />
        {kind === "arrow" && (
          <path d="M20 2.2 L27 6 L20 9.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        )}
        {kind === "triangle" && <path d="M21 1.8 L28 6 L21 10.2 Z" fill="currentColor" />}
        {kind === "circle" && <circle cx="24" cy="6" r="3.4" fill="currentColor" />}
        {kind === "diamond" && <path d="M21 6 L24.5 2.6 L28 6 L24.5 9.4 Z" fill="currentColor" />}
        {kind === "bar" && (
          <line x1="24" y1="1.8" x2="24" y2="10.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>
      <span className="truncate text-[10.5px] font-semibold">{label.split(" ").slice(-1)}</span>
    </button>
  );
}
