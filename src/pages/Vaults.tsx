import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Books,
  FolderSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen, Sheet } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";
import { useToast } from "@/stores/useToast";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Coffres — la page qui manquait.
 *
 * Un coffre est un paquet de fiches (Zettelkasten) rattaché à un projet. Il
 * n’existait qu’en adresse directe (`/vault/:id`), donc invisible : on ne
 * pouvait ni les lister, ni en créer un, ni savoir lequel contenait quoi.
 * Cette page répare les trois.
 */
export default function Vaults() {
  const navigate = useNavigate();
  const vaults = useContentStore((s) => s.vaults);
  const projects = useContentStore((s) => s.projects);
  const zettel = useContentStore((s) => s.zettel);
  const createVault = useContentStore((s) => s.createVault);
  const deleteVault = useContentStore((s) => s.deleteVault);
  const toast = useToast((s) => s.show);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  const rows = useMemo(() => {
    return vaults.map((vault) => {
      const cards = zettel
        .filter((card) => card.vaultId === vault.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const project = projects.find((p) => p.id === vault.projectId);
      return {
        vault,
        project,
        count: cards.length,
        last: cards[0]?.updatedAt,
        sample: cards.slice(0, 3).map((card) => card.title),
      };
    });
  }, [vaults, zettel, projects]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof rows>();
    rows.forEach((row) => {
      const key = row.project?.id ?? "sans-projet";
      map.set(key, [...(map.get(key) ?? []), row]);
    });
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: items[0]?.project?.name ?? "Sans projet",
      items,
    }));
  }, [rows]);

  const target = rows.find((row) => row.vault.id === confirmId);
  const totalCards = zettel.length;

  const submit = () => {
    if (!name.trim() || !projectId) return;
    const vault = createVault({ name, projectId, note: memo });
    setSheetOpen(false);
    setName("");
    setMemo("");
    toast(`Coffre « ${vault.name} » créé`, "accent");
    navigate(`/vault/${vault.id}`);
  };

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <AppBar
        back
        onBack={() => navigate("/")}
        action={
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="pill h-9 px-3 text-[13px]"
          >
            <Plus size={15} weight="bold" aria-hidden />
            Coffre
          </button>
        }
      />

      <div className="mt-1">
        <h1 className="font-serif text-[30px] font-semibold leading-tight">
          Coffres
        </h1>
        <p className="mt-1 text-[13.5px] leading-[20px] text-muted">
          {rows.length} coffre{rows.length > 1 ? "s" : ""} · {totalCards} fiche
          {totalCards > 1 ? "s" : ""}. Chaque coffre appartient à un projet.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Books}
          title="Aucun coffre"
          description="Un coffre garde des fiches atomiques : une idée par fiche, une source par fiche."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => setSheetOpen(true)}
            >
              <Plus size={18} weight="bold" /> Créer un coffre
            </button>
          }
        />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="mt-5">
            <h2 className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
              <FolderSimple size={14} weight="duotone" aria-hidden />
              {group.label}
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                {group.items.length}
              </span>
            </h2>
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((row) => (
                <li key={row.vault.id} className="h-full">
                  <div className="flex h-full flex-col rounded-card border border-line bg-surface p-3.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/vault/${row.vault.id}`)}
                      aria-label={`Ouvrir le coffre ${row.vault.name}`}
                      className="group flex flex-1 flex-col text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="tile h-8 w-8" aria-hidden>
                          <Books size={17} weight="duotone" className="text-accent" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-serif text-[16.5px] font-semibold">
                          {row.vault.name}
                        </span>
                        <ArrowRight
                          size={15}
                          className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                      {row.vault.note && (
                        <span className="mt-1.5 line-clamp-2 text-[12.5px] leading-[18px] text-muted">
                          {row.vault.note}
                        </span>
                      )}
                      <span className="mt-2 flex flex-wrap gap-1.5 text-[11.5px]">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-medium",
                            row.count > 0
                              ? "bg-accent-soft text-accent-ink"
                              : "bg-surface-2 text-muted",
                          )}
                        >
                          {row.count} fiche{row.count > 1 ? "s" : ""}
                        </span>
                        {row.last && (
                          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">
                            modifié {timeAgo(row.last)}
                          </span>
                        )}
                      </span>
                    </button>

                    {row.sample.length > 0 && (
                      <p className="mt-2 line-clamp-2 text-[11.5px] leading-[17px] text-muted">
                        {row.sample.join(" · ")}
                      </p>
                    )}

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        aria-label={`Supprimer le coffre ${row.vault.name}`}
                        onClick={() => setConfirmId(row.vault.id)}
                        className="icon-btn h-8 w-8 text-muted"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <div className="h-24" aria-hidden />

      {/* Nouveau coffre */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Nouveau coffre"
      >
        <label htmlFor="vault-name" className="mb-1.5 block text-[14px] font-semibold text-muted">
          Nom du coffre
        </label>
        <input
          id="vault-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex. Droit des contrats"
          className="field h-12"
          autoFocus
        />

        <p className="mb-1.5 mt-4 block text-[14px] font-semibold text-muted">
          Projet
        </p>
        <div className="flex flex-wrap gap-1.5">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              aria-pressed={projectId === project.id}
              onClick={() => setProjectId(project.id)}
              className={cn("pill h-9", projectId === project.id && "pill-accent")}
            >
              {project.name}
            </button>
          ))}
        </div>

        <label htmlFor="vault-note" className="mb-1.5 mt-4 block text-[14px] font-semibold text-muted">
          À quoi sert ce coffre ? <span className="font-normal">(facultatif)</span>
        </label>
        <input
          id="vault-note"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="Ex. Fiches de lecture du séminaire"
          className="field h-12"
        />

        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => setSheetOpen(false)}>
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

      {/* Suppression */}
      <Sheet
        open={Boolean(target)}
        onClose={() => setConfirmId(null)}
        title="Supprimer ce coffre ?"
      >
        <p className="text-[15px] leading-[22px] text-muted">
          « {target?.vault.name} » contient {target?.count ?? 0} fiche
          {(target?.count ?? 0) > 1 ? "s" : ""}.{" "}
          {(target?.count ?? 0) > 0
            ? "Un coffre qui contient des fiches ne peut pas être supprimé : déplacez-les d’abord."
            : "Cette action est définitive."}
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmId(null)}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-danger flex-1"
            onClick={() => {
              if (!target) return;
              const result = deleteVault(target.vault.id);
              toast(result.ok ? "Coffre supprimé" : (result.reason ?? "Suppression impossible"));
              setConfirmId(null);
            }}
          >
            Supprimer
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}
