import { describe, expect, it } from "vitest";
import {
  HINTS_KEY,
  hasSeenHint,
  markHintSeen,
  resetHints,
} from "@/lib/hints";

/**
 * Les indications à usage unique : c’est la mémoire qui fait la différence
 * entre « une indication » et « un mode d’emploi permanent ». On vérifie donc
 * trois choses — on se souvient, on ne double pas, et on sait repartir de zéro.
 */

function memory(seed: string | null = null) {
  const data = new Map<string, string>();
  if (seed !== null) data.set(HINTS_KEY, seed);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    raw: () => data.get(HINTS_KEY) ?? null,
  };
}

describe("indications à usage unique", () => {
  it("se souvient d’une indication vue", () => {
    const store = memory();
    expect(hasSeenHint("spaces-hierarchie", store)).toBe(false);
    markHintSeen("spaces-hierarchie", store);
    expect(hasSeenHint("spaces-hierarchie", store)).toBe(true);
  });

  it("ne double pas une indication déjà notée", () => {
    const store = memory();
    markHintSeen("a", store);
    markHintSeen("a", store);
    expect(JSON.parse(store.raw()!)).toEqual(["a"]);
  });

  it("garde les indications indépendantes", () => {
    const store = memory();
    markHintSeen("a", store);
    markHintSeen("b", store);
    expect(hasSeenHint("a", store)).toBe(true);
    expect(hasSeenHint("b", store)).toBe(true);
    expect(hasSeenHint("c", store)).toBe(false);
  });

  it("oublie tout à la remise à zéro", () => {
    const store = memory();
    markHintSeen("a", store);
    resetHints(store);
    expect(hasSeenHint("a", store)).toBe(false);
  });

  it("survit à un stockage corrompu sans casser l’écran", () => {
    expect(hasSeenHint("a", memory("pas du json"))).toBe(false);
    expect(hasSeenHint("a", memory(JSON.stringify({ a: true })))).toBe(false);
    const store = memory("[1, 2, \"a\"]");
    /* Seules les chaînes comptent : un identifiant numérique n’en est pas un. */
    expect(hasSeenHint("a", store)).toBe(true);
    expect(hasSeenHint("1", store)).toBe(false);
  });
});
