import type { ZettelCard } from "@/types";
import { layoutMindmap, type TemplateNode } from "@/lib/mindmap/layout";
import { placeColumns, placeFrieze } from "@/lib/mindmap/levels";
import type { GraphLayoutKind } from "@/lib/graph/styles";

/**
 * Le graphe d’un coffre Zettelkasten.
 *
 * Un coffre est un **réseau** de fiches (chacune cite les autres par code),
 * mais un réseau illisible ne montre rien : 13 fiches reliées dans tous les
 * sens donnent une pelote. On en tire donc un **arbre** (parcours en largeur
 * depuis une racine choisie), et on garde les liens qui ne sont pas dans
 * l’arbre comme **renvois** — visibles, mais plus fins. C’est la distinction
 * que font les vrais outils Zettelkasten entre la structure d’un côté et les
 * références croisées de l’autre.
 *
 * Trois propriétés tenues par les tests :
 *
 * 1. **Rien ne disparaît** : chaque fiche du coffre a une position, y compris
 *    les fiches isolées (« hors arbre »).
 * 2. **C’est déterministe** : même coffre → même dessin, quel que soit l’ordre
 *    d’insertion dans le stockage (tri naturel des codes, jamais l’ordre d’un
 *    `Map` ou d’un objet).
 * 3. **Ça ne se chevauche pas** : les cartes font 208 × 84 px et le pas de la
 *    disposition est calculé pour elles (voir `CARD_W`/`CARD_H`).
 */

export interface ZettelLink {
  /** code de la fiche qui cite */
  source: string;
  /** code de la fiche citée */
  target: string;
  /** déclaré des deux côtés ? */
  mutual: boolean;
}

export interface ZettelTreeNode {
  code: string;
  card: ZettelCard;
  parentCode?: string;
  depth: number;
  /** fiche non atteinte depuis la racine principale */
  detached?: boolean;
}

export interface ZettelGraph {
  rootCode: string | null;
  nodes: ZettelTreeNode[];
  /** les liens de l’arbre (trait plein) */
  treeLinks: { source: string; target: string }[];
  /** les liens qui ne sont pas dans l’arbre (renvois, trait fin) */
  echoes: ZettelLink[];
  /** toutes les paires déclarées, arbre compris */
  links: ZettelLink[];
}

export const CARD_W = 208;
export const CARD_H = 84;
const CARD_SIZE = { width: CARD_W, height: CARD_H };

/** Ordre « naturel » des codes (#1A < #1A1 < #1A1a < #1B < #2). */
export function compareCodes(a: string, b: string): number {
  return a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });
}

/** Paires de fiches liées, dédupliquées, hors auto-références et codes inconnus. */
export function zettelLinks(cards: ZettelCard[]): ZettelLink[] {
  const known = new Set(cards.map((card) => card.code));
  const declared = new Set<string>();
  for (const card of cards) {
    for (const ref of card.refs) {
      if (ref === card.code || !known.has(ref)) continue;
      declared.add(`${card.code}\u0000${ref}`);
    }
  }
  const seen = new Set<string>();
  const links: ZettelLink[] = [];
  for (const card of cards) {
    for (const ref of card.refs) {
      if (ref === card.code || !known.has(ref)) continue;
      const key = [card.code, ref].sort(compareCodes).join("\u0000");
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({
        source: card.code,
        target: ref,
        mutual: declared.has(`${ref}\u0000${card.code}`),
      });
    }
  }
  return links.sort(
    (a, b) => compareCodes(a.source, b.source) || compareCodes(a.target, b.target),
  );
}

/** Degré de chaque fiche (liens entrants + sortants). */
export function zettelDegrees(cards: ZettelCard[], links: ZettelLink[]) {
  const degrees = new Map<string, number>(cards.map((card) => [card.code, 0]));
  for (const link of links) {
    degrees.set(link.source, (degrees.get(link.source) ?? 0) + 1);
    degrees.set(link.target, (degrees.get(link.target) ?? 0) + 1);
  }
  return degrees;
}

/**
 * Racine par défaut : la fiche la plus citée. À égalité, le code le plus petit
 * — donc la première fiche écrite. Une fiche ouverte par lien profond
 * (`?card=`) prend la main sur ce choix.
 */
export function zettelRoot(cards: ZettelCard[], preferred?: string | null): ZettelCard | undefined {
  if (preferred && cards.some((card) => card.code === preferred)) {
    return cards.find((card) => card.code === preferred);
  }
  if (!cards.length) return undefined;
  const degrees = zettelDegrees(cards, zettelLinks(cards));
  return [...cards].sort((a, b) => {
    const diff = (degrees.get(b.code) ?? 0) - (degrees.get(a.code) ?? 0);
    return diff !== 0 ? diff : compareCodes(a.code, b.code);
  })[0];
}

interface Adjacency {
  neighbours: Map<string, string[]>;
}

