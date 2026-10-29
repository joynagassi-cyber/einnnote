import type { Block } from "@/types";
import type { Delta, DeltaOp, DeltaAttributes } from "quill";
import { escapeHtml, sanitizeHtml } from "@/lib/editor/blocks";

/**
 * Le pont entre le carnet et Quill.
 *
 * Le produit stocke une note comme une **liste de blocs** : c’est ce qui ancre
 * une question sur un endroit précis (`blockId`) et ce qui survit à la
 * réédition. Quill, lui, travaille sur un Delta : une suite de fragments
 * insérés, chacun portant des attributs, chaque ligne se terminant par un
 * `\n`.
 *
 * Règle du pont, aussi stricte qu’avant : **un bloc = une ligne Quill**. Les
 * puces, la numérotation, la tâche, le retrait, l’alignement et le marquage
 * sont des **attributs de ligne**, jamais des nœuds imbriqués. Le retour vers
 * le stockage est donc exact, sans heuristique — et l’`id` d’un bloc traverse
 * l’éditeur sans être réinventé.
 *
 * Trois attributs nous appartiennent (le reste vient de Quill) :
 *
 * | Attribut  | Rôle |
 * | --------- | ---- |
 * | `blockid` | l’identité stable du bloc |
 * | `marked`  | le surlignage « à relire » |
 * | `hr`      | le filet de séparation, qui n’a pas de texte |
 */

/* ------------------------------------------------------------------ */
/* Nos attributs                                                       */
/* ------------------------------------------------------------------ */

export const FORMAT = {
  blockId: "blockid",
  marked: "marked",
  rule: "hr",
} as const;

/**
 * Un attribut de bloc est « posé » dès qu’il vaut `true` **ou** `"true"` :
 * Parchment relit ses attributs dans le DOM, donc un booléen écrit revient
 * sous forme de chaîne. Sans ce test, « à relire » et le filet seraient
 * oubliés au premier rechargement.
 */
export function isSet(value: unknown): boolean {
  return value === true || value === "true";
}

/** Couleurs de surlignage : Quill renvoie du `rgb()`, on garde de l’hexa. */
function toHexColor(value: unknown): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  const rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgb) return value;
  const hex = rgb
    .slice(1, 4)
    .map((part) => Number(part).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

/* ------------------------------------------------------------------ */
/* HTML en ligne → fragments                                           */
/* ------------------------------------------------------------------ */

export interface InlinePiece {
  text: string;
  formats: DeltaAttributes;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

export function unescapeHtml(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);
}

const TAG_FORMAT: Record<string, { name: string; value: unknown }> = {
  strong: { name: "bold", value: true },
  b: { name: "bold", value: true },
  em: { name: "italic", value: true },
  i: { name: "italic", value: true },
  u: { name: "underline", value: true },
  s: { name: "strike", value: true },
  strike: { name: "strike", value: true },
  del: { name: "strike", value: true },
  code: { name: "code", value: true },
  sup: { name: "script", value: "super" },
  sub: { name: "script", value: "sub" },
  mark: { name: "background", value: true },
  a: { name: "link", value: true },
};

/**
 * Lit le HTML d’un bloc et rend les fragments Quill correspondants.
 *
 * Le HTML vient de nous (`blocksToHtml`), d’une sauvegarde restaurée ou d’un
 * export : on n’essaie pas d’être un navigateur, on reconnaît **nos** balises
 * et on ignore le reste. Une balise inconnue ne casse pas le texte : elle est
 * simplement retirée.
 */
export function parseInline(html: string): InlinePiece[] {
  const pieces: InlinePiece[] = [];
  const stack: { name: string; value: unknown }[] = [];
  const pattern = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>/g;
  let cursor = 0;

  const pushText = (raw: string) => {
    if (!raw) return;
    const text = unescapeHtml(raw);
    if (!text) return;
    const formats: DeltaAttributes = {};
    for (const entry of stack) formats[entry.name] = entry.value;
    pieces.push({ text, formats });
  };

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    pushText(html.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const [tag, closing, name, attrs, selfClosing] = match;
    const lower = name.toLowerCase();

    /* `<br>` : un bloc est une ligne. Un saut interne devient une espace,
       sinon le bloc se couperait en deux au rechargement et changerait d’id. */
    if (lower === "br") {
      pushText(" ");
      continue;
    }

    /* Une couleur ne s’écrit pas avec une balise à elle : c’est un `style`.
       On reconnaît donc `<span>` et l’ancien `<font color>`, et l’on empile
       une entrée `color` — même quand il n’y a pas de couleur, pour qu’une
       fermeture ne retire pas la couleur d’un parent. */
    if (lower === "span" || lower === "font") {
      if (closing === "/") {
        for (let at = stack.length - 1; at >= 0; at -= 1) {
          if (stack[at].name === "color") {
            stack.splice(at, 1);
            break;
          }
        }
        continue;
      }
      const fromStyle = attrs.match(/style\s*=\s*"[^"]*color\s*:\s*([^;"]+)/i)?.[1];
      const fromAttr = attrs.match(/\scolor\s*=\s*"([^"]*)"/i)?.[1];
      const raw = fromStyle ?? fromAttr;
      stack.push({ name: "color", value: raw ? toHexColor(unescapeHtml(raw.trim())) : undefined });
      continue;
    }

    const format = TAG_FORMAT[lower];
    if (!format) continue;

    if (closing === "/") {
      for (let at = stack.length - 1; at >= 0; at -= 1) {
        if (stack[at].name === format.name) {
          stack.splice(at, 1);
          break;
        }
      }
      continue;
    }

    if (selfClosing === "/" && tag.endsWith("/>")) continue;

    let value: unknown = format.value;
    if (lower === "mark") {
      const color = attrs.match(/data-color="([^"]*)"/i)?.[1];
      value = color ? toHexColor(unescapeHtml(color)) : "var(--highlight)";
    }
    if (lower === "a") {
      const href = attrs.match(/href="([^"]*)"/i)?.[1];
      if (!href) continue;
      value = unescapeHtml(href);
    }
    stack.push({ name: format.name, value });
  }

  pushText(html.slice(cursor));
  return pieces;
}

