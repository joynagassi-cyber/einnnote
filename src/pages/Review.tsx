import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Books,
  Cards,
  ClockCounterClockwise,
  FolderSimple,
  Notepad,
  SlidersHorizontal,
  Sparkle,
  Stack,
} from "@phosphor-icons/react";
import { Screen, Segmented } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { reviewSettings } from "@/lib/scheduler";
import { allReviewItems, itemsInTarget, summarize, type ReviewTarget } from "@/lib/review";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";

/**
 * Entrée de la révision : on **choisit la portée** avant de commencer.
 *
 * Pourquoi un écran d’entrée plutôt qu’une séance automatique : une séance qui
 * démarre sur « tout ce qui est dû » ne laisse aucune prise. Ici on peut
 * réviser un projet entier, un vault, ou une seule note Cornell — et voir,
 * avant de cliquer, combien de cartes cela représente.
 */
export default function Review() {
  const navigate = useNavigate();
  const notes = useContentStore((s) => s.notes);
  const questions = useContentStore((s) => s.questions);
  const links = useContentStore((s) => s.links);
  const cards = useContentStore((s) => s.cards);
  const zettel = useContentStore((s) => s.zettel);
  const vaults = useContentStore((s) => s.vaults);
  const projects = useContentStore((s) => s.projects);
  const settings = reviewSettings(useAppStore((s) => s.settings.review));
  const desktop = useIsDesktop();

  const [scope, setScope] = useState<"all" | "project" | "vault" | "note">("all");

  const items = useMemo(
    () =>
      allReviewItems({
        notes,
        questions,
        links,
        cards,
        zettel,
        vaults,
        projects,
      }),
    [notes, questions, links, cards, zettel, vaults, projects],
  );

  const now = new Date();
  /* Le compteur du haut décrit exactement ce que fera le bouton « Tout » :
     questions dues + fiches déjà travaillées. Les fiches neuves entrent par
     leur vault, pas par surprise. */
  const overall = summarize(itemsInTarget(items, { kind: "all" }), now);

  const byProject = useMemo(
    () =>
      projects
        .map((project) => ({
          target: { kind: "project", id: project.id } as ReviewTarget,
          label: project.name,
          hint: project.description ?? "",
          summary: summarize(
            items.filter((item) => item.projectId === project.id),
            now,
          ),
        }))
        .filter((row) => row.summary.total > 0),
    // `now` change à chaque rendu ; les compteurs n’en dépendent qu’au jour.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, items],
  );

  const byVault = useMemo(
    () =>
      vaults
        .map((vault) => ({
          target: { kind: "vault", id: vault.id } as ReviewTarget,
          label: vault.name,
          hint: vault.note ?? "",
          summary: summarize(
            items.filter((item) => item.vaultId === vault.id),
            now,
          ),
        }))
        // Un vault sans fiche n’a rien à réviser : le montrer serait un
        // faux bouton. Il reste accessible depuis l’écran Vaults.
        .filter((row) => row.summary.total > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vaults, items],
  );

  const byNote = useMemo(
    () =>
      notes
        .filter((note) => !note.deletedAt)
        .map((note) => ({
          target: { kind: "note", id: note.id } as ReviewTarget,
          label: note.title,
          hint: note.collection,
          method: note.method,
          summary: summarize(
            items.filter((item) => item.noteId === note.id),
            now,
          ),
        }))
        .filter((row) => row.summary.total > 0)
        .sort((a, b) => b.summary.due - a.summary.due || b.summary.total - a.summary.total),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes, items],
  );

  const start = (target: ReviewTarget, mode: "due" | "all" = "due") => {
    const params = new URLSearchParams({ scope: target.kind });
    if (target.kind !== "all") params.set("id", target.id);
    params.set("mode", mode);
    navigate(`/review/session?${params.toString()}`);
  };

  const scopeOptions = [
    { value: "all" as const, label: "Tout" },
    { value: "project" as const, label: "Projet" },
    { value: "vault" as const, label: "Vault" },
    { value: "note" as const, label: "Note" },
  ];

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <header className="pb-4 pt-7">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">
          Révision espacée · FSRS-5
        </p>
        <h1 className="mt-1 font-serif text-[32px] font-semibold leading-tight">
          Réviser
        </h1>
        <p className="mt-1.5 max-w-[56ch] text-[15px] leading-[22px] text-muted">
          {overall.due > 0
            ? `${overall.due} carte${overall.due > 1 ? "s" : ""} à revoir aujourd’hui, dont ${overall.fresh} jamais vue${overall.fresh > 1 ? "s" : ""}. Choisissez ce que vous voulez travailler.`
            : "Rien n’est échu aujourd’hui. Vous pouvez tout de même réviser un projet, un vault ou une note — les intervalles seront recalculés normalement."}
        </p>
      </header>

      <div
        className={cn(
          "gap-6",
          desktop
            ? "grid grid-cols-[minmax(0,1fr)_minmax(0,320px)] items-start"
            : "flex flex-col",
        )}
      >
        <div className="min-w-0">
          {/* Portée */}
          <div className="rounded-big border border-line bg-surface p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-[19px] font-semibold">
                  Portée de la séance
                </h2>
                <p className="mt-0.5 text-[13px] leading-[19px] text-muted">
                  Un projet, un vault, une note — ou toutes les cartes dues.
                </p>
              </div>
              <div className="w-full sm:w-auto">
                <Segmented
                  value={scope}
                  onChange={(value) => setScope(value)}
                  options={scopeOptions}
                  label="Portée de la révision"
                />
              </div>
            </div>

            <div className="mt-4">
              {scope === "all" && (
                <button
                  type="button"
                  onClick={() => start({ kind: "all" }, overall.due > 0 ? "due" : "all")}
                  className="btn-primary h-14 w-full justify-between rounded-big px-5 text-[16px]"
                >
                  <span className="flex items-center gap-2">
                    <Sparkle size={20} weight="duotone" aria-hidden />
                    {overall.due > 0
                      ? `Réviser les ${overall.due} cartes dues`
                      : `Réviser les ${overall.total} cartes`}
                  </span>
                  <ArrowRight size={18} weight="bold" aria-hidden />
                </button>
              )}

              {scope === "project" && (
                <ScopeList
                  rows={byProject}
                  icon={FolderSimple}
                  emptyLabel="Aucun projet ne contient encore de carte révisable."
                  onStart={start}
                />
              )}
              {scope === "vault" && (
                <ScopeList
                  rows={byVault}
                  icon={Stack}
                  emptyLabel="Aucun vault ne contient de fiche à réviser."
                  onStart={start}
                />
              )}
              {scope === "note" && (
                <ScopeList
                  rows={byNote}
                  icon={Notepad}
                  emptyLabel="Aucune note ne contient encore de question."
                  onStart={start}
                />
              )}
            </div>
          </div>

          {overall.total > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[12.5px] text-muted">
              <span className="flex items-center gap-1.5">
                <Cards size={15} weight="duotone" aria-hidden />
                {items.filter((item) => item.kind === "question").length} questions de notes
              </span>
              <span className="flex items-center gap-1.5">
                <Books size={15} weight="duotone" aria-hidden />
                {items.filter((item) => item.kind === "fiche").length} fiches de vault
              </span>
              <span className="flex items-center gap-1.5">
                <ClockCounterClockwise size={15} weight="duotone" aria-hidden />
                rétention visée {Math.round(settings.retention * 100)} %
              </span>
            </div>
          )}
        </div>

        {/* Colonne de droite : ce qui va se passer, et le réglage */}
        <aside className={cn("flex flex-col gap-3", !desktop && "mt-1")}>
          <section className="rounded-big border border-line bg-surface p-4">
            <h2 className="font-serif text-[17px] font-semibold">Comment ça marche</h2>
            <ol className="mt-2 flex flex-col gap-2 text-[13.5px] leading-[20px] text-muted">
              <li>
                <strong className="text-ink">Recto.</strong> La question, ou le titre
                de la fiche. Répondez de mémoire, à voix haute.
              </li>
              <li>
                <strong className="text-ink">Retournement.</strong> Touchez la carte :
                elle pivote en 3D et découvre le passage que vous aviez écrit.
              </li>
              <li>
                <strong className="text-ink">Note.</strong> Encore, Difficile, Bien,
                Facile — FSRS recalcule la date de retour à partir de votre réponse.
              </li>
            </ol>
          </section>

          <button
            type="button"
            onClick={() => navigate("/settings/review")}
            className="flex items-center gap-3 rounded-big border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong"
          >
            <span className="tile h-10 w-10 shrink-0" aria-hidden>
              <SlidersHorizontal size={19} weight="duotone" className="text-accent" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold">
                Réglages de la révision
              </span>
              <span className="block text-[12.5px] text-muted">
                Rétention, plafonds quotidiens, rappel du soir
              </span>
            </span>
            <ArrowRight size={16} weight="bold" className="text-muted" aria-hidden />
          </button>
        </aside>
      </div>

      <div className="h-8" aria-hidden="true" />
    </Screen>
  );
}

