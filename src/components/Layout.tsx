import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Cards,
  CheckCircle,
  ClockCounterClockwise,
  DotsThree,
  Gear,
  GraduationCap,
  House,
  Plus,
  SlidersHorizontal,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useContentStore } from "@/stores/useContentStore";
import { useRail } from "@/lib/useMediaQuery";
import { dueCards } from "@/lib/scheduler";
import { useToast } from "@/stores/useToast";
import { applySettingsToDom, useAppStore } from "@/stores/useAppStore";
import { useNavItems } from "@/stores/useNavStore";
import { resolveItems, splitMobile } from "@/lib/navigation";

/* ------------------------------------------------------------------ */
/* Coquille d’écran                                                    */
/* ------------------------------------------------------------------ */

export function Screen({
  children,
  className,
  withNav = false,
}: {
  children: ReactNode;
  className?: string;
  withNav?: boolean;
}) {
  return (
    <div className={cn("screen", className)}>
      <div className={cn("flex flex-1 flex-col", withNav && "pb-24")}>
        {children}
      </div>
      {withNav && <BottomNav />}
    </div>
  );
}

export function AppBar({
  title,
  back,
  onBack,
  action,
  close,
  className,
  center = true,
}: {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  action?: ReactNode;
  close?: boolean;
  className?: string;
  center?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className={cn("appbar", className)}>
      {close ? (
        <button
          type="button"
          aria-label="Fermer"
          className="icon-btn"
          onClick={onBack ?? (() => navigate(-1))}
        >
          <X size={24} weight="bold" />
        </button>
      ) : back ? (
        <button
          type="button"
          aria-label="Retour"
          className="icon-btn"
          onClick={onBack ?? (() => navigate(-1))}
        >
          <ArrowLeft size={24} weight="bold" />
        </button>
      ) : (
        <span className="w-11" aria-hidden="true" />
      )}
      {title !== undefined && (
        <div
          className={cn(
            "min-w-0 flex-1 truncate font-serif text-[17px] font-semibold",
            center ? "text-center" : "text-left pl-1",
          )}
        >
          {title}
        </div>
      )}
      <div className={cn("flex shrink-0 items-center gap-1", title === undefined && "ml-auto")}>
        {action}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation mobile                                                   */
/* ------------------------------------------------------------------ */

export function BottomNav() {
  const location = useLocation();
  /* La barre basse est le propre du téléphone : dès qu’un rail latéral est
     affiché (≥ 768 px ou mise en page forcée), deux navigations se
     contrediraient. */
  const rail = useRail();
  const navigate = useNavigate();
  const cards = useContentStore((s) => s.cards);
  const due = dueCards(cards).length;
  const items = useNavItems("mobile");
  const [moreOpen, setMoreOpen] = useState(false);

  const { bar, overflow } = splitMobile(items);
  const destinations = resolveItems(bar);
  const parked = resolveItems(overflow);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  if (rail) return null;

  /* Le bouton « + » reste au centre : il se place après la moitié de la
     barre, deux entrées à gauche quand il y en a cinq. */
  const half = Math.ceil(destinations.length / 2);

  return (
    <>
      <nav className="bottom-nav" aria-label="Navigation principale">
        <div className="bottom-nav-inner" data-count={destinations.length}>
          {destinations.slice(0, half).map((item) => (
            <NavButton
              key={item.id}
              label={item.short}
              icon={item.icon}
              badge={item.id === "review" ? due : undefined}
              active={isActive(item.to)}
              onClick={() => navigate(item.to)}
            />
          ))}

          <button
            type="button"
            onClick={() => navigate("/new")}
            aria-label="Nouvelle note — choisir une méthode"
            className="-mt-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-accent transition-transform active:scale-95"
          >
            <Plus size={28} weight="bold" />
          </button>

          {destinations.slice(half).map((item) => (
            <NavButton
              key={item.id}
              label={item.short}
              icon={item.icon}
              badge={item.id === "review" ? due : undefined}
              active={isActive(item.to)}
              onClick={() => navigate(item.to)}
            />
          ))}

          {parked.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              className="nav-item"
              data-active={parked.some((item) => isActive(item.to))}
            >
              <span className="relative">
                <DotsThree size={24} weight="bold" />
              </span>
              <span>Plus</span>
            </button>
          )}
        </div>
      </nav>

      {/* Les entrées activées qui ne tiennent pas dans la barre ne
          disparaissent pas : elles sont là, nommées, à un appui. */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Toutes les pages">
        <ul className="flex flex-col gap-1">
          {parked.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(item.to);
                  }}
                  aria-current={isActive(item.to) ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-field border px-3 py-2.5 text-left text-[14.5px]",
                    isActive(item.to)
                      ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                      : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <Icon size={19} weight="duotone" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block">{item.label}</span>
                    <span className="block text-[12px] font-normal leading-[17px] text-muted">
                      {item.hint}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            setMoreOpen(false);
            navigate("/settings/navigation");
          }}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-field border border-line bg-bg text-[13.5px] font-medium"
        >
          <SlidersHorizontal size={16} weight="bold" aria-hidden />
          Choisir les pages de la barre
        </button>
      </Sheet>
    </>
  );
}

