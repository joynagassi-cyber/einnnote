import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import {
  fanLayout,
  fanMultiplier,
  fanPerSide,
  slotGeometry,
  type FanPlacement,
} from "@/lib/cards/fan";
import { prefersReducedMotion } from "@/lib/cards/motion";
import { cn } from "@/lib/utils";

/**
 * Éventail de cartes — défilement circulaire, relief, glissement.
 *
 * Repris du composant fourni (`card-fan-carousel`), dont on garde la
 * géométrie : sept positions en arc, la carte centrale droite et à l’échelle 1,
 * les voisines tournées, rétrécies et descendues. Trois changements :
 *
 * 1. **Le contenu est du React, pas une image.** Une fiche de vault n’est pas
 *    une photo : elle a un code, un titre, un corps. Le composant d’origine ne
 *    savait afficher qu’un `imgUrl`.
 * 2. **Le glissement et le clavier sont réels.** Un carrousel qui ne se
 *    feuillette qu’à la flèche, sur un téléphone, ne donne envie de rien.
 * 3. **GSAP est chargé à la demande.** 70 ko de bibliothèque d’animation ne
 *    doivent pas peser sur quelqu’un qui n’ouvre jamais un vault en éventail.
 *    Le premier rendu est correct sans GSAP (positions en CSS), puis GSAP prend
 *    le relais pour les transitions : aucune attente visible.
 *
 * Mouvement réduit : aucune entrée animée, aucun ressort — on pose les cartes
 * et on change de position instantanément.
 */

export interface FanItem {
  /** clé stable (identifiant de la fiche) */
  key: string;
  /** description lue par les lecteurs d’écran */
  label: string;
  /** rendu de la carte ; `active` = carte au centre */
  render: (active: boolean) => ReactNode;
  /** action d’ouverture (clic sur la carte centrale, Entrée) */
  onOpen?: () => void;
}

