import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Carte à retournement **3D réel**.
 *
 * Ce n’est pas un changement d’état déguisé : deux faces coexistent dans le
 * DOM, `backface-visibility: hidden` les sépare, et c’est `rotateY(180deg)`
 * qui découvre le verso. Le navigateur interpole donc une vraie rotation —
 * d’où la perspective et l’épaisseur perçue.
 *
 * Trois couches, dans cet ordre :
 * 1. `.flip-inner` — la rotation, `transform-style: preserve-3d` ;
 * 2. `.flip-face` × 2 — recto et verso, dos à dos ;
 * 3. `.flip-holo` — le reflet holographique, **au-dessus** des faces, qui
 *    suit le pointeur et s’intensifie pendant le retournement.
 *
 * Accessibilité : le recto et le verso ne sont jamais lus en même temps
 * (`aria-hidden` sur la face cachée), la carte est un bouton nommé, et le
 * mouvement est supprimé si `prefers-reduced-motion` ou `data-motion="reduced"`
 * l’exigent (la bascule devient un fondu immédiat).
 */
export function FlipCard({
  flipped,
  onFlip,
  front,
  back,
  label,
  className,
  style,
}: {
  flipped: boolean;
  onFlip: () => void;
  front: ReactNode;
  back: ReactNode;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const reset = useCallback(() => {
    const element = root.current;
    if (!element) return;
    element.style.setProperty("--mx", "50%");
    element.style.setProperty("--my", "50%");
    element.style.setProperty("--tilt-x", "0deg");
    element.style.setProperty("--tilt-y", "0deg");
  }, []);

  useEffect(() => reset(), [reset]);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = root.current;
    if (!element || event.pointerType === "touch") return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      element.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
      element.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
      /* Inclinaison douce : 5° au maximum, jamais plus — au-delà, le texte
         se met à trembler et la carte a l’air cassée plutôt que vivante. */
      element.style.setProperty("--tilt-x", `${((0.5 - y) * 5).toFixed(2)}deg`);
      element.style.setProperty("--tilt-y", `${((x - 0.5) * 5).toFixed(2)}deg`);
    });
  };

  return (
    <div
      ref={root}
      className={cn("flip", className)}
      data-flipped={flipped ? "true" : "false"}
      style={style}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      /* La carte entière est cliquable, mais elle n’est **pas** un bouton :
         son verso contient de vrais boutons (« Voir dans la note »), et un
         bouton dans un bouton est invalide. La bascule accessible est le
         bouton « Afficher la réponse » de l’écran ; la carte l’imite au doigt. */
      onClick={onFlip}
      data-label={label}
    >
      <div className="flip-inner">
        <section className="flip-face flip-front" aria-hidden={flipped}>
          {front}
        </section>
        <section className="flip-face flip-back" aria-hidden={!flipped}>
          {back}
        </section>
      </div>
      <div className="flip-holo" aria-hidden="true" />
    </div>
  );
}
