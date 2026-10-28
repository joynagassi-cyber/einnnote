import { useNavigate } from "react-router-dom";
import {
  CaretRight,
  Brain,
  ChartLineUp,
  DownloadSimple,
  Info,
  PaintBrush,
  ShieldCheck,
  SlidersHorizontal,
  Trash,
  WifiSlash,
} from "@phosphor-icons/react";
import { Screen } from "@/components/Layout";
import { useContentStore } from "@/stores/useContentStore";

export default function Settings() {
  const navigate = useNavigate();
  const notes = useContentStore((s) => s.notes);
  const trashCount = notes.filter((n) => n.deletedAt).length;

  const rows = [
    {
      to: "/settings/appearance",
      icon: PaintBrush,
      title: "Apparence",
      hint: "Thème, accent, canevas, taille du texte",
    },
    {
      to: "/settings/personalization",
      icon: SlidersHorizontal,
      title: "Personnalisation",
      hint: "Densité, rayons, bordures, papier, interligne",
    },
    {
      to: "/settings/data",
      icon: DownloadSimple,
      title: "Données et sauvegarde",
      hint: "Fichier protégé, restauration, export",
    },
    {
      to: "/settings/review",
      icon: Brain,
      title: "Révision et rappels",
      hint: "FSRS-5, rétention, plafonds quotidiens, rappel du soir",
    },
    {
      to: "/settings/progress",
      icon: ChartLineUp,
      title: "Mes progrès",
      hint: "Cartes, notes, leçons — calculés localement",
    },
    {
      to: "/settings/trash",
      icon: Trash,
      title: "Corbeille",
      hint:
        trashCount > 0
          ? `${trashCount} note${trashCount > 1 ? "s" : ""} supprimée${trashCount > 1 ? "s" : ""}`
          : "Aucune note supprimée",
    },
    {
      to: "/settings/about",
      icon: Info,
      title: "À propos",
      hint: "Version, promesses, licences",
    },
  ];

  return (
    <Screen withNav className="screen-wide px-5 lg:px-8">
      <header className="pb-4 pt-7">
        <h1 className="font-serif text-[30px] font-semibold leading-tight">
          Réglages
        </h1>
      </header>

      <div className="flex items-center gap-3 rounded-card bg-accent-soft p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-rect bg-surface text-accent">
          <ShieldCheck size={22} weight="duotone" />
        </span>
        <div>
          <div className="text-[15px] font-semibold">Tout reste ici</div>
          <div className="mt-0.5 text-[13px] leading-[19px] text-accent-ink">
            Aucun compte, aucun serveur, aucun suivi. Fonctionne hors ligne.
          </div>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2 lg:grid lg:grid-cols-2">
        {rows.map(({ to, icon: Icon, title, hint }) => (
          <li key={to}>
            <button type="button" onClick={() => navigate(to)} className="row">
              <span className="tile" aria-hidden="true">
                <Icon size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{title}</span>
                <span className="mt-0.5 block truncate text-[14px] text-muted">
                  {hint}
                </span>
              </span>
              <CaretRight size={16} className="text-muted" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 flex items-start gap-2 px-1 text-[13px] leading-[19px] text-muted">
        <WifiSlash size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        L’application n’émet aucune requête réseau pendant l’usage normal. Les
        sauvegardes sont des fichiers que vous gardez.
      </p>
    </Screen>
  );
}
