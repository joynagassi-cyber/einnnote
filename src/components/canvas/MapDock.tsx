import { useState, type ReactNode } from "react";
import {
  CaretDown,
  CaretUp,
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
  type ArrowKind,
} from "@/lib/graph/paint";
import { cn } from "@/lib/utils";

/**
 * La barre flottante d’un canevas — **la même partout**.
 *
 * Elle ne connaît pas la page qui l’héberge : la carte mentale complète, la
 * planche du tableau blanc et, demain, n’importe quel autre graphe reçoivent
 * exactement ces outils, au même endroit, avec les mêmes gestes. Repliée, elle
 * ne laisse qu’une poignée.
 */

/**
 * La barre flottante du canevas.
 *
 * Elle fait deux métiers, et c’est voulu qu’ils cohabitent : **poser** une
 * forme libre quand rien n’est sélectionné, **habiller** la forme ou le trait
 * sélectionné le reste du temps. Repliée, elle ne laisse qu’une poignée — sur
 * un canevas, la place appartient au dessin.
 */
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
  /** absent : le bouton « Style » n’a pas lieu d’être sur cette surface */
  onStyle?: () => void;
  styleLabel?: string;
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
              {onStyle && (
                <button
                  type="button"
                  onClick={onStyle}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-rect px-3 text-[13px] font-semibold text-accent"
                  aria-label={`Style actuel : ${styleLabel ?? ""}`}
                >
                  <Palette size={17} weight="fill" aria-hidden />
                  Style
                </button>
              )}
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

