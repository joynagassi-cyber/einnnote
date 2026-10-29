import { useRef, useState } from "react";
import { Handle, Position, useStore, type NodeProps } from "@xyflow/react";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import type { MindNode } from "@/types";
import type { MindDirection } from "@/stores/useContentStore";
import { nodeLook, textureBackground } from "@/lib/graph/paint";
import { cn } from "@/lib/utils";
import {
  HIDDEN,
  MAX_SIZE,
  MIN_SIZE,
  clamp,
  type FlowNode,
} from "@/components/canvas/flowData";

/**
 * Le dessin d’une carte mentale : la conversion des nœuds en graphe, et la
 * forme elle-même.
 *
 * Ce fichier existe pour être partagé par **deux** surfaces : la page Carte
 * mentale (qui y ajoute sa barre, ses styles, ses modèles, sa mini-carte) et le
 * tableau blanc, qui pose la même planche à côté du texte. Une seule
 * implémentation du nœud, donc : un habillage choisi dans l’une se voit dans
 * l’autre, à l’identique.
 */

/** Les deux formes à angles : elles demandent un tracé, pas un `border`. */
const POLY: Partial<Record<MindNode["shape"], string>> = {
  diamond: "50% 0%, 100% 50%, 50% 100%, 0% 50%",
  hex: "25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%",
};

const POINTS: Partial<Record<MindNode["shape"], string>> = {
  diamond: "50,0 100,50 50,100 0,50",
  hex: "25,0 75,0 100,50 75,100 25,100 0,50",
};

const SIDE_OF: Record<MindDirection, { x: string; y: string; label: string }> = {
  top: { x: "left-1/2 -translate-x-1/2", y: "-top-3", label: "au-dessus" },
  right: { x: "-right-3", y: "top-1/2 -translate-y-1/2", label: "à droite" },
  bottom: { x: "left-1/2 -translate-x-1/2", y: "-bottom-3", label: "en dessous" },
  left: { x: "-left-3", y: "top-1/2 -translate-y-1/2", label: "à gauche" },
};

/** Les quatre coins d’une forme : chacun tire dans deux directions. */
const CORNERS: {
  key: "nw" | "ne" | "sw" | "se";
  at: string;
  cursor: string;
  label: string;
}[] = [
  { key: "nw", at: "-left-1.5 -top-1.5", cursor: "nwse-resize", label: "coin haut gauche" },
  { key: "ne", at: "-right-1.5 -top-1.5", cursor: "nesw-resize", label: "coin haut droit" },
  { key: "sw", at: "-left-1.5 -bottom-1.5", cursor: "nesw-resize", label: "coin bas gauche" },
  { key: "se", at: "-right-1.5 -bottom-1.5", cursor: "nwse-resize", label: "coin bas droit" },
];

/**
 * Une forme de la carte.
 *
 * Quatre choses s’y décident :
 * 1. **l’habillage** vient de `nodeLook` : couleur, encre, contour, épaisseur,
 *    surlignage, texture — et, quand rien n’est choisi, l’accent du thème ;
 * 2. **les quatre poignées `+`** n’apparaissent que sur la forme sélectionnée et
 *    posent une branche du côté touché : c’est le seul geste qui relie ;
 * 3. **les quatre coins** la redimensionnent. Le coin opposé reste immobile :
 *    c’est ce qu’on attend d’une poignée, et ce qui évite de « pousser » la
 *    forme quand on la tire vers l’ouest ou le nord ;
 * 4. les formes à angles (losange, hexagone) sont tracées en SVG, car un
 *    `border` sur un `clip-path` se fait couper aux pointes.
 */
