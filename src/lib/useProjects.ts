import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";

/** Projets + périmètre courant, avec le nombre de notes par projet. */
export function useProjects() {
  const projects = useContentStore((s) => s.projects);
  const notes = useContentStore((s) => s.notes);
  const createProject = useContentStore((s) => s.createProject);
  const renameProject = useContentStore((s) => s.renameProject);
  const deleteProject = useContentStore((s) => s.deleteProject);
  const activeProjectId = useAppStore((s) => s.activeProjectId);
  const setActiveProject = useAppStore((s) => s.setActiveProject);

  const counts = new Map<string, number>();
  for (const note of notes) {
    if (note.deletedAt) continue;
    counts.set(note.projectId, (counts.get(note.projectId) ?? 0) + 1);
  }

  return {
    projects,
    counts,
    activeProjectId,
    setActiveProject,
    createProject,
    renameProject,
    deleteProject,
  };
}
