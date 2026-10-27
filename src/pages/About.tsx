import { useNavigate } from "react-router-dom";
import { Fingerprint, LockKey, WifiSlash } from "@phosphor-icons/react";
import { AppBar, Screen } from "@/components/Layout";

const PROMISES = [
  {
    icon: WifiSlash,
    title: "Hors ligne par défaut",
    text: "Aucun compte, aucun serveur, aucune télémétrie. L’application fonctionne sans réseau.",
  },
  {
    icon: LockKey,
    title: "Vos notes vous appartiennent",
    text: "Sauvegarde complète en fichier chiffré, export JSON lisible, formats ouverts.",
  },
  {
    icon: Fingerprint,
    title: "L’effort reste votre travail",
    text: "Aucune fonction ne résume, ne rédige ni ne classe à votre place : l’application guide, elle ne pense pas.",
  },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <Screen className="screen-wide px-5 lg:px-8">
      <AppBar back onBack={() => navigate("/settings")} title="À propos" center={false} />

      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-card bg-accent text-on-accent">
          <span className="font-serif text-[22px] font-bold leading-none">É</span>
        </div>
        <div>
          <h1 className="font-serif text-[22px] font-semibold leading-tight">
            Engram
          </h1>
          <p className="text-[14px] text-muted">
            Prototype 0.3 · cahier des charges v3.0
          </p>
        </div>
      </div>

      <p className="mt-4 font-serif text-[17px] leading-[28px]">
        Des notes qui obligent à l’apprentissage actif : Outline, Cornell, carte
        mentale et Zettelkasten, puis des cartes de rappel revues au bon moment.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {PROMISES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-card border border-line bg-surface p-4">
            <div className="flex items-center gap-2 text-[15px] font-semibold">
              <Icon size={20} className="text-accent" aria-hidden="true" />
              {title}
            </div>
            <p className="mt-1 text-[14px] leading-[21px] text-muted">{text}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Ce prototype
      </h2>
      <div className="rounded-card border border-line bg-surface p-4 text-[14px] leading-[22px] text-muted">
        <p>
          Les écrans suivent les maquettes « papier calme » : Literata pour les
          notes, Inter pour l’interface, un seul accent, un canevas pointillé.
        </p>
        <p className="mt-2">
          Les données sont conservées dans le stockage local du navigateur. La
          version de production prévoit SQLite, Capacitor et Electron, avec
          l’ordonnanceur FSRS.
        </p>
      </div>

      <h2 className="mb-2 mt-6 text-[14px] font-semibold text-muted">
        Composants libres
      </h2>
      <ul className="rounded-card border border-line bg-surface p-4 text-[14px] leading-[24px] text-muted">
        <li>Literata — SIL Open Font License</li>
        <li>Inter — SIL Open Font License</li>
        <li>Phosphor Icons — MIT</li>
        <li>React Flow — MIT</li>
        <li>React, Vite, Tailwind CSS, Zustand — MIT</li>
      </ul>

      <p className="mt-6 pb-10 text-[13px] leading-[19px] text-muted">
        « Engram » est un nom de travail, déjà utilisé ailleurs : un nouveau nom
        reste à choisir avant toute publication.
      </p>
    </Screen>
  );
}
