import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Books,
  ChartLineUp,
  ClockCounterClockwise,
  FolderSimple,
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
import { useIsDesktop } from "@/lib/useMediaQuery";
import { ProjectsSheet } from "@/components/ProjectSwitcher";
import { useProjects } from "@/lib/useProjects";
import { wallById, wallUrl } from "@/lib/walls";
import {
  FOCUS_SEARCH_EVENT,
  SHORTCUTS,
  useDesktopShortcuts,
} from "@/lib/useDesktopShortcuts";
import { Sheet } from "@/components/Layout";
import { Keyboard } from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/* Coquille bureau : rail + colonne de contenu                         */
/* ------------------------------------------------------------------ */

export function AppShell({ children }: { children: ReactNode }) {
  const desktop = useIsDesktop();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

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
      {desktop && <DesktopRail onShowShortcuts={() => setHelpOpen(true)} />}
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

const MAIN = [
  { to: "/", label: "Notes", icon: House },
  { to: "/projects", label: "Projets", icon: FolderSimple },
  { to: "/vaults", label: "Coffres", icon: Books },
  { to: "/review", label: "Réviser", icon: ClockCounterClockwise },
  { to: "/learn", label: "Apprendre", icon: GraduationCap },
] as const;

const SETTINGS = [
  { to: "/settings/appearance", label: "Apparence", icon: PaintBrush },
  { to: "/preview", label: "Aperçu bureau", icon: MonitorPlay },
  { to: "/settings/data", label: "Données", icon: Database },
  { to: "/settings/progress", label: "Progrès", icon: ChartLineUp },
  { to: "/settings/trash", label: "Corbeille", icon: Trash },
  { to: "/settings/about", label: "À propos", icon: Info },
] as const;

export function DesktopRail({ onShowShortcuts }: { onShowShortcuts?: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const cards = useContentStore((s) => s.cards);
  const settings = useAppStore((s) => s.settings);
  const setTheme = useAppStore((s) => s.setTheme);

  const due = dueCards(cards).length;
  const isDark = resolvedTheme(settings.theme) === "dark";
  const { projects, counts, activeProjectId, setActiveProject } = useProjects();
  const [projectsOpen, setProjectsOpen] = useState(false);

  const isMain = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <aside className="rail" aria-label="Barre latérale">
      <div className="flex items-start justify-between gap-1 px-3 pt-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex min-w-0 items-center gap-2.5 rounded-rect px-1 py-1 text-left transition-colors hover:bg-surface-2"
        >
          <span className="brand-mark" aria-hidden="true">
            É
          </span>
          <span className="min-w-0">
            <span className="block truncate font-serif text-[17px] font-semibold leading-none">
              Engram
            </span>
            <span className="mt-1.5 block truncate text-[12px] leading-none text-muted">
              Des notes qui font apprendre
            </span>
          </span>
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

      <button
        type="button"
        onClick={() => navigate("/new")}
        className="btn-primary mx-3 mt-4 h-11 justify-start px-4 text-[15px]"
      >
        <Plus size={18} weight="bold" aria-hidden="true" />
        Nouvelle note
      </button>

      <nav className="mt-5 flex-1 overflow-y-auto px-2 pb-2" aria-label="Navigation du bureau">
        <div className="mb-1 flex items-center justify-between pr-1">
          <p className="rail-label">Projets</p>
          <button
            type="button"
            onClick={() => setProjectsOpen(true)}
            className="mb-1.5 flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-semibold text-accent hover:bg-surface-2"
          >
            <FolderPlus size={13} weight="bold" aria-hidden />
            Gérer
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          <RailItem
            icon={Stack}
            label="Tous les projets"
            active={activeProjectId === null}
            onClick={() => setActiveProject(null)}
          />
          {projects.map((project) => (
            <RailItem
              key={project.id}
              icon={FolderSimple}
              label={project.name}
              badge={counts.get(project.id)}
              active={activeProjectId === project.id}
              onClick={() => setActiveProject(project.id)}
            />
          ))}
        </div>

        <p className="rail-label mt-5">Espace</p>
        <div className="flex flex-col gap-0.5">
          {MAIN.map((item) => (
            <RailItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              badge={item.to === "/review" && due > 0 ? due : undefined}
              active={isMain(item.to)}
              onClick={() => navigate(item.to)}
            />
          ))}
        </div>

        <p className="rail-label mt-5">Réglages</p>
        <div className="flex flex-col gap-0.5">
          {SETTINGS.map((item) => (
            <RailItem
              key={item.to}
              icon={item.icon}
              label={item.label}
              active={pathname === item.to}
              onClick={() => navigate(item.to)}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-line p-3">
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
  onClick,
}: {
  icon: typeof House;
  label: string;
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
      className={cn(
        "flex w-full items-center gap-3 rounded-rect px-3 py-2.5 text-[15px] transition-colors",
        active
          ? "bg-accent-soft font-semibold text-accent-ink"
          : "text-ink hover:bg-surface-2",
      )}
    >
      <Icon
        size={20}
        weight={active ? "fill" : "regular"}
        aria-hidden="true"
        className={active ? "text-accent" : "text-muted"}
      />
      <span className="flex-1 truncate text-left">{label}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-on-accent">
          {badge}
        </span>
      )}
    </button>
  );
}
