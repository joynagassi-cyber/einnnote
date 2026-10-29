import { describe, expect, it } from "vitest";
import {
  BACKUP_REMINDER_DAYS,
  backupAgeDays,
  contentStamp,
  hasUnsavedChanges,
  byteSize,
  canWrite,
  formatBytes,
  measureLocalStorage,
  needsBackupReminder,
  usageLevel,
  FALLBACK_QUOTA,
  WARN_RATIO,
} from "@/lib/storage";

/** Faux localStorage : on maîtrise exactement ce qu’il contient. */
function fakeStorage(entries: Record<string, string>): Storage {
  const keys = Object.keys(entries);
  return {
    get length() {
      return keys.length;
    },
    key: (index: number) => keys[index] ?? null,
    getItem: (key: string) => entries[key] ?? null,
    setItem: (key: string, value: string) => {
      entries[key] = value;
    },
    removeItem: (key: string) => {
      delete entries[key];
    },
    clear: () => {
      for (const key of keys) delete entries[key];
    },
  } as Storage;
}

describe("stockage", () => {
  it("compte les octets en UTF-8", () => {
    expect(byteSize("abc")).toBe(3);
    expect(byteSize("é")).toBe(2);
    expect(byteSize("€")).toBe(3);
    expect(byteSize("")).toBe(0);
  });

  it("formate les tailles en français", () => {
    expect(formatBytes(512)).toBe("512 o");
    expect(formatBytes(2048)).toBe("2,0 ko");
    expect(formatBytes(1024 * 1024)).toBe("1,0 Mo");
  });

  it("place les seuils à 80 % et 90 %", () => {
    expect(usageLevel(0)).toBe("ok");
    expect(usageLevel(0.79)).toBe("ok");
    expect(usageLevel(WARN_RATIO)).toBe("warn");
    expect(usageLevel(0.89)).toBe("warn");
    expect(usageLevel(0.9)).toBe("critical");
    expect(usageLevel(1)).toBe("critical");
  });

  it("mesure les clés Einnote et l’origine entière", () => {
    const storage = fakeStorage({
      "engram.content.v1": "x".repeat(1000),
      "engram.settings.v1": "x".repeat(500),
      "autre.app": "x".repeat(200),
    });
    const usage = measureLocalStorage(storage);

    // le poids inclut la clé et sa valeur
    const engram = "engram.content.v1".length + 1000 + "engram.settings.v1".length + 500;
    expect(usage.usedBytes).toBe(engram);
    expect(usage.originBytes).toBe(engram + "autre.app".length + 200);
    expect(usage.quotaBytes).toBe(FALLBACK_QUOTA);
    expect(usage.level).toBe("ok");
    expect(usage.byKey[0].key).toBe("engram.content.v1");
  });

  it("passe en alerte à 80 % du quota", () => {
    const nearLimit = Math.round(FALLBACK_QUOTA * 0.85);
    const usage = measureLocalStorage(
      fakeStorage({ "engram.content.v1": "x".repeat(nearLimit) }),
    );
    expect(usage.level).toBe("warn");
    expect(usage.ratio).toBeGreaterThan(WARN_RATIO);
  });

  it("passe en critique quand le quota est atteint", () => {
    const usage = measureLocalStorage(
      fakeStorage({ "engram.content.v1": "x".repeat(FALLBACK_QUOTA) }),
    );
    expect(usage.level).toBe("critical");
    expect(usage.ratio).toBe(1);
  });

  it("ne casse pas sans stockage disponible", () => {
    const usage = measureLocalStorage(null);
    expect(usage.usedBytes).toBe(0);
    expect(usage.level).toBe("ok");
    expect(canWrite()).toBe(true);
  });

});

describe("rappel de sauvegarde", () => {
  const now = new Date("2026-10-27T12:00:00.000Z").getTime();
  const daysAgo = (days: number) =>
    new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

  it("compte l’âge en jours entiers", () => {
    expect(backupAgeDays(daysAgo(0), now)).toBe(0);
    expect(backupAgeDays(daysAgo(3), now)).toBe(3);
    expect(backupAgeDays(new Date(now - 36 * 3600_000).toISOString(), now)).toBe(1);
  });

  it("ne connaît pas d’âge sans sauvegarde", () => {
    expect(backupAgeDays(undefined, now)).toBeNull();
    expect(backupAgeDays("pas une date", now)).toBeNull();
  });

  it("rappelle dès le septième jour", () => {
    expect(BACKUP_REMINDER_DAYS).toBe(7);
    expect(needsBackupReminder(daysAgo(6), true, now)).toBe(false);
    expect(needsBackupReminder(daysAgo(7), true, now)).toBe(true);
    expect(needsBackupReminder(daysAgo(30), true, now)).toBe(true);
  });

  it("rappelle aussi quand aucune sauvegarde n’existe", () => {
    expect(needsBackupReminder(undefined, true, now)).toBe(true);
    expect(needsBackupReminder(undefined, false, now)).toBe(false);
  });

  it("ne rappelle rien juste après une sauvegarde", () => {
    expect(needsBackupReminder(daysAgo(0), true, now)).toBe(false);
  });
});

describe("contenu non sauvegardé", () => {
  const base = {
    notes: [{ id: "n1", updatedAt: "2025-01-01T10:00:00.000Z" }],
    zettel: [{ id: "z1", updatedAt: "2025-01-01T10:00:00.000Z" }],
    mindmaps: [{ id: "m1" }],
    vaults: [{ id: "v1", name: "Économie" }],
    projects: [{ id: "p1", name: "Thèse" }],
  };

  it("change quand une note est modifiée, pas quand rien ne bouge", () => {
    const stamp = contentStamp(base);
    expect(contentStamp({ ...base })).toBe(stamp);
    expect(
      contentStamp({
        ...base,
        notes: [{ id: "n1", updatedAt: "2025-01-02T10:00:00.000Z" }],
      }),
    ).not.toBe(stamp);
    expect(
      contentStamp({ ...base, zettel: [...base.zettel, { id: "z2", updatedAt: "2025-01-02" }] }),
    ).not.toBe(stamp);
  });

  it("ignore les notes en corbeille", () => {
    expect(
      contentStamp({
        ...base,
        notes: [{ id: "n1", updatedAt: "2025-01-01T10:00:00.000Z", deletedAt: "2025-02-01" }],
      }),
    ).not.toBe(contentStamp(base));
  });

  it("décide s’il reste quelque chose à sauvegarder", () => {
    const stamp = contentStamp(base);
    /* jamais sauvegardé, mais du contenu : oui */
    expect(hasUnsavedChanges(stamp, undefined, undefined, true)).toBe(true);
    /* rien à sauvegarder : non, même sans sauvegarde */
    expect(hasUnsavedChanges(stamp, undefined, undefined, false)).toBe(false);
    /* sauvegardé à l’identique : non */
    expect(hasUnsavedChanges(stamp, stamp, "2025-01-05T00:00:00.000Z", true)).toBe(false);
    /* sauvegardé puis modifié : oui */
    expect(hasUnsavedChanges(`${stamp}x`, stamp, "2025-01-05T00:00:00.000Z", true)).toBe(true);
    /* sauvegarde ancienne sans empreinte (version précédente) : on prévient */
    expect(hasUnsavedChanges(stamp, undefined, "2025-01-05T00:00:00.000Z", true)).toBe(true);
  });
});