function buildAdjacency(cards: ZettelCard[], links: ZettelLink[]): Adjacency {
  const neighbours = new Map<string, string[]>(cards.map((card) => [card.code, []]));
  for (const link of links) {
    neighbours.get(link.source)?.push(link.target);
    neighbours.get(link.target)?.push(link.source);
  }
  for (const list of neighbours.values()) {
    list.sort(compareCodes);
  }
  return { neighbours };
}

/**
 * Arbre couvrant, en largeur, à partir d’une racine. Les composantes
 * déconnectées sont rattachées par leur propre racine et marquées `detached`.
 */
export function zettelGraph(cards: ZettelCard[], preferredRoot?: string | null): ZettelGraph {
  const links = zettelLinks(cards);
  const root = zettelRoot(cards, preferredRoot);
  if (!root) {
    return { rootCode: null, nodes: [], treeLinks: [], echoes: [], links: [] };
  }
  const byCode = new Map(cards.map((card) => [card.code, card]));
  const { neighbours } = buildAdjacency(cards, links);
  const degrees = zettelDegrees(cards, links);

  const visited = new Set<string>();
  const nodes: ZettelTreeNode[] = [];
  const treeLinks: { source: string; target: string }[] = [];
  const treePairs = new Set<string>();

  const spread = (start: string, detached: boolean) => {
    const queue: string[] = [start];
    visited.add(start);
    nodes.push({ code: start, card: byCode.get(start)!, depth: 0, detached });
    while (queue.length) {
      const current = queue.shift()!;
      const currentDepth = nodes.find((node) => node.code === current)?.depth ?? 0;
      for (const next of neighbours.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        nodes.push({
          code: next,
          card: byCode.get(next)!,
          parentCode: current,
          depth: currentDepth + 1,
          detached,
        });
        treeLinks.push({ source: current, target: next });
        treePairs.add(`${current}\u0000${next}`);
        treePairs.add(`${next}\u0000${current}`);
        queue.push(next);
      }
    }
  };

  spread(root.code, false);

  // composantes restantes : la plus connectée d’abord, puis ordre des codes
  for (;;) {
    const remaining = cards
      .filter((card) => !visited.has(card.code))
      .sort((a, b) => {
        const diff = (degrees.get(b.code) ?? 0) - (degrees.get(a.code) ?? 0);
        return diff !== 0 ? diff : compareCodes(a.code, b.code);
      });
    if (!remaining.length) break;
    spread(remaining[0].code, true);
  }

  const echoes = links.filter(
    (link) => !treePairs.has(`${link.source}\u0000${link.target}`),
  );

  return { rootCode: root.code, nodes, treeLinks, echoes, links };
}

/* ------------------------------------------------------------------ */
/* Disposition                                                         */
/* ------------------------------------------------------------------ */

/** Le moteur de cartes mentales place des boîtes de 150 × 96. */
const LAYOUT_BOX = { w: 150, h: 96 };
/** Pas minimal garanti entre deux cartes, une fois la mise à l’échelle faite. */
const SCALE_X = 1.2;
const SCALE_Y = 0.94;
const PAD = 40;

export interface ZettelPosition {
  code: string;
  x: number;
  y: number;
  detached: boolean;
  root: boolean;
  depth: number;
}

export interface ZettelLayout {
  positions: ZettelPosition[];
  width: number;
  height: number;
}

function toSpec(
  code: string,
  graph: ZettelGraph,
  childrenOf: Map<string, string[]>,
  seen = new Set<string>(),
): TemplateNode {
  if (seen.has(code)) return { key: code, text: "" };
  seen.add(code);
  const node = graph.nodes.find((item) => item.code === code);
  return {
    key: code,
    text: node?.card.title ?? "",
    children: (childrenOf.get(code) ?? []).map((child) =>
      toSpec(child, graph, childrenOf, seen),
    ),
  };
}

interface Component {
  rootCode: string;
  childrenOf: Map<string, string[]>;
  codes: Set<string>;
  detached: boolean;
}

function componentsOf(graph: ZettelGraph): Component[] {
  const components: Component[] = [];
  const seen = new Set<string>();
  for (const node of graph.nodes) {
    if (seen.has(node.code)) continue;
    const rootCode = node.detached ? node.code : graph.rootCode!;
    const childrenOf = new Map<string, string[]>();
    const codes = new Set<string>([rootCode]);
    seen.add(rootCode);
    const queue = [rootCode];
    while (queue.length) {
      const current = queue.shift()!;
      const children = graph.nodes
        .filter((item) => item.parentCode === current)
        .map((item) => item.code)
        .sort(compareCodes);
      childrenOf.set(current, children);
      for (const child of children) {
        if (seen.has(child)) continue;
        seen.add(child);
        codes.add(child);
        queue.push(child);
      }
    }
    components.push({
      rootCode,
      childrenOf,
      codes,
      detached: Boolean(graph.nodes.find((item) => item.code === rootCode)?.detached),
    });
  }
  return components;
}

interface Placed {
  code: string;
  cx: number;
  cy: number;
}

