import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ClockCounterClockwise,
  FolderPlus,
  FolderSimple,
  GraduationCap,
  Graph,
  NotePencil,
  PencilSimple,
  SquaresFour,
  Stack,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen } from "@/components/Layout";
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
        <p className="mt-1.5 max-w-[60ch] text-[15px] leading-[22px] text-muted">
          Un projet se découpe en <strong className="text-ink">vaults</strong> :
          des catégories, une par partie du sujet. Chaque vault range les{" "}
          <strong className="text-ink">notes</strong> écrites sur cette partie. Tout
          part d’ici.
        </p>
        <button
          type="button"
          onClick={() => navigate("/learn/x-1")}
          className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-accent"
        >
          <GraduationCap size={16} weight="duotone" aria-hidden />
          Apprendre en 3 minutes : un projet, des vaults, des notes
        </button>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={SquaresFour}
          title="Aucun projet"
          description="Un projet délimite un travail : « Mémoire », « Droit des affaires », « Maison ». Créez le premier, vous y ajouterez des vaults."
          action={
            <button type="button" className="btn-primary" onClick={() => setSheetOpen(true)}>
              <FolderPlus size={18} weight="bold" /> Créer un projet
            </button>
          }
        />
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
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

      {/* Rappel de la hiérarchie, en bas : la même phrase que le schéma
          d’Apprendre, pour que la page se suffise à elle-même. */}
      <section className="mt-6 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">
          Trois niveaux, trois rôles
        </h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {[
            {
              icon: SquaresFour,
              title: "Projet",
              text: "Le chantier : un cours, un mémoire, un dossier.",
            },
            {
              icon: Stack,
              title: "Vault",
              text: "La catégorie : « Superposition quantique », où l’on range ses notes.",
            },
            {
              icon: NotePencil,
              title: "Note",
              text: "Le concept : une page, avec sa source, révisable en fiches.",
            },
          ].map((role) => (
            <li key={role.title} className="flex items-start gap-2">
              <span className="tile h-8 w-8" aria-hidden>
                <role.icon size={16} weight="duotone" className="text-accent" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold">{role.title}</span>
                <span className="block text-[12px] leading-[17px] text-muted">{role.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-[17px] text-muted">
          <ClockCounterClockwise size={13} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
          Réviser part de ces fiches : les questions posées sur un passage deviennent les
          cartes du jour.
        </p>
      </section>

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
