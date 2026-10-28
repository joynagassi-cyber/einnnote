import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet } from "@/components/Layout";
import { VaultTemplateGallery } from "@/components/TemplateGallery";
import { VAULT_TEMPLATES, type VaultTemplate } from "@/lib/templates/graphs";
import { vaultFromTemplate } from "@/lib/templates/apply";
import { useContentStore } from "@/stores/useContentStore";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/stores/useToast";

/**
 * Créer un vault **dans un projet** — d'où l'on est, sans reposer la question.
 *
 * La feuille existait sur l'ancienne page « Vaults », où elle demandait à
 * chaque fois dans quel projet créer. Ici le projet est celui de la page : il
 * n'y a plus de sélection à faire, donc plus d'erreur possible (créer un vault
 * dans le mauvais projet parce qu'un bouton était resté sur le précédent).
 */
export function VaultSheet({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const navigate = useNavigate();
  const toast = useToast((s) => s.show);
  const createVault = useContentStore((s) => s.createVault);
  const addZettelCard = useContentStore((s) => s.addZettelCard);
  const updateZettelCard = useContentStore((s) => s.updateZettelCard);
  const setGraphStyle = useAppStore((s) => s.setGraphStyle);

  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);

  const close = () => {
    setName("");
    setMemo("");
    setTemplateId(null);
    onClose();
  };

  const submit = () => {
    if (!name.trim()) return;
    const vault = createVault({ name, projectId, note: memo });
    toast(`Vault « ${vault.name} » créé`, "accent");
    close();
    navigate(`/vault/${vault.id}`);
  };

  /**
   * Un modèle se pose en un geste : le vault, ses fiches, leurs codes et leurs
   * renvois, puis on atterrit sur le graphe. Rien à renommer ensuite.
   */
  const applyTemplate = (template: VaultTemplate) => {
    const seed = vaultFromTemplate(template);
    const vault = createVault({ name: seed.name, projectId, note: seed.note });
    for (const card of [...seed.cards].reverse()) {
      const made = addZettelCard({
        vaultId: vault.id,
        title: card.title,
        body: card.body,
        source: card.source,
        refs: card.refs,
      });
      updateZettelCard(made.id, { code: card.code, refs: card.refs });
    }
    setGraphStyle(seed.style);
    toast(`Vault « ${vault.name} » créé · ${seed.cards.length} fiches`, "accent");
    close();
    navigate(`/vault/${vault.id}/graph`);
  };

  return (
    <Sheet open={open} onClose={close} title="Nouveau vault">
      <p className="text-[13px] leading-[19px] text-muted">
        Un vault rassemble des fiches qui se citent entre elles. Un par question,
        jamais un par source.
      </p>

      <h3 className="mb-1.5 mt-4 text-[14px] font-semibold text-muted">
        Partir d’un modèle
      </h3>
      <VaultTemplateGallery
        templates={VAULT_TEMPLATES}
        selectedId={templateId}
        onPick={(template) => {
          setTemplateId(template.id);
          applyTemplate(template);
        }}
      />

      <h3 className="mb-1.5 mt-6 text-[14px] font-semibold text-muted">
        Ou créer à la main
      </h3>
      <label htmlFor="vault-name" className="mb-1.5 block text-[14px] font-semibold text-muted">
        Nom du vault
      </label>
      <input
        id="vault-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Ex. Droit des contrats"
        className="field h-12"
      />

      <label htmlFor="vault-note" className="mb-1.5 mt-4 block text-[14px] font-semibold text-muted">
        À quoi sert ce vault ? <span className="font-normal">(facultatif)</span>
      </label>
      <input
        id="vault-note"
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        placeholder="Ex. Fiches de lecture du séminaire"
        className="field h-12"
      />

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
          Créer et ouvrir
        </button>
      </div>
    </Sheet>
  );
}
