import { useNavigate } from "react-router-dom";
import { AppBar, EmptyState, Screen } from "@/components/Layout";
import { ChartLineUp } from "@phosphor-icons/react";
import { useContentStore } from "@/stores/useContentStore";
import { dueCards, RATINGS } from "@/lib/scheduler";
import { METHODS, METHOD_ORDER } from "@/lib/methods";
import { seedLessons } from "@/data/seed";
import { timeAgo } from "@/lib/time";

export default function Progress() {
  const navigate = useNavigate();
  const notes = useContentStore((s) => s.notes);
  const questions = useContentStore((s) => s.questions);
  const cards = useContentStore((s) => s.cards);
  const logs = useContentStore((s) => s.logs);
  const zettel = useContentStore((s) => s.zettel);
  const progress = useContentStore((s) => s.progress);

  const live = notes.filter((n) => !n.deletedAt);
  const learned = logs.filter((l) => l.rating === "good" || l.rating === "easy");
  const retention = logs.length > 0 ? Math.round((learned.length / logs.length) * 100) : null;
  const lessonsDone = progress.filter((p) => p.doneAt).length;

  const perMethod = METHOD_ORDER.map((method) => ({
    method,
    count: live.filter((n) => n.method === method).length,
  }));
  const maxCount = Math.max(1, ...perMethod.map((m) => m.count));

  const stats = [
    { label: "Notes", value: live.length },
    { label: "Questions", value: questions.length },
    { label: "Cartes", value: cards.length },
    { label: "À revoir", value: dueCards(cards).length },
  ];

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar back onBack={() => navigate("/settings")} title="Mes progrès" center={false} />

      <p className="mt-1 text-[14px] leading-[21px] text-muted">
        Indicateurs calculés sur cet appareil. Ils ne sont jamais envoyés
        ailleurs.
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-field border border-line bg-surface py-3 text-center"
          >
            <div className="font-serif text-[20px] font-semibold">{stat.value}</div>
            <div className="text-[12px] leading-[16px] text-muted">{stat.label}</div>
          </div>
        ))}
      </div>

      <section className="mt-4 rounded-card bg-accent-soft p-4">
        <div className="text-[14px] font-semibold text-accent-ink">
          Réussite en séance
        </div>
        <div className="mt-1 font-serif text-[26px] font-semibold text-accent-ink">
          {retention === null ? "—" : `${retention} %`}
        </div>
        <p className="mt-1 text-[13px] leading-[19px] text-accent-ink">
          {retention === null
            ? "Faites une première séance de révision pour obtenir une mesure."
            : `${logs.length} évaluations enregistrées. Ce n’est pas une note : c’est un réglage d’intervalle.`}
        </p>
      </section>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Notes par méthode
      </h2>
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
        {perMethod.map(({ method, count }) => {
          const Icon = METHODS[method].icon;
          return (
            <div key={method} className="flex items-center gap-3">
              <span className="flex w-6 justify-center text-muted" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="w-[104px] shrink-0 text-[14px]">
                {METHODS[method].label}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </span>
              <span className="w-4 text-right text-[14px] font-semibold">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Apprentissage
      </h2>
      <div className="flex items-center justify-between rounded-card border border-line bg-surface p-4">
        <div>
          <div className="text-[15px] font-semibold">Leçons terminées</div>
          <div className="text-[13px] text-muted">
            sur {seedLessons.length} leçons
          </div>
        </div>
        <div className="font-serif text-[24px] font-semibold">
          {lessonsDone}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-card border border-line bg-surface p-4 mt-2">
        <div>
          <div className="text-[15px] font-semibold">Cartes Zettelkasten</div>
          <div className="text-[13px] text-muted">
            réparties dans vos vaults
          </div>
        </div>
        <div className="font-serif text-[24px] font-semibold">{zettel.length}</div>
      </div>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Dernières révisions
      </h2>
      {logs.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            icon={ChartLineUp}
            title="Pas encore de séance"
            description="Vos évaluations apparaîtront ici, sans quitter l’appareil."
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.slice(0, 6).map((log) => {
            const card = cards.find((c) => c.id === log.cardId);
            const question = questions.find((q) => q.id === card?.questionId);
            const rating = RATINGS.find((r) => r.value === log.rating);
            return (
              <li
                key={log.id}
                className="flex items-start gap-3 rounded-card border border-line bg-surface p-3.5"
              >
                <span className="mt-0.5 w-14 shrink-0 text-[13px] font-semibold text-accent">
                  {rating?.label ?? "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-[14px] leading-[20px]">
                    {question?.text ?? "Carte supprimée"}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted">
                    {timeAgo(log.reviewedAt)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="h-10" aria-hidden="true" />
    </Screen>
  );
}