/** Range un arbre (déjà converti en modèle) et rend des centres en pixels. */
function placeTree(
  spec: TemplateNode,
  layout: GraphLayoutKind,
  scale: { x: number; y: number },
): Placed[] {
  if (layout === "tree-both") return placeBinary(spec, scale);
  if (layout === "columns" || layout === "timeline") {
    const boxes =
      layout === "columns"
        ? placeColumns(spec, CARD_SIZE)
        : placeFrieze(spec, CARD_SIZE);
    return boxes.map((box) => ({
      code: box.key,
      cx: box.x + CARD_W / 2,
      cy: box.y + CARD_H / 2,
    }));
  }
  const kind = layout === "tree-tb" ? "tree-tb" : layout === "radial" ? "radial" : "tree-lr";
  const { nodes } = layoutMindmap(spec, kind);
  return nodes.map((node) => ({
    code: node.id,
    cx: (node.x + LAYOUT_BOX.w / 2) * scale.x,
    cy: (node.y + LAYOUT_BOX.h / 2) * scale.y,
  }));
}

/**
 * Arbre « binaire » : la racine au centre, la moitié des branches à droite,
 * l’autre moitié à gauche, obtenues en miroir. C’est la disposition des cartes
 * mentales dessinées à la main, et la seule qui reste lisible quand une racine
 * a huit enfants directs.
 */
function placeBinary(spec: TemplateNode, scale: { x: number; y: number }): Placed[] {
  const children = spec.children ?? [];
  if (children.length < 2) return placeTree({ ...spec }, "tree-lr", scale);

  const half = Math.ceil(children.length / 2);
  const right = children.slice(0, half);
  const left = children.slice(half);

  const rightPlaced = placeTree({ ...spec, children: right }, "tree-lr", scale);
  const leftPlaced = placeTree({ ...spec, children: left }, "tree-lr", scale);

  const anchor = rightPlaced.find((node) => node.code === spec.key);
  const anchorX = anchor?.cx ?? 0;
  const anchorY = anchor?.cy ?? 0;

  const leftNodes = leftPlaced.filter((node) => node.code !== spec.key);
  /* Les deux moitiés sont centrées verticalement sur la racine : sans cela, la
     branche de gauche descend sous la droite et la carte penche. */
  const leftTop = Math.min(...leftNodes.map((node) => node.cy));
  const leftBottom = Math.max(...leftNodes.map((node) => node.cy));
  const shift = leftNodes.length ? anchorY - (leftTop + leftBottom) / 2 : 0;

  const merged = new Map<string, Placed>();
  for (const node of rightPlaced) merged.set(node.code, node);
  for (const node of leftNodes) {
    merged.set(node.code, {
      code: node.code,
      cx: 2 * anchorX - node.cx,
      cy: node.cy + shift,
    });
  }
  return [...merged.values()];
}

/**
 * Disposition complète : composante principale puis fiches « hors arbre »
 * empilées dessous, chacune dans sa propre rangée.
 */
export function layoutZettelGraph(
  graph: ZettelGraph,
  layout: GraphLayoutKind,
): ZettelLayout {
  if (!graph.nodes.length) return { positions: [], width: 0, height: 0 };

  const components = componentsOf(graph);
  /* Un cercle parfait gaspille la hauteur d’un écran de bureau : en radial, on
     aplatit l’anneau (ellipse) pour rester dans le champ de la caméra. */
  const scale =
    layout === "radial" ? { x: SCALE_X * 0.86, y: SCALE_Y * 0.6 } : { x: SCALE_X, y: SCALE_Y };
  const positions: ZettelPosition[] = [];
  let cursorY = 0;
  let rowHeight = 0;
  let maxX = 0;

  for (const component of components) {
    const spec = toSpec(component.rootCode, graph, component.childrenOf);
    const placed = placeTree(spec, layout, scale);
    if (!placed.length) continue;

    const minX = Math.min(...placed.map((node) => node.cx));
    const minY = Math.min(...placed.map((node) => node.cy));
    const localMaxX = Math.max(...placed.map((node) => node.cx)) + CARD_W;
    const localMaxY = Math.max(...placed.map((node) => node.cy)) + CARD_H;

    for (const node of placed) {
      positions.push({
        code: node.code,
        x: Math.round(node.cx - minX),
        y: Math.round(node.cy - minY + cursorY),
        detached: component.detached,
        /* une fiche « hors arbre » n’est pas la racine du coffre : elle ne doit
           pas porter le même traitement visuel */
        root: !component.detached && node.code === component.rootCode,
        depth: graph.nodes.find((item) => item.code === node.code)?.depth ?? 0,
      });
    }

    maxX = Math.max(maxX, localMaxX - minX);
    rowHeight = Math.max(rowHeight, localMaxY - minY);
    cursorY += localMaxY - minY + 48;
  }

  // marge uniforme, et coordonnées positives comme partout ailleurs
  return {
    positions: positions.map((position) => ({
      ...position,
      x: position.x + PAD,
      y: position.y + PAD,
    })),
    width: maxX + PAD * 2,
    height: cursorY - 48 + PAD * 2,
  };
}
