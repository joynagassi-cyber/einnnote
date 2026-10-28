import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChartLineUp,
  ClockCounterClockwise,
  FolderSimple,
  Gear,
  Stack,
  Database,
  GraduationCap,
  House,
  Info,
  Moon,
  FolderPlus,
  MonitorPlay,
  PaintBrush,
  Plus,
  Sun,
  Trash,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore, resolvedTheme } from "@/stores/useAppStore";
import { dueCards, estimateMinutes } from "@/lib/scheduler";
import {
  forcedLayout,
  useCompactRail,
  useIsDesktop,
  useRail,
} from "@/lib/useMediaQuery";
import { wallById, wallUrl } from "@/lib/walls";
import { useWallPalette } from "@/lib/useWallPalette";
import {
  FOCUS_SEARCH_EVENT,
  SHORTCUTS,
  useDesktopShortcuts,
} from "@/lib/useDesktopShortcuts";
import { Sheet } from "@/components/Layout";
import {
  DotsSixVertical,
  Keyboard,
  SidebarSimple,
  type Icon,
} from "@phosphor-icons/react";
import { useNavStore } from "@/stores/useNavStore";
import { resolveItems, type NavId } from "@/lib/navigation";

/* ------------------------------------------------------------------ */
/* Coquille bureau : rail + colonne de contenu                         */
/* ------------------------------------------------------------------ */

