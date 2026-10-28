import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChartLineUp } from "@phosphor-icons/react";
import { Screen, Segmented } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { allReviewItems, summarize } from "@/lib/review";
import {
  PERIODS,
  byProject,
  dailyActivity,
  dueForecast,
  methodBreakdown,
  periodStart,
  retention,
  streak,
  weeklyRetention,
  type ActivityPoint,
  type Period,
} from "@/lib/stats";
import { METHODS } from "@/lib/methods";
import { dueCards } from "@/lib/scheduler";
import { cn } from "@/lib/utils";

/**
 * **Statistiques** — quatre chiffres, cinq lectures, aucune décoration.
 *
 * Chaque valeur affichée est calculée ici à partir de ce qui est réellement
 * enregistré : dates de création, journal de révision, échéances FSRS. Le temps
 * d’étude n’existe pas dans le modèle, donc il n’y a pas de graphique de durée —
 * c’est une absence assumée, pas un oubli.
 */
export default function Stats() {
  const navigate = useNavigate();
  const notes = useContentStore((s) => s.notes);
  const questions = useContentStore((s) => s.questions);
  const links = useContentStore((s) => s.links);
  const cards = useContentStore((s) => s.cards);
  const zettel = useContentStore((s) => s.zettel);
  const vaults = useContentStore((s) => s.vaults);
  const projects = useContentStore((s) => s.projects);
  const logs = useContentStore((s) => s.logs);

  const [period, setPeriod] = useState<Period>(30);
  const now = useMemo(() => new Date(), []);

  const live = useMemo(() => notes.filter((note) => !note.deletedAt), [notes]);
  const items = useMemo(
    () => allReviewItems({ notes, questions, links, cards, zettel, vaults, projects }),
    [notes, questions, links, cards, zettel, vaults, projects],
  );

  const since = periodStart(period, now);
  /* `now` est figé pour la durée de l’écran : la fenêtre ne bouge pas sous les
     yeux, et il peut donc figurer sans crainte dans les dépendances. */
  const activity = useMemo(
    () => dailyActivity(live, logs, period, now),
    [live, logs, period, now],
  );
  const weeks = useMemo(() => weeklyRetention(logs, 8, now), [logs, now]);
  const forecast = useMemo(
    () => dueForecast([...cards, ...zettel], 14, now),
    [cards, zettel, now],
  );
  const methods = useMemo(() => methodBreakdown(live), [live]);
  const rows = useMemo(
    () =>
      byProject({
        projects,
        notes,
        cards,
        logs,
        dueNow: (card) => dueCards([card], now).length > 0,
      }).sort((a, b) => b.notes - a.notes),
    [projects, notes, cards, logs, now],
  );

  const created = activity.reduce((sum, point) => sum + point.created, 0);
  const reviews = activity.reduce((sum, point) => sum + point.reviews, 0);
  const rate = retention(logs, since);
  const days = streak(logs, now);
  const due = summarize(items, now).due;
  const maxActivity = Math.max(1, ...activity.map((point) => point.created + point.reviews));
  const maxForecast = Math.max(1, ...forecast.map((point) => point.count));
  const maxMethod = Math.max(1, ...methods.map((row) => row.count));

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4 pt-7">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted">
            Mesure · journal de révision
          </p>
          <h1 className="mt-1 font-serif text-[30px] font-semibold leading-tight">
            Statistiques
          </h1>
          <p className="mt-1 max-w-[62ch] text-[13px] leading-[19px] text-muted">
            Ce que vous avez produit, ce que vous retenez, ce qui vous attend.
            Aucun chiffre inventé : tout vient des dates et des révisions.
          </p>
        </div>
        <Segmented
          label="Période"
          value={String(period)}
          onChange={(value) => setPeriod(Number(value) as Period)}
          options={PERIODS.map((days) => ({ value: String(days), label: `${days} j` }))}
        />
      </header>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi label="Notes créées" value={created} hint={`sur ${period} jours`} />
        <Kpi
          label="Série"
          value={days}
          hint={days === 1 ? "jour consécutif" : "jours consécutifs"}
        />
        <Kpi
          label="Rétention"
          value={rate ? `${rate.rate} %` : "—"}
          hint={rate ? `${rate.passed}/${rate.total} révisions réussies` : "aucune révision"}
        />
        <Kpi
          label="À revoir"
          value={due}
          hint={due === 0 ? "tout est à jour" : "maintenant"}
          accent={due > 0}
        />
      </div>

      <Panel
        title="Activité"
        hint={`${created} notes créées · ${reviews} révisions · ${period} derniers jours`}
      >
        <ActivityChart points={activity} max={maxActivity} />
        <Legend
          items={[
            { color: "var(--accent)", label: "Révisions" },
            { color: "color-mix(in srgb, var(--accent) 34%, transparent)", label: "Notes créées" },
          ]}
        />
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Rétention par semaine" hint="part des révisions réussies, 8 semaines">
          <RetentionChart weeks={weeks} />
        </Panel>

        <Panel
          title="Charge à venir"
          hint={`${forecast.reduce((sum, point) => sum + point.count, 0)} cartes sur 14 jours`}
        >
          <ForecastChart points={forecast} max={maxForecast} />
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Par méthode" hint={`${live.length} notes vivantes`}>
          {methods.length === 0 ? (
            <Empty>Créez une note pour voir la répartition.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {methods.map((row) => {
                const info = METHODS[row.method];
                return (
                  <li key={row.method} className="flex items-center gap-2.5">
                    <span className="w-[104px] shrink-0 truncate text-[13px] font-medium">
                      {info?.label ?? row.method}
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${Math.round((row.count / maxMethod) * 100)}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-muted">
                      {row.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Par projet" hint="notes · à revoir · rétention">
          {rows.length === 0 ? (
            <Empty>Un projet range vos coffres. Il n’y en a pas encore.</Empty>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11.5px] uppercase tracking-wide text-muted">
                  <th className="pb-1.5 font-semibold">Projet</th>
                  <th className="pb-1.5 text-right font-semibold">Notes</th>
                  <th className="pb-1.5 text-right font-semibold">À revoir</th>
                  <th className="pb-1.5 text-right font-semibold">Rétention</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="max-w-[180px] truncate py-1.5 font-medium">{row.name}</td>
                    <td className="py-1.5 text-right tabular-nums text-muted">{row.notes}</td>
                    <td
                      className={cn(
                        "py-1.5 text-right tabular-nums",
                        row.due > 0 ? "font-semibold text-accent" : "text-muted",
                      )}
                    >
                      {row.due}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted">
                      {row.retention ? `${row.retention.rate} %` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      <button
        type="button"
        onClick={() => navigate("/review")}
        className="mt-4 flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3.5 text-left transition-colors active:bg-surface-2"
      >
        <span className="tile shrink-0" aria-hidden>
          <ChartLineUp size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Passer à la révision</span>
          <span className="mt-0.5 block text-[13px] leading-[18px] text-muted">
            {due > 0 ? `${due} cartes vous attendent` : "Rien à revoir pour l’instant"}
          </span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-muted" aria-hidden />
      </button>

      <div className="h-6" aria-hidden />
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

function Kpi({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: number | string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-card border p-3.5",
        accent ? "border-accent bg-accent-soft" : "border-line bg-surface",
      )}
    >
      <p
        className={cn(
          "text-[11.5px] font-semibold uppercase tracking-wide",
          accent ? "text-accent-ink" : "text-muted",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-serif text-[26px] font-semibold leading-none tabular-nums",
          accent && "text-accent-ink",
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "mt-1.5 text-[11.5px] leading-[16px]",
          accent ? "text-accent-ink/80" : "text-muted",
        )}
      >
        {hint}
      </p>
    </div>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-4">
      <div className="mb-3">
        <h2 className="text-[14.5px] font-semibold">{title}</h2>
        <p className="mt-0.5 text-[12px] leading-[17px] text-muted">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] leading-[19px] text-muted">{children}</p>;
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[11.5px] text-muted">
          <span
            className="h-2 w-2 rounded-sm"
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Graphiques — SVG, jetons de couleur, aucune bibliothèque            */
/* ------------------------------------------------------------------ */

/**
 * Les graphiques sont écrits à la main pour une raison précise : ils doivent
 * prendre les couleurs du thème (`var(--accent)`), s’animer avec lui et rester
 * lisibles en contraste élevé. Une bibliothèque imposerait des couleurs en dur
 * et un conteneur qui mesure sa largeur — invisible dans les tests.
 */
function ActivityChart({ points, max }: { points: ActivityPoint[]; max: number }) {
  const total = points.reduce((sum, point) => sum + point.created + point.reviews, 0);
  return (
    <figure>
      <div className="flex h-28 items-end gap-[2px]" aria-hidden>
        {points.map((point) => {
          const height = ((point.created + point.reviews) / max) * 100;
          const reviewShare =
            point.created + point.reviews === 0
              ? 0
              : (point.reviews / (point.created + point.reviews)) * 100;
          return (
            <span
              key={point.date}
              title={`${point.date} · ${point.created} créées · ${point.reviews} révisées`}
              className="relative min-w-[2px] flex-1 rounded-t-sm bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
              style={{ height: `${Math.max(height, point.created + point.reviews > 0 ? 3 : 1)}%` }}
            >
              <span
                className="absolute inset-x-0 bottom-0 rounded-t-sm bg-accent"
                style={{ height: `${reviewShare}%` }}
              />
            </span>
          );
        })}
      </div>
      <figcaption className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>{points[0]?.date ?? ""}</span>
        <span className="tabular-nums">{total} actions</span>
        <span>{points[points.length - 1]?.date ?? ""}</span>
      </figcaption>
      <p className="sr-only">
        Histogramme de l’activité : {total} actions sur {points.length} jours.
      </p>
    </figure>
  );
}

function RetentionChart({
  weeks,
}: {
  weeks: { week: string; rate: number; total: number }[];
}) {
  const width = 100;
  const height = 40;
  const points = weeks.map((week, index) => ({
    x: weeks.length === 1 ? 0 : (index / (weeks.length - 1)) * width,
    y: height - (week.rate / 100) * height,
    ...week,
  }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
  const average = weeks.filter((week) => week.total > 0);
  const mean =
    average.length > 0
      ? Math.round(average.reduce((sum, week) => sum + week.rate, 0) / average.length)
      : null;

  return (
    <figure>
      {mean === null ? (
        <Empty>Aucune révision enregistrée : la courbe apparaîtra à la première.</Empty>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="h-20 w-full"
            role="img"
            aria-label={`Rétention moyenne ${mean} % sur les semaines qui contiennent des révisions`}
          >
            <line
              x1="0"
              y1={height - (50 / 100) * height}
              x2={width}
              y2={height - (50 / 100) * height}
              stroke="var(--line)"
              strokeWidth="0.6"
              strokeDasharray="2 2"
            />
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            {points.map((point) => (
              <circle
                key={point.week}
                cx={point.x}
                cy={point.y}
                r="1.6"
                fill="var(--accent)"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
          <figcaption className="mt-1 flex justify-between text-[11px] text-muted">
            <span>{weeks[0]?.week}</span>
            <span className="font-semibold text-ink">{mean} % de moyenne</span>
            <span>{weeks[weeks.length - 1]?.week}</span>
          </figcaption>
        </>
      )}
    </figure>
  );
}

function ForecastChart({
  points,
  max,
}: {
  points: { date: string; count: number }[];
  max: number;
}) {
  return (
    <figure>
      <div className="flex h-20 items-end gap-1" aria-hidden>
        {points.map((point) => (
          <span
            key={point.date}
            title={`${point.date} · ${point.count} cartes`}
            className={cn(
              "flex-1 rounded-t-sm",
              point.count === 0 ? "bg-surface-2" : "bg-accent",
            )}
            style={{
              height: `${Math.max((point.count / max) * 100, point.count > 0 ? 6 : 2)}%`,
              opacity: point.count === 0 ? 1 : 0.35 + (point.count / max) * 0.65,
            }}
          />
        ))}
      </div>
      <figcaption className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>aujourd’hui</span>
        <span>{points[points.length - 1]?.date}</span>
      </figcaption>
    </figure>
  );
}
