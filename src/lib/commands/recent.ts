import { knownIds } from "@/lib/commands/registry";

/**
 * Les commandes récemment utilisées — **cinq au plus**.
 *
 * Pourquoi cinq : c’est la hauteur d’un bloc dans la palette sans repousser le
 * reste. Au-delà, « récent » devient un second catalogue, et un second
 * catalogue est un second ordre à apprendre.
 *
 * Le stockage ne contient que des identifiants : une commande retirée du
 * registre disparaît d’elle-même à la lecture (`knownIds`), sans migration.
 */

const KEY = "engram.commands.recent.v1";
const MAX = 5;

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return knownIds(parsed.filter((id): id is string => typeof id === "string")).slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecent(id: string): string[] {
  const next = [id, ...readRecent().filter((current) => current !== id)].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* stockage plein ou refusé : la palette reste utilisable, sans mémoire */
  }
  return next;
}

export function clearRecent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* rien à faire : il n’y avait rien */
  }
}