/* ------------------------------------------------------------------ */
/* Fragments → HTML en ligne                                           */
/* ------------------------------------------------------------------ */

/** Ordre d’imbrication stable : `<em><strong>` ne doit jamais varier. */
const FORMAT_ORDER = [
  "link",
  "color",
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "background",
  "script",
];

function formatRank(name: string): number {
  const at = FORMAT_ORDER.indexOf(name);
  return at === -1 ? FORMAT_ORDER.length : at;
}

function openTag(name: string, value: unknown): string {
  switch (name) {
    case "bold":
      return "<strong>";
    case "italic":
      return "<em>";
    case "underline":
      return "<u>";
    case "strike":
      return "<s>";
    case "code":
      return "<code>";
    case "script":
      return value === "sub" ? "<sub>" : "<sup>";
    case "background":
      return `<mark data-color="${escapeHtml(String(toHexColor(value) ?? "var(--highlight)"))}">`;
    case "link":
      return `<a href="${escapeHtml(String(value))}">`;
    case "color":
      return value ? `<span style="color: ${escapeHtml(String(toHexColor(value) ?? value))}">` : "";
    default:
      return "";
  }
}

function closeTag(name: string, value?: unknown): string {
  switch (name) {
    case "bold":
      return "</strong>";
    case "italic":
      return "</em>";
    case "underline":
      return "</u>";
    case "strike":
      return "</s>";
    case "code":
      return "</code>";
    case "script":
      return value === "sub" ? "</sub>" : "</sup>";
    case "background":
      return "</mark>";
    case "link":
      return "</a>";
    case "color":
      return value ? "</span>" : "";
    default:
      return "";
  }
}

/** Les attributs d’un fragment, dans un ordre qui ne dépend pas de Quill. */
function orderedFormats(attributes: DeltaAttributes = {}): [string, unknown][] {
  return Object.entries(attributes)
    .filter(([name, value]) => value !== null && value !== undefined && value !== false)
    .filter(([name]) => FORMAT_ORDER.includes(name))
    .sort(([a], [b]) => formatRank(a) - formatRank(b));
}

export function inlineToHtml(pieces: InlinePiece[]): string {
  return pieces
    .map((piece) => {
      if (!piece.text) return "";
      const formats = orderedFormats(piece.formats);
      const open = formats.map(([name, value]) => openTag(name, value)).join("");
      const close = [...formats]
        .reverse()
        .map(([name, value]) => closeTag(name, value))
        .join("");
      return open + escapeHtml(piece.text) + close;
    })
    .join("");
}

/* ------------------------------------------------------------------ */
/* Bloc → ligne Quill                                                  */
/* ------------------------------------------------------------------ */

/**
 * Les attributs de **ligne** d’un bloc.
 *
 * `header` et `list` sont des formats Quill natifs ; on s’en sert plutôt que
 * d’inventer les nôtres, pour que le copier-coller, l’annulation et le
 * comportement de la touche Entrée restent ceux de la bibliothèque.
 */
