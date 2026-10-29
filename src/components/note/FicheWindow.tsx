import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

/**
 * **Le panneau latéral de la fiche** (bureau ≥ 1024 px).
 *
 * Obsidian ouvre sa fenêtre de note au centre, par-dessus le document, avec un
 * voile. Sur un poste de travail, la fiche est un **inspecteur** : elle se
 * colle au bord droit, le texte reste lisible et cliquable à gauche. On ne
 * quitte pas la note pour la régler.
 *
 * Pas de voile, donc pas de piège à focus : la note reste utilisable pendant
 * que la fiche est ouverte. Échap referme, le bouton aussi. Le portail va
 * directement dans `body` — aucun ancêtre ne peut intercepter le `fixed`.
 */
export function FicheWindow({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label="Fiche de la note"
      aria-modal="false"
      className="fiche-panel"
    >
      <div className="flex items-center justify-between gap-2 pb-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.13em] text-muted">
          Fiche
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche"
          className="grid h-9 w-9 place-items-center rounded-field text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X size={17} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">{children}</div>
    </div>,
    document.body,
  );
}
