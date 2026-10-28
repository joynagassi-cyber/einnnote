import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  DotsThreeOutline,
  Plus,
  DotsSixVertical,
  ArrowCounterClockwise,
  X,
  ArrowUp,
  ArrowDown,
} from "@phosphor-icons/react";
import {
  PUPITRE_MAX,
  addSlot,
  moveSlot,
  placeBefore,
  readPupitre,
  removeSlot,
  resetPupitre,
  writePupitre,
} from "@/lib/commands/pupitre";
import { commandById, isAvailable, type Command } from "@/lib/commands/registry";
import type { EditorSnapshot } from "@/lib/editor/snapshot";
import { cn } from "@/lib/utils";

/**
 * **Le pupitre** — la barre d’écriture du téléphone.
 *
 * Quatre gestes, choisis par la personne qui écrit, plus un bouton « Tout » qui
 * ouvre la palette. Rien d’autre : Obsidian aligne six boutons qu’on ne peut
 * régler qu’en quittant sa note ; ici on règle **sur place**, par appui long, et
 * on retrouve la note telle qu’on l’avait laissée.
 *
 * Trois décisions visibles dans le code :
 *
 * 1. **La stabilité d’abord.** Le contenu du pupitre ne change jamais tout seul
 *    (pas de réorganisation « intelligente » selon le contexte) : une barre qui
 *    bouge sous le doigt ne se mémorise pas.
 * 2. **Une commande indisponible est grisée, pas cachée.** On apprend par la
 *    raison écrite (`aria-label` + `title`), on ne devine pas.
 * 3. **Le rangement a deux entrées.** Appui long sur « Tout » pour les doigts,
 *    et un bouton dans la fiche pour le clavier — une fonction qu’on ne peut
 *    atteindre qu’au doigt n’est pas accessible.
 */

const LONG_PRESS_MS = 500;

export interface PupitreProps {
  snapshot: EditorSnapshot;
  onRun: (command: Command) => void;
  onOpenPalette: () => void;
  /** le mode Ranger est piloté de l’extérieur quand la fiche l’ouvre */
  ranging: boolean;
  onRangingChange: (open: boolean) => void;
}

export function Pupitre({
  snapshot,
  onRun,
  onOpenPalette,
  ranging,
  onRangingChange,
}: PupitreProps) {
  const [slots, setSlots] = useState<string[]>(() => readPupitre());
  const [picked, setPicked] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);

  useEffect(() => {
    setSlots(readPupitre());
  }, []);

  const commit = useCallback((next: string[]) => {
    setSlots(writePupitre(next));
  }, []);

  const clearTimer = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  /* ------------------------------------------------ appui long sur « Tout » */
  const startPress = () => {
    clearTimer();
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      onRangingChange(true);
    }, LONG_PRESS_MS);
  };

  const finishPress = () => {
    const hadTimer = pressTimer.current !== null;
    clearTimer();
    if (hadTimer) onOpenPalette();
  };

  /* ------------------------------------------------------------ rangement */
  const finishDrag = () => {
    if (picked && over && picked !== over) commit(placeBefore(slots, picked, over));
    setPicked(null);
    setOver(null);
  };

  const rows = slots
    .map((id) => commandById(id))
    .filter((command): command is Command => Boolean(command));

  return (
    <div
      className="pupitre"
      role="toolbar"
      aria-label="Gestes d’écriture"
      onPointerUp={finishDrag}
      onPointerLeave={() => setOver(null)}
    >
      {ranging ? (
        <div className="flex flex-col gap-2 px-2 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[12.5px] font-semibold">Ranger le pupitre</p>
            <span className="text-[11px] tabular-nums text-muted">
              {rows.length} sur {PUPITRE_MAX}
            </span>
          </div>

          <ul className="flex flex-col gap-1">
            {rows.map((command) => {
              const Icon = command.icon;
              return (
                <li
                  key={command.id}
                  data-over={over === command.id ? "true" : "false"}
                  className={cn(
                    "flex items-center gap-2 rounded-field bg-surface-2 px-2 py-1.5",
                    over === command.id && "outline outline-1 outline-accent",
                  )}
                >
                  <Icon size={16} weight="duotone" className="shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{command.label}</span>
                  <button
                    type="button"
                    aria-label={`Retirer ${command.label}`}
                    onClick={() => commit(removeSlot(slots, command.id))}
                    className="icon-btn h-8 w-8"
                  >
                    <X size={14} weight="bold" />
                  </button>
                  {/* La poignée est le dernier élément de la ligne, comme dans
                      le rail : la même main, le même geste. */}
                  <button
                    type="button"
                    aria-label={`Déplacer ${command.label}`}
                    onPointerDown={() => setPicked(command.id)}
                    onPointerEnter={() => picked && setOver(command.id)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                        event.preventDefault();
                        commit(moveSlot(slots, command.id, event.key === "ArrowUp" ? -1 : 1));
                      }
                    }}
                    className="icon-btn h-8 w-8 cursor-grab"
                  >
                    <DotsSixVertical size={16} weight="bold" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenPalette}
              disabled={slots.length >= PUPITRE_MAX}
              className="btn-secondary h-9 px-2.5 text-[12.5px] disabled:opacity-50"
            >
              <Plus size={14} weight="bold" /> Ajouter un geste
            </button>
            <button
              type="button"
              onClick={() => commit(resetPupitre())}
              className="btn-secondary h-9 px-2.5 text-[12.5px]"
            >
              <ArrowCounterClockwise size={14} /> Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => onRangingChange(false)}
              className="btn-primary ml-auto h-9 px-3 text-[12.5px]"
            >
              <Check size={14} weight="bold" /> Terminé
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 px-1.5 py-1">
          {rows.map((command) => {
            const Icon = command.icon;
            const enabled = isAvailable(command, snapshot);
            const active =
              (command.id === "bold" && snapshot.marks.bold) ||
              (command.id === "italic" && snapshot.marks.italic) ||
              (command.id === "bullet" && snapshot.bullet) ||
              (command.id === "ordered" && snapshot.ordered) ||
              (command.id === "task" && snapshot.task) ||
              (command.id.startsWith("highlight-") && snapshot.marks.highlight);

            return (
              <button
                key={command.id}
                type="button"
                data-command={command.id}
                aria-label={command.label}
                aria-pressed={active || undefined}
                aria-disabled={!enabled}
                title={enabled ? command.label : (command.unavailable ?? command.label)}
                onClick={() => enabled && onRun(command)}
                className={cn(
                  "icon-btn h-11 w-11 shrink-0",
                  active && "bg-accent-soft text-accent-ink",
                  !enabled && "opacity-40",
                )}
              >
                <Icon size={19} weight={active ? "bold" : "regular"} />
              </button>
            );
          })}

          <button
            type="button"
            aria-label="Tout : toutes les commandes"
            title="Toutes les commandes (appui long : ranger)"
            onPointerDown={startPress}
            onPointerUp={finishPress}
            onPointerLeave={clearTimer}
            onPointerCancel={clearTimer}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenPalette();
              }
            }}
            className="ml-auto flex h-11 shrink-0 items-center gap-1 rounded-field px-2.5 text-[12.5px] font-semibold text-accent-ink"
          >
            <DotsThreeOutline size={17} weight="bold" aria-hidden /> Tout
          </button>
        </div>
      )}
    </div>
  );
}
