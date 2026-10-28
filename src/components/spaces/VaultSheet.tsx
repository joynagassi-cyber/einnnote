import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { useToast } from "@/stores/useToast";

/**
 * Créer — ou renommer — un vault, c’est-à-dire **une catégorie du projet**.
 *
 * Il n’y a plus de galerie de modèles ici. Elle faisait d’un vault une
 * « méthode de graphe » : on choisissait un style, on posait cinq fiches
 * reliées, et la catégorie naissait déjà pleine d’un contenu qui n’était pas
 * le sien. Un vault se nomme et s’explique, rien de plus ; les notes viennent
 * ensuite, une par concept.
 *
 * Le projet est celui de la page : il n’y a donc aucune sélection à faire, et
 * aucune erreur possible (créer la catégorie dans le mauvais projet parce
 * qu’un bouton était resté sur le précédent).
 */
export function VaultSheet({
  open,
  onClose,
  projectId,
  vaultId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** renseigné : on modifie cette catégorie au lieu d’en créer une */
  vaultId?: string;
}) {
  const navigate = useNavigate();
  const toast = useToast((s) => s.show);
  const project = useContentStore((s) => s.projects.find((p) => p.id === projectId));
  const vault = useContentStore((s) => s.vaults.find((v) => v.id === vaultId));
  const createVault = useContentStore((s) => s.createVault);
  const renameVault = useContentStore((s) => s.renameVault);

  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");

  /* La feuille reste montée : sans cette réinitialisation, on retrouverait le
     nom de la catégorie précédente en rouvrant « Nouveau vault ». */
  useEffect(() => {
    if (!open) return;
    setName(vault?.name ?? "");
    setMemo(vault?.note ?? "");
  }, [open, vault]);

  const close = () => {
    setName("");
    setMemo("");
    onClose();
  };

  const submit = () => {
    if (!name.trim()) return;
    if (vault) {
      renameVault(vault.id, { name, note: memo });
      toast("Vault mis à jour", "accent");
      close();
      return;
    }
    const created = createVault({ name, projectId, note: memo });
    toast(`Vault « ${created.name} » créé`, "accent");
    close();
    navigate(`/vault/${created.id}`);
  };

  return (
    <Sheet open={open} onClose={close} title={vault ? "Modifier le vault" : "Nouveau vault"}>
      <p className="text-[13px] leading-[19px] text-muted">
        Un vault est une <strong className="text-ink">catégorie</strong> du projet
        {project ? ` « ${project.name} »` : ""} : « Superposition quantique »,
        « Intrication quantique »… Vous y rangerez les notes de cette partie du
        sujet.
      </p>

      <label htmlFor="vault-name" className="mb-1.5 mt-4 block text-[14px] font-semibold text-muted">
        Nom de la catégorie
      </label>
      <input
        id="vault-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Ex. Superposition quantique"
        className="field h-12"
        autoFocus
      />

      <label htmlFor="vault-note" className="mb-1.5 mt-4 block text-[14px] font-semibold text-muted">
        À quoi elle sert <span className="font-normal">(facultatif)</span>
      </label>
      <input
        id="vault-note"
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        placeholder="Ex. Définition, expériences, paradoxes"
        className="field h-12"
      />

      <p className="mt-3 text-[12px] leading-[17px] text-muted">
        Le vault ne contient rien à sa création : vous y ajouterez les notes au
        fur et à mesure, et les fiches de révision viendront d’elles-mêmes.
      </p>

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
          {vault ? "Enregistrer" : "Créer et ouvrir"}
        </button>
      </div>
    </Sheet>
  );
}
