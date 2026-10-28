import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Books,
  ClockCounterClockwise,
  NotePencil,
  Plus,
  SquaresFour,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen, Sheet } from "@/components/Layout";
import { DisplayMenu } from "@/components/DisplayMenu";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { useSurfacePrefs } from "@/stores/useDisplayStore";
import { useToast } from "@/stores/useToast";
import { useProjects } from "@/lib/useProjects";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { METHODS } from "@/lib/methods";
import { dueCards } from "@/lib/scheduler";
import { timeAgo } from "@/lib/time";
import {
  columnsFor,
  gridStyle,
  groupItems,
  sortItems,
  type DisplayFields,
} from "@/lib/display";
import { noteBody } from "@/lib/libraryFilters";
import { cn } from "@/lib/utils";
import type { Note } from "@/types";

/**
 * Projet — la page de détail qui manquait.
 *
 * Cliquer un projet ne faisait que changer un filtre puis renvoyer à la
 * bibliothèque : impossible de voir ce que contient un projet, ses coffres,
 * ou d’y écrire directement. Ici : le contenu, les chiffres, les coffres et
 * les actions au même endroit.
 */

interface ProjectNoteRow {
  note: Note;
  due: number;
  questions: number;
}

export default function ProjectDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast((s) => s.show);
  const desktop = useIsDesktop();

  const projects = useContentStore((s) => s.projects);
  const notes = useContentStore((s) => s.notes);
  const cards = useContentStore((s) => s.cards);
  const questions = useContentStore((s) => s.questions);
  const vaults = useContentStore((s) => s.vaults);
  const zettel = useContentStore((s) => s.zettel);
  const mindmaps = useContentStore((s) => s.mindmaps);

  const setActiveProject = useAppStore((s) => s.setActiveProject);
  const { renameProject, deleteProject } = useProjects();

  const { prefs: display } = useSurfacePrefs("project");
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [confirming, setConfirming] = useState(false);

  const project = projects.find((item) => item.id === id);

  const owned: ProjectNoteRow[] = useMemo(() => {
    const due = dueCards(cards);
    return notes
      .filter((note) => note.projectId === id && !note.deletedAt)
      .map((note) => {
        const noteCards = cards.filter((card) => card.noteId === note.id);
        return {
          note,
          due: due.filter((card) => card.noteId === note.id).length,
          questions: questions.filter((q) => q.noteId === note.id).length,
          _cards: noteCards.length,
        } as ProjectNoteRow;
      });
  }, [notes, cards, questions, id]);

  const projectVaults = useMemo(
    () => vaults.filter((vault) => vault.projectId === id),
    [vaults, id],
  );

  const fields: DisplayFields<ProjectNoteRow> = useMemo(
    () => ({
      updated: { label: "Modifié", value: (row) => row.note.updatedAt, type: "date" },
      created: { label: "Créé", value: (row) => row.note.createdAt, type: "date" },
      title: { label: "Titre", value: (row) => row.note.title },
      method: { label: "Méthode", value: (row) => METHODS[row.note.method].label },
      collection: { label: "Collection", value: (row) => row.note.collection },
      due: { label: "Cartes à revoir", value: (row) => row.due, type: "number" },
      questions: { label: "Questions", value: (row) => row.questions, type: "number" },
    }),
    [],
  );

  const groups = useMemo(() => {
    const ordered = sortItems(owned, fields, [display.sortBy, display.thenBy]);
    return groupItems(ordered, fields, display.groupBy);
  }, [owned, fields, display.sortBy, display.thenBy, display.groupBy]);

  const columns = columnsFor(display, { fallback: desktop ? 3 : 2, min: 1, max: 4 });
  const totalCards = owned.reduce((total, row) => total + row.due, 0);

  if (!project) {
    return (
      <Screen className="px-5">
        <AppBar back onBack={() => navigate("/projects")} />
        <EmptyState
          icon={SquaresFour}
          title="Projet introuvable"
          description="Ce projet a été supprimé ou renommé."
          action={
            <button className="btn-primary" onClick={() => navigate("/projects")}>
              Voir les projets
            </button>
          }
        />
      </Screen>
    );
  }

  const openNote = (note: Note) => {
    if (note.method === "mindmap" && note.mindmapId) navigate(`/mindmap/${note.mindmapId}`);
    else if (note.method === "zettelkasten" && note.vaultId) navigate(`/vault/${note.vaultId}`);
    else navigate(`/note/${note.id}`);
  };

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <AppBar
        back
        onBack={() => navigate("/projects")}
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveProject(project.id);
                navigate("/");
              }}
              className="pill h-9 px-3 text-[13px]"
            >
              <SquaresFour size={15} aria-hidden />
              Filtrer
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(`/review/session?scope=project&id=${project.id}&mode=all`)
              }
              className="pill h-9 px-3 text-[13px]"
            >
              <ClockCounterClockwise size={15} aria-hidden />
              Réviser
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveProject(project.id);
                navigate("/new");
              }}
              className="btn-primary h-9 px-3 text-[13px]"
            >
              <Plus size={15} weight="bold" aria-hidden />
              Note
            </button>
          </div>
        }
      />

      <header className="mt-1">
        {renaming ? (
          <div className="flex items-center gap-2">
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              aria-label="Nom du projet"
              className="field h-11 font-serif text-[22px] font-semibold"
              autoFocus
            />
            <button
              type="button"
              className="btn-primary h-11 px-3"
              onClick={() => {
                renameProject(project.id, draftName);
                setRenaming(false);
                toast("Projet renommé", "accent");
              }}
            >
              OK
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraftName(project.name);
              setRenaming(true);
            }}
            className="text-left"
          >
            <h1 className="font-serif text-[30px] font-semibold leading-tight">
              {project.name}
            </h1>
            <span className="text-[12.5px] text-muted">Renommer</span>
          </button>
        )}
        {project.description && (
          <p className="mt-1 text-[13.5px] leading-[20px] text-muted">
            {project.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">
            {owned.length} note{owned.length > 1 ? "s" : ""}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">
            {projectVaults.length} coffre{projectVaults.length > 1 ? "s" : ""}
          </span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">
            {owned.reduce((total, row) => total + row.questions, 0)} question
            {owned.reduce((total, row) => total + row.questions, 0) > 1 ? "s" : ""}
          </span>
          {totalCards > 0 && (
            <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent-ink">
              {totalCards} à revoir
            </span>
          )}
          <span className="text-muted">créé {timeAgo(project.createdAt)}</span>
        </div>
      </header>

      {/* Coffres du projet */}
      <section className="mt-5" aria-label="Coffres du projet">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
            <Books size={14} weight="duotone" aria-hidden />
            Coffres
          </h2>
          <button
            type="button"
            onClick={() => navigate("/vaults")}
            className="text-[12.5px] font-semibold text-accent hover:underline"
          >
            Gérer
          </button>
        </div>
        {projectVaults.length === 0 ? (
          <p className="rounded-card border border-line bg-surface px-3.5 py-3 text-[13px] text-muted">
            Aucun coffre dans ce projet. Un coffre garde des fiches atomiques
            («&nbsp;
            <button
              type="button"
              className="font-semibold text-accent hover:underline"
              onClick={() => navigate("/vaults")}
            >
              créer un coffre
            </button>
            &nbsp;»).
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {projectVaults.map((vault) => {
              const count = zettel.filter((card) => card.vaultId === vault.id).length;
              return (
                <li key={vault.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/vault/${vault.id}`)}
                    className="flex h-10 items-center gap-2 rounded-field border border-line bg-surface px-3 text-[13.5px] font-medium hover:border-line-strong"
                  >
                    <Books size={15} className="text-accent" aria-hidden />
                    {vault.name}
                    <span className="rounded-full bg-surface-2 px-1.5 text-[11.5px] text-muted">
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Notes du projet */}
      <section className="mt-5" aria-label="Notes du projet">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">
            Notes
          </h2>
          <DisplayMenu
            surface="project"
            columns={{ min: 1, max: 4, fallback: desktop ? 3 : 2, autoHint: "Automatique : 2 sur téléphone, 3 en bureau." }}
            groupOptions={[
              { value: "method", label: "Méthode" },
              { value: "collection", label: "Collection" },
              { value: "due", label: "À revoir" },
            ]}
            sortOptions={[
              { value: "updated", label: "Modifié récemment" },
              { value: "title", label: "Titre A → Z" },
              { value: "created", label: "Date de création" },
              { value: "due", label: "Cartes à revoir" },
              { value: "questions", label: "Nombre de questions" },
              { value: "method", label: "Méthode" },
            ]}
          />
        </div>

        {owned.length === 0 ? (
          <EmptyState
            icon={NotePencil}
            title="Projet vide"
            description="Écrivez la première note de ce projet : elle n’apparaîtra que dans cet espace."
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setActiveProject(project.id);
                  navigate("/new");
                }}
              >
                <Plus size={18} weight="bold" /> Nouvelle note
              </button>
            }
          />
        ) : (
          groups.map((group) => (
            <div key={group.key} className="mb-3">
              {group.label && (
                <h3 className="mb-1.5 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                  {group.label}
                  <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-bold">
                    {group.items.length}
                  </span>
                </h3>
              )}
              <ul
                className={display.view === "grid" ? "grid items-stretch gap-2.5" : "flex flex-col gap-2"}
                style={display.view === "grid" ? gridStyle(columns) : undefined}
              >
                {group.items.map(({ note, due, questions: qCount }) => {
                  const Icon = METHODS[note.method].icon;
                  return (
                    <li key={note.id} className="h-full">
                      <button
                        type="button"
                        onClick={() => openNote(note)}
                        aria-label={`Ouvrir « ${note.title} »`}
                        className={cn(
                          "flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-surface text-left transition-colors hover:border-line-strong",
                          display.view === "list" && "flex-row items-center gap-3 p-3",
                        )}
                      >
                        {display.view === "list" ? (
                          <>
                            <span className="tile h-9 w-9" aria-hidden>
                              <Icon size={18} weight="duotone" className="text-accent" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-serif text-[15.5px] font-semibold">
                                {note.title}
                              </span>
                              <span className="block truncate text-[12.5px] text-muted">
                                {METHODS[note.method].label} · {note.collection}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11.5px] text-muted">
                              {due > 0 ? `${due} à revoir` : `modifié ${timeAgo(note.updatedAt)}`}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5 border-b border-line px-3 py-2">
                              <Icon size={15} weight="duotone" className="text-accent" aria-hidden />
                              <span className="truncate text-[11.5px] font-semibold text-accent-ink">
                                {METHODS[note.method].label}
                              </span>
                              <span className="ml-auto shrink-0 text-[11px] text-muted">
                                {qCount > 0 ? `${qCount} Q` : ""}
                              </span>
                            </span>
                            <span className="flex flex-1 flex-col gap-1 px-3 pb-2.5 pt-2.5">
                              <span className="line-clamp-2 font-serif text-[15px] font-semibold leading-[21px]">
                                {note.title}
                              </span>
                              <span className="line-clamp-2 text-[12.5px] leading-[18px] text-muted">
                                {noteBody(note, {
                                  notes,
                                  mindmaps,
                                  zettel,
                                  questions,
                                  cards,
                                  vaults,
                                }).replace(/\s+/g, " ").trim() || "Note vide."}
                              </span>
                            </span>
                            <span className="px-3 pb-2.5 text-[11px] text-muted">
                              {due > 0 ? `${due} carte${due > 1 ? "s" : ""} à revoir` : `modifié ${timeAgo(note.updatedAt)}`}
                            </span>
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </section>

      <div className="mt-6 rounded-card border border-line bg-surface p-3.5">
        <p className="text-[13px] leading-[19px] text-muted">
          Supprimer un projet ne supprime pas ses notes : elles restent dans la
          bibliothèque et peuvent être rattachées ailleurs.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-2 text-[13px] font-semibold text-danger hover:underline"
        >
          Supprimer ce projet
        </button>
      </div>

      <div className="h-24" aria-hidden />

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Supprimer ce projet ?"
      >
        <p className="text-[15px] leading-[22px] text-muted">
          « {project.name} » contient {owned.length} note
          {owned.length > 1 ? "s" : ""}. Un projet non vide ne peut pas être
          supprimé : déplacez d’abord ses notes.
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => setConfirming(false)}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-danger flex-1"
            onClick={() => {
              const result = deleteProject(project.id);
              setConfirming(false);
              if (result.ok) {
                toast("Projet supprimé");
                navigate("/projects");
              } else {
                toast(result.reason ?? "Suppression impossible");
              }
            }}
          >
            Supprimer
          </button>
        </div>
      </Sheet>

      <button
        type="button"
        aria-label="Retour aux projets"
        onClick={() => navigate("/projects")}
        className="mt-2 hidden items-center gap-1 text-[13px] text-muted lg:flex"
      >
        <ArrowLeft size={14} aria-hidden /> Tous les projets
      </button>
    </Screen>
  );
}
