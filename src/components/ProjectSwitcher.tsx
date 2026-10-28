import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, FolderPlus, Trash } from "@phosphor-icons/react";
import { Sheet } from "@/components/Layout";
import { useProjects } from "@/lib/useProjects";
import { useToast } from "@/stores/useToast";
import { cn } from "@/lib/utils";

/**
 * Projets : le conteneur de premier niveau.
 *
 * Un projet n’est pas un dossier de plus : il change le périmètre de la
 * bibliothèque, des coffres et des créations. La suppression est refusée
 * tant que des notes y vivent — on ne perd jamais de contenu par mégarde.
 */

export function ProjectsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast((s) => s.show);
  const {
    projects,
    counts,
    activeProjectId,
    setActiveProject,
    createProject,
    renameProject,
    deleteProject,
  } = useProjects();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const clean = name.trim();
    if (!clean) return;
    const project = createProject(clean);
    setActiveProject(project.id);
    setName("");
    toast(`Projet « ${project.name} » créé`, "accent");
  };

  return (
    <Sheet open={open} onClose={onClose} title="Projets">
      <ul className="flex flex-col gap-2">
        <li>
          <button
            type="button"
            onClick={() => setActiveProject(null)}
            aria-pressed={activeProjectId === null}
            className={cn(
              "flex w-full items-center gap-3 rounded-card border px-3.5 py-3 text-left",
              activeProjectId === null
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface",
            )}
          >
            <span className="tile h-9 w-9" aria-hidden>
              <Check size={18} className="text-accent" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                Tous les projets
              </span>
              <span className="block text-[13px] text-muted">
                Vue globale, révision comprise
              </span>
            </span>
          </button>
        </li>

        {projects.map((project) => {
          const active = activeProjectId === project.id;
          const total = counts.get(project.id) ?? 0;
          return (
            <li key={project.id}>
              <div
                className={cn(
                  "rounded-card border px-3.5 py-3",
                  active ? "border-accent bg-accent-soft" : "border-line bg-surface",
                )}
              >
                <div className="flex items-center gap-2">
                  {editing === project.id ? (
                    <input
                      value={draft}
                      autoFocus
                      onChange={(event) => setDraft(event.target.value)}
                      onBlur={() => {
                        renameProject(project.id, draft);
                        setEditing(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          renameProject(project.id, draft);
                          setEditing(null);
                        }
                        if (event.key === "Escape") setEditing(null);
                      }}
                      aria-label={`Renommer ${project.name}`}
                      className="field h-9 flex-1 text-[14px]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveProject(active ? null : project.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-[15px] font-semibold">
                        {project.name}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        {total} note{total > 1 ? "s" : ""}
                        {project.description ? ` · ${project.description}` : ""}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(project.id);
                      setDraft(project.name);
                    }}
                    className="h-8 shrink-0 rounded-field px-2 text-[12.5px] font-semibold text-accent"
                  >
                    Renommer
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer ${project.name}`}
                    onClick={() => {
                      const result = deleteProject(project.id);
                      if (result.ok) {
                        if (activeProjectId === project.id) setActiveProject(null);
                        toast("Projet supprimé", "accent");
                      } else {
                        toast(result.reason ?? "Suppression impossible");
                      }
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field text-muted hover:bg-surface-2"
                  >
                    <Trash size={15} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 rounded-card border border-line bg-surface p-3.5">
        <label htmlFor="new-project" className="mb-1.5 block text-[14px] text-muted">
          Nouveau projet
        </label>
        <div className="flex gap-2">
          <input
            id="new-project"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="Ex. Cours de droit"
            className="field h-11 min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim()}
            className="btn-primary h-11 shrink-0 px-4 text-[14px]"
          >
            <FolderPlus size={18} weight="bold" />
            Créer
          </button>
        </div>
        <p className="mt-2 text-[12.5px] leading-[18px] text-muted">
          Un projet isole ses notes et ses coffres. La vue « Tous les projets »
          reste disponible pour la révision.
        </p>
        {/* Sur téléphone, le rail n’existe pas : c’est ici que l’on atteint la
            page qui explique où vit quoi (projet, coffre, note). */}
        <Link
          to="/spaces"
          onClick={() => onClose()}
          className="mt-3 flex items-center gap-2 rounded-field border border-line px-3 py-2.5 text-[13px] font-medium text-accent"
        >
          <ArrowRight size={15} weight="bold" aria-hidden />
          Comprendre la structure (projets, coffres, notes)
        </Link>
      </div>
    </Sheet>
  );
}
