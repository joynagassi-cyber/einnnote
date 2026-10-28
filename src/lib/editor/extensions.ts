import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PmNode } from "@tiptap/pm/model";

/* ------------------------------------------------------------------ */
/* Attributs de bloc : ce qui distingue une puce d’un titre ou d’une   */
/* citation, sans créer de nœuds de liste (le stockage reste 1:1).     */
/* ------------------------------------------------------------------ */

export const BLOCK_META_TYPES = ["paragraph", "heading"] as const;

export type BlockAttrName =
  | "blockId"
  | "kind"
  | "bullet"
  | "ordered"
  | "task"
  | "checked"
  | "indent"
  | "align"
  | "marked";

export const BlockMeta = Extension.create({
  name: "blockMeta",

  addGlobalAttributes() {
    return [
      {
        types: [...BLOCK_META_TYPES],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) =>
              attributes.blockId ? { "data-block-id": attributes.blockId } : {},
          },
          kind: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-kind"),
            renderHTML: (attributes) =>
              attributes.kind ? { "data-kind": attributes.kind } : {},
          },
          bullet: {
            default: false,
            parseHTML: (element) => element.hasAttribute("data-bullet"),
            renderHTML: (attributes) =>
              attributes.bullet ? { "data-bullet": "true" } : {},
          },
          ordered: {
            default: false,
            parseHTML: (element) => element.hasAttribute("data-ordered"),
            renderHTML: (attributes) =>
              attributes.ordered ? { "data-ordered": "true" } : {},
          },
          task: {
            default: false,
            parseHTML: (element) => element.hasAttribute("data-task"),
            renderHTML: (attributes) =>
              attributes.task ? { "data-task": "true" } : {},
          },
          checked: {
            default: false,
            parseHTML: (element) => element.hasAttribute("data-checked"),
            renderHTML: (attributes) =>
              attributes.checked ? { "data-checked": "true" } : {},
          },
          align: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-align"),
            renderHTML: (attributes) =>
              attributes.align ? { "data-align": attributes.align } : {},
          },
          indent: {
            default: 0,
            parseHTML: (element) =>
              Number(element.getAttribute("data-indent") ?? 0) || 0,
            renderHTML: (attributes) =>
              attributes.indent
                ? { "data-indent": String(attributes.indent) }
                : {},
          },
          marked: {
            default: false,
            parseHTML: (element) => element.hasAttribute("data-marked"),
            renderHTML: (attributes) =>
              attributes.marked ? { "data-marked": "true" } : {},
          },
        },
      },
    ];
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => changeIndent(this.editor, 1),
      "Shift-Tab": () => changeIndent(this.editor, -1),
      "Mod-Shift-8": () => toggleMeta(this.editor, "bullet"),
      "Mod-Shift-7": () => toggleMeta(this.editor, "ordered"),
      "Mod-Shift-9": () => toggleQuote(this.editor),
      "Mod-Shift-4": () => toggleTask(this.editor),
      "Mod-Alt-0": () => turnInto(this.editor, "p"),
      "Mod-Alt-1": () => turnInto(this.editor, "h1"),
      "Mod-Alt-2": () => turnInto(this.editor, "h2"),
      "Mod-Alt-3": () => turnInto(this.editor, "h3"),
      "Mod-Shift-X": () => {
        const chain = this.editor.chain().focus();
        const active = this.editor.isActive("strike");
        return active ? chain.unsetStrike().run() : chain.setStrike().run();
      },
    };
  },
});

/* ------------------------------------------------------------------ */
/* Badges de questions dans la gouttière                               */
/* ------------------------------------------------------------------ */

export interface BadgeOptions {
  markers: () => Map<string, number[]>;
  onBadgeClick: (blockId: string) => void;
}

