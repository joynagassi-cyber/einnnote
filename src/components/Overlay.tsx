import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowsOutCardinal, X } from "@phosphor-icons/react";
import { useRail } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";

/**
 * **La couche flottante** — un seul portail pour toutes les fenêtres.
 *
 * Le défaut réparé : jusqu’ici chaque feuille était rendue **dans l’arbre de la
 * page qui l’ouvrait** (`Sheet` dans `Layout.tsx`). Dès qu’un ancêtre crée un
 * bloc conteneur — `backdrop-filter` d’un en-tête en verre, `transform` d’une
 * carte 3D, `contain` d’un futur panneau — le `position: fixed` se résout
 * contre cet ancêtre au lieu de l’écran : la fenêtre s’affiche à l’intérieur du
 * contenu, coupée par un `overflow`, ou pas du tout. Sur le web, cela donnait
 * des fenêtres invisibles ou « encastrées ».
 *
 * Ici, tout passe par `#overlay-root`, un enfant direct de `body`, créé à la
 * demande. Plus aucun ancêtre ne peut intercepter le positionnement, et le plan
 * d’empilement ne dépend plus de l’ordre du DOM : voile 60, fenêtre 61, toast
 * 80.
 *
 * Deux formes, une seule API :
 *
 * - **≥ 1024 px : fenêtre flottante** centrée, avec barre de titre. On la
 *   déplace à la souris ou au clavier (flèches, quand la barre a le focus), et
 *   un double-clic la recentre. Une fenêtre qu’on peut pousser de côté laisse
 *   voir ce qu’elle recouvre — c’est ce qu’on attend d’un poste de travail.
 * - **< 1024 px : feuille basse**, le pouce atteint tout, poignée visible.
 */

const HOST_ID = "overlay-root";

function overlayHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    document.body.appendChild(host);
  }
  return host;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** sous-titre court, affiché sous le titre de la fenêtre */
  subtitle?: string;
  labelledBy?: string;
  size?: "default" | "wide";
  /** barre d’actions collée en bas */
  footer?: ReactNode;
  /** force une forme (tests, aperçus) ; par défaut, la largeur décide */
  variant?: "window" | "sheet";
  children: ReactNode;
}

