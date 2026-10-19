import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { mockLessons } from "@/data/mocks";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import {
  CheckCircle,
  Clock,
  GraduationCap,
  Trophy,
  CaretRight,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Lesson = {
  id: string;
  title: string;
  description: string;
  duration: number;
  completed: boolean;
  category: "tutorial" | "course";
};

export default function LearnPage() {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const [lessons, setLessons] = useState<Lesson[]>(mockLessons);

  const completedCount = lessons.filter((l) => l.completed).length;
  const totalMinutes = lessons.filter((l) => l.completed).reduce((s, l) => s + l.duration, 0);

  const toggleLesson = (id: string) => {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, completed: !l.completed, doneAt: !l.completed ? new Date().toISOString() : undefined }
          : l
      )
    );
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <DesktopSidebar />
      <PageShell>
        <div className="mb-6">
          <h1 className="font-literata text-2xl font-bold text-[var(--ink)]">Apprendre</h1>
          <p className="font-inter text-sm text-[var(--muted)] mt-1">
            {completedCount} leçon{completedCount !== 1 ? "s" : ""} complétée{completedCount !== 1 ? "s" : ""} · {totalMinutes} min
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: CheckCircle, label: "Terminées", value: `${completedCount}/${lessons.length}` },
            { icon: Clock, label: "Temps", value: `${totalMinutes} min` },
            { icon: Trophy, label: "Niveau", value: completedCount >= 4 ? "Expert" : completedCount >= 2 ? "Intermédiaire" : "Débutant" },
          ].map(({ icon: I, label, value }) => (
            <div key={label} className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-center">
              <I weight="fill" className="w-6 h-6 text-[hsl(var(--accent))] mx-auto mb-2" />
              <div className="font-literata font-bold text-[var(--ink)] text-lg">{value}</div>
              <div className="font-inter text-xs text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </div>

        {/* Lessons list */}
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface)] border transition-all",
                lesson.completed ? "border-green-200 dark:border-green-900/30" : "border-[var(--line)] hover:border-[hsl(var(--accent))]/40"
              )}
            >
              <button
                onClick={() => toggleLesson(lesson.id)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  lesson.completed
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[hsl(var(--accent-soft))] hover:text-[hsl(var(--accent))]"
                )}
                aria-label={lesson.completed ? "Marquer comme non complété" : "Marquer comme complété"}
              >
                <CheckCircle weight="fill" className="w-5 h-5" />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-inter font-medium",
                    lesson.category === "tutorial"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                  )}>
                    {lesson.category === "tutorial" ? "Tutoriel" : "Cours"}
                  </span>
                  <span className="font-inter text-xs text-[var(--muted)]">{lesson.duration} min</span>
                </div>
                <h3 className={cn(
                  "font-literata font-semibold text-[var(--ink)]",
                  lesson.completed && "line-through opacity-60"
                )}>
                  {lesson.title}
                </h3>
                <p className="font-inter text-sm text-[var(--muted)] mt-0.5 line-clamp-1">{lesson.description}</p>
              </div>

              <CaretRight weight="light" className="w-5 h-5 text-[var(--muted)] flex-shrink-0" />
            </div>
          ))}
        </div>

        {lessons.length === 0 && (
          <div className="text-center py-12 text-[var(--muted)] font-inter">
            Aucune leçon disponible.
          </div>
        )}
      </PageShell>
      <AppLayoutMobile />
    </div>
  );
}
