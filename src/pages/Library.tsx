import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CaretRight,
  Eye,
  Faders,
  MagnifyingGlass,
  NotePencil,
  X,
} from "@phosphor-icons/react";
import { EmptyState, Screen, Sheet } from "@/components/Layout";
import { useContentStore, noteText } from "@/stores/useContentStore";
import { useLibraryFilters } from "@/stores/useLibraryFilters";
import { useAppStore } from "@/stores/useAppStore";
import { BackupReminder } from "@/components/StorageGuard";
import { ReviewReminder } from "@/components/ReviewReminder";
import { NotePreview } from "@/components/NotePreview";
import { ProjectsSheet } from "@/components/ProjectSwitcher";
import { DisplayMenu } from "@/components/DisplayMenu";
import {
  columnsFor,
  gridStyle,
  groupItems,
  sortItems,
  type DisplayFields,
} from "@/lib/display";
import { useSurfacePrefs } from "@/stores/useDisplayStore";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { FOCUS_SEARCH_EVENT } from "@/lib/useDesktopShortcuts";
import { dueCards, estimateMinutes } from "@/lib/scheduler";
import { METHODS, METHOD_ORDER } from "@/lib/methods";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_LABELS,
  DEFAULT_FILTERS,
  REVIEW_LABELS,
  SCOPE_LABELS,
  STATUS_LABELS,
  activeChips,
  activeFilterCount,
  collectionsOf,
  countNotes,
  facetCounts,
  filterNotes,
  hasConstraints,
  noteStats,
  toggleValue,
  type ActivityFilter,
  type LibraryFilters,
  type LibrarySource,
  type ReviewFilter,
  type SearchScope,
} from "@/lib/libraryFilters";
import type { Method, Note, NoteStatus } from "@/types";

