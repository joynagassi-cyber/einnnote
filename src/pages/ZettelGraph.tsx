import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useNoteStore } from "@/stores/useNoteStore";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  ArrowsOutCardinal,
  ShareNetwork,
  Tag,
  Link as LinkIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ZettelGraphPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { zettelCards, getZettelCard } = useNoteStore();
  const [viewMode, setViewMode] = useState<"open" | "all">("open");

  const currentCard = getZettelCard(id || "");
  const allCards = zettelCards;

  const connectedCards = currentCard
    ? allCards.filter((c) => c.id === id || currentCard.refs.includes(c.id) || c.refs.includes(id || ""))
    : [];

  const displayCards = viewMode === "all" ? allCards : connectedCards.length > 0 ? connectedCards : allCards.slice(0, 6);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <DesktopSidebar />
      <PageShell padding="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] focus:outline-none">
              <ArrowLeft weight="bold" className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <ShareNetwork weight="fill" className="w-5 h-5 text-[hsl(var(--accent))]" />
              <h1 className="font-literata text-xl font-bold text-[var(--ink)]">Graphe</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("open")}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-inter transition-colors",
                viewMode === "open" ? "bg-[hsl(var(--accent))] text-white" : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]"
              )}
            >
              Ouvertes
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-inter transition-colors",
                viewMode === "all" ? "bg-[hsl(var(--accent))] text-white" : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--line)]"
              )}
            >
              Tout
            </button>
          </div>
        </div>

        {/* Graph visualization (simplified force-directed layout) */}
        <div className="relative w-full aspect-square max-h-[600px] mx-auto bg-[var(--surface)] border border-[var(--line)] rounded-2xl overflow-hidden">
          {/* Edges */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            {allCards.flatMap((card) =>
              card.refs.map((refId) => {
                const a = allCards.find((c) => c.id === card.id);
                const b = allCards.find((c) => c.id === refId);
                if (!a || !b) return null;
                const ax = 80 + (hashStr(card.id) % 600);
                const ay = 80 + (hashStr(card.id + "y") % 400);
                const bx = 80 + (hashStr(refId) % 600);
                const by = 80 + (hashStr(refId + "y") % 400);
                return (
                  <line
                    key={`${card.id}-${refId}`}
                    x1={ax} y1={ay} x2={bx} y2={by}
                    stroke="var(--line)" strokeWidth={1.5}
                  />
                );
              })
            )}
          </svg>

          {/* Nodes */}
          {displayCards.map((card, i) => {
            const x = 80 + (hashStr(card.id) % 600);
            const y = 80 + (hashStr(card.id + "y") % 400);
            const isCurrent = card.id === id;
            return (
              <motion.button
                key={card.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05, type: "spring" }}
                onClick={() => navigate(`/zettel/${id}`)}
                className={cn(
                  "absolute px-3 py-2 rounded-xl text-center transition-all",
                  "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
                  isCurrent
                    ? "bg-[hsl(var(--accent))] text-white shadow-lg z-10"
                    : "bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)]"
                )}
                style={{ left: x, top: y, zIndex: 2 }}
              >
                <span className="font-inter text-xs font-medium max-w-[120px] block truncate">
                  {card.title}
                </span>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {card.refs.length > 0 && (
                    <LinkIcon weight="regular" className="w-3 h-3 opacity-60" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(var(--accent))]" />
            <span className="font-inter text-xs text-[var(--muted)]">Carte ouverte</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[var(--surface-2)] border border-[var(--line)]" />
            <span className="font-inter text-xs text-[var(--muted)]">Autres cartes</span>
          </div>
        </div>
      </PageShell>
      <AppLayoutMobile />
    </div>
  );
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
