import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
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
  | "indent"
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
