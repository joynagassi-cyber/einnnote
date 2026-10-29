import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Info, X } from "@phosphor-icons/react";
import { hasSeenHint, markHintSeen } from "@/lib/hints";
import { cn } from "@/lib/utils";

/**
 * Une indication : **une ligne, une fois, puis plus rien**.
 *
 * Elle n’occupe pas de place définitivement — elle entre en fondu, se laisse
 * lire huit secondes, et s’efface toute seule. On peut aussi la fermer, ou
 * suivre son lien : dans les deux cas elle est marquée comme vue et ne revient
 * jamais. Pas de bulle, pas de flèche qui pointe un bouton, pas de visite
 * guidée : une phrase au-dessus du contenu, et le silence.
 *
 * Le rendu est volontairement discret (texte secondaire, filet fin) : une
 * indication ne doit pas ressembler à une alerte.
 */
export function Hint({
  hintId,
  children,
  href,
  hrefLabel,
  className,
  seconds = 8,
}: {
  /** identifiant stable : c’est lui qui garantit l’unicité */
  hintId: string;
  children: React.ReactNode;
  /** la leçon qui approfondit, si l’indication ne suffit pas */
  href?: string;
  hrefLabel?: string;
  className?: string;
  /** durée d’affichage avant effacement automatique */
  seconds?: number;
}) {
  const navigate = useNavigate();
  const [seen, setSeen] = useState(() => hasSeenHint(hintId));
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | null>(null);

  /* Marquer « vue » au montage, pas à la fermeture : une indication qui a été
     affichée huit secondes a été vue, même si l’onglet est ensuite fermé. */
  useEffect(() => {
    if (seen) return;
    markHintSeen(hintId);
    timer.current = window.setTimeout(() => setLeaving(true), seconds * 1000);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [hintId, seconds, seen]);

  /* La sortie passe par le fondu, puis par le démontage. On la pilote par un
     minuteur et non par `animationend` : avec `prefers-reduced-motion`, il n’y
     a pas d’animation, donc pas d’événement — et l’indication resterait. */
  const close = () => setLeaving(true);

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => setSeen(true), 320);
    return () => window.clearTimeout(id);
  }, [leaving]);

  if (seen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "flex items-start gap-2 rounded-field border border-line bg-surface/60 px-3 py-2 text-[13px] leading-[19px] text-muted",
        leaving && "hint-leave",
        !leaving && "hint-enter",
        className,
      )}
    >
      <Info size={15} className="mt-[2px] shrink-0 text-accent" aria-hidden />
      <p className="min-w-0 flex-1">{children}</p>
      {href && (
        <button
          type="button"
          onClick={() => {
            setSeen(true);
            navigate(href);
          }}
          className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-accent"
        >
          {hrefLabel ?? "Apprendre"}
          <ArrowRight size={13} weight="bold" aria-hidden />
        </button>
      )}
      <button
        type="button"
        onClick={close}
        aria-label="Masquer l’indication"
        className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2"
      >
        <X size={13} weight="bold" />
      </button>
    </div>
  );
}
