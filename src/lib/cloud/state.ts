import type {
  CloudRow,
  CollectionKey,
  ContentSnapshot,
  Tombstone,
} from "@/lib/cloud/types";
import { COLLECTIONS } from "@/lib/cloud/types";
import { stampOf, tombstoneKey } from "@/lib/cloud/merge";

/**
 * État de synchronisation conservé **sur l’appareil**.
 *
 * Le point délicat d’une synchro par entités : une suppression n’est pas un
 * événement observable. Le store retire l’élément du tableau, un point c’est
 * tout — personne ne dit « j’ai supprimé la note X ».
 *
 * D’où `known` : la liste des identifiants vus lors de la dernière synchro.
 * Ce qui était connu et qui a disparu a été supprimé. On en déduit une tombe,
 * qu’on propage aux autres appareils. Sans cela, la note supprimée sur le
 * téléphone revient depuis l’ordinateur — le bug le plus classique, et le plus
 * destructeur de confiance, d’une application de notes.
 */

const KEY = "engram.cloud.state.v1";

export interface CloudSyncState {
  userId: string;
  lastSyncAt: string | null;
  tombstones: Tombstone[];
  /** identifiants connus par collection, à la dernière synchro */
  known: Partial<Record<CollectionKey, string[]>>;
}

export function emptyState(userId: string): CloudSyncState {
  return { userId, lastSyncAt: null, tombstones: [], known: {} };
}

/** Identifiant de synchronisation : `id`, ou `lesson:<id>` pour les progrès. */
export function syncKeyOf(entity: unknown): string | null {
  if (!entity || typeof entity !== "object") return null;
  const record = entity as Record<string, unknown>;
  if (typeof record.id === "string" && record.id) return record.id;
  if (typeof record.lessonId === "string" && record.lessonId) {
    return `lesson:${record.lessonId}`;
  }
  return null;
}

export function idsOf(snapshot: ContentSnapshot): Partial<Record<CollectionKey, string[]>> {
  const ids: Partial<Record<CollectionKey, string[]>> = {};
  for (const collection of COLLECTIONS) {
    const list = (snapshot[collection] ?? []) as unknown[];
    const keys = list
      .map((entity) => syncKeyOf(entity))
      .filter((value): value is string => value !== null)
      .sort();
    ids[collection] = keys;
  }
  return ids;
}

/**
 * Tombes déduites de la différence « connu hier → présent aujourd’hui ».
 *
 * Une tombe n’est pas créée si l’élément est encore là, ni s’il n’a jamais été
 * envoyé (inutile de propager la suppression de quelque chose que l’autre
 * appareil n’a jamais vu).
 */
export function deriveTombstones(
  state: CloudSyncState,
  snapshot: ContentSnapshot,
  deletedAt: string,
): Tombstone[] {
  const present = idsOf(snapshot);
  const created: Tombstone[] = [];

  for (const collection of COLLECTIONS) {
    const before = state.known[collection] ?? [];
    const now = new Set(present[collection] ?? []);
    for (const id of before) {
      if (now.has(id)) continue;
      if (state.tombstones.some((s) => tombstoneKey(s.collection, s.id) === tombstoneKey(collection, id))) {
        continue;
      }
      created.push({ collection, id, deletedAt });
    }
  }

  return created;
}

/**
 * Une entité recréée après une suppression annule la tombe.
 *
 * Le cas est rare mais réel : on supprime une fiche, puis on la recrée en
 * collant un export. Garder la tombe la ferait redescendre à la prochaine
 * synchro, en boucle.
 */
export function activeTombstones(
  tombstones: Tombstone[],
  snapshot: ContentSnapshot,
): Tombstone[] {
  const alive = new Map<string, number>();
  for (const collection of COLLECTIONS) {
    for (const entity of (snapshot[collection] ?? []) as unknown[]) {
      const id = syncKeyOf(entity);
      if (!id) continue;
      alive.set(tombstoneKey(collection, id), stampOf(collection, entity));
    }
  }

  return tombstones.filter((stone) => {
    const key = tombstoneKey(stone.collection, stone.id);
    const stamp = alive.get(key);
    if (stamp === undefined) return true;
    return stamp <= (Date.parse(stone.deletedAt) || 0);
  });
}

/** Lecture défensive : un état corrompu ne doit pas bloquer l’application. */
export function loadState(userId: string): CloudSyncState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState(userId);
    const parsed = JSON.parse(raw) as Partial<CloudSyncState>;
    if (parsed.userId !== userId) return emptyState(userId);
    return {
      userId,
      lastSyncAt: typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : null,
      tombstones: Array.isArray(parsed.tombstones) ? parsed.tombstones : [],
      known: parsed.known ?? {},
    };
  } catch {
    return emptyState(userId);
  }
}

export function saveState(state: CloudSyncState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Quota plein : la synchro suivante refera la déduction des tombes.
       On préfère perdre l’état que bloquer l’écriture d’une note. */
  }
}

/** Lignes serveur → instantané (réutilise la forme définie côté merge). */
export function rowsFromRpc(raw: unknown): CloudRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is CloudRow => {
    if (!row || typeof row !== "object") return false;
    const record = row as Record<string, unknown>;
    return (
      typeof record.collection === "string" &&
      typeof record.entity_id === "string" &&
      (COLLECTIONS as readonly string[]).includes(record.collection)
    );
  });
}
