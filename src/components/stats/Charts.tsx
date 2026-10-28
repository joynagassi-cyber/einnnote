import type { ActivityPoint, HeatmapWeek, RatingCount, WeekdayRhythm } from "@/lib/stats";
import { cn } from "@/lib/utils";

/**
 * Graphiques des statistiques — SVG écrit à la main, couleurs du thème.
 *
 * Trois règles, et elles viennent de l’écran, pas du goût :
 *
 * 1. **Aucune couleur en dur.** Tout passe par `var(--accent)`, `var(--line)`,
 *    `var(--surface-2)` : un changement de palette repeint les graphiques sans
 *    qu’on y touche, et les thèmes sombres restent lisibles.
 * 2. **Une valeur, une échelle.** Chaque graphique calcule son maximum à partir
 *    des données qu’il reçoit ; rien n’est normalisé « au feeling ».
 * 3. **Lisible sans la souris.** Chaque série porte un résumé `sr-only`, et
 *    l’infobulle (`<title>`) n’est qu’un bonus.
 */

const ACCENT = "var(--accent)";
const LINE = "var(--line)";
const SURFACE = "var(--surface-2)";

/* ------------------------------------------------------------------ */
/* Activité : barres + moyenne mobile                                  */
/* ------------------------------------------------------------------ */

