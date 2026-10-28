import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  COMMANDS,
  isAvailable,
  searchCommands,
  sortedCommands,
  type Command,
} from "@/lib/commands/registry";
import { readRecent, pushRecent } from "@/lib/commands/recent";
import type { EditorSnapshot } from "@/lib/editor/snapshot";
import { cn } from "@/lib/utils";

/**
 * **La palette** — tout le registre, au clavier, au même endroit.
 *
 * Elle ne redéfinit aucune commande : elle lit `lib/commands/registry`. Ce qui
 * change selon l’ouverture, c’est seulement ce qu’on montre :
 *
 * - `mode="run"` : toutes les commandes ; celles qui ne s’appliquent pas sont
 *   **grisées avec leur raison** (on apprend pourquoi, on ne devine pas).
 * - `mode="add"` : seulement les gestes d’écriture (`texte`, `selection`,
 *   `liste`) — une commande de document n’a rien à faire sous le pouce.
 *
 * Le fond reste visible : une palette qui masque la note qu’on est en train de
 * lire fait perdre le fil.
 */

export interface PaletteProps {
  open: boolean;
  onClose: () => void;
  snapshot: EditorSnapshot;
  onRun: (command: Command) => void;
  /** choisir un geste à ranger plutôt que l’exécuter */
  mode?: "run" | "add" | "insert";
  title?: string;
}

const ADD_MOMENTS = new Set(["texte", "selection", "liste"]);
/* « insert » : la palette ouverte par « / ». On n’y montre que ce qui ajoute
   quelque chose au document — un « Annuler » sous la barre oblique serait un
   contresens. */
const INSERT_GROUPS = new Set(["Blocs", "Listes", "Insérer"]);

export function Palette({
  open,
  onClose,
  snapshot,
  onRun,
  mode = "run",
  title,
}: PaletteProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* À chaque ouverture : champ vide, première ligne, focus dans le champ. */
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIndex(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  const recent = useMemo(() => (open ? readRecent() : []), [open]);

  const pool = useMemo(() => {
    const base =
      mode === "add"
        ? COMMANDS.filter((command) => ADD_MOMENTS.has(command.moment))
        : mode === "insert"
          ? COMMANDS.filter((command) => INSERT_GROUPS.has(command.group))
          : COMMANDS;
    return sortedCommands(base);
  }, [mode]);

  const results = useMemo(() => {
    const found = searchCommands(query, pool);
    if (!query.trim()) return found;
    return found;
  }, [query, pool]);

  /* Sans recherche : les récentes d’abord, puis le reste dans l’ordre du
     produit. Avec une recherche, l’ordre des récentes n’aide plus. */
  const ordered = useMemo(() => {
    if (query.trim()) return results;
    const head = recent
      .map((id) => results.find((command) => command.id === id))
      .filter((command): command is Command => Boolean(command));
    return [...head, ...results.filter((command) => !head.includes(command))];
  }, [results, recent, query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  /* La ligne active reste dans la vue, même quand la liste est longue. */
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [index, ordered.length]);

  if (!open) return null;

  const run = (command: Command) => {
    if (!isAvailable(command, snapshot)) return;
    if (mode === "run") pushRecent(command.id);
    onRun(command);
    onClose();
  };

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((current) => (ordered.length === 0 ? 0 : (current + 1) % ordered.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((current) =>
        ordered.length === 0 ? 0 : (current - 1 + ordered.length) % ordered.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const command = ordered[index];
      if (command) run(command);
    }
  };

  /* Un groupe par titre, dans l’ordre du produit : on lit une famille de
     gestes, pas une liste alphabétique de quarante lignes. */
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fermer la palette"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? (mode === "add" ? "Ajouter un geste" : "Palette de commandes")}
        onKeyDown={onKeyDown}
        className="relative flex max-h-[76vh] w-full flex-col overflow-hidden rounded-t-big border border-line bg-surface shadow-lift sm:max-w-[560px] sm:rounded-big"
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <MagnifyingGlass size={17} className="shrink-0 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Chercher une commande"
            aria-controls="palette-list"
            aria-activedescendant={ordered[index] ? `palette-${ordered[index].id}` : undefined}
            placeholder="Chercher une commande…"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="icon-btn h-8 w-8 shrink-0"
          >
            <X size={15} weight="bold" />
          </button>
        </div>

        <div
          id="palette-list"
          ref={listRef}
          role="listbox"
          aria-label="Commandes"
          className="min-h-0 flex-1 overflow-y-auto p-1.5"
        >
          {ordered.length === 0 && (
            <p className="px-3 py-6 text-center text-[13.5px] text-muted">
              Aucune commande ne correspond à « {query.trim()} ».
            </p>
          )}

          {ordered.map((command, position) => {
            const previous = ordered[position - 1];
            const newGroup = !previous || previous.group !== command.group;
            const enabled = isAvailable(command, snapshot);
            const active = position === index;
            const Icon = command.icon;

            return (
              <div key={command.id}>
                {newGroup && (
                  <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {command.group}
                  </p>
                )}
                <button
                  type="button"
                  id={`palette-${command.id}`}
                  role="option"
                  aria-selected={active}
                  aria-disabled={!enabled}
                  data-active={active ? "true" : "false"}
                  data-command={command.id}
                  onMouseEnter={() => setIndex(position)}
                  onClick={() => run(command)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-field px-2.5 py-2 text-left",
                    active && "bg-surface-2",
                    !enabled && "opacity-55",
                  )}
                >
                  <Icon size={17} weight="duotone" className="shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{command.label}</span>
                    {!enabled && command.unavailable && (
                      <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                        {command.unavailable}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted">
                    {enabled ? command.hint : ""}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <p className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-[11px] text-muted">
          <span>↑ ↓ pour parcourir · Entrée pour exécuter</span>
          <span>Échap ferme</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
