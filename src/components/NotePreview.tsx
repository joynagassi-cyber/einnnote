import { sanitizeHtml } from "@/lib/editor/blocks";
import { noteText, useContentStore } from "@/stores/useContentStore";
import { cn } from "@/lib/utils";
import type { Note } from "@/types";

/**
 * Aperçu **rendu** d’une note — pas une liste de titres.
 *
 * Il sert à deux endroits, et c’est le même composant pour les deux : la vue
 * carte de la bibliothèque (« Aperçu » sans quitter la grille) et le verso
 * d’une carte de révision (le contexte de la question). Dupliquer le rendu
 * aurait garanti deux vérités divergentes.
 *
 * Le HTML des blocs est nettoyé par `sanitizeHtml` : l’éditeur est la seule
 * source, mais une sauvegarde restaurée peut venir d’ailleurs.
 */
export function NotePreview({
  note,
  limit,
  compact = false,
  className,
}: {
  note: Note;
  /** nombre de blocs affichés ; `undefined` = tout */
  limit?: number;
  compact?: boolean;
  className?: string;
}) {
  const mindmaps = useContentStore((s) => s.mindmaps);
  const zettel = useContentStore((s) => s.zettel);
  const vaults = useContentStore((s) => s.vaults);

  const blocks = note.blocks.filter((block) => block.html.trim().length > 0);
  const shown = typeof limit === "number" ? blocks.slice(0, limit) : blocks;

  if (shown.length === 0) {
    /* Les méthodes sans blocs (carte mentale, coffre) ont leur propre matière :
       la montrer vaut mieux qu’un « note vide » mensonger. */
    const map = mindmaps.find((m) => m.noteId === note.id || m.id === note.mindmapId);
    if (map && map.nodes.length > 0) {
      return (
        <div className={cn("flex flex-wrap gap-1.5", className)}>
          {map.nodes.slice(0, limit ?? 8).map((node) => (
            <span
              key={node.id}
              className="rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-ink"
            >
              {node.text}
            </span>
          ))}
        </div>
      );
    }
    const vault = vaults.find((v) => v.id === note.vaultId);
    if (vault) {
      const fiches = zettel.filter((card) => card.vaultId === vault.id);
      return (
        <div className={className}>
          <p className={cn("text-muted", compact ? "text-[12.5px]" : "text-[13.5px]")}>
            Coffre {vault.name} · {fiches.length} fiche{fiches.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {fiches.slice(0, limit ?? 4).map((card) => (
              <li key={card.id} className="flex items-baseline gap-1.5">
                <span className="shrink-0 text-[11.5px] font-semibold text-accent">
                  {card.code}
                </span>
                <span className="truncate font-serif text-[13.5px]">{card.title}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return (
      <p className={cn("text-muted", compact ? "text-[12.5px]" : "text-[13.5px]", className)}>
        {noteText(note).trim() ? noteText(note) : "Note vide. Touchez pour écrire la première idée."}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "note-preview flex flex-col",
        compact ? "gap-1.5" : "gap-2.5",
        className,
      )}
    >
      {shown.map((block) => {
        const html = sanitizeHtml(block.html);
        const heading = block.kind === "h1" || block.kind === "h2";
        return (
          <div
            key={block.id}
            className={cn(
              "note-preview-block",
              block.bullet && "note-preview-bullet",
              block.marked && "passage",
            )}
            style={block.indent > 0 ? { marginLeft: `${block.indent * 14}px` } : undefined}
          >
            {heading ? (
              <p
                className={cn(
                  "font-serif font-semibold leading-snug",
                  compact ? "text-[14px]" : "text-[16px]",
                )}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p
                className={cn(
                  "font-serif",
                  compact ? "text-[13.5px] leading-[21px]" : "text-[15px] leading-[25px]",
                  block.kind === "quote" && "border-l-2 border-line-strong pl-2.5 italic",
                )}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
        );
      })}
      {typeof limit === "number" && blocks.length > limit && (
        <p className="text-[11.5px] font-medium text-muted">
          + {blocks.length - limit} bloc{blocks.length - limit > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
