import { useNavigate } from "react-router-dom";
import { CaretRight, CheckCircle, Clock } from "@phosphor-icons/react";
import { Screen } from "@/components/Layout";
import { seedLessons } from "@/data/seed";
import { useContentStore } from "@/stores/useContentStore";
import { METHODS } from "@/lib/methods";

export default function Learn() {
  const navigate = useNavigate();
  const progress = useContentStore((s) => s.progress);

  const done = (lessonId: string) =>
    progress.find((p) => p.lessonId === lessonId)?.doneAt !== undefined;

  const tutorials = seedLessons.filter((l) => l.track === 1);
  const course = seedLessons.filter((l) => l.track === 2);
  const total = seedLessons.length;
  const finished = seedLessons.filter((lesson) => done(lesson.id)).length;

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <header className="pb-4 pt-7">
        <h1 className="font-serif text-[30px] font-semibold leading-tight">
          Apprendre
        </h1>
        <p className="mt-1 text-[15px] leading-[22px] text-muted">
          Leçons de 2 à 4 minutes, toujours terminées par un geste réel.
        </p>
      </header>

      <section className="rounded-card border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] font-semibold text-muted">
            Votre parcours
          </span>
          <span className="text-[14px] font-semibold">
            {finished} / {total}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${(finished / total) * 100}%` }}
          />
        </div>
      </section>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Tutoriels par outil
      </h2>
      <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
        {tutorials.map((lesson) => {
          const Icon = lesson.method ? METHODS[lesson.method].icon : CheckCircle;
          const isDone = done(lesson.id);
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => navigate(`/learn/${lesson.id}`)}
                className="row"
              >
                <span
                  className={
                    isDone ? "tile bg-accent-soft text-accent" : "tile"
                  }
                  aria-hidden="true"
                >
                  {isDone ? (
                    <CheckCircle size={22} weight="duotone" />
                  ) : (
                    <Icon size={22} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[16px] font-semibold leading-snug">
                    {lesson.title}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[14px] text-muted">
                    <Clock size={14} aria-hidden="true" />
                    {lesson.minutes} min · {lesson.steps.length} cartes
                  </span>
                </span>
                <CaretRight size={16} className="text-muted" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Cours · Lire pour retenir
      </h2>
      <ul className="mb-6 flex flex-col gap-2 pb-4 lg:grid lg:grid-cols-2">
        {course.map((lesson) => {
          const isDone = done(lesson.id);
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
                      : "flex h-11 w-11 shrink-0 items-center justify-center rounded-rect border border-line text-[15px] font-semibold text-muted"
                  }
                >
                  {isDone ? (
                    <CheckCircle size={22} weight="duotone" />
                  ) : (
                    lesson.index
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[16px] font-semibold leading-snug">
                    {lesson.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[14px] text-muted">
                    {lesson.subtitle}
                  </span>
                </span>
                <CaretRight size={16} className="text-muted" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