export function Overlay({
  open,
  onClose,
  title,
  subtitle,
  labelledBy,
  size = "default",
  footer,
  variant,
  children,
}: OverlayProps) {
  /* Le seuil est celui de la **barre latérale** (768 px), pas celui des deux
     panneaux (1024) : dès qu’il y a un rail, on est dans la version web, et une
     fenêtre de 680 px y tient très bien. En dessous, c’est un téléphone et le
     pouce commande : feuille basse. */
  const web = useRail();
  const form = variant ?? (web ? "window" : "sheet");

  const autoId = useId();
  const titleId = labelledBy ?? `${autoId}-titre`;

  const windowRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  /* ---- Ouverture : mémoriser l’ouvreur, verrouiller le fond ---- */
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;

    const { body, documentElement } = document;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    body.style.overflow = "hidden";
    /* Sans cette compensation, la page saute de la largeur de la barre de
       défilement à l’ouverture — le saut se voit sur un grand écran. */
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      openerRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  /* ---- Échap ferme ; Tab reste dans la fenêtre ---- */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      /* Une couche ouverte **par-dessus** (la palette de commandes) reste
         maîtresse d’Échap : sans cette exception, fermer la palette fermait
         aussi la fiche qu’on venait d’ouvrir. */
      const target = event.target as Element | null;
      if (target?.closest?.('[data-overlay-top="true"]')) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Position remise au centre à chaque ouverture : une fenêtre rouverte ne
     doit pas réapparaître dans un coin où on l’avait poussée la fois d’avant. */
  useEffect(() => {
    if (open) setOffset({ x: 0, y: 0 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = windowRef.current;
    if (!node) return;
    /* On donne le focus **au dialogue**, pas à son premier bouton : un lecteur
       d’écran annonce alors le titre, et la tabulation suivante entre dans le
       contenu au lieu de sauter sur la croix de fermeture. */
    node.focus({ preventScroll: true });
  }, [open, form]);

  const onWindowKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const node = windowRef.current;
    if (!node) return;
    /* `offsetParent` vaut `null` pour tout élément `fixed` (et pour tout jsdom),
       donc il ne peut pas servir de test de visibilité ici : la sélection
       exclut déjà ce qui est désactivé, et une fenêtre ne cache pas ses champs. */
    const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  /* ---- Déplacement de la fenêtre ---- */
  const clamp = useCallback((next: { x: number; y: number }) => {
    const node = windowRef.current;
    if (!node || typeof window === "undefined") return next;
    const rect = node.getBoundingClientRect();
    /* `rect` peut être vide (jsdom, premier rendu) : on retombe alors sur les
       dimensions de la fenêtre, jamais sur zéro. */
    const width = rect.width || Math.min(window.innerWidth, 680);
    const height = rect.height || 420;
    const maxX = Math.max(0, (window.innerWidth - width) / 2 - 12);
    const maxY = Math.max(0, (window.innerHeight - height) / 2 - 12);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const node = windowRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: offset.x,
      top: offset.y,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset(
      clamp({
        x: drag.left + (event.clientX - drag.x),
        y: drag.top + (event.clientY - drag.y),
      }),
    );
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const nudge = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 48 : 16;
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setOffset((current) => clamp({ x: current.x + move.x, y: current.y + move.y }));
  };

  if (!open || typeof document === "undefined") return null;

  const isWindow = form === "window";

  return createPortal(
    <div className="overlay-root" data-variant={form}>
      <button
        type="button"
        aria-label="Fermer"
        tabIndex={-1}
        className="overlay-scrim"
        onClick={onClose}
      />
      <div
        ref={windowRef}
        role="dialog"
        aria-modal="true"
        aria-label={!title && !labelledBy ? "Fenêtre" : undefined}
        aria-labelledby={title ? titleId : labelledBy}
        data-variant={form}
        data-size={size}
        onKeyDown={onWindowKeyDown}
        tabIndex={-1}
        className={cn(isWindow ? "overlay-window" : "overlay-sheet")}
        style={
          isWindow
            ? {
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }
            : undefined
        }
      >
        {isWindow ? (
          <div
            ref={barRef}
            className="overlay-bar"
            onPointerDown={startDrag}
            onPointerMove={onDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={() => setOffset({ x: 0, y: 0 })}
            onKeyDown={nudge}
            tabIndex={0}
            role="group"
            aria-label={title ? `Fenêtre ${title} — déplacement aux flèches` : "Fenêtre"}
            title="Glisser pour déplacer · double-clic pour recentrer · flèches au clavier"
          >
            <span className="overlay-grip" aria-hidden>
              <ArrowsOutCardinal size={13} weight="bold" />
            </span>
            <span className="min-w-0 flex-1">
              {title && (
                <h2 id={titleId} className="truncate text-[14px] font-semibold">
                  {title}
                </h2>
              )}
              {subtitle && (
                <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                  {subtitle}
                </span>
              )}
            </span>
            <button
              type="button"
              className="icon-btn h-7 w-7 shrink-0"
              onClick={onClose}
              aria-label={title ? `Fermer ${title}` : "Fermer"}
            >
              <X size={15} weight="bold" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="sheet-handle" aria-hidden="true" />
        )}

        <div className={cn(isWindow ? "overlay-body" : "overlay-body px-5 pb-5 pt-1")}>
          {!isWindow && title && (
            <div className="mb-3 flex items-center justify-between">
              <h2 id={titleId} className="font-serif text-[19px] font-semibold">
                {title}
              </h2>
              <button
                type="button"
                className="icon-btn"
                onClick={onClose}
                aria-label={`Fermer ${title}`}
              >
                <X size={20} weight="bold" aria-hidden />
              </button>
            </div>
          )}
          {children}
        </div>

        {footer && <div className="overlay-footer">{footer}</div>}
      </div>
    </div>,
    overlayHost(),
  );
}
