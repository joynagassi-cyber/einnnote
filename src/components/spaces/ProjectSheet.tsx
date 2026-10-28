import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { useToast } from "@/stores/useToast";

/**
 * Créer (ou renommer) un projet.
 *
 * Deux champs, pas cinq : un nom et une phrase qui dit à quoi il sert. Le nom
 * est la seule décision structurante — « Divers » n'est pas un projet, c'est
 * l'absence de projet, et la feuille le dit plutôt que de l'accepter.
 */
export function ProjectSheet({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  /** renseigné = renommage */
  projectId?: string;
}) {
  const navigate = useNavigate();
  const toast = useToast((s) => s.show);
  const projects = useContentStore((s) => s.projects);
  const createProject = useContentStore((s) => s.createProject);
  const renameProject = useContentStore((s) => s.renameProject);

  const existing = projects.find((project) => project.id === projectId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  /* À chaque ouverture, les champs prennent l'état réel : renommer puis
     rouvrir ne doit pas réafficher la valeur précédente. */
  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? "");
    setDescription(existing?.description ?? "");
  }, [open, existing?.name, existing?.description]);

  const close = () => {
    onClose();
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (existing) {
      renameProject(existing.id, trimmed);
      toast("Projet renommé", "accent");
      close();
      return;
    }
    const project = createProject(trimmed, description.trim());
    toast(`Projet « ${project.name} » créé`, "accent");
    close();
    navigate(`/spaces/${project.id}`);
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={existing ? "Renommer le projet" : "Nouveau projet"}
    >
      <p className="text-[13px] leading-[19px] text-muted">
        Un projet délimite un travail : un cours, un mémoire, un dossier client.
        Il contient des notes et des vaults.
      </p>

      <label htmlFor="project-name" className="mb-1.5 mt-4 block text-[14px] font-semibold text-muted">
        Nom du projet
      </label>
      <input
        id="project-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
        placeholder="Ex. Mémoire M2"
        className="field h-12"
      />

      {!existing && (
        <>
          <label
            htmlFor="project-description"
            className="mb-1.5 mt-4 block text-[14px] font-semibold text-muted"
          >
            À quoi sert-il ? <span className="font-normal">(facultatif)</span>
          </label>
          <input
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex. Recherche, lectures, fiches"
            className="field h-12"
          />
        </>
      )}

      <div className="mt-5 flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={close}>
          Annuler
        </button>
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={!name.trim()}
          onClick={submit}
        >
          {existing ? "Renommer" : "Créer le projet"}
        </button>
      </div>
    </Sheet>
  );
}
