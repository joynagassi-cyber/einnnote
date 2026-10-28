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
import { ProjectsSheet } from "@/components/ProjectSwitcher";
import { useProjects } from "@/lib/useProjects";
import { wallById, wallUrl } from "@/lib/walls";
import { useWallPalette } from "@/lib/useWallPalette";
import {
  FOCUS_SEARCH_EVENT,
  SHORTCUTS,
  useDesktopShortcuts,
} from "@/lib/useDesktopShortcuts";
import { Sheet } from "@/components/Layout";
import {
  ArrowDown,
  ArrowUp,
  Check,
  DotsSixVertical,
  Keyboard,
  SlidersHorizontal,
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
  const compact = useCompactRail();
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
const SETTINGS = [
  { to: "/settings", label: "Tous les réglages", icon: Gear },
  { to: "/settings/appearance", label: "Apparence", icon: PaintBrush },
  { to: "/preview", label: "Aperçu bureau", icon: MonitorPlay },
  { to: "/settings/data", label: "Données", icon: Database },
  { to: "/settings/progress", label: "Progrès", icon: ChartLineUp },
  { to: "/settings/trash", label: "Corbeille", icon: Trash },
  { to: "/settings/about", label: "À propos", icon: Info },
] as const;

export function DesktopRail({
  compact = false,
  onShowShortcuts,
}: {
  /** rail étroit : icônes seulement (768–1023 px) */
  compact?: boolean;
  onShowShortcuts?: () => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cards = useContentStore((s) => s.cards);
  const settings = useAppStore((s) => s.settings);
  const setTheme = useAppStore((s) => s.setTheme);

  const due = dueCards(cards).length;
  const isDark = resolvedTheme(settings.theme) === "dark";
  const { projects, counts, activeProjectId, setActiveProject } = useProjects();
  const [projectsOpen, setProjectsOpen] = useState(false);

  /* Réorganisation en place : un clic sur une page la prend, un clic sur une
     autre la dépose devant. Pas de glisser-déposer invisible — le geste est
     celui qu’on décrit, et il fonctionne au clavier. */
  const navItems = useNavStore((state) => state.desktop);
  const moveNav = useNavStore((state) => state.move);
  const placeBeforeNav = useNavStore((state) => state.placeBefore);
  const [reordering, setReordering] = useState(false);
  const [picked, setPicked] = useState<NavId | null>(null);
  const desktopNav = resolveItems(navItems);

  const isMain = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <aside
      className="rail"
      aria-label="Barre latérale"
      data-compact={compact ? "true" : "false"}
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
            <span className="sr-only">Engram — accueil</span>
          ) : (
            <span className="min-w-0">
              <span className="block truncate font-serif text-[17px] font-semibold leading-none">
                Engram
              </span>
              <span className="mt-1.5 block truncate text-[12px] leading-none text-muted">
                Des notes qui font apprendre
              </span>
            </span>
          )}
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
        <div className={cn("mb-1 flex items-center", compact ? "justify-center" : "justify-between pr-1")}>
          {!compact && <p className="rail-label">Espaces</p>}
          <button
            type="button"
            onClick={() => setProjectsOpen(true)}
            aria-label="Gérer les projets"
            title="Gérer les projets"
            className={cn(
              "flex items-center gap-1 rounded-md text-[11.5px] font-semibold text-accent hover:bg-surface-2",
              compact ? "h-8 w-8 justify-center" : "mb-1.5 h-6 px-1.5",
            )}
          >
            <FolderPlus size={15} weight="bold" aria-hidden />
            {!compact && "Gérer"}
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          <RailItem
            compact={compact}
            icon={Stack}
            label="Tous les projets"
            active={activeProjectId === null}
            onClick={() => setActiveProject(null)}
          />
          {projects.map((project) => (
            <RailItem
              key={project.id}
              compact={compact}
              icon={FolderSimple}
              label={project.name}
              badge={counts.get(project.id)}
              active={activeProjectId === project.id}
              onClick={() => setActiveProject(project.id)}
            />
          ))}
        </div>

        <div className={cn("flex items-center", compact ? "justify-center" : "mt-5 justify-between pr-1")}>
          {!compact && <p className="rail-label">Espace</p>}
          <button
            type="button"
            onClick={() => {
              setReordering((value) => !value);
              setPicked(null);
            }}
            aria-pressed={reordering}
            aria-label={reordering ? "Terminer la réorganisation" : "Réorganiser les pages"}
            title={reordering ? "Terminer" : "Réorganiser les pages"}
            className={cn(
              "flex items-center gap-1 rounded-md text-[11.5px] font-semibold text-accent hover:bg-surface-2",
              compact ? "h-8 w-8 justify-center" : "mb-1.5 h-6 px-1.5",
            )}
          >
            {reordering ? <Check size={15} weight="bold" aria-hidden /> : <DotsSixVertical size={15} weight="bold" aria-hidden />}
            {!compact && (reordering ? "Terminé" : "Ordre")}
          </button>
        </div>
        {compact && <div className="mx-2 my-3 h-px bg-line" aria-hidden="true" />}

        {reordering && !compact && (
          <p className="mb-1.5 rounded-rect bg-accent-soft px-2 py-1.5 text-[11.5px] font-medium leading-[16px] text-accent-ink">
            {picked
              ? "Touchez la page devant laquelle la placer."
              : "Touchez la page à déplacer."}
          </p>
        )}

        <div className="flex flex-col gap-0.5">
          {desktopNav.map((item, index) => (
            <div key={item.id} className="relative">
              <RailItem
                compact={compact}
                icon={item.icon}
                label={item.label}
                badge={item.id === "review" && due > 0 ? due : undefined}
                active={!reordering && isMain(item.to)}
                selected={picked === item.id}
                outlined={reordering}
                onClick={() => {
                  if (!reordering) {
                    navigate(item.to);
                    return;
                  }
                  if (!picked) {
                    setPicked(item.id);
                    return;
                  }
                  if (picked === item.id) {
                    setPicked(null);
                    return;
                  }
                  placeBeforeNav("desktop", picked, item.id);
                  setPicked(null);
                }}
              />
              {reordering && (
                <div className="absolute right-1 top-1 flex gap-0.5">
                  <button
                    type="button"
                    aria-label={`Monter ${item.label}`}
                    disabled={index === 0}
                    onClick={() => moveNav("desktop", item.id, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface text-muted disabled:opacity-30"
                  >
                    <ArrowUp size={12} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Descendre ${item.label}`}
                    disabled={index === desktopNav.length - 1}
                    onClick={() => moveNav("desktop", item.id, 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface text-muted disabled:opacity-30"
                  >
                    <ArrowDown size={12} weight="bold" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate("/settings/navigation")}
          className={cn(
            "mt-1.5 flex w-full items-center gap-1.5 rounded-md py-1.5 text-[11.5px] font-medium text-muted hover:bg-surface-2 hover:text-ink",
            compact ? "justify-center" : "px-1.5",
          )}
          aria-label="Choisir les pages du rail"
        >
          <SlidersHorizontal size={13} weight="bold" aria-hidden />
          {!compact && "Choisir les pages"}
        </button>

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
            onClick={() => navigate(due > 0 ? "/review" : "/settings/progress")}
            aria-label={
              due > 0 ? `${due} cartes à revoir — commencer la révision` : "Voir le progrès"
            }
            title={due > 0 ? `${due} à revoir` : "Progrès"}
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
            onClick={() => navigate(due > 0 ? "/review" : "/settings/progress")}
            className="mt-3 h-9 w-full rounded-rect bg-accent text-[14px] font-semibold text-on-accent transition-opacity active:opacity-90"
          >
            {due > 0 ? "Commencer la révision" : "Voir le progrès"}
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

      <ProjectsSheet open={projectsOpen} onClose={() => setProjectsOpen(false)} />
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
}: {
  icon: Icon;
  label: string;
  badge?: number;
  active: boolean;
  compact?: boolean;
  /** la page en cours de déplacement, pendant la réorganisation */
  selected?: boolean;
  /** affiche un contour quand la réorganisation est active */
  outlined?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      aria-current={active ? "page" : undefined}
      aria-pressed={selected || undefined}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={cn(
        "flex w-full items-center rounded-rect text-[15px] transition-colors",
        compact
          ? "relative h-11 justify-center px-0"
          : "gap-3 px-3 py-2.5",
        active || selected
          ? "bg-accent-soft font-semibold text-accent-ink"
          : "text-ink hover:bg-surface-2",
        outlined && "border border-dashed border-line-strong",
        outlined && !compact && "pr-14",
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
        (compact ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9.5px] font-bold leading-none text-on-accent">
            {badge}
          </span>
        ) : (
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-on-accent">
            {badge}
          </span>
        ))}
    </button>
  );
}
