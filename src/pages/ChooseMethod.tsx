import { useNavigate } from "react-router-dom";
import { useNoteStore } from "@/stores/useNoteStore";
import { useAppStore } from "@/stores/useAppStore";
import { PageShell } from "@/components/ui/PageShell";
import { AppLayoutMobile, DesktopSidebar } from "@/components/layout/AppLayout";
import { HeaderBar } from "@/components/ui/HeaderBar";
import {
  List,
  Notebook,
  SquaresFour,
  ShareNetwork,
  BookOpen,
} from "@phosphor-icons/react";
import { Method } from "@/types";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const METHODS: {
  id: Method;
  icon: typeof List;
  title: string;
  subtitle: string;
  effort: number;
  color: string;
  link: string;
}[] = [
  {
    id: "outline",
    icon: List,
    title: "Outline",
    subtitle: "Structure hiérarchique classique",
    effort: 1,
    color: "from-blue-500 to-cyan-400",
    link: "/editor",
  },
  {
    id: "cornell",
    icon: Notebook,
    title: "Cornell",
    subtitle: "Colonnes notes + questions",
    effort: 2,
    color: "from-amber-500 to-orange-400",
    link: "/editor",
  },
  {
    id: "mindmap",
    icon: SquaresFour,
    title: "Carte mentale",
    subtitle: "Nœuds et connexions visuelles",
    effort: 3,
    color: "from-emerald-500 to-teal-400",
    link: "/mindmap",
  },
  {
    id: "zettelkasten",
    icon: ShareNetwork,
    title: "Zettelkasten",
    subtitle: "Fiches liées entre elles",
    effort: 3,
    color: "from-violet-500 to-purple-400",
    link: "/zettel",
  },
];

export default function ChooseMethodPage() {
  const navigate = useNavigate();
  const { addNote } = useNoteStore();
  const { settings } = useAppStore();

  const handleSelect = (method: Method) => {
    const id = `n-${Date.now()}`;
    const now = new Date().toISOString();
    addNote({
      id,
      method,
      title: "Nouvelle note",
      contentJson: {},
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    if (method === "mindmap") {
      navigate(`/mindmap/${id}`);
    } else if (method === "zettelkasten") {
      navigate(`/zettel/${id}`);
    } else {
      navigate(`/editor/${id}`);
    }
  };

  const handleRead = () => {
    const id = `n-${Date.now()}`;
    const now = new Date().toISOString();
    addNote({
      id,
      method: "outline",
      title: "Note de lecture",
      contentJson: {},
      status: "captured",
      createdAt: now,
      updatedAt: now,
    });
    navigate(`/editor/${id}`);
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <DesktopSidebar />
      <PageShell>
        <HeaderBar title="Nouvelle note" subtitle="Choisissez votre méthode" />

        <div className="grid gap-3 mb-8">
          {METHODS.map((m, i) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => handleSelect(m.id)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] hover:border-[hsl(var(--accent))]/40 transition-all text-left w-full focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 touch-manipulation"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl bg-gradient-to-br flex-shrink-0 flex items-center justify-center",
                m.color
              )}>
                <m.icon weight="fill" className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-literata font-semibold text-[var(--ink)]">{m.title}</span>
                  <div className="flex gap-0.5">
                    {[...Array(4)].map((_, j) => (
                      <span key={j} className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        j < m.effort ? "bg-[hsl(var(--accent))]" : "bg-[var(--line)]"
                      )} />
                    ))}
                  </div>
                </div>
                <p className="font-inter text-sm text-[var(--muted)]">{m.subtitle}</p>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="border-t border-[var(--line)] pt-6 mb-6">
          <p className="font-inter text-xs text-[var(--muted)] uppercase tracking-wider mb-3">Ou</p>
          <button
            onClick={handleRead}
            className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] w-full text-left hover:border-[var(--muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 touch-manipulation"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] flex items-center justify-center">
              <BookOpen weight="fill" className="w-6 h-6 text-[var(--muted)]" />
            </div>
            <div>
              <span className="font-literata font-semibold text-[var(--ink)] block">Je lis simplement</span>
              <p className="font-inter text-sm text-[var(--muted)]">Créer une note Outline sans question</p>
            </div>
          </button>
        </div>

        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--line)] p-4">
          <p className="font-inter text-xs text-[var(--muted)] leading-relaxed">
            💡 Chaque méthode correspond à un besoin différent. L'Outline pour la structure, Cornell pour les cours, Carte mentale pour les idées, Zettelkasten pour les connexions.
          </p>
        </div>
      </PageShell>
      <AppLayoutMobile />
    </div>
  );
}
