/**
 * Surveillance du stockage local.
 *
 * Tout est dans `localStorage` : le quota est d’environ 5 Mo par origine, et
 * un dépassement lève `QuotaExceededError` **sans que l’utilisateur le voie**.
 * Ce module mesure, alerte et permet de réagir avant la panne.
 */

export interface KeyUsage {
  key: string;
  bytes: number;
}

export interface StorageUsage {
  /** octets occupés par les clés Engram */
  usedBytes: number;
  /** octets occupés par toute l’origine (autres apps comprises) */
  originBytes: number;
  /** quota estimé, en octets */
  quotaBytes: number;
  ratio: number;
  level: "ok" | "warn" | "critical";
  byKey: KeyUsage[];
  /** true si le navigateur a fourni un quota réel */
  measuredQuota: boolean;
}

/** 5 Mo : valeur par défaut de Chrome, Firefox et Safari. */
export const FALLBACK_QUOTA = 5 * 1024 * 1024;
export const WARN_RATIO = 0.8;
export const CRITICAL_RATIO = 0.9;

/** Poids UTF-16 approximatif d’une chaîne, tel que le stocke le navigateur. */
export function byteSize(value: string): number {
  let bytes = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
  }
  return bytes;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb < 10 ? kb.toFixed(1).replace(".", ",") : Math.round(kb)} ko`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb < 10 ? 1 : 0).replace(".", ",")} Mo`;
}

export function usageLevel(ratio: number): StorageUsage["level"] {
  if (ratio >= CRITICAL_RATIO) return "critical";
  if (ratio >= WARN_RATIO) return "warn";
  return "ok";
}

/** Mesure synchrone : suffit pour un compteur et une alerte. */
export function measureLocalStorage(
  storage: Storage | null = typeof localStorage === "undefined"
    ? null
    : localStorage,
): StorageUsage {
  const byKey: KeyUsage[] = [];
  let originBytes = 0;

  if (storage) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key === null) continue;
      const value = storage.getItem(key) ?? "";
      const bytes = byteSize(key) + byteSize(value);
      originBytes += bytes;
      byKey.push({ key, bytes });
    }
  }

  byKey.sort((a, b) => b.bytes - a.bytes);
  const usedBytes = byKey
    .filter((entry) => entry.key.startsWith("engram."))
    .reduce((total, entry) => total + entry.bytes, 0);
  const quotaBytes = FALLBACK_QUOTA;
  const ratio = Math.min(1, originBytes / quotaBytes);

  return {
    usedBytes,
    originBytes,
    quotaBytes,
    ratio,
    level: usageLevel(ratio),
    byKey,
    measuredQuota: false,
  };
}

/** Version asynchrone : récupère le vrai quota quand le navigateur le donne. */
export async function estimateStorage(): Promise<StorageUsage> {
  const base = measureLocalStorage();
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return base;
  }
  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota ?? FALLBACK_QUOTA;
    // Le quota global dépasse souvent le quota de localStorage : on garde
    // le plus petit des deux pour ne pas rassurer à tort.
    const quotaBytes = Math.min(quota, FALLBACK_QUOTA);
    return {
      ...base,
      quotaBytes,
      ratio: Math.min(1, base.originBytes / quotaBytes),
      level: usageLevel(Math.min(1, base.originBytes / quotaBytes)),
      measuredQuota: true,
    };
  } catch {
    return base;
  }
}

/**
 * Teste une écriture minuscule : détecte un quota déjà atteint sans attendre
 * qu’une vraie frappe échoue.
 */
export function canWrite(extraBytes = 64): boolean {
  if (typeof localStorage === "undefined") return true;
  const key = "engram.probe";
  try {
    localStorage.setItem(key, "x".repeat(extraBytes));
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}


/* ------------------------------------------------------------------ */
/* Rappel de sauvegarde                                                */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
export const BACKUP_REMINDER_DAYS = 7;

/** Âge de la dernière sauvegarde, en jours (null si jamais sauvegardé). */
export function backupAgeDays(
  lastBackupAt: string | undefined,
  now = Date.now(),
): number | null {
  if (!lastBackupAt) return null;
  const then = new Date(lastBackupAt).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((now - then) / DAY_MS));
}

/** Faut-il rappeler à l’utilisateur d’exporter ? */
export function needsBackupReminder(
  lastBackupAt: string | undefined,
  hasContent: boolean,
  now = Date.now(),
): boolean {
  if (!hasContent) return false;
  const days = backupAgeDays(lastBackupAt, now);
  if (days === null) return true;
  return days >= BACKUP_REMINDER_DAYS;
}
