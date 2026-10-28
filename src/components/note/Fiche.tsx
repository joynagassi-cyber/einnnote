import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClockCounterClockwise,
  Copy,
  DownloadSimple,
  Files,
  FolderSimple,
  LinkSimple,
  MagnifyingGlass,
  PencilSimple,
  Sparkle,
  Stack,
  Trash,
  WarningCircle,
  DotsSixVertical,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * **La fiche de la note** — le menu du document, remis dans l’ordre.
 *
 * Les captures d’Obsidian montrent dix-huit lignes dans un seul écran, où
 * « Renommer » côtoie « Vue liée » et « Supprimer » ferme la marche sans qu’on
 * l’ait vue venir. Ici, quatre sections disent **à quoi on touche** :
 *
 * 1. **Ranger** — le vault, le projet, le pupitre. On classe, on ne modifie pas.
 * 2. **Lire** — lecture, chercher, remplacer. On change de posture.
 * 3. **Sortir** — export, copie, lien. Rien ne bouge dans la note.
 * 4. **Gérer** — renommer, historique. Les actions qui touchent le fichier.
 *
 * La suppression est **hors section**, séparée par un vide et un ton différent :
 * une action destructrice ne se trouve jamais à côté de « Partager ». Sur
 * téléphone elle demande une seconde confirmation ; c’est le seul endroit de
 * l’application où l’on demande deux fois.
 */

export interface FicheProps {
  title: string;
  vaults: { id: string; name: string }[];
  vaultId?: string;
  projects: { id: string; name: string }[];
  projectId: string;
  /** le bouton d’historique est là, désactivé : une absence expliquée */
  historyNote?: string;
  onVault: (vaultId: string | undefined) => void;
  onProject: (projectId: string) => void;
  onRename: () => void;
  onReading: () => void;
  onFind: (mode: "find" | "replace") => void;
  onExport: () => void;
  onCopyText: () => void;
  onCopyLink: () => void;
  onTemplate?: () => void;
  /** absent sur bureau : le pupitre est un geste de téléphone */
  onArrange?: () => void;
  onTrash: () => void;
}

