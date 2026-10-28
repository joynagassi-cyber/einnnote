import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { CaretDown, CaretUp, MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  currentSearch,
  findMatches,
  replaceAll,
  replaceCurrent,
  setSearchQuery,
  stepMatch,
} from "@/lib/editor/search";

/**
 * Chercher et remplacer **dans la note ouverte**.
 *
 * Le panneau vit au-dessus du document, pas dans une fenêtre : on veut voir
 * l’occurrence surlignée pendant qu’on tape la requête. Il compte les
 * occurrences, dit laquelle on regarde, et laisse `Entrée` enchaîner — trois
 * choses qu’une simple boîte de dialogue du navigateur ne fait pas.
 *
 * `Échap` ferme et rend le curseur au texte, sans laisser de décoration
 * derrière : la recherche n’écrit jamais dans le document.
 */
export function FindReplace({
  editor,
  open,
  onClose,
  onDone,
  focusField = "query",
}: {
  editor: Editor | null;
  open: boolean;
  onClose: () => void;
  /** relance l’enregistrement après un remplacement */
  onDone: () => void;
  /** champ qui prend le focus à l’ouverture (la palette sait pourquoi) */
  focusField?: "query" | "replacement";
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [, force] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setReplacement("");
      /* Fermer la recherche efface aussi ses décorations : aucune occurrence
         ne doit rester surlignée derrière une barre refermée. */
      if (editor && !editor.isDestroyed) setSearchQuery(editor, "");
      return;
    }
    const target = focusField === "replacement" ? replaceRef.current : inputRef.current;
    const focus = window.setTimeout(() => target?.focus(), 30);
    return () => window.clearTimeout(focus);
  }, [open, editor, focusField]);

  /* Le nombre d’occurrences change aussi quand on tape dans le document. */
  useEffect(() => {
    if (!open || !editor) return;
    const handler = () => force((value) => value + 1);
    editor.on("transaction", handler);
    return () => {
      editor.off("transaction", handler);
    };
  }, [editor, open]);

  if (!open || !editor) return null;

  const matches = findMatches(editor.state.doc, query);
  const { active } = currentSearch(editor);
  const total = matches.length;
  const position = total === 0 ? 0 : active < 0 ? 0 : active + 1;

  const change = (value: string) => {
    setQuery(value);
    setSearchQuery(editor, value);
  };

  const step = (direction: 1 | -1) => {
    stepMatch(editor, direction);
    force((value) => value + 1);
  };

  const doReplace = () => {
    if (!total) return;
    replaceCurrent(editor, replacement);
    onDone();
    force((value) => value + 1);
  };

  const doReplaceAll = () => {
    if (!total) return;
    replaceAll(editor, replacement);
    onDone();
    force((value) => value + 1);
  };

  return (
    <div className="find-bar" role="search" aria-label="Rechercher dans la note">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-muted" aria-hidden>
        <MagnifyingGlass size={17} />
      </span>

      <input
        ref={inputRef}
        value={query}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            step(event.shiftKey ? -1 : 1);
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        aria-label="Texte à chercher"
        placeholder="Chercher dans la note"
        className="h-9 min-w-0 flex-1 bg-transparent text-[13.5px] outline-none"
      />

      <span className="tabnum shrink-0 px-1 text-[12px] text-muted" aria-live="polite">
        {query.trim() ? `${position} / ${total}` : "—"}
      </span>

      <button
        type="button"
        aria-label="Occurrence précédente"
        onClick={() => step(-1)}
        disabled={!total}
        className="editor-tool h-8 w-8 disabled:opacity-40"
      >
        <CaretUp size={15} weight="bold" />
      </button>
      <button
        type="button"
        aria-label="Occurrence suivante"
        onClick={() => step(1)}
        disabled={!total}
        className="editor-tool h-8 w-8 disabled:opacity-40"
      >
        <CaretDown size={15} weight="bold" />
      </button>

      <input
        ref={replaceRef}
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            doReplace();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        aria-label="Remplacer par"
        placeholder="Remplacer par"
        className="h-9 w-[38%] min-w-[7rem] shrink-0 border-l border-line bg-transparent pl-2 text-[13.5px] outline-none"
      />

      <button
        type="button"
        onClick={doReplace}
        disabled={!total}
        className="shrink-0 rounded-field px-2 text-[12.5px] font-semibold text-accent disabled:opacity-40"
      >
        Remplacer
      </button>
      <button
        type="button"
        onClick={doReplaceAll}
        disabled={!total}
        className="shrink-0 rounded-field px-2 text-[12.5px] font-semibold text-accent disabled:opacity-40"
      >
        Tout
      </button>
      <button
        type="button"
        aria-label="Fermer la recherche"
        onClick={onClose}
        className="editor-tool h-8 w-8 shrink-0"
      >
        <X size={15} weight="bold" />
      </button>
    </div>
  );
}
