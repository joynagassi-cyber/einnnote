import Quill from "quill";
import type { Delta, DeltaAttributes, DeltaOp, Range } from "quill";
import type { Block } from "@/types";
import type { Align, BlockAttrs, BlockTarget, CaseMode, EditorHost, MarkName } from "@/lib/editor/host";
import { applyCase } from "@/lib/editor/host";
import { FORMAT, blocksToDelta, deltaToBlocks, isSet } from "@/lib/editor/quill/delta";

/**
 * L’adaptateur Quill.
 *
 * C’est le **seul** fichier du produit qui connaisse la bibliothèque. Tout le
 * reste parle `EditorHost`. Conséquence pratique : les commandes, la barre, le
 * pupitre et la palette n’ont pas eu à apprendre Quill — et le jour où l’on
 * change encore d’éditeur, on ne réécrit que ce fichier.
 *
 * Deux principes de traduction :
 *
 * 1. **Le Delta est la vérité.** On ne lit pas l’état dans le DOM : on relit les
 *    lignes du document (`linesOf`). Un format de ligne n’est jamais deviné à
 *    partir d’une classe CSS.
 * 2. **Chaque bloc a un identifiant, toujours.** Avant d’enregistrer, on donne
 *    un `blockId` aux lignes qui n’en ont pas. Sans cela, une ligne dupliquée
 *    changerait d’identité à chaque frappe, et les questions ancrées
 *    sauteraient d’un bloc à l’autre.
 */

/* ------------------------------------------------------------------ */
/* Lecture des lignes                                                  */
/* ------------------------------------------------------------------ */

interface Line {
  /** décalage du premier caractère de la ligne */
  start: number;
  text: string;
  /** longueur de la ligne, `\n` compris */
  length: number;
  /** attributs de la ligne (portés par le `\n`) */
  attrs: DeltaAttributes;
  /** fragments de texte de la ligne, avec leurs attributs */
  ops: DeltaOp[];
}

function linesOf(delta: Delta): Line[] {
  const lines: Line[] = [];
  let index = 0;
  let current: { text: string; ops: DeltaOp[]; start: number } = { text: "", ops: [], start: 0 };

  for (const op of delta.ops ?? []) {
    if (typeof op.insert !== "string") continue;
    const parts = op.insert.split("\n");

    parts.forEach((part, at) => {
      if (part) {
        current.text += part;
        current.ops.push(
          op.attributes ? { insert: part, attributes: op.attributes } : { insert: part },
        );
        index += part.length;
      }
      if (at < parts.length - 1) {
        lines.push({
          start: current.start,
          text: current.text,
          length: current.text.length + 1,
          attrs: op.attributes ?? {},
          ops: current.ops,
        });
        index += 1;
        current = { text: "", ops: [], start: index };
      }
    });
  }

  if (current.text || lines.length === 0) {
    lines.push({
      start: current.start,
      text: current.text,
      length: current.text.length + 1,
      attrs: {},
      ops: current.ops,
    });
  }
  return lines;
}

function opsOfLines(lines: Line[]): DeltaOp[] {
  return lines.flatMap((line) => [...line.ops, { insert: "\n", attributes: line.attrs }]);
}

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `b-${Date.now().toString(36)}-${idCounter}`;
}

/* ------------------------------------------------------------------ */
/* Attributs de ligne ↔ formats Quill                                  */
/* ------------------------------------------------------------------ */

const CLEAR_HEADER = { header: false } as const;

function kindFormats(kind: BlockTarget): DeltaAttributes {
  switch (kind) {
    case "h1":
      return { ...CLEAR_HEADER, header: 1, blockquote: false, [FORMAT.rule]: false };
    case "h2":
      return { ...CLEAR_HEADER, header: 2, blockquote: false, [FORMAT.rule]: false };
    case "h3":
      return { ...CLEAR_HEADER, header: 3, blockquote: false, [FORMAT.rule]: false };
    case "quote":
      return { ...CLEAR_HEADER, blockquote: true, [FORMAT.rule]: false };
    case "rule":
      return { ...CLEAR_HEADER, blockquote: false, [FORMAT.rule]: true, list: false, indent: false };
    default:
      return { ...CLEAR_HEADER, blockquote: false, [FORMAT.rule]: false };
  }
}