export const QuestionBadges = Extension.create<BadgeOptions>({
  name: "questionBadges",

  addOptions() {
    return {
      markers: () => new Map<string, number[]>(),
      onBadgeClick: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey("questionBadges"),
        props: {
          decorations(state) {
            const markers = options.markers();
            if (markers.size === 0) return DecorationSet.empty;

            const decorations: Decoration[] = [];
            state.doc.forEach((node, offset) => {
              const blockId = node.attrs.blockId as string | null;
              if (!blockId) return;
              const numbers = markers.get(blockId);
              if (!numbers?.length) return;

              decorations.push(
                Decoration.widget(
                  offset + 1,
                  () => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "gutter-badge";
                    button.textContent = `Q${numbers[0]}`;
                    button.setAttribute(
                      "aria-label",
                      `Question${numbers.length > 1 ? "s" : ""} ${numbers.join(", ")} sur ce passage`,
                    );
                    button.title = numbers.map((n) => `Q${n}`).join(" · ");
                    button.contentEditable = "false";
                    button.addEventListener("click", (event) => {
                      event.preventDefault();
                      options.onBadgeClick(blockId);
                    });
                    return button;
                  },
                  { side: -1, key: `badge-${blockId}-${numbers.join("-")}` },
                ),
              );
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

/* ------------------------------------------------------------------ */
/* Actions de bloc (partagées par la barre d’outils et le clavier)     */
/* ------------------------------------------------------------------ */

function isBlockNode(node: PmNode) {
  return (BLOCK_META_TYPES as readonly string[]).includes(node.type.name);
}

function forEachSelectedBlock(
  editor: Editor,
  apply: (
    attrs: Record<string, unknown>,
    node: PmNode,
  ) => Record<string, unknown> | null,
) {
  const { state, view } = editor;
  const { from, to } = state.selection;
  const tr = state.tr;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!isBlockNode(node)) return true;
    const next = apply({ ...node.attrs }, node);
    if (next) tr.setNodeMarkup(pos, undefined, next);
    return false;
  });

  if (tr.docChanged) view.dispatch(tr);
  return tr.docChanged;
}

/** Applique des attributs au bloc (ou à tous les blocs sélectionnés). */
export function setBlockAttrs(editor: Editor, attrs: Record<string, unknown>) {
  return forEachSelectedBlock(editor, (current) => ({ ...current, ...attrs }));
}

export function toggleMeta(editor: Editor, name: "bullet" | "ordered") {
  const active = currentBlockAttrs(editor)[name] === true;
  return setBlockAttrs(editor, {
    [name]: !active,
    ...(name === "bullet" ? { ordered: false } : { bullet: false }),
  });
}

export function toggleQuote(editor: Editor) {
  const quoted = currentBlockAttrs(editor).kind === "quote";
  return setBlockAttrs(editor, { kind: quoted ? null : "quote", indent: 0 });
}

export function changeIndent(editor: Editor, delta: number) {
  let changed = false;
  forEachSelectedBlock(editor, (attrs) => {
    const indent = Math.min(3, Math.max(0, Number(attrs.indent ?? 0) + delta));
    changed = true;
    return { ...attrs, indent };
  });
  return changed;
}

export function currentBlockAttrs(editor: Editor): Record<string, unknown> {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (isBlockNode(node)) return { ...node.attrs };
  }
  return {};
}

/** Identifiant du bloc qui contient la position donnée. */
export function blockIdAt(editor: Editor, pos: number): string | null {
  const resolved = editor.state.doc.resolve(
    Math.min(pos, editor.state.doc.content.size),
  );
  for (let depth = resolved.depth; depth > 0; depth -= 1) {
    const node = resolved.node(depth);
    if (isBlockNode(node)) return (node.attrs.blockId as string | null) ?? null;
  }
  return null;
}

/** Texte de la sélection courante (espaces normalisés). */
export function selectedText(editor: Editor): string {
  const { from, to } = editor.state.selection;
  if (from === to) return "";
  return editor.state.doc.textBetween(from, to, " ").replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/* Transformer un bloc — le geste que Notion appelle « Turn into »     */
/* ------------------------------------------------------------------ */

export type BlockTarget = "p" | "h1" | "h2" | "h3" | "quote" | "rule";

/**
 * Change le **type** d’un ou plusieurs blocs sans les réécrire.
 *
 * On change le nœud (`paragraph` ↔ `heading`) et ses attributs, jamais le
 * texte : les marques, les renvois et l’identifiant de bloc survivent. C’est
 * la raison pour laquelle la barre d’outils peut proposer « transformer »
 * sans risque pour les questions ancrées.
 */
export function turnInto(editor: Editor, target: BlockTarget) {
  const { state } = editor;
  const { from, to } = state.selection;
  const { schema } = state;
  const tr = state.tr;

  const clearList = { bullet: false, ordered: false, task: false, checked: false };

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!isBlockNode(node)) return true;
    const attrs: Record<string, unknown> = { ...node.attrs };

    if (target === "h1" || target === "h2" || target === "h3") {
      Object.assign(attrs, clearList, { kind: null, level: Number(target.slice(1)) });
      tr.setNodeMarkup(pos, schema.nodes.heading, attrs);
      return false;
    }

    Object.assign(attrs, {
      kind: target === "quote" || target === "rule" ? target : null,
    });
    /* Un filet n’a pas de texte : le conserver le rendrait invisible sous le
       trait. On vide donc le bloc, mais on garde son identifiant. */
    if (target === "rule") {
      Object.assign(attrs, clearList, { align: null, indent: 0 });
      tr.setNodeMarkup(pos, schema.nodes.paragraph, attrs);
      tr.delete(pos + 1, pos + node.nodeSize - 1);
      return false;
    }
    if (target === "p" || target === "quote" || target === "rule") {
      Object.assign(attrs, clearList, { align: null });
    }
    if (target === "p") attrs.indent = 0;
    tr.setNodeMarkup(pos, schema.nodes.paragraph, attrs);
    return false;
  });

  if (!tr.docChanged) return false;
  editor.view.dispatch(tr);
  return true;
}

/** Case à cocher : un attribut de bloc, pas une liste de tâches. */
export function toggleTask(editor: Editor) {
  const attrs = currentBlockAttrs(editor);
  const on = attrs.task === true;
  return setBlockAttrs(
    editor,
    on
      ? { task: false, checked: false }
      : { task: true, checked: false, bullet: false, ordered: false },
  );
}

/** Coche ou décoche une case (sans effet hors d’une case). */
export function toggleChecked(editor: Editor) {
  const attrs = currentBlockAttrs(editor);
  if (attrs.task !== true) return false;
  return setBlockAttrs(editor, { checked: attrs.checked !== true });
}

export function setAlign(editor: Editor, align: "left" | "center" | "right") {
  return setBlockAttrs(editor, { align: align === "left" ? null : align });
}

/** Efface marques **et** attributs de bloc : retour au texte nu. */
export function clearBlockFormatting(editor: Editor) {
  const marks = editor.chain().focus().unsetAllMarks().run();
  const attrs = setBlockAttrs(editor, {
    kind: null,
    bullet: false,
    ordered: false,
    task: false,
    checked: false,
    indent: 0,
    align: null,
  });
  return marks || attrs;
}

/* ------------------------------------------------------------------ */
/* Le bloc courant, et ce qu’on peut en faire                          */
/* ------------------------------------------------------------------ */

interface LocatedBlock {
  index: number;
  pos: number;
  node: PmNode;
  parent: PmNode;
}

function currentBlock(editor: Editor): LocatedBlock | null {
  const { doc, selection } = editor.state;
  const { $from } = selection;
  if ($from.depth < 1) return null;
  const index = $from.index(0);
  const node = doc.child(index);
  if (!isBlockNode(node)) return null;
  return { index, pos: $from.before(1), node, parent: doc };
}

/** Déplace le bloc courant d’un cran (haut/bas), avec son texte et ses marques. */
export function moveBlock(editor: Editor, direction: -1 | 1) {
  const found = currentBlock(editor);
  if (!found) return false;
  const { doc } = editor.state;
  const target = found.index + direction;
  if (target < 0 || target >= doc.childCount) return false;

  const children: PmNode[] = [];
  doc.forEach((child) => children.push(child));
  const [moved] = children.splice(found.index, 1);
  children.splice(target, 0, moved);

  const replacement = doc.type.create(doc.attrs, children, doc.marks);
  const tr = editor.state.tr.replaceWith(0, doc.content.size, replacement);

  let offset = 0;
  for (let i = 0; i < target; i += 1) offset += children[i].nodeSize;
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(offset + 1, tr.doc.content.size))));
  editor.view.dispatch(tr);
  return true;
}

