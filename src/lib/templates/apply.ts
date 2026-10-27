import type { Block, EdgeStyle, MindEdge, MindNode } from "@/types";
import type { TemplateBlockSpec, NoteTemplate, ZettelTemplate } from "@/lib/templates/notes";
import { layoutMindmap } from "@/lib/mindmap/layout";
import type { MindmapTemplate } from "@/lib/templates/mindmaps";
import type { VaultTemplate } from "@/lib/templates/graphs";

/**
 * Passes-plats entre un modèle et les objets réellement stockés.
 *
 * Les modèles ne connaissent ni `uid`, ni l’état, ni le store : ils sont des
 * données pures. Ce module est le seul endroit où un modèle devient du contenu
 * éditable — ce qui permet de tester les modèles sans monter React.
 */

let counter = 0;
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 5)}`;

/** Un bloc de modèle n’a pas d’identifiant : il en reçoit un à l’instant T. */
export function blocksFromTemplate(specs: TemplateBlockSpec[]): Block[] {
  return specs.map((spec) => ({
    id: uid("b"),
    html: spec.text,
    kind: spec.kind,
    bullet: Boolean(spec.bullet),
    indent: spec.indent ?? 0,
    ...(spec.marked ? { marked: true } : {}),
  }));
}

export interface MindmapSeed {
  nodes: MindNode[];
  edges: MindEdge[];
  edgeStyle: EdgeStyle;
}

/** Déplie un modèle en nœuds + arêtes, prêts à remplacer le canevas. */
export function mindmapFromTemplate(template: MindmapTemplate): MindmapSeed {
  const { nodes, edges } = layoutMindmap(template.spec, template.layout);
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      text: node.text,
      shape: node.shape,
      x: node.x,
      y: node.y,
      ...(node.parentId ? { parentId: node.parentId } : {}),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
    edgeStyle: template.edgeStyle,
  };
}

export interface NoteSeed {
  title: string;
  collection?: string;
  blocks: Block[];
}

/** « Cours — » devient « Cours » : un titre de brouillon ne doit pas finir
    sur un tiret que l’utilisateur devra effacer lui-même. */
export function titleFromTemplate(value: string): string {
  return value.replace(/\s*[—–-]\s*$/, "").trim();
}

export function noteFromTemplate(template: NoteTemplate): NoteSeed {
  return {
    title: titleFromTemplate(template.title),
    collection: template.collection,
    blocks: blocksFromTemplate(template.blocks),
  };
}

export function zettelFromTemplate(template: ZettelTemplate) {
  return {
    title: titleFromTemplate(template.title),
    body: template.body,
    source: template.source,
    refs: [...template.refs],
  };
}

/** Sert aux aperçus : combien de blocs, combien de nœuds. */
export function templateSignature(template: NoteTemplate): string {
  const headings = template.blocks.filter((block) => block.kind === "h1").length;
  return `${headings} sections · ${template.blocks.length} blocs`;
}

export interface VaultSeed {
  name: string;
  note: string;
  style: string;
  cards: { code: string; title: string; body: string; source: string; refs: string[] }[];
}

/**
 * Déplie un modèle de coffre. Les codes sont **déjà** ceux du modèle : c’est ce
 * qui permet aux références de survivre telles quelles, fiche par fiche.
 */
export function vaultFromTemplate(template: VaultTemplate): VaultSeed {
  return {
    name: template.name,
    note: template.intent,
    style: template.style,
    cards: template.cards.map((card) => ({
      code: card.code,
      title: card.title,
      body: card.body,
      source: card.source,
      refs: [...card.refs],
    })),
  };
}
