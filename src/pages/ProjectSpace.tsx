import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  FolderSimple,
  Graph,
  NotePencil,
  PencilSimple,
  Plus,
  Stack,
  Trash,
} from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen, Sheet } from "@/components/Layout";
import { ProjectSheet } from "@/components/spaces/ProjectSheet";
import { VaultSheet } from "@/components/spaces/VaultSheet";
import { useContentStore } from "@/stores/useContentStore";
import { useToast } from "@/stores/useToast";
import { METHODS } from "@/lib/methods";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * Un projet ouvert : **ses vaults**, puis ses notes.
 *
 * C'est le deuxième niveau de la hiérarchie, et il n'existait pas sous cette
 * forme : « Projets » montrait une liste plate, « Vaults » une liste plate
 * aussi, et le lien entre les deux n'était visible nulle part. Ici on voit,
 * dans l'ordre : le projet, les vaults qu'il contient, les notes qui n'ont pas
 * besoin de vault.
 */
export default function ProjectSpace() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast((s) => s.show);

  const projects = useContentStore((s) => s.projects);
  const vaults = useContentStore((s) => s.vaults);
  const zettel = useContentStore((s) => s.zettel);
  const notes = useContentStore((s) => s.notes);
  const deleteVault = useContentStore((s) => s.deleteVault);
  const deleteProject = useContentStore((s) => s.deleteProject);

  const [params, setParams] = useSearchParams();
  const [vaultSheet, setVaultSheet] = useState(params.get("new") === "1");
  const [renameOpen, setRenameOpen] = useState(false);
  const [editVault, setEditVault] = useState<string | null>(null);
  const [confirmVault, setConfirmVault] = useState<string | null>(null);
  const [confirmProject, setConfirmProject] = useState(false);

  const project = projects.find((entry) => entry.id === id);

  useEffect(() => {
    if (params.get("new") === "1") setVaultSheet(true);
  }, [params]);

  const closeVaultSheet = () => {
    setVaultSheet(false);
    if (params.get("new")) {
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });
    }
  };

  /* Un vault = une catégorie : on compte donc ses **notes** d’abord, ses
     fiches ensuite, et on garde les méthodes employées pour que la carte dise
     ce qu’elle contient sans avoir à l’ouvrir. */
  const rows = useMemo(() => {
    return vaults
      .filter((vault) => vault.projectId === id)
      .map((vault) => {
        const owned = zettel
          .filter((card) => card.vaultId === vault.id)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        const ownNotes = notes
          .filter((note) => note.vaultId === vault.id && !note.deletedAt)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        const methods = [...new Set(ownNotes.map((note) => METHODS[note.method].label))];
        return {
          vault,
          count: owned.length,
          noteCount: ownNotes.length,
          methods,
          last: [owned[0]?.updatedAt, ownNotes[0]?.updatedAt]
            .filter(Boolean)
            .sort()
            .pop(),
          sample: owned.slice(0, 3).map((card) => card.title),
        };
      })
      .sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
  }, [vaults, zettel, notes, id]);

  const ownNotes = useMemo(
    () =>
      notes
        .filter((note) => note.projectId === id && !note.deletedAt)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes, id],
  );

  /* Les notes rangées dans une catégorie s’affichent **dans** le vault : les
     répéter ici ferait deux fois le même contenu, avec deux chemins pour y
     aller. Cette section ne garde donc que les notes encore sans catégorie. */
  const looseNotes = useMemo(
    () => ownNotes.filter((note) => !note.vaultId),
    [ownNotes],
  );

  if (!project) {
    return (
      <Screen className="px-5">
        <AppBar back onBack={() => navigate("/spaces")} title="Projet" />
        <EmptyState
          icon={FolderSimple}
          title="Projet introuvable"
          description="Ce projet a peut-être été supprimé. La liste des projets reste accessible."
          action={
            <button type="button" className="btn-primary" onClick={() => navigate("/spaces")}>
              Voir les projets
            </button>
          }
        />
      </Screen>
    );
  }

  const target = rows.find((row) => row.vault.id === confirmVault);
  const ficheCount = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <AppBar
        back
        onBack={() => navigate("/spaces")}
        title={`Projet · ${project.name}`}
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRenameOpen(true)}
              aria-label={`Renommer le projet ${project.name}`}
              className="icon-btn h-9 w-9 text-muted"
            >
              <PencilSimple size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/spaces/${project.id}/graph`)}
              className="pill h-9 px-3 text-[13px]"
            >
              <Graph size={15} weight="duotone" aria-hidden />
              Graphe
            </button>
          </div>
        }
      />

      <header className="mt-1">
        <h1 className="font-serif text-[30px] font-semibold leading-tight">{project.name}</h1>
        <p className="mt-1 text-[13.5px] leading-[20px] text-muted">
          {project.description || "Sans description"} · {rows.length} vault
          {rows.length > 1 ? "s" : ""} · {ficheCount} fiche{ficheCount > 1 ? "s" : ""} ·{" "}
          {ownNotes.length} note{ownNotes.length > 1 ? "s" : ""}
        </p>
      </header>

      {/* ------------------------------------------------ vaults */}
      <section className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif text-[19px] font-semibold">
            <Stack size={18} weight="duotone" className="text-accent" aria-hidden />
            Vaults
            <span className="text-[13px] font-normal text-muted">{rows.length}</span>
          </h2>
        </div>
        <p className="mt-0.5 text-[12.5px] leading-[18px] text-muted">
          Un vault est une <strong className="text-ink">catégorie</strong> du projet :
          « Superposition quantique », « Intrication quantique ». Chacune range les
          notes écrites sur cette partie du sujet.
        </p>

        {rows.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={Stack}
              title="Aucun vault dans ce projet"
              description="Ce projet n’a pas encore de catégorie."
              action={
                <button type="button" className="btn-primary" onClick={() => setVaultSheet(true)}>
                  <Plus size={18} weight="bold" /> Créer le premier vault
                </button>
              }
            />
          </div>
        ) : (
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <li key={row.vault.id} className="h-full">
                <div className="group flex h-full flex-col rounded-card border border-line bg-surface p-3.5 transition-colors hover:border-line-strong">
                  <button
                    type="button"
                    onClick={() => navigate(`/vault/${row.vault.id}`)}
                    aria-label={`Ouvrir le vault ${row.vault.name}`}
                    className="flex flex-1 flex-col text-left"
                  >
                    <span className="flex items-start gap-2.5">
                      <span className="tile h-9 w-9" aria-hidden>
                        <Stack size={17} weight="duotone" className="text-accent" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-[17px] font-semibold leading-tight">
                          {row.vault.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                          {row.vault.note || "Sans description"}
                        </span>
                      </span>
                      <ArrowRight
                        size={15}
                        className="mt-1.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>

                    <span className="mt-3 flex flex-wrap gap-1.5 text-[11.5px]">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-medium",
                          row.noteCount > 0
                            ? "bg-accent-soft text-accent-ink"
                            : "bg-surface-2 text-muted",
                        )}
                      >
                        {row.noteCount} note{row.noteCount > 1 ? "s" : ""}
                      </span>
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">
                        {row.count} fiche{row.count > 1 ? "s" : ""}
                      </span>
                      {row.methods.slice(0, 2).map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-line px-2 py-0.5 text-muted"
                        >
                          {label}
                        </span>
                      ))}
                    </span>

                    {row.last && (
                      <span className="mt-2 block text-[11.5px] text-muted">
                        Modifié {timeAgo(row.last)}
                      </span>
                    )}
                  </button>

                  <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/new?vault=${row.vault.id}`)}
                      aria-label={`Écrire une note dans ${row.vault.name}`}
                      className="flex h-8 items-center gap-1.5 rounded-field px-2 text-[12.5px] font-semibold text-accent hover:bg-surface-2"
                    >
                      <Plus size={14} weight="bold" aria-hidden />
                      Nouvelle note
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/vault/${row.vault.id}/graph`)}
                        aria-label={`Graphe du vault ${row.vault.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-field text-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <Graph size={15} weight="duotone" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditVault(row.vault.id)}
                        aria-label={`Renommer le vault ${row.vault.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-field text-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <PencilSimple size={15} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmVault(row.vault.id)}
                        aria-label={`Supprimer le vault ${row.vault.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-field text-muted hover:bg-surface-2 hover:text-ink"
                      >
                        <Trash size={15} aria-hidden />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------ notes */}
      <section className="mt-6 rounded-card border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif text-[19px] font-semibold">
            <NotePencil size={18} weight="duotone" className="text-accent" aria-hidden />
            Notes sans catégorie
            <span className="text-[13px] font-normal text-muted">{looseNotes.length}</span>
          </h2>
          <button
            type="button"
            onClick={() => navigate(`/new?project=${project.id}`)}
            className="flex items-center gap-1 text-[12.5px] font-semibold text-accent"
          >
            <Plus size={14} weight="bold" aria-hidden />
            Nouvelle note
          </button>
        </div>

        {looseNotes.length === 0 ? (
          <p className="mt-2 text-[12.5px] leading-[18px] text-muted">
            {ownNotes.length > 0
              ? `Les ${ownNotes.length} notes du projet sont rangées dans un vault. Créez-en une hors catégorie si elle sert à tout le projet.`
              : "Aucune note hors catégorie. Le plus simple : ouvrez un vault et écrivez-y vos notes."}
          </p>
        ) : (
          <>
            <ul className="mt-2 flex flex-col gap-1">
              {looseNotes.slice(0, 6).map((note) => {
                const Icon = METHODS[note.method]?.icon ?? NotePencil;
                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/note/${note.id}`)}
                      className="flex w-full items-center gap-2.5 rounded-field px-2 py-2 text-left hover:bg-surface-2"
                    >
                      <span className="tile h-8 w-8" aria-hidden>
                        <Icon size={15} weight="duotone" className="text-accent" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{note.title}</span>
                        <span className="block truncate text-[11.5px] text-muted">
                          {METHODS[note.method]?.label ?? "Note"} · modifiée {timeAgo(note.updatedAt)}
                        </span>
                      </span>
                      <ArrowRight size={14} className="shrink-0 text-muted" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            {looseNotes.length > 6 && (
              <button
                type="button"
                onClick={() => navigate(`/?project=${project.id}`)}
                className="mt-2 text-[12.5px] font-semibold text-accent"
              >
                Voir les {looseNotes.length} notes hors catégorie
              </button>
            )}
          </>
        )}
      </section>

      {/* ------------------------------------------------ zone sensible */}
      <section className="mt-6 flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
        <p className="text-[12px] leading-[17px] text-muted">
          Supprimer le projet n’efface rien qui puisse être recréé : ses notes et ses vaults
          bloquent la suppression.
        </p>
        <button
          type="button"
          onClick={() => setConfirmProject(true)}
          aria-label="Supprimer le projet"
          className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-danger"
        >
          <Trash size={14} aria-hidden />
          Supprimer
        </button>
      </section>

      <div className="h-24" />

      <VaultSheet open={vaultSheet} onClose={closeVaultSheet} projectId={project.id} />
      <VaultSheet
        open={Boolean(editVault)}
        onClose={() => setEditVault(null)}
        projectId={project.id}
        vaultId={editVault ?? undefined}
      />
      <ProjectSheet
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        projectId={project.id}
      />

      <Sheet
        open={Boolean(target)}
        onClose={() => setConfirmVault(null)}
        title="Supprimer ce vault ?"
      >
        <p className="text-[15px] leading-[22px] text-muted">
          « {target?.vault.name} » contient {target?.noteCount ?? 0} note
          {(target?.noteCount ?? 0) > 1 ? "s" : ""} et {target?.count ?? 0} fiche
          {(target?.count ?? 0) > 1 ? "s" : ""}.{" "}
          {(target?.count ?? 0) > 0 || (target?.noteCount ?? 0) > 0
            ? "Un vault qui contient encore quelque chose ne peut pas être supprimé : déplacez ou supprimez d’abord."
            : "Cette action est définitive."}
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmVault(null)}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-danger flex-1"
            onClick={() => {
              if (!target) return;
              const result = deleteVault(target.vault.id);
              toast(result.ok ? "Vault supprimé" : (result.reason ?? "Suppression impossible"));
              setConfirmVault(null);
            }}
          >
            Supprimer
          </button>
        </div>
      </Sheet>

      <Sheet
        open={confirmProject}
        onClose={() => setConfirmProject(false)}
        title="Supprimer ce projet ?"
      >
        <p className="text-[15px] leading-[22px] text-muted">
          « {project.name} » contient {rows.length} vault{rows.length > 1 ? "s" : ""} et{" "}
          {ownNotes.length} note{ownNotes.length > 1 ? "s" : ""}. Un projet qui contient des
          notes ou des vaults ne peut pas être supprimé.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => setConfirmProject(false)}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn-danger flex-1"
            onClick={() => {
              const result = deleteProject(project.id);
              if (result.ok) {
                toast("Projet supprimé");
                navigate("/spaces");
              } else {
                toast(result.reason ?? "Suppression impossible");
                setConfirmProject(false);
              }
            }}
          >
            Supprimer
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}