export function CardFan({
  items,
  className,
  initialIndex = 0,
  onIndexChange,
  hint,
}: {
  items: FanItem[];
  className?: string;
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  hint?: string;
}) {
  const total = items.length;
  const [center, setCenter] = useState(() =>
    total ? Math.min(initialIndex, total - 1) : 0,
  );
  const [size, setSize] = useState(() => ({
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
  }));
  const [mounted, setMounted] = useState<Set<number>>(() => new Set());

  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<number, HTMLElement>());
  const dragging = useRef(false);
  const startX = useRef(0);
  const moved = useRef(false);
  const previous = useRef<Set<number>>(new Set());
  const entered = useRef(false);
  const dropping = useRef<number | null>(null);

  const perSide = fanPerSide(size.width);
  const multiplier = fanMultiplier(size.width);
  const placements = useMemo(
    () => fanLayout(total, center, perSide),
    [total, center, perSide],
  );
  const visible = useMemo(
    () => new Set(placements.map((placement) => placement.index)),
    [placements],
  );

  useEffect(() => {
    onIndexChange?.(center);
  }, [center, onIndexChange]);

  /* Taille d’écran : l’arc s’élargit avec la place disponible. */
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const cycle = useCallback(
    (direction: 1 | -1) => {
      if (total < 2) return;
      setCenter((current) => (((current + direction) % total) + total) % total);
    },
    [total],
  );

  /* Ce qui reste monté : les cartes visibles, plus celles qui sortent le temps
     de l’animation. Sur un vault de 200 fiches, tout rendre coûterait cher. */
  useEffect(() => {
    setMounted((current) => {
      const next = new Set(current);
      visible.forEach((index) => next.add(index));
      previous.current.forEach((index) => {
        if (!visible.has(index)) next.add(index);
      });
      return next;
    });

    if (dropping.current) window.clearTimeout(dropping.current);
    const leaving = [...previous.current].filter((index) => !visible.has(index));
    if (leaving.length) {
      dropping.current = window.setTimeout(() => {
        setMounted((current) => {
          const next = new Set(current);
          leaving.forEach((index) => {
            if (!visible.has(index)) next.delete(index);
          });
          return next;
        });
      }, 420);
    }
    previous.current = new Set(visible);

    return () => {
      if (dropping.current) window.clearTimeout(dropping.current);
    };
  }, [visible]);

  /* Chorégraphie. GSAP arrive après le premier rendu : sans lui, les positions
     CSS donnent déjà le bon éventail. */
  useEffect(() => {
    const reduced = prefersReducedMotion();

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const module = await import("gsap");
      if (cancelled) return;
      const gsap = module.default ?? module.gsap;
      const stageEl = stage.current;
      /* Rien n’est encore monté : on sort sans marquer l’entrée comme faite,
         sinon l’animation d’arrivée ne se jouerait jamais. */
      if (!stageEl || cards.current.size === 0) return;

      const targets = placements.map((placement) => ({
        element: cards.current.get(placement.index),
        placement,
      }));

      targets.forEach(({ element, placement }) => {
        if (!element) return;
        const { geometry } = placement;
        const to = {
          x: `${geometry.x * multiplier}rem`,
          y: `${geometry.y}rem`,
          rotation: geometry.rotation,
          scale: geometry.scale,
          opacity: 1,
          duration: reduced ? 0 : 0.55,
          ease: reduced ? "none" : "power3.out",
        };
        if (!entered.current) {
          gsap.set(element, {
            x: 0,
            y: `${8}rem`,
            rotation: 0,
            scale: 0.55,
            opacity: 0,
          });
          gsap.to(element, {
            ...to,
            duration: reduced ? 0 : 0.9,
            ease: "elastic.out(1.02,.8)",
            delay: reduced ? 0 : 0.06 + placement.slot * 0.05,
          });
        } else {
          gsap.to(element, to);
        }
        gsap.set(element, { zIndex: geometry.zIndex });
      });

      /* Cartes sorties du champ : elles s’échappent de leur côté. */
      cards.current.forEach((element, index) => {
        if (visible.has(index)) return;
        gsap.to(element, {
          opacity: 0,
          scale: 0.5,
          x: `${(index > center ? 1 : -1) * 26}rem`,
          duration: reduced ? 0 : 0.3,
          ease: "power2.in",
          zIndex: 0,
        });
      });

      entered.current = true;

      /* Survol : la carte visée se soulève, les voisines s’écartent. C’est ce
         qui transforme un empilement statique en objet qu’on a envie de
         toucher — mais uniquement là où le survol existe. */
      const canHover = window.matchMedia?.("(hover: hover)").matches ?? false;
      const restore = () =>
        placements.forEach((placement) => {
          const node = cards.current.get(placement.index);
          if (!node) return;
          gsap.to(node, {
            x: `${placement.geometry.x * multiplier}rem`,
            y: `${placement.geometry.y}rem`,
            rotation: placement.geometry.rotation,
            scale: placement.geometry.scale,
            duration: reduced ? 0 : 0.4,
            ease: "power2.out",
            overwrite: "auto",
          });
        });

      const listeners: { node: HTMLElement; enter: () => void }[] = [];
      if (canHover && !reduced) {
        placements.forEach((placement) => {
          const node = cards.current.get(placement.index);
          if (!node) return;
          const enter = () => {
            placements.forEach((other) => {
              const target = cards.current.get(other.index);
              if (!target) return;
              const distance = other.slot - placement.slot;
              const push = distance === 0 ? 0 : Math.sign(distance) * (4.5 / (Math.abs(distance) + 1));
              gsap.to(target, {
                x: `${(other.geometry.x + push) * multiplier}rem`,
                y: `${other.geometry.y - (distance === 0 ? 1.6 : 0)}rem`,
                rotation: other.geometry.rotation + (distance === 0 ? 0 : Math.sign(distance) * 1.4),
                scale: other.geometry.scale * (distance === 0 ? 1.05 : 1),
                duration: 0.4,
                ease: "elastic.out(1,.75)",
                overwrite: "auto",
              });
            });
          };
          node.addEventListener("mouseenter", enter);
          listeners.push({ node, enter });
        });

        stageEl.addEventListener("mouseleave", restore);
      }

      cleanup = () => {
        listeners.forEach(({ node, enter }) => node.removeEventListener("mouseenter", enter));
        stageEl.removeEventListener("mouseleave", restore);
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [placements, multiplier, visible, center, mounted]);

  if (!total) return null;

  return (
    <section className={cn("fan", className)} aria-roledescription="carrousel">
      <div
        ref={stage}
        className="fan-stage"
        tabIndex={0}
        role="group"
        aria-label={`Éventail de ${total} fiches`}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            cycle(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            cycle(1);
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            items[center]?.onOpen?.();
          }
        }}
        onPointerDown={(event) => {
          dragging.current = true;
          moved.current = false;
          startX.current = event.clientX;
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          if (Math.abs(event.clientX - startX.current) > 12) moved.current = true;
        }}
        onPointerUp={(event) => {
          if (!dragging.current) return;
          dragging.current = false;
          const delta = event.clientX - startX.current;
          if (Math.abs(delta) > 48) {
            cycle(delta < 0 ? 1 : -1);
            /* Le clic qui suit un glissement ne doit pas ouvrir la carte. */
            moved.current = true;
            window.setTimeout(() => {
              moved.current = false;
            }, 60);
          }
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {items.map((item, index) => {
          if (!mounted.has(index)) return null;
          const placement = placements.find((entry) => entry.index === index);
          const active = index === center;
          const geometry = placement?.geometry ?? slotGeometry(0, 1);
          return (
            <div
              key={item.key}
              ref={(node) => {
                if (node) cards.current.set(index, node);
                else cards.current.delete(index);
              }}
              className={cn("fan-card", active && "fan-card-active")}
              data-active={active || undefined}
              aria-hidden={active ? undefined : true}
              /* Repli sans JS : la position exacte de l’arc, en CSS. GSAP
                 réécrit `transform` dès qu’il est chargé. */
              style={{
                ["--fan-x" as string]: `${geometry.x * multiplier}rem`,
                ["--fan-y" as string]: `${geometry.y}rem`,
                ["--fan-rot" as string]: `${geometry.rotation}deg`,
                ["--fan-scale" as string]: geometry.scale,
                zIndex: geometry.zIndex,
              }}
              onClick={() => {
                /* Un glissement ne doit pas ouvrir une carte. */
                if (moved.current) {
                  moved.current = false;
                  return;
                }
                if (active) item.onOpen?.();
                else setCenter(index);
              }}
            >
              <button
                type="button"
                className="fan-card-hit"
                tabIndex={active ? 0 : -1}
                aria-label={active ? `${item.label} — ouvrir` : `${item.label} — mettre au centre`}
              >
                <span className="sr-only">{item.label}</span>
              </button>
              <div className="fan-card-face">{item.render(active)}</div>
            </div>
          );
        })}
      </div>

      <div className="fan-controls">
        <button
          type="button"
          className="fan-arrow"
          aria-label="Fiche précédente"
          onClick={() => cycle(-1)}
        >
          <CaretLeft size={17} weight="bold" />
        </button>

        <div className="fan-dots" aria-hidden="true">
          {items.map((item, index) => (
            <span
              key={item.key}
              className={cn("fan-dot", index === center && "fan-dot-active")}
            />
          ))}
        </div>

        <button
          type="button"
          className="fan-arrow"
          aria-label="Fiche suivante"
          onClick={() => cycle(1)}
        >
          <CaretRight size={17} weight="bold" />
        </button>
      </div>

      <p className="fan-hint">
        {hint ?? "Glissez, ou utilisez les flèches · la carte du centre est lisible"}
      </p>
    </section>
  );
}