/** Duplique le bloc courant juste en dessous (l’identifiant, lui, est neuf). */
export function duplicateBlock(editor: Editor) {
  const found = currentBlock(editor);
  if (!found) return false;
  const copy = found.node.type.create(
    { ...found.node.attrs, blockId: null },
    found.node.content,
    found.node.marks,
  );
  const tr = editor.state.tr.insert(found.pos + found.node.nodeSize, copy);
  editor.view.dispatch(tr);
  return true;
}

/** Supprime le bloc courant ; s’il est seul, il est vidé plutôt que supprimé. */
export function deleteBlock(editor: Editor) {
  const found = currentBlock(editor);
  if (!found) return false;
  const { doc } = editor.state;
  const tr = editor.state.tr;
  if (doc.childCount === 1) {
    tr.delete(found.pos + 1, found.pos + found.node.nodeSize - 1);
  } else {
    tr.delete(found.pos, found.pos + found.node.nodeSize);
  }
  editor.view.dispatch(tr);
  return true;
}

/**
 * Insère un filet **après** le bloc courant, puis rend le curseur à une ligne
 * neuve. On n’utilise pas `splitBlock` : un filet ne coupe pas une phrase en
 * deux, il s’ajoute entre deux blocs — et il garde son identifiant, comme tout
 * le reste, pour pouvoir porter une question.
 */
