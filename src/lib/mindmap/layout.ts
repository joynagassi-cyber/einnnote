import type { MindNode } from "@/types";

/**
 * Disposition des cartes mentales.
 *
 * Un modèle n’est pas une capture d’écran : c’est **une arborescence + une
 * règle de placement**. On stocke donc le sens (parent → enfants) et on calcule
 * les coordonnées. Trois bénéfices concrets : les modèles ne se chevauchent
 * jamais (c’est prouvé par test), ils restent lisibles à 4 comme à 30 nœuds, et
 * en ajouter un ne demande aucune retouche manuelle.
 *
 * Les algorithmes sont ceux des moteurs de graphe : arbre « tidy » (Reingold–
 * Tilford simplifié), disposition radiale par secteurs angulaires pondérés par
 * le nombre de feuilles, et variantes métier (frise, matrice, arête de poisson).
 */

export type MindmapLayoutKind =
  | "tree-lr"
  | "tree-tb"
  | "radial"
  | "timeline"
  | "matrix"
  | "fishbone"
  | "columns"
  | "ladder";

export interface TemplateNode {
  /** identifiant local au modèle (converti en id unique à la création) */
  key: string;
  text: string;
  shape?: MindNode["shape"];
  children?: TemplateNode[];
}

export interface PlacedNode {
  id: string;
  text: string;
  shape: MindNode["shape"];
  x: number;
  y: number;
  parentId?: string;
  depth: number;
}

export interface PlacedEdge {
  id: string;
  source: string;
  target: string;
}

export interface LayoutResult {
  nodes: PlacedNode[];
  edges: PlacedEdge[];
}

/* ------------------------------------------------------------------ */
/* Constantes de rythme                                                */
/* ------------------------------------------------------------------ */

/** Encombrement maximal d’un nœud (les formes vont de 80 à 140 px). */
const NODE_W = 150;
const NODE_H = 96;
const GAP_X = 90;
const GAP_Y = 26;
const PAD = 48;

const COL = NODE_W + GAP_X; // 240
const ROW = NODE_H + GAP_Y; // 122
const RING = 250;

const DEFAULT_SHAPE: MindNode["shape"] = "rect";

function place(
  node: TemplateNode,
  depth: number,
  x: number,
  y: number,
  parentId?: string,
): PlacedNode {
  return {
    id: node.key,
    text: node.text,
    shape: node.shape ?? DEFAULT_SHAPE,
    // on centre la boîte sur le point calculé par l’algorithme
    x: Math.round(x - NODE_W / 2),
    y: Math.round(y - NODE_H / 2),
    parentId,
    depth,
  };
}

function leaves(node: TemplateNode): number {
  if (!node.children?.length) return 1;
  return node.children.reduce((total, child) => total + leaves(child), 0);
}

function depthOf(node: TemplateNode): number {
  if (!node.children?.length) return 1;
  return 1 + Math.max(...node.children.map(depthOf));
}

/* ------------------------------------------------------------------ */
/* Arbre « tidy » : feuilles empilées, parents centrés sur leurs enfants */
/* ------------------------------------------------------------------ */

function tree(root: TemplateNode, horizontal: boolean): PlacedNode[] {
  const out: PlacedNode[] = [];
  /* Les feuilles s’empilent perpendiculairement à la lecture : en horizontal
     elles descendent (ROW), en vertical elles s’écartent (COL). L’inverse
     faisait se chevaucher les boîtes de 150 px. */
  const leafStep = horizontal ? ROW : COL;
  const depthStep = horizontal ? COL : ROW;
  let cursor = 0;

  const walk = (
    node: TemplateNode,
    depth: number,
    parentId?: string,
  ): number => {
    const children = node.children ?? [];
    let axis: number;

    if (children.length === 0) {
      axis = cursor * leafStep;
      cursor += 1;
    } else {
      const positions = children.map((child) =>
        walk(child, depth + 1, node.key),
      );
      axis = (Math.min(...positions) + Math.max(...positions)) / 2;
    }

    const along = depth * depthStep;
    out.push(
      horizontal
        ? place(node, depth, along, axis, parentId)
        : place(node, depth, axis, along, parentId),
    );
    return axis;
  };

  walk(root, 0);
  return out;
}

/* ------------------------------------------------------------------ */
/* Radial : secteurs angulaires proportionnels aux feuilles            */
/* ------------------------------------------------------------------ */

function radial(root: TemplateNode): PlacedNode[] {
  const out: PlacedNode[] = [];

  const walk = (
    node: TemplateNode,
    depth: number,
    start: number,
    end: number,
    parentId?: string,
  ) => {
    const angle = (start + end) / 2;
    const radius = depth * RING;
    out.push(
      place(
        node,
        depth,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        parentId,
      ),
    );

    const children = node.children ?? [];
    if (!children.length) return;

    const counts = children.map(leaves);
    const sum = counts.reduce((a, b) => a + b, 0) || 1;
    const span = end - start;
    let cursor = start;
    children.forEach((child, index) => {
      const width = (span * counts[index]) / sum;
      walk(child, depth + 1, cursor, cursor + width, node.key);
      cursor += width;
    });
  };

  // -π/2 : la première branche part vers le haut, comme sur une carte dessinée
  walk(root, 0, -Math.PI / 2 - Math.PI, -Math.PI / 2 + Math.PI);
  return out;
}

/* ------------------------------------------------------------------ */
/* Variantes métier                                                    */
/* ------------------------------------------------------------------ */

