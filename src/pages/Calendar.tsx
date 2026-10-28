import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  NotePencil,
  ClockCounterClockwise,
  Stack,
  GraduationCap,
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
import { dayKey } from "@/lib/stats";
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

/* Le fil du bas nomme chaque événement : une pastille de couleur suffit dans la
   grille, pas dans une liste qu’on lit. */
const KIND_META: Record<EventKind, { label: string; icon: typeof NotePencil }> = {
  note: { label: "Note", icon: NotePencil },
  review: { label: "Révision", icon: ClockCounterClockwise },
  due: { label: "Échéance", icon: Stack },
  lesson: { label: "Leçon", icon: GraduationCap },
};

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
  const [showAll, setShowAll] = useState(false);

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

  const projectNameOf = (id?: string) =>
    projects.find((entry) => entry.id === id)?.name;

  /* Le fil du mois : les mêmes événements que la grille, mais lus dans l’ordre
     du temps, groupés par jour et détaillés. C’est la vue qui sert quand on
     cherche « qu’est-ce que j’ai fait cette semaine », pas « quel jour ». */
  const monthPrefix = `${cursor.getFullYear()}-${`${cursor.getMonth() + 1}`.padStart(2, "0")}`;
  const timeline = useMemo(() => {
    const inMonth = visible
      .filter((event) => event.date.startsWith(monthPrefix))
      .sort((a, b) => (a.date === b.date ? (b.time ?? "").localeCompare(a.time ?? "") : b.date.localeCompare(a.date)));
    const groups: { date: string; events: CalendarEvent[] }[] = [];
    for (const event of inMonth) {
      const last = groups[groups.length - 1];
      if (last && last.date === event.date) last.events.push(event);
      else groups.push({ date: event.date, events: [event] });
    }
    return groups;
  }, [visible, monthPrefix]);

  const shownGroups = showAll ? timeline : timeline.slice(0, 8);
  const hiddenCount = timeline.length - shownGroups.length;

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
                projectName={projectNameOf(event.projectId)}
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

      {/* ------------------------------------------------ fil du mois */}
      {timeline.length > 0 && (
        <section
          aria-label="Fil du mois"
          className="mt-3 rounded-card border border-line bg-surface p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-[19px] font-semibold">Fil du mois</h2>
            <p className="text-[12px] text-muted">
              {timeline.reduce((sum, group) => sum + group.events.length, 0)} événements ·{" "}
              {timeline.length} jour{timeline.length > 1 ? "s" : ""} actif
              {timeline.length > 1 ? "s" : ""}
            </p>
          </div>

          <ol className="mt-3 flex flex-col">
            {shownGroups.map((group) => (
              <li key={group.date} className="relative flex gap-3 pb-4 last:pb-0">
                {/* le trait vertical relie les jours entre eux */}
                <span
                  className="absolute left-[7px] top-4 h-full w-px bg-line last:hidden"
                  aria-hidden
                />
                <span
                  className={cn(
                    "relative z-[1] mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2",
                    group.date === dayKey(now)
                      ? "border-accent bg-accent"
                      : "border-line-strong bg-surface",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-[13.5px] font-semibold">
                      {dayLabelFromKey(group.date)}
                      {group.date === dayKey(now) && (
                        <span className="ml-1.5 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-accent-ink">
                          aujourd’hui
                        </span>
                      )}
                    </h3>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-muted">
                      {group.events.length} événement{group.events.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <ul className="mt-1.5 flex flex-col gap-1">
                    {group.events.map((event) => {
                      const meta = KIND_META[event.kind];
                      const Icon = meta.icon;
                      return (
                        <li key={event.id}>
                          <button
                            type="button"
                            onClick={() => event.noteId && navigate(`/note/${event.noteId}`)}
                            disabled={!event.noteId}
                            className="flex w-full items-start gap-2 rounded-field px-1.5 py-1 text-left transition-colors enabled:hover:bg-surface-2 disabled:cursor-default"
                          >
                            <Icon
                              size={15}
                              weight="duotone"
                              className="mt-0.5 shrink-0 text-muted"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-baseline gap-x-1.5">
                                <span className="text-[12.5px] font-medium text-ink">
                                  {meta.label}
                                </span>
                                <span className="truncate text-[12.5px] text-muted">
                                  {event.title}
                                </span>
                                {event.time && (
                                  <span className="text-[11px] tabular-nums text-muted">
                                    {event.time}
                                  </span>
                                )}
                              </span>
                              {(event.detail || projectNameOf(event.projectId)) && (
                                <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                                  {[event.detail, projectNameOf(event.projectId)]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              )}
                            </span>
                            {event.noteId && (
                              <ArrowRight size={12} className="mt-1 shrink-0 text-muted" aria-hidden />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            ))}
          </ol>

          {(hiddenCount > 0 || showAll) && (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-field border border-line py-2 text-[12.5px] font-semibold text-accent hover:bg-surface-2"
            >
              {showAll ? (
                <>
                  <CaretUp size={13} weight="bold" aria-hidden /> Réduire
                </>
              ) : (
                <>
                  <CaretDown size={13} weight="bold" aria-hidden /> Afficher les{" "}
                  {hiddenCount} autres jours
                </>
              )}
            </button>
          )}
        </section>
      )}

      <div className="h-6" aria-hidden />
    </Screen>
  );
}

/** `2026-10-08` → « Jeudi 8 octobre ». */
function dayLabelFromKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return dayLabel(new Date(year, month - 1, day));
}

function DayEvent({
  event,
  projectName,
  onOpen,
}: {
  event: CalendarEvent;
  projectName?: string;
  onOpen: () => void;
}) {
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
          {(event.detail || projectName) && (
            <span className="mt-0.5 block truncate text-[11.5px] text-muted">
              {[event.detail, projectName].filter(Boolean).join(" · ")}
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
