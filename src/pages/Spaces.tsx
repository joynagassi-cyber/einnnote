import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Books,
  ClockCounterClockwise,
  FolderPlus,
  FolderSimple,
  GraduationCap,
  NotePencil,
  Plus,
  Stack,
} from "@phosphor-icons/react";
import { Screen } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { dueCards } from "@/lib/scheduler";
import { cn } from "@/lib/utils";

/**
 * Espaces — **une seule page pour comprendre où vit quoi**.
 *
 * Le défaut d’origine : « Projets » et « Coffres » étaient deux entrées de
 * même rang, sans phrase pour dire ce que l’une contient de l’autre. On ne
 * savait pas si un coffre appartenait à un projet, ni où ranger une note.
 *
 * La règle, désormais écrite et illustrée :
 *
 * - **Projet** = le classeur d’un travail (cours, mémoire, dossier).
 *   Il contient des **notes** et des **coffres**.
 * - **Coffre** = la réserve d’idées d’un projet : des **fiches** atomiques,
 *   numérotées, reliées entre elles. Une fiche = une idée + une source.
 * - **Note** = l’unité de travail. Elle vit dans un projet ; si sa méthode est
 *   « coffre », elle ouvre le coffre de ce projet.
 *
 * Rien ici n’est un doublon des pages Projets/Coffres : celles-ci restent les
 * écrans de gestion (renommer, supprimer, créer). Cette page est le plan.
 */
