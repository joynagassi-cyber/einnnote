import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FolderSimple,
  FolderPlus,
  NotePencil,
  SquaresFour,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen } from "@/components/Layout";
import { DisplayMenu } from "@/components/DisplayMenu";
import { ProjectsSheet } from "@/components/ProjectSwitcher";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { useSurfacePrefs } from "@/stores/useDisplayStore";
import { useIsDesktop } from "@/lib/useMediaQuery";
import {
  activePrefCount,
  columnsFor,
  gridStyle,
  groupItems,
  sortItems,
  DEFAULT_PREFS,
  type DisplayFields,
} from "@/lib/display";
import { dueCards } from "@/lib/scheduler";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Projets — l’écran qui manquait entre la bibliothèque et les réglages.
 *
 * Même menu d’affichage que la bibliothèque : grille ou liste, nombre de
 * colonnes, regroupement (activité, taille) et tri à deux niveaux. Un projet
 * n’est pas un dossier : il porte un compteur réel de notes, de cartes et
 * d’échéances, calculé à l’affichage.
 */

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  notes: number;
  cards: number;
  due: number;
  updatedAt: string;
  createdAt: string;
}

const DAY = 24 * 3600_000;

export default function Projects() {
  const navigate = useNavigate();
  const projects = useContentStore((s) => s.projects);
  const notes = useContentStore((s) => s.notes);
  const cards = useContentStore((s) => s.cards);
  const questions = useContentStore((s) => s.questions);
  const setActiveProject = useAppStore((s) => s.setActiveProject);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const { prefs: display } = useSurfacePrefs("projects");
  const desktop = useIsDesktop();
  const [sheetOpen, setSheetOpen] = useState(false);

  const rows: ProjectRow[] = useMemo(() => {
    const due = dueCards(cards);
    return projects.map((project) => {
      const owned = notes.filter(
        (note) => note.projectId === project.id && !note.deletedAt,
      );
      const noteIds = new Set(owned.map((note) => note.id));
      const cardCount = cards.filter((card) => noteIds.has(card.noteId)).length;
      const dueCount = due.filter((card) => noteIds.has(card.noteId)).length;
      const updatedAt = owned
        .map((note) => note.updatedAt)
        .sort()
        .pop();
      return {
        id: project.id,
        name: project.name,
        description: project.description ?? "",
        notes: owned.length,
        cards: cardCount,
        due: dueCount,
        updatedAt: updatedAt ?? project.createdAt,
        createdAt: project.createdAt,
      };
    });
  }, [projects, notes, cards]);

  const fields: DisplayFields<ProjectRow> = useMemo(
    () => ({
      name: { label: "Nom", value: (row) => row.name },
      notes: { label: "Nombre de notes", value: (row) => row.notes, type: "number" },
      cards: { label: "Cartes", value: (row) => row.cards, type: "number" },
      due: { label: "À revoir", value: (row) => row.due, type: "number" },
      updated: { label: "Modifié", value: (row) => row.updatedAt, type: "date" },
      created: { label: "Créé", value: (row) => row.createdAt, type: "date" },
      activity: {
        label: "Activité",
        value: (row) => {
          const age = Date.now() - new Date(row.updatedAt).getTime();
          if (age < DAY) return "Aujourd’hui";
          if (age < 7 * DAY) return "Cette semaine";
          if (age < 30 * DAY) return "Ce mois";
          return "Plus ancien";
        },
      },
      size: {
        label: "Taille",
        value: (row) =>
          row.notes === 0
            ? "Vide"
            : row.notes < 3
              ? "Petit"
              : row.notes < 8
                ? "Moyen"
                : "Grand",
      },
    }),
    [],
  );

  const ordered = useMemo(
    () => sortItems(rows, fields, [display.sortBy, display.thenBy]),
    [rows, fields, display.sortBy, display.thenBy],
  );
  const groups = useMemo(
    () => groupItems(ordered, fields, display.groupBy),
    [ordered, fields, display.groupBy],
  );

  /* Un projet a désormais sa page : on y va. « Filtrer » reste une action
     explicite de cette page, au lieu d’être un effet de bord du clic. */
  const open = (id: string) => {
    setActiveProject(id);
    navigate(`/projects/${id}`);
  };

  const columns = columnsFor(display, {
    fallback: desktop ? 3 : 2,
    min: 1,
    max: 4,
  });

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <AppBar
        back
        onBack={() => navigate("/")}
        action={
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="pill h-9 px-3 text-[13px]"
          >
            <FolderPlus size={15} weight="bold" aria-hidden />
            Gérer
          </button>
        }
      />

      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-[30px] font-semibold leading-tight">
            Projets
          </h1>
          <p className="mt-1 max-w-[52ch] text-[13.5px] leading-[20px] text-muted">
            Le projet <strong className="text-ink">range</strong> : il contient des
            notes et des coffres. Une note ne peut pas appartenir à deux projets —
            c’est ce qui évite de la chercher ailleurs.{" "}
            <button
              type="button"
              onClick={() => navigate("/spaces")}
              className="font-semibold text-accent"
            >
              Comprendre la structure
            </button>
          </p>
        </div>
        <DisplayMenu
          surface="projects"
          columns={{
            min: 1,
            max: 4,
            fallback: desktop ? 3 : 2,
            autoHint: "Automatique : 2 sur téléphone, 3 en bureau.",
          }}
          groupOptions={[
            { value: "activity", label: "Activité" },
            { value: "size", label: "Taille" },
            { value: "due", label: "À revoir" },
          ]}
          sortOptions={[
            { value: "updated", label: "Modifié récemment" },
            { value: "name", label: "Nom A → Z" },
            { value: "notes", label: "Nombre de notes" },
            { value: "cards", label: "Nombre de cartes" },
            { value: "due", label: "Cartes à revoir" },
            { value: "created", label: "Date de création" },
          ]}
        />
      </div>

      <button
        type="button"
        onClick={() => setActiveProject(null)}
        className={cn(
          "mt-4 flex w-full items-center gap-3 rounded-card border p-3.5 text-left",
          activeProjectId === null
            ? "border-accent bg-accent-soft"
            : "border-line bg-surface",
        )}
      >
        <span className="tile" aria-hidden>
          <SquaresFour size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Tous les projets</span>
          <span className="block text-[13px] text-muted">
            {rows.reduce((total, row) => total + row.notes, 0)} notes ·{" "}
            {rows.reduce((total, row) => total + row.due, 0)} cartes à revoir
          </span>
        </span>
        <ArrowRight size={18} className="shrink-0 text-muted" aria-hidden />
      </button>

      {groups.map((group) => (
        <section key={group.key} className="mt-4">
          {group.label && (
            <h2 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
              {group.label}
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                {group.items.length}
              </span>
            </h2>
          )}
          <ul
            className={cn(
              display.view === "grid"
                ? "grid items-stretch gap-2.5"
                : "flex flex-col gap-2",
            )}
            style={display.view === "grid" ? gridStyle(columns) : undefined}
          >
            {group.items.map((row) => (
              <li key={row.id} className="h-full">
                <button
                  type="button"
                  onClick={() => open(row.id)}
                  className={cn(
                    "flex h-full w-full flex-col rounded-card border border-line bg-surface p-3.5 text-left transition-colors hover:border-line-strong active:bg-surface-2",
                    activeProjectId === row.id && "border-accent",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <FolderSimple
                      size={17}
                      weight="duotone"
                      className="shrink-0 text-accent"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                      {row.name}
                    </span>
                  </span>
                  {row.description && (
                    <span className="mt-1 line-clamp-2 text-[12.5px] leading-[18px] text-muted">
                      {row.description}
                    </span>
                  )}
                  <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium">
                      {row.notes} note{row.notes > 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium">
                      {row.cards} carte{row.cards > 1 ? "s" : ""}
                    </span>
                    {row.due > 0 && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent-ink">
                        {row.due} à revoir
                      </span>
                    )}
                  </span>
                  <span className="mt-2 text-[11.5px] text-muted">
                    modifié {timeAgo(row.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {rows.length === 0 && (
        <EmptyState
          icon={NotePencil}
          title="Aucun projet"
          description="Un projet rassemble des notes et des coffres. Créez-en un pour séparer deux travaux."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setSheetOpen(true)}
            >
              <FolderPlus size={18} weight="bold" /> Nouveau projet
            </button>
          }
        />
      )}

      <p className="mt-5 text-[12.5px] leading-[18px] text-muted">
        {activePrefCount(display, DEFAULT_PREFS) > 0
          ? `${activePrefCount(display, DEFAULT_PREFS)} réglage(s) d’affichage actifs sur cet écran.`
          : "Affichage par défaut : grille à deux colonnes, tri par modification."}
      </p>

      <div className="h-24" aria-hidden />

      <ProjectsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </Screen>
  );
}
