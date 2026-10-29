import { useEffect, useRef, useState } from "react";
import { CaretDown, CaretUp, MagnifyingGlass, X } from "@phosphor-icons/react";
import type { EditorHost } from "@/lib/editor/host";
import { findMatches, stepMatch } from "@/lib/editor/search";

/**
 * Chercher et remplacer **dans la note ouverte**.
 *
 * Le panneau vit au-dessus du document, pas dans une fenêtre : on veut voir
 * l’occurrence pendant qu’on tape la requête. Il compte les occurrences, dit
 * laquelle on regarde, et laisse `Entrée` enchaîner — trois choses qu’une
 * simple boîte de dialogue du navigateur ne fait pas.
 *
 * Ce composant ne connaît pas l’éditeur : il demande son texte à l’hôte,
 * calcule les occurrences, et **sélectionne** celle qu’on regarde. La
 * recherche n’écrit jamais dans le document d’elle-même.
 */
export function FindReplace({
  host,
  version,
  open,
  onClose,
  onDone,
  focusField = "query",
}: {
  host: EditorHost | null;
  /** change à chaque frappe dans la note : le compteur doit suivre */
  version: number;
  open: boolean;
  onClose: () => void;
  /** relance l’enregistrement après un remplacement */
  onDone: () => void;
  /** champ qui prend le focus à l’ouverture (la palette sait pourquoi) */
  focusField?: "query" | "replacement";
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setReplacement("");
      setActive(-1);
      return;
    }
    const target = focusField === "replacement" ? replaceRef.current : inputRef.current;
    const focus = window.setTimeout(() => target?.focus(), 30);
    return () => window.clearTimeout(focus);
  }, [open, focusField]);

  if (!open || !host) return null;

  /* Le texte est relu à chaque frappe (`version`) : aucune copie, donc aucun
     compteur périmé après une correction. */
  const matches = findMatches(host.text(), query);
  const total = matches.length;
  const position = total === 0 ? 0 : active < 0 ? 1 : active + 1;

  const show = (index: number) => {
    setActive(index);
    const match = matches[index];
    if (match) host.selectRange(match.from, match.to);
  };

  const step = (direction: 1 | -1) => {
    const next = stepMatch(matches, active, direction);
    if (next >= 0) show(next);
  };

  const doReplace = () => {
    const match = matches[active] ?? matches[0];
    if (!match) return;
    host.replaceOne(match, replacement);
    onDone();
    setActive(-1);
  };

  const doReplaceAll = () => {
    if (total === 0) return;
    host.replaceAll(query, replacement);
    onDone();
    setActive(-1);
  };

  return (
    <div className="find-bar" role="search" aria-label="Rechercher dans la note">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-muted" aria-hidden>
        <MagnifyingGlass size={17} />
      </span>

      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(-1);
        }}
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

      <span
        key={version}
        className="tabnum shrink-0 px-1 text-[12px] text-muted"
        aria-live="polite"
      >
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
