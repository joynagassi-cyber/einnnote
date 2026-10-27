import type { Block } from "@/types";

/**
 * Pont entre le document TipTap et le modèle `Block[]`.
 *
 * Le produit stocke une note comme une liste de blocs : c’est ce qui permet à
 * une question d’être ancrée sur un bloc précis (`blockId`) et de survivre à la
 * réédition. L’éditeur, lui, travaille sur un document ProseMirror.
 *
 * Règle du pont : **un bloc = un nœud de premier niveau** (paragraphe ou
 * titre). Les puces, la numérotation, le retrait et la citation sont des
 * attributs du bloc, pas des nœuds de liste : le retour de l’éditeur vers le
 * stockage est donc exact, sans heuristique.
 */

export type BlockKind = Block["kind"] | "h3";

export interface BlockMeta {
  bullet?: boolean;
  ordered?: boolean;
  indent?: number;
  marked?: boolean;
  quote?: boolean;
}

/* ------------------------------------------------------------------ */
/* Types ProseMirror minimalistes (ce que l’éditeur produit)           */
/* ------------------------------------------------------------------ */

export interface PmMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  marks?: PmMark[];
  text?: string;
}

/* ------------------------------------------------------------------ */
/* Échappement et marques                                              */
/* ------------------------------------------------------------------ */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ESCAPES[char]);
}

/**
 * Nettoyage du HTML stocké avant qu’il n’entre dans l’éditeur.
 * Le schéma TipTap rejette déjà l’inconnu, mais un contenu importé
 * (sauvegarde restaurée, collage, vieille donnée) ne doit jamais pouvoir
 * exécuter quoi que ce soit si on l’injecte un jour hors de l’éditeur.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(
      /<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
      "",
    )
    .replace(/<\s*\/?(script|style|iframe|object|embed|link|meta)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi,
      '$1="#"',
    );
}

function markTag(mark: PmMark): string {
  switch (mark.type) {
    case "bold":
      return "strong";
    case "italic":
      return "em";
    case "underline":
      return "u";
    case "strike":
      return "s";
    case "code":
      return "code";
    case "highlight":
      return "mark";
    case "link":
      return "a";
    default:
      return "";
  }
}

function openTag(mark: PmMark): string {
  const tag = markTag(mark);
  if (!tag) return "";
  if (tag === "mark" && mark.attrs?.color) {
    return `<mark data-color="${escapeHtml(String(mark.attrs.color))}">`;
  }
  if (tag === "a") {
    const href = escapeHtml(String(mark.attrs?.href ?? ""));
    const title = mark.attrs?.title
      ? ` title="${escapeHtml(String(mark.attrs.title))}"`
      : "";
    return `<a href="${href}"${title} rel="noopener noreferrer" target="_blank">`;
  }
  return `<${tag}>`;
}

function closeTag(mark: PmMark): string {
  const tag = markTag(mark);
  return tag ? `</${tag}>` : "";
}

/** Ordre d’imbrication stable, sinon `<em><strong>` et `<strong><em>` divergent. */
const MARK_ORDER = [
  "link",
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "highlight",
];

function sortMarks(marks: PmMark[] = []): PmMark[] {
  return [...marks].sort(
    (a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type),
  );
}

function renderInline(nodes: PmNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "<br>";
      if (node.type === "text") {
        const marks = sortMarks(node.marks);
        return (
          marks.map(openTag).join("") +
          escapeHtml(node.text ?? "") +
          [...marks].reverse().map(closeTag).join("")
        );
      }
      // Nœud inconnu (image, tableau…) : on garde son texte, jamais son HTML.
      return renderInline(node.content);
    })
    .join("");
}

/** Texte brut d’un nœud, sans mise en forme. */
export function nodeText(node: PmNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  return (node.content ?? []).map(nodeText).join("");
}

/* ------------------------------------------------------------------ */
/* Bloc → nœud (chargement de l’éditeur)                               */
/* ------------------------------------------------------------------ */

function blockAttributes(block: Block, meta: BlockMeta): string {
  const attrs = [`data-block-id="${escapeHtml(block.id)}"`];
  if (block.kind === "quote" || meta.quote) attrs.push('data-kind="quote"');
  if (block.bullet) attrs.push('data-bullet="true"');
  if (meta.ordered) attrs.push('data-ordered="true"');
  if (block.indent) attrs.push(`data-indent="${block.indent}"`);
  if (block.marked) attrs.push('data-marked="true"');
  return attrs.join(" ");
}

/** HTML inséré dans TipTap pour une liste de blocs. */
export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((block) => {
      const tag =
        block.kind === "h1" ? "h1" : block.kind === "h2" ? "h2" : "p";
      return `<${tag} ${blockAttributes(block, {})}>${sanitizeHtml(block.html)}</${tag}>`;
    })
    .join("");
}

/* ------------------------------------------------------------------ */
/* Nœud → bloc (enregistrement)                                        */
/* ------------------------------------------------------------------ */

const KIND_BY_LEVEL: Record<number, Block["kind"]> = { 1: "h1", 2: "h2" };

let fallbackCounter = 0;
function fallbackId() {
  fallbackCounter += 1;
  return `b-auto-${Date.now().toString(36)}-${fallbackCounter}`;
}

export function docToBlocks(
  doc: PmNode,
  makeId: () => string = fallbackId,
): Block[] {
  return (doc.content ?? []).map((node) => {
    const attrs = node.attrs ?? {};
    const level = Number(attrs.level ?? 2);
    const isHeading = node.type === "heading";
    const kind: Block["kind"] = isHeading
      ? (KIND_BY_LEVEL[level] ?? "h2")
      : attrs.kind === "quote"
        ? "quote"
        : "p";

    return {
      id: typeof attrs.blockId === "string" && attrs.blockId ? attrs.blockId : makeId(),
      html: sanitizeHtml(renderInline(node.content)),
      kind,
      bullet: Boolean(attrs.bullet),
      indent: Number(attrs.indent ?? 0) || 0,
      ...(attrs.marked ? { marked: true } : {}),
    };
  });
}

/** Texte brut de chaque bloc, utile pour l’export et les passages de question. */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((block) =>
      block.html
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .trim(),
    )
    .join("\n");
}

/** Markdown minimal, suffisant pour Obsidian et les éditeurs de texte. */
export function blocksToMarkdown(blocks: Block[]): string {
  return blocks
    .map((block) => {
      const text = block.html
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<(strong|b)>/gi, "**")
        .replace(/<\/(strong|b)>/gi, "**")
        .replace(/<(em|i)>/gi, "*")
        .replace(/<\/(em|i)>/gi, "*")
        .replace(/<mark[^>]*>/gi, "==")
        .replace(/<\/mark>/gi, "==")
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "[$2]($1)")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
      const pad = "  ".repeat(block.indent);
      if (block.kind === "h1") return `# ${text}`;
      if (block.kind === "h2") return `## ${text}`;
      if (block.kind === "quote") return `> ${text}`;
      if (block.bullet) return `${pad}- ${text}`;
      return `${pad}${text}`;
    })
    .join("\n\n");
}
