import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowCounterClockwise, Trash as TrashIcon } from "@phosphor-icons/react";
import { AppBar, EmptyState, Screen, Sheet } from "@/components/Layout";
import { DisplayMenu } from "@/components/DisplayMenu";
import { groupItems, sortItems, type DisplayFields } from "@/lib/display";
import { useSurfacePrefs } from "@/stores/useDisplayStore";
import { useContentStore } from "@/stores/useContentStore";
import { useToast } from "@/stores/useToast";
import { METHODS } from "@/lib/methods";
import { timeAgo } from "@/lib/time";
import type { Note } from "@/types";

export default function Trash() {
  const navigate = useNavigate();
  const notes = useContentStore((s) => s.notes);
  const restoreNote = useContentStore((s) => s.restoreNote);
  const purgeNote = useContentStore((s) => s.purgeNote);
  const toast = useToast((s) => s.show);

  const deleted = notes.filter((n) => n.deletedAt);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const target = deleted.find((n) => n.id === confirmId);

  /* Même moteur d’affichage que la bibliothèque : ici les champs utiles sont
     la date de suppression et la méthode, pas les tags ni les projets. */
  const { prefs: display } = useSurfacePrefs("trash", { view: "list", sortBy: "deleted" });
  const fields: DisplayFields<Note> = useMemo(
    () => ({
      deleted: {
        label: "Date de suppression",
        value: (note) => note.deletedAt ?? "",
        type: "date",
      },
      title: { label: "Titre", value: (note) => note.title },
      method: { label: "Méthode", value: (note) => METHODS[note.method].label },
    }),
    [],
  );
  const groups = useMemo(() => {
    const ordered = sortItems(deleted, fields, [display.sortBy, display.thenBy]);
    return groupItems(ordered, fields, display.groupBy);
  }, [deleted, fields, display.sortBy, display.thenBy, display.groupBy]);

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar back onBack={() => navigate("/settings")} title="Corbeille" center={false} />

      <p className="mt-1 text-[14px] leading-[21px] text-muted">
        Les notes supprimées attendent ici leur restauration ou leur effacement.
      </p>

      {deleted.length > 1 && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[12.5px] text-muted">
            {deleted.length} note{deleted.length > 1 ? "s" : ""} en attente
          </span>
          <DisplayMenu
            surface="trash"
            defaults={{ view: "list", sortBy: "deleted" }}
            views={[
              { value: "list", label: "Liste", hint: "Une note par ligne" },
              { value: "grid", label: "Grille", hint: "Par deux" },
            ]}
            groupOptions={[
              { value: "method", label: "Méthode" },
              { value: "deleted", label: "Jour de suppression" },
            ]}
            sortOptions={[
              { value: "deleted", label: "Supprimée récemment" },
              { value: "title", label: "Titre A → Z" },
              { value: "method", label: "Méthode" },
            ]}
          />
        </div>
      )}

      {deleted.length === 0 ? (
        <EmptyState
          icon={TrashIcon}
          title="Corbeille vide"
          description="Rien à récupérer pour l’instant."
        />
      ) : (
        groups.map((group) => (
          <div key={group.key} className="mt-4">
            {group.label && (
              <h3 className="mb-1.5 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                {group.label}
                <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-bold">
                  {group.items.length}
                </span>
              </h3>
            )}
        <ul
          className={
            display.view === "grid"
              ? "flex flex-col gap-2 lg:grid lg:grid-cols-2"
              : "flex flex-col gap-2"
          }
        >
          {group.items.map((note) => {
            const Icon = METHODS[note.method].icon;
            return (
              <li key={note.id} className="rounded-card border border-line bg-surface p-3.5">
                <div className="flex items-center gap-3">
                  <span className="tile" aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-serif text-[16px] font-semibold">
                      {note.title}
                    </div>
                    <div className="text-[13px] text-muted">
                      {METHODS[note.method].label} · supprimée{" "}
                      {note.deletedAt ? timeAgo(note.deletedAt) : ""}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      restoreNote(note.id);
                      toast("Note restaurée", "accent");
                    }}
                    className="btn-secondary h-11 flex-1 text-[14px]"
                  >
                    <ArrowCounterClockwise size={16} />
                    Restaurer
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(note.id)}
                    className="h-11 flex-1 rounded-field border border-line text-[14px] font-semibold text-danger"
                  >
                    Effacer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
          </div>
        ))
      )}

      <Sheet
        open={Boolean(target)}
        onClose={() => setConfirmId(null)}
        title="Effacer définitivement ?"
      >
        <p className="text-[15px] leading-[22px] text-muted">
          « {target?.title} » et ses questions seront supprimées. Les cartes de
          révision liées disparaissent aussi. Cette action est irréversible et
          ne peut pas être annulée par une sauvegarde antérieure.
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmId(null)}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-danger flex-1"
            onClick={() => {
              if (target) purgeNote(target.id);
              setConfirmId(null);
              toast("Note effacée");
            }}
          >
            Effacer
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}
