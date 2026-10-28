import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react";
import { useMotionReduced } from "@/lib/cards/motion";
import { cn } from "@/lib/utils";

/**
 * Inclinaison 3D d’une carte.
 *
 * Le principe est celui du composant fourni : la position du pointeur dans la
 * carte est normalisée entre −0,5 et 0,5, convertie en `rotateX`/`rotateY`, et
 * lissée par un ressort pour que le mouvement ne tremble pas. Un `translateZ`
 * léger sur le contenu donne l’épaisseur : le texte flotte au-dessus du fond.
 *
 * Trois différences avec le composant d’origine, toutes volontaires :
 *
 * 1. **Le toucher est traité.** Sur téléphone, il n’y a pas de survol : la
 *    carte ne s’incline que **pendant l’appui**, sinon chaque défilement
 *    ferait pencher la page sous le doigt.
 * 2. **Le mouvement réduit est respecté.** Les réglages de l’application
 *    exposent déjà `data-motion="reduced"` ; une inclinaison qui ignore ce
 *    réglage est un mensonge de plus.
 * 3. **Aucun jeton de couleur n’est codé en dur.** Le composant fourni
 *    utilisait `border-border/30` et `bg-background` (conventions shadcn) :
 *    l’application a ses propres jetons (`border-line`, `bg-surface`).
 */

export interface TiltCardProps {
  children: ReactNode;
  /** amplitude maximale, en degrés */
  maxTilt?: number;
  /** profondeur du contenu, en pixels */
  depth?: number;
  /** désactive complètement l’effet (listes longues, impression) */
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  /** perspective du parent ; 1000 px est un bon compromis */
  perspective?: number;
  /** l’inclinaison suit le doigt pendant l’appui (mobile) */
  touch?: boolean;
}

export function TiltCard({
  children,
  maxTilt = 8,
  depth = 18,
  disabled = false,
  className,
  style,
  perspective = 1000,
  touch = true,
}: TiltCardProps) {
  const systemReduced = useMotionReduced();
  const [pressed, setPressed] = useState(false);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { damping: 18, stiffness: 160, mass: 0.6 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);

  const rotateX = useTransform(sy, [-0.5, 0.5], [`${maxTilt}deg`, `-${maxTilt}deg`]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [`-${maxTilt}deg`, `${maxTilt}deg`]);
  /* Reflet : suit le pointeur, comme une feuille légèrement glacée. */
  const glareX = useTransform(sx, [-0.5, 0.5], ["28%", "72%"]);
  const glareY = useTransform(sy, [-0.5, 0.5], ["22%", "78%"]);

  const frame = useRef<number | null>(null);

  const track = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || systemReduced) return;
      const isTouch = event.pointerType === "touch" || event.pointerType === "pen";
      if (isTouch && !touch) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        px.set(Math.max(-0.5, Math.min(0.5, x)));
        py.set(Math.max(-0.5, Math.min(0.5, y)));
      });
    },
    [disabled, px, py, systemReduced, touch],
  );

  const reset = useCallback(() => {
    px.set(0);
    py.set(0);
  }, [px, py]);

  const inert = disabled || systemReduced;
  /* Le doigt ne survole pas : l’effet n’existe que pendant l’appui. */
  const active = !inert;

  return (
    <div style={{ perspective: `${perspective}px` }} className={cn("min-w-0", className)}>
      <motion.div
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") track(event);
        }}
        onPointerMove={(event) => {
          if (active && (event.pointerType !== "touch" || pressed)) track(event);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") setPressed(true);
          track(event);
        }}
        onPointerUp={() => {
          setPressed(false);
          reset();
        }}
        onPointerLeave={() => {
          setPressed(false);
          reset();
        }}
        onPointerCancel={() => {
          setPressed(false);
          reset();
        }}
        style={{
          rotateX: inert ? 0 : rotateX,
          rotateY: inert ? 0 : rotateY,
          transformStyle: "preserve-3d",
          willChange: inert ? undefined : "transform",
        }}
        className="relative h-full w-full"
      >
        <div
          style={{
            transform: `translateZ(${depth}px)`,
            transformStyle: "preserve-3d",
          }}
          className="h-full"
        >
          {children}
        </div>

        {/* Le reflet est décoratif : il ne capte aucun pointeur et n’est pas
            annoncé. Il disparaît quand l’inclinaison est coupée, sinon il
            resterait figé au centre pour rien. */}
        {!inert && (
          <motion.span
            aria-hidden="true"
            className="tilt-glare"
            style={{ left: glareX, top: glareY }}
          />
        )}
      </motion.div>
    </div>
  );
}

export interface ImageCard3DProps {
  /** titre de la carte */
  title: string;
  /** sous-titre, lieu ou contexte */
  subtitle: string;
  /** image de fond (un fond d’écran livré avec l’application) */
  imageUrl: string;
  /** libellé du bouton principal */
  actionText: string;
  /** lien du coin supérieur droit */
  href?: string;
  onActionClick?: () => void;
  className?: string;
}

/**
 * Carte à fond plein, inclinable — reprise du composant « travel card » fourni,
 * ramenée aux jetons de l’application. Elle sert au studio pour montrer à quoi
 * ressemblerait une fiche de coffre avec couverture, **sans** prétendre que la
 * fonctionnalité existe déjà : les données restent nos fonds d’écran locaux.
 */
export function ImageCard3D({
  title,
  subtitle,
  imageUrl,
  actionText,
  href,
  onActionClick,
  className,
}: ImageCard3DProps) {
  return (
    <TiltCard maxTilt={10.5} depth={22} className={cn("h-[24rem] w-full max-w-[19rem]", className)}>
      <div className="relative h-full w-full overflow-hidden rounded-sheet border border-line bg-surface shadow-lift">
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/5 to-black/65" />

        <div className="relative flex h-full flex-col justify-between p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-serif text-[22px] font-semibold leading-tight drop-shadow-sm">
                {title}
              </h3>
              <p className="mt-0.5 text-[12.5px] font-medium text-white/80">{subtitle}</p>
            </div>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`En savoir plus sur ${title}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-inset ring-white/30 backdrop-blur transition-colors hover:bg-white/30"
              >
                <ArrowUpRight size={17} weight="bold" />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onActionClick}
            className="w-full rounded-field bg-white/15 py-2.5 text-[13.5px] font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-md transition-colors hover:bg-white/25"
          >
            {actionText}
          </button>
        </div>
      </div>
    </TiltCard>
  );
}