function ScopeList({
  rows,
  icon: Icon,
  emptyLabel,
  onStart,
}: {
  rows: {
    target: ReviewTarget;
    label: string;
    hint?: string;
    summary: { total: number; due: number; fresh: number };
  }[];
  icon: typeof Cards;
  emptyLabel: string;
  onStart: (target: ReviewTarget, mode?: "due" | "all") => void;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-[14px] text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const hasDue = row.summary.due > 0;
        return (
          <li key={`${row.target.kind}-${row.target.kind === "all" ? "all" : row.target.id}`}>
            <div className="flex items-center gap-3 rounded-card border border-line bg-bg px-3 py-2.5">
              <span className="tile h-9 w-9 shrink-0" aria-hidden>
                <Icon size={17} weight="duotone" className="text-accent" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-serif text-[15px] font-semibold">
                  {row.label}
                </span>
                <span className="block truncate text-[12.5px] text-muted">
                  {row.summary.total} carte{row.summary.total > 1 ? "s" : ""}
                  {hasDue ? ` · ${row.summary.due} due${row.summary.due > 1 ? "s" : ""}` : " · aucune due"}
                  {row.summary.fresh > 0 ? ` · ${row.summary.fresh} nouvelle${row.summary.fresh > 1 ? "s" : ""}` : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onStart(row.target, hasDue ? "due" : "all")}
                className="shrink-0 rounded-rect bg-accent px-3 py-2 text-[13px] font-semibold text-on-accent active:opacity-90"
              >
                {hasDue ? "Réviser" : "Tout revoir"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
