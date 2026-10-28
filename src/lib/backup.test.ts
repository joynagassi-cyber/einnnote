import { describe, expect, it } from "vitest";
import {
  BACKUP_FORMATS,
  decryptBackup,
  encryptBackup,
  type BackupEnvelope,
} from "@/lib/backup";

/**
 * Le renommage du produit ne doit pas fermer les portes : une sauvegarde faite
 * avant (format `engram.backup`) doit encore s’ouvrir après. Ce test fixe les
 * deux sens — on écrit le nouveau format, on lit les deux.
 */

const payload = { notes: [{ id: "n1", title: "Contrats" }], version: 1 };

describe("format de sauvegarde", () => {
  it("écrit le format courant", async () => {
    const envelope = await encryptBackup(payload, "mot-de-passe-solide");
    expect(envelope.format).toBe("einnote.backup");
    expect(envelope.version).toBe(1);
  });

  it("relit une sauvegarde du format précédent", async () => {
    const current = await encryptBackup(payload, "mot-de-passe-solide");
    const legacy: BackupEnvelope = { ...current, format: "engram.backup" };
    await expect(decryptBackup(legacy, "mot-de-passe-solide")).resolves.toEqual(payload);
  });

  it("relit sa propre sauvegarde", async () => {
    const envelope = await encryptBackup(payload, "mot-de-passe-solide");
    await expect(decryptBackup(envelope, "mot-de-passe-solide")).resolves.toEqual(payload);
  });

  it("refuse un fichier qui n’est pas une sauvegarde", async () => {
    const current = await encryptBackup(payload, "mot-de-passe-solide");
    const stranger = { ...current, format: "autre.chose" } as unknown as BackupEnvelope;
    await expect(decryptBackup(stranger, "mot-de-passe-solide")).rejects.toThrow(
      /pas une sauvegarde Einnote/,
    );
  });

  it("refuse une version inconnue", async () => {
    const current = await encryptBackup(payload, "mot-de-passe-solide");
    const future = { ...current, version: 2 } as unknown as BackupEnvelope;
    await expect(decryptBackup(future, "mot-de-passe-solide")).rejects.toThrow();
  });

  it("n’accepte que les deux formats connus", () => {
    expect(BACKUP_FORMATS).toEqual(["einnote.backup", "engram.backup"]);
  });
});