export default function Spaces() {
  const navigate = useNavigate();
  const projects = useContentStore((s) => s.projects);
  const notes = useContentStore((s) => s.notes);
  const vaults = useContentStore((s) => s.vaults);
  const zettel = useContentStore((s) => s.zettel);
  const cards = useContentStore((s) => s.cards);
  const setActiveProject = useAppStore((s) => s.setActiveProject);

  const due = dueCards(cards).length;

  const rows = useMemo(
    () =>
      projects.map((project) => {
        const projectNotes = notes.filter(
          (note) => note.projectId === project.id && !note.deletedAt,
        );
        const projectVaults = vaults.filter((vault) => vault.projectId === project.id);
        const projectZettel = zettel.filter((card) =>
          projectVaults.some((vault) => vault.id === card.vaultId),
        );
        const noteIds = new Set(projectNotes.map((note) => note.id));
        const projectDue = dueCards(cards.filter((card) => noteIds.has(card.noteId))).length;
        return {
          project,
          notes: projectNotes,
          vaults: projectVaults,
          zettel: projectZettel,
          due: projectDue,
        };
      }),
    [projects, notes, vaults, zettel, cards],
  );

  const orphans = vaults.filter((vault) => !projects.some((p) => p.id === vault.projectId));

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <header className="pb-4 pt-7">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">
          Structure
        </p>
        <h1 className="mt-1 font-serif text-[32px] font-semibold leading-tight">Espaces</h1>
        <p className="mt-1.5 max-w-[62ch] text-[15px] leading-[22px] text-muted">
          Un projet <strong className="text-ink">range</strong>. Un coffre{" "}
          <strong className="text-ink">relie</strong>. Une note travaille. C’est tout, et
          c’est ce qui évite de chercher une note au mauvais endroit.
        </p>
        {/* La page qui explique le rangement renvoie à la leçon qui l’enseigne :
            le schéma d’ici est un aide-mémoire, pas un cours. */}
        <button
          type="button"
          onClick={() => navigate("/learn/x-1")}
          className="mt-2.5 flex items-center gap-1.5 text-[13px] font-medium text-accent"
        >
          <GraduationCap size={16} weight="duotone" aria-hidden />
          Apprendre en 3 minutes : un projet, des coffres, des notes
        </button>
      </header>

      {/* Les trois rôles, côte à côte, sans jargon */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <RoleCard
          icon={FolderSimple}
          title="Projet"
          role="Le classeur"
          text="Un travail : un cours, un mémoire, un dossier client. Il contient des notes et des coffres."
          action={{ label: "Voir les projets", onClick: () => navigate("/projects") }}
        />
        <RoleCard
          icon={Books}
          title="Coffre"
          role="La réserve"
          text="Un paquet de fiches atomiques, numérotées, reliées. Une fiche = une idée + une source. Un coffre appartient à un projet."
          action={{ label: "Voir les coffres", onClick: () => navigate("/vaults") }}
        />
        <RoleCard
          icon={NotePencil}
          title="Note"
          role="Le travail"
          text="Cornell, plan, carte mentale ou coffre. Elle vit dans un projet. Ses questions deviennent des cartes de révision."
          action={{ label: "Voir les notes", onClick: () => navigate("/") }}
        />
      </div>

      {/* La hiérarchie, en une ligne */}
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-big border border-line bg-surface px-4 py-3 text-[12.5px] text-muted">
        <span className="font-semibold text-ink">Hiérarchie</span>
        <ArrowRight size={13} weight="bold" aria-hidden />
        <span>Projet</span>
        <ArrowRight size={13} weight="bold" aria-hidden />
        <span>Coffre</span>
        <ArrowRight size={13} weight="bold" aria-hidden />
        <span>Fiche</span>
        <span className="mx-1 text-line-strong">•</span>
        <span>Projet</span>
        <ArrowRight size={13} weight="bold" aria-hidden />
        <span>Note</span>
        <ArrowRight size={13} weight="bold" aria-hidden />
        <span>Question</span>
        <ArrowRight size={13} weight="bold" aria-hidden />
        <span>Carte</span>
      </div>

      {/* ------------------------------------------------ créer, dans l’ordre */}
      {/* Le parcours réel, en trois gestes, visible sur téléphone comme sur
          bureau. Avant, « créer un projet » n’était atteignable qu’en passant
          par une autre page, elle-même absente de la barre du bas : le
          parcours existait, il était juste introuvable. */}
      <section className="mt-4 rounded-big border border-line bg-surface p-4">
        <h2 className="font-serif text-[18px] font-semibold">Créer, dans l’ordre</h2>
        <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
          Un projet, puis un coffre dedans, puis des notes. Chaque étape sait
          déjà à quoi elle appartient.
        </p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-3">
          <li>
            <button
              type="button"
              aria-label="Étape 1 — créer un projet"
              onClick={() => navigate("/projects?new=1")}
              className="flex h-full w-full flex-col items-start gap-1 rounded-card border border-line bg-bg p-3 text-left transition-colors hover:border-line-strong"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-bold text-accent-ink">
                1
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold">
                <FolderPlus size={15} weight="bold" className="text-accent" aria-hidden />
                Nouveau projet
              </span>
              <span className="text-[12px] leading-[17px] text-muted">
                Ouvre directement le formulaire de création.
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              aria-label="Étape 2 — créer un coffre"
              onClick={() =>
                navigate(
                  rows[0]
                    ? `/vaults?new=1&project=${rows[0].project.id}`
                    : "/vaults?new=1",
                )
              }
              className="flex h-full w-full flex-col items-start gap-1 rounded-card border border-line bg-bg p-3 text-left transition-colors hover:border-line-strong"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-bold text-accent-ink">
                2
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold">
                <Stack size={15} weight="bold" className="text-accent" aria-hidden />
                Nouveau coffre
              </span>
              <span className="text-[12px] leading-[17px] text-muted">
                {rows[0]
                  ? `Rattaché à « ${rows[0].project.name} », changeable sur place.`
                  : "Créez d’abord un projet : un coffre y est rattaché."}
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              aria-label="Étape 3 — créer une note"
              onClick={() => navigate("/new")}
              className="flex h-full w-full flex-col items-start gap-1 rounded-card border border-line bg-bg p-3 text-left transition-colors hover:border-line-strong"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[12.5px] font-bold text-accent-ink">
                3
              </span>
              <span className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold">
                <Plus size={15} weight="bold" className="text-accent" aria-hidden />
                Nouvelle note
              </span>
              <span className="text-[12px] leading-[17px] text-muted">
                Quatre méthodes, ou une simple lecture.
              </span>
            </button>
          </li>
        </ol>
      </section>

      <div className="mt-6 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-[20px] font-semibold">Vos projets</h2>
        <button
          type="button"
          onClick={() => navigate("/projects")}
          className="text-[13px] font-semibold text-accent"
        >
          Gérer
        </button>
      </div>

      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <li
            key={row.project.id}
            className="rounded-big border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-serif text-[19px] font-semibold">
                  {row.project.name}
                </h3>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-[18px] text-muted">
                  {row.project.description || "Sans description"}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold",
                  row.due > 0
                    ? "bg-accent-soft text-accent-ink"
                    : "bg-surface-2 text-muted",
                )}
              >
                {row.due > 0 ? `${row.due} à revoir` : "à jour"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px] text-muted">
              <span className="rounded-full bg-surface-2 px-2 py-0.5">
                {row.notes.length} note{row.notes.length > 1 ? "s" : ""}
              </span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5">
                {row.vaults.length} coffre{row.vaults.length > 1 ? "s" : ""}
              </span>
              <span className="rounded-full bg-surface-2 px-2 py-0.5">
                {row.zettel.length} fiche{row.zettel.length > 1 ? "s" : ""}
              </span>
            </div>

            {row.vaults.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1">
                {row.vaults.map((vault) => (
                  <li key={vault.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/vault/${vault.id}`)}
                      className="flex w-full items-center gap-2 rounded-field border border-line px-2.5 py-1.5 text-left text-[13px] transition-colors hover:border-line-strong"
                    >
                      <Stack size={14} weight="duotone" className="shrink-0 text-accent" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{vault.name}</span>
                      <span className="shrink-0 text-[11.5px] text-muted">
                        {row.zettel.filter((card) => card.vaultId === vault.id).length} fiches
                      </span>
                      <ArrowRight size={13} weight="bold" className="shrink-0 text-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveProject(row.project.id);
                  navigate("/");
                }}
                className="pill h-9 px-3 text-[12.5px]"
              >
                Ouvrir ses notes
              </button>
              <button
                type="button"
                aria-label={`Nouveau coffre dans ${row.project.name}`}
                onClick={() => navigate(`/vaults?new=1&project=${row.project.id}`)}
                className="pill h-9 px-3 text-[12.5px]"
              >
                <Stack size={13} weight="bold" aria-hidden />
                Nouveau coffre
              </button>
              <button
                type="button"
                aria-label={`Nouvelle note dans ${row.project.name}`}
                onClick={() => {
                  setActiveProject(row.project.id);
                  navigate("/new");
                }}
                className="pill h-9 px-3 text-[12.5px]"
              >
                <NotePencil size={13} weight="bold" aria-hidden />
                Nouvelle note
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveProject(row.project.id);
                  navigate("/projects/" + row.project.id);
                }}
                className="h-9 px-1.5 text-[12.5px] font-medium text-accent"
              >
                Voir le projet
              </button>
            </div>
          </li>
        ))}
      </ul>

      {orphans.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif text-[20px] font-semibold">Coffres sans projet</h2>
          <p className="mt-1 text-[12.5px] text-muted">
            Un coffre peut exister seul, mais il ne sera visible dans aucun projet.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {orphans.map((vault) => (
              <li key={vault.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/vault/${vault.id}`)}
                  className="rounded-full border border-line px-3 py-1.5 text-[13px] hover:border-line-strong"
                >
                  {vault.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-col gap-2 rounded-big border border-line bg-surface p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">
            {due > 0
              ? `${due} carte${due > 1 ? "s" : ""} vous attend${due > 1 ? "ent" : ""}`
              : "Tout est à jour"}
          </p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Les cartes viennent des questions de vos notes — et des fiches de vos
            coffres, quand vous ouvrez un coffre pour le réviser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/review")}
          className="btn-primary h-11 shrink-0 px-4"
        >
          <ClockCounterClockwise size={17} weight="bold" aria-hidden />
          Réviser
        </button>
      </div>

      <div className="h-8" aria-hidden="true" />
    </Screen>
  );
}

function RoleCard({
  icon: Icon,
  title,
  role,
  text,
  action,
}: {
  icon: typeof FolderSimple;
  title: string;
  role: string;
  text: string;
  action: { label: string; onClick: () => void };
}) {
  return (
    <section className="flex flex-col rounded-big border border-line bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="tile h-9 w-9 shrink-0" aria-hidden>
          <Icon size={18} weight="duotone" className="text-accent" />
        </span>
        <div>
          <h2 className="font-serif text-[17px] font-semibold leading-tight">{title}</h2>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted">
            {role}
          </p>
        </div>
      </div>
      <p className="mt-2 flex-1 text-[12.5px] leading-[19px] text-muted">{text}</p>
      <button
        type="button"
        onClick={action.onClick}
        className="mt-3 flex h-9 items-center gap-1 self-start text-[12.5px] font-semibold text-accent"
      >
        {action.label}
        <ArrowRight size={13} weight="bold" aria-hidden />
      </button>
    </section>
  );
}
