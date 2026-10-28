/**
 * Sauvegarde complète dans un fichier protégé par mot de passe.
 * AES-GCM 256, clé dérivée par PBKDF2-SHA256 (210 000 tours).
 * Tout se fait localement : aucune donnée ne quitte l’appareil.
 */

/** Les anciens fichiers portent « engram.backup » : on continue de les lire. */
export type BackupFormat = "einnote.backup" | "engram.backup";

export const BACKUP_FORMATS: BackupFormat[] = ["einnote.backup", "engram.backup"];

export interface BackupEnvelope {
  format: BackupFormat;
  version: 1;
  createdAt: string;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  cipher: "AES-GCM-256";
  salt: string;
  iv: string;
  data: string;
}

export interface RestoreReport {
  ok: boolean;
  message: string;
  notes?: number;
  cards?: number;
  zettel?: number;
  lessons?: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 210_000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBackup(
  payload: unknown,
  password: string,
): Promise<BackupEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ITERATIONS);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    encoder.encode(JSON.stringify(payload)),
  );

  return {
    format: "einnote.backup",
    version: 1,
    createdAt: new Date().toISOString(),
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    cipher: "AES-GCM-256",
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptBackup(
  envelope: BackupEnvelope,
  password: string,
): Promise<unknown> {
  if (!BACKUP_FORMATS.includes(envelope.format) || envelope.version !== 1) {
    throw new Error("Ce fichier n’est pas une sauvegarde Einnote.");
  }
  const key = await deriveKey(
    password,
    fromBase64(envelope.salt),
    envelope.iterations ?? ITERATIONS,
  );
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(envelope.iv) as unknown as BufferSource,
    },
    key,
    fromBase64(envelope.data) as unknown as BufferSource,
  );
  return JSON.parse(decoder.decode(decrypted));
}

export function downloadFile(
  filename: string,
  content: string,
  mime = "application/json",
) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Même geste, pour un contenu binaire (archive ZIP, image exportée). */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsText(file);
  });
}
