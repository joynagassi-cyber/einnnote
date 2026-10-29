import type { EdgePaint, MindEdge, MindNode, NodePaint } from "@/types";

/**
 * L’habillage des formes et des traits.
 *
 * **Rien n’est obligatoire, et c’est le point.** Un nœud sans habillage n’est
 * pas « noir par défaut » : il emprunte l’accent du thème actif. Changer
 * d’accent recolore donc la carte entière — formes, contours, traits, pointes —
 * sans réécrire un seul nœud. Dès qu’une personne choisit une couleur, ce
 * choix-là l’emporte et ne bouge plus.
 *
 * Les couleurs proposées ne sont pas des teintes inventées : ce sont des
 * **jetons du thème** (`--accent`, `--ink`, `--muted`…). Une carte reste donc
 * lisible en clair comme en sombre, et le contraste est déjà garanti par le
 * thème au lieu d’être espéré.
 *
 * Ce fichier ne connaît ni React Flow ni le DOM : il rend des valeurs CSS.
 */

/* ------------------------------------------------------------------ */
/* Ce qu’on peut choisir                                               */
/* ------------------------------------------------------------------ */

export interface PaintChoice {
  /** ce qui est enregistré dans le nœud ; `null` = suivre le thème */
  value: string | null;
  label: string;
  /** la pastille affichée dans le sélecteur */
  swatch: string;
}

/**
 * Les couleurs d’une carte.
 *
 * La première entrée est **« Automatique »** : elle n’écrit rien, donc elle
 * suit l’accent. Les suivantes sont des jetons stables du thème.
 */
export const PAINT_COLORS: PaintChoice[] = [
  { value: null, label: "Automatique", swatch: "var(--accent)" },
  /* « Sans couleur » n’est pas « aucune préférence » : c’est un choix — la
     forme perd son fond et ne garde que son contour. Deux idées différentes,
     donc deux entrées : `null` suit le thème, `transparent` s’en retire. */
  { value: "transparent", label: "Sans couleur", swatch: "transparent" },
  { value: "var(--accent)", label: "Accent", swatch: "var(--accent)" },
  { value: "var(--accent-soft)", label: "Accent doux", swatch: "var(--accent-soft)" },
  { value: "var(--ink)", label: "Encre", swatch: "var(--ink)" },
  { value: "var(--muted)", label: "Muet", swatch: "var(--muted)" },
  { value: "var(--surface)", label: "Papier", swatch: "var(--surface)" },
  { value: "var(--surface-2)", label: "Papier ombré", swatch: "var(--surface-2)" },
  { value: "var(--highlight)", label: "Surlignage", swatch: "var(--highlight)" },
  { value: "var(--danger)", label: "Alerte", swatch: "var(--danger)" },
];

export const TEXTURES: { value: NonNullable<NodePaint["texture"]>; label: string }[] = [
  { value: "none", label: "Uni" },
  { value: "dots", label: "Pointillé" },
  { value: "grid", label: "Quadrillé" },
  { value: "diagonal", label: "Hachures" },
  { value: "cross", label: "Croisillons" },
];

export type ArrowKind = NonNullable<EdgePaint["arrow"]>;

export const ARROWS: { value: ArrowKind; label: string }[] = [
  { value: "none", label: "Sans pointe" },
  { value: "arrow", label: "Flèche" },
  { value: "triangle", label: "Triangle" },
  { value: "circle", label: "Cercle" },
  { value: "diamond", label: "Losange" },
  { value: "bar", label: "Barre" },
];

export const EDGE_WIDTHS = [1.5, 2.5, 4] as const;

/* ------------------------------------------------------------------ */
/* Résolution : ce que le canevas dessine                              */
/* ------------------------------------------------------------------ */

export interface ResolvedNode {
  fill: string;
  ink: string;
  border: string;
  borderWidth: number;
  highlight: string | null;
  texture: NonNullable<NodePaint["texture"]>;
  /** couche CSS de la texture, à superposer au remplissage */
  textureLayer: string | undefined;
}

