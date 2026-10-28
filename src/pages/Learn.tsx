import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CaretRight, CheckCircle, Clock } from "@phosphor-icons/react";
import { Screen } from "@/components/Layout";
import { SpacesDiagram } from "@/components/learn/SpacesDiagram";
import { METHODS } from "@/lib/methods";
import {
  HUB_LESSON,
  TOTAL_LESSONS,
  TRACKS,
  countDone,
  isLessonDone,
  lessonsOf,
  nextLesson,
} from "@/lib/learn";
import { useContentStore } from "@/stores/useContentStore";

/**
 * Apprendre — et rien ne s’apprend avant **où ranger ce qu’on apprend**.
 *
 * La page s’ouvre donc sur les espaces, pas sur la liste des méthodes : un
 * projet contient des notes et plusieurs coffres, un coffre contient des
 * fiches. Le schéma du haut est calculé sur les données réelles — c’est le seul
 * moyen qu’un schéma d’hierarchie reste vrai le jour où l’on crée son deuxième
 * coffre.
 *
 * Trois pistes, dans cet ordre : le socle, les outils, le cours de lecture.
 * L’ordre est celui de `TRACKS` (`src/lib/learn.ts`) et non l’ordre des
 * numéros de piste — c’est une décision de parcours, pas un détail de tri.
 */
export default function Learn() {
  const navigate = useNavigate();
  const progress = useContentStore((s) => s.progress);
  const projects = useContentStore((s) => s.projects);
  const vaults = useContentStore((s) => s.vaults);
  const notes = useContentStore((s) => s.notes);
  const zettel = useContentStore((s) => s.zettel);

  const doneTotal = TRACKS.reduce((sum, track) => sum + countDone(progress, track.id).done, 0);

  /* Le projet montré : celui qui porte le plus de coffres, sinon le premier.
     C’est celui dont le schéma apprend le plus. */
  const showcase = useMemo(() => {
    if (!projects.length) return null;
    const ranked = [...projects]
      .map((project) => ({
        project,
        vaults: vaults.filter((vault) => vault.projectId === project.id),
      }))
      .sort((a, b) => b.vaults.length - a.vaults.length);
    const { project, vaults: own } = ranked[0];
    return {
      id: project.id,
      name: project.name,
      noteCount: notes.filter((note) => note.projectId === project.id).length,
      vaults: own.map((vault) => ({
        id: vault.id,
        name: vault.name,
        cardCount: zettel.filter((card) => card.vaultId === vault.id).length,
      })),
    };
  }, [projects, vaults, notes, zettel]);

  const next = nextLesson(progress);
  const socle = countDone(progress, 3);
  const firstVisit = progress.length === 0;

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <header className="pb-4 pt-7">
        <h1 className="font-serif text-[30px] font-semibold leading-tight">Apprendre</h1>
        <p className="mt-1 text-[15px] leading-[22px] text-muted">
          Leçons de 2 à 4 minutes, toujours terminées par un geste réel.
        </p>
      </header>

      {/* ------------------------------------------------ le centre : Espaces */}
      <section
        className="rounded-card border border-line bg-surface p-4 sm:p-5"
        aria-labelledby="socle"
      >
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent">
          {firstVisit ? "Commencez ici" : "Le centre de tout"}
        </p>
        <h2 id="socle" className="mt-1 font-serif text-[22px] font-semibold leading-snug">
          Un projet, des coffres, des notes
        </h2>
        <p className="mt-1 text-[13.5px] leading-[20px] text-muted">
          Un projet contient des notes et plusieurs coffres ; un coffre contient des
          fiches — vos notes d’une seule idée, qui se citent entre elles.
        </p>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          {showcase ? (
            <SpacesDiagram
              projectName={showcase.name}
              noteCount={showcase.noteCount}
              vaults={showcase.vaults}
            />
          ) : (
            <div className="rounded-card border border-dashed border-line-strong p-4 text-[13px] text-muted">
              Aucun projet pour l’instant : le premier geste de l’app en crée un.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-semibold text-muted">Le socle</span>
              <span className="tabnum font-semibold">
                {socle.done} / {socle.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-300"
                style={{ width: `${socle.total ? (socle.done / socle.total) * 100 : 0}%` }}
              />
            </div>

            <button
              type="button"
              onClick={() => navigate(`/learn/${next?.lesson.id ?? HUB_LESSON}`)}
              className="btn-primary mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-big text-[15.5px]"
            >
              {!next
                ? "Revoir le socle"
                : socle.done === 0 && next.track.id === 3
                  ? "Commencer le socle"
                  : `Continuer · ${next.lesson.title}`}
              <ArrowRight size={17} weight="bold" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => navigate("/spaces")}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-big border border-line text-[14.5px] font-medium"
            >
              Ouvrir Espaces
              <CaretRight size={15} weight="bold" className="text-muted" aria-hidden />
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ progression globale */}
      <section className="mt-3 rounded-card border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-semibold text-muted">Votre parcours</span>
          <span className="text-[14px] font-semibold">
            {doneTotal} / {TOTAL_LESSONS}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${TOTAL_LESSONS ? (doneTotal / TOTAL_LESSONS) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-2 text-[12px] leading-[17px] text-muted">
          {next
            ? `Prochaine leçon · ${next.track.label} : ${next.lesson.title}.`
            : "Parcours complet. Les leçons restent ouvertes pour les gestes à revoir."}
        </p>
      </section>

      {TRACKS.map((track) => {
        const lessons = lessonsOf(track.id).sort((a, b) => a.index - b.index);
        const stats = countDone(progress, track.id);
        return (
          <section key={track.id} className="mt-5">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2 className="text-[14px] font-semibold text-muted">{track.label}</h2>
              <span className="tabnum shrink-0 text-[12px] text-muted">
                {stats.done}/{stats.total}
              </span>
            </div>
            <p className="mb-2 text-[12.5px] leading-[18px] text-muted">{track.blurb}</p>

            <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
              {lessons.map((lesson) => {
                const isDone = isLessonDone(progress, lesson.id);
                const Icon = lesson.method ? METHODS[lesson.method].icon : CheckCircle;
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/learn/${lesson.id}`)}
                      className="row"
                    >
                      <span
                        className={
                          isDone
                            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-rect bg-accent-soft text-accent"
                            : "flex h-11 w-11 shrink-0 items-center justify-center rounded-rect border border-line text-muted"
                        }
                        aria-hidden="true"
                      >
                        {isDone ? (
                          <CheckCircle size={22} weight="duotone" />
                        ) : lesson.method ? (
                          <Icon size={22} />
                        ) : (
                          <span className="text-[15px] font-semibold">{lesson.index}</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-serif text-[16px] font-semibold leading-snug">
                          {lesson.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                          <Clock size={13} aria-hidden="true" />
                          {lesson.minutes} min · {lesson.steps.length} étapes
                        </span>
                      </span>
                      <CaretRight size={16} className="text-muted" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="h-24" />
    </Screen>
  );
}