export function EinnoteNode({ id, data }: NodeProps<FlowNode>) {
  const { text, shape, root, depth, sel, paint, onAdd, onOpen, onResize } = data;
  const w = data.w;
  const h = data.h;
  const pos = data.pos;
  const look = nodeLook({ paint }, root);
  const texture = textureBackground(look.texture, look.border);

  /* Le glissement arrive en pixels d’écran ; la taille vit en coordonnées du
     canevas. Sans diviser par le zoom, redimensionner à 50 % donnerait une
     forme deux fois plus grande que le geste. */
  const zoom = useStore((state) => state.transform[2]) || 1;
  /* Le geste écrit dans le magasin, mais **au rythme de l’écran** : un
     `pointermove` peut arriver cent fois par seconde, et le magasin enregistre
     son état à chaque écriture. Une écriture par image suffit à ce que l’œil
     voie la forme et ses traits suivre le doigt. */
  const pending = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const frame = useRef(0);
  const [live, setLive] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
    px: number;
    py: number;
  } | null>(null);

  const begin = (key: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    drag.current = { x: event.clientX, y: event.clientY, w, h, px: pos.x, py: pos.y };
    /* `?.` : tous les navigateurs ne l’ont pas, et les tests non plus. Sans
       capture, le geste marche encore — il s’arrête simplement si le doigt
       sort du bouton. */
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const move = (key: string) => (event: React.PointerEvent<HTMLButtonElement>) => {
    const from = drag.current;
    if (!from) return;
    const dx = (event.clientX - from.x) / zoom;
    const dy = (event.clientY - from.y) / zoom;

    let nw = from.w;
    let nh = from.h;
    let nx = from.px;
    let ny = from.py;

    if (key.includes("e")) nw = from.w + dx;
    if (key.includes("w")) {
      nw = from.w - dx;
      nx = from.px + (from.w - clamp(nw, MIN_SIZE.w, MAX_SIZE.w));
    }
    if (key.includes("s")) nh = from.h + dy;
    if (key.includes("n")) {
      nh = from.h - dy;
      ny = from.py + (from.h - clamp(nh, MIN_SIZE.h, MAX_SIZE.h));
    }

    const size = {
      x: Math.round(nx),
      y: Math.round(ny),
      w: clamp(nw, MIN_SIZE.w, MAX_SIZE.w),
      h: clamp(nh, MIN_SIZE.h, MAX_SIZE.h),
    };

    /* La forme suit le doigt immédiatement (état local), le magasin suit à
       l’image suivante : les traits, eux, se recalculent depuis le magasin. */
    setLive({ w: size.w, h: size.h });
    pending.current = size;
    if (!frame.current) {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (pending.current) onResize(id, pending.current);
      });
    }
  };

  const end = (event: React.PointerEvent<HTMLButtonElement>) => {
    drag.current = null;
    setLive(null);
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    }
    if (pending.current) {
      onResize(id, pending.current);
      pending.current = null;
    }
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  /* La classe porte le **type** de forme (arrondi, typographie, rembourrage) ;
     la taille, elle, est écrite en style — c’est la seule façon qu’elle
     s’accorde au pixel avec l’accroche des traits. */
  const sizing = cn(
    "relative flex items-center justify-center text-center font-medium leading-[19px] transition-colors",
    shape === "circle" && "rounded-full p-2",
    shape === "circle" && root && "p-3 font-serif text-[15px] font-semibold",
    shape === "rect" && "rounded-rect px-3 py-2",
    shape === "rect" && depth <= 1 && "gap-1.5 text-[14.5px]",
    shape === "rect" && depth > 1 && "px-2.5 py-1.5 text-[13px] leading-[17px]",
    shape === "square" && "rounded-rect p-2",
    shape === "pill" && "rounded-full px-4 text-[13.5px]",
    shape === "diamond" && "p-2 text-[13px] leading-[17px]",
    shape === "hex" && "p-3 text-[13px] leading-[17px]",
    !root && shape !== "circle" && "shadow-[0_1px_2px_rgba(0,0,0,.05)]",
  );

  /* Le remplissage et le trait passent en style : ils dépendent du nœud, pas
     d’une classe. `backgroundImage` porte la texture par-dessus la couleur. */
  const surface = {
    width: live?.w ?? w,
    height: live?.h ?? h,
    background: look.fill,
    backgroundImage: texture.image,
    backgroundSize: texture.size,
    color: look.ink,
    borderColor: look.border,
    borderWidth: look.borderWidth,
    /* Surlignage : une aura extérieure, jamais une deuxième couleur de fond —
       le texte doit rester lisible sur n’importe quel remplissage. */
    boxShadow: look.highlight
      ? `0 0 0 5px color-mix(in srgb, ${look.highlight} 42%, transparent)`
      : undefined,
  } as const;

  const poly = POINTS[shape] ?? null;

  return (
    <div className="group relative">
      <Handle type="target" id="t-left" position={Position.Left} isConnectable={false} style={HIDDEN} />
      <Handle type="target" id="t-right" position={Position.Right} isConnectable={false} style={HIDDEN} />
      <Handle type="target" id="t-top" position={Position.Top} isConnectable={false} style={HIDDEN} />
      <Handle type="target" id="t-bottom" position={Position.Bottom} isConnectable={false} style={HIDDEN} />

      <div
        onDoubleClick={() => onOpen(id)}
        className={cn(sizing, sel && "outline outline-2 outline-offset-[3px] outline-accent")}
        style={sel && poly ? { ...surface, outlineOffset: 6 } : surface}
      >
        {poly && (
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <polygon
              points={poly}
              fill={look.fill}
              stroke={look.border}
              strokeWidth={look.borderWidth}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {poly && texture.image && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[2px] opacity-70"
            style={{
              clipPath: `polygon(${POLY[shape]})`,
              backgroundImage: texture.image,
              backgroundSize: texture.size,
            }}
          />
        )}
        <span className={cn("relative line-clamp-3", poly && "px-3")}>{text}</span>
      </div>

      <Handle type="source" id="s-left" position={Position.Left} isConnectable={false} style={HIDDEN} />
      <Handle type="source" id="s-right" position={Position.Right} isConnectable={false} style={HIDDEN} />
      <Handle type="source" id="s-top" position={Position.Top} isConnectable={false} style={HIDDEN} />
      <Handle type="source" id="s-bottom" position={Position.Bottom} isConnectable={false} style={HIDDEN} />

      {sel && (
        <>
          {(Object.keys(SIDE_OF) as MindDirection[]).map((direction) => (
            <button
              key={direction}
              type="button"
              aria-label={`Ajouter une forme ${SIDE_OF[direction].label}`}
              title={`Ajouter une forme ${SIDE_OF[direction].label}`}
              onClick={(event) => {
                event.stopPropagation();
                onAdd(id, direction);
              }}
              className={cn(
                "nodrag absolute flex h-6 w-6 items-center justify-center rounded-full border border-accent bg-surface text-accent shadow-float",
                "opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100",
                sel && "opacity-100",
                SIDE_OF[direction].x,
                SIDE_OF[direction].y,
              )}
            >
              <Plus size={13} weight="bold" />
            </button>
          ))}

          {/* Les quatre coins : redimensionner. `nodrag` empêche React Flow de
              lire le geste comme un déplacement du nœud. */}
          {CORNERS.map((corner) => (
            <button
              key={corner.key}
              type="button"
              aria-label={`Redimensionner la forme, ${corner.label}`}
              title="Tirer pour redimensionner"
              onPointerDown={begin(corner.key)}
              onPointerMove={move(corner.key)}
              onPointerUp={end}
              onPointerCancel={end}
              className={cn(
                /* Un carré de 12 px se voit ; la zone qu’on peut saisir fait
                   12 px de plus de chaque côté, sinon on rate la poignée au
                   doigt. Le pseudo-élément appartient au bouton : il étend la
                   cible sans rien ajouter au dessin. */
                "nodrag absolute z-10 h-3 w-3 rounded-[2px] border border-accent bg-surface",
                "after:absolute after:-inset-[7px] after:content-['']",
                corner.at,
              )}
              style={{ cursor: corner.cursor, touchAction: "none" }}
            />
          ))}

          <button
            type="button"
            aria-label="Modifier la forme"
            title="Modifier la forme"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(id);
            }}
            className="nodrag absolute -right-2 -top-6 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-float"
          >
            <PencilSimple size={12} weight="bold" />
          </button>
        </>
      )}
    </div>
  );
}
