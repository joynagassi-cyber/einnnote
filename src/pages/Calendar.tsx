import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarBlank,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import { Screen } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import {
  calendarEvents,
  dayLabel,
  daySummary,
  monthGrid,
  monthLabel,
  type CalendarEvent,
  type EventKind,
} from "@/lib/calendar";
import { useProjects } from "@/lib/useProjects";
import { cn } from "@/lib/utils";

/**
 * **Calendrier** — tout ce qui s’est passé, tout ce qui arrive.
 *
 * Un mois d’un côté, le jour choisi de l’autre. Les événements ne sont pas
 * saisis : ils sont dérivés des notes, du journal de révision, des échéances
 * FSRS et des leçons terminées (`src/lib/calendar.ts`). Un calendrier qui
 * demanderait une double saisie serait un second cahier, pas un calendrier.
 */

const KINDS: { id: EventKind; label: string; dot: string }[] = [
  { id: "note", label: "Notes", dot: "var(--accent)" },
  { id: "review", label: "Révisions", dot: "color-mix(in srgb, var(--accent) 62%, var(--ink))" },
  { id: "due", label: "Échéances", dot: "color-mix(in srgb, var(--accent) 34%, transparent)" },
  { id: "lesson", label: "Leçons", dot: "var(--muted)" },
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function Calendar() {
  const navigate = useNavigate();
  const notes = useContentStore((s) => s.notes);
  const logs = useContentStore((s) => s.logs);
  const cards = useContentStore((s) => s.cards);
  const zettel = useContentStore((s) => s.zettel);
  const progress = useContentStore((s) => s.progress);
  const { projects } = useProjects();

  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date(now));
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<EventKind[]>([]);

  /* Les événements du mois affiché, plus une marge d’une semaine de chaque
     côté : la grille montre les jours de débordement, ils doivent être remplis
     eux aussi, sinon un 31 apparaît vide alors qu’il ne l’est pas. */
  const events = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), -7);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 8);
    return calendarEvents({ notes, logs, cards, zettel, progress }, from, to, {
      includeUpdated: true,
    }).filter((event) => !projectId || event.projectId === projectId);
  }, [cursor, notes, logs, cards, zettel, progress, projectId]);

  const visible = events.filter((event) => !hidden.includes(event.kind));
  const days = monthGrid(cursor, visible, now);
  const selectedKey = `${selected.getFullYear()}-${`${selected.getMonth() + 1}`.padStart(2, "0")}-${`${selected.getDate()}`.padStart(2, "0")}`;
  const dayEvents = visible.filter((event) => event.date === selectedKey);

  const monthCounts = {
    notes: visible.filter((event) => event.kind === "note").length,
    reviews: visible.filter((event) => event.kind === "review").length,
    due: visible
      .filter((event) => event.kind === "due")
      .reduce((sum, event) => sum + (Number.parseInt(event.title, 10) || 0), 0),
  };

  const shift = (delta: number) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    setCursor(next);
  };

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4 pt-7">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">
            Journal · échéances
          </p>
          <h1 className="mt-1 font-serif text-[30px] font-semibold leading-tight">
            Calendrier
          </h1>
          <p className="mt-1 max-w-[62ch] text-[13px] leading-[19px] text-muted">
            {monthCounts.notes} notes créées · {monthCounts.reviews} révisions ·{" "}
            {monthCounts.due} cartes à échéance ce mois-ci.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Mois précédent"
            className="icon-btn h-9 w-9 border border-line bg-surface"
          >
            <CaretLeft size={16} weight="bold" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelected(now);
            }}
            className="h-9 rounded-full border border-line bg-surface px-3 text-[12.5px] font-semibold"
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Mois suivant"
            className="icon-btn h-9 w-9 border border-line bg-surface"
          >
            <CaretRight size={16} weight="bold" aria-hidden />
          </button>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setProjectId(null)}
          aria-pressed={projectId === null}
          className={cn(
            "h-8 rounded-full border px-3 text-[12.5px] font-medium",
            projectId === null
              ? "border-accent bg-accent-soft text-accent-ink"
              : "border-line bg-surface text-ink",
          )}
        >
          Tous les projets
        </button>
        {projects.slice(0, 4).map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => setProjectId(project.id === projectId ? null : project.id)}
            aria-pressed={projectId === project.id}
            className={cn(
              "h-8 max-w-[180px] truncate rounded-full border px-3 text-[12.5px] font-medium",
              projectId === project.id
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line bg-surface text-ink",
            )}
          >
            {project.name}
          </button>
        ))}

        <span className="mx-1 h-5 w-px bg-line" aria-hidden />

        {KINDS.map((kind) => {
          const off = hidden.includes(kind.id);
          return (
            <button
              key={kind.id}
              type="button"
              onClick={() =>
                setHidden((current) =>
                  current.includes(kind.id)
                    ? current.filter((entry) => entry !== kind.id)
                    : [...current, kind.id],
                )
              }
              aria-pressed={!off}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium",
                off ? "border-line bg-surface text-muted line-through" : "border-line bg-surface text-ink",
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: kind.dot, opacity: off ? 0.3 : 1 }}
                aria-hidden
              />
              {kind.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-card border border-line bg-surface p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-serif text-[19px] font-semibold">{monthLabel(cursor)}</h2>
            <span className="text-[11.5px] text-muted">
              {days.length / 7} semaines
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 pb-1" aria-hidden>
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="text-center text-[10.5px] font-semibold uppercase tracking-wide text-muted"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const summary = daySummary(day.events);
              const isSelected = day.key === selectedKey;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelected(day.date)}
                  aria-label={`${dayLabel(day.date)}${day.events.length > 0 ? `, ${day.events.length} événement${day.events.length > 1 ? "s" : ""}` : ""}`}
                  aria-current={isSelected ? "date" : undefined}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-start gap-1 rounded-field border p-1 text-[12.5px] transition-colors",
                    day.inMonth ? "text-ink" : "text-muted/50",
                    isSelected
                      ? "border-accent bg-accent-soft"
                      : day.isToday
                        ? "border-accent/60 bg-surface"
                        : "border-transparent hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full tabular-nums",
                      day.isToday && "bg-accent font-semibold text-on-accent",
                      isSelected && !day.isToday && "font-semibold text-accent-ink",
                    )}
                  >
                    {day.date.getDate()}
                  </span>
                  <span className="flex h-1.5 items-center gap-[3px]" aria-hidden>
                    {summary.kinds.slice(0, 3).map((kind) => (
                      <span
                        key={kind}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background:
                            kind === "note"
                              ? "var(--accent)"
                              : kind === "review"
                                ? "color-mix(in srgb, var(--accent) 62%, var(--ink))"
                                : kind === "due"
                                  ? "color-mix(in srgb, var(--accent) 34%, transparent)"
                                  : "var(--muted)",
                          opacity: day.inMonth ? 1 : 0.4,
                        }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="rounded-card border border-line bg-surface p-4">
          <h2 className="font-serif text-[18px] font-semibold">{dayLabel(selected)}</h2>
          <p className="mt-0.5 text-[12px] leading-[17px] text-muted">
            {dayEvents.length === 0
              ? "Rien ce jour-là."
              : `${dayEvents.length} événement${dayEvents.length > 1 ? "s" : ""}`}
          </p>

          <ul className="mt-3 flex flex-col gap-2">
            {dayEvents.map((event) => (
              <DayEvent
                key={event.id}
                event={event}
                onOpen={() => event.noteId && navigate(`/note/${event.noteId}`)}
              />
            ))}
          </ul>

          {dayEvents.length === 0 && (
            <p className="mt-3 flex items-center gap-1.5 rounded-field bg-surface-2 px-2.5 py-2 text-[12px] text-muted">
              <CalendarBlank size={14} aria-hidden />
              Aucune activité enregistrée.
            </p>
          )}
        </aside>
      </div>

      <div className="h-6" aria-hidden />
    </Screen>
  );
}

function DayEvent({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  const dot =
    event.kind === "note"
      ? "var(--accent)"
      : event.kind === "review"
        ? "color-mix(in srgb, var(--accent) 62%, var(--ink))"
        : event.kind === "due"
          ? "color-mix(in srgb, var(--accent) 34%, transparent)"
          : "var(--muted)";

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={!event.noteId}
        className="flex w-full items-start gap-2 rounded-field px-1.5 py-1.5 text-left transition-colors enabled:hover:bg-surface-2 disabled:cursor-default"
      >
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: dot }}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="truncate text-[13.5px] font-medium text-ink">{event.title}</span>
            {event.time && (
              <span className="shrink-0 text-[11px] tabular-nums text-muted">{event.time}</span>
            )}
          </span>
          {event.detail && (
            <span className="mt-0.5 block truncate text-[11.5px] text-muted">
              {event.detail}
            </span>
          )}
        </span>
        {event.noteId && (
          <ArrowRight size={13} className="mt-1 shrink-0 text-muted" aria-hidden />
        )}
      </button>
    </li>
  );
}
