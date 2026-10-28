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
  ratingBreakdown,
  regularity,
  weekdayRhythm,
  type Period,
} from "@/lib/stats";
import { METHODS } from "@/lib/methods";
import {
  ActivityChart,
  ForecastChart,
  RatingBar,
  RegularityHeatmap,
  RetentionChart,
  RhythmChart,
} from "@/components/stats/Charts";
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
  const heatmap = useMemo(() => regularity(live, logs, 13, now), [live, logs, now]);
  const rhythm = useMemo(() => weekdayRhythm(logs), [logs]);
  const ratings = useMemo(() => ratingBreakdown(logs, since), [logs, since]);
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
        <ActivityChart points={activity} />
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Rétention par semaine" hint="part des révisions réussies, 8 semaines">
          <RetentionChart weeks={weeks} />
        </Panel>

        <Panel
          title="Charge à venir"
          hint={`${forecast.reduce((sum, point) => sum + point.count, 0)} cartes sur 14 jours`}
        >
          <ForecastChart points={forecast} />
        </Panel>
      </div>

      <div className="mt-3">
        <Panel
          title="Régularité"
          hint="une case par jour, trois mois — les trous comptent autant que les pics"
        >
          <RegularityHeatmap weeks={heatmap} />
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Rythme" hint="révisions par jour de la semaine, tout l’historique">
          <RhythmChart rhythm={rhythm} />
        </Panel>

        <Panel
          title="Notes de révision"
          hint={`${ratings.reduce((sum, row) => sum + row.count, 0)} réponses sur ${period} jours`}
        >
          <RatingBar rows={ratings} />
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
                    <td className="py-1.5 pl-2 text-right tabular-nums text-muted">
                      {row.retention ? (
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                            <span
                              className="block h-full rounded-full bg-accent"
                              style={{ width: `${row.retention.rate}%` }}
                            />
                          </span>
                          {row.retention.rate} %
                        </span>
                      ) : (
                        "—"
                      )}
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
