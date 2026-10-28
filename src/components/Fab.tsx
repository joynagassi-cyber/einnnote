import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FolderPlus,
  NotePencil,
  Plus,
  Stack,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { fabFor, type FabAction, type FabKind } from "@/lib/fab";
import { cn } from "@/lib/utils";

/**
 * Le bouton de création — **flottant**, contextuel, et unique par page.
 *
 * Il ne vit plus dans la barre de navigation : une barre sert à aller quelque
 * part, un bouton flottant sert à faire quelque chose. Séparer les deux met fin
 * au « + » qui restait affiché sur des pages où il ne créait rien de juste.
 *
 * Deux formes, décidées par la place :
 *  - téléphone : pastille de 56 px, en bas à droite, au-dessus de la barre ;
 *  - bureau : bouton étendu (« + Nouveau vault »), pour que le libellé soit
 *    lisible sans survol.
 *
 * S'il y a plusieurs créations possibles, il les déplie vers le haut dans
 * l'ordre du parcours — la plus fréquente en premier.
 */

const ICONS: Record<FabKind, Icon> = {
  project: FolderPlus,
  vault: Stack,
  card: NotePencil,
  note: NotePencil,
};

export function Fab({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const actions = fabFor(pathname);
  const [open, setOpen] = useState(false);

  /* Changer de page referme le menu : un menu ouvert sur un autre écran est un
     menu qui a oublié pourquoi il était là. */
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (actions.length === 0) return null;

  const run = (action: FabAction) => {
    setOpen(false);
    navigate(action.to);
  };

  const primary = actions[0];
  const rest = actions.slice(1);
  const PrimaryIcon = ICONS[primary.kind];

  return (
    <div className={cn("fab-host", className)}>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul className="fab-menu" role="menu" aria-label="Créer">
            {actions.map((action) => {
              const Icon = ICONS[action.kind];
              return (
                <li key={action.label}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => run(action)}
                    className="fab-menu-item"
                  >
                    <Icon size={18} weight="duotone" className="text-accent" aria-hidden />
                    {action.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <button
        type="button"
        aria-label={primary.label}
        aria-haspopup={rest.length > 0 ? "menu" : undefined}
        aria-expanded={rest.length > 0 ? open : undefined}
        onClick={() => (rest.length > 0 ? setOpen((value) => !value) : run(primary))}
        className="fab"
      >
        {rest.length > 0 && open ? (
          <X size={22} weight="bold" aria-hidden />
        ) : (
          <PrimaryIcon size={22} weight="bold" aria-hidden />
        )}
        <span className="fab-label">{primary.label}</span>
      </button>
    </div>
  );
}

/**
 * Le menu des pages qui ne tiennent pas dans la barre — **vers le haut**.
 *
 * C'était une feuille qui montait du bas de l'écran, avec un voile : elle
 * recouvrait la page entière pour trois lignes. Un menu ancré au bouton dit la
 * même chose sans rien recouvrir, et laisse la barre visible donc la sortie
 * évidente.
 */
export function NavMoreMenu({
  items,
  onPick,
  onClose,
  active,
}: {
  items: { id: string; label: string; icon: Icon; to: string; hint?: string }[];
  onPick: (to: string) => void;
  onClose: () => void;
  active: (to: string) => boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <ul className="nav-more-menu" role="menu" aria-label="Autres pages">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onClose();
                  onPick(item.to);
                }}
                aria-current={active(item.to) ? "page" : undefined}
                className={cn("nav-more-item", active(item.to) && "text-accent")}
              >
                <Icon size={19} weight="duotone" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
