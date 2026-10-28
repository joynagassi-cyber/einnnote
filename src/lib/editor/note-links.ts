import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { linkAt } from "@/lib/links/notes";

/**
 * **Le rendu des liens de notes.**
 *
 * Le texte reste `[[Titre]]` dans le document — on ne le remplace pas par un
 * nœud. Une décoration par-dessus suffit : le curseur se place normalement
 * dedans, `Ctrl+Z` défait la frappe, l’export Markdown garde la syntaxe, et
 * aucun identifiant de bloc ne bouge.
 *
 * Deux états, distingués à l’œil **et** au lecteur d’écran :
 *
 * - la note existe → lien plein, cliquable ;
 * - elle n’existe pas (ou plus) → lien mort, en pointillé, annoncé comme tel.
 *
 * C’est la différence avec un wiki qui laisse des liens bleus vers le vide.
 */

export interface NoteLinksOptions {
  /** `true` si une note porte ce titre */
  exists: (title: string) => boolean;
  /** ouvrir la note visée (ou créer celle qui manque) */
  onOpen: (title: string) => void;
}

const PATTERN = /\[\[([^[\]\n]{1,160})\]\]/g;

export const NoteLinks = Extension.create<NoteLinksOptions>({
  name: "noteLinks",

  addOptions() {
    return {
      exists: () => false,
      onOpen: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey("noteLinks"),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              const text = node.text;
              if (!text.includes("[[")) return;
              for (const match of text.matchAll(PATTERN)) {
                const start = match.index ?? 0;
                const from = pos + start;
                const to = from + match[0].length;
                const title = match[1].trim();
                const alive = options.exists(title);
                decorations.push(
                  Decoration.inline(from, to, {
                    class: alive ? "note-link" : "note-link note-link--broken",
                    "data-note-link": title,
                    "data-note-link-broken": alive ? undefined : "true",
                    role: "link",
                    "aria-label": alive
                      ? `Lien vers la note ${title}`
                      : `Lien mort vers ${title} — aucune note ne porte ce titre`,
                    title: alive ? `Ouvrir « ${title} »` : `Aucune note « ${title} »`,
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },

          /* Un vrai écouteur DOM, pas `handleClick` : ProseMirror ne fournit
             une position qu’en présence d’une mise en page mesurable, et son
             calcul peut tomber à zéro. L’événement natif, lui, porte toujours
             l’élément réellement cliqué. */
          handleDOMEvents: {
            click(view, event) {
              const target = (event.target as HTMLElement | null)?.closest?.(
                "[data-note-link]",
              ) as HTMLElement | null;
              const title =
                target?.getAttribute("data-note-link") ??
                linkAt(
                  view.state.selection.$from.parent.textContent,
                  view.state.selection.$from.parentOffset,
                );
              if (!title) return false;
              event.preventDefault();
              options.onOpen(title);
              return true;
            },
          },
        },
      }),
    ];
  },
});