export function AppShell({ children }: { children: ReactNode }) {
  /* Navigation latérale dès 768 px. Sa forme (icônes ou libellés) suit la
     largeur réelle ; seuls les écrans à deux panneaux suivent `useIsDesktop`. */
  const rail = useRail();
  const widthCompact = useCompactRail();
  const railPreference = useAppStore((s) => s.settings.rail ?? "auto");
  const setRail = useAppStore((s) => s.setRail);
  /* Trois états, un seul rendu : la préférence de l’utilisateur l’emporte sur
     la largeur de l’écran, « auto » suit la place disponible. */
  const compact =
    railPreference === "collapsed"
      ? true
      : railPreference === "expanded"
        ? false
        : widthCompact;
  /* Le clavier complet suppose un vrai poste ; deux panneaux supposent la place. */
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const layout = useAppStore((s) => s.settings.layout);

  /* Le CSS ne connaît pas React : la préférence doit être visible sur `<html>`
     pour que `?mobile=1` retire vraiment le rail (sinon deux navigations). */
  useEffect(() => {
    const forced = forcedLayout() ?? layout ?? "auto";
    document.documentElement.dataset.layout = forced;
  }, [layout, rail]);

  /* La largeur du rail est une variable CSS : c’est ici qu’on la pilote, et
     nulle part ailleurs. */
  useEffect(() => {
    document.documentElement.dataset.rail = railPreference;
  }, [railPreference]);

  /* Le clavier n’existe qu’en bureau : sur téléphone, ces lettres sont du texte. */
  useDesktopShortcuts(desktop, {
    onSearch: () => {
      if (window.location.pathname !== "/") navigate("/");
      document.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
    },
    onNew: () => navigate("/new"),
    onHelp: () => setHelpOpen(true),
    onNavigate: (path) => navigate(path),
  });

  return (
    <div className="app-shell">
      <WallLayer />
      {rail && (
        <DesktopRail
          compact={compact}
          onToggleWidth={() =>
            setRail(
              railPreference === "collapsed"
                ? "expanded"
                : railPreference === "expanded"
                  ? "collapsed"
                  : compact
                    ? "expanded"
                    : "collapsed",
            )
          }
          onShowShortcuts={() => setHelpOpen(true)}
        />
      )}
      <div className="app-main">{children}</div>
      <Sheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Raccourcis clavier"
      >
        <p className="mb-3 text-[14px] leading-[21px] text-muted">
          Actifs uniquement en bureau, et jamais pendant que vous écrivez.
        </p>
        <ul className="flex flex-col">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.label}
              className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[14.5px] last:border-0"
            >
              <span>{shortcut.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key, index) => (
                  <kbd key={index} className="kbd">
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fond « verre »                                                      */
/* ------------------------------------------------------------------ */

/**
 * Trois couches : l’image floutée, le voile qui protège le texte, le grain.
 * Aucune n’intercepte le clic, et l’ensemble reste sous l’interface (`z-0`).
 */
export function WallLayer() {
  const wallpaper = useAppStore((s) => s.settings.wallpaper);
  /* Les couleurs sont lues ici : la couche est montée partout (téléphone et
     bureau) et elle est déjà responsable du fond. Aucun autre composant ne
     peut donc oublier de le faire. */
  useWallPalette();
  /* Un identifiant inconnu (fond retiré d’une version à l’autre) ne doit pas
     laisser une image cassée derrière l’interface : on ne monte rien. */
  if (!wallpaper || !wallById(wallpaper)) return null;
  return (
    <div className="wall-layer" aria-hidden="true" data-wall-layer={wallpaper}>
      <div
        className="wall-image"
        style={{ backgroundImage: `url(${wallUrl(wallpaper)})` }}
      />
      <div className="wall-veil" />
      <div className="wall-grain" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rail de navigation                                                  */
/* ------------------------------------------------------------------ */

/* Les pages de l’espace de travail ne sont plus une constante : elles
   viennent des préférences (`/settings/navigation`), dans l’ordre choisi, et
   se réorganisent ici même d’un clic. La liste écrite en dur était la cause
   d’un écart réel entre le téléphone et le bureau. */
/* Une seule entrée. Apparence, Données, Corbeille, À propos, Progrès sont des
   **sections de Réglages**, pas des pages de travail : elles y sont rangées, et
   les répéter ici donnait deux fois la même chose à deux endroits. */
const SETTINGS = [{ to: "/settings", label: "Réglages", icon: Gear }] as const;

export function DesktopRail({
  compact = false,
  onToggleWidth,
  onShowShortcuts,
}: {
  /** rail étroit : icônes seulement (768–1023 px) */
  compact?: boolean;
  /** déplie ou replie la barre : la largeur choisie est mémorisée */
  onToggleWidth?: () => void;
  onShowShortcuts?: () => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cards = useContentStore((s) => s.cards);
  const settings = useAppStore((s) => s.settings);
  const setTheme = useAppStore((s) => s.setTheme);

  const due = dueCards(cards).length;
  const isDark = resolvedTheme(settings.theme) === "dark";

  /* Réorganisation en place : un clic sur une page la prend, un clic sur une
     autre la dépose devant. Pas de glisser-déposer invisible — le geste est
     celui qu’on décrit, et il fonctionne au clavier. */
  const navItems = useNavStore((state) => state.desktop);
  const moveNav = useNavStore((state) => state.move);
  const placeBeforeNav = useNavStore((state) => state.placeBefore);

  /* Déplacement à la poignée : on saisit les six points d’une page, on la fait
     glisser sur une autre, elle prend sa place. Aucun mode à activer, aucun
     panneau à ouvrir — le geste est le même que dans un tableur. */
  const [dragId, setDragId] = useState<NavId | null>(null);
  const [overId, setOverId] = useState<NavId | null>(null);
  const desktopNav = resolveItems(navItems);

  const finishDrag = () => {
    if (dragId && overId && dragId !== overId) {
      placeBeforeNav("desktop", dragId, overId);
    }
    setDragId(null);
    setOverId(null);
  };

  const isMain = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <aside
      className="rail"
      aria-label="Barre latérale"
      data-compact={compact ? "true" : "false"}
      /* Le relâchement est écouté sur toute la barre : une poignée lâchée
         entre deux lignes doit tout de même déposer la page. */
      onPointerUp={finishDrag}
      onPointerLeave={() => setOverId(null)}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-1 pt-4",
          compact ? "flex-col items-center gap-2 px-2" : "px-3",
        )}
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex min-w-0 items-center gap-2.5 rounded-rect px-1 py-1 text-left transition-colors hover:bg-surface-2"
        >
          <span className="brand-mark" aria-hidden="true">
            É
          </span>
          {compact ? (
            <span className="sr-only">Einnote — accueil</span>
          ) : (
            <span className="min-w-0">
              <span className="block truncate font-serif text-[17px] font-semibold leading-none">
                Einnote
              </span>
              <span className="mt-1.5 block truncate text-[12px] leading-none text-muted">
                Des notes qui font apprendre
              </span>
            </span>
          )}
        </button>
        {/* Deux commandes de la barre, jamais dans le menu : replier, et le
            thème. Le repli change la largeur du rail, pas son contenu — c’est
            un réglage d’affichage, donc il vit dans `settings.rail`. */}
        <div className={cn("flex shrink-0 items-center", compact ? "flex-col gap-1" : "gap-0.5")}>
          <button
            type="button"
            onClick={onToggleWidth}
            aria-label={compact ? "Déplier la barre latérale" : "Replier la barre latérale"}
            title={compact ? "Déplier" : "Replier"}
            aria-expanded={!compact}
            className="icon-btn h-9 w-9 shrink-0"
          >
            <SidebarSimple size={18} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Passer au thème clair" : "Passer au thème sombre"}
            title={isDark ? "Thème clair" : "Thème sombre"}
            className="icon-btn h-9 w-9 shrink-0"
          >
            {isDark ? (
              <Sun size={18} weight="bold" aria-hidden="true" />
            ) : (
              <Moon size={18} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Le bouton « Nouvelle note » a quitté le rail : la création passe par
          le bouton flottant, présent sur les mêmes pages, et un seul point
          d'entrée évite d'en chercher deux. */}

      <nav
        className={cn(
          "mt-5 flex-1 overflow-y-auto pb-2",
          compact ? "px-1.5" : "px-2",
        )}
        aria-label="Navigation du bureau"
      >
        <div className={cn("flex items-center", compact ? "justify-center" : "mt-5 justify-between pr-1")}>
          {!compact && <p className="rail-label">Espace</p>}
        </div>
        {compact && <div className="mx-2 my-3 h-px bg-line" aria-hidden="true" />}

        <div
          className="flex flex-col gap-0.5"
          onPointerUp={finishDrag}
          onPointerLeave={() => setOverId(null)}
        >
          {desktopNav.map((item, index) => (
            <div
              key={item.id}
              className="group relative"
              onPointerEnter={() => {
                if (dragId && dragId !== item.id) setOverId(item.id);
              }}
              onPointerMove={() => {
                if (dragId && dragId !== item.id && overId !== item.id) setOverId(item.id);
              }}
            >
              <RailItem
                compact={compact}
                icon={item.icon}
                label={item.label}
                badge={item.id === "review" && due > 0 ? due : undefined}
                active={isMain(item.to)}
                selected={dragId === item.id}
                outlined={Boolean(dragId)}
                onClick={() => {
                  /* Pendant un déplacement, cliquer ne navigue pas : on dépose. */
                  if (dragId) {
                    finishDrag();
                    return;
                  }
                  navigate(item.to);
                }}
                handle={
                  <button
                    type="button"
                    aria-label={`Déplacer ${item.label}`}
                    title="Glisser pour déplacer"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDragId(item.id);
                      setOverId(null);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        moveNav("desktop", item.id, -1);
                      }
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        moveNav("desktop", item.id, 1);
                      }
                    }}
                    className={cn(
                      "flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted transition-opacity",
                      "hover:bg-surface-2 hover:text-ink focus-visible:opacity-100 active:cursor-grabbing",
                      compact
                        ? "absolute right-0.5 top-0.5 h-4 w-4 opacity-0 group-hover:opacity-100"
                        : "h-7 w-6 opacity-30 group-hover:opacity-100",
                    )}
                  >
                    <DotsSixVertical size={13} weight="bold" aria-hidden />
                  </button>
                }
              />
              {overId === item.id && (
                <span
                  className="pointer-events-none absolute inset-x-1 -top-px h-0.5 rounded-full bg-accent"
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>

        {!compact && <p className="rail-label mt-5">Réglages</p>}
        {compact && <div className="mx-2 my-3 h-px bg-line" aria-hidden="true" />}
        <div className="flex flex-col gap-0.5">
          {SETTINGS.map((item) => (
            <RailItem
              key={item.to}
              compact={compact}
              icon={item.icon}
              label={item.label}
              active={pathname === item.to}
              onClick={() => navigate(item.to)}
            />
          ))}
        </div>
      </nav>

      <div className={cn("border-t border-line", compact ? "px-1.5 py-2" : "p-3")}>
        {compact ? (
          <button
            type="button"
            onClick={() => navigate(due > 0 ? "/review" : "/stats")}
            aria-label={
              due > 0 ? `${due} cartes à revoir — commencer la révision` : "Voir les statistiques"
            }
            title={due > 0 ? `${due} à revoir` : "Statistiques"}
            className="relative mx-auto flex h-11 w-11 items-center justify-center rounded-field bg-accent-soft text-accent-ink"
          >
            <ClockCounterClockwise size={19} weight="bold" aria-hidden />
            {due > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10.5px] font-bold text-on-accent">
                {due}
              </span>
            )}
          </button>
        ) : (
        <>
        <div className="rounded-card bg-accent-soft p-3.5">
          <p className="text-[15px] font-semibold leading-snug text-accent-ink">
            {due > 0
              ? `${due} carte${due > 1 ? "s" : ""} à revoir`
              : "Tout est à jour"}
          </p>
          <p className="mt-1 text-[13px] leading-[18px] text-accent-ink">
            {due > 0
              ? `Environ ${estimateMinutes(due)} minutes aujourd’hui`
              : "Vos prochaines cartes reviennent bientôt"}
          </p>
          <button
            type="button"
            onClick={() => navigate(due > 0 ? "/review" : "/stats")}
            className="mt-3 h-9 w-full rounded-rect bg-accent text-[14px] font-semibold text-on-accent transition-opacity active:opacity-90"
          >
            {due > 0 ? "Commencer la révision" : "Voir les statistiques"}
          </button>
        </div>
        <button
          type="button"
          onClick={onShowShortcuts}
          className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-rect px-2 py-1.5 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <span className="flex items-center gap-1.5">
            <Keyboard size={15} weight="bold" aria-hidden />
            Raccourcis
          </span>
          <kbd className="kbd">?</kbd>
        </button>
        <p className="mt-2.5 px-1 text-[12px] leading-[17px] text-muted">
          Tout reste sur cet appareil. Aucun compte.
        </p>
        </>
        )}
      </div>

    </aside>
  );
}

function RailItem({
  icon: Icon,
  label,
  badge,
  active,
  compact = false,
  selected = false,
  outlined = false,
  onClick,
  handle,
}: {
  icon: Icon;
  label: string;
  badge?: number;
  active: boolean;
  compact?: boolean;
  /** la page en cours de déplacement */
  selected?: boolean;
  /** affiche un contour pendant un déplacement */
  outlined?: boolean;
  onClick: () => void;
  /** poignée de déplacement, toujours en dernier dans l’entrée */
  handle?: ReactNode;
}) {
  return (
    /* Deux boutons frères, jamais imbriqués : le lien et la poignée. Un bouton
       dans un bouton est invalide et rend le clavier imprévisible. */
    <div
      data-active={active}
      className={cn(
        "group/row flex items-center rounded-rect transition-colors",
        compact ? "relative" : "gap-0.5 pr-1",
        active || selected
          ? "bg-accent-soft font-semibold text-accent-ink"
          : "text-ink hover:bg-surface-2",
        outlined && "border border-dashed border-line-strong",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        aria-pressed={selected || undefined}
        aria-label={compact ? label : undefined}
        title={compact ? label : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center rounded-rect text-[15px] transition-colors",
          compact ? "h-11 justify-center px-0" : "gap-3 px-3 py-2.5",
        )}
      >
        <Icon
          size={20}
          weight={active ? "fill" : "regular"}
          aria-hidden="true"
          className={active ? "text-accent" : "text-muted"}
        />
        {compact ? (
          <span className="sr-only">{label}</span>
        ) : (
          <span className="flex-1 truncate text-left">{label}</span>
        )}
        {badge !== undefined &&
          !compact && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-on-accent">
              {badge}
            </span>
          )}
      </button>

      {badge !== undefined && compact && (
        <span className="pointer-events-none absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9.5px] font-bold leading-none text-on-accent">
          {badge}
        </span>
      )}

      {handle}
    </div>
  );
}