/** La texture, dessinée au-dessus du remplissage avec la couleur du contour. */
export function textureLayer(
  texture: NonNullable<NodePaint["texture"]>,
  color: string,
): string | undefined {
  switch (texture) {
    case "dots":
      return `radial-gradient(${color} 1.1px, transparent 1.2px)`;
    case "grid":
      return `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
    case "diagonal":
      return `repeating-linear-gradient(45deg, ${color} 0 1px, transparent 1px 7px)`;
    case "cross":
      return `repeating-linear-gradient(45deg, ${color} 0 1px, transparent 1px 9px), repeating-linear-gradient(-45deg, ${color} 0 1px, transparent 1px 9px)`;
    default:
      return undefined;
  }
}

const TEXTURE_SIZE: Record<NonNullable<NodePaint["texture"]>, string | undefined> = {
  none: undefined,
  dots: "10px 10px",
  grid: "12px 12px",
  diagonal: "auto",
  cross: "auto",
};

/** La couche complète (`background-image` + `background-size`) ou rien. */
export function textureBackground(
  texture: NonNullable<NodePaint["texture"]>,
  color: string,
): { image?: string; size?: string } {
  const image = textureLayer(texture, color);
  if (!image) return {};
  return { image, size: TEXTURE_SIZE[texture] };
}

/**
 * L’habillage effectif d’un nœud.
 *
 * `root` change deux choses seulement : un nœud racine est plein d’accent par
 * défaut (c’est le centre de la carte), les autres sont sur le papier. Sans
 * cela, une carte vierge commencerait par un disque vide.
 */
export function nodeLook(node: Pick<MindNode, "paint">, root = false): ResolvedNode {
  const paint = node.paint ?? {};
  const fill = paint.fill ?? (root ? "var(--accent)" : "var(--surface)");
  const ink = paint.ink ?? (root && !paint.fill ? "var(--on-accent)" : "var(--ink)");
  const border = paint.border ?? (root ? "var(--accent)" : "var(--line-strong)");
  const texture = paint.texture ?? "none";

  return {
    fill,
    ink,
    border,
    borderWidth: paint.borderWidth ?? 1.5,
    highlight: paint.highlight ?? null,
    texture,
    textureLayer: textureLayer(texture, border),
  };
}

export interface ResolvedEdge {
  color: string;
  width: number;
  dashed: boolean;
  arrow: ArrowKind;
  /** style de trait du graphe (bezier, step, straight, floating…) */
  kind?: string;
}

export function edgeLook(
  edge: Pick<MindEdge, "paint"> | undefined,
  fallback: { width: number; dashed: boolean; arrow: boolean },
): ResolvedEdge {
  const paint = edge?.paint ?? {};
  return {
    color: paint.color ?? "var(--accent)",
    width: paint.width ?? fallback.width,
    dashed: paint.dashed ?? fallback.dashed,
    /* Par défaut on suit le style de la carte : une flèche si le style en
       dessine une, sinon rien. Un choix explicite l’emporte. */
    arrow: paint.arrow ?? (fallback.arrow ? "arrow" : "none"),
  };
}

/**
 * Une couleur libre (choisie au sélecteur du système) n’est pas un jeton : elle
 * ne suivra pas le thème, et c’est voulu. On la reconnaît à sa forme.
 */
export function isFreeColor(value: string | undefined): boolean {
  return Boolean(value && /^#[0-9a-f]{3,8}$/i.test(value));
}

/** La couleur à préremplir dans le sélecteur libre, quand on en ouvre un. */
export function seedColor(value: string | undefined): string {
  if (isFreeColor(value)) return value!;
  if (!value || value === "transparent") return "#4f6bed";
  /* Un jeton du thème : on ne peut pas le lire depuis ici sans le DOM, donc on
     part d’une teinte neutre plutôt que de mentir sur la valeur affichée. */
  return "#4f6bed";
}

/** Un nœud « habillé » ? Sert à afficher « Automatique » quand rien n’est posé. */
export function isPainted(node: Pick<MindNode, "paint">): boolean {
  const paint = node.paint;
  if (!paint) return false;
  return Object.values(paint).some((value) => value !== undefined && value !== "none");
}