export function ActivityChart({ points }: { points: ActivityPoint[] }) {
  const totals = points.map((point) => point.created + point.reviews);
  const max = Math.max(1, ...totals);
  const width = 320;
  const height = 96;
  const gap = points.length > 60 ? 0.5 : 1.5;
  const step = points.length > 0 ? width / points.length : width;
  const barWidth = Math.max(1, step - gap);

  /* Moyenne mobile sur 7 jours : elle répond à « est-ce que je tiens le
     rythme », que les barres seules ne disent pas. */
  const window = 7;
  const moving = points.map((_, index) => {
    const from = Math.max(0, index - window + 1);
    const slice = totals.slice(from, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
  const movingPath = moving
    .map((value, index) => {
      const x = index * step + step / 2;
      const y = height - (value / max) * (height - 6);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const reviewTotal = points.reduce((sum, point) => sum + point.reviews, 0);
  const createdTotal = points.reduce((sum, point) => sum + point.created, 0);

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        role="img"
        aria-label={`Activité sur ${points.length} jours : ${createdTotal} notes créées, ${reviewTotal} révisions.`}
      >
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={width}
            y1={height - ratio * (height - 6)}
            y2={height - ratio * (height - 6)}
            stroke={LINE}
            strokeWidth="0.5"
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {points.map((point, index) => {
          const total = point.created + point.reviews;
          const barHeight = (total / max) * (height - 6);
          const reviewShare = total === 0 ? 0 : (point.reviews / total) * barHeight;
          const x = index * step + gap / 2;
          return (
            <g key={point.date}>
              <title>{`${point.date} · ${point.created} créées · ${point.reviews} révisées`}</title>
              <rect
                x={x}
                y={height - barHeight}
                width={barWidth}
                height={Math.max(barHeight, total > 0 ? 1.2 : 0.6)}
                rx={barWidth > 3 ? 1 : 0}
                fill="color-mix(in srgb, var(--accent) 30%, transparent)"
              />
              <rect
                x={x}
                y={height - reviewShare}
                width={barWidth}
                height={reviewShare}
                rx={barWidth > 3 ? 1 : 0}
                fill={ACCENT}
              />
            </g>
          );
        })}

        <path
          d={movingPath}
          fill="none"
          stroke="var(--ink)"
          strokeOpacity="0.55"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <figcaption className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="tabular-nums">{points[0]?.date}</span>
        <span className="flex flex-wrap items-center gap-3">
          <Legend color={ACCENT} label={`${reviewTotal} révisions`} />
          <Legend color="color-mix(in srgb, var(--accent) 30%, transparent)" label={`${createdTotal} notes`} />
          <Legend color="var(--ink)" label="moyenne 7 j" line />
        </span>
        <span className="tabular-nums">{points[points.length - 1]?.date}</span>
      </figcaption>
      <span className="sr-only">
        Maximum {max} actions sur une journée.
      </span>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Régularité : une case par jour                                      */
/* ------------------------------------------------------------------ */

const WEEKDAY_INITIALS = ["L", "M", "M", "J", "V", "S", "D"];

export function RegularityHeatmap({
  weeks,
  onSelect,
}: {
  weeks: HeatmapWeek[];
  /** un jour cliqué renvoie sa date `YYYY-MM-DD` */
  onSelect?: (date: string) => void;
}) {
  const counts = weeks.flatMap((week) => week.days.map((day) => day.count)).filter((count) => count >= 0);
  const max = Math.max(1, ...counts);
  const active = counts.filter((count) => count > 0).length;

  const shade = (count: number) => {
    if (count < 0) return "transparent";
    if (count === 0) return SURFACE;
    const ratio = count / max;
    const percent = 18 + Math.round(ratio * 82);
    return `color-mix(in srgb, ${ACCENT} ${percent}%, var(--surface-2))`;
  };

  return (
    <figure>
      <div className="flex gap-1.5">
        <div className="flex flex-col gap-[3px] pt-[0.5px] text-[9px] leading-none text-muted" aria-hidden>
          {WEEKDAY_INITIALS.map((initial, index) => (
            <span key={index} className="flex h-[11px] items-center">
              {initial}
            </span>
          ))}
        </div>
        <div
          className="flex flex-1 gap-[3px] overflow-hidden"
          role="img"
          aria-label={`Régularité : ${active} jours actifs sur ${counts.length} jours affichés.`}
        >
          {weeks.map((week, index) => (
            <div key={index} className="flex flex-1 flex-col gap-[3px]">
              {week.days.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  disabled={day.count < 0 || !onSelect}
                  onClick={() => onSelect?.(day.date)}
                  title={`${day.date} · ${day.count < 0 ? "à venir" : `${day.count} action${day.count > 1 ? "s" : ""}`}`}
                  aria-label={`${day.date} : ${day.count < 0 ? "à venir" : `${day.count} action${day.count > 1 ? "s" : ""}`}`}
                  className={cn(
                    "h-[11px] w-full rounded-[3px] transition-transform",
                    day.count >= 0 && onSelect && "hover:scale-110",
                    day.count < 0 && "opacity-30",
                  )}
                  style={{
                    background: shade(day.count),
                    border: day.count === 0 ? `1px solid ${LINE}` : "none",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <figcaption className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>
          {active} jour{active > 1 ? "s" : ""} actif{active > 1 ? "s" : ""} sur {counts.length}
        </span>
        <span className="flex items-center gap-1">
          moins
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <span
              key={ratio}
              className="h-[9px] w-[9px] rounded-[2px]"
              style={{
                background:
                  ratio === 0
                    ? SURFACE
                    : `color-mix(in srgb, ${ACCENT} ${Math.round(18 + ratio * 82)}%, var(--surface-2))`,
                border: ratio === 0 ? `1px solid ${LINE}` : "none",
              }}
              aria-hidden
            />
          ))}
          plus
        </span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Rythme : quel jour de la semaine travaillez-vous ?                  */
/* ------------------------------------------------------------------ */

const WEEKDAY_LABELS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

export function RhythmChart({ rhythm }: { rhythm: WeekdayRhythm[] }) {
  const max = Math.max(1, ...rhythm.map((entry) => entry.reviews));
  const total = rhythm.reduce((sum, entry) => sum + entry.reviews, 0);
  const best = rhythm.reduce((a, b) => (b.reviews > a.reviews ? b : a), rhythm[0]);

  if (total === 0) {
    return <EmptyChart text="Aucune révision : le rythme apparaîtra à la première." />;
  }

  return (
    <figure>
      <div className="flex h-24 items-end gap-1.5" role="img" aria-label={`Révisions par jour de la semaine, maximum ${WEEKDAY_LABELS[best.weekday]} avec ${best.reviews}.`}>
        {rhythm.map((entry) => (
          <span key={entry.weekday} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-muted">{entry.reviews}</span>
            <span
              className={cn(
                "w-full rounded-t-sm",
                entry.weekday === best.weekday ? "bg-accent" : "bg-[color-mix(in_srgb,var(--accent)_38%,transparent)]",
              )}
              style={{ height: `${Math.max((entry.reviews / max) * 100, entry.reviews > 0 ? 4 : 1)}%` }}
              title={`${WEEKDAY_LABELS[entry.weekday]} · ${entry.reviews} révisions`}
            />
            <span className="text-[10px] uppercase tracking-wide text-muted">
              {WEEKDAY_LABELS[entry.weekday]}
            </span>
          </span>
        ))}
      </div>
      <figcaption className="mt-1 text-[11px] text-muted">
        Jour le plus actif : <strong className="font-semibold text-ink">{WEEKDAY_LABELS[best.weekday]}</strong> ·{" "}
        {Math.round((best.reviews / total) * 100)} % des révisions.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Notes FSRS                                                          */
/* ------------------------------------------------------------------ */

const RATING_META: Record<RatingCount["rating"], { label: string; shade: string }> = {
  again: { label: "Encore", shade: "color-mix(in srgb, var(--accent) 26%, var(--surface-2))" },
  hard: { label: "Difficile", shade: "color-mix(in srgb, var(--accent) 48%, var(--surface-2))" },
  good: { label: "Bien", shade: "color-mix(in srgb, var(--accent) 74%, var(--surface-2))" },
  easy: { label: "Facile", shade: "var(--accent)" },
};

export function RatingBar({ rows }: { rows: RatingCount[] }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) {
    return <EmptyChart text="Aucune note enregistrée pour l’instant." />;
  }

  return (
    <figure>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Répartition des réponses de révision">
        {rows.map((row) => (
          <span
            key={row.rating}
            title={`${RATING_META[row.rating].label} · ${row.count}`}
            style={{
              width: `${(row.count / total) * 100}%`,
              background: RATING_META[row.rating].shade,
            }}
          />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map((row) => (
          <li key={row.rating} className="flex items-center gap-1.5 text-[11.5px]">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ background: RATING_META[row.rating].shade }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-muted">{RATING_META[row.rating].label}</span>
            <span className="tabular-nums font-medium text-ink">
              {total === 0 ? "—" : `${Math.round((row.count / total) * 100)} %`}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Échéances                                                           */
/* ------------------------------------------------------------------ */

export function ForecastChart({
  points,
  onSelect,
}: {
  points: { date: string; count: number }[];
  onSelect?: (date: string) => void;
}) {
  const max = Math.max(1, ...points.map((point) => point.count));
  const total = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <figure>
      <div className="flex h-24 items-end gap-1" role="img" aria-label={`Charge à venir : ${total} cartes sur ${points.length} jours.`}>
        {points.map((point) => {
          const [, , day] = point.date.split("-");
          return (
            <button
              key={point.date}
              type="button"
              onClick={() => onSelect?.(point.date)}
              title={`${point.date} · ${point.count} carte${point.count > 1 ? "s" : ""}`}
              className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[9.5px] tabular-nums text-muted opacity-0 transition-opacity group-hover:opacity-100">
                {point.count || ""}
              </span>
              <span
                className={cn(
                  "w-full rounded-t-sm transition-colors",
                  point.count === 0 ? "bg-surface-2" : "bg-accent group-hover:opacity-80",
                )}
                style={{ height: `${Math.max((point.count / max) * 100, point.count > 0 ? 6 : 2)}%` }}
              />
              <span className="text-[9.5px] tabular-nums text-muted">{Number(day)}</span>
            </button>
          );
        })}
      </div>
      <figcaption className="mt-1 flex items-center justify-between text-[11px] text-muted">
        <span>aujourd’hui</span>
        <span className="tabular-nums">pic : {max}</span>
        <span>{points[points.length - 1]?.date}</span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Rétention                                                           */
/* ------------------------------------------------------------------ */

export function RetentionChart({
  weeks,
}: {
  weeks: { week: string; rate: number; total: number }[];
}) {
  const measured = weeks.filter((week) => week.total > 0);
  const mean =
    measured.length > 0
      ? Math.round(measured.reduce((sum, week) => sum + week.rate, 0) / measured.length)
      : null;

  if (mean === null) {
    return <EmptyChart text="Aucune révision enregistrée : la courbe apparaîtra à la première." />;
  }

  const width = 320;
  const height = 120;
  const padding = { top: 8, right: 4, bottom: 4, left: 4 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (index: number) =>
    padding.left + (weeks.length <= 1 ? plotWidth / 2 : (index / (weeks.length - 1)) * plotWidth);
  const y = (rate: number) => padding.top + plotHeight - (rate / 100) * plotHeight;

  const path = weeks
    .map((week, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(week.rate).toFixed(1)}`)
    .join(" ");

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
        role="img"
        aria-label={`Rétention hebdomadaire, moyenne ${mean} % sur ${measured.length} semaine${measured.length > 1 ? "s" : ""} mesurée${measured.length > 1 ? "s" : ""}.`}
      >
        {[100, 50, 0].map((rate) => (
          <g key={rate}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(rate)}
              y2={y(rate)}
              stroke={LINE}
              strokeWidth={rate === 50 ? "1" : "0.5"}
              strokeDasharray={rate === 50 ? "3 3" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        <path
          d={`${path} L${x(weeks.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
          fill="color-mix(in srgb, var(--accent) 10%, transparent)"
        />
        <path
          d={path}
          fill="none"
          stroke={ACCENT}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {weeks.map((week, index) => (
          <g key={week.week}>
            <title>{`semaine du ${week.week} · ${week.total === 0 ? "aucune révision" : `${week.rate} % sur ${week.total}`}`}</title>
            <circle
              cx={x(index)}
              cy={y(week.rate)}
              r={week.total === 0 ? 0 : 2}
              fill={week.total === 0 ? "transparent" : ACCENT}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 flex items-center justify-between text-[11px] text-muted">
        <span>{weeks[0]?.week}</span>
        <span className="tabular-nums">
          {mean} % de moyenne · {measured.reduce((sum, week) => sum + week.total, 0)} révisions
        </span>
        <span>{weeks[weeks.length - 1]?.week}</span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Briques                                                             */
/* ------------------------------------------------------------------ */

function Legend({ color, label, line = false }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className={cn("shrink-0", line ? "h-[2px] w-3 rounded-full" : "h-2 w-2 rounded-sm")}
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <p className="rounded-field bg-surface-2 px-3 py-6 text-center text-[12.5px] leading-[18px] text-muted">
      {text}
    </p>
  );
}
