import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellSlash,
  Brain,
  CheckCircle,
  ClockCounterClockwise,
  Info,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { AppBar, Screen, Segmented } from "@/components/Layout";
import { useAppStore } from "@/stores/useAppStore";
import { useContentStore } from "@/stores/useContentStore";
import {
  DEFAULT_REVIEW_SETTINGS,
  formatInterval,
  previewAll,
  reviewSettings,
  dueCards,
} from "@/lib/scheduler";
import { allReviewItems } from "@/lib/review";
import { useToast } from "@/stores/useToast";
import { cn } from "@/lib/utils";
import type { ReviewSettings } from "@/types";

/**
 * Réglages de la révision espacée.
 *
 * Deux blocs, deux responsabilités :
 * 1. **l’algorithme** (FSRS) — la rétention visée change réellement les
 *    intervalles ; un aperçu chiffré le montre avant l’enregistrement ;
 * 2. **les rappels** — plafonds quotidiens et heure du rappel dans l’app.
 *
 * Aucun contrôle décoratif : chaque réglage est lu par `planSession()` ou par
 * `reminderDue()`. Les valeurs par défaut sont celles de FSRS-5 (0,90).
 */
export default function ReviewSettingsPage() {
  const navigate = useNavigate();
  const stored = useAppStore((s) => s.settings.review);
  const setReview = useAppStore((s) => s.setReview);
  const setReminder = useAppStore((s) => s.setReminder);
  const resetReview = useAppStore((s) => s.resetReview);
  const settings = reviewSettings(stored);
  const showToast = useToast((s) => s.show);

  const notes = useContentStore((s) => s.notes);
  const questions = useContentStore((s) => s.questions);
  const links = useContentStore((s) => s.links);
  const cards = useContentStore((s) => s.cards);
  const zettel = useContentStore((s) => s.zettel);
  const vaults = useContentStore((s) => s.vaults);
  const projects = useContentStore((s) => s.projects);

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () =>
      typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const due = dueCards(cards).length;
  const items = useMemo(
    () => allReviewItems({ notes, questions, links, cards, zettel, vaults, projects }),
    [notes, questions, links, cards, zettel, vaults, projects],
  );

  /* Un exemple réel : la carte la plus proche de l’échéance. Les quatre
     intervalles sont recalculés à chaque changement de rétention, avec la
     même fonction que la séance — pas une maquette. */
  const sample = items[0];
  const intervals = useMemo(
    () => (sample ? previewAll(sample.schedule, { retention: settings.retention }) : null),
    [sample, settings.retention],
  );

  const patch = (next: Partial<ReviewSettings>) => setReview(next);

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") {
      showToast("Ce navigateur ne gère pas les notifications.", "accent");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    setReminder({ notifications: result === "granted" });
    showToast(
      result === "granted"
        ? "Notifications autorisées."
        : "Notifications refusées : le rappel restera dans l’application.",
      "accent",
    );
  };

  return (
    <Screen className="screen-narrow px-5">
      <AppBar back onBack={() => navigate("/settings")} title="Révision" />

      <p className="mt-1 text-[13.5px] leading-[20px] text-muted">
        L’algorithme est <strong className="text-ink">FSRS-5</strong> (via{" "}
        <code className="font-mono text-[12.5px]">ts-fsrs</code>, poids par défaut).
        Il estime la probabilité que vous retrouviez une carte, puis choisit
        l’intervalle qui atteint votre rétention cible.
      </p>

      <section className="mt-4 rounded-big border border-line bg-surface p-4">
        <div className="flex items-start gap-2.5">
          <span className="tile h-9 w-9 shrink-0" aria-hidden>
            <Brain size={18} weight="duotone" className="text-accent" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[18px] font-semibold">Rétention visée</h2>
            <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
              Plus la cible est haute, plus les cartes reviennent souvent. 0,90 est
              le compromis recommandé par FSRS.
            </p>
          </div>
          <span className="tabnum shrink-0 rounded-rect bg-accent-soft px-2 py-1 text-[13.5px] font-semibold text-accent-ink">
            {Math.round(settings.retention * 100)} %
          </span>
        </div>

        <label className="mt-3 block">
          <span className="sr-only">Rétention visée</span>
          <input
            type="range"
            min={80}
            max={97}
            step={1}
            value={Math.round(settings.retention * 100)}
            onChange={(event) => patch({ retention: Number(event.target.value) / 100 })}
            className="w-full accent-[var(--accent)]"
          />
          <span className="mt-1 flex justify-between text-[11.5px] text-muted">
            <span>80 % · moins de cartes</span>
            <span>97 % · plus de cartes</span>
          </span>
        </label>

        {intervals && (
          <div className="mt-3 rounded-card bg-bg px-3 py-2.5">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
              Aperçu sur « {sample.title.slice(0, 44)}
              {sample.title.length > 44 ? "…" : ""} »
            </p>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-center">
              {(
                [
                  ["again", "Encore"],
                  ["hard", "Difficile"],
                  ["good", "Bien"],
                  ["easy", "Facile"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <div className="tabnum text-[13.5px] font-semibold">
                    {formatInterval(intervals[key])}
                  </div>
                  <div className="text-[11px] text-muted">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-3 rounded-big border border-line bg-surface p-4">
        <div className="flex items-start gap-2.5">
          <span className="tile h-9 w-9 shrink-0" aria-hidden>
            <SlidersHorizontal size={18} weight="duotone" className="text-accent" />
          </span>
          <div>
            <h2 className="font-serif text-[18px] font-semibold">Charge quotidienne</h2>
            <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
              {due} carte{due > 1 ? "s" : ""} due{due > 1 ? "s" : ""} maintenant. Les
              plafonds s’appliquent par jour civil, pas par séance.
            </p>
          </div>
        </div>

        <Stepper
          label="Nouvelles cartes par jour"
          value={settings.dailyNew}
          min={0}
          max={100}
          step={5}
          onChange={(dailyNew) => patch({ dailyNew })}
        />
        <Stepper
          label="Révisions par jour (plafond)"
          value={settings.dailyReview}
          min={0}
          max={500}
          step={25}
          onChange={(dailyReview) => patch({ dailyReview })}
        />

        <div className="mt-4">
          <h3 className="mb-1.5 text-[13.5px] font-semibold">Ordre de la séance</h3>
          <Segmented
            value={settings.order}
            onChange={(order) => patch({ order })}
            options={[
              { value: "due", label: "Échéance" },
              { value: "random", label: "Mélangé" },
            ]}
            label="Ordre de la séance"
          />
        </div>

        <label className="mt-4 flex items-start justify-between gap-3">
          <span>
            <span className="block text-[13.5px] font-semibold">
              Afficher les intervalles
            </span>
            <span className="block text-[12px] leading-[17px] text-muted">
              Sous chaque bouton : « 3 j », « 1,4 an ». Sert à comprendre l’algorithme.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.showIntervals}
            onChange={(event) => patch({ showIntervals: event.target.checked })}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
            aria-label="Afficher les intervalles"
          />
        </label>
      </section>

      <section className="mt-3 rounded-big border border-line bg-surface p-4">
        <div className="flex items-start gap-2.5">
          <span className="tile h-9 w-9 shrink-0" aria-hidden>
            {settings.reminder.enabled ? (
              <Bell size={18} weight="duotone" className="text-accent" />
            ) : (
              <BellSlash size={18} weight="duotone" className="text-muted" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[18px] font-semibold">Rappel quotidien</h2>
            <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
              Un rappel dans l’application à l’heure choisie, seulement s’il reste
              des cartes dues. Rien n’est envoyé sur un serveur.
            </p>
          </div>
        </div>

        <label className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[13.5px] font-semibold">Activer le rappel</span>
          <input
            type="checkbox"
            checked={settings.reminder.enabled}
            onChange={(event) => setReminder({ enabled: event.target.checked })}
            className="h-5 w-5 accent-[var(--accent)]"
            aria-label="Activer le rappel quotidien"
          />
        </label>

        <label className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[13.5px]">Heure du rappel</span>
          <input
            type="time"
            value={settings.reminder.time}
            onChange={(event) => setReminder({ time: event.target.value })}
            className="field h-10 w-[118px] px-3 text-[14px]"
            aria-label="Heure du rappel"
          />
        </label>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-[13.5px]">Notification système</span>
            <span className="block text-[11.5px] leading-[16px] text-muted">
              {permission === "granted"
                ? "Autorisée. Affichée à l’ouverture si le rappel est passé."
                : permission === "unsupported"
                  ? "Indisponible dans ce navigateur."
                  : "Nécessite votre autorisation."}
            </span>
          </span>
          <button
            type="button"
            onClick={requestNotifications}
            disabled={permission === "granted" || permission === "unsupported"}
            className={cn(
              "shrink-0 rounded-rect border px-3 py-2 text-[12.5px] font-semibold",
              permission === "granted"
                ? "border-line text-muted"
                : "border-line-strong text-ink",
            )}
          >
            {permission === "granted" ? "Autorisée" : "Autoriser"}
          </button>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-[17px] text-muted">
          <Info size={14} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
          Un rappel système ne peut partir que lorsque l’application est ouverte :
          sans service worker ni serveur, une page fermée ne peut rien programmer.
        </p>
      </section>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() =>
            navigate(due > 0 ? "/review" : "/review/session?scope=all&mode=all")
          }
          className="btn-primary h-12"
        >
          <ClockCounterClockwise size={18} weight="bold" aria-hidden />
          {due > 0 ? "Réviser maintenant" : "Réviser malgré tout"}
        </button>
        <button
          type="button"
          onClick={() => {
            resetReview();
            showToast("Réglages de révision remis à zéro.", "accent");
          }}
          className="h-11 text-[13.5px] font-medium text-muted"
        >
          Revenir aux valeurs par défaut
        </button>
        <p className="mb-4 flex items-center justify-center gap-1.5 text-[12px] text-muted">
          <CheckCircle size={14} weight="duotone" aria-hidden />
          Par défaut : {Math.round(DEFAULT_REVIEW_SETTINGS.retention * 100)} % ·{" "}
          {DEFAULT_REVIEW_SETTINGS.dailyNew} nouvelles ·{" "}
          {DEFAULT_REVIEW_SETTINGS.dailyReview} révisions
        </p>
      </div>
    </Screen>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <span className="text-[13.5px]">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Diminuer : ${label}`}
          className="icon-btn h-9 w-9 border border-line"
        >
          −
        </button>
        <span className="tabnum w-10 text-center text-[15px] font-semibold">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label={`Augmenter : ${label}`}
          className="icon-btn h-9 w-9 border border-line"
        >
          +
        </button>
      </div>
    </div>
  );
}
