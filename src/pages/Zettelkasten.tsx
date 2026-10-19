import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNoteStore } from "@/stores/useNoteStore";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeaderBar } from "@/components/ui/HeaderBar";
import {
  ArrowLeft,
  Cards,
  Link,
  Plus,
  Tag,
  ArrowRight,
  ArrowLeft as ArrowLeftI,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ZettelCard as ZettelCardType } from "@/types";

export default function ZettelkastenPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getNote, zettelCards, addZettelCard, getZettelCard, updateZettelCard } = useNoteStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formSource, setFormSource] = useState("");
  const [formTags, setFormTags] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Get cards linked to this zettelkasten note
  const cards = zettelCards.slice(0, 8);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setDragOffset(e.touches[0].clientX - dragStart);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragOffset) > 60) {
      if (dragOffset > 0 && currentIndex < cards.length - 1) setCurrentIndex((i) => i + 1);
      else if (dragOffset < 0 && currentIndex > 0) setCurrentIndex((i) => i - 1);
    }
    setDragOffset(0);
  };

  const handleSubmit = () => {
    if (!formTitle.trim() && !formBody.trim()) return;
    const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);
    const card: ZettelCardType = {
      id: `z-${Date.now()}`,
      title: formTitle || "Sans titre",
      bodyJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: formBody }] }] },
      sourceRef: formSource,
      refs: [],
      createdAt: new Date().toISOString(),
    };
    addZettelCard(card);
    setFormTitle("");
    setFormBody("");
    setFormSource("");
    setFormTags("");
    setShowForm(false);
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <DesktopSidebar />
      <PageShell padding="p-4 md:p-6" className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--ink)] font-inter focus:outline-none">
            <ArrowLeft weight="bold" className="w-4 h-4" /> Retour
          </button>
          <div className="flex items-center gap-2">
            <Cards weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
            <span className="font-literata font-semibold text-[var(--ink)]">Zettelkasten</span>
          </div>
          <button
            onClick={() => navigate(`/zettel/${id}/graph`)}
            className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--ink)] font-inter focus:outline-none"
          >
            <Link weight="regular" className="w-4 h-4" /> Graphe
          </button>
        </div>

        {/* Card stack */}
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <EmptyState
              icon={Cards}
              title="Ajoutez votre première carte"
              description="Créez des fiches pour connecter vos idées."
              actionLabel="Créer une carte"
              onAction={() => setShowForm(true)}
            />
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative w-full max-w-sm mx-auto"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: isDragging ? `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)` : "none",
              transition: isDragging ? "none" : "transform 0.3s ease-out",
            }}
          >
            {/* Stack effect */}
            {cards.map((card, i) => {
              if (i > currentIndex + 2) return null;
              const offset = currentIndex - i;
              if (offset < 0) return null;
              return (
                <div
                  key={card.id}
                  className={cn(
                    "absolute inset-0 bg-[var(--surface)] border border-[var(--line)] rounded-28 shadow-sm",
                    "p-6 flex flex-col"
                  )}
                  style={{
                    transform: `translateY(${offset * 6}px) scale(${1 - offset * 0.03})`,
                    opacity: offset === 0 ? 1 : Math.max(0.3, 1 - offset * 0.2),
                    zIndex: cards.length - i,
                  }}
                >
                  {offset === 0 && (
                    <>
                      <h3 className="font-literata font-bold text-[var(--ink)] text-lg mb-2">{card.title}</h3>
                      {card.bodyJson && "content" in card.bodyJson && (
                        <p className="font-inter text-sm text-[var(--muted)] leading-relaxed flex-1 mb-4">
                          {(card.bodyJson.content as any[])?.map((c: any) => c.content?.[0]?.text || "").join(" ").trim()}
                        </p>
                      )}
                      {card.sourceRef && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-inter mb-3">
                          <ArrowRight weight="regular" className="w-3 h-3" />
                          {card.sourceRef}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {card.refs.slice(0, 5).map((refId) => {
                          const ref = cards.find((c) => c.id === refId);
                          return ref ? (
                            <span key={refId} className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-xs font-inter text-[var(--muted)]">
                              {ref.title.slice(0, 12)}…
                            </span>
                          ) : null;
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Navigation */}
        {cards.length > 1 && (
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={() => currentIndex > 0 && setCurrentIndex((i) => i - 1)}
              disabled={currentIndex === 0}
              className="p-3 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            >
              <ArrowLeftI weight="bold" className="w-5 h-5" />
            </button>
            <span className="flex items-center font-inter text-sm text-[var(--muted)] px-3">
              {currentIndex + 1} / {cards.length}
            </span>
            <button
              onClick={() => currentIndex < cards.length - 1 && setCurrentIndex((i) => i + 1)}
              disabled={currentIndex >= cards.length - 1}
              className="p-3 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
            >
              <ArrowRight weight="bold" className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Add card form */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-[var(--bg)] flex items-end md:items-center justify-center">
            <div className="w-full max-w-md bg-[var(--surface)] border-t md:border border-[var(--line)] md:rounded-2xl p-6 space-y-4 animate-slide-up">
              <h3 className="font-literata font-bold text-[var(--ink)] text-lg">Nouvelle carte</h3>
              <input
                type="text"
                placeholder="Titre de la carte…"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] font-literata text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <textarea
                placeholder="Contenu de la carte…"
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] font-inter text-[var(--ink)] resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <input
                type="text"
                placeholder="Source de référence…"
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] font-inter text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <input
                type="text"
                placeholder="Tags (séparés par des virgules)…"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] font-inter text-sm text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl bg-[var(--surface-2)] text-[var(--muted)] font-inter font-medium hover:text-[var(--ink)] transition-colors focus:outline-none"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-3 rounded-xl bg-[hsl(var(--accent))] text-white font-inter font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full bg-[hsl(var(--accent))] text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 z-40"
          aria-label="Ajouter une carte"
        >
          <Plus weight="bold" className="w-7 h-7" />
        </button>
      </PageShell>
      <AppLayoutMobile />
    </div>
  );
}
