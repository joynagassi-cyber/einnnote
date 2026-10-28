import type { Editor } from "@tiptap/core";

/**
 * Transformer la **casse** d’un passage.
 *
 * Quatre modes suffisent pour tout ce qu’on fait vraiment en écrivant :
 * crier un titre, calmer un paragraphe collé en majuscules, remettre une
 * capitale en tête de phrase, ou capitaliser une liste de termes. On travaille
 * nœud de texte par nœud de texte — les marques (gras, lien, surlignage)
 * restent attachées au passage transformé, et la longueur ne change pas, donc
 * aucune position ne se décale.
 */
export type CaseMode = "upper" | "lower" | "sentence" | "capitalize";

export const CASE_MODES: { mode: CaseMode; label: string; hint: string }[] = [
  { mode: "upper", label: "MAJUSCULES", hint: "Aa → AA" },
  { mode: "lower", label: "minuscules", hint: "AA → aa" },
  { mode: "sentence", label: "Capitale en tête de phrase", hint: "aa → Aa" },
  { mode: "capitalize", label: "Capitale à chaque mot", hint: "aa bb → Aa Bb" },
];

function transform(value: string, mode: CaseMode) {
  switch (mode) {
    case "upper":
      return value.toUpperCase();
    case "lower":
      return value.toLowerCase();
    case "sentence":
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    case "capitalize":
      return value.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) =>
        space + letter.toUpperCase(),
      );
  }
}

export function changeCase(editor: Editor, mode: CaseMode) {
  const { from, to } = editor.state.selection;
  if (from === to) return false;

  const tr = editor.state.tr;
  editor.state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText || !node.text) return true;
    const start = Math.max(pos, from);
    const end = Math.min(pos + node.nodeSize, to);
    if (start >= end) return true;
    const slice = node.text.slice(start - pos, end - pos);
    const next = transform(slice, mode);
    if (next === slice) return true;
    tr.replaceWith(start, end, editor.schema.text(next, node.marks));
    return true;
  });

  if (!tr.docChanged) return false;
  editor.view.dispatch(tr);
  return true;
}

/** Texte du bloc courant, pour « copier le bloc » sans sa mise en forme. */
export function currentBlockText(editor: Editor): string {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.isTextblock) return node.textBetween(0, node.content.size, " ");
  }
  return "";
}

/** Date du jour, au format long français — jamais au format machine. */
export function todayLabel(now: Date = new Date()): string {
  return now.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