export function Fiche({
  title,
  vaults,
  vaultId,
  projects,
  projectId,
  historyNote = "Aucune version enregistrée pour l’instant",
  onVault,
  onProject,
  onRename,
  onReading,
  onFind,
  onExport,
  onCopyText,
  onCopyLink,
  onTemplate,
  onArrange,
  onTrash,
}: FicheProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col">
      <p className="px-0.5 pb-2 text-[13px] leading-[19px] text-muted">
        Vous réglez <span className="font-semibold text-ink">{title.trim() || "cette note"}</span>.
        Rien ici ne modifie le texte.
      </p>

      {/* ------------------------------------------------------- Ranger */}
      <Section title="Ranger">
        {vaults.length > 0 && (
          <Row as="label" icon={Stack} label="Vault (catégorie)">
            <select
              aria-label="Vault de la note"
              value={vaultId ?? ""}
              onChange={(event) => onVault(event.target.value || undefined)}
              className="field h-9 w-auto min-w-[9rem] text-[13px]"
            >
              <option value="">Aucun — note du projet</option>
              {vaults.map((vault) => (
                <option key={vault.id} value={vault.id}>
                  {vault.name}
                </option>
              ))}
            </select>
          </Row>
        )}

        <Row as="label" icon={FolderSimple} label="Projet">
          <select
            aria-label="Projet de la note"
            value={projectId}
            onChange={(event) => onProject(event.target.value)}
            className="field h-9 w-auto min-w-[9rem] text-[13px]"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Row>

        {onArrange ? (
          <Action
            icon={DotsSixVertical}
            label="Ranger le pupitre"
            hint="Quatre gestes, pas plus"
            onClick={onArrange}
          />
        ) : (
          <div
            className="flex min-h-[44px] items-center gap-2.5 px-2.5 py-1.5 opacity-55"
            aria-disabled="true"
          >
            <DotsSixVertical size={18} weight="duotone" className="shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px]">Ranger le pupitre</span>
              <span className="block text-[11.5px] text-muted">
                Réservé au téléphone — ici, la palette suffit
              </span>
            </span>
          </div>
        )}
      </Section>

      {/* --------------------------------------------------------- Lire */}
      <Section title="Lire">
        <Action icon={BookOpen} label="Lecture" hint="Masque les barres, garde le texte" onClick={onReading} />
        <Action icon={MagnifyingGlass} label="Chercher dans la note" hint="Ctrl+F" onClick={() => onFind("find")} />
        <Action icon={Files} label="Remplacer" hint="" onClick={() => onFind("replace")} />
      </Section>

      {/* ------------------------------------------------------- Sortir */}
      <Section title="Sortir">
        <Action icon={DownloadSimple} label="Exporter en Markdown" hint="Un fichier, votre texte" onClick={onExport} />
        <Action icon={Copy} label="Copier le texte" hint="" onClick={onCopyText} />
        <Action icon={LinkSimple} label="Copier le lien de la note" hint="Vers cette note" onClick={onCopyLink} />
        {onTemplate && (
          <Action icon={Sparkle} label="Insérer un modèle" hint="Ajoute des sections" onClick={onTemplate} />
        )}
      </Section>

      {/* -------------------------------------------------------- Gérer */}
      <Section title="Gérer" last>
        <Action icon={PencilSimple} label="Renommer" hint="Le titre, en haut" onClick={onRename} />
        <div className="flex items-center gap-2.5 px-2.5 py-2 opacity-55" aria-disabled="true">
          <ClockCounterClockwise size={18} className="shrink-0 text-muted" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px]">Historique des versions</span>
            <span className="block text-[11.5px] text-muted">{historyNote}</span>
          </span>
        </div>
      </Section>

      {/* --------------------------------------------- Zone destructrice */}
      <div className="mt-4 border-t border-line pt-3">
        {confirming ? (
          <div className="rounded-card border border-danger/40 bg-surface-2 p-3">
            <p className="flex items-start gap-2 text-[13px] leading-[19px]">
              <WarningCircle size={17} weight="duotone" className="mt-0.5 shrink-0 text-danger" aria-hidden />
              La note part à la corbeille avec ses questions. Restaurable depuis les réglages.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button type="button" onClick={onTrash} className="btn-danger h-10 px-3 text-[13.5px]">
                <Trash size={15} /> Mettre à la corbeille
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn-secondary h-10 px-3 text-[13.5px]"
              >
                Garder la note
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex min-h-[44px] w-full items-center gap-2.5 rounded-field px-2.5 text-left text-[14px] text-danger"
          >
            <Trash size={17} aria-hidden /> Mettre à la corbeille…
            <ArrowRight size={14} className="ml-auto opacity-60" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Section({
  title,
  last,
  children,
}: {
  title: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("border-t border-line pt-2", last ? "pb-1" : "pb-2")}>
      <h3 className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">
        {title}
      </h3>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function Row({
  as = "div",
  icon: Icon,
  label,
  children,
}: {
  as?: "div" | "label";
  icon: React.ComponentType<{ size?: number; weight?: "duotone"; className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  const Wrapper = as;
  return (
    <Wrapper className="flex min-h-[44px] items-center gap-2.5 px-2.5 py-1.5">
      <Icon size={18} weight="duotone" className="shrink-0 text-muted" />
      <span className="min-w-0 flex-1 text-[14px]">{label}</span>
      {children}
    </Wrapper>
  );
}

function Action({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; weight?: "duotone"; className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] items-center gap-2.5 rounded-field px-2.5 py-1.5 text-left hover:bg-surface-2"
    >
      <Icon size={18} weight="duotone" className="shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px]">{label}</span>
        {hint && <span className="block text-[11.5px] text-muted">{hint}</span>}
      </span>
    </button>
  );
}
