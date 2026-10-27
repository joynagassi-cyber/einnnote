import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CloudSlash,
  DownloadSimple,
  Warning,
} from "@phosphor-icons/react";
import { useAppStore } from "@/stores/useAppStore";
import {
  BACKUP_REMINDER_DAYS,
  backupAgeDays,
  formatBytes,
  needsBackupReminder,
  type StorageUsage,
} from "@/lib/storage";
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
  const usage = useStorageUsage(refreshKey);

  const days = backupAgeDays(lastBackupAt);
  const critical = usage?.level !== "ok";
  const show = needsBackupReminder(lastBackupAt, true);

  const message = useMemo(() => {
    if (critical) return "Le stockage se remplit";
    if (days === null) return "Aucune sauvegarde pour l’instant";
    if (days === 0) return "Dernière sauvegarde aujourd’hui";
    return `Dernière sauvegarde il y a ${days} jour${days > 1 ? "s" : ""}`;
  }, [critical, days]);

  if (!show && !critical) return null;

  return (
    <section
      aria-label="Sauvegarde"
      className={cn(
        "flex items-center gap-3 rounded-card border border-line bg-surface",
        compact ? "p-3" : "p-4",
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
    </section>
  );
}
