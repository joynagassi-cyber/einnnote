import { Link } from "react-router-dom";
import { Method, Note } from "@/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface NoteCardProps {
  note: Note;
}

const METHOD_LABELS: Record<Method, string> = {
  outline: "Outline",
  cornell: "Cornell",
  mindmap: "Carte mentale",
  zettelkasten: "Zettelkasten",
};

const METHOD_COLORS: Record<Method, string> = {
  outline: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  cornell: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  mindmap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  zettelkasten: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "text-[var(--muted)]" },
  captured: { label: "Capturé", color: "text-blue-500" },
  questioned: { label: "Questionné", color: "text-[hsl(var(--accent))]" },
  done: { label: "Terminé", color: "text-green-500" },
};

export function NoteCard({ note }: NoteCardProps) {
  const dateStr = formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: fr });
  const status = STATUS_BADGES[note.status];

  return (
    <Link
      to={note.method === "zettelkasten" ? `/zettel/${note.id}` : `/editor/${note.id}`}
      className="block p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] hover:border-[hsl(var(--accent))]/40 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-literata font-semibold text-[var(--ink)] leading-snug group-hover:text-[hsl(var(--accent))] transition-colors">
          {note.title}
        </h3>
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-inter font-medium flex-shrink-0",
          METHOD_COLORS[note.method]
        )}>
          {METHOD_LABELS[note.method]}
        </span>
      </div>
      <p className="font-inter text-sm text-[var(--muted)] line-clamp-2 mb-3 leading-relaxed">
        {note.contentJson && typeof note.contentJson === "object" && "content" in note.contentJson
          ? (note.contentJson.content as any[])?.slice(0, 2).map((c: any) => c.content?.[0]?.text || "").join(" ").trim()
          : "Note sans contenu — commencez à écrire..."}
      </p>
      <div className="flex items-center justify-between">
        <span className="font-inter text-xs text-[var(--muted)]">{dateStr}</span>
        <span className={cn("font-inter text-xs font-medium", status.color)}>{status.label}</span>
      </div>
    </Link>
  );
}