function timeline(root: TemplateNode): PlacedNode[] {
  const out: PlacedNode[] = [place(root, 0, 0, 0)];
  (root.children ?? []).forEach((child, index) => {
    const x = (index + 1) * COL * 1.15;
    const y = index % 2 === 0 ? -190 : 190;
    out.push(place(child, 1, x, y, root.key));
    (child.children ?? []).forEach((leaf, leafIndex) => {
      out.push(
        place(
          leaf,
          2,
          x + 30 + leafIndex * 34,
          y + (y < 0 ? -1 : 1) * (130 + leafIndex * ROW),
          child.key,
        ),
      );
    });
  });
  return out;
}

function matrix(root: TemplateNode): PlacedNode[] {
  const out: PlacedNode[] = [place(root, 0, 0, -ROW * 2)];
  const children = root.children ?? [];
  /* La rangée du bas ne peut pas être à une hauteur fixe : elle doit passer
     sous les enfants des quadrants du haut, sinon les boîtes se recouvrent
     (c’est exactement ce que le test de collision a rattrapé). */
  const tallest = Math.max(
    1,
    ...children.slice(0, 2).map((child) => child.children?.length ?? 0),
  );
  const bottomY = tallest * (NODE_H + GAP_Y) + ROW;
  const anchors: [number, number][] = [
    [-COL, 0],
    [COL, 0],
    [-COL, bottomY],
    [COL, bottomY],
  ];
  children.forEach((child, index) => {
    const [ax, ay] = anchors[index % anchors.length];
    out.push(place(child, 1, ax, ay, root.key));
    (child.children ?? []).forEach((leaf, leafIndex) => {
      out.push(
        place(leaf, 2, ax, ay + (leafIndex + 1) * (NODE_H + GAP_Y), child.key),
      );
    });
  });
  return out;
}

function fishbone(root: TemplateNode): PlacedNode[] {
  const categories = root.children ?? [];
  const spine = (categories.length + 1) * COL;
  const out: PlacedNode[] = [place(root, 0, spine, 0)];
  categories.forEach((child, index) => {
    const x = (index + 1) * COL;
    const sign = index % 2 === 0 ? -1 : 1;
    out.push(place(child, 1, x, sign * 175, root.key));
    (child.children ?? []).forEach((leaf, leafIndex) => {
      out.push(
        place(
          leaf,
          2,
          x + 70 + leafIndex * 40,
          sign * (175 + (leafIndex + 1) * (NODE_H + 6)),
          child.key,
        ),
      );
    });
  });
  return out;
}

function columns(root: TemplateNode): PlacedNode[] {
  const out: PlacedNode[] = [place(root, 0, 0, -ROW)];
  (root.children ?? []).forEach((child, index) => {
    const x = index * COL;
    out.push(place(child, 1, x, 120, root.key));
    (child.children ?? []).forEach((leaf, leafIndex) => {
      out.push(place(leaf, 2, x, 120 + (leafIndex + 1) * (NODE_H + 4), child.key));
    });
  });
  return out;
}

function ladder(root: TemplateNode): PlacedNode[] {
  const out: PlacedNode[] = [place(root, 0, 0, 0)];
  (root.children ?? []).forEach((child, index) => {
    const x = 210 + index * COL;
    const y = 150 + index * (ROW + 20);
    out.push(place(child, 1, x, y, root.key));
    (child.children ?? []).forEach((leaf, leafIndex) => {
      out.push(
        place(leaf, 2, x + 20, y + (leafIndex + 1) * (NODE_H + 6), child.key),
      );
    });
  });
  return out;
}

/* ------------------------------------------------------------------ */

const BUILDERS: Record<MindmapLayoutKind, (root: TemplateNode) => PlacedNode[]> = {
  "tree-lr": (root) => tree(root, true),
  "tree-tb": (root) => tree(root, false),
  radial,
  timeline,
  matrix,
  fishbone,
  columns,
  ladder,
};

function edgesOf(nodes: PlacedNode[]): PlacedEdge[] {
  return nodes
    .filter((node) => node.parentId)
    .map((node) => ({
      id: `e-${node.parentId}-${node.id}`,
      source: node.parentId as string,
      target: node.id,
    }));
}

/**
 * Calcule la carte complète. Les coordonnées sont toujours ramenées dans le
 * positif (marge de 48 px) : React Flow n’aime pas les cartes qui commencent
 * hors champ, et un `fitView` propre vaut mieux qu’un décalage manuel.
 */
export function layoutMindmap(
  spec: TemplateNode,
  kind: MindmapLayoutKind,
): LayoutResult {
  const raw = BUILDERS[kind](spec);
  const minX = Math.min(...raw.map((node) => node.x));
  const minY = Math.min(...raw.map((node) => node.y));

  const nodes = raw.map((node) => ({
    ...node,
    x: node.x - minX + PAD,
    y: node.y - minY + PAD,
  }));

  return { nodes, edges: edgesOf(nodes) };
}

/** Hauteur/profondeur d’un modèle — sert à écrire des aperçus honnêtes. */
export function measureTree(spec: TemplateNode) {
  const count = (node: TemplateNode): number =>
    1 + (node.children ?? []).reduce((total, child) => total + count(child), 0);
  return { nodes: count(spec), depth: depthOf(spec) };
}

/** Toutes les feuilles partent du même côté : utile aux aperçus SVG. */
export const LAYOUT_LABELS: Record<MindmapLayoutKind, string> = {
  "tree-lr": "Arbre horizontal",
  "tree-tb": "Arbre vertical",
  radial: "Radial",
  timeline: "Frise",
  matrix: "Matrice",
  fishbone: "Arête de poisson",
  columns: "Colonnes",
  ladder: "Escalier",
};
