import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Eye, Sparkle, X } from "@phosphor-icons/react";
import { Screen } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import {
  RATINGS,
  dueCards,
  formatInterval,
  previewInterval,
} from "@/lib/scheduler";
import { METHODS } from "@/lib/methods";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import type { Rating } from "@/types";

export default function Review() {
  const navigate = useNavigate();
  const cards = useContentStore((s) => s.cards);
  const questions = useContentStore((s) => s.questions);
  const links = useContentStore((s) => s.links);
  const notes = useContentStore((s) => s.notes);
  const rateCard = useContentStore((s) => s.rateCard);
  const desktop = useIsDesktop();

  const [session, setSession] = useState<string[]>(() =>
    dueCards(cards).map((card) => card.id),
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState<Record<Rating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [leaving, setLeaving] = useState(false);

  const card = cards.find((c) => c.id === session[index]);
  const question = questions.find((q) => q.id === card?.questionId);
  const link = links.find((l) => l.id === card?.linkId);
  const note = notes.find((n) => n.id === card?.noteId);

  const siblings = useMemo(
    () => links.filter((l) => l.questionId === card?.questionId),
    [links, card?.questionId],
  );
  const siblingIndex = Math.max(
    1,
    siblings.findIndex((l) => l.id === card?.linkId) + 1,
  );

  useEffect(() => {
    setRevealed(false);
  }, [index]);

  /* Notation : hoistée au-dessus des sorties anticipées, sinon le raccourci
     clavier violerait l’ordre des hooks (une carte absente ne doit pas
     changer le nombre de hooks appelés). */
  const rate = useCallback(
    (rating: Rating) => {
      if (!card) return;
      rateCard(card.id, rating);
      setStats((s) => ({ ...s, [rating]: s[rating] + 1 }));
      setLeaving(true);
      window.setTimeout(() => {
        setLeaving(false);
        setRevealed(false);
        setIndex((i) => i + 1);
      }, 180);
    },
    [card, rateCard],
  );

  /* Bureau : Espace révèle la réponse, 1–4 notent sans lâcher le clavier. */
  useEffect(() => {
    if (!desktop) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (event.key === " " || event.key === "Enter") {
        if (!revealed) {
          event.preventDefault();
          setRevealed(true);
        }
        return;
      }
      const position = ["1", "2", "3", "4"].indexOf(event.key);
      if (revealed && position >= 0 && RATINGS[position]) {
        event.preventDefault();
        rate(RATINGS[position].value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [desktop, revealed, rate]);

  if (session.length === 0) {
    return <EmptySession onClose={() => navigate("/")} />;
  }

  if (!card || index >= session.length) {
    return (
      <Summary
        total={session.length}
        stats={stats}
        onClose={() => navigate("/")}
        onProgress={() => navigate("/settings/progress")}
      />
    );
  }

  const methodLabel = note ? METHODS[note.method].label : "Révision";

  return (
    <Screen className="px-5">
      <header className="flex items-center gap-3 pb-1 pt-3">
        <button
          type="button"
          aria-label="Fermer la séance"
          onClick={() => navigate("/")}
          className="icon-btn -ml-2.5"
        >
          <X size={24} weight="bold" />
        </button>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={session.length}
          aria-valuenow={index + 1}
          aria-label="Progression de la séance"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${((index + 1) / session.length) * 100}%` }}
          />
        </div>
        <div className="text-[15px] font-semibold">
          {index + 1} / {session.length}
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div
        className={cn(
          "mt-5 flex min-h-[430px] flex-col rounded-big border border-line bg-surface p-[26px] shadow-card transition-all duration-200",
          leaving && "-translate-y-2 opacity-0",
        )}
      >
        <div className="self-start rounded-rect bg-accent-soft px-2.5 py-1 text-[14px] font-semibold text-accent-ink">
          {methodLabel}
          {note ? ` · ${note.title}` : ""}
        </div>

        <h1 className="mt-4 font-serif text-[23px] font-semibold leading-[32px]">
          {question?.text ?? "Question introuvable"}
        </h1>
        <p className="mt-1.5 text-[14px] text-muted">
          Élément {siblingIndex} sur {siblings.length || 1}
        </p>

        <hr className="my-5 border-0 border-t border-line" />

        {revealed ? (
          <div className="animate-fade-in">
            <p className="mb-2.5 text-[14px] font-semibold text-muted">
              Ce que vous aviez écrit
            </p>
            <p className="passage rounded-[4px] px-2.5 py-1.5 font-serif text-[18px] leading-[30px]">
              {link?.passage ?? "—"}
            </p>
            <button
              type="button"
              onClick={() => {
                if (note && question) {
                  navigate(`/note/${note.id}?q=${question.id}`);
                }
              }}
              className="mt-4 text-[15px] font-medium text-accent"
            >
              Voir dans la note ›
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center pb-2 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Eye size={24} weight="duotone" />
            </div>
            <p className="max-w-[30ch] text-[15px] leading-[22px] text-muted">
              Répondez de mémoire, à voix haute. Puis affichez ce que vous
              aviez écrit.
            </p>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="btn-primary mt-5 w-full"
            >
              Afficher la réponse
            </button>
          </div>
        )}
      </div>

      {desktop && (
        <div className="mt-5 rounded-big border border-line bg-surface p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">
            Contexte
          </p>
          <p className="mt-1 font-serif text-[17px] font-semibold leading-snug">
            {note?.title ?? "Note supprimée"}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            {methodLabel} · élément {siblingIndex} sur {siblings.length || 1}
          </p>
          {note && (
            <button
              type="button"
              onClick={() => navigate(`/note/${note.id}`)}
              className="mt-3 text-[13.5px] font-medium text-accent hover:underline"
            >
              Ouvrir la note
            </button>
          )}
          <hr className="my-4 border-0 border-t border-line" />
          <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">
            Clavier
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-muted">
            <li className="flex items-center justify-between gap-3">
              <span>Révéler la réponse</span>
              <kbd className="kbd">Espace</kbd>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Noter de 1 à 4</span>
              <span className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <kbd key={n} className="kbd">
                    {n}
                  </kbd>
                ))}
              </span>
            </li>
          </ul>
        </div>
      )}

      {revealed && (
        <div className="animate-sheet-up lg:col-start-1">
          <p className="mb-2.5 mt-5 text-center text-[15px] font-semibold">
            Comment était-ce ?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((rating) => {
              const interval = previewInterval(card, rating.value);
              const recommended = rating.value === "good";
              return (
                <button
                  key={rating.value}
                  type="button"
                  onClick={() => rate(rating.value)}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center rounded-field text-[15px] font-semibold transition-transform active:scale-95",
                    recommended
                      ? "border-2 border-accent bg-accent-soft text-accent-ink"
                      : "border border-line-strong bg-surface text-ink",
                  )}
                >
                  {rating.label}
                  <span
                    className={cn(
                      "text-[14px] font-normal",
                      recommended ? "text-accent-ink" : "text-muted",
                    )}
                  >
                    {formatInterval(interval)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      </div>
      <div className="h-8" aria-hidden="true" />
    </Screen>
  );
}

function EmptySession({ onClose }: { onClose: () => void }) {
  return (
    <Screen className="px-5">
      <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-accent-soft text-accent">
          <Sparkle size={28} weight="duotone" />
        </div>
        <h1 className="font-serif text-[24px] font-semibold">
          Rien à revoir aujourd’hui
        </h1>
        <p className="mt-2 max-w-[34ch] text-[15px] leading-[22px] text-muted">
          Vos cartes reviennent au bon moment. Revenez demain, ou ajoutez des
          questions à une note.
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-6">
          Retour à la bibliothèque
        </button>
      </div>
    </Screen>
  );
}

function Summary({
  total,
  stats,
  onClose,
  onProgress,
}: {
  total: number;
  stats: Record<Rating, number>;
  onClose: () => void;
  onProgress: () => void;
}) {
  return (
    <Screen className="px-5">
      <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-accent-soft text-accent">
          <CheckCircle size={32} weight="duotone" />
        </div>
        <h1 className="font-serif text-[26px] font-semibold">Séance terminée</h1>
        <p className="mt-2 text-[15px] leading-[22px] text-muted">
          {total} carte{total > 1 ? "s" : ""} revue{total > 1 ? "s" : ""}.
          <br />
          Les intervalles sont recalculés pour chaque carte.
        </p>

        <div className="mt-6 grid w-full max-w-[320px] grid-cols-4 gap-2">
          {RATINGS.map((rating) => (
            <div
              key={rating.value}
              className="rounded-field border border-line bg-surface py-3"
            >
              <div className="font-serif text-[20px] font-semibold">
                {stats[rating.value]}
              </div>
              <div className="text-[12px] text-muted">{rating.label}</div>
            </div>
          ))}
        </div>

        <button type="button" onClick={onClose} className="btn-primary mt-7 w-full">
          Retour à la bibliothèque
        </button>
        <button
          type="button"
          onClick={onProgress}
          className="mt-1 h-11 text-[15px] font-medium text-accent"
        >
          Voir mes progrès
        </button>
      </div>
    </Screen>
  );
}
