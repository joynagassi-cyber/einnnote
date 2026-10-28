import { describe, expect, it } from "vitest";
import {
  DEFAULT_NAV,
  MOBILE_SLOTS,
  NAV_CATALOG,
  SURFACE_SLOTS,
  availableItems,
  fillItems,
  needsPicker,
  moveItem,
  normalizeItems,
  placeBefore,
  resolveItems,
  sanitizeItems,
  splitMobile,
  toggleItem,
  type NavId,
} from "@/lib/navigation";

/**
 * Le catalogue et les manipulations de liste sont purs : on les vérifie sans
 * navigateur. Ce qui casse en silence dans une navigation configurable, c’est
 * toujours la même chose — un doublon, un ordre perdu, une barre vide.
 */
describe("normalisation", () => {
  it("écarte les identifiants inconnus et les doublons", () => {
    expect(normalizeItems(["notes", "notes", "zzz", 42, "review"])).toEqual([
      "notes",
      "review",
    ]);
  });

  it("refuse tout ce qui n’est pas une liste", () => {
    expect(normalizeItems(undefined)).toEqual([]);
    expect(normalizeItems({ a: 1 })).toEqual([]);
  });

  it("une barre vide retombe sur les valeurs par défaut", () => {
    expect(sanitizeItems("mobile", [])).toEqual(DEFAULT_NAV.mobile);
    expect(sanitizeItems("mobile", ["inconnu"])).toEqual(DEFAULT_NAV.mobile);
  });

  it("conserve une liste valide telle quelle", () => {
    const custom: NavId[] = ["review", "notes"];
    expect(sanitizeItems("mobile", custom)).toEqual(custom);
  });
});

describe("toggleItem", () => {
  it("ajoute à la fin", () => {
    expect(toggleItem(["notes"], "review")).toEqual(["notes", "review"]);
  });

  it("retire une entrée présente", () => {
    expect(toggleItem(["notes", "review"], "review")).toEqual(["notes"]);
  });

  it("refuse de vider la barre", () => {
    expect(toggleItem(["notes"], "notes")).toEqual(["notes"]);
  });
});

describe("moveItem", () => {
  const base: NavId[] = ["notes", "spaces", "review"];

  it("monte et descend", () => {
    expect(moveItem(base, "spaces", -1)).toEqual(["spaces", "notes", "review"]);
    expect(moveItem(base, "spaces", 1)).toEqual(["notes", "review", "spaces"]);
  });

  it("ne sort pas de la liste", () => {
    expect(moveItem(base, "notes", -1)).toEqual(base);
    expect(moveItem(base, "review", 1)).toEqual(base);
  });

  it("ignore un identifiant absent", () => {
    expect(moveItem(["notes"], "review", 1)).toEqual(["notes"]);
  });
});

describe("placeBefore", () => {
  const base: NavId[] = ["notes", "spaces", "review"];

  it("déplace une page devant une autre", () => {
    expect(placeBefore(base, "review", "notes")).toEqual(["review", "notes", "spaces"]);
  });

  it("ne change rien si la cible est la page elle-même", () => {
    expect(placeBefore(base, "notes", "notes")).toEqual(base);
  });

  it("ne change rien si une des deux pages est absente", () => {
    expect(placeBefore(["notes"], "review", "notes")).toEqual(["notes"]);
  });

  it("ne perd ni ne duplique aucune entrée", () => {
    const moved = placeBefore(base, "notes", "review");
    expect([...moved].sort()).toEqual([...base].sort());
    expect(moved).toHaveLength(base.length);
  });
});

describe("resolveItems", () => {
  it("rend les destinations dans l’ordre demandé", () => {
    expect(resolveItems(["review", "notes"]).map((item) => item.label)).toEqual([
      "Réviser",
      "Notes",
    ]);
  });

  it("ignore une entrée disparue du catalogue", () => {
    expect(resolveItems(["notes", "page-supprimee" as NavId])).toHaveLength(1);
  });
});

describe("availableItems", () => {
  it("liste ce qui n’est pas encore affiché", () => {
    const hidden = availableItems(DEFAULT_NAV.mobile).map((item) => item.id);
    expect(hidden).not.toContain("notes");
    // le catalogue est entièrement dans la barre par défaut : rien de masqué
    expect(hidden).toEqual([]);
  });
});