export default function Library() {
  const navigate = useNavigate();
  const notes = useContentStore((s) => s.notes);
  const questions = useContentStore((s) => s.questions);
  const cards = useContentStore((s) => s.cards);
  const zettel = useContentStore((s) => s.zettel);
  const vaults = useContentStore((s) => s.vaults);
  const mindmaps = useContentStore((s) => s.mindmaps);
  const projects = useContentStore((s) => s.projects);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const setActiveProject = useAppStore((s) => s.setActiveProject);

  const filters = useLibraryFilters((s) => s.filters);
  const setFilters = useLibraryFilters((s) => s.setFilters);
  const resetFilters = useLibraryFilters((s) => s.reset);
  const [sheetOpen, setSheetOpen] = useState(false);
  /* Aperçu d’une note depuis la grille, sans quitter la bibliothèque. */
  const [peek, setPeek] = useState<Note | null>(null);
  /* « / » en bureau : le curseur va directement dans la recherche. */
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener(FOCUS_SEARCH_EVENT, focusSearch);
    return () => document.removeEventListener(FOCUS_SEARCH_EVENT, focusSearch);
  }, []);
  const [projectsOpen, setProjectsOpen] = useState(false);
  /* `/‑?project=` : arriver depuis un projet filtre la bibliothèque sur lui.
     Le filtre vit dans le magasin, l’adresse ne fait que le poser. */
  const [search] = useSearchParams();
  useEffect(() => {
    const target = search.get("project");
    if (target) setActiveProject(target);
  }, [search, setActiveProject]);

  /* Le projet ouvert agit comme un périmètre, avant les filtres :
     les compteurs, les facettes et la recherche restent cohérents. */
  const scopedNotes = useMemo(
    () =>
      activeProjectId
        ? notes.filter((note) => note.projectId === activeProjectId)
        : notes,
    [notes, activeProjectId],
  );

  const source: LibrarySource = useMemo(
    () => ({
      notes: scopedNotes,
      questions,
      cards,
      mindmaps,
      zettel,
      vaults,
    }),
    [scopedNotes, questions, cards, mindmaps, zettel, vaults],
  );

  const live = useMemo(
    () => scopedNotes.filter((note) => !note.deletedAt),
    [scopedNotes],
  );
  const filtered = useMemo(() => filterNotes(source, filters), [source, filters]);
  const resultCount = useMemo(() => countNotes(source, filters), [source, filters]);

  const statsById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof noteStats>>();
    for (const note of live) map.set(note.id, noteStats(note, source));
    return map;
  }, [live, source]);

  const due = dueCards(cards);
  /* Affichage : le menu écrit ici, l’écran obéit (vue, colonnes, groupes, tri). */
  const { prefs: display } = useSurfacePrefs("library");
  const desktop = useIsDesktop();
  const fields: DisplayFields<Note> = useMemo(
    () => ({
      title: { label: "Titre", value: (note) => note.title },
      updated: { label: "Modifié", value: (note) => note.updatedAt, type: "date" },
      created: { label: "Créé", value: (note) => note.createdAt, type: "date" },
      method: { label: "Méthode", value: (note) => METHODS[note.method].label },
      status: { label: "Statut", value: (note) => STATUS_LABELS[note.status] },
      collection: {
        label: "Collection",
        value: (note) => note.collection || "Sans collection",
      },
      project: {
        label: "Projet",
        value: (note) =>
          projects.find((project) => project.id === note.projectId)?.name ??
          "Sans projet",
      },
      due: {
        label: "Cartes à revoir",
        value: (note) => statsById.get(note.id)?.due ?? 0,
        type: "number",
      },
      questions: {
        label: "Questions",
        value: (note) => statsById.get(note.id)?.questions ?? 0,
        type: "number",
      },
      nextDue: {
        label: "Prochaine échéance",
        value: (note) =>
          statsById.get(note.id)?.nextDue ?? "9999-12-31T00:00:00.000Z",
        type: "date",
      },
    }),
    [projects, statsById],
  );

  const ordered = useMemo(
    () => sortItems(filtered, fields, [display.sortBy, display.thenBy]),
    [filtered, fields, display.sortBy, display.thenBy],
  );
  const sections = useMemo(
    () => groupItems(ordered, fields, display.groupBy),
    [ordered, fields, display.groupBy],
  );

  const chips = activeChips(filters, (method) => METHODS[method].label);
  const activeCount = activeFilterCount(filters);
  const constrained = hasConstraints(filters);

  const detail = (note: Note) => {
    const stats = statsById.get(note.id);
    const parts: string[] = [];
    if (stats && stats.due > 0) parts.push(`${stats.due} à revoir`);
    if (note.method === "mindmap") {
      const nodes = mindmaps.find((m) => m.noteId === note.id)?.nodes.length ?? 0;
      parts.push(`${nodes} nœud${nodes > 1 ? "s" : ""}`);
    } else if (note.method === "zettelkasten") {
      const vault = vaults.find((v) => v.id === note.vaultId);
      const count = zettel.filter((c) => c.vaultId === note.vaultId).length;
      if (vault) parts.push(`vault ${vault.name}`);
      parts.push(`${count} carte${count > 1 ? "s" : ""}`);
    } else if (stats && stats.questions > 0) {
      parts.push(`${stats.questions} question${stats.questions > 1 ? "s" : ""}`);
    }
    if (note.method !== "zettelkasten") parts.push(timeAgo(note.updatedAt));
    return parts.join(" · ");
  };

  /* Aperçu du fichier : texte des blocs, sinon titres des nœuds / cartes */
  const preview = (note: Note) => {
    const text = noteText(note).replace(/\s+/g, " ").trim();
    if (text) return text;
    if (note.method === "mindmap") {
      const map = mindmaps.find((m) => m.noteId === note.id);
      const titles = (map?.nodes ?? []).slice(0, 4).map((node) => node.text);
      if (titles.length) return titles.join(" · ");
    }
    if (note.method === "zettelkasten") {
      const titles = zettel
        .filter((card) => card.vaultId === note.vaultId)
        .slice(0, 4)
        .map((card) => card.title);
      if (titles.length) return titles.join(" · ");
    }
    return "Note vide. Touchez pour écrire la première idée.";
  };

  const openNote = (note: Note) => {
    if (note.method === "mindmap" && note.mindmapId) {
      navigate(`/mindmap/${note.mindmapId}`);
    } else if (note.method === "zettelkasten" && note.vaultId) {
      navigate(`/vault/${note.vaultId}/fiches`);
    } else {
      navigate(`/note/${note.id}`);
    }
  };

  return (
    <Screen withNav className="screen-wide">
      <div className="px-5 lg:flex lg:items-start lg:gap-9 lg:px-8">
        {/* Bureau : les facettes restent visibles en permanence. On voit
            l’effet d’un filtre sans ouvrir ni fermer de panneau. Le panneau
            n’est monté qu’en bureau : une seule copie dans le DOM. */}
        {desktop && (
        <aside className="library-filters" aria-label="Filtres">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-serif text-[18px] font-semibold">Filtres</h2>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[12.5px] font-semibold text-accent hover:underline"
              >
                Effacer
              </button>
            )}
          </div>
          <p className="mb-4 mt-1 text-[12.5px] text-muted">
            {constrained
              ? `${filtered.length} sur ${live.length} note${live.length > 1 ? "s" : ""}`
              : `${live.length} note${live.length > 1 ? "s" : ""}`}
          </p>
          <FilterPanel
            source={source}
            filters={filters}
            onChange={setFilters}
          />
        </aside>
        )}

        <div className="min-w-0 flex-1">
        <header className="pb-3 pt-7 lg:pt-10">
          <h1 className="font-serif text-[30px] font-semibold leading-tight">
            Bibliothèque
          </h1>
          <p className="mt-1 text-[14px] text-muted" data-testid="library-count">
            {constrained
              ? `${filtered.length} sur ${live.length} note${live.length > 1 ? "s" : ""}`
              : `${live.length} note${live.length > 1 ? "s" : ""}`}
          </p>
        </header>

        {/* Périmètre : tous les projets ou un seul */}
        {projects.length > 1 && (
          <div
            className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0"
            role="group"
            aria-label="Projet"
          >
            <button
              type="button"
              onClick={() => setActiveProject(null)}
              aria-pressed={activeProjectId === null}
              className={cn("pill h-9 shrink-0", activeProjectId === null && "pill-accent")}
            >
              Tous les projets
            </button>
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setActiveProject(project.id)}
                aria-pressed={activeProjectId === project.id}
                className={cn(
                  "pill h-9 shrink-0",
                  activeProjectId === project.id && "pill-accent",
                )}
              >
                {project.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setProjectsOpen(true)}
              aria-label="Gérer les projets"
              className="pill h-9 shrink-0 text-accent"
            >
              + Projet
            </button>
          </div>
        )}

        <div className="relative">
          <MagnifyingGlass
            size={20}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            ref={searchRef}
            type="search"
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({ ...current, query: event.target.value }))
            }
            aria-label="Rechercher dans les notes"
            placeholder="Rechercher dans les notes"
            className="field h-12 pl-11 pr-11"
          />
          {filters.query && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setFilters((current) => ({ ...current, query: "" }))}
              className="icon-btn absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        {/* Filtres : un seul bouton qui révèle tout, l’état reste visible */}
        <div className="mt-3 flex items-center gap-2">
          {!desktop && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              data-active={activeCount > 0}
              aria-haspopup="dialog"
              className="pill h-10 shrink-0 pl-3"
            >
              <Faders size={16} weight="bold" aria-hidden="true" />
              Filtres
              {activeCount > 0 && (
                <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11.5px] font-bold leading-none text-on-accent">
                  {activeCount}
                </span>
              )}
            </button>
          )}
          <div className="min-w-0 flex-1">
            <DisplayMenu
              surface="library"
              columns={{
                min: 1,
                max: 4,
                fallback: 2,
                autoHint: "Automatique : 2 sur téléphone, 3 en bureau.",
              }}
              groupOptions={[
                { value: "project", label: "Projet" },
                { value: "method", label: "Méthode" },
                { value: "status", label: "Statut" },
                { value: "collection", label: "Collection" },
                { value: "due", label: "Cartes à revoir" },
                { value: "questions", label: "Nombre de questions" },
              ]}
              sortOptions={[
                { value: "updated", label: "Modifié récemment" },
                { value: "created", label: "Date de création" },
                { value: "title", label: "Titre A → Z" },
                { value: "due", label: "Cartes à revoir" },
                { value: "nextDue", label: "Prochaine échéance" },
                { value: "questions", label: "Nombre de questions" },
                { value: "method", label: "Méthode" },
                { value: "collection", label: "Collection" },
              ]}
            />
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-label={`Retirer le filtre ${chip.label}`}
                onClick={() => setFilters((current) => chip.clear(current))}
                className="flex h-8 items-center gap-1 rounded-full border border-accent bg-accent-soft pl-3 pr-2 text-[12.5px] font-medium text-accent-ink"
              >
                {chip.label}
                <X size={12} weight="bold" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className="h-8 rounded-full px-2 text-[12.5px] font-semibold text-muted underline-offset-2 hover:underline"
            >
              Tout effacer
            </button>
          </div>
        )}

        {due.length > 0 ? (
          <section
            aria-label="Révisions du jour"
            className="mt-4 flex items-center justify-between gap-3 rounded-card bg-accent-soft p-4"
          >
            <div className="min-w-0">
              <div className="text-[16px] font-semibold">
                {due.length} carte{due.length > 1 ? "s" : ""} à revoir
              </div>
              <div className="mt-0.5 text-[14px] text-accent-ink">
                Environ {estimateMinutes(due.length)} minutes aujourd’hui
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/review")}
              className="h-11 shrink-0 rounded-rect bg-accent px-4 text-[15px] font-semibold text-on-accent active:opacity-90"
            >
              Commencer
            </button>
          </section>
        ) : (
          <section
            aria-label="Révisions du jour"
            className="mt-4 flex items-center justify-between gap-3 rounded-card border border-line bg-surface p-4"
          >
            <div>
              <div className="text-[16px] font-semibold">Tout est à jour</div>
              <div className="mt-0.5 text-[14px] text-muted">
                Vos prochaines cartes reviennent bientôt.
              </div>
            </div>
            <ArrowRight size={20} className="text-muted" aria-hidden="true" />
          </section>
        )}

        <div className="mt-3 empty:hidden">
          <ReviewReminder />
          <BackupReminder compact refreshKey={notes.length + zettel.length} />
        </div>

        {display.view === "list" && desktop && filtered.length > 0 && (
          <div
            aria-hidden="true"
            className="mt-5 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] gap-4 border-b border-line px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"
          >
            <span>Note</span>
            <span>Méthode · collection</span>
            <span>Révision</span>
            <span className="pr-1 text-right">Ouvrir</span>
          </div>
        )}

        {sections.map((section) => {
          const columns = columnsFor(display, {
            fallback: desktop ? 3 : 2,
            min: 1,
            max: 4,
          });
          return (
            <section key={section.key} className="mt-4" aria-label={section.label || undefined}>
              {section.label && (
                <h2 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                  {section.label}
                  <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-muted">
                    {section.items.length}
                  </span>
                </h2>
              )}
              <ul
                className={cn(
                  display.view === "grid"
                    ? "grid items-stretch gap-2.5 pb-4 lg:gap-3"
                    : "flex flex-col gap-2 pb-4",
                )}
                style={
                  display.view === "grid" ? gridStyle(columns) : undefined
                }
              >
                {section.items.map((note) => {
                  const Icon = METHODS[note.method].icon;
                  const stats = statsById.get(note.id);
                  return (
                    <li key={note.id} className="group/peek relative h-full">
                      <button
                        type="button"
                        onClick={() => openNote(note)}
                        aria-label={`Ouvrir « ${note.title} »`}
                        className={cn(
                          "group w-full overflow-hidden rounded-card border border-line bg-surface text-left transition-colors",
                          "hover:border-line-strong active:bg-surface-2",
                          display.view === "grid"
                            ? "flex h-full flex-col lg:hover:shadow-float"
                            : "flex items-center gap-3 p-3",
                          display.view === "list" &&
                            "lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:gap-4",
                        )}
                      >
                        {display.view === "list" ? (
                          <>
                            <span className="tile h-9 w-9 shrink-0" aria-hidden>
                              <Icon size={18} weight="duotone" className="text-accent" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-serif text-[15px] font-semibold">
                                {note.title}
                              </span>
                              <span className="mt-0.5 block truncate text-[12.5px] text-muted lg:hidden">
                                {METHODS[note.method].label} · {note.collection}
                              </span>
                            </span>
                            <span className="hidden min-w-0 lg:block">
                              <span className="block truncate text-[13px] text-muted">
                                {METHODS[note.method].label} · {note.collection}
                              </span>
                            </span>
                            <span className="hidden shrink-0 text-right text-[11.5px] text-muted sm:block lg:text-left">
                              {detail(note)}
                            </span>
                            <CaretRight
                              size={14}
                              className="shrink-0 text-muted lg:justify-self-end"
                              aria-hidden
                            />
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5 border-b border-line px-3 py-2">
                              <Icon
                                size={16}
                                weight="duotone"
                                aria-hidden
                                className="shrink-0 text-accent"
                              />
                              <span className="truncate text-[11.5px] font-semibold text-accent-ink">
                                {METHODS[note.method].label}
                              </span>
                              <CaretRight
                                size={13}
                                aria-hidden
                                className="ml-auto shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                              />
                            </span>

                            <span className="flex flex-1 flex-col gap-1 px-3 pb-2.5 pt-2.5">
                              <span className="line-clamp-2 font-serif text-[15px] font-semibold leading-[21px] lg:text-[17px] lg:leading-[23px]">
                                {note.title}
                              </span>
                              <span className="line-clamp-3 text-[12.5px] leading-[18px] text-muted lg:text-[13.5px] lg:leading-[20px]">
                                {preview(note)}
                              </span>
                            </span>

                            <span className="flex flex-col gap-1 px-3 pb-2.5">
                              <span className="max-w-full truncate rounded-full bg-surface-2 px-2 py-0.5 pr-16 text-[11px] font-medium text-muted">
                                {note.collection || "Sans collection"}
                              </span>
                              <span
                                className={cn(
                                  "truncate text-[11px]",
                                  stats && stats.due > 0
                                    ? "font-semibold text-accent-ink"
                                    : "text-muted",
                                )}
                              >
                                {detail(note)}
                              </span>
                            </span>
                          </>
                        )}
                      </button>
                      {/* Aperçu sans quitter la grille : on voit le contenu
                          rendu, pas seulement le titre et deux lignes. */}
                      {display.view === "grid" && (
                        <button
                          type="button"
                          onClick={() => setPeek(note)}
                          aria-label={`Aperçu de « ${note.title} »`}
                          className="absolute bottom-2 right-2 z-10 flex h-8 items-center gap-1 rounded-full border border-line bg-surface px-2.5 text-[11.5px] font-semibold text-ink shadow-float transition-opacity focus-visible:opacity-100 md:opacity-0 md:group-hover/peek:opacity-100"
                        >
                          <Eye size={13} weight="duotone" aria-hidden />
                          Aperçu
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <EmptyState
            icon={NotePencil}
            title={constrained ? "Aucune note ne correspond" : "Aucune note ici"}
            description={
              constrained
                ? "Élargissez un critère : méthode, collection, révision ou période."
                : "Commencez une note : choisissez la méthode selon votre besoin."
            }
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  constrained ? setFilters(DEFAULT_FILTERS) : navigate("/new")
                }
              >
                {constrained ? "Effacer les filtres" : "Nouvelle note"}
              </button>
            }
          />
        )}
        </div>
      </div>

      {!desktop && (
        <FilterSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          source={source}
          filters={filters}
          onChange={setFilters}
          resultCount={resultCount}
        />
      )}
    <Sheet
      open={peek !== null}
      onClose={() => setPeek(null)}
      title={peek ? peek.title : undefined}
      size="wide"
    >
      {peek && (
        <div>
          <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent-ink">
              {METHODS[peek.method].label}
            </span>
            <span>{peek.collection || "Sans collection"}</span>
            <span aria-hidden>·</span>
            <span>{detail(peek)}</span>
          </p>
          <div className="rounded-card border border-line bg-surface px-4 py-3.5">
            <NotePreview note={peek} />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => {
                const target = peek;
                setPeek(null);
                openNote(target);
              }}
            >
              Ouvrir la note
            </button>
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => {
                const target = peek;
                setPeek(null);
                navigate(`/review/session?scope=note&id=${target.id}&mode=all`);
              }}
            >
              Réviser cette note
            </button>
          </div>
        </div>
      )}
    </Sheet>

    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Panneau de filtres                                                  */
/* ------------------------------------------------------------------ */

/** Le corps des filtres, partagé par la colonne bureau et la feuille mobile. */
function FilterPanel({
  source,
  filters,
  onChange,
}: {
  source: LibrarySource;
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
}) {
  const collections = useMemo(() => collectionsOf(source), [source]);

  const methodCounts = useMemo(
    () =>
      facetCounts(source, filters, METHOD_ORDER, (current, method) => ({
        ...current,
        methods: current.methods.includes(method)
          ? current.methods
          : [...current.methods, method],
      })),
    [source, filters],
  );

  const collectionCounts = useMemo(
    () =>
      facetCounts(source, filters, collections, (current, collection) => ({
        ...current,
        collections: current.collections.includes(collection)
          ? current.collections
          : [...current.collections, collection],
      })),
    [source, filters, collections],
  );

  const statusCounts = useMemo(
    () =>
      facetCounts(
        source,
        filters,
        Object.keys(STATUS_LABELS) as NoteStatus[],
        (current, status) => ({
          ...current,
          statuses: current.statuses.includes(status)
            ? current.statuses
            : [...current.statuses, status],
        }),
      ),
    [source, filters],
  );

  const reviewCounts = useMemo(
    () =>
      facetCounts(
        source,
        filters,
        Object.keys(REVIEW_LABELS) as ReviewFilter[],
        (current, review) => ({ ...current, review }),
      ),
    [source, filters],
  );

  const activityCounts = useMemo(
    () =>
      facetCounts(
        source,
        filters,
        Object.keys(ACTIVITY_LABELS) as ActivityFilter[],
        (current, activity) => ({ ...current, activity }),
      ),
    [source, filters],
  );

  const scopeCounts = useMemo(
    () =>
      facetCounts(
        source,
        filters,
        Object.keys(SCOPE_LABELS) as SearchScope[],
        (current, scope) => ({ ...current, scope }),
      ),
    [source, filters],
  );

  return (
    <div className="pb-2">
        <Group label="Méthode">
          {METHOD_ORDER.map((method) => (
            <Pill
              key={method}
              label={METHODS[method].label}
              count={methodCounts[method]}
              active={filters.methods.includes(method)}
              onClick={() =>
                onChange({
                  ...filters,
                  methods: toggleValue(filters.methods, method as Method),
                })
              }
            />
          ))}
        </Group>

        {collections.length > 0 && (
          <Group label="Collection">
            {collections.map((collection) => (
              <Pill
                key={collection}
                label={collection}
                count={collectionCounts[collection]}
                active={filters.collections.includes(collection)}
                onClick={() =>
                  onChange({
                    ...filters,
                    collections: toggleValue(filters.collections, collection),
                  })
                }
              />
            ))}
          </Group>
        )}

        <Group label="État de la note">
          {(Object.keys(STATUS_LABELS) as NoteStatus[]).map((status) => (
            <Pill
              key={status}
              label={STATUS_LABELS[status]}
              count={statusCounts[status]}
              active={filters.statuses.includes(status)}
              onClick={() =>
                onChange({
                  ...filters,
                  statuses: toggleValue(filters.statuses, status),
                })
              }
            />
          ))}
        </Group>

        <Group label="Révision" hint="Une seule option à la fois">
          {(Object.keys(REVIEW_LABELS) as ReviewFilter[]).map((review) => (
            <Pill
              key={review}
              label={REVIEW_LABELS[review]}
              count={reviewCounts[review]}
              active={filters.review === review}
              onClick={() => onChange({ ...filters, review })}
            />
          ))}
        </Group>

        <Group label="Dernière modification">
          {(Object.keys(ACTIVITY_LABELS) as ActivityFilter[]).map((activity) => (
            <Pill
              key={activity}
              label={ACTIVITY_LABELS[activity]}
              count={activityCounts[activity]}
              active={filters.activity === activity}
              onClick={() => onChange({ ...filters, activity })}
            />
          ))}
        </Group>

        <Group label="Chercher dans" hint="S’applique au texte saisi">
          {(Object.keys(SCOPE_LABELS) as SearchScope[]).map((scope) => (
            <Pill
              key={scope}
              label={SCOPE_LABELS[scope]}
              count={scopeCounts[scope]}
              active={filters.scope === scope}
              onClick={() => onChange({ ...filters, scope })}
            />
          ))}
        </Group>

      <p className="rounded-field bg-surface-2 px-3 py-2 text-[12.5px] leading-[18px] text-muted">
        Le tri et le regroupement se règlent dans « Affichage », à côté de la
        recherche : un seul endroit, donc aucun réglage concurrent.
      </p>
      {activeFilterCount(filters) > 0 && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="mt-3 w-full rounded-field border border-line py-2.5 text-[13px] font-medium text-muted hover:border-line-strong"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}

function FilterSheet({
  open,
  onClose,
  source,
  filters,
  onChange,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  source: LibrarySource;
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  resultCount: number;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Filtrer les notes">
      <FilterPanel source={source} filters={filters} onChange={onChange} />
      <div className="sticky bottom-0 -mx-5 mt-1 flex gap-2 border-t border-line bg-surface px-5 pb-1 pt-3">
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="btn-secondary h-12 flex-1"
        >
          Réinitialiser
        </button>
        <button type="button" onClick={onClose} className="btn-primary h-12 flex-[1.6]">
          Voir {resultCount} note{resultCount > 1 ? "s" : ""}
        </button>
      </div>
    </Sheet>
  );
}

function Group({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 flex items-baseline gap-2 text-[14px] font-semibold text-muted">
        {label}
        {hint && <span className="text-[12px] font-normal text-muted">{hint}</span>}
      </h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  );
}

function Pill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  const empty = count === 0 && !active;
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      aria-pressed={active}
      disabled={empty}
      title={empty ? "Aucune note pour cette combinaison" : undefined}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13.5px] font-medium transition-colors",
        active ? "border-transparent bg-ink text-bg" : "border-line bg-surface text-ink",
        empty && "cursor-not-allowed opacity-40",
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "text-[11.5px] font-semibold tabular-nums",
            active ? "text-bg" : "text-muted",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
