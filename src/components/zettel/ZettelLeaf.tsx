import { cn } from "@/lib/utils";
import type { ZettelCard } from "@/types";

/**
 * Une fiche de coffre réduite à sa feuille : code, titre, corps, source.
 *
 * C’est le même papier que la fiche ouverte (`.zettel-card`), sans la marge
 * d’index — elle n’a de sens que sur la fiche qu’on lit en entier. Le corps est
 * coupé à trois lignes quand la carte n’est pas au centre : dans un éventail,
 * une voisine n’a pas à être lisible, elle n’a qu’à annoncer.
 */
export function ZettelLeaf({
  card,
  active = false,
  className,
  refs = [],
}: {
  card: ZettelCard;
  active?: boolean;
  className?: string;
  /** intitulés des fiches citées, déjà résolus */
  refs?: string[];
}) {
  return (
    <div className={cn("zettel-leaf", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="zettel-code">{card.code}</span>
        {refs.length > 0 && (
          <span className="shrink-0 text-[11px] font-medium text-muted">
            {refs.length} renvoi{refs.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <h3
        className={cn(
          "mt-2 font-serif font-semibold",
          active
            ? "line-clamp-2 text-[19px] leading-[24px]"
            : "line-clamp-2 text-[16.5px] leading-[22px]",
        )}
      >
        {card.title}
      </h3>

      <p
        className={cn(
          "mt-1.5 min-h-0 flex-1 whitespace-pre-wrap text-[13px] leading-[19px] text-muted",
          active ? "line-clamp-[9]" : "line-clamp-3",
        )}
      >
        {card.body}
      </p>

      {card.source && (
        <span className="mt-2 block truncate text-[11.5px] font-medium text-accent-ink">
          {card.source}
        </span>
      )}
    </div>
  );
}
