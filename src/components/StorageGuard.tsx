import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CloudSlash,
  DownloadSimple,
  Warning,
  X,
} from "@phosphor-icons/react";
import { useAppStore } from "@/stores/useAppStore";
import {
  backupAgeDays,
  contentStamp,
  formatBytes,
  hasUnsavedChanges,
  type StorageUsage,
} from "@/lib/storage";
import { useContentStore } from "@/stores/useContentStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { useStorageUsage } from "@/lib/useStorage";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Compteur (écran Données)                                            */
/* ------------------------------------------------------------------ */

export function StorageMeter({ usage }: { usage: StorageUsage | null }) {
  if (!usage) {
    return (
      <div className="h-2 w-full overflow-hidden rounded-full bg-line" aria-hidden />
    );
  }

  const percent = Math.round(usage.ratio * 100);
  const tone =
    usage.level === "critical"
      ? "bg-danger"
      : usage.level === "warn"
        ? "bg-[var(--highlight)]"
        : "bg-accent";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-semibold">
          {formatBytes(usage.originBytes)} utilisés
        </span>
        <span className="text-[13px] tabular-nums text-muted">
          {percent} % de {formatBytes(usage.quotaBytes)}
        </span>
      </div>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Occupation du stockage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", tone)}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {usage.byKey.slice(0, 4).map((entry) => (
          <li
            key={entry.key}
            className="flex items-baseline justify-between gap-3 text-[13px]"
          >
            <span className="truncate font-mono text-[12px] text-muted">
              {entry.key}
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatBytes(entry.bytes)}
            </span>
          </li>
        ))}
      </ul>
      {usage.level !== "ok" && (
        <p className="mt-3 flex items-start gap-2 rounded-field bg-danger-soft p-2.5 text-[13px] leading-[19px] text-danger">
          <Warning size={16} className="mt-0.5 shrink-0" aria-hidden />
          {usage.level === "critical"
            ? "Le stockage est presque plein : une écriture peut échouer. Exportez une sauvegarde, puis videz la corbeille."
            : "Le stockage approche de sa limite. Une sauvegarde est conseillée dès maintenant."}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Rappel de sauvegarde                                                */
/* ------------------------------------------------------------------ */

export function BackupReminder({
  compact = false,
  refreshKey,
}: {
  compact?: boolean;
  refreshKey?: unknown;
}) {
  const navigate = useNavigate();
  const lastBackupAt = useAppStore((s) => s.settings.lastBackupAt);
  const savedStamp = useAppStore((s) => s.settings.backupStamp);
  const notes = useContentStore((s) => s.notes);
  const zettel = useContentStore((s) => s.zettel);
  const mindmaps = useContentStore((s) => s.mindmaps);
  const vaults = useContentStore((s) => s.vaults);
  const projects = useContentStore((s) => s.projects);
  const usage = useStorageUsage(refreshKey);

  /* Le rappel n’existe qu’au lancement : on fige la réponse au premier montage
     de la session, puis on marque la session comme « déjà proposée ». Une
     navigation ne le fait donc pas revenir ; un rechargement, si. */
  const [firstInSession] = useState(
    () => !useSessionStore.getState().backupPrompted,
  );
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (firstInSession) useSessionStore.getState().markBackupPrompted();
  }, [firstInSession]);

  const stamp = useMemo(
    () => contentStamp({ notes, zettel, mindmaps, vaults, projects }),
    [notes, zettel, mindmaps, vaults, projects],
  );
  const hasContent = notes.length + zettel.length + mindmaps.length > 0;
  const unsaved = hasUnsavedChanges(stamp, savedStamp, lastBackupAt, hasContent);
  /* `usage` vaut `undefined` tant que la mesure n’est pas faite : ce n’est pas
     une alerte, c’est une absence de mesure. */
  const critical = Boolean(usage) && usage!.level !== "ok";

  const days = backupAgeDays(lastBackupAt);
  const message = useMemo(() => {
    if (critical) return "Le stockage se remplit";
    if (!lastBackupAt) return "Aucune sauvegarde pour l’instant";
    if (days === 0) return "Des notes ne sont pas sauvegardées (export d’aujourd’hui)";
    return `${days} jour${days > 1 ? "s" : ""} de notes non sauvegardées`;
  }, [critical, days, lastBackupAt]);

  /* Trois conditions, dans cet ordre : le lancement, l’absence de contenu à
     sauvegarder, puis le refus explicite de l’utilisateur. */
  if (!firstInSession || dismissed || (!unsaved && !critical)) return null;

  return (
    <section
      aria-label="Sauvegarde"
      className={cn(
        "relative flex items-center gap-3 rounded-card border border-line bg-surface",
        compact ? "p-3 pr-10" : "p-4 pr-11",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-rect",
          critical ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-ink",
        )}
        aria-hidden
      >
        {critical ? <CloudSlash size={20} /> : <DownloadSimple size={20} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-semibold">{message}</div>
        <div className="mt-0.5 text-[13px] leading-[18px] text-muted">
          Un fichier chiffré vous protège d’un navigateur nettoyé.
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate("/settings/data")}
        className="flex h-9 shrink-0 items-center gap-1 rounded-field bg-accent px-3 text-[13.5px] font-semibold text-on-accent"
      >
        Sauver
        <ArrowRight size={14} weight="bold" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Masquer le rappel de sauvegarde"
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <X size={15} weight="bold" aria-hidden />
      </button>
    </section>
  );
}