export function lineFormats(block: Block): DeltaAttributes {
  const formats: DeltaAttributes = { [FORMAT.blockId]: block.id };

  if (block.kind === "h1" || block.kind === "h2" || block.kind === "h3") {
    formats.header = Number(block.kind.slice(1));
  }
  if (block.kind === "quote") formats.blockquote = true;
  if (block.kind === "rule") formats[FORMAT.rule] = true;

  if (block.task) formats.list = block.checked ? "checked" : "unchecked";
  else if (block.bullet) formats.list = "bullet";
  else if (block.ordered) formats.list = "ordered";

  if (block.indent > 0) formats.indent = block.indent;
  if (block.align) formats.align = block.align;
  if (block.marked) formats[FORMAT.marked] = true;
  /* Une cellule : sa rangée est portée par la ligne, comme chez Quill. Les
     cellules d’une même rangée se suivent, donc l’ordre des colonnes tient. */
  if (block.table) formats.table = block.table;

  return formats;
}

/** Une liste de blocs, prête pour `quill.setContents`. */
export function blocksToDelta(blocks: Block[]): Delta {
  const ops: DeltaOp[] = [];
  const list = blocks.length > 0 ? blocks : [];

  for (const block of list) {
    for (const piece of parseInline(sanitizeHtml(block.html))) {
      ops.push(
        Object.keys(piece.formats).length > 0
          ? { insert: piece.text, attributes: piece.formats }
          : { insert: piece.text },
      );
    }
    ops.push({ insert: "\n", attributes: lineFormats(block) });
  }

  if (ops.length === 0) ops.push({ insert: "\n" });
  return { ops };
}

/* ------------------------------------------------------------------ */
/* Ligne Quill → bloc                                                  */
/* ------------------------------------------------------------------ */

let fallbackCounter = 0;

function fallbackId(): string {
  fallbackCounter += 1;
  return `b-auto-${Date.now().toString(36)}-${fallbackCounter}`;
}

/** Un morceau de Delta découpé en lignes, chacune avec ses attributs. */
interface RawLine {
  pieces: InlinePiece[];
  attributes: DeltaAttributes;
}

function splitLines(delta: Delta): RawLine[] {
  const lines: RawLine[] = [];
  let current: InlinePiece[] = [];

  for (const op of delta.ops ?? []) {
    if (typeof op.insert !== "string") continue;
    const attributes = op.attributes ?? {};
    const parts = op.insert.split("\n");

    parts.forEach((part, at) => {
      if (part) current.push({ text: part, formats: attributes });
      /* Chaque `\n` ferme une ligne — le dernier fragment n’en ouvre pas une. */
      if (at < parts.length - 1) {
        lines.push({ pieces: current, attributes });
        current = [];
      }
    });
  }

  if (current.length > 0) lines.push({ pieces: current, attributes: {} });
  return lines;
}

function kindOf(attributes: DeltaAttributes, hasText: boolean): Block["kind"] {
  if (isSet(attributes[FORMAT.rule])) return "rule";
  const header = Number(attributes.header ?? 0);
  if (header === 1) return "h1";
  if (header === 2) return "h2";
  if (header === 3) return "h3";
  if (isSet(attributes.blockquote)) return "quote";
  return hasText ? "p" : "p";
}

/** Tout le document Quill, rendu au carnet. */
export function deltaToBlocks(delta: Delta, makeId: () => string = fallbackId): Block[] {
  const lines = splitLines(delta);
  const blocks: Block[] = [];

  for (const line of lines) {
    const attributes = line.attributes ?? {};
    const html = sanitizeHtml(inlineToHtml(line.pieces));
    const kind = kindOf(attributes, html.length > 0);
    const list = attributes.list;
    const rawId = attributes[FORMAT.blockId];

    blocks.push({
      id: typeof rawId === "string" && rawId ? rawId : makeId(),
      html,
      kind,
      bullet: list === "bullet",
      ...(list === "ordered" ? { ordered: true } : {}),
      ...(list === "checked" || list === "unchecked" ? { task: true } : {}),
      ...(list === "checked" ? { checked: true } : {}),
      indent: Number(attributes.indent ?? 0) || 0,
      ...(attributes.align === "center" || attributes.align === "right"
        ? { align: attributes.align as "center" | "right" }
        : {}),
      ...(isSet(attributes[FORMAT.marked]) ? { marked: true } : {}),
      ...(typeof attributes.table === "string" && attributes.table
        ? { table: attributes.table }
        : {}),
    });
  }

  /* Un document vide reste une note vide, pas une note sans bloc : sans ce
     garde-fou, la première frappe n’aurait nulle part où s’écrire. */
  if (blocks.length === 0) {
    blocks.push({ id: makeId(), html: "", kind: "p", bullet: false, indent: 0 });
  }
  return blocks;
}
