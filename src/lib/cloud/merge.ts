import type {
  ContentSnapshot,
  CloudRow,
  CollectionKey,
  MergeOutcome,
  MergeReport,
  Tombstone,
} from "@/lib/cloud/types";

/**
 * Fusion locale ↔ distante, **pure** : aucune I/O, aucun store, aucun réseau.
 *
 * C’est volontaire. Une synchro qu’on ne peut pas tester sans serveur est une
 * synchro qu’on ne teste pas. Toute la logique délicate (estampilles,
 * tombes, conflits) est ici, et `merge.test.ts` la couvre.
 *
 * Règles, dans l’ordre :
 *
 * 1. **Une tombe récente gagne** sur une entité plus ancienne : une note
 *    supprimée sur téléphone ne doit pas revenir depuis l’ordinateur.
 * 2. **Une édition après la tombe gagne** : si l’entité a été modifiée plus
 *    tard que la suppression, c’est un vrai travail, on le garde.
 * 3. **À estampille égale mais contenus différents**, le local gagne et le
 *    conflit est **signalé** — jamais résolu en silence.
 * 4. Les collections immuables (`links`, `logs`) sont **unies par id** : un
 *    journal de révision ne se réécrit pas, il s’ajoute.
 */

/** Collections dont les éléments ne changent jamais après création. */
const APPEND_ONLY: CollectionKey[] = ["links", "logs"];

/**
 * Estampille d’une entité, en millisecondes epoch.
 *
 * Chaque collection a sa source de vérité — et une seule. Les valeurs absentes
 * valent 0 (l’entité est alors « ancienne » : une tombe la supprime).
 */
export function stampOf(collection: CollectionKey, entity: unknown): number {
  const row = (entity ?? {}) as Record<string, unknown>;
  const read = (key: string): number => {
    const value = row[key];
    if (typeof value !== "string") return 0;
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
  };

  switch (collection) {
    case "projects":
      return read("updatedAt") || read("createdAt");
    case "notes":
      return read("updatedAt") || read("createdAt");
    case "questions":
      return read("createdAt");
    case "links":
      return 0;
    case "cards":
      /* Une carte change quand on la révise ; sans révision, son échéance
         fait foi (elle porte la date de création). */
      return read("lastReview") || read("due");
    case "logs":
      return 0;
    case "vaults":
      return read("updatedAt");
    case "zettel":
      return read("updatedAt") || read("createdAt");
    case "mindmaps":
      return read("updatedAt");
    case "progress":
      return read("doneAt");
  }
}

function asRows(
  collection: CollectionKey,
  items: unknown[],
): Map<string, { entity: Record<string, unknown>; stamp: number }> {
  const map = new Map<string, { entity: Record<string, unknown>; stamp: number }>();
  for (const item of items) {
    const entity = item as Record<string, unknown>;
    const id = typeof entity.id === "string" ? entity.id : null;
    /* `LessonProgress` est identifié par `lessonId`, pas par `id`. */
    const key =
      id ??
      (typeof entity.lessonId === "string" ? `lesson:${entity.lessonId}` : null);
    if (!key) continue;
    map.set(key, { entity, stamp: stampOf(collection, entity) });
  }
  return map;
}

