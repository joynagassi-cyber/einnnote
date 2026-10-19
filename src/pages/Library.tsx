import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useNoteStore } from "@/stores/useNoteStore";
import { useReviewStore } from "@/stores/useReviewStore";
import { useAppStore } from "@/stores/useAppStore";
import { NoteCard } from "@/components/ui/NoteCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeaderBar } from "@/components/ui/HeaderBar";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import { MagnifyingGlass, Funnel, NotePencil, ArrowClockwise } from "@phosphor-icons/react";
import { Method } from "@/types";
import { cn } from "@/lib/utils";

const METHOD_OPTIONS: { value: Method | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "outline", label: "Outline" },
  { value: "cornell", label: "Cornell" },
  { value: "mindmap", label: "Carte mentale" },
  { value: "zettelkasten", label: "Zettelkasten" },
];

export default function LibraryPage() {
  const { notes, searchNotes, filterByMethod } = useNoteStore();
  const dueToday = useReviewStore((s) => s.getDueToday().length);
  const { settings } = useAppStore();
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<Method | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = search ? searchNotes(search) : notes;
    if (methodFilter !== "all") result = filterByMethod(methodFilter);
    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notes, search, methodFilter, searchNotes, filterByMethod]);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <DesktopSidebar />
      <PageShell>
        <HeaderBar
          title="Bibliothèque"
          subtitle={`${notes.length} note${notes.length > 1 ? "s" : ""}`}
          action={
            dueToday > 0 && (
              <Link
                to="/review"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--accent))] text-white font-inter text-sm font-medium hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
              >
                <ArrowClockwise weight="fill" className="w-4 h-4" />
                Réviser ({dueToday})
              </Link>
            )
          }
        />

        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlass weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher une note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] font-inter text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
          />
        </div>

        {/* Filter toggle (mobile) */}
        <div className="md:hidden mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] font-inter text-sm text-[var(--muted)]"
          >
            <Funnel weight="regular" className="w-4 h-4" />
            Filtres
          </button>
        </div>

        {/* Method filters */}
        {(showFilters || typeof window !== "undefined" && window.innerWidth >= 768) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {METHOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setMethodFilter(value)}
                className={cn(
                  "px-3 py-1.5 rounded-full font-inter text-sm transition-colors touch-manipulation",
                  methodFilter === value
                    ? "bg-[hsl(var(--accent))] text-white"
                    : "bg-[var(--surface)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Notes grid */}
        {filtered.length > 0 ? (
          <div className="grid gap-3">
            {filtered.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={NotePencil}
            title={search ? "Aucun résultat" : "Aucune note"}
            description={search ? "Essayez un autre terme de recherche." : "Commencez par créer votre première note."}
            actionLabel="Créer une note"
            onAction={() => { }}
          />
        )}
      </PageShell>
      <AppLayoutMobile />
    </div>
  );
}