function attrsFrom(formats: DeltaAttributes): BlockAttrs {
  const header = Number(formats.header ?? 0);
  const kind: BlockTarget =
    formats[FORMAT.rule] === true
      ? "rule"
      : header === 1
        ? "h1"
        : header === 2
          ? "h2"
          : header === 3
            ? "h3"
            : formats.blockquote === true
              ? "quote"
              : "p";

  const list = formats.list;
  return {
    id: typeof formats[FORMAT.blockId] === "string" ? (formats[FORMAT.blockId] as string) : null,
    kind,
    bullet: list === "bullet",
    ordered: list === "ordered",
    task: list === "checked" || list === "unchecked",
    checked: list === "checked",
    indent: Number(formats.indent ?? 0) || 0,
    align: (formats.align as Align) ?? "left",
    marked: isSet(formats[FORMAT.marked]),
  };
}

function listFormat(attrs: Pick<BlockAttrs, "task" | "checked" | "bullet" | "ordered">): unknown {
  if (attrs.task) return attrs.checked ? "checked" : "unchecked";
  if (attrs.bullet) return "bullet";
  if (attrs.ordered) return "ordered";
  return false;
}

let formatsReady = false;

export function registerEinnoteFormats() {
  if (formatsReady) return;

  /* Quill 2 s’appuie sur Parchment 3 : la classe `Attributor` y est concrète
     pour les **attributs** HTML, et `ClassAttributor` pour les classes. On
     déclare donc cinq formats maison, avec la portée qui convient — sans eux,
     `data-block-id` serait effacé au premier rechargement du document. */
  const parchment = Quill.import("parchment") as {
    Attributor: new (name: string, key: string, options?: { scope?: number }) => unknown;
    ClassAttributor: new (
      name: string,
      key: string,
      options?: { scope?: number },
    ) => unknown;
    Scope: { BLOCK: number; INLINE: number };
  };

  Quill.register(
    {
      [`formats/${FORMAT.blockId}`]: new parchment.Attributor(FORMAT.blockId, "data-block-id", {
        scope: parchment.Scope.BLOCK,
      }),
      [`formats/${FORMAT.marked}`]: new parchment.Attributor(FORMAT.marked, "data-marked", {
        scope: parchment.Scope.BLOCK,
      }),
      [`formats/${FORMAT.rule}`]: new parchment.Attributor(FORMAT.rule, "data-rule", {
        scope: parchment.Scope.BLOCK,
      }),
      /* Un seul attribut pour les deux états du renvoi : `note-link` et
         `note-link--broken`. Parchment compose toujours « clé-valeur », donc la
         clé est `note` et la valeur porte la fin du nom de classe. */
      "formats/notelink": new parchment.ClassAttributor("notelink", "note", {
        scope: parchment.Scope.INLINE,
      }),
      /* `#étiquette` : une classe, pas un nœud. Le texte reste intact, donc
         l’export Markdown emporte l’étiquette avec lui. */
      "formats/tag": new parchment.ClassAttributor("tag", "tag", {
        scope: parchment.Scope.INLINE,
      }),
    },
    true,
  );
  formatsReady = true;
}

export const QUILL_FORMATS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "background",
  "link",
  "script",
  "header",
  "list",
  "indent",
  "align",
  "blockquote",
  FORMAT.blockId,
  FORMAT.marked,
  FORMAT.rule,
  "notelink",
  "tag",
];

/* ------------------------------------------------------------------ */
/* L’adaptateur                                                        */
/* ------------------------------------------------------------------ */

/** Toutes les marques en ligne éteintes : un fragment sans style ne doit pas
 *  hériter du style voisin quand on le réinsère. */
const NO_FORMAT = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  background: false,
  link: false,
  script: false,
} as const;

const MARK_FORMAT: Record<Exclude<MarkName, "highlight" | "link" | "superscript" | "subscript">, string> = {
  bold: "bold",
  italic: "italic",
  underline: "underline",
  strike: "strike",
  code: "code",
};