function samePayload(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Index des tombes : clé `collection:id` → date de suppression (ms). */
export function indexTombstones(tombstones: Tombstone[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const stone of tombstones) {
    const key = `${stone.collection}:${stone.id}`;
    const time = Date.parse(stone.deletedAt) || 0;
    map.set(key, Math.max(map.get(key) ?? 0, time));
  }
  return map;
}

export function tombstoneKey(collection: CollectionKey, id: string): string {
  return `${collection}:${id}`;
}

/**
 * Fusionne local, distant et tombes.
 *
 * `remote` est ce que le serveur renvoie (y compris ses tombes). Le résultat
 * contient un instantané **complet** : le store local est ensuite remplacé par
 * `merged`, ce qui garantit qu’il n’existe qu’une seule vérité après coup.
 */
export function mergeSnapshots(
  local: ContentSnapshot,
  remote: ContentSnapshot,
  localTombstones: Tombstone[],
  remoteTombstones: Tombstone[],
): MergeOutcome {
  const tombstones = dedupeTombstones([...localTombstones, ...remoteTombstones]);
  const stoneIndex = indexTombstones(tombstones);

  const report: MergeReport = {
    applied: 0,
    pushed: 0,
    deleted: 0,
    conflicts: [],
    unchanged: 0,
  };
  const toPush: CloudRow[] = [];
  const merged = {} as ContentSnapshot;

  for (const collection of Object.keys(local) as CollectionKey[]) {
    const localRows = asRows(collection, (local[collection] ?? []) as unknown[]);
    const remoteRows = asRows(collection, (remote[collection] ?? []) as unknown[]);
    const ids = new Set([...localRows.keys(), ...remoteRows.keys()]);
    const kept: unknown[] = [];

    for (const id of ids) {
      const localEntry = localRows.get(id);
      const remoteEntry = remoteRows.get(id);
      const stoneAt = stoneIndex.get(tombstoneKey(collection, id)) ?? 0;

      const localStamp = localEntry?.stamp ?? -1;
      const remoteStamp = remoteEntry?.stamp ?? -1;
      const newest = Math.max(localStamp, remoteStamp, stoneAt);

      /* 1 & 2 — la tombe tranche, sauf édition postérieure. */
      if (stoneAt > 0 && stoneAt >= localStamp && stoneAt >= remoteStamp) {
        report.deleted += 1;
        continue;
      }

      if (!remoteEntry) {
        if (localEntry) {
          kept.push(localEntry.entity);
          toPush.push(rowFor(collection, id, localEntry.entity, localEntry.stamp));
          report.pushed += 1;
        }
        continue;
      }

      if (!localEntry) {
        kept.push(remoteEntry.entity);
        report.applied += 1;
        continue;
      }

      if (APPEND_ONLY.includes(collection)) {
        /* Union pure : les deux copies coexistent, rien à arbitrer. */
        kept.push(localEntry.entity);
        if (!samePayload(localEntry.entity, remoteEntry.entity)) {
          report.applied += 1;
        }
        continue;
      }

      if (localStamp === remoteStamp) {
        if (samePayload(localEntry.entity, remoteEntry.entity)) {
          kept.push(localEntry.entity);
          report.unchanged += 1;
        } else {
          /* 3 — même estampille, contenus différents : on garde le local mais
             on le dit. Un écrasement silencieux est exactement ce qui fait
             perdre confiance dans une synchro. */
          kept.push(localEntry.entity);
          report.conflicts.push({
            collection,
            id,
            winner: "local",
            localStamp,
            remoteStamp,
          });
          toPush.push(rowFor(collection, id, localEntry.entity, localStamp));
          report.pushed += 1;
        }
        continue;
      }

      if (remoteStamp > localStamp) {
        kept.push(remoteEntry.entity);
        report.applied += 1;
      } else {
        kept.push(localEntry.entity);
        if (!samePayload(localEntry.entity, remoteEntry.entity)) {
          toPush.push(rowFor(collection, id, localEntry.entity, localStamp));
          report.pushed += 1;
        }
      }

      if (newest === 0) {
        /* Aucune date exploitable des deux côtés : on ne peut pas arbitrer,
           on garde le local et on le signale. */
        if (!samePayload(localEntry.entity, remoteEntry.entity)) {
          report.conflicts.push({
            collection,
            id,
            winner: "local",
            localStamp,
            remoteStamp,
          });
        }
      }
    }

    /* Les tombes se propagent aussi : c’est ce qui empêche la résurrection
       sur l’autre appareil. */
    (merged as unknown as Record<string, unknown>)[collection] = kept;
  }

  /* Tombes de ce côté qui n’existent pas encore en face → à envoyer. */
  for (const stone of tombstones) {
    const key = tombstoneKey(stone.collection, stone.id);
    const knownRemotely = remoteTombstones.some(
      (other) => tombstoneKey(other.collection, other.id) === key,
    );
    if (!knownRemotely) {
      toPush.push({
        collection: stone.collection,
        entity_id: stone.id,
        payload: {},
        stamp: Date.parse(stone.deletedAt) || 0,
        deleted: true,
        updated_at: new Date(Date.parse(stone.deletedAt) || 0).toISOString(),
      });
    }
  }

  /* Ordre stable : l’interface et les tests n’aiment pas les listes qui
     dansent d’une synchro à l’autre. */
  for (const collection of Object.keys(merged) as CollectionKey[]) {
    if (APPEND_ONLY.includes(collection)) continue;
    const list = merged[collection] as unknown[];
    list.sort((a, b) => {
      const left = (a as Record<string, unknown>).id;
      const right = (b as Record<string, unknown>).id;
      return String(left).localeCompare(String(right));
    });
  }

  const changedLocal = report.applied > 0 || report.deleted > 0;

  return { merged, tombstones, toPush, changedLocal, report };
}

function rowFor(
  collection: CollectionKey,
  id: string,
  entity: Record<string, unknown>,
  stamp: number,
): CloudRow {
  return {
    collection,
    entity_id: id,
    payload: entity,
    stamp,
    deleted: false,
    updated_at: new Date(stamp || Date.now()).toISOString(),
  };
}

function dedupeTombstones(tombstones: Tombstone[]): Tombstone[] {
  const map = new Map<string, Tombstone>();
  for (const stone of tombstones) {
    const key = tombstoneKey(stone.collection, stone.id);
    const existing = map.get(key);
    if (!existing || Date.parse(stone.deletedAt) > Date.parse(existing.deletedAt)) {
      map.set(key, stone);
    }
  }
  return [...map.values()].sort((a, b) =>
    `${a.collection}:${a.id}`.localeCompare(`${b.collection}:${b.id}`),
  );
}

/** Transforme des lignes serveur en instantané, tombes séparées. */
export function rowsToSnapshot(rows: CloudRow[]): {
  snapshot: ContentSnapshot;
  tombstones: Tombstone[];
} {
  const snapshot: ContentSnapshot = {
    projects: [],
    notes: [],
    questions: [],
    links: [],
    cards: [],
    logs: [],
    vaults: [],
    zettel: [],
    mindmaps: [],
    progress: [],
  };
  const tombstones: Tombstone[] = [];

  for (const row of rows) {
    if (row.deleted) {
      tombstones.push({
        collection: row.collection,
        id: row.entity_id,
        deletedAt: new Date(row.stamp).toISOString(),
      });
      continue;
    }
    (snapshot[row.collection] as unknown[]).push(row.payload);
  }

  return { snapshot, tombstones };
}

/** Instantané → lignes serveur (pour un envoi initial). */
export function snapshotToRows(snapshot: ContentSnapshot): CloudRow[] {
  const rows: CloudRow[] = [];
  for (const collection of Object.keys(snapshot) as CollectionKey[]) {
    for (const entity of snapshot[collection] as unknown[]) {
      const record = entity as Record<string, unknown>;
      const id =
        typeof record.id === "string"
          ? record.id
          : typeof record.lessonId === "string"
            ? `lesson:${record.lessonId}`
            : null;
      if (!id) continue;
      rows.push(rowFor(collection, id, record, stampOf(collection, entity)));
    }
  }
  return rows;
}
