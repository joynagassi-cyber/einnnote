import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useReviewStore } from "@/stores/useReviewStore";
import { useNoteStore } from "@/stores/useNoteStore";
import { useAppStore } from "@/stores/useAppStore";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeaderBar } from "@/components/ui/HeaderBar";
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  SmileyMelting,
  CheckCircle,
  FlagBanner,
  XCircle,
} from "@phosphor-icons/react";
import { ReviewRating } from "@/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const RATINGS: { value: ReviewRating; label: string; sub: string; icon: typeof XCircle; color: string }[] = [
  { value: "again", label: "Encore", sub: "Réviser maintenant", icon: XCircle, color: "text-red-500" },
  { value: "hard", label: "Difficile", sub: "Encore un peu", icon: FlagBanner, color: "text-orange-500" },
  { value: "good", label: "Bien", sub: "Presque acquis", icon: CheckCircle, color: "text-blue-500" },
  { value: "easy", label: "Facile", sub: "Très bien", icon: SmileyMelting, color: "text-green-500" },
];

export default function ReviewPage() {
  const navigate = useNavigate();
  const { reviewCards, getDueToday, review, currentCardIndex, sessionComplete, resetSession } = useReviewStore();
  const { getQuestionsForNote, getZettelCard } = useNoteStore();
  const [flipped, setFlipped] = useState(false);

  const dueCards = getDueToday();
  const card = dueCards[currentCardIndex];

  const question = card?.sourceType === "question"
    ? getQuestionsForNote("").find(q => q.id === card?.sourceId)
    : null;

  const zettel = card?.sourceType === "zettel"
    ? getZettelCard(card.sourceId)
    : null;

  const currentText = card?.sourceType === "question" && question
    ? question.text
    : zettel
      ? zettel.title
      : "?";

  const currentBody = card?.sourceType === "question" && question
    ? getNotePreview(question.noteId)
    : zettel
      ? zettel.sourceRef || "Note issue du Zettelkasten"
      : "";

  function getNotePreview(noteId: string): string {
    const note = useNoteStore.getState().getNote(noteId);
    return note?.title || "";
  }

  const handleRating = (rating: ReviewRating) => {
    if (!card) return;
    setFlipped(false);
    review(card.id, rating, 0);
  };

  const handleNext = () => {
    if (currentCardIndex < dueCards.length - 1) {
      setFlipped(false);
      setTimeout(() => useReviewStore.getState().setCurrentCardIndex(currentCardIndex + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentCardIndex > 0) {
      setFlipped(false);
      setTimeout(() => useReviewStore.getState().setCurrentCardIndex(currentCardIndex - 1), 150);
    }
  };

  if (dueCards.length === 0) {
    return (
      <div className="flex min-h-screen bg-[var(--bg)]">
        <DesktopSidebar />
        <PageShell>
          <HeaderBar title="Révision" subtitle="Apprentissage actif" />
          <EmptyState
            icon={ArrowClockwise}
            title="Pas de révision aujourd'hui"
            description="Vous avez terminé vos révisions du jour. Revenez demain !"
            actionLabel="Explorer la bibliothèque"
            onAction={() => navigate("/library")}
          />
        </PageShell>
        <AppLayoutMobile />
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="flex min-h-screen bg-[var(--bg)]">
        <DesktopSidebar />
        <PageShell>
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--accent-soft))] flex items-center justify-center mb-4">
              <CheckCircle weight="fill" className="w-8 h-8 text-[hsl(var(--accent))]" />
            </div>
            <h2 className="font-literata text-2xl font-bold text-[var(--ink)] mb-2">Séance terminée !</h2>
            <p className="font-inter text-[var(--muted)] mb-8 max-w-sm">
              Vous avez révisé {dueCards.length} carte{dueCards.length > 1 ? "s" : ""}. Bon travail !
            </p>
            <button
              onClick={resetSession}
              className="px-6 py-3 rounded-xl bg-[hsl(var(--accent))] text-white font-inter font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
            >
              Nouvelle séance
            </button>
          </div>
        </PageShell>
        <AppLayoutMobile />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <DesktopSidebar />
      <PageShell className="flex flex-col justify-center">
        <div className="text-center mb-6">
          <span className="font-inter text-sm text-[var(--muted)]">
            Carte {currentCardIndex + 1} / {dueCards.length}
          </span>
          <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--accent))] rounded-full transition-all duration-300"
              style={{ width: `${((currentCardIndex + 1) / dueCards.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="perspective-1000 mb-8" style={{ perspective: "1000px" }}>
          <AnimatePresence mode="wait">
            {!flipped ? (
              <motion.div
                key="front"
                initial={{ rotateY: 0 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setFlipped(true)}
                className="w-full max-w-md mx-auto cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label="Retourner la carte"
                onKeyDown={(e) => e.key === "Enter" && setFlipped(true)}
              >
                <div className="aspect-[4/3] rounded-28 bg-[var(--surface)] border border-[var(--line)] flex flex-col items-center justify-center p-8 shadow-sm hover:shadow-md transition-shadow">
                  <span className="font-inter text-xs uppercase tracking-widest text-[var(--muted)] mb-4">Question</span>
                  <p className="font-literata text-xl font-semibold text-[var(--ink)] text-center leading-relaxed">
                    {currentText}
                  </p>
                  <span className="font-inter text-xs text-[var(--muted)] mt-6">Appuyez pour voir la réponse</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="back"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-md mx-auto"
              >
                <div className="aspect-[4/3] rounded-28 bg-[var(--surface)] border border-[var(--line)] flex flex-col p-8 shadow-sm">
                  <span className="font-inter text-xs uppercase tracking-widest text-[var(--muted)] mb-3">Réponse</span>
                  <p className="font-literata text-lg text-[var(--ink)] leading-relaxed flex-1">
                    {currentBody}
                  </p>
                  <button
                    onClick={() => setFlipped(false)}
                    className="mt-4 font-inter text-sm text-[var(--muted)] hover:text-[var(--ink)] self-start focus:outline-none"
                  >
                    ← Retour à la question
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rating buttons */}
        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto w-full">
          {RATINGS.map(({ value, label, sub, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => handleRating(value)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
                "hover:scale-105 active:scale-95 touch-manipulation",
                value === "again" && "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20",
                value === "hard" && "border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-950/20",
                value === "good" && "border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20",
                value === "easy" && "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-950/20",
              )}
            >
              <Icon weight="fill" className={cn("w-5 h-5", color)} />
              <span className="font-inter text-sm font-semibold text-[var(--ink)]">{label}</span>
              <span className="font-inter text-[10px] text-[var(--muted)]">{sub}</span>
            </button>
          ))}
        </div>

        {/* Nav */}
        <div className="flex justify-between max-w-md mx-auto w-full mt-4">
          <button
            onClick={handlePrev}
            disabled={currentCardIndex === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-xl font-inter text-sm text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-30 transition-colors focus:outline-none"
          >
            <ArrowLeft weight="bold" className="w-4 h-4" /> Précédent
          </button>
          <button
            onClick={handleNext}
            disabled={currentCardIndex >= dueCards.length - 1}
            className="flex items-center gap-1 px-3 py-2 rounded-xl font-inter text-sm text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-30 transition-colors focus:outline-none"
          >
            Suivant <ArrowRight weight="bold" className="w-4 h-4" />
          </button>
        </div>
      </PageShell>
      <AppLayoutMobile />
    </div>
  );
}
