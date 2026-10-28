/**
 * Les indications à usage unique.
 *
 * Doctrine : une interface professionnelle ne commente pas ce qu’elle montre.
 * Elle fonctionne, et si un geste n’est pas devinable, elle le dit **une
 * fois** — en une ligne, au moment où ça sert, puis elle se tait pour
 * toujours. Tout ce qui mérite plus d’une ligne va dans *Apprendre*.
 *
 * La mémoire est locale et minimale : une seule clé, une liste d’identifiants.
 * Rien à synchroniser, rien à migrer — au pire, une indication se remontre.
 */

const STORAGE_KEY = "engram.hints";

/** Comment on lit le stockage : injectable, pour les tests. */
type Reader = Pick<Storage, "getItem">;
type Writer = Pick<Storage, "setItem">;
type Store = Reader & Writer;

function read(store: Reader): string[] {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** L’indication a-t-elle déjà été montrée sur cet appareil ? */
export function hasSeenHint(id: string, store: Reader = window.localStorage): boolean {
  return read(store).includes(id);
}

/** Note l’indication comme vue — définitif, sauf remise à zéro explicite. */
export function markHintSeen(id: string, store: Store = window.localStorage): void {
  const seen = read(store);
  if (seen.includes(id)) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify([...seen, id]));
  } catch {
    /* stockage plein ou navigation privée : tant pis, l’indication se
       remontrera ; ce n’est pas une raison pour casser l’écran. */
  }
}

/** Tout revoir : utilisé par la remise à zéro des réglages. */
export function resetHints(store: Writer = window.localStorage): void {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch {
    /* idem */
  }
}

export const HINTS_KEY = STORAGE_KEY;
