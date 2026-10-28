import type { ReactNode } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ZettelCard } from "@/types";

/**
 * La fiche ouverte — **une seule implémentation** pour les deux surfaces.
 *
 * Il y en avait deux : une dans la pile du téléphone, une dans le panneau du
 * bureau, avec des tailles, des marges et des comportements de défilement
 * différents. C’est exactement comme ça qu’une carte « mal codée » apparaît :
 * le contenu pousse le pied de carte hors du cadre, les cartes de derrière
 * dépassent en dessous, et personne ne voit le même défaut selon l’appareil.
 *
 * Ici, la règle est unique et vérifiable :
 *
 * 1. la fiche occupe **exactement** la hauteur qu’on lui donne (`h-full`) ;
 * 2. l’en-tête et le pied ne bougent pas ; seul le corps défile (`flex-1
 *    min-h-0 overflow-y-auto`) — c’est `min-h-0` qui l’autorise, sans lui un
 *    enfant flex refuse de rétrécir et pousse le pied dehors ;
 * 3. les renvois passent à la ligne au lieu de déborder ;
 * 4. le titre est limité à trois lignes, avec le texte complet en `title` pour
 *    ne rien perdre.
 */
export function ZettelSheet({
  card,
  cards = [],
  onOpenRef,
  actions,
  counter,
  footer,
  className,
  bodyClassName,
}: {
  card: ZettelCard;
  /** toutes les fiches du vault, pour nommer les renvois */
  cards?: ZettelCard[];
  onOpenRef?: (code: string) => void;
  /** boutons de l’en-tête (bureau : Modifier, Situer) */
  actions?: ReactNode;
  /** numéro de la fiche dans la pile (téléphone) */
  counter?: ReactNode;
  /** pied de carte (téléphone : geste + Modifier) */
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div data-sheet="zettel" className={cn("flex min-h-0 flex-col", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="zettel-code">{card.code}</span>
          <h2
            title={card.title}
            className="mt-2 line-clamp-3 font-serif text-[23px] font-semibold leading-[29px] sm:text-[26px] sm:leading-[32px]"
          >
            {card.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-start gap-1.5">
          {counter}
          {actions}
        </div>
      </header>

      <div
        data-part="body"
        className={cn("mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5", bodyClassName)}
      >
        <p className="whitespace-pre-wrap font-serif text-[16px] leading-[26px] sm:text-[16.5px] sm:leading-[27px]">
          {card.body}
        </p>

        {card.source && <p className="zettel-source mt-3.5">Source · {card.source}</p>}

        {card.refs.length > 0 && (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Renvois
            </p>
            <div className="flex flex-wrap gap-1.5">
              {card.refs.map((ref) => {
                const target = cards.find((entry) => entry.code === ref);
                return (
                  <button
                    key={ref}
                    type="button"
                    onClick={() => onOpenRef?.(ref)}
                    className="zettel-ref min-w-0"
                  >
                    <span className="shrink-0 font-semibold text-accent">{ref}</span>
                    {target && <span className="truncate">{target.title}</span>}
                    <CaretRight size={12} weight="bold" aria-hidden className="shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {footer && (
        <footer className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-line pt-3">
          {footer}
        </footer>
      )}
    </div>
  );
}
