import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PUPITRE,
  PUPITRE_MAX,
  addSlot,
  moveSlot,
  normalizePupitre,
  placeBefore,
  readPupitre,
  removeSlot,
  resetPupitre,
  writePupitre,
} from "@/lib/commands/pupitre";

describe("modèle du pupitre", () => {
  it("part des quatre gestes par défaut", () => {
    expect(readPupitre()).toEqual(DEFAULT_PUPITRE);
    expect(DEFAULT_PUPITRE).toHaveLength(PUPITRE_MAX);
  });

  it("ignore un identifiant inconnu et dédoublonne", () => {
    expect(normalizePupitre(["bold", "bold", "commande-disparue", "italic"])).toEqual([
      "bold",
      "italic",
    ]);
  });

  it("plafonne à quatre gestes", () => {
    expect(normalizePupitre(["bold", "italic", "undo", "redo", "code"])).toHaveLength(PUPITRE_MAX);
    const full = [...DEFAULT_PUPITRE];
    expect(addSlot(full, "code")).toEqual(full);
  });

  it("n’ajoute pas deux fois le même geste", () => {
    const slots = addSlot(["bold"], "bold");
    expect(slots).toEqual(["bold"]);
  });

  it("referme la place quand on retire, sans rien réinjecter", () => {
    const slots = removeSlot([...DEFAULT_PUPITRE], "bullet");
    expect(slots).toHaveLength(PUPITRE_MAX - 1);
    expect(slots).not.toContain("bullet");
  });

  it("ne laisse jamais un pupitre vide", () => {
    let slots: string[] = [...DEFAULT_PUPITRE];
    for (const id of DEFAULT_PUPITRE) slots = removeSlot(slots, id);
    expect(slots).toEqual(DEFAULT_PUPITRE);
  });

  it("déplace un geste, et s’arrête aux bornes", () => {
    const slots = ["bold", "italic", "undo", "redo"];
    expect(moveSlot(slots, "undo", -1)).toEqual(["bold", "undo", "italic", "redo"]);
    expect(moveSlot(slots, "bold", -1)).toEqual(slots);
    expect(moveSlot(slots, "redo", 1)).toEqual(slots);
  });

  it("place un geste juste avant celui qu’on vise", () => {
    const slots = ["bold", "italic", "undo"];
    expect(placeBefore(slots, "undo", "bold")).toEqual(["undo", "bold", "italic"]);
    expect(placeBefore(slots, "bold", "disparue")).toEqual(slots);
  });

  it("relit ce qu’il a écrit, et supporte un stockage corrompu", () => {
    writePupitre(["italic", "bold"]);
    expect(readPupitre()).toEqual(["italic", "bold"]);

    window.localStorage.setItem("engram.pupitre.v1", "{pas du json");
    expect(readPupitre()).toEqual(DEFAULT_PUPITRE);

    window.localStorage.setItem("engram.pupitre.v1", JSON.stringify({ version: 1, slots: [] }));
    expect(readPupitre()).toEqual(DEFAULT_PUPITRE);
  });

  it("revient aux quatre gestes par défaut sur demande", () => {
    writePupitre(["italic"]);
    expect(resetPupitre()).toEqual(DEFAULT_PUPITRE);
    expect(readPupitre()).toEqual(DEFAULT_PUPITRE);
  });
});

beforeEach(() => {
  window.localStorage.clear();
});