function NavButton({
  label,
  icon: Icon,
  badge,
  active,
  onClick,
}: {
  label: string;
  icon: Icon;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      aria-current={active ? "page" : undefined}
      className="nav-item"
    >
      <span className="relative">
        <Icon size={24} weight={active ? "fill" : "regular"} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-accent px-1 py-0.5 text-center text-[11px] font-bold leading-none text-on-accent">
            {badge}
          </span>
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Feuille du bas                                                      */
/* ------------------------------------------------------------------ */

/**
 * Panneau modal.
 *
 * Sur téléphone : feuille basse (le pouce atteint tout).
 * Sur bureau : boîte centrée, ombre portée, contenu qui défile.
 * `size="wide"` ouvre les galeries (modèles) à 900 px.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  labelledBy,
  size = "default",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  labelledBy?: string;
  size?: "default" | "wide";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={title} aria-labelledby={labelledBy}>
      <button
        type="button"
        aria-label="Fermer"
        className="scrim"
        onClick={onClose}
        tabIndex={-1}
      />
      <div className="sheet" data-size={size}>
        <div className="sheet-handle" aria-hidden="true" />
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-[19px] font-semibold">{title}</h2>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">
              <X size={20} weight="bold" />
            </button>
          </div>
        )}
        <div className="max-h-[72dvh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label?: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-active={value === option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Retour visuel                                                       */
/* ------------------------------------------------------------------ */

export function ToastHost() {
  const { message, tone, hide } = useToast();
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite" onClick={hide}>
      {tone === "accent" && <CheckCircle size={18} weight="fill" />}
      <span>{message}</span>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Cards,
  title,
  description,
  action,
}: {
  icon?: typeof Cards;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-accent-soft text-accent">
        <Icon size={28} weight="duotone" />
      </div>
      <h2 className="font-serif text-[19px] font-semibold">{title}</h2>
      <p className="mt-2 max-w-[38ch] text-[15px] leading-[22px] text-muted">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Synchronisation du thème                                            */
/* ------------------------------------------------------------------ */

export function ThemeSync() {
  const settings = useAppStore((s) => s.settings);

  useEffect(() => {
    applySettingsToDom(settings);
  }, [settings]);

  /* Clavier mobile : on publie la hauteur qu’il occupe pour que les
     barres fixées en bas restent collées au-dessus, pas dessous. */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const inset = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      document.documentElement.style.setProperty("--kb", `${Math.round(inset)}px`);
      document.documentElement.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  useEffect(() => {
    const queries = [
      window.matchMedia("(prefers-color-scheme: dark)"),
      window.matchMedia("(prefers-contrast: more)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
      window.matchMedia("(prefers-reduced-transparency: reduce)"),
    ];
    const listener = () => {
      applySettingsToDom(useAppStore.getState().settings);
    };
    queries.forEach((q) => q.addEventListener("change", listener));
    return () => queries.forEach((q) => q.removeEventListener("change", listener));
  }, []);

  return null;
}
