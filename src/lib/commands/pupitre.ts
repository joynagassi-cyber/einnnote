import { knownIds } from "@/lib/commands/registry";

/**
 * **Le pupitre** — quatre gestes d’écriture, sur téléphone.
 *
 * Ce module ne contient que le modèle : combien de places, ce qu’on accepte,
 * ce qu’on refuse. Le rendu est dans `components/commands/Pupitre.tsx`. La
 * séparation permet de tester les règles sans monter un éditeur : un plafond,
 * un ordre, une préférence qui survit à un rechargement.
 */

export const PUPITRE_MAX = 4;

const KEY = "engram.pupitre.v1";

/**
 * Les quatre gestes d’un pupitre neuf : deux marques, deux structures.
 * C’est le strict nécessaire pour écrire une note qui sera relue — gras pour
 * appuyer, surligneur pour la définition, puces pour énumérer, case pour agir.
 */
export const DEFAULT_PUPITRE = ["bold", "highlight-jaune", "bullet", "task"];

/**
 * Nettoie ce qui vient du stockage.
 *
 * Trois règles, dans cet ordre : on ne garde que des identifiants connus (une
 * commande retirée du registre disparaît sans migration), on dédoublonne, on
 * plafonne. Une liste vide ou illisible rend le pupitre par défaut — jamais un
 * pupitre vide, qui serait un écran sans gestes.
 */
export function normalizePupitre(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_PUPITRE];
  const ids = knownIds(
    raw.filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const unique = [...new Set(ids)].slice(0, PUPITRE_MAX);
  return unique.length > 0 ? unique : [...DEFAULT_PUPITRE];
}

export function readPupitre(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [...DEFAULT_PUPITRE];
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "slots" in parsed) {
      return normalizePupitre((parsed as { slots: unknown }).slots);
    }
    return normalizePupitre(parsed);
  } catch {
    return [...DEFAULT_PUPITRE];
  }
}

export function writePupitre(slots: string[]): string[] {
  const clean = normalizePupitre(slots);
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 1, slots: clean }));
  } catch {
    /* stockage refusé : le pupitre marche pour la session en cours */
  }
  return clean;
}

export function resetPupitre(): string[] {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* rien n’avait été écrit */
  }
  return [...DEFAULT_PUPITRE];
}

/** Ajoute un geste à la fin ; sans effet s’il est déjà là ou si c’est plein. */
export function addSlot(slots: string[], id: string): string[] {
  if (slots.includes(id)) return slots;
  if (slots.length >= PUPITRE_MAX) return slots;
  if (knownIds([id]).length === 0) return slots;
  return [...slots, id];
}

/** Retire un geste : la place se referme, rien n’est réinjecté. */
export function removeSlot(slots: string[], id: string): string[] {
  const next = slots.filter((slot) => slot !== id);
  return next.length > 0 ? next : [...DEFAULT_PUPITRE];
}

/** Déplace un geste ; les bornes sont silencieuses (butée), pas une erreur. */
export function moveSlot(slots: string[], id: string, delta: number): string[] {
  const from = slots.indexOf(id);
  if (from === -1) return slots;
  const to = Math.min(slots.length - 1, Math.max(0, from + delta));
  if (to === from) return slots;
  const next = [...slots];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/** Place un geste juste avant un autre (glisser-déposer). */
export function placeBefore(slots: string[], moving: string, target: string): string[] {
  if (moving === target) return slots;
  const withoutMoving = slots.filter((slot) => slot !== moving);
  const index = withoutMoving.indexOf(target);
  if (index === -1) return slots;
  const next = [...withoutMoving];
  next.splice(index, 0, moving);
  return next;
}
