import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  FolderPlus,
  FolderSimple,
  Graph,
  MagnifyingGlass,
  NotePencil,
  PencilSimple,
  SquaresFour,
  Stack,
  X,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen } from "@/components/Layout";
import { Hint } from "@/components/Hint";
import { ProjectSheet } from "@/components/spaces/ProjectSheet";
import { useContentStore } from "@/stores/useContentStore";
import { dueCards } from "@/lib/scheduler";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Espaces — **la seule page de la hiérarchie**.
 *
 * Avant, trois pages se partageaient le même sujet : « Projets » listait les
 * projets, « Vaults » listait les vaults de tous les projets, « Espaces »
 * expliquait la structure. Trois endroits pour un seul objet, donc trois
 * chemins possibles et aucune évidence. Il n'en reste qu'un :
 *
 *     Espaces → un projet → ses vaults → le vault → ses fiches
 *
 * Chaque niveau est une adresse (`/spaces`, `/spaces/:id`, `/vault/:id`) : le
 * retour du navigateur, un lien partagé et un signet fonctionnent, et la page
 * où l'on est dit toujours dans quoi on est.
 */
export default function Spaces() {
  const navigate = useNavigate();
  const projects = useContentStore((s) => s.projects);
  const vaults = useContentStore((s) => s.vaults);
  const zettel = useContentStore((s) => s.zettel);
  const notes = useContentStore((s) => s.notes);
  const cards = useContentStore((s) => s.cards);

  /* Le bouton flottant navigue vers `/spaces?new=1` : la feuille est déjà
     ouverte en arrivant, il n'y a plus qu'à taper le nom. */
  const [params, setParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(params.get("new") === "1");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name" | "notes" | "due">("recent");
  const [status, setStatus] = useState<"all" | "due" | "active" | "empty">("all");

  /* Le bouton flottant navigue vers la même adresse avec `?new=1` : la page ne
     se remonte pas, donc l’état doit suivre le paramètre et pas seulement le
     premier rendu. */
  useEffect(() => {
    if (params.get("new") === "1") setSheetOpen(true);
  }, [params]);

  const closeSheet = () => {
    setSheetOpen(false);
    if (params.get("new")) {
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });
    }
  };

  const rows = useMemo(() => {
    const due = new Set(dueCards(cards).map((card) => card.id));
    return projects.map((project) => {
      const owned = vaults.filter((vault) => vault.projectId === project.id);
      const vaultIds = new Set(owned.map((vault) => vault.id));
      const fiches = zettel.filter((card) => vaultIds.has(card.vaultId));
      const ownNotes = notes.filter(
        (note) => note.projectId === project.id && !note.deletedAt,
      );
      const dueCount = fiches.filter((card) => due.has(card.id)).length
        + cards.filter((card) => {
            const note = ownNotes.find((entry) => entry.id === card.noteId);
            return Boolean(note) && due.has(card.id);
          }).length;
      return {
        project,
        vaultCount: owned.length,
        noteCount: ownNotes.length,
        ficheCount: fiches.length,
        due: dueCount,
        last: [
          ...fiches.map((card) => card.updatedAt),
          ...ownNotes.map((note) => note.updatedAt),
        ].sort().pop(),
      };
    });
  }, [projects, vaults, zettel, notes, cards]);

  const totalVaults = vaults.length;
  const totalFiches = zettel.length;

  /* Filtre et tri sont calculés, jamais figés : ce que la liste montre est
     exactement ce que la barre annonce. */
  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (needle) {
        const haystack = `${row.project.name} ${row.project.description ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (status === "due") return row.due > 0;
      if (status === "active") return row.noteCount > 0 || row.ficheCount > 0;
      if (status === "empty") return row.noteCount === 0 && row.ficheCount === 0;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.project.name.localeCompare(b.project.name, "fr");
      if (sort === "notes") return b.noteCount - a.noteCount || b.ficheCount - a.ficheCount;
      if (sort === "due") return b.due - a.due || b.noteCount - a.noteCount;
      return (b.last ?? "").localeCompare(a.last ?? "") || a.project.name.localeCompare(b.project.name, "fr");
    });
  }, [rows, query, sort, status]);

  const filtering = query.trim().length > 0 || status !== "all" || sort !== "recent";

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <AppBar
        center={false}
        action={
          <span className="hidden text-[12.5px] text-muted sm:inline">
            {projects.length} projet{projects.length > 1 ? "s" : ""} · {totalVaults} vault
            {totalVaults > 1 ? "s" : ""} · {totalFiches} fiche{totalFiches > 1 ? "s" : ""}
          </span>
        }
      />

      <header className="mt-1">
        <h1 className="font-serif text-[32px] font-semibold leading-tight">Espaces</h1>
      </header>

      {/* Une indication, une fois, puis le silence : la page se contente de
          montrer la hiérarchie réelle. L’explication complète est dans
          Apprendre, et nulle part ailleurs. */}
      <Hint
        hintId="spaces-hierarchie"
        href="/learn/x-1"
        hrefLabel="La leçon"
        className="mt-3"
      >
        Un projet contient des vaults — des catégories ; chaque vault range les
        notes de cette partie du sujet.
      </Hint>

      {rows.length === 0 ? (
        <EmptyState
          icon={SquaresFour}
          title="Aucun projet"
          description="Créez un projet : il délimite un travail, puis se découpe en vaults."
          action={
            <button type="button" className="btn-primary" onClick={() => setSheetOpen(true)}>
              <FolderPlus size={18} weight="bold" /> Créer un projet
            </button>
          }
        />
      ) : (
        <>
        <div className="mt-4 flex flex-wrap items-center gap-2" role="search">
          <div className="relative min-w-0 flex-1 sm:max-w-[280px]">
            <MagnifyingGlass
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Rechercher un projet"
              placeholder="Rechercher un projet"
              className="field h-10 pl-9 pr-9 text-[13.5px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="icon-btn absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>

          <label className="sr-only" htmlFor="spaces-sort">
            Trier les projets
          </label>
          <select
            id="spaces-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            className="field h-10 w-auto min-w-[168px] pr-8 text-[13px]"
          >
            <option value="recent">Modifié récemment</option>
            <option value="name">Nom A → Z</option>
            <option value="notes">Nombre de notes</option>
            <option value="due">À revoir d’abord</option>
          </select>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrer les projets">
            {([
              { id: "all", label: "Tous" },
              { id: "due", label: "À réviser" },
              { id: "active", label: "Actifs" },
              { id: "empty", label: "Vides" },
            ] as const).map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatus(chip.id)}
                aria-pressed={status === chip.id}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                  status === chip.id
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-line bg-surface text-ink hover:bg-surface-2",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[12px] tabular-nums text-muted" aria-live="polite">
            {visibleRows.length} sur {rows.length} projet{rows.length > 1 ? "s" : ""}
          </span>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSort("recent");
                setStatus("all");
              }}
              className="text-[12.5px] font-semibold text-accent hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {visibleRows.length === 0 ? (
          <p className="mt-6 rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-[13.5px] text-muted">
            Aucun projet ne correspond à ces filtres.
          </p>
        ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRows.map((row) => (
            <li key={row.project.id} className="h-full">
              <div className="group flex h-full flex-col rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                <button
                  type="button"
                  onClick={() => navigate(`/spaces/${row.project.id}`)}
                  aria-label={`Ouvrir le projet ${row.project.name}`}
                  className="flex flex-1 flex-col text-left"
                >
                  <span className="flex items-start gap-2.5">
                    <span className="tile h-10 w-10" aria-hidden>
                      <FolderSimple size={20} weight="duotone" className="text-accent" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-[18px] font-semibold leading-tight">
                        {row.project.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                        {row.project.description || "Sans description"}
                      </span>
                    </span>
                    <ArrowRight
                      size={16}
                      className="mt-1.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>

                  <span className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-medium",
                        row.vaultCount > 0
                          ? "bg-accent-soft text-accent-ink"
                          : "bg-surface-2 text-muted",
                      )}
                    >
                      {row.vaultCount} vault{row.vaultCount > 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">
                      {row.noteCount} note{row.noteCount > 1 ? "s" : ""}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">
                      {row.ficheCount} fiche{row.ficheCount > 1 ? "s" : ""}
                    </span>
                    {row.due > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-on-accent">
                        {row.due} à revoir
                      </span>
                    )}
                  </span>

                  {row.last && (
                    <span className="mt-2 block text-[11.5px] text-muted">
                      Modifié {timeAgo(row.last)}
                    </span>
                  )}
                </button>

                <div className="mt-3 flex items-center justify-end gap-1 border-t border-line pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/spaces/${row.project.id}/graph`)}
                    aria-label={`Graphe du projet ${row.project.name}`}
                    className="flex h-8 items-center gap-1.5 rounded-field px-2 text-[12.5px] font-medium text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <Graph size={15} weight="duotone" aria-hidden />
                    Graphe
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenameId(row.project.id)}
                    aria-label={`Renommer le projet ${row.project.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-field text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <PencilSimple size={15} aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        )}
        </>
      )}

      <div className="h-28" />

      <ProjectSheet open={sheetOpen} onClose={closeSheet} />
      <ProjectSheet
        open={Boolean(renameId)}
        onClose={() => setRenameId(null)}
        projectId={renameId ?? undefined}
      />
    </Screen>
  );
}