describe("splitMobile", () => {
  it("laisse tout dans la barre jusqu’à cinq entrées", () => {
    expect(DEFAULT_NAV.mobile).toHaveLength(MOBILE_SLOTS);
    expect(splitMobile(DEFAULT_NAV.mobile).overflow).toEqual([]);
  });

  it("parque le surplus au lieu de le faire déborder", () => {
    /* Le catalogue actuel tient exactement dans la barre. La règle de
       débordement reste testée pour le jour où une page s’ajoute : une entrée
       de plus et la dernière passe derrière « ··· », jamais hors écran. */
    const many: NavId[] = [...DEFAULT_NAV.mobile, "learn"];
    const { bar, overflow } = splitMobile(many);
    expect(bar).toHaveLength(MOBILE_SLOTS - 1);
    expect(overflow).toEqual(["settings", "learn"]);
  });
});

describe("catalogue", () => {
  it("n’a ni doublon d’identifiant ni adresse repetée", () => {
    const ids = NAV_CATALOG.map((entry) => entry.id);
    const paths = NAV_CATALOG.map((entry) => entry.to);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("expose Espaces sur les deux surfaces par défaut", () => {
    expect(DEFAULT_NAV.mobile).toContain("spaces");
    expect(DEFAULT_NAV.desktop).toContain("spaces");
  });

  it("ne renvoie que des adresses réelles", () => {
    const paths = NAV_CATALOG.map((entry) => entry.to);
    expect(paths).toContain("/spaces");
    // une entrée sans adresse ne doit pas apparaître dans une barre
    expect(paths.every((path) => path.startsWith("/"))).toBe(true);
    // plus de page « Projets » ni « Coffres » : une seule hiérarchie
    expect(paths).not.toContain("/projects");
    expect(paths).not.toContain("/vaults");
  });
});

/**
 * La règle des réglages : on ne règle que la surface où l’on est, et on ne
 * propose d’y masquer des pages que s’il y a un arbitrage à faire.
 */
describe("choix des pages, surface par surface", () => {
  it("ne force aucun choix tant que tout tient", () => {
    /* 5 pages, 5 places sur téléphone, 12 dans le rail : il n’y a rien à
       masquer, donc rien à cocher. La règle s’inverse d’elle-même le jour où
       le catalogue dépasse la place. */
    expect(needsPicker("mobile")).toBe(false);
    expect(needsPicker("desktop")).toBe(false);
    expect(NAV_CATALOG.length).toBeLessThanOrEqual(SURFACE_SLOTS.mobile);
  });

  it("complète la liste d’une surface sans choix, sans rien perdre", () => {
    const partial: NavId[] = ["learn", "notes"];
    const filled = fillItems("desktop", partial);
    expect(filled.slice(0, 2)).toEqual(["learn", "notes"]);
    expect(filled).toHaveLength(NAV_CATALOG.length - 1);
    // aucune page choisissable ne peut rester sans moyen de revenir
    const choosable = NAV_CATALOG.map((entry) => entry.id).filter((id) => id !== "settings");
    expect(new Set(filled)).toEqual(new Set(choosable));
  });

  it("laisse une liste déjà complète intacte", () => {
    const full = NAV_CATALOG.map((entry) => entry.id).filter((id) => id !== "settings");
    expect(fillItems("desktop", full)).toEqual(full);
  });

  it("ne remet jamais « Réglages » dans la liste du bureau : il est en pied de rail", () => {
    const filled = fillItems("desktop", ["notes", "spaces"]);
    expect(filled).not.toContain("settings");
    // et la règle de place se juge sur les pages réellement choisissables
    expect(filled).toHaveLength(NAV_CATALOG.length - 1);
  });
});

describe("pages à place fixe", () => {
  it("Réglages ne peut pas entrer dans la liste du bureau", () => {
    expect(sanitizeItems("desktop", ["notes", "settings"])).toEqual(["notes"]);
  });

  it("mais reste une page du catalogue téléphone", () => {
    expect(sanitizeItems("mobile", ["notes", "settings"])).toEqual(["notes", "settings"]);
  });
});