export function insertRule(editor: Editor) {
  const found = currentBlock(editor);
  if (!found) return false;
  const { schema, tr } = editor.state;
  const rule = schema.nodes.paragraph.create({
    kind: "rule",
    bullet: false,
    ordered: false,
    task: false,
    checked: false,
    indent: 0,
  });
  const after = schema.nodes.paragraph.create();
  tr.insert(found.pos + found.node.nodeSize, [rule, after]);
  const caret = found.pos + found.node.nodeSize + rule.nodeSize + 1;
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(caret, tr.doc.content.size))));
  editor.view.dispatch(tr);
  editor.view.focus();
  return true;
}

/** Coche/décoche une case désignée par son identifiant de bloc. */
export function toggleCheckedById(editor: Editor, blockId: string) {
  let toggled = false;
  const { tr } = editor.state;
  editor.state.doc.descendants((node, pos) => {
    if (toggled || !isBlockNode(node)) return !toggled;
    if (node.attrs.blockId !== blockId || node.attrs.task !== true) return true;
    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      checked: node.attrs.checked !== true,
    });
    toggled = true;
    return false;
  });
  if (!toggled) return false;
  editor.view.dispatch(tr);
  return true;
}

/** Type du bloc courant, tel que la barre d’outils doit l’afficher. */
export function blockKindOf(editor: Editor): BlockTarget {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "heading") {
      const level = Number(node.attrs.level ?? 2);
      return level === 1 ? "h1" : level === 3 ? "h3" : "h2";
    }
    if (isBlockNode(node)) {
      if (node.attrs.kind === "quote") return "quote";
      if (node.attrs.kind === "rule") return "rule";
      return "p";
    }
  }
  return "p";
}
