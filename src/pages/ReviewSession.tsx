import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  ClockCounterClockwise,
  Eye,
  FolderSimple,
  Notepad,
  Stack,
  X,
} from "@phosphor-icons/react";
import { Screen } from "@/components/Layout";
import { FlipCard } from "@/components/review/FlipCard";
import { TiltCard } from "@/components/ui/3d-card";
import { NotePreview } from "@/components/NotePreview";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import {
  RATINGS,
  formatInterval,
  previewAll,
  reviewSettings,
  type SchedulerOptions,
} from "@/lib/scheduler";
import {
  allReviewItems,
  itemsInTarget,
  planSession,
  reviewedTodayCounts,
  scopeLabel,
  type ReviewItem,
  type ReviewTarget,
} from "@/lib/review";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import type { Rating } from "@/types";

/**
 * Séance de révision.
 *
 * Le verso **porte le contenu** : le passage écrit dans la note (ou le corps
 * de la fiche), et un aperçu de la note elle-même. C’est le point qui compte :
 * une carte qui retourne vers une coquille vide ne fait pas réviser.
 */
export default function ReviewSession() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const notes = useContentStore((s) => s.notes);
  const questions = useContentStore((s) => s.questions);
  const links = useContentStore((s) => s.links);
  const cards = useContentStore((s) => s.cards);
  const zettel = useContentStore((s) => s.zettel);
  const vaults = useContentStore((s) => s.vaults);
  const projects = useContentStore((s) => s.projects);
  const logs = useContentStore((s) => s.logs);
  const rateCard = useContentStore((s) => s.rateCard);
  const rateZettel = useContentStore((s) => s.rateZettel);
  const settings = reviewSettings(useAppStore((s) => s.settings.review));
  const desktop = useIsDesktop();

  const target: ReviewTarget = useMemo(() => {
    const scope = params.get("scope") ?? "all";
    const id = params.get("id") ?? "";
    if (scope === "project" && id) return { kind: "project", id };
    if (scope === "vault" && id) return { kind: "vault", id };
    if (scope === "note" && id) return { kind: "note", id };
    return { kind: "all" };
  }, [params]);

  const mode = params.get("mode") === "all" ? "all" : "due";

  /* La séance est figée à l’ouverture : noter une carte puis revenir ne doit
     pas réordonner la file sous les doigts. Un changement de portée passe par
     l’URL, donc par un nouveau montage. */
  const [queue, setQueue] = useState<ReviewItem[]>(() => {
    const items = allReviewItems({ notes, questions, links, cards, zettel, vaults, projects });
    const scoped = itemsInTarget(items, target);
    const today = reviewedTodayCounts(logs, items);
    const ordered = planSession(scoped, settings, {
      onlyDue: mode === "due",
      reviewedToday: today,
    });
    // Repli honnête : une portée choisie à la main ne doit pas renvoyer une
    // séance vide sous prétexte que rien n’est échu.
    return ordered.length > 0
      ? ordered
      : planSession(scoped, settings, { onlyDue: false, reviewedToday: today });
  });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState<Record<Rating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [requeued, setRequeued] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const item = queue[index];
  const note = item?.noteId ? notes.find((n) => n.id === item.noteId) : undefined;
  const title = scopeLabel(target, { notes, questions, links, cards, zettel, vaults, projects });

  const options: SchedulerOptions = useMemo(
    () => ({ retention: settings.retention }),
    [settings.retention],
  );
  const intervals = useMemo(
    () => (item ? previewAll(item.schedule, options) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.id, settings.retention],
  );

  useEffect(() => {
    setRevealed(false);
  }, [index]);

  const rate = useCallback(
    (rating: Rating) => {
      if (!item) return;
      if (item.kind === "question" && item.cardId) {
        rateCard(item.cardId, rating, options);
      } else if (item.kind === "fiche" && item.zettelId) {
        rateZettel(item.zettelId, rating, options);
      }
      setStats((s) => ({ ...s, [rating]: s[rating] + 1 }));

      /* « Encore » : la carte revient en fin de séance, une seule fois. Sans
         cela, une carte ratée disparaît jusqu’au lendemain — ce n’est pas ce
         que veut dire « encore ». */
      const again = rating === "again" && item.reps < 2;
      if (again) {
        setQueue((q) => [...q, { ...item, reps: item.reps + 1, due: new Date().toISOString() }]);
        setRequeued((n) => n + 1);
      }

      setLeaving(true);
      window.setTimeout(() => {
        setLeaving(false);
        setRevealed(false);
        setIndex((i) => i + 1);
      }, 220);
    },
    [item, options, rateCard, rateZettel],
  );

  /* Clavier : Espace révèle, 1–4 notent. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const node = event.target as HTMLElement | null;
      if (node && /^(INPUT|TEXTAREA)$/.test(node.tagName)) return;
      if (event.key === " " || event.key === "Enter") {
        if (!revealed) {
          event.preventDefault();
          setRevealed(true);
        }
        return;
      }
      const position = ["1", "2", "3", "4"].indexOf(event.key);
      if (revealed && position >= 0) {
        event.preventDefault();
        rate(RATINGS[position].value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [revealed, rate]);

  if (!item) {
    return (
      <Summary
        total={index}
        stats={stats}
        scope={title}
        requeued={requeued}
        onClose={() => navigate("/")}
        onAgain={() => navigate("/review")}
        onProgress={() => navigate("/settings/progress")}
      />
    );
  }

  const methodLabel =
    item.kind === "fiche"
      ? "Fiche de vault"
      : item.method
        ? METHOD_LABELS[item.method]
        : "Question";

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <header className="flex items-center gap-3 pb-1 pt-3">
        <button
          type="button"
          aria-label="Quitter la séance"
          onClick={() => navigate("/review")}
          className="icon-btn -ml-2.5"
        >
          <X size={24} weight="bold" />
        </button>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={queue.length}
          aria-valuenow={index + 1}
          aria-label="Progression de la séance"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${((index + 1) / queue.length) * 100}%` }}
          />
        </div>
        <div className="tabnum text-[15px] font-semibold">
          {index + 1} / {queue.length}
        </div>
      </header>

      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-muted">
        {target.kind === "project" && <FolderSimple size={14} weight="duotone" aria-hidden />}
        {target.kind === "vault" && <Stack size={14} weight="duotone" aria-hidden />}
        {target.kind === "note" && <Notepad size={14} weight="duotone" aria-hidden />}
        {target.kind === "all" && <ClockCounterClockwise size={14} weight="duotone" aria-hidden />}
        {title}
        {item.projectName && target.kind !== "project" ? ` · ${item.projectName}` : ""}
      </p>

      <div
        className={cn(
          "gap-6",
          desktop ? "grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] items-start" : "flex flex-col",
        )}
      >
        <div
          className={cn(
            "mt-4 transition-all duration-200",
            leaving && "-translate-y-2 opacity-0",
            !leaving && "animate-fade-in",
          )}
        >
          {/* La carte s’incline sous le pointeur (bureau) ou sous le doigt
              pendant l’appui (téléphone) : c’est un objet, pas une image. */}
          <TiltCard maxTilt={6} depth={14}>
          <FlipCard
            flipped={revealed}
            onFlip={() => setRevealed((value) => !value)}
            label={item.kind === "fiche" ? "Fiche" : "Question"}
            className="h-[min(64vh,560px)] min-h-[430px]"
            front={
              <div className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-rect bg-accent-soft px-2.5 py-1 text-[12.5px] font-semibold text-accent-ink">
                    {methodLabel}
                  </span>
                  <span className="text-[12px] font-medium text-muted">
                    {item.kind === "fiche" ? item.code : item.noteTitle}
                  </span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col justify-center py-4">
                  {item.kind === "fiche" && item.code && (
                    <p className="mb-2 text-[13px] font-bold tracking-wide text-accent">
                      {item.code}
                    </p>
                  )}
                  <h1
                    className={cn(
                      "font-serif font-semibold leading-[1.28]",
                      item.kind === "fiche" ? "text-[27px] sm:text-[31px]" : "text-[23px] sm:text-[27px]",
                    )}
                  >
                    {item.title}
                  </h1>
                  <p className="mt-3 max-w-[46ch] text-[13.5px] leading-[20px] text-muted">
                    {item.kind === "fiche"
                      ? "Restituez l’idée, la source, et les renvois qui la relient."
                      : "Répondez de mémoire, à voix haute. Puis retournez la carte."}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 text-[12px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <Eye size={14} weight="duotone" aria-hidden />
                    Touchez la carte pour la retourner
                  </span>
                  <span className="hidden sm:inline">Espace</span>
                </div>
              </div>
            }
            back={
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3 sm:px-6">
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                    {item.kind === "fiche" ? "La fiche" : "Ce que vous aviez écrit"}
                  </span>
                  <span className="truncate text-[12px] font-medium text-muted">
                    {item.kind === "fiche" ? item.vaultName : item.noteTitle}
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                  <p className="passage rounded-[5px] px-3 py-2 font-serif text-[18px] leading-[30px]">
                    {item.body || "—"}
                  </p>

                  {item.kind === "fiche" ? (
                    <div className="mt-3.5 flex flex-col gap-2">
                      {item.source && (
                        <p className="inline-flex w-fit rounded-rect bg-accent-soft px-2.5 py-1 text-[13px] font-medium text-accent-ink">
                          Source : {item.source}
                        </p>
                      )}
                      {item.refs && item.refs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                            Renvois
                          </span>
                          {item.refs.map((ref) => (
                            <span
                              key={ref}
                              className="rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-semibold text-ink"
                            >
                              {ref}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    note && (
                      <div className="mt-4">
                        <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Aperçu de la note
                        </p>
                        <div className="rounded-card border border-line bg-bg px-3 py-2.5">
                          <NotePreview note={note} limit={3} compact />
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 sm:px-6">
                  {item.kind === "question" && item.noteId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/note/${item.noteId}?q=${item.questionId}`)}
                      className="btn-secondary h-10 px-3 text-[13.5px]"
                    >
                      Voir dans la note
                    </button>
                  )}
                  {item.kind === "fiche" && item.vaultId && (
                    <button
                      type="button"
                      onClick={() => navigate(`/vault/${item.vaultId}/fiches?card=${encodeURIComponent(item.code ?? "")}`)}
                      className="btn-secondary h-10 px-3 text-[13.5px]"
                    >
                      Ouvrir le vault
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRevealed(false)}
                    className="ml-auto h-10 px-3 text-[13.5px] font-medium text-accent"
                  >
                    Retourner
                  </button>
                </div>
              </div>
            }
          />
          </TiltCard>
        </div>

        {/* Notation — toujours sous la carte, jamais dans la carte */}
        <div className={cn(desktop ? "mt-4" : "mt-1")}>
          {!revealed ? (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="btn-primary h-14 w-full rounded-big text-[16px]"
            >
              Afficher la réponse
            </button>
          ) : (
            <div className="animate-sheet-up">
              <p className="mb-2 text-center text-[14px] font-semibold">
                Comment était-ce ?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {RATINGS.map((rating) => {
                  const recommended = rating.value === "good";
                  return (
                    <button
                      key={rating.value}
                      type="button"
                      onClick={() => rate(rating.value)}
                      className={cn(
                        "flex h-[62px] flex-col items-center justify-center rounded-field text-[15px] font-semibold transition-transform active:scale-[0.97]",
                        recommended
                          ? "border-2 border-accent bg-accent-soft text-accent-ink"
                          : "border border-line-strong bg-surface text-ink",
                      )}
                    >
                      {rating.label}
                      <span
                        className={cn(
                          "text-[13px] font-normal tabular-nums",
                          recommended ? "text-accent-ink" : "text-muted",
                        )}
                      >
                        {settings.showIntervals && intervals
                          ? formatInterval(intervals[rating.value])
                          : rating.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {desktop && (
            <div className="mt-5 rounded-big border border-line bg-surface p-4">
              <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                Contexte
              </p>
              <p className="mt-1 font-serif text-[17px] font-semibold leading-snug">
                {item.kind === "fiche" ? item.vaultName : item.noteTitle}
              </p>
              <p className="mt-1 text-[13px] text-muted">
                {item.kind === "fiche"
                  ? `Fiche ${item.code} · ${item.refs?.length ?? 0} renvoi${(item.refs?.length ?? 0) > 1 ? "s" : ""}`
                  : `${methodLabel}${item.projectName ? ` · ${item.projectName}` : ""}`}
              </p>
              <hr className="my-4 border-0 border-t border-line" />
              <ul className="flex flex-col gap-1.5 text-[13px] text-muted">
                <li className="flex items-center justify-between gap-3">
                  <span>Retourner la carte</span>
                  <kbd className="kbd">Espace</kbd>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Noter de 1 à 4</span>
                  <span className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <kbd key={n} className="kbd">
                        {n}
                      </kbd>
                    ))}
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="h-8" aria-hidden="true" />
    </Screen>
  );
}

const METHOD_LABELS: Record<string, string> = {
  cornell: "Cornell",
  outline: "Plan",
  mindmap: "Carte mentale",
  zettelkasten: "Zettelkasten",
  whiteboard: "Tableau blanc",
  free: "Note libre",
};

function Summary({
  total,
  stats,
  scope,
  requeued,
  onClose,
  onAgain,
  onProgress,
}: {
  total: number;
  stats: Record<Rating, number>;
  scope: string;
  requeued: number;
  onClose: () => void;
  onAgain: () => void;
  onProgress: () => void;
}) {
  const again = stats.again;
  return (
    <Screen className="px-5">
      <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-accent-soft text-accent">
          <CheckCircle size={32} weight="duotone" />
        </div>
        <h1 className="font-serif text-[26px] font-semibold">Séance terminée</h1>
        <p className="mt-2 max-w-[42ch] text-[15px] leading-[22px] text-muted">
          {total} carte{total > 1 ? "s" : ""} revue{total > 1 ? "s" : ""} · {scope}.
          {requeued > 0
            ? ` ${requeued} carte${requeued > 1 ? "s" : ""} ratée${requeued > 1 ? "s" : ""} revien${requeued > 1 ? "nent" : "t"} en fin de séance.`
            : ""}{" "}
          FSRS a recalculé chaque échéance.
        </p>

        <div className="mt-6 grid w-full max-w-[340px] grid-cols-4 gap-2">
          {RATINGS.map((rating) => (
            <div key={rating.value} className="rounded-field border border-line bg-surface py-3">
              <div className="tabnum font-serif text-[20px] font-semibold">
                {stats[rating.value]}
              </div>
              <div className="text-[12px] text-muted">{rating.label}</div>
            </div>
          ))}
        </div>

        {again > 0 && (
          <p className="mt-3 max-w-[38ch] text-[12.5px] leading-[18px] text-muted">
            Les cartes « Encore » reviennent à 10 minutes, puis demain : c’est la
            sortie normale d’un échec, pas une punition.
          </p>
        )}

        <button type="button" onClick={onClose} className="btn-primary mt-7 w-full max-w-[340px]">
          Retour à la bibliothèque
        </button>
        <button
          type="button"
          onClick={onAgain}
          className="mt-1 flex h-11 items-center gap-1.5 text-[15px] font-medium text-accent"
        >
          Choisir une autre portée
          <ArrowRight size={15} weight="bold" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onProgress}
          className="h-11 text-[14px] font-medium text-muted"
        >
          Voir mes progrès
        </button>
      </div>
    </Screen>
  );
}