export function createQuillHost(quill: Quill, onChange?: (blocks: Block[]) => void): EditorHost {
  let last: Range = { index: 0, length: 0 };
  quill.on("selection-change", (range) => {
    if (range) last = { index: range.index, length: range.length };
  });

  const selection = (): Range => {
    const current = quill.getSelection();
    if (current) {
      last = { index: current.index, length: current.length };
      return current;
    }
    return last;
  };

  const lines = () => linesOf(quill.getContents());
  const lineAt = (index: number): Line => {
    const all = lines();
    const clamped = Math.max(0, Math.min(index, quill.getLength() - 1));
    return all.find((line) => clamped >= line.start && clamped <= line.start + line.text.length) ?? all[all.length - 1];
  };

  /**
   * La ligne où se trouve le curseur.
   *
   * On la retrouve **par ses bornes**, jamais par l’identité de l’objet : chaque
   * appel à `lines()` reconstruit la liste, donc deux appels rendent deux objets
   * différents — une comparaison d’identité échouait toujours.
   */
  const lineIndexAt = (all: Line[], index: number): number => {
    const found = all.findIndex(
      (line) => index >= line.start && index <= line.start + line.text.length,
    );
    return found >= 0 ? found : all.length - 1;
  };

  /** Les lignes touchées par la sélection. */
  const selectedLines = (): Line[] => {
    const { index, length } = selection();
    const all = lines();
    const end = index + length;
    return all.filter((line) => {
      const from = line.start;
      const to = line.start + line.text.length;
      return to >= index && from <= end;
    });
  };

  const applyLine = (formats: DeltaAttributes) => {
    const touched = selectedLines();
    for (const line of touched) {
      quill.formatLine(line.start, line.length, formats, "api");
    }
    return touched.length > 0;
  };

  const commit = () => onChange?.(deltaToBlocks(quill.getContents(), newId));

  const host: EditorHost = {
    get isReady() {
      return Boolean(quill);
    },

    focus() {
      quill.focus();
    },

    focusAt(where) {
      const end = Math.max(0, quill.getLength() - 1);
      quill.setSelection(where === "start" ? 0 : end, 0, "api");
      quill.focus();
    },

    hasSelection() {
      return selection().length > 0;
    },

    selectedText() {
      const { index, length } = selection();
      return length > 0 ? quill.getText(index, length) : "";
    },

    selectionOffsets() {
      const { index, length } = selection();
      return { from: index, to: index + length };
    },

    selectRange(from, to) {
      quill.setSelection(from, Math.max(0, to - from), "api");
      quill.scrollSelectionIntoView();
    },

    isMarkActive(mark) {
      const { index, length } = selection();
      const formats = quill.getFormat(length > 0 ? index : index, length > 0 ? length : 0);
      if (mark === "highlight") return Boolean(formats.background);
      if (mark === "link") return Boolean(formats.link);
      if (mark === "superscript") return formats.script === "super";
      if (mark === "subscript") return formats.script === "sub";
      return Boolean(formats[MARK_FORMAT[mark]]);
    },

    toggleMark(mark) {
      const { index, length } = selection();
      if (mark === "superscript") {
        quill.formatText(index, length, { script: host.isMarkActive("superscript") ? false : "super" }, "api");
      } else if (mark === "subscript") {
        quill.formatText(index, length, { script: host.isMarkActive("subscript") ? false : "sub" }, "api");
      } else if (mark === "highlight") {
        quill.formatText(index, length, { background: host.isMarkActive("highlight") ? false : true }, "api");
      } else if (mark === "link") {
        /* Le lien se pose avec son adresse : traité par `setLink`. */
        return;
      } else {
        quill.formatText(index, length, { [MARK_FORMAT[mark]]: !host.isMarkActive(mark) }, "api");
      }
      quill.focus();
      commit();
    },

    highlight(color) {
      const { index, length } = selection();
      quill.formatText(index, length, { background: color ?? false }, "api");
      quill.focus();
      commit();
    },

    setLink(href) {
      const { index, length } = selection();
      quill.formatText(index, length, { link: href ?? false }, "api");
      quill.focus();
      commit();
    },

    currentHref() {
      const { index } = selection();
      return quill.getFormat(index, 0).link as string | undefined;
    },

    clearMarks() {
      const { index, length } = selection();
      quill.removeFormat(index, length, "api");
      quill.focus();
      commit();
    },

    attrs() {
      return attrsFrom(lineAt(selection().index).attrs);
    },

    setAttrs(patch) {
      const current = host.attrs();
      const next = { ...current, ...patch };
      const formats: DeltaAttributes = {
        ...kindFormats(next.kind),
        list: listFormat(next),
        indent: next.indent > 0 ? next.indent : false,
        align: next.align === "left" ? false : next.align,
        [FORMAT.marked]: next.marked,
      };
      const done = applyLine(formats);
      quill.focus();
      commit();
      return done;
    },

    turnInto(target) {
      const current = host.attrs();
      const cleared = {
        ...current,
        bullet: false,
        ordered: false,
        task: false,
        checked: false,
        ...(target === "rule" ? { align: "left" as Align, indent: 0 } : {}),
        ...(target === "p" ? { indent: 0, align: "left" as Align } : {}),
        kind: target,
      };

      /* Un filet n’a pas de texte : le garder le rendrait invisible sous le
         trait. On vide la ligne, on ne supprime pas le bloc. */
      if (target === "rule") {
        for (const line of selectedLines()) {
          if (line.text) quill.deleteText(line.start, line.text.length, "api");
        }
      }

      const done = host.setAttrs(cleared);
      quill.focus();
      return done;
    },

    toggleMeta(name) {
      const current = host.attrs();
      const active = current[name];
      return host.setAttrs({
        [name]: !active,
        ...(name === "bullet" ? { ordered: false } : { bullet: false }),
        task: false,
        checked: false,
      });
    },

    toggleQuote() {
      return host.setAttrs({ kind: host.attrs().kind === "quote" ? "p" : "quote", indent: 0 });
    },

    toggleTask() {
      const current = host.attrs();
      return host.setAttrs({
        task: !current.task,
        checked: false,
        bullet: false,
        ordered: false,
      });
    },

    toggleChecked() {
      const current = host.attrs();
      if (!current.task) return false;
      return host.setAttrs({ checked: !current.checked });
    },

    changeIndent(delta) {
      let changed = false;
      for (const line of selectedLines()) {
        const indent = Math.min(3, Math.max(0, Number(line.attrs.indent ?? 0) + delta));
        quill.formatLine(line.start, line.length, { indent: indent > 0 ? indent : false }, "api");
        changed = true;
      }
      quill.focus();
      commit();
      return changed;
    },

    setAlign(align) {
      return host.setAttrs({ align });
    },

    clearFormatting() {
      const { index, length } = selection();
      quill.removeFormat(index, length, "api");
      host.setAttrs({
        kind: "p",
        bullet: false,
        ordered: false,
        task: false,
        checked: false,
        indent: 0,
        align: "left",
      });
      return true;
    },

    moveBlock(direction) {
      const all = lines();
      const at = lineIndexAt(all, selection().index);
      const target = at + direction;
      if (at < 0 || target < 0 || target >= all.length) return false;

      const reordered = [...all];
      const [moved] = reordered.splice(at, 1);
      reordered.splice(target, 0, moved);

      quill.setContents({ ops: opsOfLines(reordered) }, "api");
      let offset = 0;
      for (let i = 0; i < target; i += 1) offset += reordered[i].length;
      quill.setSelection(offset, 0, "api");
      quill.focus();
      commit();
      return true;
    },

    duplicateBlock() {
      const all = lines();
      const at = lineIndexAt(all, selection().index);
      if (at < 0) return false;

      const copy: Line = {
        ...all[at],
        attrs: { ...all[at].attrs },
      };
      delete copy.attrs[FORMAT.blockId];
      const reordered = [...all.slice(0, at + 1), copy, ...all.slice(at + 1)];

      quill.setContents({ ops: opsOfLines(reordered) }, "api");
      quill.setSelection(all.slice(0, at + 1).reduce((sum, line) => sum + line.length, 0), 0, "api");
      quill.focus();
      commit();
      return true;
    },

    deleteBlock() {
      const all = lines();
      const at = lineIndexAt(all, selection().index);
      if (at < 0) return false;

      if (all.length === 1) {
        quill.deleteText(all[0].start, all[0].text.length, "api");
        quill.focus();
        commit();
        return true;
      }

      const reordered = all.filter((_, index) => index !== at);
      quill.setContents({ ops: opsOfLines(reordered) }, "api");
      const offset = reordered.slice(0, at).reduce((sum, line) => sum + line.length, 0);
      quill.setSelection(offset, 0, "api");
      quill.focus();
      commit();
      return true;
    },

    insertRule() {
      const all = lines();
      const at = lineIndexAt(all, selection().index);
      if (at < 0) return false;

      const rule: Line = { start: 0, text: "", length: 1, attrs: { [FORMAT.rule]: true }, ops: [] };
      const after: Line = { start: 0, text: "", length: 1, attrs: {}, ops: [] };
      const reordered = [...all.slice(0, at + 1), rule, after, ...all.slice(at + 1)];

      quill.setContents({ ops: opsOfLines(reordered) }, "api");
      const offset = reordered.slice(0, at + 2).reduce((sum, line) => sum + line.length, 0);
      quill.setSelection(offset, 0, "api");
      quill.focus();
      commit();
      return true;
    },

    splitBlock(patch) {
      const { index, length } = selection();
      if (length > 0) quill.deleteText(index, length, "api");
      quill.insertText(index, "\n", {}, "api");
      quill.setSelection(index + 1, 0, "api");
      if (patch) host.setAttrs(patch);
      quill.focus();
      return true;
    },

    toggleCheckedById(blockId) {
      const line = lines().find((candidate) => candidate.attrs[FORMAT.blockId] === blockId);
      if (!line) return false;
      const list = line.attrs.list;
      if (list !== "checked" && list !== "unchecked") return false;
      quill.formatLine(line.start, line.length, { list: list === "checked" ? "unchecked" : "checked" }, "api");
      commit();
      return true;
    },

    blockIdAtCursor() {
      return host.attrs().id;
    },

    insertText(text) {
      const { index, length } = selection();
      quill.deleteText(index, length, "api");
      quill.insertText(index, text, {}, "api");
      quill.setSelection(index + text.length, 0, "api");
      quill.focus();
      commit();
    },

    blockText() {
      return lineAt(selection().index).text;
    },

    changeCase(mode: CaseMode) {
      const { index, length } = selection();
      if (length === 0) return false;
      const slice = quill.getContents(index, length);
      const pieces = (slice.ops ?? [])
        .filter((op) => typeof op.insert === "string")
        .map((op) => ({ text: op.insert as string, attributes: op.attributes }));

      let first = true;
      const replaced = pieces.map((piece) => {
        const text = first ? applyCase(piece.text, mode) : applyCase(piece.text, mode === "sentence" ? "lower" : mode);
        first = false;
        return { ...piece, text };
      });

      quill.deleteText(index, length, "api");
      let at = index;
      for (const piece of replaced) {
        quill.insertText(at, piece.text, { ...NO_FORMAT, ...(piece.attributes ?? {}) }, "api");
        at += piece.text.length;
      }
      quill.setSelection(index, length, "api");
      quill.focus();
      commit();
      return true;
    },

    words() {
      const text = quill.getText().trim();
      return text ? text.split(/\s+/).length : 0;
    },

    text() {
      return quill.getText();
    },

    blocks() {
      /* On garantit les identifiants **avant** de rendre les blocs : sinon une
         ligne créée par Entrée repartirait sans id et en recevrait un nouveau
         à chaque lecture — deux questions ne seraient plus ancrées au même
         endroit. */
      ensureBlockIds(quill);
      return deltaToBlocks(quill.getContents(), newId);
    },

    setBlocks(blocks) {
      quill.setContents(blocksToDelta(blocks), "silent");
      /* Le chargement d’une note n’est pas une action de l’utilisateur : le
         document chargé devient la borne de l’historique, sinon « annuler »
         ramènerait au document vide. */
      resetHistory(quill);
    },

    replaceAll(query, replacement) {
      const needle = query.trim();
      if (!needle) return 0;
      const content = quill.getText().toLowerCase();
      const haystack = needle.toLowerCase();
      const hits: number[] = [];
      let at = content.indexOf(haystack);
      while (at !== -1) {
        hits.push(at);
        at = content.indexOf(haystack, at + haystack.length);
      }
      for (let i = hits.length - 1; i >= 0; i -= 1) {
        quill.deleteText(hits[i], needle.length, "api");
        quill.insertText(hits[i], replacement, {}, "api");
      }
      if (hits.length > 0) commit();
      return hits.length;
    },

    replaceOne(match, replacement) {
      quill.deleteText(match.from, match.to - match.from, "api");
      quill.insertText(match.from, replacement, {}, "api");
      commit();
    },

    undo() {
      quill.focus();
      (quill.getModule("history") as { undo: () => void } | undefined)?.undo();
      commit();
    },

    redo() {
      quill.focus();
      (quill.getModule("history") as { redo: () => void } | undefined)?.redo();
      commit();
    },
  };

  return host;
}

/**
 * Donne un identifiant aux lignes qui n’en ont pas.
 *
 * On écrit en `silent` : c’est une réparation, pas une frappe. Elle ne doit ni
 * apparaître dans l’historique d’annulation, ni déclencher un enregistrement en
 * boucle.
 */
/**
 * Le chargement d’une note n’est pas une action de l’utilisateur : il devient la
 * borne de l’historique. Sans cela, « annuler » après la première frappe
 * ramènerait la note au document vide.
 */
export function resetHistory(quill: Quill): void {
  (quill.getModule("history") as { clear?: () => void } | undefined)?.clear?.();
}

export function ensureBlockIds(quill: Quill): void {
  for (const line of linesOf(quill.getContents())) {
    if (typeof line.attrs[FORMAT.blockId] === "string") continue;
    quill.formatLine(line.start, line.length, { [FORMAT.blockId]: newId() }, "silent");
  }
}
