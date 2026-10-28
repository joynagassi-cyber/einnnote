import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CaretLeft, CheckCircle, X } from "@phosphor-icons/react";
import { Screen } from "@/components/Layout";
import { Illustration } from "@/components/Illustration";
import { seedLessons } from "@/data/lessons";
import { trackOf } from "@/lib/learn";
import { useContentStore } from "@/stores/useContentStore";
import { useToast } from "@/stores/useToast";
import { cn } from "@/lib/utils";

export default function LessonPlayer() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast((s) => s.show);
  const progress = useContentStore((s) => s.progress);
  const setLessonStep = useContentStore((s) => s.setLessonStep);
  const completeLesson = useContentStore((s) => s.completeLesson);

  const lesson = seedLessons.find((l) => l.id === lessonId);
  const siblings = useMemo(
    () => seedLessons.filter((l) => l.track === lesson?.track),
    [lesson?.track],
  );

  const stored = progress.find((p) => p.lessonId === lessonId);
  const [step, setStep] = useState(() =>
    stored && !stored.doneAt ? Math.min(stored.step, (lesson?.steps.length ?? 1) - 1) : 0,
  );
  const start = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (lesson && !stored?.doneAt) setLessonStep(lesson.id, step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, step, setLessonStep]);

  if (!lesson) {
    return (
      <Screen className="px-5">
        <div className="py-20 text-center text-muted">Leçon introuvable.</div>
      </Screen>
    );
  }

  const current = lesson.steps[Math.min(step, lesson.steps.length - 1)];
  const last = step >= lesson.steps.length - 1;
  const trackLabel = trackOf(lesson).label;
  const position = siblings.findIndex((l) => l.id === lesson.id) + 1;

  const next = () => {
    if (last) {
      completeLesson(lesson.id);
      toast("Leçon terminée", "accent");
      navigate("/learn");
      return;
    }
    setStep((value) => value + 1);
  };

  const previous = () => setStep((value) => Math.max(0, value - 1));

  return (
    <Screen className="px-5">
      <header className="flex items-center gap-3 pt-3">
        <button
          type="button"
          aria-label="Fermer la leçon"
          onClick={() => navigate("/learn")}
          className="icon-btn -ml-2.5"
        >
          <X size={24} weight="bold" />
        </button>
        <div className="flex-1 text-[14px] font-semibold text-muted">
          {trackLabel} · Leçon {position} sur {siblings.length}
        </div>
        <span className="tabnum shrink-0 text-[12.5px] text-muted">
          {lesson.minutes} min
        </span>
      </header>

      {/* Ce que la leçon promet, en une phrase : sans cela, six étapes se
          lisent comme six conseils sans but. */}
      <p className="mt-2 font-serif text-[15px] leading-[23px] text-muted">
        {lesson.outcome}
      </p>

      {lesson.phases && (
        <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
          {lesson.phases.map((phase, index) => (
            <li key={phase} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden>·</span>}
              <span>{phase}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mb-5 mt-1 flex gap-1.5" aria-hidden="true">
        {lesson.steps.map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              index <= step ? "bg-accent" : "bg-line",
            )}
          />
        ))}
      </div>

      <div
        className="flex flex-1 flex-col"
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, textarea")) return;
          start.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, a, input, textarea")) return;
          const dx = event.clientX - start.current.x;
          const dy = event.clientY - start.current.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) next();
            else previous();
          }
        }}
      >
        <Illustration kind={current.illustration} />

        <h1 className="mt-5 font-serif text-[26px] font-semibold leading-[34px]">
          {current.title}
        </h1>
        <p className="mt-2.5 font-serif text-[17px] leading-[28px]">
          {current.body}
        </p>

        {current.points && current.points.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5 border-l-2 border-accent-soft pl-3.5">
            {current.points.map((point) => (
              <li key={point} className="text-[15px] leading-[23px] text-ink">
                {point}
              </li>
            ))}
          </ul>
        )}

        {current.mistakes && current.mistakes.length > 0 && (
          <div className="mt-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
              Erreur fréquente
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {current.mistakes.map((mistake) => (
                <li key={mistake} className="text-[14.5px] leading-[22px] text-muted">
                  {mistake}
                </li>
              ))}
            </ul>
          </div>
        )}

        {current.check && (
          <p className="mt-4 flex items-start gap-2 rounded-field bg-accent-soft px-3 py-2 text-[14.5px] leading-[21px] text-accent-ink">
            <CheckCircle size={17} weight="fill" className="mt-[1px] shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">C’est acquis si&nbsp;:</strong>{" "}
              {current.check}
            </span>
          </p>
        )}

        {current.practice && (
          <div className="mt-5 rounded-card border border-line bg-surface p-4">
            <div className="mb-1.5 text-[14px] font-semibold text-accent">
              {current.practice.title}
            </div>
            <p className="text-[16px] leading-[24px]">{current.practice.text}</p>
            {current.practice.href && (
              <button
                type="button"
                onClick={() => navigate(current.practice!.href!)}
                className="btn-primary mt-3 h-11 w-full rounded-big text-[15px]"
              >
                {current.practice.hrefLabel ?? "Faire le geste"}
              </button>
            )}
          </div>
        )}

        <div className="h-28" aria-hidden="true" />
      </div>

      <div className="dock pointer-events-none fixed inset-x-0 bottom-[calc(20px+var(--safe-bottom))] z-20 mx-auto flex gap-2.5 px-5">
        <button
          type="button"
          onClick={previous}
          disabled={step === 0}
          aria-label="Carte précédente"
          className="btn-secondary pointer-events-auto h-14 w-14 shrink-0 rounded-big px-0 disabled:opacity-30"
        >
          <CaretLeft size={20} weight="bold" />
        </button>
        <button
          type="button"
          onClick={next}
          className="btn-primary pointer-events-auto h-14 flex-1 rounded-big text-[16px]"
        >
          {last ? "Terminer la leçon" : "Continuer"}
        </button>
      </div>
    </Screen>
  );
}
