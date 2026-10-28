import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Rechercher dans la note — et remplacer.
 *
 * Une barre d’outils complète ne sert à rien si l’on ne peut pas retrouver ce
 * qu’on a écrit. Le plugin ne touche pas au document : il **décore** les
 * occurrences et retient celle qu’on regarde. Le remplacement, lui, passe par
 * une transaction normale — donc il s’annule avec `Ctrl+Z` comme n’importe
 * quelle frappe.
 *
 * Les occurrences ne traversent pas deux blocs : une note est une suite de
 * blocs, et chercher « fin du » à cheval sur deux paragraphes n’aurait pas de
 * sens à l’écran.
 */

export interface SearchState {
  query: string;
  /** index de l’occurrence affichée, -1 si aucune */
  active: number;
}

export const searchKey = new PluginKey<SearchState>("noteSearch");

export interface Match {
  from: number;
  to: number;
}

/** Toutes les occurrences d’une chaîne, dans l’ordre du document. */
export function findMatches(doc: PmNode, query: string): Match[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const matches: Match[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true;
    const haystack = node.text.toLowerCase();
    let at = haystack.indexOf(needle);
    while (at !== -1) {
      matches.push({ from: pos + at, to: pos + at + needle.length });
      at = haystack.indexOf(needle, at + needle.length);
    }
    return true;
  });
  return matches;
}

export const SearchHighlight = Extension.create({
  name: "searchHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => ({ query: "", active: -1 }),
          apply(transaction, previous) {
            const meta = transaction.getMeta(searchKey) as
              | Partial<SearchState>
              | undefined;
            if (!meta) return previous;
            const next = { ...previous, ...meta };
            /* Une nouvelle requête remet le compteur à zéro : garder l’index
               d’une recherche précédente désignerait une occurrence au hasard. */
            if (meta.query !== undefined && meta.active === undefined) {
              next.active = -1;
            }
            return next;
          },
        },
        props: {
          decorations(state) {
            const plugin = searchKey.getState(state);
            if (!plugin?.query.trim()) return DecorationSet.empty;
            const matches = findMatches(state.doc, plugin.query);
            if (!matches.length) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              matches.map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class:
                    index === plugin.active
                      ? "search-hit search-hit-active"
                      : "search-hit",
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});

export function currentSearch(editor: Editor): SearchState {
  return searchKey.getState(editor.state) ?? { query: "", active: -1 };
}

/** Fixe la requête ; aucune occurrence n’est active tant qu’on n’a pas navigué. */
export function setSearchQuery(editor: Editor, query: string) {
  editor.view.dispatch(editor.state.tr.setMeta(searchKey, { query, active: -1 }));
}

/** Déplace la sélection sur une occurrence et la fait défiler à l’écran. */
export function focusMatch(editor: Editor, index: number) {
  const state = currentSearch(editor);
  const matches = findMatches(editor.state.doc, state.query);
  if (!matches.length) return null;
  const bounded = ((index % matches.length) + matches.length) % matches.length;
  const match = matches[bounded];
  editor.view.dispatch(editor.state.tr.setMeta(searchKey, { active: bounded }));
  editor.commands.setTextSelection({ from: match.from, to: match.to });
  editor.commands.scrollIntoView();
  return { ...match, index: bounded, total: matches.length };
}

/** Occurrence suivante (+1) ou précédente (−1), circulairement. */
export function stepMatch(editor: Editor, direction: 1 | -1) {
  const state = currentSearch(editor);
  const matches = findMatches(editor.state.doc, state.query);
  if (!matches.length) return null;
  const start =
    state.active < 0
      ? direction === 1
        ? 0
        : matches.length - 1
      : state.active + direction;
  return focusMatch(editor, start);
}

/** Remplace l’occurrence affichée (ou la première), puis avance. */
export function replaceCurrent(editor: Editor, replacement: string) {
  const state = currentSearch(editor);
  const matches = findMatches(editor.state.doc, state.query);
  if (!matches.length) return false;
  const index = state.active < 0 ? 0 : Math.min(state.active, matches.length - 1);
  const match = matches[index];
  const tr = editor.state.tr.insertText(replacement, match.from, match.to);
  editor.view.dispatch(
    tr.setMeta(searchKey, {
      active: Math.min(index, Math.max(0, matches.length - 2)),
    }),
  );
  return true;
}

/** Remplace toutes les occurrences en une seule transaction (un seul undo). */
export function replaceAll(editor: Editor, replacement: string) {
  const state = currentSearch(editor);
  const matches = findMatches(editor.state.doc, state.query);
  if (!matches.length) return 0;
  let tr = editor.state.tr;
  for (const match of [...matches].reverse()) {
    tr = tr.insertText(replacement, match.from, match.to);
  }
  editor.view.dispatch(
    tr.setMeta(searchKey, { active: -1, query: state.query }),
  );
  return matches.length;
}
