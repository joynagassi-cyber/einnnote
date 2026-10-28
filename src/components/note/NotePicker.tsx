import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowElbowDownLeft, FileText, Plus } from "@phosphor-icons/react";
import { Sheet } from "@/components/Layout";
import { normalizeTitle, type NoteRef } from "@/lib/links/notes";
import { cn } from "@/lib/utils";

/**
 * **Lier une note.**
 *
 * Le défaut des sélecteurs de wiki : une liste alphabétique de trois cents
 * titres, et un champ de recherche qui ne cherche qu’au début du titre. Ici :
 * la recherche ignore les accents et trouve **n’importe où** dans le titre ; les
 * notes déjà citées ne sont pas proposées deux fois ; et si le titre tapé ne
 * correspond à rien, la dernière ligne propose de **créer la note** — un lien
 * mort ne devrait pas être une impasse.
 *
 * Le cadre est celui de l’application : feuille sur téléphone, fenêtre flottante
 * sur bureau (`Sheet`), sans réinventer une troisième surface.
 */

export interface NotePickerProps {
  open: boolean;
  onClose: () => void;
  notes: NoteRef[];
  /** la note en cours : on ne se lie pas à soi-même */
  currentId?: string;
  onPick: (note: NoteRef) => void;
  onCreate?: (title: string) => void;
}

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function NotePicker({
  open,
  onClose,
  notes,
  currentId,
  onPick,
  onCreate,
}: NotePickerProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const pool = useMemo(
    () => notes.filter((note) => note.id !== currentId),
    [notes, currentId],
  );

  const matches = useMemo(() => {
    const needle = fold(query.trim());
    const list = needle
      ? pool.filter((note) => fold(note.title).includes(needle))
      : pool;
    return [...list].sort((a, b) => {
      /* Les titres qui commencent par la recherche passent devant. */
      const aStarts = needle && fold(a.title).startsWith(needle) ? 0 : 1;
      const bStarts = needle && fold(b.title).startsWith(needle) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.title.localeCompare(b.title, "fr");
    });
  }, [pool, query]);

  const typed = query.trim();
  const known = pool.some((note) => normalizeTitle(note.title) === normalizeTitle(typed));
  const canCreate = Boolean(onCreate && typed && !known);
  const rows = canCreate ? matches.length + 1 : matches.length;

  const choose = (at: number) => {
    if (canCreate && at === matches.length) {
      onCreate?.(typed);
      return;
    }
    const note = matches[at];
    if (note) onPick(note);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Lier une note">
      <p className="pb-2 text-[13px] leading-[19px] text-muted">
        Le lien s’écrit <span className="font-semibold text-ink">[[Titre]]</span> dans
        le texte. Si vous renommez la note, le lien le dira.
      </p>

      <label className="relative block">
        <span className="sr-only">Chercher une note à lier</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIndex((value) => (rows === 0 ? 0 : (value + 1) % rows));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndex((value) => (rows === 0 ? 0 : (value - 1 + rows) % rows));
            } else if (event.key === "Enter") {
              event.preventDefault();
              choose(index);
            }
          }}
          placeholder="Titre de la note…"
          className="field h-11"
          autoComplete="off"
        />
      </label>

      <ul role="listbox" aria-label="Notes" className="mt-2 flex flex-col">
        {matches.map((note, at) => (
          <li key={note.id}>
            <button
              type="button"
              role="option"
              aria-selected={at === index}
              onMouseEnter={() => setIndex(at)}
              onClick={() => choose(at)}
              className={cn(
                "flex min-h-[44px] w-full items-center gap-2.5 rounded-field px-2.5 text-left text-[15px]",
                at === index && "bg-surface-2",
              )}
            >
              <FileText size={17} className="shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{note.title}</span>
              {at === index && (
                <ArrowElbowDownLeft size={15} className="shrink-0 text-muted" aria-hidden />
              )}
            </button>
          </li>
        ))}

        {canCreate && (
          <li>
            <button
              type="button"
              role="option"
              aria-selected={index === matches.length}
              onMouseEnter={() => setIndex(matches.length)}
              onClick={() => choose(matches.length)}
              className={cn(
                "flex min-h-[44px] w-full items-center gap-2.5 rounded-field px-2.5 text-left text-[15px]",
                index === matches.length && "bg-surface-2",
              )}
            >
              <Plus size={17} className="shrink-0 text-accent" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                Créer « {typed} »
              </span>
            </button>
          </li>
        )}

        {rows === 0 && (
          <li className="px-2.5 py-3 text-[14px] text-muted">
            Aucune note à lier pour l’instant.
          </li>
        )}
      </ul>
    </Sheet>
  );
}
